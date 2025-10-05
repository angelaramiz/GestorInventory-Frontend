/**
 * registro-entradas-bridge.js - Bridge de compatibilidad para gestión de entradas
 * 
 * Proporciona compatibilidad hacia atrás conectando el código legacy
 * con los nuevos servicios modernos (EntryManagementService, EntryUIService, EntryReportService).
 * 
 * ARQUITECTURA:
 * Legacy registro-entradas-operations.js → registro-entradas-bridge.js → Modern Services
 * 
 * @version 4.0.0
 * @since 2025-10-04
 */

import { entryManagementService } from '../src/core/services/EntryManagementService.js';
import { entryUIService } from '../src/core/services/EntryUIService.js';
import { entryReportService } from '../src/core/services/EntryReportService.js';
import { mostrarAlertaBurbuja } from './logs.js';

// Estado del módulo
let initialized = false;

/**
 * Inicializa la página de registro de entradas
 * @async
 * @returns {Promise<void>}
 */
export async function inicializarRegistroEntradas() {
    if (initialized) return;

    try {
        // Inicializar servicios
        await entryManagementService.initialize();
        entryUIService.initializeElements();

        // Cargar entradas en tabla
        await actualizarTablaEntradas();

        // Configurar event listeners
        configurarEventListeners();

        // Configurar función global para eliminar
        setupGlobalDeleteFunction();

        initialized = true;
        console.log('✅ Sistema de registro de entradas inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar registro de entradas:', error);
        entryUIService.showError('Ocurrió un error al inicializar la página.');
        throw error;
    }
}

/**
 * Configura los event listeners
 * @private
 */
function configurarEventListeners() {
    // Botones de búsqueda
    const btnBuscarCodigo = document.getElementById('buscarPorCodigo');
    const btnBuscarNombre = document.getElementById('buscarPorNombre');
    const btnBuscarMarca = document.getElementById('buscarPorMarca');

    if (btnBuscarCodigo) {
        btnBuscarCodigo.addEventListener('click', () => buscarProducto('codigo'));
    }

    if (btnBuscarNombre) {
        btnBuscarNombre.addEventListener('click', () => buscarProducto('nombre'));
    }

    if (btnBuscarMarca) {
        btnBuscarMarca.addEventListener('click', () => buscarProducto('marca'));
    }

    // Botón registrar entrada
    const btnRegistrarEntrada = document.getElementById('registrarEntrada');
    if (btnRegistrarEntrada) {
        btnRegistrarEntrada.addEventListener('click', registrarEntrada);
    }

    // Botón limpiar formulario
    const btnLimpiarFormulario = document.getElementById('limpiarFormulario');
    if (btnLimpiarFormulario) {
        btnLimpiarFormulario.addEventListener('click', limpiarFormularioEntrada);
    }

    // Botones de filtros
    const btnFiltrar = document.getElementById('filtrarEntradas');
    const btnLimpiarFiltros = document.getElementById('limpiarFiltros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', filtrarEntradas);
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }

    // Botones de sincronización y reporte
    const btnSincronizar = document.getElementById('sincronizarEntradas');
    const btnGenerarReporte = document.getElementById('generarReporte');

    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', sincronizarEntradas);
    }

    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', generarReporte);
    }

    // Enter en campos de búsqueda
    const camposBusqueda = ['busquedaCodigo', 'busquedaNombre', 'busquedaMarca'];
    camposBusqueda.forEach((campoId, index) => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const tipos = ['codigo', 'nombre', 'marca'];
                    buscarProducto(tipos[index]);
                }
            });
        }
    });

    // Enter en campo de cantidad
    const cantidadEntrada = document.getElementById('cantidadEntrada');
    if (cantidadEntrada) {
        cantidadEntrada.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                registrarEntrada();
            }
        });
    }
}

/**
 * Configura función global para eliminar entradas
 * @private
 */
function setupGlobalDeleteFunction() {
    window.eliminarEntrada = async function(entradaId) {
        const confirmed = await entryUIService.confirmDelete();
        
        if (!confirmed) return;

        try {
            await entryManagementService.deleteEntry(entradaId);
            entryUIService.showBubbleAlert("Entrada eliminada correctamente", "success");
            await actualizarTablaEntradas();
        } catch (error) {
            console.error("Error al eliminar entrada:", error);
            entryUIService.showBubbleAlert("Error al eliminar entrada", "error");
        }
    };
}

/**
 * Busca un producto según el tipo
 * @async
 * @param {string} tipo - Tipo: 'codigo', 'nombre', 'marca'
 * @returns {Promise<void>}
 */
async function buscarProducto(tipo) {
    const termino = entryUIService.getSearchTerm(tipo);
    
    if (!termino) {
        entryUIService.showBubbleAlert(`Ingrese un ${tipo} para buscar`, "warning");
        return;
    }

    try {
        const producto = await entryManagementService.searchProduct(termino, tipo);
        await mostrarDatosProductoEntrada(producto);
    } catch (error) {
        console.error(`Error al buscar producto por ${tipo}:`, error);
        entryUIService.showBubbleAlert("Error al buscar producto", "error");
    }
}

