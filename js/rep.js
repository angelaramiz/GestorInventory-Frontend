/**
 * rep.js - Wrapper delgado para sistema de reportes
 * 
 *  ARCHIVO MIGRADO A ARQUITECTURA MODERNA (Fase 4)
 * 
 * Este archivo ahora actúa como un wrapper delgado que re-exporta
 * funcionalidades desde el bridge moderno.
 * 
 * ARQUITECTURA:
 * rep.js (wrapper)  rep-bridge.js  Modern Services
 * 
 * SERVICIOS MODERNOS:
 * - ReportService: Lógica de negocio de reportes
 * - PDFGenerationService: Generación de PDF con jsPDF
 * - ReportUIService: Gestión de interfaz de usuario
 * 
 * MIGRACIÓN COMPLETADA: 4 de octubre de 2025
 * REDUCCIÓN: 967  50 líneas (-95%)
 * 
 * @deprecated Para nuevo código, usar directamente los servicios modernos
 * @version 4.0.0
 */

console.info(' rep.js - Wrapper de reportes cargado (Fase 4 - Arquitectura moderna)');

// Re-exportar todas las funciones desde el bridge
export {
    initReportPage,
    cargarAreas,
    cargarProductos,
    filtrarProductosPorAreasSeleccionadas,
    mostrarOpcionesReporte,
    generarReportePDF,
    mostrarProductosEnLista,
    mostrarCargando,
    fusionarProductosPorCodigo,
    agruparProductosPorArea,
    categorizarProductosPorCaducidad,
    generarCodigosDeBarras,
    reportService,
    pdfGenerationService,
    reportUIService
} from './rep-bridge.js';
