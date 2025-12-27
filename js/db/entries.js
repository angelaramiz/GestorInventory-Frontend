// entries.js
// Funciones relacionadas con registro de entradas

import { dbEntradas } from './db-init.js';
import { getSupabase } from '../auth/auth.js';
import { mostrarMensaje } from '../utils/logs.js';

// Cola de sincronización específica para entradas
let syncQueueEntradas = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');

export function agregarAColaSincronizacionEntradas(data) {
    // Las entradas no requieren area_id específico
    const dataSupabase = { ...data };
    dataSupabase.area_id = null; // Asegurar que sea null

    // Agregar timestamps si no existen
    const now = new Date().toISOString();
    if (!dataSupabase.created_at) {
        dataSupabase.created_at = now;
    }
    dataSupabase.updated_at = now;

    syncQueueEntradas.push(dataSupabase);
    localStorage.setItem('syncQueueEntradas', JSON.stringify(syncQueueEntradas));

    if (navigator.onLine) {
        procesarColaSincronizacionEntradas();
    }
}

// Procesar la cola de sincronización de entradas con sincronización bidireccional
export async function procesarColaSincronizacionEntradas() {
    if (!navigator.onLine) return;

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no disponible para sincronización de entradas");
            return;
        }

        while (syncQueueEntradas.length > 0) {
            const item = syncQueueEntradas.shift();
            try {
                // Intentar upsert en Supabase
                const { data, error } = await supabase
                    .from('registro_entradas')
                    .upsert(item, { onConflict: 'id' })
                    .select();

                if (error) {
                    console.error('Error subiendo entrada a Supabase:', error);
                    // Reinsertar el elemento si falla
                    syncQueueEntradas.unshift(item);
                    break;
                }

                // Actualizar IndexedDB con el ID permanente
                if (data && data[0]) {
                    const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
                    const objectStore = transaction.objectStore("registro_entradas");

                    // Eliminar el registro temporal
                    await new Promise((resolve, reject) => {
                        const deleteRequest = objectStore.delete(item.id);
                        deleteRequest.onsuccess = () => resolve();
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                    });

                    // Agregar el registro actualizado
                    const itemActualizado = { ...item, id: data[0].id, is_temp_id: false };
                    await new Promise((resolve, reject) => {
                        const addRequest = objectStore.add(itemActualizado);
                        addRequest.onsuccess = () => resolve();
                        addRequest.onerror = () => reject(addRequest.error);
                    });
                }

                localStorage.setItem('syncQueueEntradas', JSON.stringify(syncQueueEntradas));
            } catch (error) {
                console.error('Error procesando entrada:', error);
                syncQueueEntradas.unshift(item);
                break;
            }
        }

        if (syncQueueEntradas.length === 0) {
            mostrarMensaje("Sincronización de entradas completada", "success");
        }
    } catch (error) {
        console.error('Error en procesarColaSincronizacionEntradas:', error);
    }
}

// Sincronizar entradas desde Supabase
export async function sincronizarEntradasDesdeSupabase() {
    try {
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no disponible para sincronización de entradas");
            return;
        }

        const lastSync = localStorage.getItem('lastSyncEntradas') || '1970-01-01T00:00:00.000Z';

        const { data: entradas, error } = await supabase
            .from('registro_entradas')
            .select('*')
            .gt('updated_at', lastSync);

        if (error) {
            console.error('Error sincronizando entradas:', error);
            return;
        }

        if (entradas && entradas.length > 0) {
            const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
            const store = transaction.objectStore("registro_entradas");

            for (const entrada of entradas) {
                const existing = await new Promise((resolve) => {
                    const request = store.get(entrada.id);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                });

                if (!existing || new Date(entrada.updated_at) > new Date(existing.updated_at)) {
                    await new Promise((resolve, reject) => {
                        const putRequest = store.put(entrada);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    });
                }
            }
        }

        localStorage.setItem('lastSyncEntradas', new Date().toISOString());
        mostrarMensaje("Entradas sincronizadas desde servidor", "success");
    } catch (error) {
        console.error('Error en sincronizarEntradasDesdeSupabase:', error);
        mostrarMensaje("Error al sincronizar entradas", "error");
    }
}

