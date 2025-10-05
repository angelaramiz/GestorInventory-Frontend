/**
 * rep-bridge.js - Bridge de compatibilidad para sistema de reportes
 * 
 * Proporciona compatibilidad hacia atrás conectando el código legacy
 * con los nuevos servicios modernos (ReportService, PDFGenerationService, ReportUIService).
 * 
 * ARQUITECTURA:
 * Legacy rep.js → rep-bridge.js → Modern Services
 * 
 * @version 4.0.0
 * @since 2025-10-04
 */

import { reportService } from '../src/core/services/ReportService.js';
import { pdfGenerationService } from '../src/core/services/PDFGenerationService.js';
import { reportUIService } from '../src/core/services/ReportUIService.js';

// Estado del módulo
let initialized = false;

/**
 * Inicializa la página de reportes
 * @async
 * @returns {Promise<void>}
 */
export async function initReportPage() {
    if (initialized) return;

    try {
        // Inicializar servicios
        await reportService.initialize();
        reportUIService.initializeElements();

        // Renderizar áreas
        const areas = reportService.getAreas();
        reportUIService.renderAreaCheckboxes(areas);

        // Mostrar productos iniciales
        const productos = reportService.getProducts();
        reportUIService.displayProductList(productos, areas);

        // Configurar event listeners
        setupEventListeners();

        initialized = true;
        console.log('✅ Sistema de reportes inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar reportes:', error);
        reportUIService.showError('Ocurrió un error al inicializar la página.');
        throw error;
    }
}

/**
 * Configura los event listeners
 * @private
 */
function setupEventListeners() {
    reportUIService.setupAllAreasToggle(() => {
        // Callback cuando cambia "Todas las áreas"
    });

    const aplicarBtn = document.getElementById('aplicarFiltroBtn');
    if (aplicarBtn) {
        aplicarBtn.addEventListener('click', filtrarProductosPorAreasSeleccionadas);
    }

    const generarBtn = document.getElementById('generarReporteBtn');
    if (generarBtn) {
        generarBtn.addEventListener('click', mostrarOpcionesReporte);
    }
}

/**
 * Carga todas las áreas disponibles
 * @async
 * @returns {Promise<Array>}
 */
export async function cargarAreas() {
    try {
        reportUIService.toggleLoading(true);
        const areas = await reportService.loadAreas();
        reportUIService.renderAreaCheckboxes(areas);
        return areas;
    } catch (error) {
        console.error('Error al cargar áreas:', error);
        reportUIService.showError('No se pudieron cargar las áreas.');
        throw error;
    } finally {
        reportUIService.toggleLoading(false);
    }
}

/**
 * Carga todos los productos del inventario
 * @async
 * @returns {Promise<Array>}
 */
export async function cargarProductos() {
    try {
        reportUIService.toggleLoading(true);
        const productos = await reportService.loadProducts();
        const areas = reportService.getAreas();
        reportUIService.displayProductList(productos, areas);
        return productos;
    } catch (error) {
        console.error('Error al cargar productos:', error);
        reportUIService.showError('No se pudieron cargar los productos. Verifica tu conexión a internet.');
        throw error;
    } finally {
        reportUIService.toggleLoading(false);
    }
}

/**
 * Filtra productos por áreas seleccionadas
 * @async
 * @returns {Promise<void>}
 */
export async function filtrarProductosPorAreasSeleccionadas() {
    try {
        reportUIService.toggleLoading(true);

        const todasSeleccionadas = reportUIService.isAllAreasSelected();
        const areaIds = reportUIService.getSelectedAreaIds();

        if (!todasSeleccionadas && areaIds.length === 0) {
            reportUIService.displayProductList([], reportService.getAreas());
            reportUIService.showInfo('Por favor, selecciona al menos un área para mostrar productos.');
            return;
        }

        const productos = await reportService.filterProductsByAreas(areaIds, todasSeleccionadas);
        const areas = reportService.getAreas();
        reportUIService.displayProductList(productos, areas);
    } catch (error) {
        console.error('Error al filtrar productos:', error);
        reportUIService.showError('No se pudieron cargar los productos para las áreas seleccionadas.');
    } finally {
        reportUIService.toggleLoading(false);
    }
}

