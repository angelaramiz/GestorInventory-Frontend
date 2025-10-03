/**
 * Product Operations Migration Bridge - Puente de migración para product-operations.js
 * 
 * Este archivo actúa como puente durante la migración, proporcionando
 * las mismas exportaciones que product-operations.js pero usando la nueva arquitectura.
 * 
 * IMPORTANTE: Este archivo debe reemplazar gradualmente las importaciones
 * del archivo legacy product-operations.js
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

// Importar nuevos servicios
import { productOperationsService } from '../src/core/services/ProductOperationsService.js';
import { productUIService } from '../src/core/services/ProductUIService.js';
import { inventoryOperationsService } from '../src/core/services/InventoryOperationsService.js';
import { productPrintService } from '../src/core/services/ProductPrintService.js';

// Inicializar servicios si no están inicializados
const initializeServices = async () => {
    const services = [productOperationsService, productUIService, inventoryOperationsService, productPrintService];
    
    for (const service of services) {
        if (service.status !== 'initialized') {
            try {
                await service.initialize();
            } catch (error) {
                console.error(`Error al inicializar ${service.name}:`, error);
            }
        }
    }
};

// Llamar inicialización de forma asíncrona
initializeServices().catch(error => {
    console.error('Error al inicializar servicios de product-operations:', error);
});

// ===== FUNCIONES DE PRODUCTOS =====

/**
 * Agregar nuevo producto
 * @param {Object} productData - Datos del producto
 * @param {Event} evento - Evento del formulario (opcional)
 * @returns {Promise<Object>} Producto agregado
 */
export const agregarProducto = async (productData, evento = null) => {
    return await productOperationsService.addProduct(productData, evento);
};

/**
 * Buscar producto por código
 * @param {string} codigo - Código del producto
 * @param {string} formato - Formato del código
 * @returns {Promise<Array>} Lista de productos encontrados
 */
export const buscarProducto = async (codigo, formato = 'auto') => {
    return await productOperationsService.searchProductByCode(codigo, formato);
};

/**
 * Buscar producto para editar
 * @param {string} codigo - Código del producto
 * @param {string} formato - Formato del código
 * @returns {Promise<Object|Array>} Producto o lista de productos
 */
export const buscarProductoParaEditar = async (codigo, formato = 'auto') => {
    return await productOperationsService.searchProductForEdit(codigo, formato);
};

/**
 * Validar código único
 * @param {string} codigo - Código a validar
 * @returns {Promise<boolean>} True si el código es único
 */
export const validarCodigoUnico = async (codigo) => {
    return await productOperationsService.validateUniqueCode(codigo);
};

/**
 * Guardar cambios en producto
 * @param {Object} productData - Datos del producto a actualizar
 * @returns {Promise<Object>} Producto actualizado
 */
export const guardarCambios = async (productData) => {
    return await productOperationsService.saveProductChanges(productData);
};

/**
 * Eliminar producto
 * @param {string} codigo - Código del producto a eliminar
 * @returns {Promise<boolean>} True si se eliminó exitosamente
 */
export const eliminarProducto = async (codigo) => {
    return await productOperationsService.deleteProduct(codigo);
};

/**
 * Buscar por código parcial
 * @param {string} codigoCorto - Código parcial
 * @param {string} tipo - Tipo de búsqueda
 * @param {Function} callback - Función callback
 * @returns {Promise<Array>} Resultados de la búsqueda
 */
export const buscarPorCodigoParcial = async (codigoCorto, tipo = 'productos', callback = null) => {
    return await productOperationsService.searchByPartialCode(codigoCorto, tipo, callback);
};

// ===== FUNCIONES DE INVENTARIO =====

/**
 * Guardar inventario
 * @param {Object} inventoryData - Datos del inventario
 * @returns {Promise<Object>} Registro de inventario guardado
 */
export const guardarInventario = async (inventoryData) => {
    return await inventoryOperationsService.saveInventory(inventoryData);
};