// Función para agregar una entrada al registro
export async function agregarRegistroEntrada(entradaData) {
    try {
        // Preparar los datos de la entrada (sin area_id para entradas)
        const entrada = {
            ...entradaData,
            area_id: null, // Las entradas no están asociadas a áreas específicas
            fecha_entrada: entradaData.fecha_entrada || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            usuario_id: localStorage.getItem('usuario_id'),
            is_temp_id: true // Marcar como temporal hasta que se sincronice
        };

        // Guardar en IndexedDB
        const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
        const objectStore = transaction.objectStore("registro_entradas");

        const request = objectStore.add(entrada);

        return new Promise((resolve, reject) => {
            request.onsuccess = function (event) {
                console.log("Entrada agregada localmente con ID:", event.target.result);
                // Agregar a la cola de sincronización
                agregarAColaSincronizacionEntradas({ ...entrada, id: event.target.result });
                resolve(event.target.result);
            };
            request.onerror = function (event) {
                console.error("Error al agregar entrada:", event.target.error);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error("Error en agregarRegistroEntrada:", error);
        throw error;
    }
}

// Función para cargar entradas en la tabla
export async function cargarEntradasEnTabla(filtros = {}) {
    try {
        // Verificar que la base de datos esté inicializada
        if (!dbEntradas) {
            console.warn("Base de datos de entradas no inicializada, esperando...");
            // Esperar un poco y reintentar
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!dbEntradas) {
                console.error("Base de datos de entradas sigue sin inicializarse");
                return [];
            }
        }

        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");

        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();

            request.onsuccess = function (event) {
                let entradas = event.target.result || [];

                // Aplicar filtros si existen
                if (filtros.fechaDesde) {
                    entradas = entradas.filter(e => e.fecha_entrada >= filtros.fechaDesde);
                }
                if (filtros.fechaHasta) {
                    entradas = entradas.filter(e => e.fecha_entrada <= filtros.fechaHasta);
                }
                if (filtros.proveedor) {
                    entradas = entradas.filter(e => e.proveedor && e.proveedor.toLowerCase().includes(filtros.proveedor.toLowerCase()));
                }
                if (filtros.codigo) {
                    entradas = entradas.filter(e => e.codigo && e.codigo.toLowerCase().includes(filtros.codigo.toLowerCase()));
                }
                if (filtros.nombre) {
                    entradas = entradas.filter(e => e.nombre && e.nombre.toLowerCase().includes(filtros.nombre.toLowerCase()));
                }
                if (filtros.marca) {
                    entradas = entradas.filter(e => e.marca && e.marca.toLowerCase().includes(filtros.marca.toLowerCase()));
                }

                // Ordenar por fecha de entrada descendente
                entradas.sort((a, b) => new Date(b.fecha_entrada) - new Date(a.fecha_entrada));

                resolve(entradas);
            };

            request.onerror = function (event) {
                console.error("Error al cargar entradas:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("Error en cargarEntradasEnTabla:", error);
        return [];
    }
}

// Función para eliminar una entrada del registro
export async function eliminarRegistroEntrada(entradaId) {
    try {
        // Primero eliminar de IndexedDB
        const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
        const objectStore = transaction.objectStore("registro_entradas");

        await new Promise((resolve, reject) => {
            const request = objectStore.delete(entradaId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Luego intentar eliminar de Supabase
        await eliminarEntradaDeSupabase(entradaId);

        mostrarMensaje("Entrada eliminada correctamente", "success");
    } catch (error) {
        console.error("Error eliminando entrada:", error);
        mostrarMensaje("Error al eliminar entrada", "error");
    }
}

// Función auxiliar para eliminar entrada de Supabase
async function eliminarEntradaDeSupabase(entradaId) {
    try {
        const supabase = await getSupabase();
        if (!supabase) return;

        const { error } = await supabase
            .from('registro_entradas')
            .delete()
            .eq('id', entradaId);

        if (error) {
            console.error("Error eliminando entrada de Supabase:", error);
        }
    } catch (error) {
        console.error("Error en eliminarEntradaDeSupabase:", error);
    }
}

// Función para generar reporte de entradas
export async function generarReporteEntradas(filtros = {}) {
    try {
        if (!dbEntradas) {
            console.error("Base de datos de entradas no inicializada");
            return;
        }

        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            let entradas = event.target.result;

            // Aplicar filtros
            if (filtros.fechaDesde) {
                entradas = entradas.filter(e => e.fecha_entrada >= filtros.fechaDesde);
            }
            if (filtros.fechaHasta) {
                entradas = entradas.filter(e => e.fecha_entrada <= filtros.fechaHasta);
            }

            // Generar CSV
            let csv = "Fecha,Nombre,Cantidad,Unidad,Proveedor,Número Factura,Comentarios\n";
            entradas.forEach(entrada => {
                csv += `"${entrada.fecha_entrada}","${entrada.nombre}","${entrada.cantidad}","${entrada.unidad}","${entrada.proveedor || ''}","${entrada.numero_factura || ''}","${entrada.comentarios || ''}"\n`;
            });

            // Descargar CSV
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
                const nombreArchivo = `reporte_entradas_${fecha}.csv`;

                link.setAttribute("href", url);
                link.setAttribute("download", nombreArchivo);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                mostrarMensaje("Reporte de entradas generado correctamente", "success");
            }
        };

        request.onerror = function (error) {
            console.error("Error generando reporte:", error);
            mostrarMensaje("Error al generar reporte", "error");
        };
    } catch (error) {
        console.error("Error en generarReporteEntradas:", error);
        mostrarMensaje("Error al generar reporte", "error");
    }
}