/**
 * Busca producto para entrada (compatibilidad)
 * @async
 * @param {string} termino - Término de búsqueda
 * @param {string} tipoBusqueda - Tipo de búsqueda
 * @returns {Promise<Object|null>}
 */
export async function buscarProductoParaEntrada(termino, tipoBusqueda = 'codigo') {
    try {
        return await entryManagementService.searchProduct(termino, tipoBusqueda);
    } catch (error) {
        console.error("Error en buscarProductoParaEntrada:", error);
        throw error;
    }
}

/**
 * Muestra los datos del producto en el formulario
 * @async
 * @param {Object} producto - Producto a mostrar
 * @returns {Promise<void>}
 */
export async function mostrarDatosProductoEntrada(producto) {
    if (!producto) {
        limpiarFormularioEntrada();
        entryUIService.showBubbleAlert("Producto no encontrado", "warning");
        return;
    }

    entryManagementService.selectProduct(producto);
    entryUIService.displayProductData(producto);
    entryUIService.showBubbleAlert(`Producto encontrado: ${producto.nombre}`, "success");
}

/**
 * Limpia el formulario de entrada
 */
export function limpiarFormularioEntrada() {
    entryManagementService.clearSelection();
    entryUIService.clearForm();
}

/**
 * Registra una nueva entrada
 * @async
 * @returns {Promise<boolean>}
 */
export async function registrarEntrada() {
    try {
        const producto = entryManagementService.getSelectedProduct();
        
        if (!producto) {
            entryUIService.showBubbleAlert("Primero debe buscar y seleccionar un producto", "warning");
            return false;
        }

        // Obtener datos del formulario
        const entryData = entryUIService.getEntryData();

        // Validar datos
        const validation = entryManagementService.validateEntry(entryData);
        if (!validation.valid) {
            entryUIService.showBubbleAlert(validation.errors[0], "error");
            return false;
        }

        // Registrar entrada
        const entradaRegistrada = await entryManagementService.registerEntry(entryData);

        if (entradaRegistrada) {
            entryUIService.showBubbleAlert("Entrada registrada correctamente", "success");
            limpiarFormularioEntrada();
            await actualizarTablaEntradas();
            return true;
        }

        return false;

    } catch (error) {
        console.error("Error al registrar entrada:", error);
        entryUIService.showBubbleAlert("Error al registrar la entrada", "error");
        return false;
    }
}

/**
 * Actualiza la tabla de entradas
 * @async
 * @param {Object} filtros - Filtros opcionales
 * @returns {Promise<void>}
 */
export async function actualizarTablaEntradas(filtros = {}) {
    try {
        const entradas = await entryManagementService.loadEntries(filtros);
        entryUIService.renderEntriesTable(entradas);
    } catch (error) {
        console.error("Error al actualizar tabla de entradas:", error);
        entryUIService.showBubbleAlert("Error al cargar entradas", "error");
    }
}

/**
 * Filtra entradas según los filtros actuales
 * @async
 * @returns {Promise<void>}
 */
export async function filtrarEntradas() {
    const filtros = entryUIService.getFilters();
    await actualizarTablaEntradas(filtros);
}

/**
 * Limpia los filtros
 */
export function limpiarFiltros() {
    entryUIService.clearFilters();
    actualizarTablaEntradas();
}

/**
 * Sincroniza entradas desde Supabase
 * @async
 * @returns {Promise<void>}
 */
export async function sincronizarEntradas() {
    try {
        entryUIService.showBubbleAlert("Sincronizando entradas...", "info");
        await entryManagementService.syncEntries();
        await actualizarTablaEntradas();
        entryUIService.showBubbleAlert("Entradas sincronizadas correctamente", "success");
    } catch (error) {
        console.error("Error al sincronizar entradas:", error);
        entryUIService.showBubbleAlert("Error al sincronizar entradas", "error");
    }
}

/**
 * Genera reporte de entradas
 * @async
 * @returns {Promise<void>}
 */
export async function generarReporte() {
    try {
        const filtros = entryUIService.getFilters();
        await entryReportService.generateReport(filtros);
    } catch (error) {
        console.error("Error al generar reporte:", error);
        entryUIService.showBubbleAlert("Error al generar reporte", "error");
    }
}

// Exportar servicios para uso avanzado
export { 
    entryManagementService, 
    entryUIService, 
    entryReportService 
};

// Auto-inicializar si estamos en la página de registro de entradas
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (document.getElementById('registrarEntrada')) {
            await inicializarRegistroEntradas();
        }
    });
}

console.info('🌉 registro-entradas-bridge.js - Bridge de gestión de entradas cargado');
