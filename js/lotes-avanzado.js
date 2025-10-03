/**
 * ARCHIVO DEPRECADO - Usar BatchScannerService y servicios relacionados
 * 
 * Este archivo se mantiene unicamente por compatibilidad hacia atras.
 * Todo el codigo nuevo debe usar los servicios modernos de lotes.
 * 
 * MIGRACION COMPLETA EN FASE 2:
 * - Servicio: BatchScannerService (escaneo de codigos)
 * - Servicio: BatchManagementService (gestion de lotes)
 * - Servicio: BatchUIService (interfaz de usuario)
 * - Servicio: BatchPersistenceService (persistencia de datos)
 * - Bridge: lotes-avanzado-bridge.js (418 lineas)
 * - Documentado en: docs/PHASE_2_SUMMARY.md
 * 
 * FASE 3 - NIVEL 4: Wrapper para compatibilidad
 * 
 * USO MODERNO:
 * - Antes: import { inicializarEscaner } from './lotes-avanzado.js';
 * - Ahora: import { batchScannerService } from '../src/core/services/BatchScannerService.js';
 *          await batchScannerService.initialize();
 * 
 * @deprecated v3.0.0 - Usar BatchScannerService, BatchManagementService, BatchUIService y BatchPersistenceService
 */

// Re-exportar todas las funciones desde el bridge
export {
    // Inicializacion
    initLotesAvanzado,
    
    // Escaneo
    inicializarEscaner,
    detenerEscaner,
    procesarCodigoEscaneado,
    
    // Agrupacion y gestion
    agruparProductos,
    mostrarModalAgrupados,
    guardarInventarioLotes,
    mostrarListaProductos,
    
    // Sesion
    limpiarSesion,
    obtenerProductosSesion,
    agregarProductoSesion,
    eliminarProductoSesion,
    obtenerEstadisticasSesion,
    
    // UI y visualizacion
    cambiarModoVista,
    actualizarContadores,
    mostrarModalEntradaManual,
    
    // Procesamiento
    procesarCODE128,
    validarProducto,
    
    // Configuracion
    obtenerConfiguracionEscaner,
    configurarEscaner,
    
    // Reportes
    generarReporteSesion,
    
    // Servicios
    batchScannerService,
    batchManagementService,
    batchUIService,
    batchPersistenceService
} from './lotes-avanzado-bridge.js';
