/**
 * Archivo puente para lotes-avanzado.js
 * 
 * Este archivo mantiene la compatibilidad hacia atrás con el código existente
 * que depende de las funciones de lotes-avanzado.js, dirigiendo las llamadas
 * a los nuevos servicios especializados.
 * 
 * @file lotes-avanzado-bridge.js
 * @author Angel Aramiz
 * @version 2.0.0
 */

// Importar servicios especializados
import { batchScannerService } from '../core/services/BatchScannerService.js';
import { batchManagementService } from '../core/services/BatchManagementService.js';
import { batchUIService } from '../core/services/BatchUIService.js';
import { batchPersistenceService } from '../core/services/BatchPersistenceService.js';

/**
 * Inicializar todos los servicios de lotes avanzados
 */
export async function initLotesAvanzado() {
    try {
        console.log('🔄 Inicializando servicios de lotes avanzados...');
        
        // Inicializar servicios en paralelo
        await Promise.all([
            batchScannerService.initialize(),
            batchManagementService.initialize(),
            batchUIService.initialize(),
            batchPersistenceService.initialize()
        ]);
        
        console.log('✅ Servicios de lotes avanzados inicializados');
        return true;
        
    } catch (error) {
        console.error('❌ Error al inicializar servicios de lotes avanzados:', error);
        throw error;
    }
}

/**
 * Inicializar escáner de código de barras/QR
 * Función de compatibilidad hacia atrás
 */
export async function inicializarEscaner() {
    try {
        await batchScannerService.initialize();
        return await batchScannerService.startScanner('qr-reader');
    } catch (error) {
        console.error('Error al inicializar escáner:', error);
        throw error;
    }
}

/**
 * Detener escáner de código de barras/QR
 * Función de compatibilidad hacia atrás
 */
export async function detenerEscaner() {
    try {
        return await batchScannerService.stopScanner();
    } catch (error) {
        console.error('Error al detener escáner:', error);
        throw error;
    }
}

/**
 * Procesar código escaneado
 * Función de compatibilidad hacia atrás
 */
export async function procesarCodigoEscaneado(codigo, origen = 'scanner') {
    try {
        return await batchScannerService.processScannedCode(codigo, origen);
    } catch (error) {
        console.error('Error al procesar código:', error);
        throw error;
    }
}

/**
 * Agrupar productos
 * Función de compatibilidad hacia atrás
 */
export function agruparProductos(productos) {
    try {
        return batchManagementService.groupProducts(productos);
    } catch (error) {
        console.error('Error al agrupar productos:', error);
        throw error;
    }
}

/**
 * Mostrar modal de productos agrupados
 * Función de compatibilidad hacia atrás
 */
export function mostrarModalAgrupados(productosAgrupados) {
    try {
        return batchUIService.showGroupedProductsModal(productosAgrupados);
    } catch (error) {
        console.error('Error al mostrar modal:', error);
        throw error;
    }
}

/**
 * Guardar inventario por lotes
 * Función de compatibilidad hacia atrás
 */
export async function guardarInventarioLotes(productos, opciones = {}) {
    try {
        return await batchPersistenceService.saveBatchInventory(productos, opciones);
    } catch (error) {
        console.error('Error al guardar inventario:', error);
        throw error;
    }
}

/**
 * Mostrar lista de productos
 * Función de compatibilidad hacia atrás
 */
export function mostrarListaProductos() {
    try {
        return batchUIService.renderProductList();
    } catch (error) {
        console.error('Error al mostrar lista:', error);
        throw error;
    }
}

/**
 * Limpiar sesión actual
 * Función de compatibilidad hacia atrás
 */
export function limpiarSesion() {
    try {
        batchManagementService.clearCurrentSession();
        batchUIService.clearUI();
        console.log('Sesión limpiada');
    } catch (error) {
        console.error('Error al limpiar sesión:', error);
        throw error;
    }
}

/**
 * Obtener productos de la sesión actual
 * Función de compatibilidad hacia atrás
 */
