/**
 * ⚠️ ARCHIVO DEPRECADO - Usar DatabaseService y FileOperationsService
 * 
 * Este archivo se mantiene únicamente por compatibilidad hacia atrás.
 * Todo el código nuevo debe usar los servicios modernos de base de datos.
 * 
 * MIGRACIÓN COMPLETA EN FASE 2:
 * - Servicio: DatabaseService (IndexedDB y sincronización)
 * - Servicio: FileOperationsService (CSV, PDF, importación/exportación)
 * - Bridge: db-operations-bridge.js (390 líneas)
 * - Documentado en: docs/PHASE_2_SUMMARY.md
 * 
 * FASE 3 - NIVEL 4: Wrapper para compatibilidad
 * 
 * USO MODERNO:
 * import { databaseService } from '../src/core/services/DatabaseService.js';
 * import { fileOperationsService } from '../src/core/services/FileOperationsService.js';
 * 
 * @deprecated v3.0.0 - Usar servicios modernos
 * @see src/core/services/DatabaseService.js
 * @see src/core/services/FileOperationsService.js
 * @see js/db-operations-bridge.js
 */

console.warn('⚠️ db-operations.js está DEPRECADO. Usar DatabaseService/FileOperationsService para nuevo código.');

// Re-exportar todas las funciones y variables desde el bridge
export {
    // Variables globales de BD
    db,
    dbInventario,
    
    // Inicialización de bases de datos
    inicializarDB,
    inicializarDBInventario,
    inicializarDBEntradas,
    inicializarSuscripciones,
    inicializarTodosLosServicios,
    
    // Cola de sincronización
    agregarAColaSincronizacion,
    procesarColaSincronizacion,
    procesarColaSincronizacionEntradas,
    
    // Operaciones de base de datos
    resetearBaseDeDatos,
    verificarEstadoDB,
    
    // Operaciones con archivos
    cargarCSV,
    descargarCSV,
    descargarInventarioCSV,
    descargarInventarioPDF,
    
    // Carga de datos en tablas
    cargarDatosEnTabla,
    cargarDatosInventarioEnTablaPlantilla,
    
    // Sincronización con backend
    sincronizarProductosDesdeBackend,
    subirProductosAlBackend,
    sincronizarInventarioDesdeSupabase,
    obtenerEstadisticasSincronizacion,
    
    // Eventos
    escucharEventoDB,
    escucharEventoArchivos,
    
    // Plantillas e inventario
    generarPlantillaInventario,
    
    // Gestión de áreas/ubicaciones
    obtenerUbicacionEnUso,
    guardarAreaIdPersistente,
    obtenerAreaId
} from './db-operations-bridge.js';

/**
 * NOTA PARA DESARROLLADORES:
 * 
 * Este archivo es un thin wrapper que re-exporta funciones del bridge.
 * El bridge (db-operations-bridge.js) delega a 2 servicios modernos principales.
 * 
 * ARQUITECTURA:
 * db-operations.js (wrapper deprecado, 95 líneas)
 *     ↓
 * db-operations-bridge.js (adaptador, 390 líneas)
 *     ↓
 * DatabaseService         - IndexedDB, sincronización, gestión de datos
 * FileOperationsService   - CSV, PDF, importación, exportación
 * 
 * FUNCIONES DISPONIBLES (28+):
 * 
 * Variables Globales:
 * - db - Instancia de IndexedDB principal
 * - dbInventario - Instancia de IndexedDB de inventario
 * 
 * Inicialización:
 * - inicializarDB() - Inicializar BD principal
 * - inicializarDBInventario() - Inicializar BD de inventario
 * - inicializarDBEntradas() - Inicializar BD de entradas
 * - inicializarSuscripciones() - Inicializar suscripciones a eventos
 * - inicializarTodosLosServicios() - Inicializar todos los servicios
 * 
 * Sincronización:
 * - agregarAColaSincronizacion(data) - Agregar operación a cola
 * - procesarColaSincronizacion() - Procesar cola de sincronización
 * - procesarColaSincronizacionEntradas() - Procesar cola de entradas
 * - sincronizarProductosDesdeBackend() - Sincronizar desde Supabase
 * - subirProductosAlBackend() - Subir a Supabase
 * - sincronizarInventarioDesdeSupabase() - Sincronizar inventario
 * - obtenerEstadisticasSincronizacion() - Obtener estadísticas
 * 
 * Base de Datos:
 * - resetearBaseDeDatos(database, storeName) - Resetear BD
 * - verificarEstadoDB() - Verificar estado de BD
 * 
 * Archivos:
 * - cargarCSV(event) - Cargar archivo CSV
 * - descargarCSV() - Descargar productos como CSV
 * - descargarInventarioCSV() - Descargar inventario como CSV
 * - descargarInventarioPDF(opciones) - Generar PDF de inventario
 * - generarPlantillaInventario() - Generar plantilla vacía
 * 
 * Tablas:
 * - cargarDatosEnTabla() - Cargar datos de productos en tabla
 * - cargarDatosInventarioEnTablaPlantilla() - Cargar inventario en tabla
 * 
 * Eventos:
 * - escucharEventoDB(evento, callback) - Escuchar eventos de BD
 * - escucharEventoArchivos(evento, callback) - Escuchar eventos de archivos
 * 
 * Áreas/Ubicaciones:
 * - obtenerUbicacionEnUso() - Obtener área/ubicación actual
 * - guardarAreaIdPersistente(areaId) - Guardar área de forma persistente
 * - obtenerAreaId() - Obtener ID de área guardada
 * 
 * MIGRACIÓN RECOMENDADA:
 * En lugar de usar este wrapper, importa directamente los servicios:
 * 
 * ```javascript
 * import { databaseService } from '../src/core/services/DatabaseService.js';
 * import { fileOperationsService } from '../src/core/services/FileOperationsService.js';
 * 
 * // Inicializar
 * await databaseService.initialize();
 * await fileOperationsService.initialize();
 * 
 * // Usar funcionalidades
 * const db = databaseService.db;
 * await fileOperationsService.exportToCSV();
 * await databaseService.syncWithSupabase();
 * ```
 * 
 * VENTAJAS DE LOS SERVICIOS MODERNOS:
 * - Mejor manejo de errores
 * - Eventos tipados
 * - Mejor organización del código
 * - Testing más fácil
 * - Mejor performance
 */
