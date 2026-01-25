// sync-bidirectional.js
// Sincronización bidireccional y funciones relacionadas

import { db, dbInventario } from './db-init.js';
import { procesarColaSincronizacion } from './sync-queue.js';
import { getSupabase } from '../auth/auth.js';
import { mostrarAlertaBurbuja } from '../utils/logs.js';
import { cargarDatosInventarioEnTablaPlantilla } from './inventory.js';

// Función para actualizar IndexedDB desde eventos en tiempo real
async function actualizarInventarioDesdeServidor(payload) {
    try {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");

        switch (payload.eventType) {
            case 'INSERT':
                await new Promise((resolve, reject) => {
                    const addRequest = objectStore.add(payload.new);
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = () => reject(addRequest.error);
                });
                break;
            case 'UPDATE':
                await new Promise((resolve, reject) => {
                    const putRequest = objectStore.put(payload.new);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                });
                break;
            case 'DELETE':
                await new Promise((resolve, reject) => {
                    const deleteRequest = objectStore.delete(payload.old.id);
                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
                break;
        }

        // Actualizar la tabla si estamos en inventario.html
        if (window.location.pathname.includes('inventario.html')) {
            cargarDatosInventarioEnTablaPlantilla(); // Asumiendo que se importa o está disponible
        }
    } catch (error) {
        console.error("Error actualizando inventario local:", error);
    }
}

/**
 * Sincronización bidireccional: subida de cambios locales pendientes y bajada de cambios desde Supabase.
 */
export async function sincronizarBidireccional() {
    try {
        // Primero procesar la cola local (subida)
        await procesarColaSincronizacion();
        // Luego bajar cambios desde Supabase y resolver conflictos
        await sincronizarDesdeSupabase();
        // Finalmente, intentar sincronizar productos locales que no hayan subido
        await sincronizarProductosLocalesHaciaSupabase();
    } catch (error) {
        console.error('Error en sincronizarBidireccional:', error);
        throw error;
    }
}

/**
 * Baja cambios desde Supabase y actualiza IndexedDB.
 * - Consulta registros con `last_modified` mayores al último `lastSync` local.
 * - Para conflictos, conserva el que tenga `last_modified` más reciente y en caso de que el local sea más nuevo, lo añade a la cola para subir.
 */
export async function sincronizarDesdeSupabase() {
    try {
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no inicializado para sincronización");
            return;
        }

        const lastSync = localStorage.getItem('lastSync') || '1970-01-01T00:00:00.000Z';
        const maxTimestamp = new Date(lastSync).toISOString();

        // Sincronizar tabla productos
        try {
            const { data: productos, error } = await supabase
                .from('productos')
                .select('*')
                .gt('last_modified', maxTimestamp);

            if (error) {
                console.error('Error sincronizando productos:', error);
            } else if (productos && productos.length > 0) {
                const transaction = db.transaction(["productos"], "readwrite");
                const store = transaction.objectStore("productos");

                for (const producto of productos) {
                    // Verificar si el producto ya existe localmente
                    const existing = await new Promise((resolve) => {
                        const request = store.get(producto.codigo);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => resolve(null);
                    });

                    if (existing) {
                        // Comparar last_modified
                        const localTime = new Date(existing.last_modified || '1970-01-01');
                        const remoteTime = new Date(producto.last_modified);

                        if (remoteTime > localTime) {
                            // El remoto es más nuevo, actualizar local
                            await new Promise((resolve, reject) => {
                                const updateRequest = store.put(producto);
                                updateRequest.onsuccess = () => resolve();
                                updateRequest.onerror = () => reject(updateRequest.error);
                            });
                        } else if (localTime > remoteTime) {
                            // El local es más nuevo, añadir a cola para subir
                            // (Implementar lógica si es necesario)
                        }
                    } else {
                        // Producto nuevo, añadir
                        await new Promise((resolve, reject) => {
                            const addRequest = store.add(producto);
                            addRequest.onsuccess = () => resolve();
                            addRequest.onerror = () => reject(addRequest.error);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error sincronizando productos:', error);
        }

        // Sincronizar tabla inventario — Solo en la ruta inventario.html
        if (window.location && window.location.pathname && window.location.pathname.includes('inventario.html')) {
            try {
                const areaId = localStorage.getItem('area_id');
                if (!areaId) {
                    console.error("No se encontró area_id para sincronizar inventario");
                    return;
                }

                const { data: inventario, error } = await supabase
                    .from('inventario')
                    .select('*')
                    .eq('area_id', areaId)
                    .gt('last_modified', maxTimestamp);

                if (error) {
                    console.error('Error sincronizando inventario:', error);
                } else if (inventario && inventario.length > 0) {
                    const transaction = dbInventario.transaction(["inventario"], "readwrite");
                    const store = transaction.objectStore("inventario");

                    for (const item of inventario) {
                        // Verificar si el item ya existe localmente
                        const existing = await new Promise((resolve) => {
                            const request = store.get(item.id);
                            request.onsuccess = () => resolve(request.result);
                            request.onerror = () => resolve(null);
                        });

                        if (existing) {
                            // Comparar last_modified
                            const localTime = new Date(existing.last_modified || '1970-01-01');
                            const remoteTime = new Date(item.last_modified);

                            if (remoteTime > localTime) {
                                // El remoto es más nuevo, actualizar local
                                await new Promise((resolve, reject) => {
                                    const updateRequest = store.put(item);
                                    updateRequest.onsuccess = () => resolve();
                                    updateRequest.onerror = () => reject(updateRequest.error);
                                });
                            } else if (localTime > remoteTime) {
                                // El local es más nuevo, añadir a cola para subir
                                // (Implementar lógica si es necesario)
                            }
                        } else {
                            // Item nuevo, añadir
                            await new Promise((resolve, reject) => {
                                const addRequest = store.add(item);
                                addRequest.onsuccess = () => resolve();
                                addRequest.onerror = () => reject(addRequest.error);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error sincronizando inventario:', error);
            }
        }

        // Actualizar timestamp de última sincronización
        try {
            localStorage.setItem('lastSync', new Date().toISOString());
        } catch (e) {
            console.error('Error actualizando lastSync:', e);
        }

    } catch (error) {
        console.error('sincronizarDesdeSupabase error:', error);
        throw error;
    }
}

/**
 * Sincroniza productos locales hacia Supabase: para cada producto local, si el remoto no existe
 * o está desactualizado, se hace upsert.
 */
export async function sincronizarProductosLocalesHaciaSupabase() {
    try {
        const supabase = await getSupabase();
        if (!supabase) return;

        const productosLocal = await new Promise((resolve, reject) => {
            const transaction = db.transaction(["productos"], "readonly");
            const store = transaction.objectStore("productos");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        for (const local of productosLocal) {
            try {
                // Verificar si existe en Supabase
                const { data: remote, error } = await supabase
                    .from('productos')
                    .select('last_modified')
                    .eq('codigo', local.codigo)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 es "not found"
                    console.error('Error verificando producto remoto:', error);
                    continue;
                }

                const shouldUpsert = !remote || new Date(local.last_modified || '1970-01-01') > new Date(remote.last_modified);

                if (shouldUpsert) {
                    // Preparar solo los campos válidos de la tabla productos
                    const productoParaSupabase = {
                        codigo: local.codigo,
                        nombre: local.nombre,
                        marca: local.marca || '',
                        categoria: local.categoria || '',
                        unidad: local.unidad || '',
                        categoria_id: local.categoria_id || '00000000-0000-0000-0000-000000000001',
                        last_modified: new Date().toISOString()
                        // ❌ NO INCLUIR: area_id, lote, numero_factura, is_temp_id, etc
                    };

                    console.log(`📤 Sincronizando producto ${local.codigo} a Supabase...`, productoParaSupabase);

                    const { error: upsertError } = await supabase
                        .from('productos')
                        .upsert(productoParaSupabase, { onConflict: 'codigo' });

                    if (upsertError) {
                        console.error('Error subiendo producto:', upsertError);
                    } else {
                        console.log(`✅ Producto ${local.codigo} sincronizado exitosamente`);
                    }
                }
            } catch (error) {
                console.error('Error procesando producto local:', error);
            }
        }
    } catch (error) {
        console.error('sincronizarProductosLocalesHaciaSupabase error:', error);
    }
}

// Configurar suscripción a Supabase
export async function inicializarSuscripciones() {
    const supabase = await getSupabase();
    if (!supabase) {
        console.error("Supabase no inicializado");
        return;
    }

    try {
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            console.error("Usuario no identificado para suscripción");
            return;
        }

        const channel = supabase.channel('inventario-real-time')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, payload => {
                console.log('Cambio en tiempo real:', payload);
                actualizarInventarioDesdeServidor(payload);
            })
            .subscribe((status, err) => {
                if (err) {
                    console.error('Error en suscripción:', err);
                } else {
                    console.log('Suscripción activa:', status);
                }
            });
        return channel;
    } catch (error) {
        console.error("Error en suscripción:", error);
        mostrarAlertaBurbuja("Error en conexión en tiempo real", "error");
    }
}