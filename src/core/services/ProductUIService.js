/**
 * ProductUIService - Servicio para operaciones de interfaz de usuario
 * 
 * Migra la funcionalidad UI de product-operations.js:
 * - Mostrar resultados de búsqueda
 * - Formularios de productos
 * - Modales y detalles
 * - Impresión y exportación
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';
// NO importar logs.js - usar this.showMessage() y this.showToast() de BaseService

export class ProductUIService extends BaseService {
    constructor() {
        super('ProductUIService');
        
        // Referencias a elementos DOM comunes
        this.elements = {
            resultados: null,
            formularioInventario: null,
            modalDetalles: null
        };
        
        // Estado de la UI
        this.currentProduct = null;
        this.isEditing = false;
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            // Cachear elementos DOM comunes
            this.cacheCommonElements();
            
            // Configurar event listeners globales
            this.setupGlobalEventListeners();
            
            this.status = 'initialized';
            this.emit('initialized', { service: this.name });
            
        } catch (error) {
            this.handleError('Error al inicializar ProductUIService', error);
            throw error;
        }
    }

    /**
     * Cachear elementos DOM comunes
     */
    cacheCommonElements() {
        this.elements.resultados = document.getElementById('resultados');
        this.elements.formularioInventario = document.getElementById('formulario-inventario');
        this.elements.modalDetalles = document.getElementById('modal-detalles');
    }

    /**
     * Mostrar resultados de búsqueda de productos
     */
    showSearchResults(resultados) {
        const resultadoDiv = this.elements.resultados || document.getElementById('resultados');
        
        if (!resultadoDiv) {
            console.warn('Elemento resultados no encontrado');
            return;
        }

        resultadoDiv.innerHTML = ''; // Limpiar resultados previos

        if (!resultados || resultados.length === 0) {
            resultadoDiv.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-500 dark:text-gray-400">
                        <i class="fas fa-search text-4xl mb-4"></i>
                        <p class="text-lg">No se encontraron productos</p>
                        <p class="text-sm">Intenta con otros términos de búsqueda</p>
                    </div>
                </div>
            `;
            return;
        }

        resultados.forEach(producto => {
            if (producto) {
                const productoDiv = this.createProductCard(producto);
                resultadoDiv.appendChild(productoDiv);
            }
        });

        // Emitir evento de resultados mostrados
        this.emit('searchResultsDisplayed', { count: resultados.length });
    }

    /**
     * Crear tarjeta de producto
     */
    createProductCard(producto) {
        const productoDiv = document.createElement('div');
        productoDiv.classList.add(
            'bg-white', 'dark:bg-gray-800',
            'rounded-lg', 'shadow-md',
            'p-6', 'mb-4',
            'border', 'border-gray-200', 'dark:border-gray-700',
            'cursor-pointer',
            'hover:bg-gray-50', 'dark:hover:bg-gray-700',
            'transition-colors', 'duration-200'
        );

        // Determinar estado del stock
        const stockStatus = this.getStockStatus(producto);
        const stockBadge = this.createStockBadge(stockStatus);

        productoDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                    ${this.escapeHtml(producto.nombre || 'Sin nombre')}
                </h3>
                ${stockBadge}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Código:</strong> ${this.escapeHtml(producto.codigo || 'N/A')}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Categoría:</strong> ${this.escapeHtml(producto.categoria || 'Sin categoría')}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Marca:</strong> ${this.escapeHtml(producto.marca || 'Sin marca')}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Precio:</strong> $${this.formatPrice(producto.precio || 0)}
                </p>
                ${producto.stock !== undefined ? `
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Stock:</strong> ${producto.stock} ${producto.unidad || 'unidades'}
                </p>
                ` : ''}
            </div>
            <div class="mt-4 flex space-x-2">
                <button class="btn-primary btn-sm flex-1" onclick="productUIService.showProductDetails('${producto.codigo}')">
                    <i class="fas fa-eye mr-1"></i> Ver Detalles
                </button>
                <button class="btn-secondary btn-sm" onclick="productUIService.editProduct('${producto.codigo}')">
                    <i class="fas fa-edit mr-1"></i> Editar
                </button>
            </div>
        `;

        // Event listener para clic en la tarjeta
        productoDiv.addEventListener('click', (e) => {
            // Solo si no se hizo clic en un botón
            if (!e.target.closest('button')) {
                this.showProductDetails(producto.codigo);
            }
        });

        return productoDiv;
    }

    /**
     * Mostrar resultados de inventario
     */
    showInventoryResults(resultados) {
        const resultadoDiv = this.elements.resultados || document.getElementById('resultados');
        
        if (!resultadoDiv) {
            console.warn('Elemento resultados no encontrado');
            return;
        }

        resultadoDiv.innerHTML = '';

        if (!resultados || resultados.length === 0) {
            resultadoDiv.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-500 dark:text-gray-400">
                        <i class="fas fa-warehouse text-4xl mb-4"></i>
                        <p class="text-lg">No hay datos de inventario</p>
                        <p class="text-sm">Agrega productos al inventario para comenzar</p>
                    </div>
                </div>
            `;
            return;
        }

        resultados.forEach(item => {
            if (item) {
                const inventarioDiv = this.createInventoryCard(item);
                resultadoDiv.appendChild(inventarioDiv);
            }
        });

        this.emit('inventoryResultsDisplayed', { count: resultados.length });
    }

    /**
     * Crear tarjeta de inventario
     */
    createInventoryCard(item) {
        const inventarioDiv = document.createElement('div');
        inventarioDiv.classList.add(
            'bg-white', 'dark:bg-gray-800',
            'rounded-lg', 'shadow-md',
            'p-6', 'mb-4',
            'border', 'border-gray-200', 'dark:border-gray-700'
        );

        const fechaActualizacion = item.fechaActualizacion ? 
            new Date(item.fechaActualizacion).toLocaleDateString() : 'N/A';

        inventarioDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    ${this.escapeHtml(item.nombre || item.codigo || 'Sin nombre')}
                </h3>
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${item.cantidad || 0}
                </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Código:</strong> ${this.escapeHtml(item.codigo || 'N/A')}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Cantidad Anterior:</strong> ${item.cantidadAnterior || 0}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Fecha:</strong> ${fechaActualizacion}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                    <strong>Usuario:</strong> ${this.escapeHtml(item.usuario || 'Sistema')}
                </p>
            </div>
            ${item.observaciones ? `
                <div class="mt-3">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Observaciones:</strong> ${this.escapeHtml(item.observaciones)}
                    </p>
                </div>
            ` : ''}
            <div class="mt-4 flex space-x-2">
                <button class="btn-primary btn-sm flex-1" onclick="productUIService.showInventoryForm('${item.codigo}')">
                    <i class="fas fa-edit mr-1"></i> Actualizar Inventario
                </button>
            </div>
        `;

        return inventarioDiv;
    }

    /**
     * Mostrar formulario de inventario
     */
    showInventoryForm(producto) {
        this.currentProduct = producto;
        
        // Crear modal para formulario de inventario
        const modal = this.createInventoryModal(producto);
        document.body.appendChild(modal);
        
        // Mostrar modal
        modal.classList.remove('hidden');
        
        this.emit('inventoryFormShown', { product: producto });
    }

    /**
     * Crear modal de inventario
     */
    createInventoryModal(producto) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'modal-inventario';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Actualizar Inventario
                    </h3>
                    <button onclick="productUIService.closeInventoryModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form id="form-inventario" onsubmit="productUIService.submitInventoryForm(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Producto
                            </label>
                            <input type="text" value="${this.escapeHtml(producto.nombre || producto.codigo)}" 
                                   class="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-700" readonly>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Cantidad Actual
                            </label>
                            <input type="number" id="cantidad-actual" name="cantidad" 
                                   value="${producto.stock || 0}" step="0.01" min="0"
                                   class="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Observaciones
                            </label>
                            <textarea id="observaciones-inventario" name="observaciones" rows="3"
                                      class="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white"
                                      placeholder="Motivo del cambio, notas adicionales..."></textarea>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3 mt-6">
                        <button type="button" onclick="productUIService.closeInventoryModal()" 
                                class="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" class="btn-primary flex-1">
                            <i class="fas fa-save mr-1"></i> Guardar
                        </button>
                    </div>
                </form>
            </div>
        `;

        return modal;
    }

    /**
     * Cerrar modal de inventario
     */
    closeInventoryModal() {
        const modal = document.getElementById('modal-inventario');
        if (modal) {
            modal.remove();
        }
        this.currentProduct = null;
    }

    /**
     * Enviar formulario de inventario
     */
    async submitInventoryForm(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const cantidad = parseFloat(formData.get('cantidad'));
            const observaciones = formData.get('observaciones');

            if (isNaN(cantidad) || cantidad < 0) {
                throw new Error('La cantidad debe ser un número válido mayor o igual a 0');
            }

            // Emitir evento para que otros servicios manejen la actualización
            this.emit('inventoryUpdateRequested', {
                product: this.currentProduct,
                cantidad,
                observaciones,
                usuario: localStorage.getItem('username') || 'Usuario'
            });

            this.closeInventoryModal();
            mostrarAlertaBurbuja('Inventario actualizado exitosamente', 'success');
            
        } catch (error) {
            this.handleError('Error al actualizar inventario', error);
            mostrarAlertaBurbuja(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Mostrar detalles del producto con código de barras
     */
    async showProductDetails(codigo) {
        try {
            // Emitir evento para solicitar detalles del producto
            this.emit('productDetailsRequested', { codigo });
            
        } catch (error) {
            this.handleError('Error al mostrar detalles del producto', error);
        }
    }

    /**
     * Crear modal de detalles del producto
     */
    createProductDetailsModal(producto) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'modal-detalles-producto';

        const barcodeCanvas = `<canvas id="barcode-canvas" class="mx-auto mb-4"></canvas>`;

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                        Detalles del Producto
                    </h2>
                    <button onclick="productUIService.closeProductDetailsModal()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="text-center">
                        ${barcodeCanvas}
                        <p class="text-sm text-gray-600 dark:text-gray-400">Código de barras</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                            <p class="text-lg font-semibold">${this.escapeHtml(producto.nombre || 'N/A')}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Código</label>
                            <p class="text-lg font-mono">${this.escapeHtml(producto.codigo || 'N/A')}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                            <p>${this.escapeHtml(producto.categoria || 'Sin categoría')}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Marca</label>
                            <p>${this.escapeHtml(producto.marca || 'Sin marca')}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio</label>
                            <p class="text-lg font-bold text-green-600">$${this.formatPrice(producto.precio || 0)}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock</label>
                            <p class="text-lg">${producto.stock || 0} ${producto.unidad || 'unidades'}</p>
                        </div>
                    </div>
                    
                    ${producto.descripcion ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                            <p class="text-gray-600 dark:text-gray-400">${this.escapeHtml(producto.descripcion)}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button onclick="productUIService.printProduct('${producto.codigo}')" 
                            class="btn-secondary flex-1">
                        <i class="fas fa-print mr-1"></i> Imprimir
                    </button>
                    <button onclick="productUIService.editProduct('${producto.codigo}')" 
                            class="btn-primary flex-1">
                        <i class="fas fa-edit mr-1"></i> Editar
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Cerrar modal de detalles
     */
    closeProductDetailsModal() {
        const modal = document.getElementById('modal-detalles-producto');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Funciones de utilidad
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    formatPrice(price) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }

    getStockStatus(producto) {
        const stock = producto.stock || 0;
        const minStock = producto.stockMinimo || 0;
        
        if (stock === 0) return 'sin-stock';
        if (stock <= minStock) return 'stock-bajo';
        return 'stock-ok';
    }

    createStockBadge(status) {
        const badges = {
            'sin-stock': '<span class="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Sin Stock</span>',
            'stock-bajo': '<span class="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Stock Bajo</span>',
            'stock-ok': '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Stock OK</span>'
        };
        return badges[status] || '';
    }

    /**
     * Setup de event listeners globales
     */
    setupGlobalEventListeners() {
        // Listener para cambios de tema
        document.addEventListener('themeChanged', () => {
            this.emit('themeChanged');
        });
    }

    /**
     * Limpiar formularios
     */
    clearInventoryForm() {
        const form = document.getElementById('form-inventario');
        if (form) {
            form.reset();
        }
    }

    /**
     * Editar producto
     */
    editProduct(codigo) {
        this.emit('editProductRequested', { codigo });
    }

    /**
     * Imprimir producto
     */
    printProduct(codigo) {
        this.emit('printProductRequested', { codigo });
    }
}

// Crear instancia singleton
export const productUIService = new ProductUIService();

// Exponer funciones globalmente para uso en HTML
if (typeof window !== 'undefined') {
    window.productUIService = productUIService;
}

// Backwards compatibility exports
export const mostrarResultados = (resultados) => productUIService.showSearchResults(resultados);
export const mostrarResultadosInventario = (resultados) => productUIService.showInventoryResults(resultados);
export const mostrarFormularioInventario = (producto) => productUIService.showInventoryForm(producto);
export const limpiarFormularioInventario = () => productUIService.clearInventoryForm();
