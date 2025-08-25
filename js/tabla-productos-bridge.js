/**
 * tabla-productos-bridge.js - Puente de compatibilidad para tabla-productos.js
 * 
 * Este archivo mantiene la compatibilidad con el código legacy mientras
 * se utiliza la nueva arquitectura de servicios especializados.
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { productTableService } from '../src/core/services/ProductTableService.js';
import { productTableUIService } from '../src/core/services/ProductTableUIService.js';

// Asegurar inicialización de servicios
let servicesInitialized = false;

async function ensureServicesInitialized() {
    if (servicesInitialized) return;
    
    try {
        await productTableService.initialize();
        await productTableUIService.initialize();
        servicesInitialized = true;
        console.log('ProductTable services inicializados correctamente');
    } catch (error) {
        console.warn('Error al inicializar ProductTable services:', error);
    }
}

// Variables globales para compatibilidad
let productoPrimario = null;
let subproductos = [];
let contadorFilas = 0;

/**
 * Inicializar funcionalidad de tabla de productos
 */
async function inicializarTablaProductos() {
    await ensureServicesInitialized();
    return true;
}

/**
 * Agregar fila de subproducto
 */
async function agregarFilaSubproducto() {
    await ensureServicesInitialized();
    productTableService.addSubproductRow();
}

/**
 * Limpiar tabla completa
 */
async function limpiarTabla() {
    await ensureServicesInitialized();
    productTableService.clearTable();
    
    // Limpiar variables globales
    productoPrimario = null;
    subproductos = [];
    contadorFilas = 0;
}

/**
 * Guardar tabla de productos
 */
async function guardarTabla() {
    await ensureServicesInitialized();
    return productTableService.saveTable();
}

/**
 * Buscar producto primario
 * @param {string} codigo - Código del producto
 */
async function buscarProductoPrimario(codigo) {
    await ensureServicesInitialized();
    return productTableService.searchPrimaryProduct(codigo);
}

/**
 * Buscar subproducto
 * @param {number} numeroFila - Número de fila
 */
async function buscarSubproducto(numeroFila) {
    await ensureServicesInitialized();
    return productTableService.searchSubproduct(numeroFila);
}

/**
 * Eliminar fila de subproducto
 * @param {number} numeroFila - Número de fila
 */
async function eliminarFilaSubproducto(numeroFila) {
    await ensureServicesInitialized();
    productTableService.removeSubproductRow(numeroFila);
}

/**
 * Aplicar conversión de guión a ceros
 * @param {HTMLElement} input - Elemento input
 */
function aplicarConversionGuion(input) {
    if (productTableService.status === 'initialized') {
        productTableService.applyDashToZeroConversion(input);
    } else {
        // Fallback temporal
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/-/g, '000000');
        });
    }
}

/**
 * Convertir guión a ceros
 * @param {string} value - Valor a convertir
 * @returns {string} Valor convertido
 */
function convertirGuionACeros(value) {
    return value.replace(/-/g, '000000');
}

/**
 * Mostrar información de producto
 * @param {Object} producto - Datos del producto
 * @param {string} tipo - Tipo (primario/subproducto)
 * @param {number} numeroFila - Número de fila (para subproductos)
 */
function mostrarInformacionProducto(producto, tipo, numeroFila = null) {
    if (tipo === 'primario') {
        productoPrimario = producto;
        
        if (productTableService.status === 'initialized') {
            productTableService.showPrimaryProductInfo(producto, !producto.esNuevo);
        }
    } else if (tipo === 'subproducto' && numeroFila) {
        if (productTableService.status === 'initialized') {
            productTableService.showSubproductInfo(numeroFila, producto, !producto.esNuevo);
        }
    }
}

/**
 * Limpiar información de producto primario
 */
function limpiarInformacionPrimario() {
    productoPrimario = null;
    
    if (productTableService.status === 'initialized') {
        productTableService.clearPrimaryProductInfo();
    }
}

/**
 * Configurar listeners de eventos
 */
function configurarEventListeners() {
    // Auto-ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configurarEventListenersDOM);
    } else {
        configurarEventListenersDOM();
    }
}

/**
 * Configurar listeners del DOM
 */
function configurarEventListenersDOM() {
    // Los listeners ya están configurados por ProductTableService
    // Este método mantiene compatibilidad con el código legacy
    ensureServicesInitialized();
}

/**
 * Generar HTML para fila de subproducto
 * @param {number} numeroFila - Número de fila
 * @returns {string} HTML de la fila
 */