/**
 * Muestra el diálogo de configuración de reporte
 * @async
 * @returns {Promise<void>}
 */
export async function mostrarOpcionesReporte() {
    const todasSeleccionadas = reportUIService.isAllAreasSelected();
    const areaIds = reportUIService.getSelectedAreaIds();

    if (!todasSeleccionadas && areaIds.length === 0) {
        reportUIService.showWarning('Por favor, selecciona al menos un área para generar el reporte.');
        return;
    }

    const opciones = await reportUIService.showReportConfigDialog();
    if (opciones) {
        await generarReportePDF(opciones);
    }
}

/**
 * Genera el reporte PDF
 * @async
 * @param {Object} opciones - Opciones de generación
 * @returns {Promise<void>}
 */
export async function generarReportePDF(opciones) {
    try {
        reportUIService.toggleLoading(true);

        // Determinar productos a incluir
        const todasSeleccionadas = reportUIService.isAllAreasSelected();
        const areaIds = reportUIService.getSelectedAreaIds();
        
        let productos = await reportService.filterProductsByAreas(areaIds, todasSeleccionadas);

        if (productos.length === 0) {
            reportUIService.showWarning('No hay productos para generar el reporte.');
            return;
        }

        // Fusionar lotes si está habilitado
        if (opciones.fusionarLotes) {
            productos = reportService.mergeProductsByCode(productos);
        }

        // Agrupar por área
        const productosPorArea = reportService.groupProductsByArea(productos);

        // Generar códigos de barras si es necesario
        if (opciones.incluirCodigo) {
            await pdfGenerationService.generateBarcodes(productos);
        }

        // Generar PDF
        const areas = reportService.getAreas();
        const { doc, contenidoProcesado } = await pdfGenerationService.generatePDF(
            productosPorArea,
            areas,
            opciones
        );

        if (!contenidoProcesado) {
            reportUIService.showWarning('No hay productos en las agrupaciones de fechas seleccionadas para generar el reporte.');
            return;
        }

        // Guardar PDF
        const filename = reportUIService.generateFileName(opciones);
        pdfGenerationService.savePDF(doc, filename);
        
        reportUIService.showSuccess('Reporte de preconteo generado correctamente.');
    } catch (error) {
        console.error('Error al generar el reporte:', error);
        reportUIService.showError('No se pudo generar el reporte.');
    } finally {
        reportUIService.toggleLoading(false);
    }
}

/**
 * Muestra productos en la lista
 * @param {Array} productos - Array de productos
 */
export function mostrarProductosEnLista(productos) {
    const areas = reportService.getAreas();
    reportUIService.displayProductList(productos, areas);
}

/**
 * Muestra/oculta indicador de carga
 * @param {boolean} mostrar - Mostrar o no
 */
export function mostrarCargando(mostrar) {
    reportUIService.toggleLoading(mostrar);
}

/**
 * Fusiona productos por código (acceso directo al servicio)
 * @param {Array} productos - Array de productos
 * @returns {Array} Productos fusionados
 */
export function fusionarProductosPorCodigo(productos) {
    return reportService.mergeProductsByCode(productos);
}

/**
 * Agrupa productos por área (acceso directo al servicio)
 * @param {Array} productos - Array de productos
 * @returns {Object} Productos agrupados
 */
export function agruparProductosPorArea(productos) {
    return reportService.groupProductsByArea(productos);
}

/**
 * Categoriza productos por caducidad (acceso directo al servicio)
 * @param {Array} productos - Array de productos
 * @returns {Object} Productos categorizados
 */
export function categorizarProductosPorCaducidad(productos) {
    return reportService.categorizeProductsByExpiry(productos);
}

/**
 * Genera códigos de barras (acceso directo al servicio)
 * @async
 * @param {Array} productos - Array de productos
 * @returns {Promise<void>}
 */
export async function generarCodigosDeBarras(productos) {
    return await pdfGenerationService.generateBarcodes(productos);
}

// Exportar servicios para uso avanzado
export { reportService, pdfGenerationService, reportUIService };

// Auto-inicializar si estamos en la página de reportes
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (document.getElementById('areasContainer')) {
            await initReportPage();
        }
    });
}

console.info('🌉 rep-bridge.js - Bridge de reportes cargado');
