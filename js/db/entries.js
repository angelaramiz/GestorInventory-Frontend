// entries.js
// Funciones relacionadas con registro de entradas

import { dbEntradas } from './db-init.js';
import { getSupabase } from '../auth/auth.js';
import { mostrarMensaje } from '../utils/logs.js';

// Cola de sincronización específica para entradas
let syncQueueEntradas = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');

export function agregarAColaSincronizacionEntradas(data) {
    // Preparar solo los campos que existen en la tabla de Supabase
    const dataSupabase = {
        id: data.id,
        codigo: data.codigo,
        nombre: data.nombre,
        marca: data.marca || '',
        categoria: data.categoria || '',
        unidad: data.unidad || '',
        cantidad: data.cantidad,
        fecha_entrada: data.fecha_entrada,
        comentarios: data.comentarios || '',
        usuario_id: data.usuario_id,
        producto_id: data.producto_id || null,
        categoria_id: data.categoria_id || '00000000-0000-0000-0000-000000000001',
        created_at: data.created_at,
        updated_at: new Date().toISOString()
        // ❌ NO INCLUIR: area_id, lote, numero_factura, is_temp_id
    };

    syncQueueEntradas.push(dataSupabase);
    localStorage.setItem('syncQueueEntradas', JSON.stringify(syncQueueEntradas));

    if (navigator.onLine) {
        procesarColaSincronizacionEntradas();
    }
}

