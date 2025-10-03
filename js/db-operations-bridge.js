/**
 * Migration Bridge - Puente de migración para db-operations.js
 * 
 * Este archivo actúa como puente durante la migración, proporcionando
 * las mismas exportaciones que db-operations.js pero usando la nueva arquitectura.
 * 
 * IMPORTANTE: Este archivo debe reemplazar gradualmente las importaciones
 * del archivo legacy db-operations.js
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

// Importar servicios nuevos
import { databaseService } from '../src/core/services/DatabaseService.js';
import { fileOperationsService } from '../src/core/services/FileOperationsService.js';

// Inicializar servicios si no están inicializados
const initializeServices = async () => {
    if (databaseService.status !== 'initialized') {
        await databaseService.initialize();
    }
    if (fileOperationsService.status !== 'initialized') {
        await fileOperationsService.initialize();
    }
};

// Llamar inicialización de forma asíncrona
initializeServices().catch(error => {
    console.error('Error al inicializar servicios de migración:', error);
});

// ===== EXPORTACIONES DE COMPATIBILIDAD =====

// Variables globales (mantener compatibilidad)
export let db = null;
export let dbInventario = null;

// Actualizar referencias cuando los servicios estén listos
databaseService.on('initialized', () => {
    db = databaseService.db;
    dbInventario = databaseService.dbInventario;
});

// ===== FUNCIONES DE BASE DE DATOS =====

/**
 * Inicializar base de datos principal
 * @returns {Promise} Promesa que resuelve con la instancia de la DB
 */
export const inicializarDB = async () => {
    await databaseService.initializeMainDB();
    db = databaseService.db;
    return db;
};

/**
 * Inicializar base de datos de inventario
 * @returns {Promise} Promesa que resuelve con la instancia de la DB
 */
export const inicializarDBInventario = async () => {
    await databaseService.initializeInventoryDB();
    dbInventario = databaseService.dbInventario;
    return dbInventario;
};

/**
 * Inicializar suscripciones en tiempo real
 * @returns {Promise} Promesa que resuelve cuando las suscripciones están activas
 */
export const inicializarSuscripciones = () => {
    return databaseService.initializeSubscriptions();
};

/**
 * Agregar elemento a la cola de sincronización
 * @param {Object} data - Datos a sincronizar
 */
export const agregarAColaSincronizacion = (data) => {
    databaseService.addToSyncQueue(data);
};

/**
 * Procesar cola de sincronización
 * @returns {Promise} Promesa que resuelve cuando la cola se procesa
 */
export const procesarColaSincronizacion = () => {
    return databaseService.processSyncQueue();
};

/**
 * Resetear base de datos
 * @param {IDBDatabase} database - Instancia de la base de datos
 * @param {string} storeName - Nombre del store a resetear
 * @returns {Promise} Promesa que resuelve cuando se completa el reset
 */
export const resetearBaseDeDatos = (database, storeName) => {
    return databaseService.resetDatabase(database, storeName);
};

// ===== FUNCIONES DE ARCHIVOS =====

/**
 * Cargar archivo CSV
 * @param {Event} event - Evento del input file
 * @returns {Promise} Promesa que resuelve con los productos procesados
 */
export const cargarCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) {
        throw new Error('No se seleccionó archivo');
    }
    return await fileOperationsService.loadProductsCSV(file);
};

/**
 * Descargar productos como CSV
 * @returns {Promise} Promesa que resuelve cuando se completa la descarga
 */
export const descargarCSV = () => {
    return fileOperationsService.downloadProductsCSV();
};

/**
 * Descargar inventario como CSV
 * @returns {Promise} Promesa que resuelve cuando se completa la descarga
 */
export const descargarInventarioCSV = () => {
    return fileOperationsService.downloadInventoryCSV();
};

/**
 * Descargar inventario como PDF
 * @param {Object} opciones - Opciones para la generación del PDF
 * @returns {Promise} Promesa que resuelve cuando se completa la descarga
 */
