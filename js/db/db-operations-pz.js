/**
 * FASE 5: Guardado en IndexedDB para Modo PZ
 * Gestiona la persistencia permanente de productos virtuales y secciones
 */

// Nombre de la base de datos y stores
const DB_NAME = 'GestorInventory_PZ';
const STORE_PRODUCTOS_VIRTUALES = 'productos_virtuales_por_seccion';
const STORE_SECCIONES = 'secciones_inventario';

let db = null;

/**
 * Inicializa la base de datos IndexedDB para Modo PZ
 * @returns {Promise<IDBDatabase>} Conexión a la BD
 */
export async function inicializarDBPZ() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = () => {
            console.error('❌ Error al abrir IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB PZ inicializada');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Crear store de productos virtuales
            if (!database.objectStoreNames.contains(STORE_PRODUCTOS_VIRTUALES)) {
                const storeProductos = database.createObjectStore(STORE_PRODUCTOS_VIRTUALES, { keyPath: 'id', autoIncrement: true });
                storeProductos.createIndex('seccion_id', 'seccion_id', { unique: false });
                storeProductos.createIndex('estado', 'estado', { unique: false });
                storeProductos.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('✅ Store productos_virtuales_por_seccion creado');
            }

            // Crear store de secciones
            if (!database.objectStoreNames.contains(STORE_SECCIONES)) {
                const storeSecciones = database.createObjectStore(STORE_SECCIONES, { keyPath: 'id', autoIncrement: true });
                storeSecciones.createIndex('seccion_numero', 'seccion_numero', { unique: false });
                storeSecciones.createIndex('estado', 'estado', { unique: false });
                storeSecciones.createIndex('fecha_guardado', 'fecha_guardado', { unique: false });
                console.log('✅ Store secciones_inventario creado');
            }

            // Crear store para inventario temporal (FASE 6)
            if (!database.objectStoreNames.contains('inventario_temporal_escaneo')) {
                const storeInventarioTemporal = database.createObjectStore('inventario_temporal_escaneo', { keyPath: 'id', autoIncrement: true });
                storeInventarioTemporal.createIndex('virtual_id', 'virtual_id', { unique: false });
                storeInventarioTemporal.createIndex('estado', 'estado', { unique: false });
                storeInventarioTemporal.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('✅ Store inventario_temporal_escaneo creado');
            }
        };
    });
}

/**
 * Limpia toda la base de datos de PZ (elimina todas las secciones y productos)
 * ⚠️ IRREVERSIBLE - Borra todos los datos guardados
 * @returns {Promise<void>}
 */
export async function limpiarBaseDatosPZ() {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_SECCIONES, STORE_PRODUCTOS_VIRTUALES], 'readwrite');
            
            // Limpiar secciones
            const storeSecciones = transaction.objectStore(STORE_SECCIONES);
            const clearSecciones = storeSecciones.clear();
            
            clearSecciones.onsuccess = () => {
                console.log('✅ Todas las secciones eliminadas de IndexedDB');
            };
            
            clearSecciones.onerror = () => {
                console.error('❌ Error limpiando secciones:', clearSecciones.error);
            };
            
            // Limpiar productos
            const storeProductos = transaction.objectStore(STORE_PRODUCTOS_VIRTUALES);
            const clearProductos = storeProductos.clear();
            
            clearProductos.onsuccess = () => {
                console.log('✅ Todos los productos eliminados de IndexedDB');
            };
            
            clearProductos.onerror = () => {
                console.error('❌ Error limpiando productos:', clearProductos.error);
            };
            
            transaction.oncomplete = () => {
                console.log('🧹 Base de datos PZ completamente limpiada');
                resolve();
            };
            
            transaction.onerror = () => {
                console.error('❌ Error en transacción de limpieza:', transaction.error);
                reject(transaction.error);
            };
        } catch (error) {
            console.error('❌ Error limpiando base de datos:', error);
            reject(error);
        }
    });
}

/**
 * Guarda todos los productos de una sección en IndexedDB
 * @param {Object} seccion - Objeto sección con niveles y productos
 * @param {number} seccionId - ID de la sección en BD
 * @returns {Promise<Array>} Array de IDs insertados
 */
export async function guardarProductosVirtualesEnDB(seccion, seccionId) {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS_VIRTUALES], 'readwrite');
        const store = transaction.objectStore(STORE_PRODUCTOS_VIRTUALES);
        const idsInsertados = [];

        seccion.niveles.forEach(nivel => {
            nivel.productos.forEach(producto => {
                const registro = {
                    seccion_id: seccionId,
                    seccion_numero: seccion.seccion,
                    nivel: nivel.nivel,
                    numero_producto: producto.numero,
                    cantidad: producto.cantidad,
                    caducidad: producto.caducidad,
                    timestamp: producto.timestamp,
                    fecha_guardado: new Date().toISOString(),
                    estado: 'pendiente'
                };

                const request = store.add(registro);
                request.onsuccess = () => {
                    idsInsertados.push(request.result);
                };
            });
        });

        transaction.oncomplete = () => {
            console.log(`✅ ${idsInsertados.length} productos virtuales guardados en IndexedDB`);
            resolve(idsInsertados);
        };

        transaction.onerror = () => {
            console.error('❌ Error guardando productos virtuales:', transaction.error);
            reject(transaction.error);
        };
    });
}

