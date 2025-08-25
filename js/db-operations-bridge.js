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
import { databaseService } from '../core/services/DatabaseService.js';
import { fileOperationsService } from '../core/services/FileOperationsService.js';

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
    servicioBaseDatos: databaseService.name,
    servicioArchivos: fileOperationsService.name,
    estadoInicializacion: databaseService.status
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