export const descargarInventarioPDF = (opciones = {}) => {
    return fileOperationsService.downloadInventoryPDF(opciones);
};

// ===== FUNCIONES LEGACY DEPRECADAS =====

/**
 * @deprecated Usar productRepository.findAll() en su lugar
 * Cargar datos en tabla de archivos (legacy)
 */
export const cargarDatosEnTabla = async () => {
    console.warn('DEPRECATED: cargarDatosEnTabla() - Usar productRepository.findAll()');
    
    const tbody = document.getElementById("databaseBody");
    if (!tbody) {
        console.error("Elemento 'databaseBody' no encontrado.");
        return;
    }

    try {
        // Import legacy function dynamically to avoid circular dependencies
        const { cargarDatosEnTabla: legacyCargarDatos } = await import('./db-operations.js');
        return await legacyCargarDatos();
    } catch (error) {
        console.error('Error al cargar datos en tabla:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500">Error al cargar datos</td></tr>';
    }
};

/**
 * @deprecated Usar productRepository.findAll() en su lugar
 */
export const cargarDatosInventarioEnTablaPlantilla = () => {
    console.warn('DEPRECATED: cargarDatosInventarioEnTablaPlantilla() - Usar productRepository.findAll()');
    // Implementación mínima para compatibilidad
    return Promise.resolve([]);
};

/**
 * @deprecated Usar productService.syncFromBackend() en su lugar
 */
export const sincronizarProductosDesdeBackend = () => {
    console.warn('DEPRECATED: sincronizarProductosDesdeBackend() - Usar productService.syncFromBackend()');
    return Promise.resolve();
};

/**
 * @deprecated Usar productService.syncToBackend() en su lugar
 */
export const subirProductosAlBackend = () => {
    console.warn('DEPRECATED: subirProductosAlBackend() - Usar productService.syncToBackend()');
    return Promise.resolve();
};

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Obtener estadísticas de sincronización
 * @returns {Object} Estadísticas actuales de sincronización
 */
export const obtenerEstadisticasSincronizacion = () => {
    return databaseService.getSyncStats();
};

/**
 * Verificar estado de la base de datos
 * @returns {Object} Estado actual de las bases de datos
 */
export const verificarEstadoDB = () => {
    return {
        dbPrincipal: databaseService.db !== null,
        dbInventario: databaseService.dbInventario !== null,
        servicioInicializado: databaseService.status === 'initialized',
        colaSincronizacion: databaseService.syncQueue.length
    };
};

// ===== EVENTOS Y LISTENERS =====

/**
 * Escuchar eventos del servicio de base de datos
 * @param {string} evento - Nombre del evento
 * @param {Function} callback - Función callback
 */
export const escucharEventoDB = (evento, callback) => {
    databaseService.on(evento, callback);
};

/**
 * Escuchar eventos del servicio de archivos
 * @param {string} evento - Nombre del evento
 * @param {Function} callback - Función callback
 */
export const escucharEventoArchivos = (evento, callback) => {
    fileOperationsService.on(evento, callback);
};

// ===== FUNCIONES ADICIONALES PARA COMPATIBILIDAD =====

/**
 * @deprecated Generar plantilla de inventario (legacy)
 * Usar InventoryService en su lugar
 */
export const generarPlantillaInventario = async () => {
    console.warn('DEPRECATED: generarPlantillaInventario() - Usar InventoryService');
    try {
        const { generarPlantillaInventario: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al generar plantilla de inventario:', error);
        throw error;
    }
};

/**
 * @deprecated Sincronizar inventario desde Supabase (legacy)
 * Usar InventoryService.syncFromBackend() en su lugar
 */
export const sincronizarInventarioDesdeSupabase = async () => {
    console.warn('DEPRECATED: sincronizarInventarioDesdeSupabase() - Usar InventoryService.syncFromBackend()');
    try {
        const { sincronizarInventarioDesdeSupabase: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al sincronizar inventario:', error);
        throw error;
    }
};

/**
 * @deprecated Obtener ubicación en uso (legacy)
 * Usar DatabaseService o LocationRepository en su lugar
 */
export const obtenerUbicacionEnUso = async () => {
    console.warn('DEPRECATED: obtenerUbicacionEnUso() - Usar LocationRepository');
    try {
        const { obtenerUbicacionEnUso: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al obtener ubicación en uso:', error);
        return null;
    }
};

/**
 * @deprecated Guardar área ID de forma persistente (legacy)
 * Usar ConfigurationService en su lugar
 */
export const guardarAreaIdPersistente = async (areaId) => {
    console.warn('DEPRECATED: guardarAreaIdPersistente() - Usar ConfigurationService');
    try {
        const { guardarAreaIdPersistente: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc(areaId);
    } catch (error) {
        console.error('Error al guardar área ID:', error);
        throw error;
    }
};

/**
 * @deprecated Obtener área ID (legacy)
 * Usar ConfigurationService en su lugar
 */
export const obtenerAreaId = async () => {
    console.warn('DEPRECATED: obtenerAreaId() - Usar ConfigurationService');
    try {
        const { obtenerAreaId: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al obtener área ID:', error);
        return null;
    }
};

/**
 * @deprecated Inicializar DB de entradas (legacy)
 * Usar DatabaseService en su lugar
 */
export const inicializarDBEntradas = async () => {
    console.warn('DEPRECATED: inicializarDBEntradas() - Usar DatabaseService');
    try {
        const { inicializarDBEntradas: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al inicializar DB de entradas:', error);
        throw error;
    }
};

/**
 * @deprecated Procesar cola de sincronización de entradas (legacy)
 * Usar DatabaseService.processSyncQueue() en su lugar
 */
export const procesarColaSincronizacionEntradas = async () => {
    console.warn('DEPRECATED: procesarColaSincronizacionEntradas() - Usar DatabaseService.processSyncQueue()');
    try {
        const { procesarColaSincronizacionEntradas: legacyFunc } = await import('./db-operations.js');
        return await legacyFunc();
    } catch (error) {
        console.error('Error al procesar cola de sincronización de entradas:', error);
        throw error;
    }
};

// ===== CONFIGURACIÓN AUTOMÁTICA =====

// Configurar listeners automáticos para conexión/desconexión
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('Conexión restablecida - procesando cola de sincronización');
        databaseService.processSyncQueue();
    });

    window.addEventListener('offline', () => {
        console.log('Conexión perdida - modo offline activado');
    });
}

// ===== MENSAJE DE MIGRACIÓN =====

console.log('🔄 db-operations-bridge.js cargado - Usando nueva arquitectura de servicios');
console.log('📊 Estadísticas de migración:', {
    servicioBaseDatos: databaseService?.name || 'DatabaseService',
    servicioArchivos: fileOperationsService?.name || 'FileOperationsService',
    estadoInicializacion: databaseService?.status || 'pendiente'
});

// Exportar servicios directamente para uso avanzado
export { databaseService, fileOperationsService };

// Exportar función de inicialización completa
export const inicializarTodosLosServicios = async () => {
    try {
        await databaseService.initialize();
        await fileOperationsService.initialize();
        
        console.log('✅ Todos los servicios de migración inicializados correctamente');
        return {
            databaseService,
            fileOperationsService,
            stats: databaseService.getSyncStats()
        };
    } catch (error) {
        console.error('❌ Error al inicializar servicios de migración:', error);
        throw error;
    }
};

// Nota: Las exportaciones de este módulo ya se realizan en cada declaración
// (export const ...) y, adicionalmente, se exportan directamente los servicios
// 'databaseService' y 'fileOperationsService' unas líneas arriba. No es
// necesario (ni correcto) volver a exportar símbolos que no existen en este
// archivo. Mantener las exportaciones declarativas evita errores de carga ESM.