/**
 * Modificar inventario
 * @param {string} codigo - Código del producto
 * @param {number} cantidad - Nueva cantidad
 * @param {string} observaciones - Observaciones del cambio
 * @returns {Promise<Object>} Registro de inventario modificado
 */
export const modificarInventario = async (codigo, cantidad, observaciones = '') => {
    return await inventoryOperationsService.modifyInventory(codigo, cantidad, observaciones);
};

/**
 * Buscar producto en inventario
 * @param {string} codigo - Código del producto
 * @param {string} formato - Formato del código
 * @returns {Promise<Object>} Datos del inventario
 */
export const buscarProductoInventario = async (codigo, formato = 'auto') => {
    return await inventoryOperationsService.searchProductInventory(codigo, formato);
};

/**
 * Seleccionar ubicación de almacén
 * @returns {Promise<Object>} Ubicación seleccionada
 */
export const seleccionarUbicacionAlmacen = async () => {
    return await inventoryOperationsService.selectWarehouseLocation();
};

/**
 * Verificar y seleccionar ubicación
 * @returns {Promise<Object>} Ubicación verificada
 */
export const verificarYSeleccionarUbicacion = async () => {
    return await inventoryOperationsService.verifyAndSelectLocation();
};

/**
 * Iniciar inventario
 * @param {string} ubicacion - Ubicación del inventario
 * @returns {Object} Sesión de inventario
 */
export const iniciarInventario = (ubicacion) => {
    return inventoryOperationsService.startInventorySession(ubicacion);
};

/**
 * Agregar nuevo producto desde inventario
 * @param {string} codigo - Código del producto
 * @param {boolean} permitirModificarCodigo - Permitir modificar código
 * @returns {Promise<Object>} Resultado de la operación
 */
export const agregarNuevoProductoDesdeInventario = async (codigo, permitirModificarCodigo = false) => {
    return await inventoryOperationsService.addNewProductFromInventory(codigo, permitirModificarCodigo);
};

// ===== FUNCIONES DE UI =====

/**
 * Mostrar resultados de búsqueda
 * @param {Array} resultados - Lista de productos
 */
export const mostrarResultados = (resultados) => {
    productUIService.showSearchResults(resultados);
};

/**
 * Mostrar resultados de inventario
 * @param {Array} resultados - Lista de inventario
 */
export const mostrarResultadosInventario = (resultados) => {
    productUIService.showInventoryResults(resultados);
};

/**
 * Mostrar resultados para edición
 * @param {Array} resultados - Lista de productos
 */
export const mostrarResultadosEdicion = (resultados) => {
    productUIService.showSearchResults(resultados);
};

/**
 * Mostrar formulario de inventario
 * @param {Object} producto - Datos del producto
 */
export const mostrarFormularioInventario = (producto) => {
    productUIService.showInventoryForm(producto);
};

/**
 * Limpiar formulario de inventario
 */
export const limpiarFormularioInventario = () => {
    productUIService.clearInventoryForm();
};

/**
 * Mostrar detalles del producto con código de barras
 * @param {Object} producto - Datos del producto
 */