// Procesar la cola de sincronización de entradas con sincronización bidireccional
export async function procesarColaSincronizacionEntradas() {
    if (!navigator.onLine) {
        console.warn("No hay conexión a internet, sincronización pospuesta");
        return;
    }

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no disponible para sincronización de entradas");
            return;
        }

        const maxReintentos = 3;
        let reintentos = 0;

        while (syncQueueEntradas.length > 0 && reintentos < maxReintentos) {
            const item = syncQueueEntradas.shift();
            let intentoActual = 0;

            // Reintentar hasta 3 veces por elemento
            while (intentoActual < maxReintentos) {
                try {
                    console.log(`📤 Enviando entrada a Supabase (intento ${intentoActual + 1}/${maxReintentos}):`, item);
                    
                    // itemParaSupabase ya contiene solo los campos válidos de la tabla
                    const itemParaSupabase = item;
                    
                    // Intentar upsert en Supabase
                    const { data, error } = await supabase
                        .from('registro_entradas')
                        .upsert(itemParaSupabase, { onConflict: 'id' })
                        .select();

                    if (error) {
                        console.error(`⚠️ Error en intento ${intentoActual + 1}:`, error.message);
                        intentoActual++;
                        
                        if (intentoActual < maxReintentos) {
                            // Esperar un tiempo antes de reintentar (exponencial)
                            const tiempoEspera = Math.pow(2, intentoActual) * 1000;
                            console.log(`⏳ Reintentando en ${tiempoEspera}ms...`);
                            await new Promise(resolve => setTimeout(resolve, tiempoEspera));
                            continue;
                        } else {
                            throw new Error(`Upsert fallido después de ${maxReintentos} intentos: ${error.message}`);
                        }
                    }

                    // Actualizar IndexedDB con el ID permanente
                    if (data && data[0]) {
                        console.log(`✅ Entrada sincronizada en Supabase con ID:`, data[0].id);
                        const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
                        const objectStore = transaction.objectStore("registro_entradas");

                        // Eliminar el registro temporal
                        await new Promise((resolve, reject) => {
                            const deleteRequest = objectStore.delete(item.id);
                            deleteRequest.onsuccess = () => {
                                console.log(`🗑️ Registro temporal eliminado`);
                                resolve();
                            };
                            deleteRequest.onerror = () => reject(deleteRequest.error);
                        });

                        // Agregar el registro actualizado
                        const itemActualizado = { ...item, id: data[0].id, is_temp_id: false };
                        await new Promise((resolve, reject) => {
                            const addRequest = objectStore.add(itemActualizado);
                            addRequest.onsuccess = () => {
                                console.log(`✨ Registro actualizado en IndexedDB`);
                                resolve();
                            };
                            addRequest.onerror = () => reject(addRequest.error);
                        });
                    }

                    localStorage.setItem('syncQueueEntradas', JSON.stringify(syncQueueEntradas));
                    break; // Salir del loop de reintentos si fue exitoso
                    
                } catch (error) {
                    console.error(`❌ Error procesando entrada (intento ${intentoActual + 1}):`, error);
                    intentoActual++;
                    
                    if (intentoActual < maxReintentos) {
                        const tiempoEspera = Math.pow(2, intentoActual) * 1000;
                        console.log(`⏳ Reintentando en ${tiempoEspera}ms...`);
                        await new Promise(resolve => setTimeout(resolve, tiempoEspera));
                    } else {
                        // Reinsertar el elemento al principio de la cola si falló todos los intentos
                        console.warn(`🔄 Elemento devuelto a la cola después de ${maxReintentos} intentos`);
                        syncQueueEntradas.unshift(item);
                        reintentos++;
                        break;
                    }
                }
            }
        }

        localStorage.setItem('syncQueueEntradas', JSON.stringify(syncQueueEntradas));
        
        if (syncQueueEntradas.length === 0) {
            console.log("✅ Sincronización de entradas completada");
            mostrarMensaje("Sincronización de entradas completada", "success");
        } else {
            console.warn(`⚠️ Cola de sincronización aún contiene ${syncQueueEntradas.length} elementos`);
            mostrarMensaje(`${syncQueueEntradas.length} entrada(s) pendiente(s) de sincronizar`, "warning");
        }
    } catch (error) {
        console.error('❌ Error en procesarColaSincronizacionEntradas:', error);
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
        // Validar datos mínimos requeridos
        if (!entradaData.codigo || !entradaData.nombre || !entradaData.cantidad) {
            throw new Error("Faltan datos requeridos para la entrada (código, nombre, cantidad)");
        }

        // Preparar los datos de la entrada
        const entrada = {
            codigo: entradaData.codigo,
            nombre: entradaData.nombre,
            marca: entradaData.marca || '',
            categoria: entradaData.categoria || '',
            unidad: entradaData.unidad || '',
            cantidad: entradaData.cantidad,
            fecha_entrada: entradaData.fecha_entrada || new Date().toISOString().split('T')[0],
            comentarios: entradaData.comentarios || '',
            usuario_id: entradaData.usuario_id || localStorage.getItem('usuario_id'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            producto_id: entradaData.producto_id || null,
            categoria_id: entradaData.categoria_id || '00000000-0000-0000-0000-000000000001',
            is_temp_id: true // Solo para IndexedDB, no se envía a Supabase
        };

        // Validar que el usuario esté disponible
        if (!entrada.usuario_id) {
            throw new Error("No se puede registrar entrada sin usuario autenticado");
        }

        // Guardar en IndexedDB
        const transaction = dbEntradas.transaction(["registro_entradas"], "readwrite");
        const objectStore = transaction.objectStore("registro_entradas");

        const request = objectStore.add(entrada);

        return new Promise((resolve, reject) => {
            request.onsuccess = function (event) {
                const entradaId = event.target.result;
                console.log("✅ Entrada agregada localmente con ID:", entradaId);
                console.log("📝 Datos guardados:", {
                    id: entradaId,
                    codigo: entrada.codigo,
                    nombre: entrada.nombre,
                    cantidad: entrada.cantidad,
                    fecha: entrada.fecha_entrada
                });
                
                // Agregar a la cola de sincronización
                agregarAColaSincronizacionEntradas({ ...entrada, id: entradaId });
                resolve(entradaId);
            };
            request.onerror = function (event) {
                console.error("❌ Error al agregar entrada:", event.target.error);
                reject(new Error(`No se pudo guardar la entrada: ${event.target.error}`));
            };
        });

    } catch (error) {
        console.error("❌ Error en agregarRegistroEntrada:", error);
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

// ============================================================
// COLA DE SINCRONIZACIÓN PARA PRODUCTOS AGREGADOS EN REGISTRO
// ============================================================

let syncQueueProductos = JSON.parse(localStorage.getItem('syncQueueProductos') || '[]');

// Función para agregar un producto a la cola de sincronización
export function agregarAColaProductosRegistroEntradas(productData) {
    // Preparar solo los campos que existen en la tabla productos de Supabase
    const dataSupabase = {
        codigo: productData.codigo,
        nombre: productData.nombre,
        marca: productData.marca || '',
        categoria: productData.categoria || '',
        unidad: productData.unidad || '',
        categoria_id: productData.categoria_id || '00000000-0000-0000-0000-000000000001',
        usuario_id: productData.usuario_id || localStorage.getItem('usuario_id'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
        // ❌ NO INCLUIR: area_id, lote, numero_factura, is_temp_id, etc
    };

    syncQueueProductos.push(dataSupabase);
    localStorage.setItem('syncQueueProductos', JSON.stringify(syncQueueProductos));

    if (navigator.onLine) {
        procesarColaProductosRegistroEntradas();
    }
}

// Función para procesar la cola de productos
export async function procesarColaProductosRegistroEntradas() {
    if (!navigator.onLine) {
        console.warn("No hay conexión a internet, sincronización de productos pospuesta");
        return;
    }

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no disponible para sincronización de productos");
            return;
        }

        const maxReintentos = 3;
        const colaLocal = [...syncQueueProductos];

        for (let i = 0; i < colaLocal.length; i++) {
            const item = colaLocal[i];
            let intentoActual = 0;
            let sincronizado = false;

            while (intentoActual < maxReintentos && !sincronizado) {
                try {
                    console.log(`📤 Enviando producto a Supabase (intento ${intentoActual + 1}/${maxReintentos}):`, item);

                    // Intentar upsert en Supabase usando código como identificador
                    const { data, error } = await supabase
                        .from('productos')
                        .upsert(item, { onConflict: 'codigo' })
                        .select();

                    if (error) {
                        console.error(`⚠️ Error en intento ${intentoActual + 1}:`, error.message);
                        intentoActual++;

                        if (intentoActual < maxReintentos) {
                            const tiempoEspera = Math.pow(2, intentoActual) * 1000;
                            console.log(`⏳ Reintentando en ${tiempoEspera}ms...`);
                            await new Promise(resolve => setTimeout(resolve, tiempoEspera));
                        } else {
                            throw new Error(`Upsert fallido después de ${maxReintentos} intentos: ${error.message}`);
                        }
                    } else {
                        console.log(`✅ Producto sincronizado en Supabase:`, data);
                        sincronizado = true;
                        
                        // Remover de la cola
                        syncQueueProductos = syncQueueProductos.filter(p => p.codigo !== item.codigo);
                        localStorage.setItem('syncQueueProductos', JSON.stringify(syncQueueProductos));
                    }
                } catch (error) {
                    console.error(`❌ Error procesando producto (intento ${intentoActual + 1}):`, error);
                    intentoActual++;

                    if (intentoActual >= maxReintentos) {
                        console.warn(`🔄 Producto devuelto a la cola después de ${maxReintentos} intentos`);
                    }
                }
            }
        }

        if (syncQueueProductos.length === 0) {
            console.log("✅ Sincronización de productos completada");
            mostrarMensaje("Productos sincronizados correctamente", "success");
        } else {
            console.warn(`⚠️ Cola de productos aún contiene ${syncQueueProductos.length} elementos`);
        }
    } catch (error) {
        console.error('❌ Error en procesarColaProductosRegistroEntradas:', error);
    }
}