/**
 * Guarda metadatos de una sección en IndexedDB
 * @param {Object} seccion - Objeto sección
 * @returns {Promise<number>} ID de la sección insertada
 */
export async function guardarSeccionMetadataEnDB(seccion) {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SECCIONES], 'readwrite');
        const store = transaction.objectStore(STORE_SECCIONES);

        const registro = {
            seccion_numero: seccion.seccion,
            total_productos: seccion.niveles.reduce((sum, n) => sum + n.productos.length, 0),
            total_niveles: seccion.niveles.length,
            estado: 'completada',
            fecha_inicio: seccion.fechaInicio || new Date().toISOString(),
            fecha_guardado: new Date().toISOString()
        };

        const request = store.add(registro);

        request.onsuccess = () => {
            console.log(`✅ Sección ${seccion.seccion} guardada en IndexedDB (ID: ${request.result})`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error guardando metadatos de sección:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Guarda una sección completa (metadata + productos)
 * @param {Object} seccion - Objeto sección con niveles y productos
 * @returns {Promise<Object>} Resultado con IDs guardados
 */
export async function guardarSeccionComplotaEnDB(seccion) {
    try {
        const seccionId = await guardarSeccionMetadataEnDB(seccion);
        const idsProductos = await guardarProductosVirtualesEnDB(seccion, seccionId);

        return {
            seccionId,
            totalProductosGuardados: idsProductos.length,
            estado: 'éxito'
        };
    } catch (error) {
        console.error('❌ Error guardando sección completa:', error);
        throw error;
    }
}

/**
 * Obtiene todos los productos de una sección
 * @param {number} seccionId - ID de la sección
 * @returns {Promise<Array>} Array de productos
 */
export async function obtenerProductosPorSeccion(seccionId) {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS_VIRTUALES], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS_VIRTUALES);
        const index = store.index('seccion_id');
        const request = index.getAll(seccionId);

        request.onsuccess = () => {
            console.log(`✅ ${request.result.length} productos recuperados para sección ${seccionId}`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo productos:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Obtiene todas las secciones guardadas
 * @returns {Promise<Array>} Array de secciones
 */
export async function obtenerTodasLasSecciones() {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SECCIONES], 'readonly');
        const store = transaction.objectStore(STORE_SECCIONES);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log(`✅ ${request.result.length} secciones recuperadas de IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo secciones:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Obtiene estadísticas de la BD
 * @returns {Promise<Object>} Estadísticas de guardado
 */
export async function obtenerEstadisticasDB() {
    try {
        const secciones = await obtenerTodasLasSecciones();
        const totalProductos = secciones.reduce((sum, s) => sum + s.total_productos, 0);
        const totalNiveles = secciones.reduce((sum, s) => sum + s.total_niveles, 0);

        return {
            totalSecciones: secciones.length,
            totalProductos,
            totalNiveles,
            secciones: secciones.map(s => ({
                id: s.id,
                seccion: s.seccion_numero,
                productos: s.total_productos,
                niveles: s.total_niveles,
                guardado: new Date(s.fecha_guardado).toLocaleString('es-ES')
            }))
        };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
}

/**
 * Elimina una sección y sus productos
 * @param {number} seccionId - ID de la sección a eliminar
 * @returns {Promise<boolean>}
 */
export async function eliminarSeccion(seccionId) {
    if (!db) await inicializarDBPZ();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SECCIONES, STORE_PRODUCTOS_VIRTUALES], 'readwrite');

        // Eliminar metadata de sección
        const storeS = transaction.objectStore(STORE_SECCIONES);
        storeS.delete(seccionId);

        // Eliminar productos de la sección
        const storeP = transaction.objectStore(STORE_PRODUCTOS_VIRTUALES);
        const indexP = storeP.index('seccion_id');
        const requestP = indexP.getAllKeys(seccionId);

        requestP.onsuccess = () => {
            requestP.result.forEach(key => {
                storeP.delete(key);
            });
        };

        transaction.oncomplete = () => {
            console.log(`✅ Sección ${seccionId} eliminada de IndexedDB`);
            resolve(true);
        };

        transaction.onerror = () => {
            console.error('❌ Error eliminando sección:', transaction.error);
            reject(transaction.error);
        };
    });
}

/**
 * Exporta todas las secciones en formato JSON
 * @returns {Promise<string>} JSON stringificado
 */
export async function exportarBaseDatosJSON() {
    try {
        const secciones = await obtenerTodasLasSecciones();

        const todasLasSecciones = await Promise.all(
            secciones.map(async (sec) => {
                const productos = await obtenerProductosPorSeccion(sec.id);
                return {
                    metadata: sec,
                    productos
                };
            })
        );

        return JSON.stringify({
            version: '1.0',
            tipo: 'Inventario PZ - IndexedDB Export',
            fechaExportacion: new Date().toISOString(),
            secciones: todasLasSecciones
        }, null, 2);
    } catch (error) {
        console.error('❌ Error exportando BD:', error);
        throw error;
    }
}

export { DB_NAME, STORE_PRODUCTOS_VIRTUALES, STORE_SECCIONES };
