/**
 * ProductTableService - Servicio especializado para gestión de tabla de productos
 * 
 * Este servicio maneja la funcionalidad de agregar productos por tabla,
 * incluyendo producto primario, subproductos y relaciones entre ellos.
 * 
 * @class ProductTableService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

class ProductTableService extends BaseService {
    constructor() {
        super('ProductTableService');
        
        // Estado de la tabla
        this.primaryProduct = null;
        this.subproducts = [];
        this.rowCounter = 0;
        
        // Referencias a elementos DOM
        this.elements = {
            addRowBtn: null,
            clearTableBtn: null,
            saveTableBtn: null,
            primaryCodeInput: null,
            subproductsContainer: null
        };
        
        // Configuración
        this.config = {
            autoSearch: true,
            validateOnBlur: true,
            showConfirmation: true,
            syncWithSupabase: true
        };
        
        this.debug('ProductTableService inicializado');
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
            this.debug('Inicializando ProductTableService...');

            // Cachear elementos DOM
            this.cacheElements();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar estilos CSS
            this.injectStyles();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('ProductTableService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar ProductTableService:', error);
            throw error;
        }
    }

    /**
     * Cachear elementos DOM
     */
    cacheElements() {
        try {
            this.elements.addRowBtn = document.getElementById('agregar-fila-btn');
            this.elements.clearTableBtn = document.getElementById('limpiar-tabla-btn');
            this.elements.saveTableBtn = document.getElementById('guardar-tabla-btn');
            this.elements.primaryCodeInput = document.getElementById('codigo-primario');
            this.elements.subproductsContainer = document.getElementById('subproductos-container');
            
            this.debug('Elementos DOM cacheados');
            
        } catch (error) {
            this.warn('Error al cachear elementos DOM:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        try {
            // Botón agregar fila
            if (this.elements.addRowBtn) {
                this.elements.addRowBtn.addEventListener('click', () => {
                    this.addSubproductRow();
                });
            }
            
            // Botón limpiar tabla
            if (this.elements.clearTableBtn) {
                this.elements.clearTableBtn.addEventListener('click', () => {
                    this.clearTable();
                });
            }
            
            // Botón guardar tabla
            if (this.elements.saveTableBtn) {
                this.elements.saveTableBtn.addEventListener('click', () => {
                    this.saveTable();
                });
            }
            
            // Input código primario
            if (this.elements.primaryCodeInput) {
                this.setupPrimaryCodeListeners();
            }
            
            this.debug('Event listeners configurados');
            
        } catch (error) {
            this.error('Error al configurar event listeners:', error);
        }
    }

    /**
     * Configurar listeners del código primario
     */
    setupPrimaryCodeListeners() {
        const input = this.elements.primaryCodeInput;
        
        // Conversión de guión a ceros
        this.applyDashToZeroConversion(input);
        
        // Búsqueda automática en blur
        input.addEventListener('blur', async (e) => {
            const code = this.convertDashToZeros(e.target.value.trim());
            e.target.value = code;
            
            if (code && code.length >= 2) {
                await this.searchPrimaryProduct(code);
            }
        });
        
        // Búsqueda con Enter
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const code = this.convertDashToZeros(e.target.value.trim());
                e.target.value = code;
                
                if (code && code.length >= 2) {
                    await this.searchPrimaryProduct(code);
                }
            }
        });
        
        // Limpiar cuando el campo esté vacío
        input.addEventListener('input', (e) => {
            if (!e.target.value.trim()) {
                this.clearPrimaryProductInfo();
            }
        });
    }

    /**
     * Aplicar conversión de guión a ceros
     * @param {HTMLElement} input - Elemento input
     */
    applyDashToZeroConversion(input) {
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            const originalValue = e.target.value;
            const convertedValue = this.convertDashToZeros(originalValue);
            
            if (originalValue !== convertedValue) {
                const cursorPos = e.target.selectionStart;
                e.target.value = convertedValue;
                
                const difference = convertedValue.length - originalValue.length;
                const newPosition = Math.min(cursorPos + difference, convertedValue.length);
                e.target.setSelectionRange(newPosition, newPosition);
            }
        });

        input.addEventListener('blur', (e) => {
            e.target.value = this.convertDashToZeros(e.target.value);
        });
    }

    /**
     * Convertir guión a ceros
     * @param {string} value - Valor a convertir
     * @returns {string} Valor convertido
     */
    convertDashToZeros(value) {
        return value.replace(/-/g, '000000');
    }

    /**
     * Buscar producto primario
     * @param {string} code - Código del producto
     */
    async searchPrimaryProduct(code) {
        try {
            this.debug(`Buscando producto primario: ${code}`);
            
            // Importar función de búsqueda dinámicamente
            const { buscarProducto } = await import('../../js/product-operations-bridge.js');
            const product = await buscarProducto(code);
            
            if (product) {
                this.primaryProduct = {
                    ...product,
                    codigo: code,
                    esNuevo: false
                };
                
                this.showPrimaryProductInfo(this.primaryProduct, true);
                this.emit('primaryProductFound', this.primaryProduct);
            } else {
                // Producto no encontrado - crear uno nuevo
                this.primaryProduct = {
                    codigo: code,
                    nombre: '',
                    categoria: '',
                    marca: '',
                    unidad: '',
                    esNuevo: true
                };
                
                this.showPrimaryProductInfo(this.primaryProduct, false);
                this.emit('primaryProductNew', this.primaryProduct);
            }
            
        } catch (error) {
            this.error('Error al buscar producto primario:', error);
            this.emit('primaryProductError', error);
        }
    }

    /**
     * Mostrar información del producto primario
     * @param {Object} product - Datos del producto
     * @param {boolean} isExisting - Si es producto existente
     */
    showPrimaryProductInfo(product, isExisting) {
        try {
            const fields = ['nombre', 'categoria', 'marca', 'unidad'];
            
            fields.forEach(field => {
                const input = document.getElementById(`primario-${field}`);
                if (input) {
                    input.value = product[field] || '';
                    
                    if (isExisting) {
                        // Producto existente - solo lectura
                        input.readOnly = true;
                        input.classList.add('campo-readonly', 'producto-existente');
                        input.classList.remove('producto-nuevo');
                        
                        this.addStatusIndicator(input.parentElement, 'existente', '✓ Existente');
                    } else {
                        // Producto nuevo - editable
                        input.readOnly = false;
                        input.classList.remove('campo-readonly', 'producto-existente');
                        input.classList.add('producto-nuevo');
                        input.required = true;
                        
                        this.addStatusIndicator(input.parentElement, 'nuevo', '+ Nuevo');
                    }
                }
            });
            
            this.debug(`Información de producto primario mostrada (${isExisting ? 'existente' : 'nuevo'})`);
            
        } catch (error) {
            this.error('Error al mostrar información de producto primario:', error);
        }
    }

    /**
     * Agregar indicador de estado
     * @param {HTMLElement} container - Contenedor del campo
     * @param {string} type - Tipo de estado (existente/nuevo)
     * @param {string} text - Texto del indicador
     */
    addStatusIndicator(container, type, text) {
        try {
            // Remover indicador existente
            const existing = container.querySelector('.estado-producto');
            if (existing) {
                existing.remove();
            }
            
            // Crear nuevo indicador
            const indicator = document.createElement('span');
            indicator.className = `estado-producto estado-${type}`;
            indicator.textContent = text;
            
            container.style.position = 'relative';
            container.appendChild(indicator);
            
        } catch (error) {
            this.warn('Error al agregar indicador de estado:', error);
        }
    }

    /**
     * Limpiar información del producto primario
     */
    clearPrimaryProductInfo() {
        try {
            this.primaryProduct = null;
            
            const fields = ['nombre', 'categoria', 'marca', 'unidad'];
            fields.forEach(field => {
                const input = document.getElementById(`primario-${field}`);
                if (input) {
                    input.value = '';
                    input.readOnly = false;
                    input.classList.remove('campo-readonly', 'producto-existente', 'producto-nuevo');
                    input.required = false;
                    
                    // Remover indicador
                    const indicator = input.parentElement?.querySelector('.estado-producto');
                    if (indicator) {
                        indicator.remove();
                    }
                }
            });
            
            this.debug('Información de producto primario limpiada');
            this.emit('primaryProductCleared');
            
        } catch (error) {
            this.error('Error al limpiar información de producto primario:', error);
        }
    }

    /**
     * Agregar fila de subproducto
     */
    addSubproductRow() {
        try {
            if (!this.primaryProduct) {
                this.showMessage('Primero debe buscar un producto primario', 'warning');
                return;
            }
            
            this.rowCounter++;
            const container = this.elements.subproductsContainer;
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'subproducto-row';
            rowDiv.id = `subproducto-${this.rowCounter}`;
            
            rowDiv.innerHTML = this.generateSubproductRowHTML(this.rowCounter);
            
            container.appendChild(rowDiv);
            
            // Configurar listeners para la nueva fila
            this.setupSubproductRowListeners(this.rowCounter);
            
            this.debug(`Fila de subproducto ${this.rowCounter} agregada`);
            this.emit('subproductRowAdded', this.rowCounter);
            
        } catch (error) {
            this.error('Error al agregar fila de subproducto:', error);
        }
    }

    /**
     * Generar HTML para fila de subproducto
     * @param {number} rowNumber - Número de fila
     * @returns {string} HTML de la fila
     */
    generateSubproductRowHTML(rowNumber) {
        return `
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-bold text-gray-700">Subproducto ${rowNumber}</h4>
                <button type="button" class="eliminar-fila-btn text-red-500 hover:text-red-700 font-bold" data-fila="${rowNumber}">
                    ✕ Eliminar
                </button>
            </div>
            
            <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">
                    Código del Subproducto:
                </label>
                <div class="flex gap-2">
                    <input
                        id="subproducto-codigo-${rowNumber}"
                        class="shadow appearance-none border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        type="text" placeholder="Código del subproducto" required>
                    <button type="button" class="buscar-subproducto-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" data-fila="${rowNumber}">
                        Buscar
                    </button>
                </div>
            </div>
            
            <div class="info-subproducto-${rowNumber} grid grid-cols-1 md:grid-cols-2 gap-4" style="display: none;">
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
                    <input id="subproducto-nombre-${rowNumber}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Categoría:</label>
                    <input id="subproducto-categoria-${rowNumber}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Marca:</label>
                    <input id="subproducto-marca-${rowNumber}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Unidad:</label>
                    <select id="subproducto-unidad-${rowNumber}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        <option value="">Seleccionar unidad</option>
                        <option value="UNIDAD">Unidad</option>
                        <option value="KILOGRAMO">Kilogramo</option>
                        <option value="GRAMO">Gramo</option>
                        <option value="LITRO">Litro</option>
                        <option value="MILILITRO">Mililitro</option>
                        <option value="METRO">Metro</option>
                        <option value="CAJA">Caja</option>
                        <option value="PAQUETE">Paquete</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Configurar listeners para fila de subproducto
     * @param {number} rowNumber - Número de fila
     */
    setupSubproductRowListeners(rowNumber) {
        try {
            // Botón eliminar
            const deleteBtn = document.querySelector(`.eliminar-fila-btn[data-fila="${rowNumber}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.removeSubproductRow(rowNumber);
                });
            }
            
            // Botón buscar
            const searchBtn = document.querySelector(`.buscar-subproducto-btn[data-fila="${rowNumber}"]`);
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    this.searchSubproduct(rowNumber);
                });
            }
            
            // Input código
            const codeInput = document.getElementById(`subproducto-codigo-${rowNumber}`);
            if (codeInput) {
                this.applyDashToZeroConversion(codeInput);
                
                codeInput.addEventListener('blur', () => {
                    if (this.config.autoSearch) {
                        this.searchSubproduct(rowNumber);
                    }
                });
                
                codeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.searchSubproduct(rowNumber);
                    }
                });
            }
            
        } catch (error) {
            this.error('Error al configurar listeners de fila:', error);
        }
    }

    /**
     * Buscar subproducto
     * @param {number} rowNumber - Número de fila
     */
    async searchSubproduct(rowNumber) {
        try {
            const codeInput = document.getElementById(`subproducto-codigo-${rowNumber}`);
            if (!codeInput) return;
            
            const code = this.convertDashToZeros(codeInput.value.trim());
            if (!code) return;
            
            codeInput.value = code;
            
            this.debug(`Buscando subproducto: ${code} (fila ${rowNumber})`);
            
            // Mostrar estado de búsqueda
            const searchBtn = document.querySelector(`.buscar-subproducto-btn[data-fila="${rowNumber}"]`);
            if (searchBtn) {
                searchBtn.textContent = 'Buscando...';
                searchBtn.disabled = true;
            }
            
            // Importar función de búsqueda dinámicamente
            const { buscarProducto } = await import('../../js/product-operations-bridge.js');
            const product = await buscarProducto(code);
            
            let subproduct = {
                codigo: code,
                numeroFila: rowNumber,
                esNuevo: !product
            };
            
            if (product) {
                // Producto encontrado
                subproduct = { ...subproduct, ...product };
                this.showSubproductInfo(rowNumber, subproduct, true);
                
                codeInput.classList.add('pulse-success');
                setTimeout(() => codeInput.classList.remove('pulse-success'), 1000);
            } else {
                // Producto no encontrado
                this.showSubproductInfo(rowNumber, subproduct, false);
                
                // Enfocar primer campo editable
                setTimeout(() => {
                    const nameInput = document.getElementById(`subproducto-nombre-${rowNumber}`);
                    if (nameInput && !nameInput.readOnly) {
                        nameInput.focus();
                    }
                }, 100);
                
                codeInput.classList.add('pulse-warning');
                setTimeout(() => codeInput.classList.remove('pulse-warning'), 1000);
            }
            
            // Actualizar lista de subproductos
            const existingIndex = this.subproducts.findIndex(sub => sub.numeroFila === rowNumber);
            if (existingIndex >= 0) {
                this.subproducts[existingIndex] = subproduct;
            } else {
                this.subproducts.push(subproduct);
            }
            
            // Mostrar información
            const infoContainer = document.querySelector(`.info-subproducto-${rowNumber}`);
            if (infoContainer) {
                infoContainer.style.display = 'block';
            }
            
            // Restaurar botón
            if (searchBtn) {
                searchBtn.textContent = 'Buscar';
                searchBtn.disabled = false;
            }
            
            this.emit('subproductSearched', { rowNumber, subproduct, found: !!product });
            
        } catch (error) {
            this.error('Error al buscar subproducto:', error);
            
            // Restaurar botón en caso de error
            const searchBtn = document.querySelector(`.buscar-subproducto-btn[data-fila="${rowNumber}"]`);
            if (searchBtn) {
                searchBtn.textContent = 'Buscar';
                searchBtn.disabled = false;
            }
        }
    }

    /**
     * Mostrar información del subproducto
     * @param {number} rowNumber - Número de fila
     * @param {Object} subproduct - Datos del subproducto
     * @param {boolean} isExisting - Si es producto existente
     */
    showSubproductInfo(rowNumber, subproduct, isExisting) {
        try {
            const fields = ['nombre', 'categoria', 'marca', 'unidad'];
            
            fields.forEach(field => {
                const input = document.getElementById(`subproducto-${field}-${rowNumber}`);
                if (input) {
                    input.value = subproduct[field] || '';
                    
                    if (isExisting) {
                        input.readOnly = true;
                        input.classList.add('campo-readonly', 'producto-existente');
                        input.classList.remove('producto-nuevo');
                    } else {
                        input.readOnly = false;
                        input.classList.remove('campo-readonly', 'producto-existente');
                        input.classList.add('producto-nuevo');
                        input.required = true;
                    }
                }
            });
            
            // Agregar indicador de estado a la fila
            const rowContainer = document.getElementById(`subproducto-${rowNumber}`);
            if (rowContainer) {
                // Remover indicador existente
                const existing = rowContainer.querySelector('.estado-existente-fila, .estado-nuevo-fila');
                if (existing) existing.remove();
                
                // Agregar nuevo indicador
                const indicator = document.createElement('div');
                indicator.className = isExisting ? 'estado-existente-fila' : 'estado-nuevo-fila';
                indicator.innerHTML = isExisting ? 
                    '<span class="text-green-600 text-sm">✓ Producto existente</span>' : 
                    '<span class="text-orange-600 text-sm">+ Producto nuevo</span>';
                
                const header = rowContainer.querySelector('.flex.justify-between');
                if (header) {
                    header.appendChild(indicator);
                }
            }
            
        } catch (error) {
            this.error('Error al mostrar información de subproducto:', error);
        }
    }

    /**
     * Eliminar fila de subproducto
     * @param {number} rowNumber - Número de fila
     */
    removeSubproductRow(rowNumber) {
        try {
            // Remover de la lista
            this.subproducts = this.subproducts.filter(sub => sub.numeroFila !== rowNumber);
            
            // Remover del DOM
            const rowElement = document.getElementById(`subproducto-${rowNumber}`);
            if (rowElement) {
                rowElement.remove();
            }
            
            this.debug(`Fila de subproducto ${rowNumber} eliminada`);
            this.emit('subproductRowRemoved', rowNumber);
            
        } catch (error) {
            this.error('Error al eliminar fila de subproducto:', error);
        }
    }

    /**
     * Limpiar tabla completa
     */
    clearTable() {
        try {
            // Limpiar producto primario
            this.clearPrimaryProductInfo();
            
            // Limpiar input de código primario
            if (this.elements.primaryCodeInput) {
                this.elements.primaryCodeInput.value = '';
            }
            
            // Remover todas las filas de subproductos
            this.subproducts.forEach(sub => {
                this.removeSubproductRow(sub.numeroFila);
            });
            
            // Resetear contadores
            this.subproducts = [];
            this.rowCounter = 0;
            
            this.debug('Tabla limpiada completamente');
            this.emit('tableCleared');
            
        } catch (error) {
            this.error('Error al limpiar tabla:', error);
        }
    }

    /**
     * Guardar tabla de productos
     */
    async saveTable() {
        try {
            // Validar que hay producto primario
            if (!this.primaryProduct) {
                this.showMessage('Debe definir un producto primario', 'warning');
                return;
            }
            
            // Validar que hay subproductos
            if (this.subproducts.length === 0) {
                this.showMessage('Debe agregar al menos un subproducto', 'warning');
                return;
            }
            
            // Recopilar datos de productos primario
            const primaryData = this.collectPrimaryProductData();
            if (!primaryData) return;
            
            // Recopilar datos de subproductos
            const subproductsData = this.collectSubproductsData();
            if (!subproductsData) return;
            
            // Mostrar confirmación si está habilitada
            if (this.config.showConfirmation) {
                const confirmed = await this.showSaveConfirmation(primaryData, subproductsData);
                if (!confirmed) return;
            }
            
            // Procesar guardado
            await this.processSave(primaryData, subproductsData);
            
        } catch (error) {
            this.error('Error al guardar tabla:', error);
            this.showMessage('Error al guardar tabla de productos', 'error');
        }
    }

    /**
     * Recopilar datos del producto primario
     * @returns {Object|null} Datos del producto primario
     */
    collectPrimaryProductData() {
        try {
            const data = {
                codigo: this.primaryProduct.codigo,
                nombre: document.getElementById('primario-nombre')?.value.trim(),
                categoria: document.getElementById('primario-categoria')?.value.trim(),
                marca: document.getElementById('primario-marca')?.value.trim(),
                unidad: document.getElementById('primario-unidad')?.value.trim(),
                esNuevo: this.primaryProduct.esNuevo
            };
            
            // Validar campos requeridos
            if (!data.nombre || !data.categoria || !data.marca || !data.unidad) {
                this.showMessage('Complete todos los campos del producto primario', 'error');
                return null;
            }
            
            return data;
            
        } catch (error) {
            this.error('Error al recopilar datos del producto primario:', error);
            return null;
        }
    }

    /**
     * Recopilar datos de subproductos
     * @returns {Array|null} Datos de subproductos
     */
    collectSubproductsData() {
        try {
            const data = [];
            
            for (const subproduct of this.subproducts) {
                const rowNumber = subproduct.numeroFila;
                
                const subproductData = {
                    codigo: subproduct.codigo,
                    nombre: document.getElementById(`subproducto-nombre-${rowNumber}`)?.value.trim(),
                    categoria: document.getElementById(`subproducto-categoria-${rowNumber}`)?.value.trim(),
                    marca: document.getElementById(`subproducto-marca-${rowNumber}`)?.value.trim(),
                    unidad: document.getElementById(`subproducto-unidad-${rowNumber}`)?.value.trim(),
                    esNuevo: subproduct.esNuevo
                };
                
                // Validar campos requeridos
                if (!subproductData.nombre || !subproductData.categoria || !subproductData.marca || !subproductData.unidad) {
                    this.showMessage(`Complete todos los campos del subproducto ${rowNumber}`, 'error');
                    return null;
                }
                
                data.push(subproductData);
            }
            
            return data;
            
        } catch (error) {
            this.error('Error al recopilar datos de subproductos:', error);
            return null;
        }
    }

    /**
     * Mostrar confirmación de guardado
     * @param {Object} primaryData - Datos del producto primario
     * @param {Array} subproductsData - Datos de subproductos
     * @returns {Promise<boolean>} Si el usuario confirmó
     */
    async showSaveConfirmation(primaryData, subproductsData) {
        try {
            if (typeof Swal === 'undefined') {
                return true; // No hay SweetAlert, proceder sin confirmación
            }
            
            let message = `<div class="text-left">
                <h3 class="font-bold text-lg mb-3">Confirmar Guardado de Tabla</h3>
                
                <div class="mb-4 p-3 bg-blue-50 rounded">
                    <h4 class="font-semibold text-blue-800">Producto Primario:</h4>
                    <p><strong>Código:</strong> ${primaryData.codigo}</p>
                    <p><strong>Nombre:</strong> ${primaryData.nombre}</p>
                    <p><strong>Estado:</strong> ${primaryData.esNuevo ? '🆕 Nuevo' : '✅ Existente'}</p>
                </div>
                
                <div class="mb-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Subproductos (${subproductsData.length}):</h4>`;
            
            subproductsData.forEach((sub, index) => {
                message += `
                    <div class="p-2 bg-gray-50 rounded mb-2">
                        <p><strong>${index + 1}. ${sub.codigo}</strong> - ${sub.nombre}</p>
                        <p class="text-sm text-gray-600">Estado: ${sub.esNuevo ? '🆕 Nuevo' : '✅ Existente'}</p>
                    </div>`;
            });
            
            message += `</div>
                <p class="text-sm text-gray-600">¿Desea continuar con el guardado?</p>
            </div>`;

            const result = await Swal.fire({
                title: 'Confirmar Guardado',
                html: message,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, Guardar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33'
            });

            return result.isConfirmed;
            
        } catch (error) {
            this.error('Error al mostrar confirmación:', error);
            return true; // Proceder sin confirmación en caso de error
        }
    }

    /**
     * Procesar guardado
     * @param {Object} primaryData - Datos del producto primario
     * @param {Array} subproductsData - Datos de subproductos
     */
    async processSave(primaryData, subproductsData) {
        try {
            // Mostrar progreso
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Guardando...',
                    text: 'Procesando productos y relaciones',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }

            // 1. Guardar producto primario si es nuevo
            if (primaryData.esNuevo) {
                await this.saveProduct(primaryData);
            }

            // 2. Guardar subproductos nuevos
            for (const subproduct of subproductsData) {
                if (subproduct.esNuevo) {
                    await this.saveProduct(subproduct);
                }
            }

            // 3. Crear relaciones
            await this.createProductRelations(primaryData.codigo, subproductsData.map(s => s.codigo));

            // 4. Sincronizar con Supabase si está habilitado
            if (this.config.syncWithSupabase) {
                await this.syncWithSupabase();
            }

            // Mostrar éxito
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Tabla de productos guardada correctamente',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                this.showMessage('Tabla de productos guardada correctamente', 'success');
            }

            // Limpiar tabla después del guardado exitoso
            this.clearTable();
            
            this.emit('tableSaved', { primaryData, subproductsData });
            
        } catch (error) {
            this.error('Error al procesar guardado:', error);
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Error',
                    text: 'Error al guardar tabla de productos',
                    icon: 'error'
                });
            } else {
                this.showMessage('Error al guardar tabla de productos', 'error');
            }
        }
    }

    /**
     * Guardar producto individual
     * @param {Object} productData - Datos del producto
     */
    async saveProduct(productData) {
        try {
            // Importar funciones dinámicamente
            const { guardarProducto } = await import('../../js/product-operations-bridge.js');
            return await guardarProducto(productData);
        } catch (error) {
            this.error('Error al guardar producto:', error);
            throw error;
        }
    }

    /**
     * Crear relaciones entre productos
     * @param {string} primaryCode - Código del producto primario
     * @param {Array} subproductCodes - Códigos de subproductos
     */
    async createProductRelations(primaryCode, subproductCodes) {
        try {
            // Importar funciones dinámicamente
            const { crearRelacionesProductos } = await import('../../js/product-operations-bridge.js');
            return await crearRelacionesProductos(primaryCode, subproductCodes);
        } catch (error) {
            this.error('Error al crear relaciones:', error);
            throw error;
        }
    }

    /**
     * Sincronizar con Supabase
     */
    async syncWithSupabase() {
        try {
            // Importar función dinámicamente
            const { sincronizarConSupabase } = await import('../../js/db-operations-bridge.js');
            return await sincronizarConSupabase();
        } catch (error) {
            this.error('Error al sincronizar con Supabase:', error);
            throw error;
        }
    }

    /**
     * Inyectar estilos CSS
     */
    injectStyles() {
        try {
            if (document.getElementById('product-table-styles')) {
                return; // Ya inyectados
            }
            
            const style = document.createElement('style');
            style.id = 'product-table-styles';
            style.textContent = `
                .campo-readonly {
                    background-color: #f7f7f7 !important;
                    cursor: not-allowed;
                }
                .producto-existente {
                    border-left: 4px solid #10b981;
                }
                .producto-nuevo {
                    border-left: 4px solid #f59e0b;
                }
                .estado-producto {
                    position: absolute;
                    top: -8px;
                    right: 8px;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 8px;
                    color: white;
                    font-weight: bold;
                }
                .estado-existente {
                    background-color: #10b981;
                }
                .estado-nuevo {
                    background-color: #f59e0b;
                }
                .pulse-success {
                    animation: pulse-success 1s ease-in-out;
                }
                .pulse-warning {
                    animation: pulse-warning 1s ease-in-out;
                }
                @keyframes pulse-success {
                    0% { border-color: #d1d5db; }
                    50% { border-color: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
                    100% { border-color: #d1d5db; }
                }
                @keyframes pulse-warning {
                    0% { border-color: #d1d5db; }
                    50% { border-color: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
                    100% { border-color: #d1d5db; }
                }
                .subproducto-row {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                    background-color: #fafafa;
                }
                .estado-existente-fila, .estado-nuevo-fila {
                    margin-left: auto;
                }
            `;
            
            document.head.appendChild(style);
            this.debug('Estilos CSS inyectados');
            
        } catch (error) {
            this.error('Error al inyectar estilos:', error);
        }
    }

    /**
     * Mostrar mensaje
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje
     */
    showMessage(message, type = 'info') {
        try {
            this.emit('message', { message, type });
            
            // Usar función global si está disponible
            if (typeof mostrarAlertaBurbuja !== 'undefined') {
                mostrarAlertaBurbuja(message, type);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        } catch (error) {
            this.warn('Error al mostrar mensaje:', error);
        }
    }

    /**
     * Obtener estado de la tabla
     * @returns {Object} Estado actual
     */
    getTableState() {
        return {
            hasPrimaryProduct: !!this.primaryProduct,
            primaryProduct: this.primaryProduct,
            subproductsCount: this.subproducts.length,
            subproducts: this.subproducts,
            rowCounter: this.rowCounter
        };
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            tableStats: {
                primaryProduct: !!this.primaryProduct,
                subproductsCount: this.subproducts.length,
                totalRows: this.rowCounter,
                configuration: this.config
            }
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            this.clearTable();
            this.elements = {};
            
            // Remover estilos
            const styles = document.getElementById('product-table-styles');
            if (styles) styles.remove();
            
            super.cleanup();
            this.debug('Recursos de ProductTableService limpiados');
            
        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const productTableService = new ProductTableService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        productTableService.initialize().catch(error => {
            console.warn('ProductTableService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        productTableService.initialize().catch(error => {
            console.warn('ProductTableService auto-inicialización falló:', error.message);
        });
    }
}

export default ProductTableService;