export function obtenerProductosSesion() {
    try {
        return batchManagementService.getCurrentProducts();
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
}

/**
 * Cambiar modo de vista (manual/avanzado)
 * Función de compatibilidad hacia atrás
 */
export function cambiarModoVista(modo) {
    try {
        return batchUIService.switchTab(modo);
    } catch (error) {
        console.error('Error al cambiar modo:', error);
        throw error;
    }
}

/**
 * Actualizar contadores de la interfaz
 * Función de compatibilidad hacia atrás
 */
export function actualizarContadores() {
    try {
        return batchUIService.updateCounters();
    } catch (error) {
        console.error('Error al actualizar contadores:', error);
        throw error;
    }
}

/**
 * Mostrar modal de entrada manual
 * Función de compatibilidad hacia atrás
 */
export function mostrarModalEntradaManual() {
    try {
        return batchUIService.showManualEntryModal();
    } catch (error) {
        console.error('Error al mostrar modal manual:', error);
        throw error;
    }
}

/**
 * Procesar datos CODE128
 * Función de compatibilidad hacia atrás
 */
export function procesarCODE128(codigo) {
    try {
        return batchScannerService.processCODE128(codigo);
    } catch (error) {
        console.error('Error al procesar CODE128:', error);
        return null;
    }
}

/**
 * Agregar producto a la sesión
 * Función de compatibilidad hacia atrás
 */
export async function agregarProductoSesion(producto) {
    try {
        return await batchManagementService.addProductToSession(producto);
    } catch (error) {
        console.error('Error al agregar producto:', error);
        throw error;
    }
}

/**
 * Eliminar producto de la sesión
 * Función de compatibilidad hacia atrás
 */
export function eliminarProductoSesion(indice) {
    try {
        return batchManagementService.removeProductFromSession(indice);
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        throw error;
    }
}

/**
 * Obtener estadísticas de la sesión
 * Función de compatibilidad hacia atrás
 */
export function obtenerEstadisticasSesion() {
    try {
        const productos = batchManagementService.getCurrentProducts();
        const totalProductos = productos.length;
        const totalValor = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
        
        return {
            totalProductos,
            totalValor,
            productos
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return { totalProductos: 0, totalValor: 0, productos: [] };
    }
}

/**
 * Validar datos de producto
 * Función de compatibilidad hacia atrás
 */
export function validarProducto(producto) {
    try {
        return batchManagementService.validateProduct(producto);
    } catch (error) {
        console.error('Error al validar producto:', error);
        return false;
    }
}

/**
 * Obtener configuración del escáner
 * Función de compatibilidad hacia atrás
 */
export function obtenerConfiguracionEscaner() {
    try {
        return batchScannerService.getScannerConfig();
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        return {};
    }
}

/**
 * Configurar escáner
 * Función de compatibilidad hacia atrás
 */
export function configurarEscaner(configuracion) {
    try {
        return batchScannerService.updateConfig(configuracion);
    } catch (error) {
        console.error('Error al configurar escáner:', error);
        throw error;
    }
}

/**
 * Generar reporte de sesión
 * Función de compatibilidad hacia atrás
 */
export function generarReporteSesion() {
    try {
        const productos = batchManagementService.getCurrentProducts();
        const estadisticas = obtenerEstadisticasSesion();
        
        return {
            fecha: new Date().toISOString(),
            productos,
            estadisticas,
            resumen: {
                total_productos: estadisticas.totalProductos,
                valor_total: estadisticas.totalValor,
                productos_agrupados: agruparProductos(productos)
            }
        };
    } catch (error) {
        console.error('Error al generar reporte:', error);
        return null;
    }
}

/**
 * Exportar todos los servicios para acceso directo
 */
export {
    batchScannerService,
    batchManagementService,
    batchUIService,
    batchPersistenceService
};

/**
 * Variables globales para compatibilidad hacia atrás
 */
if (typeof window !== 'undefined') {
    // Exponer funciones globalmente para compatibilidad
    window.lotesAvanzado = {
        inicializarEscaner,
        detenerEscaner,
        procesarCodigoEscaneado,
        agruparProductos,
        mostrarModalAgrupados,
        guardarInventarioLotes,
        mostrarListaProductos,
        limpiarSesion,
        obtenerProductosSesion,
        cambiarModoVista,
        actualizarContadores,
        mostrarModalEntradaManual,
        procesarCODE128,
        agregarProductoSesion,
        eliminarProductoSesion,
        obtenerEstadisticasSesion,
        validarProducto,
        obtenerConfiguracionEscaner,
        configurarEscaner,
        generarReporteSesion
    };
    
    // Exponer servicios
    window.batchServices = {
        scanner: batchScannerService,
        management: batchManagementService,
        ui: batchUIService,
        persistence: batchPersistenceService
    };
    
    // Auto-inicialización cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        initLotesAvanzado().catch(error => {
            console.warn('Auto-inicialización de lotes avanzados falló:', error.message);
        });
    });
    
    // Si el DOM ya está cargado
    if (document.readyState !== 'loading') {
        initLotesAvanzado().catch(error => {
            console.warn('Auto-inicialización de lotes avanzados falló:', error.message);
        });
    }
}

export default {
    initLotesAvanzado,
    inicializarEscaner,
    detenerEscaner,
    procesarCodigoEscaneado,
    agruparProductos,
    mostrarModalAgrupados,
    guardarInventarioLotes,
    mostrarListaProductos,
    limpiarSesion,
    obtenerProductosSesion,
    cambiarModoVista,
    actualizarContadores,
    mostrarModalEntradaManual,
    procesarCODE128,
    agregarProductoSesion,
    eliminarProductoSesion,
    obtenerEstadisticasSesion,
    validarProducto,
    obtenerConfiguracionEscaner,
    configurarEscaner,
    generarReporteSesion,
    
    // Servicios
    services: {
        scanner: batchScannerService,
        management: batchManagementService,
        ui: batchUIService,
        persistence: batchPersistenceService
    }
};
