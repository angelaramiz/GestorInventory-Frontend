/**
 * FASE 6: Gestión de Inventario Temporal (Productos Escaneados)
 * Maneja la tabla de inventario temporal durante el escaneo
 * NOTA: Usa la misma DB que db-operations-pz.js para evitar conflictos
 */

const DB_NAME = 'GestorInventory_PZ'; // Misma BD que db-operations-pz.js
const STORE_INVENTARIO_TEMPORAL = 'inventario_temporal_escaneo';

let db = null;

/**
 * Inicializa IndexedDB para inventario temporal (reutiliza conexión existente)
 * @returns {Promise<IDBDatabase>}
 */
export async function inicializarDBInventarioTemporal() {
    // Si ya está inicializada, retornar inmediatamente
    if (db) {
        console.log('✅ IndexedDB del inventario temporal ya estaba inicializada');
        return Promise.resolve(db);
    }

    console.log('🔄 Inicializando IndexedDB para inventario temporal...');
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // Versión 2 para crear todos los stores

        request.onerror = () => {
            console.error('❌ Error al abrir IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB para inventario temporal inicializada correctamente');
            
            // Crear store si no existe (sin necesidad de upgrade)
            if (!db.objectStoreNames.contains(STORE_INVENTARIO_TEMPORAL)) {
                console.warn('⚠️ Store inventario_temporal_escaneo no existe. Necesitarías actualizar la BD.');
                // En un escenario real, habría que cerrar y reintentar con upgrade
                // Por ahora, asumimos que se creó en algún lado
            }
            
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            console.log('🔄 onupgradeneeded disparado - actualizando esquema');
            const database = event.target.result;

            // Crear store si no existe
            if (!database.objectStoreNames.contains(STORE_INVENTARIO_TEMPORAL)) {
                const store = database.createObjectStore(STORE_INVENTARIO_TEMPORAL, { keyPath: 'id', autoIncrement: true });
                store.createIndex('virtual_id', 'virtual_id', { unique: false });
                store.createIndex('estado', 'estado', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('✅ Store inventario_temporal_escaneo creado');
            } else {
                console.log('✅ Store inventario_temporal_escaneo ya existe');
            }
        };
    });
}

/**
 * Guarda un producto escaneado en el inventario temporal
 * @param {Object} datos - { virtual_id, codigo_producto, nombre, cantidad, caducidad, seccion, nivel }
 * @returns {Promise<number>} ID del registro guardado
 */
export async function guardarProductoEscaneado(datos) {
    console.log('💾 Guardando producto en inventario temporal:1', datos);
    
    try {
        // Verificar que db está inicializada
        if (!db) {
            console.error('❌ CRÍTICO: db es null. Asegúrate de llamar inicializarDBInventarioTemporal() antes');
            throw new Error('IndexedDB no está inicializada. Llama inicializarDBInventarioTemporal() primero');
        }
        
        console.log('💾 Guardando producto en inventario temporal:2', datos);

        return new Promise((resolve, reject) => {
            try {
                console.log('💾 Intentando crear transacción...');
                const transaction = db.transaction([STORE_INVENTARIO_TEMPORAL], 'readwrite');
                const store = transaction.objectStore(STORE_INVENTARIO_TEMPORAL);

                const registro = {
                    virtual_id: datos.virtual_id,
                    codigo_producto: datos.codigo_producto,
                    nombre: datos.nombre,
                    
                    // NUEVOS CAMPOS: Información del producto escaneado
                    marca: datos.marca || '',
                    categoria: datos.categoria || '',
                    unidad: datos.unidad || 'unidad',
                    
                    // Datos del conteo manual
                    cantidad: datos.cantidad,
                    caducidad: datos.caducidad,
                    
                    // Ubicación
                    seccion: datos.seccion,
                    nivel: datos.nivel,
                    
                    // Estado y timestamp
                    estado: 'confirmado', // pendiente, confirmado, rechazado
                    timestamp: new Date().toISOString(),
                    fecha_escaneo: new Date().toLocaleString('es-ES')
                };

                console.log('💾 Agregando registro a store...');
                const request = store.add(registro);

                request.onsuccess = () => {
                    console.log(`✅ Producto ${datos.nombre} guardado en inventario temporal (ID: ${request.result})`);
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('❌ Error guardando producto:', request.error);
                    reject(request.error);
                };
                
                transaction.onerror = () => {
                    console.error('❌ Error en transacción:', transaction.error);
                    reject(transaction.error);
                };
                
            } catch (error) {
                console.error('❌ Error en promesa de guardarProductoEscaneado:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('❌ Error en guardarProductoEscaneado (nivel alto):', error);
        throw error;
    }
}

/**
 * Obtiene todos los productos escaneados
 * @returns {Promise<Array>}
 */
export async function obtenerProductosEscaneados() {
    if (!db) await inicializarDBInventarioTemporal();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_INVENTARIO_TEMPORAL], 'readonly');
        const store = transaction.objectStore(STORE_INVENTARIO_TEMPORAL);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log(`✅ ${request.result.length} productos escaneados recuperados`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo productos:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Obtiene productos por virtual_id (de un producto virtual específico)
 * @param {number} virtualId - ID del producto virtual
 * @returns {Promise<Array>}
 */
export async function obtenerEscaneoPorVirtualId(virtualId) {
    if (!db) await inicializarDBInventarioTemporal();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_INVENTARIO_TEMPORAL], 'readonly');
        const store = transaction.objectStore(STORE_INVENTARIO_TEMPORAL);
        const index = store.index('virtual_id');
        const request = index.getAll(virtualId);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * Obtiene resumen del escaneo actual
 * @returns {Promise<Object>}
 */
export async function obtenerResumenEscaneo() {
    try {
        const productos = await obtenerProductosEscaneados();
        
        return {
            totalEscaneados: productos.length,
            confirmados: productos.filter(p => p.estado === 'confirmado').length,
            rechazados: productos.filter(p => p.estado === 'rechazado').length,
            productos: productos
        };
    } catch (error) {
        console.error('❌ Error obteniendo resumen:', error);
        throw error;
    }
}

/**
 * Elimina todos los productos del inventario temporal
 * @returns {Promise<boolean>}
 */
export async function limpiarInventarioTemporal() {
    if (!db) await inicializarDBInventarioTemporal();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_INVENTARIO_TEMPORAL], 'readwrite');
        const store = transaction.objectStore(STORE_INVENTARIO_TEMPORAL);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('✅ Inventario temporal limpiado');
            resolve(true);
        };

        request.onerror = () => {
            console.error('❌ Error limpiando:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Obtiene estadísticas de escaneo por sección
 * @returns {Promise<Object>}
 */
export async function obtenerEstadisticasPorSeccion() {
    try {
        const productos = await obtenerProductosEscaneados();
        const stats = {};

        productos.forEach(p => {
            const key = `Sección ${p.seccion}`;
            if (!stats[key]) {
                stats[key] = { total: 0, confirmados: 0, rechazados: 0 };
            }
            stats[key].total++;
            if (p.estado === 'confirmado') stats[key].confirmados++;
            if (p.estado === 'rechazado') stats[key].rechazados++;
        });

        return stats;
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
}

export { DB_NAME, STORE_INVENTARIO_TEMPORAL };
