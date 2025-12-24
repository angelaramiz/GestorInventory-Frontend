// sync-queue.js
// Manejo de la cola de sincronización

import { dbInventario } from './db-init.js';
import { getSupabase } from '../auth/auth.js'; // Asumiendo que getSupabase está en auth.js
import { mostrarAlertaBurbuja } from '../utils/logs.js'; // Asumiendo que mostrarAlertaBurbuja está en utils/logs.js

let syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');

// Nueva cola de sincronización
export function agregarAColaSincronizacion(data) {
    // Asegurarse de que el área_id esté presente
    const areaId = localStorage.getItem('area_id');
    if (!areaId) {
        console.error("No se encontró el área_id al intentar agregar a la cola de sincronización");
        mostrarAlertaBurbuja("Error: No se pudo determinar el área para sincronizar", "error");
        return;
    }

    // Crear un objeto limpio para Supabase sin el campo areaName
    const dataSupabase = { ...data };

    // Si existe areaName, eliminarla porque Supabase no tiene esa columna
    if (dataSupabase.areaName) {
        delete dataSupabase.areaName;
    }

    // Asegurarse que tenga area_id
    dataSupabase.area_id = dataSupabase.area_id || areaId;

    syncQueue.push(dataSupabase);
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
    if (navigator.onLine) procesarColaSincronizacion();
}

// Llamar esto cuando se detecte conexión
export async function procesarColaSincronizacion() {
    if (!navigator.onLine) return;

    while (syncQueue.length > 0) {
        const item = syncQueue.shift();
        try {
            let supabase = null;
            try {
                supabase = await getSupabase();
            } catch (error) {
                console.error("Error obteniendo instancia de Supabase:", error);
            }

            if (!supabase) {
                console.error("No se pudo obtener instancia de Supabase");
                mostrarAlertaBurbuja("Error de conexión con el servidor", "error");
                syncQueue.unshift(item); // Reinsertar el elemento
                break;
            }

            // Verificar que el ítem tenga área_id
            if (!item.area_id) {
                console.error("El ítem no tiene area_id:", item);
                mostrarAlertaBurbuja("Error: Datos incompletos para sincronizar", "error");
                continue; // Saltar este ítem
            }

            // Crear un objeto limpio para enviar a Supabase (sin el campo areaName)
            const datosParaSupabase = { ...item };

            // Eliminar el campo areaName si existe
            if (datosParaSupabase.areaName) {
                delete datosParaSupabase.areaName;
            }

            // Asegurarse de incluir la información del usuario
            const { data, error } = await supabase
                .from('inventario')
                .upsert({
                    ...datosParaSupabase,
                    usuario_id: localStorage.getItem('usuario_id')
                })
                .select();

            if (error) {
                console.error('Error al subir a Supabase:', error);
                mostrarAlertaBurbuja("Error al sincronizar con el servidor", "error");
                syncQueue.unshift(item); // Reinsertar el elemento
                break;
            }

            // Actualizar IndexedDB con el ID permanente de Supabase y la información completa
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");

            // Eliminar el registro temporal
            await new Promise((resolve, reject) => {
                const deleteRequest = objectStore.delete(item.id);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            });

            // Agregar el registro actualizado con ID permanente y todos los datos
            // Incluir areaName solo para la base de datos local
            const itemActualizado = {
                ...item,
                id: data[0].id,
                is_temp_id: false,
                area_id: data[0].area_id || item.area_id,
                areaName: localStorage.getItem('ubicacion_almacen') // Incluir areaName solo para la base de datos local
            };

            await new Promise((resolve, reject) => {
                const addRequest = objectStore.add(itemActualizado);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            });

            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        } catch (error) {
            console.error('Error al procesar la cola:', error);
            syncQueue.unshift(item); // Reinsertar el elemento si falla
            mostrarAlertaBurbuja("Error al sincronizar con el servidor", "error");
            break;
        }
    }

    if (syncQueue.length === 0) {
        mostrarAlertaBurbuja("Sincronización completada", "success");
    }
}

// Registrar sincronización automática SOLO en páginas específicas
(() => {
    const allowedSyncPages = ['main.html', 'inventario.html'];
    const pathname = window.location && window.location.pathname ? window.location.pathname : '';
    const shouldEnableSync = allowedSyncPages.some(p => pathname.includes(p));

    if (!shouldEnableSync) {
        console.log('Sincronización automática deshabilitada en esta ruta:', pathname);
        return;
    }

    // Escuchar eventos de conexión
    window.addEventListener('online', procesarColaSincronizacion);
    // procesarColaSincronizacionEntradas puede no existir en todas las versiones; añadir condicionalmente
    if (typeof procesarColaSincronizacionEntradas === 'function') {
        window.addEventListener('online', procesarColaSincronizacionEntradas);
    }

    // También sincronizar bidireccionalmente cuando volvemos a línea
    window.addEventListener('online', () => {
        console.log('Conexión restablecida: iniciando sincronización bidireccional');
        sincronizarBidireccional().catch(err => console.error('Error en sincronización bidireccional:', err));
    });

    // Ejecutar sincronización periódica cuando estemos online (cada 60s)
    setInterval(() => {
        if (navigator.onLine) {
            procesarColaSincronizacion();
        }
    }, 60 * 1000);
})();