function generarHTMLFilaSubproducto(numeroFila) {
    if (productTableService.status === 'initialized') {
        return productTableService.generateSubproductRowHTML(numeroFila);
    }
    
    // Fallback HTML básico
    return `
        <div class="subproducto-row" id="subproducto-${numeroFila}">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-bold text-gray-700">Subproducto ${numeroFila}</h4>
                <button type="button" class="eliminar-fila-btn text-red-500 hover:text-red-700 font-bold" data-fila="${numeroFila}">
                    ✕ Eliminar
                </button>
            </div>
            <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">Código del Subproducto:</label>
                <div class="flex gap-2">
                    <input id="subproducto-codigo-${numeroFila}" class="shadow appearance-none border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Código del subproducto" required>
                    <button type="button" class="buscar-subproducto-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" data-fila="${numeroFila}">Buscar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Validar formulario de tabla
 * @returns {boolean} Si es válido
 */
function validarFormularioTabla() {
    if (!productoPrimario) {
        mostrarMensaje('Debe definir un producto primario', 'warning');
        return false;
    }
    
    if (subproductos.length === 0) {
        mostrarMensaje('Debe agregar al menos un subproducto', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Recopilar datos de la tabla
 * @returns {Object} Datos de la tabla
 */
function recopilarDatosTabla() {
    const state = productTableService.getTableState?.() || {
        primaryProduct: productoPrimario,
        subproducts: subproductos
    };
    
    return {
        productoPrimario: state.primaryProduct,
        subproductos: state.subproducts
    };
}

/**
 * Mostrar mensaje
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de mensaje
 */
function mostrarMensaje(mensaje, tipo = 'info') {
    // Usar función global si está disponible
    if (typeof mostrarAlertaBurbuja !== 'undefined') {
        mostrarAlertaBurbuja(mensaje, tipo);
    } else {
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    }
}

/**
 * Obtener estado de la tabla
 * @returns {Object} Estado actual
 */
function obtenerEstadoTabla() {
    if (productTableService.status === 'initialized') {
        return productTableService.getTableState();
    }
    
    return {
        hasPrimaryProduct: !!productoPrimario,
        primaryProduct: productoPrimario,
        subproductsCount: subproductos.length,
        subproducts: subproductos,
        rowCounter: contadorFilas
    };
}

/**
 * Configurar validación en tiempo real
 * @param {HTMLElement} input - Campo de input
 * @param {string} tipoValidacion - Tipo de validación
 */
function configurarValidacionTiempoReal(input, tipoValidacion) {
    if (productTableUIService.status === 'initialized') {
        productTableUIService.validateFieldRealTime(input, tipoValidacion);
    }
}

/**
 * Clase TablaProductosManager para compatibilidad completa
 */
class TablaProductosManager {
    constructor() {
        this.productoPrimario = null;
        this.subproductos = [];
        this.contadorFilas = 0;
        this.inicializado = false;
    }

    async inicializar() {
        await ensureServicesInitialized();
        this.inicializado = true;
        return this;
    }

    async agregarFila() {
        return agregarFilaSubproducto();
    }

    async limpiar() {
        return limpiarTabla();
    }

    async guardar() {
        return guardarTabla();
    }

    async buscarPrimario(codigo) {
        return buscarProductoPrimario(codigo);
    }

    async buscarSubproducto(numeroFila) {
        return buscarSubproducto(numeroFila);
    }

    eliminarFila(numeroFila) {
        return eliminarFilaSubproducto(numeroFila);
    }

    obtenerEstado() {
        return obtenerEstadoTabla();
    }

    validar() {
        return validarFormularioTabla();
    }

    recopilarDatos() {
        return recopilarDatosTabla();
    }
}

// Exportaciones para compatibilidad
export {
    // Funciones principales
    inicializarTablaProductos,
    agregarFilaSubproducto,
    limpiarTabla,
    guardarTabla,
    buscarProductoPrimario,
    buscarSubproducto,
    eliminarFilaSubproducto,
    
    // Utilidades
    aplicarConversionGuion,
    convertirGuionACeros,
    mostrarInformacionProducto,
    limpiarInformacionPrimario,
    configurarEventListeners,
    generarHTMLFilaSubproducto,
    
    // Validación y datos
    validarFormularioTabla,
    recopilarDatosTabla,
    obtenerEstadoTabla,
    configurarValidacionTiempoReal,
    mostrarMensaje,
    
    // Clase manager
    TablaProductosManager
};

// Variables globales para compatibilidad con código legacy
if (typeof window !== 'undefined') {
    // Funciones globales
    window.inicializarTablaProductos = inicializarTablaProductos;
    window.agregarFilaSubproducto = agregarFilaSubproducto;
    window.limpiarTabla = limpiarTabla;
    window.guardarTabla = guardarTabla;
    window.buscarProductoPrimario = buscarProductoPrimario;
    window.buscarSubproducto = buscarSubproducto;
    window.eliminarFilaSubproducto = eliminarFilaSubproducto;
    
    // Utilidades globales
    window.aplicarConversionGuion = aplicarConversionGuion;
    window.convertirGuionACeros = convertirGuionACeros;
    window.mostrarInformacionProducto = mostrarInformacionProducto;
    window.limpiarInformacionPrimario = limpiarInformacionPrimario;
    window.generarHTMLFilaSubproducto = generarHTMLFilaSubproducto;
    window.validarFormularioTabla = validarFormularioTabla;
    window.recopilarDatosTabla = recopilarDatosTabla;
    window.obtenerEstadoTabla = obtenerEstadoTabla;
    
    // Manager global
    window.TablaProductosManager = TablaProductosManager;
    
    // Variables de estado globales
    window.productoPrimario = productoPrimario;
    window.subproductos = subproductos;
    window.contadorFilas = contadorFilas;
    
    // Auto-configurar cuando el DOM esté listo
    configurarEventListeners();
}

// Configuración automática
ensureServicesInitialized();

console.log('🔗 tabla-productos-bridge.js cargado - Compatibilidad con tabla-productos.js mantenida');