export const mostrarDetallesProductoConBarcode = async (producto) => {
    try {
        // Mostrar detalles del producto
        await productUIService.showProductDetails(producto.codigo);
        
        // Generar código de barras usando el servicio de impresión
        if (producto.codigo) {
            setTimeout(async () => {
                try {
                    await productPrintService.generateBarcode(producto.codigo, 'barcode-canvas');
                } catch (error) {
                    console.warn('Error al generar código de barras:', error);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error al mostrar detalles del producto con código de barras:', error);
        throw error;
    }
};

// ===== FUNCIONES DE IMPRESIÓN Y CÓDIGOS DE BARRAS =====

/**
 * Generar código de barras para un producto
 * @param {string} codigo - Código del producto
 * @param {string} canvasId - ID del canvas
 * @param {Object} options - Opciones de generación
 * @returns {Promise<boolean>} True si se generó exitosamente
 */
export const generarCodigoBarras = async (codigo, canvasId = 'barcode-canvas', options = {}) => {
    return await productPrintService.generateBarcode(codigo, canvasId, options);
};

/**
 * Imprimir etiqueta de producto
 * @param {Object} producto - Datos del producto
 * @param {Object} options - Opciones de impresión
 * @returns {Promise<void>}
 */
export const imprimirEtiquetaProducto = async (producto, options = {}) => {
    return await productPrintService.printProductLabel(producto, options);
};

/**
 * Crear PDF con etiquetas de productos
 * @param {Array} productos - Lista de productos
 * @param {Object} options - Opciones del PDF
 * @returns {Promise<Blob>} PDF generado
 */
export const crearPDFEtiquetas = async (productos, options = {}) => {
    return await productPrintService.createProductLabelsPDF(productos, options);
};

/**
 * Configurar opciones de impresión
 * @param {Object} config - Nueva configuración
 */
export const configurarImpresion = (config) => {
    return productPrintService.configurePrint(config);
};

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Generar ID temporal
 * @param {string} codigo - Código base
 * @param {string} lote - Lote (opcional)
 * @returns {string} ID temporal generado
 */
export const generarIdTemporal = (codigo, lote = null) => {
    return productOperationsService.generateTemporaryId(codigo, lote);
};

/**
 * Actualizar en IndexedDB (función legacy)
 * @deprecated Usar repositorios directamente
 */
export const actualizarEnIndexedDB = async (data) => {
    console.warn('DEPRECATED: actualizarEnIndexedDB() - Usar repositorios directamente');
    return Promise.resolve(data);
};

// ===== FUNCIONES LEGACY DEPRECADAS =====

/**
 * @deprecated Usar productOperationsService.searchByPartialCode() directamente
 */
export const buscarEnProductos = (codigo, nombre, marca) => {
    console.warn('DEPRECATED: buscarEnProductos() - Usar productOperationsService.searchByPartialCode()');
    return Promise.resolve([]);
};

/**
 * @deprecated Usar inventoryOperationsService.searchProductInventory() directamente
 */
export const buscarEnInventario = (codigo, nombre, marca) => {
    console.warn('DEPRECATED: buscarEnInventario() - Usar inventoryOperationsService.searchProductInventory()');
    return Promise.resolve([]);
};

/**
 * @deprecated Usar productUIService directamente
 */
export const llenarFormularioEdicion = (producto) => {
    console.warn('DEPRECATED: llenarFormularioEdicion() - Usar productUIService directamente');
    return;
};

/**
 * @deprecated Usar inventoryOperationsService directamente
 */
export const guardarInventarioLocal = (inventario) => {
    console.warn('DEPRECATED: guardarInventarioLocal() - Usar inventoryOperationsService directamente');
    return;
};

/**
 * @deprecated Usar inventoryOperationsService directamente
 */
export const cargarInventarioLocal = () => {
    console.warn('DEPRECATED: cargarInventarioLocal() - Usar inventoryOperationsService directamente');
    return {};
};

// ===== FUNCIONES DE INTEGRACIÓN =====

/**
 * Configurar listeners de eventos entre servicios
 */
const setupServiceEventListeners = () => {
    // Listener para cuando se soliciten detalles de producto
    productUIService.on('productDetailsRequested', async ({ codigo }) => {
        try {
            const products = await productOperationsService.searchProductByCode(codigo);
            if (products.length > 0) {
                const modal = productUIService.createProductDetailsModal(products[0]);
                document.body.appendChild(modal);
                modal.classList.remove('hidden');
                
                // Generar código de barras si la librería está disponible
                setTimeout(() => {
                    const canvas = document.getElementById('barcode-canvas');
                    if (canvas && window.JsBarcode) {
                        try {
                            window.JsBarcode(canvas, codigo, {
                                format: 'CODE128',
                                width: 2,
                                height: 100,
                                displayValue: true
                            });
                        } catch (error) {
                            console.warn('Error al generar código de barras:', error);
                        }
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error al mostrar detalles del producto:', error);
        }
    });

    // Listener para cuando se solicite edición de producto
    productUIService.on('editProductRequested', ({ codigo }) => {
        // Emitir evento para que la aplicación maneje la edición
        window.dispatchEvent(new CustomEvent('editProductRequested', { 
            detail: { codigo } 
        }));
    });

    // Listener para actualizaciones de inventario desde UI
    productUIService.on('inventoryUpdateRequested', async (data) => {
        try {
            await inventoryOperationsService.modifyInventory(
                data.product.codigo, 
                data.cantidad, 
                data.observaciones
            );
        } catch (error) {
            console.error('Error al actualizar inventario desde UI:', error);
        }
    });

    // Listener para selección de ubicación
    inventoryOperationsService.on('locationSelectionRequested', ({ locations, callback }) => {
        // Crear modal de selección de ubicación
        const modal = createLocationSelectionModal(locations, callback);
        document.body.appendChild(modal);
    });
};

/**
 * Crear modal de selección de ubicación
 */
const createLocationSelectionModal = (locations, callback) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'modal-seleccion-ubicacion';

    const locationsHTML = locations.map(location => `
        <button onclick="selectLocation('${location.id}')" 
                class="w-full p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <h4 class="font-semibold">${location.nombre}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">${location.descripcion}</p>
        </button>
    `).join('');

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold mb-4">Seleccionar Ubicación</h3>
            <div class="space-y-2 mb-4">
                ${locationsHTML}
            </div>
            <button onclick="document.getElementById('modal-seleccion-ubicacion').remove()" 
                    class="w-full btn-secondary">
                Cancelar
            </button>
        </div>
    `;

    // Función global para seleccionar ubicación
    window.selectLocation = (locationId) => {
        const selectedLocation = locations.find(loc => loc.id === locationId);
        modal.remove();
        callback(selectedLocation);
        delete window.selectLocation;
    };

    return modal;
};

// Configurar listeners al cargar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', setupServiceEventListeners);
    
    // Si ya está cargado, ejecutar inmediatamente
    if (document.readyState === 'loading') {
        setupServiceEventListeners();
    }
}

// ===== EXPORTAR SERVICIOS PARA USO AVANZADO =====

export { 
    productOperationsService, 
    productUIService, 
    inventoryOperationsService,
    productPrintService
};

// ===== FUNCIÓN DE INICIALIZACIÓN COMPLETA =====

export const inicializarTodosLosServiciosProductos = async () => {
    try {
        await productOperationsService.initialize();
        await productUIService.initialize();
        await inventoryOperationsService.initialize();
        await productPrintService.initialize();
        
        setupServiceEventListeners();
        
        console.log('✅ Todos los servicios de productos inicializados correctamente');
        return {
            productOperationsService,
            productUIService,
            inventoryOperationsService,
            productPrintService
        };
    } catch (error) {
        console.error('❌ Error al inicializar servicios de productos:', error);
        throw error;
    }
};

// ===== MENSAJE DE MIGRACIÓN =====

console.log('🔄 product-operations-bridge.js cargado - Usando nueva arquitectura de servicios');
console.log('📊 Servicios de productos disponibles:', {
    operaciones: productOperationsService?.name || 'ProductOperationsService',
    interfaz: productUIService?.name || 'ProductUIService',
    inventario: inventoryOperationsService?.name || 'InventoryOperationsService',
    impresion: productPrintService?.name || 'ProductPrintService'
});

// Auto-inicialización si es necesario
export const autoInicializar = async () => {
    const shouldAutoInit = localStorage.getItem('auto_init_product_services') !== 'false';
    if (shouldAutoInit) {
        try {
            await inicializarTodosLosServiciosProductos();
        } catch (error) {
            console.warn('Auto-inicialización falló, usar inicializarTodosLosServiciosProductos() manualmente');
        }
    }
};

// Ejecutar auto-inicialización
autoInicializar();
