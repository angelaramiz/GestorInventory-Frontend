/**
 * BatchUIService - Servicio especializado para interfaz de usuario de lotes
 * 
 * Este servicio maneja todos los componentes de UI relacionados con lotes,
 * incluyendo modales, pestañas, listados y formularios.
 * 
 * @class BatchUIService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';

class BatchUIService extends BaseService {
    constructor() {
        super('BatchUIService');
        
        // Estado de UI
        this.activeTab = 'manual';
        this.activeModalTab = 'escaner';
        this.modalsState = {
            scanningModal: false,
            productInfoModal: false,
            confirmationModal: false
        };
        
        // Elementos DOM cacheados
        this.elements = new Map();
        
        // Configuración de UI
        this.uiConfig = {
            animationDuration: 300,
            autoRefreshInterval: 5000,
            maxItemsPerPage: 50
        };
        
        this.debug('BatchUIService inicializado');
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            if (this.status === 'initialized') {
                this.debug('Servicio ya inicializado');
                return;
            }

            this.status = 'initializing';
            this.debug('Inicializando BatchUIService...');

            // Cachear elementos DOM principales
            await this.cacheElements();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar configuración
            await this.loadConfiguration();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('BatchUIService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar BatchUIService:', error);
            throw error;
        }
    }

    /**
     * Cachear elementos DOM principales
     */
    async cacheElements() {
        try {
            const elementIds = [
                'tabInventarioManual',
                'tabLotesAvanzado',
                'contenidoInventarioManual',
                'contenidoLotesAvanzado',
                'modalEscaneoLotesAvanzado',
                'tabEscanerAvanzado',
                'tabListadoAvanzado',
                'contenidoEscanerAvanzado',
                'contenidoListadoAvanzado',
                'iniciarEscaneoLotesAvanzado',
                'cerrarModalLotesAvanzado',
                'pausarEscaneoLotesAvanzado',
                'finalizarEscaneoLotesAvanzado',
                'guardarInventarioLotesAvanzado',
                'modalInfoProducto',
                'confirmarProductosSimilares',
                'agruparAutomaticamente',
                'sonidoConfirmacion',
                'contadorProductosEscaneados',
                'contadorProductosUnicos',
                'listadoProductosAvanzado'
            ];

            elementIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    this.elements.set(id, element);
                }
            });

            this.debug(`Elementos DOM cacheados: ${this.elements.size}/${elementIds.length}`);

        } catch (error) {
            this.warn('Error al cachear elementos DOM:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        try {
            // Pestañas principales
            this.addElementListener('tabInventarioManual', 'click', () => {
                this.switchMainTab('manual');
            });

            this.addElementListener('tabLotesAvanzado', 'click', () => {
                this.switchMainTab('avanzado');
            });

            // Pestañas del modal
            this.addElementListener('tabEscanerAvanzado', 'click', () => {
                this.switchModalTab('escaner');
            });

            this.addElementListener('tabListadoAvanzado', 'click', () => {
                this.switchModalTab('listado');
            });

            // Botones del modal
            this.addElementListener('iniciarEscaneoLotesAvanzado', 'click', () => {
                this.emit('startScanningRequested');
            });

            this.addElementListener('cerrarModalLotesAvanzado', 'click', () => {
                this.closeModal('scanningModal');
            });

            this.addElementListener('pausarEscaneoLotesAvanzado', 'click', () => {
                this.emit('pauseScanningRequested');
            });

            this.addElementListener('finalizarEscaneoLotesAvanzado', 'click', () => {
                this.emit('finishScanningRequested');
            });

            this.addElementListener('guardarInventarioLotesAvanzado', 'click', () => {
                this.emit('saveInventoryRequested');
            });

            // Checkboxes de configuración
            this.addElementListener('confirmarProductosSimilares', 'change', (event) => {
                this.emit('configurationChanged', { 
                    confirmarProductosSimilares: event.target.checked 
                });
            });

            this.addElementListener('agruparAutomaticamente', 'change', (event) => {
                this.emit('configurationChanged', { 
                    agruparAutomaticamente: event.target.checked 
                });
            });

            this.addElementListener('sonidoConfirmacion', 'change', (event) => {
                this.emit('configurationChanged', { 
                    sonidoConfirmacion: event.target.checked 
                });
            });

            this.debug('Event listeners configurados');

        } catch (error) {
            this.error('Error al configurar event listeners:', error);
        }
    }

    /**
     * Agregar event listener a un elemento
     */
    addElementListener(elementId, event, handler) {
        const element = this.elements.get(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Cargar configuración de UI
     */
    async loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('batch_ui_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.uiConfig = { ...this.uiConfig, ...config };
                this.debug('Configuración de UI cargada:', this.uiConfig);
            }
        } catch (error) {
            this.warn('Error al cargar configuración de UI:', error);
        }
    }

    /**
     * Cambiar pestaña principal
     * @param {string} tabType - Tipo de pestaña ('manual' o 'avanzado')
     */
    switchMainTab(tabType) {
        try {
            const tabManual = this.elements.get('tabInventarioManual');
            const tabAvanzado = this.elements.get('tabLotesAvanzado');
            const contenidoManual = this.elements.get('contenidoInventarioManual');
            const contenidoAvanzado = this.elements.get('contenidoLotesAvanzado');

            if (!tabManual || !tabAvanzado || !contenidoManual || !contenidoAvanzado) {
                this.warn('Elementos de pestañas principales no encontrados');
                return;
            }

            if (tabType === 'manual') {
                // Activar pestaña manual
                tabManual.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500 font-semibold';
                tabAvanzado.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300 font-semibold';

                contenidoManual.style.display = 'block';
                contenidoAvanzado.style.display = 'none';

            } else if (tabType === 'avanzado') {
                // Activar pestaña avanzado
                tabAvanzado.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500 font-semibold';
                tabManual.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300 font-semibold';

                contenidoAvanzado.style.display = 'block';
                contenidoManual.style.display = 'none';
            }

            this.activeTab = tabType;
            this.debug(`Pestaña principal cambiada a: ${tabType}`);
            this.emit('mainTabChanged', { tab: tabType });

        } catch (error) {
            this.error('Error al cambiar pestaña principal:', error);
        }
    }

    /**
     * Cambiar pestaña del modal
     * @param {string} tabType - Tipo de pestaña ('escaner' o 'listado')
     */
    switchModalTab(tabType) {
        try {
            const tabEscaner = this.elements.get('tabEscanerAvanzado');
            const tabListado = this.elements.get('tabListadoAvanzado');
            const contenidoEscaner = this.elements.get('contenidoEscanerAvanzado');
            const contenidoListado = this.elements.get('contenidoListadoAvanzado');

            if (!tabEscaner || !tabListado || !contenidoEscaner || !contenidoListado) {
                this.warn('Elementos de pestañas del modal no encontrados');
                return;
            }

            if (tabType === 'escaner') {
                // Activar pestaña escáner
                tabEscaner.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
                tabListado.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';

                contenidoEscaner.style.display = 'block';
                contenidoListado.style.display = 'none';

                // Emitir evento para reanudar escáner
                this.emit('scannerTabActivated');

            } else if (tabType === 'listado') {
                // Activar pestaña listado
                tabListado.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
                tabEscaner.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';

                contenidoListado.style.display = 'block';
                contenidoEscaner.style.display = 'none';

                // Emitir evento para pausar escáner
                this.emit('listingTabActivated');
            }

            this.activeModalTab = tabType;
            this.debug(`Pestaña del modal cambiada a: ${tabType}`);
            this.emit('modalTabChanged', { tab: tabType });

        } catch (error) {
            this.error('Error al cambiar pestaña del modal:', error);
        }
    }

    /**
     * Mostrar modal de escaneo
     */
    showScanningModal() {
        try {
            const modal = this.elements.get('modalEscaneoLotesAvanzado');
            if (modal) {
                modal.style.display = 'block';
                this.modalsState.scanningModal = true;
                
                // Activar pestaña del escáner por defecto
                setTimeout(() => {
                    this.switchModalTab('escaner');
                }, this.uiConfig.animationDuration);

                this.debug('Modal de escaneo mostrado');
                this.emit('scanningModalShown');
            }
        } catch (error) {
            this.error('Error al mostrar modal de escaneo:', error);
        }
    }

    /**
     * Cerrar modal
     * @param {string} modalType - Tipo de modal a cerrar
     */
    closeModal(modalType) {
        try {
            let modal = null;
            
            switch (modalType) {
                case 'scanningModal':
                    modal = this.elements.get('modalEscaneoLotesAvanzado');
                    this.modalsState.scanningModal = false;
                    this.emit('scanningModalClosed');
                    break;
                case 'productInfoModal':
                    modal = this.elements.get('modalInfoProducto');
                    this.modalsState.productInfoModal = false;
                    this.emit('productInfoModalClosed');
                    break;
            }

            if (modal) {
                modal.style.display = 'none';
                this.debug(`Modal ${modalType} cerrado`);
            }

        } catch (error) {
            this.error('Error al cerrar modal:', error);
        }
    }

    /**
     * Mostrar modal de información de producto
     * @param {Object} product - Datos del producto
     * @param {Object} extractedData - Datos extraídos
     * @param {Object} primaryProduct - Producto primario (opcional)
     * @param {string} type - Tipo de producto
     */
    showProductInfoModal(product, extractedData, primaryProduct = null, type = 'regular') {
        try {
            const modal = this.createProductInfoModal(product, extractedData, primaryProduct, type);
            
            // Remover modal existente si existe
            const existingModal = document.getElementById('modalInfoProducto');
            if (existingModal) {
                existingModal.remove();
            }

            // Agregar nuevo modal al DOM
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            this.modalsState.productInfoModal = true;
            this.debug('Modal de información de producto mostrado');
            this.emit('productInfoModalShown', { product, extractedData, primaryProduct, type });

        } catch (error) {
            this.error('Error al mostrar modal de información de producto:', error);
        }
    }

    /**
     * Crear modal de información de producto
     * @param {Object} product - Datos del producto
     * @param {Object} extractedData - Datos extraídos
     * @param {Object} primaryProduct - Producto primario
     * @param {string} type - Tipo de producto
     * @returns {HTMLElement} Elemento del modal
     */
    createProductInfoModal(product, extractedData, primaryProduct, type) {
        const modal = document.createElement('div');
        modal.id = 'modalInfoProducto';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        let productInfoHTML = '';
        let primaryProductHTML = '';
        let extractedDataHTML = '';

        // Información del producto escaneado
        if (product) {
            productInfoHTML = `
                <div class="bg-blue-50 p-4 rounded-lg dark-modal-section">
                    <h4 class="text-lg font-bold mb-3 text-blue-800 dark-modal-title">📦 ${type === 'subproduct' ? 'Subproducto' : 'Producto'} Escaneado</h4>
                    <div class="space-y-2">
                        <div class="dark-modal-text"><strong>Código:</strong> ${product.codigo}</div>
                        <div class="dark-modal-text"><strong>Nombre:</strong> ${product.nombre}</div>
                        <div class="dark-modal-text"><strong>Marca:</strong> ${product.marca || 'N/A'}</div>
                        <div class="dark-modal-text"><strong>Unidad:</strong> ${product.unidad || 'UNIDAD'}</div>
                        <div class="dark-modal-text"><strong>Categoría:</strong> ${product.categoria || 'N/A'}</div>
                    </div>
                </div>
            `;
        }

        // Información del producto primario (si existe)
        if (primaryProduct) {
            primaryProductHTML = `
                <div class="bg-green-50 p-4 rounded-lg dark-modal-section">
                    <h4 class="text-lg font-bold mb-3 text-green-800 dark-modal-title">🏷️ Producto Primario</h4>
                    <div class="space-y-2">
                        <div class="dark-modal-text"><strong>Código:</strong> ${primaryProduct.codigo}</div>
                        <div class="dark-modal-text"><strong>Nombre:</strong> ${primaryProduct.nombre}</div>
                        <div class="dark-modal-text"><strong>Marca:</strong> ${primaryProduct.marca || 'N/A'}</div>
                        <div class="dark-modal-text"><strong>Unidad:</strong> ${primaryProduct.unidad || 'UNIDAD'}</div>
                        <div class="dark-modal-text"><strong>Categoría:</strong> ${primaryProduct.categoria || 'N/A'}</div>
                    </div>
                </div>
            `;
        }

        // Datos extraídos del código
        if (extractedData) {
            extractedDataHTML = `
                <div class="mt-4 bg-gray-50 p-4 rounded-lg dark-modal-section">
                    <h4 class="text-lg font-bold mb-3 text-gray-800 dark-modal-title">🔍 Datos del Código Escaneado</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div class="text-center">
                            <div class="text-sm text-gray-600 dark-modal-text">PLU</div>
                            <div class="font-bold text-lg dark-modal-text">${extractedData.plu || 'N/A'}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-600 dark-modal-text">Precio</div>
                            <div class="font-bold text-lg text-green-600 dark-modal-text">$${extractedData.precioPorcion?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-600 dark-modal-text">Peso Estimado</div>
                            <div class="font-bold text-lg text-blue-600 dark-modal-text">${extractedData.pesoTemporal?.toFixed(3) || '0.000'} kg</div>
                        </div>
                    </div>
                    ${extractedData.precioPorcion ? `
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 dark-modal-text mb-2">
                                Precio por Kilo (para cálculo preciso):
                            </label>
                            <input type="number" 
                                   id="precioPorKilo" 
                                   value="100.00" 
                                   step="0.01" 
                                   min="0.01"
                                   class="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    ` : ''}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold dark-modal-title">📋 Información del Producto</h3>
                    <button id="cerrarModalInfoProducto" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${productInfoHTML}
                    ${primaryProductHTML}
                </div>
                
                ${extractedDataHTML}
                
                <div class="flex space-x-4 mt-6">
                    <button id="guardarInfoProducto" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        💾 Guardar Producto
                    </button>
                    <button id="cancelarInfoProducto" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;

        // Configurar event listeners del modal
        const closeBtn = modal.querySelector('#cerrarModalInfoProducto');
        const cancelBtn = modal.querySelector('#cancelarInfoProducto');
        const saveBtn = modal.querySelector('#guardarInfoProducto');

        closeBtn?.addEventListener('click', () => {
            this.closeModal('productInfoModal');
        });

        cancelBtn?.addEventListener('click', () => {
            this.closeModal('productInfoModal');
        });

        saveBtn?.addEventListener('click', () => {
            const priceInput = modal.querySelector('#precioPorKilo');
            const pricePerKilo = priceInput ? parseFloat(priceInput.value) : null;
            
            this.emit('saveProductInfoRequested', {
                product,
                extractedData,
                primaryProduct,
                pricePerKilo
            });
        });

        return modal;
    }

    /**
     * Actualizar contadores en la UI
     * @param {Object} counters - Contadores actualizados
     */
    updateCounters(counters) {
        try {
            const totalElement = this.elements.get('contadorProductosEscaneados');
            const uniqueElement = this.elements.get('contadorProductosUnicos');

            if (totalElement) {
                totalElement.textContent = counters.totalProducts || 0;
            }

            if (uniqueElement) {
                uniqueElement.textContent = counters.uniqueProducts || 0;
            }

            this.debug('Contadores actualizados:', counters);
            this.emit('countersUpdated', counters);

        } catch (error) {
            this.error('Error al actualizar contadores:', error);
        }
    }

    /**
     * Actualizar listado de productos
     * @param {Array} products - Lista de productos
     * @param {Array} groupedProducts - Productos agrupados (opcional)
     */
    updateProductList(products, groupedProducts = null) {
        try {
            const listElement = this.elements.get('listadoProductosAvanzado');
            if (!listElement) {
                this.warn('Elemento de listado no encontrado');
                return;
            }

            const productsToShow = groupedProducts || products;
            const listHTML = this.generateProductListHTML(productsToShow, !!groupedProducts);
            
            listElement.innerHTML = listHTML;

            this.debug(`Listado actualizado con ${productsToShow.length} ${groupedProducts ? 'grupos' : 'productos'}`);
            this.emit('productListUpdated', { products, groupedProducts });

        } catch (error) {
            this.error('Error al actualizar listado de productos:', error);
        }
    }

    /**
     * Generar HTML para el listado de productos
     * @param {Array} items - Elementos a mostrar
     * @param {boolean} isGrouped - Si son productos agrupados
     * @returns {string} HTML generado
     */
    generateProductListHTML(items, isGrouped = false) {
        if (!items || items.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <p>No hay productos escaneados aún</p>
                    <p class="text-sm mt-2">Los productos aparecerán aquí cuando sean escaneados</p>
                </div>
            `;
        }

        let html = '<div class="space-y-2">';

        items.forEach((item, index) => {
            if (isGrouped) {
                // Producto agrupado
                html += this.generateGroupedProductHTML(item, index);
            } else {
                // Producto individual
                html += this.generateIndividualProductHTML(item, index);
            }
        });

        html += '</div>';
        return html;
    }

    /**
     * Generar HTML para producto agrupado
     * @param {Object} group - Grupo de productos
     * @param {number} index - Índice del grupo
     * @returns {string} HTML del grupo
     */
    generateGroupedProductHTML(group, index) {
        const product = group.primaryProduct;
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white">${product.nombre}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Código: ${product.codigo}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Marca: ${product.marca || 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <div class="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                            ${group.count} ${group.count === 1 ? 'producto' : 'productos'}
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Total: ${group.totalQuantity.toFixed(3)} ${product.unidad || 'UNIDAD'}
                        </p>
                        <p class="text-sm font-semibold text-green-600 dark:text-green-400">
                            $${group.totalValue.toFixed(2)}
                        </p>
                    </div>
                </div>
                
                ${group.products.length > 1 ? `
                    <details class="mt-3">
                        <summary class="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            Ver detalles (${group.products.length} items)
                        </summary>
                        <div class="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                            ${group.products.map(p => `
                                <div class="text-sm text-gray-600 dark:text-gray-400 py-1">
                                    ${p.cantidad.toFixed(3)} ${p.unidad} - $${(p.precio || 0).toFixed(2)}
                                    ${p.code128Data ? ` (${p.weight?.toFixed(3)}kg @ $${p.pricePerKilo}/kg)` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
                
                <div class="flex justify-end mt-3">
                    <button onclick="eliminarGrupoProducto('${group.primaryCode}')" 
                            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm">
                        🗑️ Eliminar grupo
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML para producto individual
     * @param {Object} product - Producto individual
     * @param {number} index - Índice del producto
     * @returns {string} HTML del producto
     */
    generateIndividualProductHTML(product, index) {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white">${product.nombre}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Código: ${product.codigo}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Marca: ${product.marca || 'N/A'}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: ${product.cantidad.toFixed(3)} ${product.unidad || 'UNIDAD'}
                        </p>
                        ${product.code128Data ? `
                            <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                PLU: ${product.plu} | Peso: ${product.weight?.toFixed(3)}kg | $${product.pricePerKilo}/kg
                            </div>
                        ` : ''}
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-semibold text-green-600 dark:text-green-400">
                            $${(product.precio || 0).toFixed(2)}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${new Date(product.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                
                <div class="flex justify-end mt-3">
                    <button onclick="eliminarProductoIndividual('${product.id}')" 
                            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Actualizar configuración de checkboxes
     * @param {Object} config - Configuración actual
     */
    updateConfigurationCheckboxes(config) {
        try {
            const confirmarCheckbox = this.elements.get('confirmarProductosSimilares');
            const agruparCheckbox = this.elements.get('agruparAutomaticamente');
            const sonidoCheckbox = this.elements.get('sonidoConfirmacion');

            if (confirmarCheckbox) {
                confirmarCheckbox.checked = config.confirmarProductosSimilares || false;
            }

            if (agruparCheckbox) {
                agruparCheckbox.checked = config.agruparAutomaticamente !== false;
            }

            if (sonidoCheckbox) {
                sonidoCheckbox.checked = config.sonidoConfirmacion !== false;
            }

            this.debug('Checkboxes de configuración actualizados:', config);

        } catch (error) {
            this.error('Error al actualizar checkboxes de configuración:', error);
        }
    }

    /**
     * Mostrar notificación temporal
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     * @param {number} duration - Duración en milisegundos
     */
    showNotification(message, type = 'info', duration = 3000) {
        try {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
            
            const colors = {
                success: 'bg-green-500 text-white',
                error: 'bg-red-500 text-white',
                warning: 'bg-yellow-500 text-black',
                info: 'bg-blue-500 text-white'
            };

            notification.className += ` ${colors[type] || colors.info}`;
            notification.textContent = message;

            document.body.appendChild(notification);

            // Animar entrada
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);

            // Animar salida y remover
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);

            this.debug(`Notificación mostrada: ${message} (${type})`);

        } catch (error) {
            this.error('Error al mostrar notificación:', error);
        }
    }

    /**
     * Obtener estado de modales
     * @returns {Object} Estado actual de modales
     */
    getModalsState() {
        return { ...this.modalsState };
    }

    /**
     * Obtener pestaña activa
     * @returns {Object} Pestañas activas
     */
    getActiveTabs() {
        return {
            mainTab: this.activeTab,
            modalTab: this.activeModalTab
        };
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            cachedElements: this.elements.size,
            modalsState: this.modalsState,
            activeTabs: this.getActiveTabs(),
            uiConfig: this.uiConfig
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            // Cerrar todos los modales
            Object.keys(this.modalsState).forEach(modalType => {
                if (this.modalsState[modalType]) {
                    this.closeModal(modalType);
                }
            });

            // Limpiar elementos cacheados
            this.elements.clear();

            super.cleanup();
            this.debug('Recursos de BatchUIService limpiados');

        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const batchUIService = new BatchUIService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        batchUIService.initialize().catch(error => {
            console.warn('BatchUIService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        batchUIService.initialize().catch(error => {
            console.warn('BatchUIService auto-inicialización falló:', error.message);
        });
    }
}

export default BatchUIService;
