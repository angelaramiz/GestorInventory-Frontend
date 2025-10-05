/**
 * registro-entradas-operations.js - Wrapper delgado para gestión de entradas
 * 
 *  ARCHIVO MIGRADO A ARQUITECTURA MODERNA (Fase 4)
 * 
 * Este archivo ahora actúa como un wrapper delgado que re-exporta
 * funcionalidades desde el bridge moderno.
 * 
 * ARQUITECTURA:
 * registro-entradas-operations.js (wrapper)  registro-entradas-bridge.js  Modern Services
 * 
 * SERVICIOS MODERNOS:
 * - EntryManagementService: Lógica de negocio de entradas
 * - EntryUIService: Gestión de interfaz de usuario
 * - EntryReportService: Generación de reportes
 * 
 * MIGRACIÓN COMPLETADA: 4 de octubre de 2025
 * REDUCCIÓN: 501  40 líneas (-92%)
 * 
 * @deprecated Para nuevo código, usar directamente los servicios modernos
 * @version 4.0.0
 */

console.info(' registro-entradas-operations.js - Wrapper de entradas cargado (Fase 4 - Arquitectura moderna)');

// Re-exportar todas las funciones desde el bridge
export {
    inicializarRegistroEntradas,
    buscarProductoParaEntrada,
    mostrarDatosProductoEntrada,
    limpiarFormularioEntrada,
    registrarEntrada,
    actualizarTablaEntradas,
    filtrarEntradas,
    limpiarFiltros,
    sincronizarEntradas,
    generarReporte,
    entryManagementService,
    entryUIService,
    entryReportService
} from './registro-entradas-bridge.js';
