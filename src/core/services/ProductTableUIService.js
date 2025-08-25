/**
 * ProductTableUIService - Servicio especializado para gestión de interfaz de tabla de productos
 * 
 * Este servicio maneja toda la funcionalidad de interfaz de usuario para la tabla de productos,
 * complementando al ProductTableService para crear una separación clara entre lógica y UI.
 * 
 * @class ProductTableUIService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';
import { productTableService } from './ProductTableService.js';

class ProductTableUIService extends BaseService {
    constructor() {
        super('ProductTableUIService');
        
        // Estado de la UI
        this.uiState = {
            isInitialized: false,
            activeModals: [],
            fieldValidators: new Map(),
            themeObserver: null
        };
        
        // Configuración de UI
        this.uiConfig = {
            animations: true,
            autoFocus: true,
            highlightRequired: true,
            showTooltips: true,
            responsiveMode: true
        };
        
        // Elementos de UI cacheados
        this.uiElements = {
            form: null,
            mainContainer: null,
            actionButtons: null,
            progressIndicators: null
        };
        
        this.debug('ProductTableUIService inicializado');
    }

    /**
     * Inicializar el servicio de UI
     */
    async initialize() {
        try {
            if (this.uiState.isInitialized) {
                this.debug('UI Service ya inicializado');
                return;
            }

            this.status = 'initializing';
            this.debug('Inicializando ProductTableUIService...');

            // Cachear elementos de UI
            this.cacheUIElements();
            
            // Configurar evento listeners específicos de UI
            this.setupUIEventListeners();
            
            // Configurar validadores de campos
            this.setupFieldValidators();
            
            // Aplicar mejoras de accesibilidad
            this.enhanceAccessibility();
            
            // Configurar modo responsivo
            this.setupResponsiveMode();
            
            // Configurar observador de tema
            this.setupThemeObserver();

            this.uiState.isInitialized = true;
            this.status = 'initialized';
            this.emit('uiInitialized');
            this.debug('ProductTableUIService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar ProductTableUIService:', error);
            throw error;
        }
    }

    /**
     * Cachear elementos específicos de UI
     */
    cacheUIElements() {
        try {
            this.uiElements.form = document.getElementById('form-tabla-productos');
            this.uiElements.mainContainer = document.getElementById('contenedor-tabla-productos');
            this.uiElements.actionButtons = document.querySelectorAll('.action-button');
            this.uiElements.progressIndicators = document.querySelectorAll('.progress-indicator');
            
            this.debug('Elementos de UI cacheados');
            
        } catch (error) {
            this.warn('Error al cachear elementos de UI:', error);
        }
    }

    /**
     * Configurar event listeners específicos de UI
     */
    setupUIEventListeners() {
        try {
            // Escuchar eventos del ProductTableService
            productTableService.on('primaryProductFound', (product) => {
                this.handlePrimaryProductFound(product);
            });
            
            productTableService.on('primaryProductNew', (product) => {
                this.handlePrimaryProductNew(product);
            });
            
            productTableService.on('subproductSearched', (data) => {
                this.handleSubproductSearched(data);
            });
            
            productTableService.on('tableSaved', (data) => {
                this.handleTableSaved(data);
            });
            
            productTableService.on('tableCleared', () => {
                this.handleTableCleared();
            });
            
            // Configurar tooltips
            this.setupTooltips();
            
            // Configurar validación en tiempo real
            this.setupRealTimeValidation();
            
            this.debug('Event listeners de UI configurados');
            
        } catch (error) {
            this.error('Error al configurar event listeners de UI:', error);
        }
    }

    /**
     * Manejar producto primario encontrado
     * @param {Object} product - Producto encontrado
     */
    handlePrimaryProductFound(product) {
        try {
            // Mostrar animación de éxito
            this.showSuccessAnimation('primary-product-found');
            
            // Mostrar información adicional
            this.showProductInfo(product, 'primary');
            
            // Actualizar estado de la UI
            this.updateUIState('primaryProductLoaded', true);
            
            // Mostrar notificación
            this.showNotification(`Producto encontrado: ${product.nombre}`, 'success');
            
        } catch (error) {
            this.error('Error al manejar producto primario encontrado:', error);
        }
    }

    /**
     * Manejar producto primario nuevo
     * @param {Object} product - Producto nuevo
     */
    handlePrimaryProductNew(product) {
        try {
            // Mostrar animación de advertencia
            this.showWarningAnimation('primary-product-new');
            
            // Resaltar campos requeridos
            this.highlightRequiredFields('primary');
            
            // Actualizar estado de la UI
            this.updateUIState('primaryProductNew', true);
            
            // Mostrar notificación
            this.showNotification(`Producto nuevo: ${product.codigo}. Complete los campos.`, 'info');
            
            // Auto-enfocar primer campo editable
            this.autoFocusFirstEditableField('primary');
            
        } catch (error) {
            this.error('Error al manejar producto primario nuevo:', error);
        }
    }

    /**
     * Manejar búsqueda de subproducto
     * @param {Object} data - Datos de la búsqueda
     */
    handleSubproductSearched(data) {
        try {
            const { rowNumber, subproduct, found } = data;
            
            if (found) {
                this.showSuccessAnimation(`subproduct-${rowNumber}`);
                this.showNotification(`Subproducto encontrado: ${subproduct.nombre}`, 'success');
            } else {
                this.showWarningAnimation(`subproduct-${rowNumber}`);
                this.highlightRequiredFields('subproduct', rowNumber);
                this.showNotification(`Subproducto nuevo: ${subproduct.codigo}. Complete los campos.`, 'info');
            }
            
            // Actualizar indicadores de progreso
            this.updateProgressIndicators();
            
        } catch (error) {
            this.error('Error al manejar búsqueda de subproducto:', error);
        }
    }

    /**
     * Manejar tabla guardada
     * @param {Object} data - Datos guardados
     */
    handleTableSaved(data) {
        try {
            // Mostrar animación de éxito global
            this.showSuccessAnimation('table-saved');
            
            // Actualizar estadísticas
            this.updateStatistics(data);
            
            // Limpiar estado de UI
            this.resetUIState();
            
            // Mostrar celebración
            this.showCelebration();
            
        } catch (error) {
            this.error('Error al manejar tabla guardada:', error);
        }
    }

    /**
     * Manejar tabla limpiada
     */
    handleTableCleared() {
        try {
            // Limpiar estado de UI
            this.resetUIState();
            
            // Remover todas las animaciones
            this.clearAllAnimations();
            
            // Limpiar validadores
            this.clearValidationState();
            
            // Enfocar campo inicial
            this.focusInitialField();
            
        } catch (error) {
            this.error('Error al manejar tabla limpiada:', error);
        }
    }

    /**
     * Mostrar información del producto
     * @param {Object} product - Producto
     * @param {string} type - Tipo (primary/subproduct)
     */
    showProductInfo(product, type) {
        try {
            // Crear tooltip con información adicional
            const info = `
                <div class="product-info-tooltip">
                    <h4>${product.nombre}</h4>
                    <p><strong>Categoría:</strong> ${product.categoria}</p>
                    <p><strong>Marca:</strong> ${product.marca}</p>
                    <p><strong>Unidad:</strong> ${product.unidad}</p>
                    ${product.precio ? `<p><strong>Precio:</strong> $${product.precio}</p>` : ''}
                </div>
            `;
            
            // Mostrar tooltip temporal
            this.showTemporaryTooltip(info, type);
            
        } catch (error) {
            this.warn('Error al mostrar información del producto:', error);
        }
    }

    /**
     * Mostrar animación de éxito
     * @param {string} context - Contexto de la animación
     */
    showSuccessAnimation(context) {
        try {
            if (!this.uiConfig.animations) return;
            
            const element = this.getContextElement(context);
            if (!element) return;
            
            element.classList.add('success-animation');
            setTimeout(() => {
                element.classList.remove('success-animation');
            }, 1000);
            
        } catch (error) {
            this.warn('Error al mostrar animación de éxito:', error);
        }
    }

    /**
     * Mostrar animación de advertencia
     * @param {string} context - Contexto de la animación
     */
    showWarningAnimation(context) {
        try {
            if (!this.uiConfig.animations) return;
            
            const element = this.getContextElement(context);
            if (!element) return;
            
            element.classList.add('warning-animation');
            setTimeout(() => {
                element.classList.remove('warning-animation');
            }, 1000);
            
        } catch (error) {
            this.warn('Error al mostrar animación de advertencia:', error);
        }
    }

    /**
     * Obtener elemento según contexto
     * @param {string} context - Contexto
     * @returns {HTMLElement|null} Elemento
     */
    getContextElement(context) {
        try {
            if (context === 'primary-product-found' || context === 'primary-product-new') {
                return document.getElementById('codigo-primario');
            }
            
            if (context.startsWith('subproduct-')) {
                const rowNumber = context.split('-')[1];
                return document.getElementById(`subproducto-codigo-${rowNumber}`);
            }
            
            if (context === 'table-saved') {
                return this.uiElements.mainContainer;
            }
            
            return null;
            
        } catch (error) {
            this.warn('Error al obtener elemento de contexto:', error);
            return null;
        }
    }

    /**
     * Resaltar campos requeridos
     * @param {string} type - Tipo (primary/subproduct)
     * @param {number} rowNumber - Número de fila (para subproductos)
     */
    highlightRequiredFields(type, rowNumber = null) {
        try {
            if (!this.uiConfig.highlightRequired) return;
            
            const fields = ['nombre', 'categoria', 'marca', 'unidad'];
            
            fields.forEach(field => {
                let input;
                if (type === 'primary') {
                    input = document.getElementById(`primario-${field}`);
                } else if (type === 'subproduct' && rowNumber) {
                    input = document.getElementById(`subproducto-${field}-${rowNumber}`);
                }
                
                if (input && !input.readOnly) {
                    input.classList.add('required-highlight');
                    setTimeout(() => {
                        input.classList.remove('required-highlight');
                    }, 3000);
                }
            });
            
        } catch (error) {
            this.warn('Error al resaltar campos requeridos:', error);
        }
    }

    /**
     * Auto-enfocar primer campo editable
     * @param {string} type - Tipo (primary/subproduct)
     * @param {number} rowNumber - Número de fila (para subproductos)
     */
    autoFocusFirstEditableField(type, rowNumber = null) {
        try {
            if (!this.uiConfig.autoFocus) return;
            
            const fields = ['nombre', 'categoria', 'marca', 'unidad'];
            
            for (const field of fields) {
                let input;
                if (type === 'primary') {
                    input = document.getElementById(`primario-${field}`);
                } else if (type === 'subproduct' && rowNumber) {
                    input = document.getElementById(`subproducto-${field}-${rowNumber}`);
                }
                
                if (input && !input.readOnly) {
                    setTimeout(() => {
                        input.focus();
                        input.select();
                    }, 300);
                    break;
                }
            }
            
        } catch (error) {
            this.warn('Error al enfocar primer campo editable:', error);
        }
    }

    /**
     * Configurar validadores de campos
     */
    setupFieldValidators() {
        try {
            // Validador de nombre
            this.uiState.fieldValidators.set('nombre', (value) => {
                return value.trim().length >= 2;
            });
            
            // Validador de categoría
            this.uiState.fieldValidators.set('categoria', (value) => {
                return value.trim().length >= 2;
            });
            
            // Validador de marca
            this.uiState.fieldValidators.set('marca', (value) => {
                return value.trim().length >= 1;
            });
            
            // Validador de unidad
            this.uiState.fieldValidators.set('unidad', (value) => {
                return value.trim().length >= 1;
            });
            
            this.debug('Validadores de campos configurados');
            
        } catch (error) {
            this.error('Error al configurar validadores:', error);
        }
    }

    /**
     * Configurar validación en tiempo real
     */
    setupRealTimeValidation() {
        try {
            // Validación para campos primarios
            ['nombre', 'categoria', 'marca', 'unidad'].forEach(field => {
                const input = document.getElementById(`primario-${field}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        this.validateFieldRealTime(e.target, field);
                    });
                }
            });
            
            this.debug('Validación en tiempo real configurada');
            
        } catch (error) {
            this.error('Error al configurar validación en tiempo real:', error);
        }
    }

    /**
     * Validar campo en tiempo real
     * @param {HTMLElement} input - Campo de input
     * @param {string} fieldType - Tipo de campo
     */
    validateFieldRealTime(input, fieldType) {
        try {
            if (!input || input.readOnly) return;
            
            const validator = this.uiState.fieldValidators.get(fieldType);
            if (!validator) return;
            
            const isValid = validator(input.value);
            
            // Remover clases previas
            input.classList.remove('field-valid', 'field-invalid');
            
            // Agregar clase según validación
            if (input.value.trim()) {
                input.classList.add(isValid ? 'field-valid' : 'field-invalid');
            }
            
            // Mostrar/ocultar mensaje de error
            this.showFieldError(input, fieldType, !isValid && input.value.trim());
            
        } catch (error) {
            this.warn('Error en validación en tiempo real:', error);
        }
    }

    /**
     * Mostrar error de campo
     * @param {HTMLElement} input - Campo de input
     * @param {string} fieldType - Tipo de campo
     * @param {boolean} show - Si mostrar el error
     */
    showFieldError(input, fieldType, show) {
        try {
            const existingError = input.parentElement.querySelector('.field-error');
            
            if (existingError) {
                existingError.remove();
            }
            
            if (show) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.textContent = this.getFieldErrorMessage(fieldType);
                
                input.parentElement.appendChild(errorDiv);
            }
            
        } catch (error) {
            this.warn('Error al mostrar error de campo:', error);
        }
    }

    /**
     * Obtener mensaje de error para campo
     * @param {string} fieldType - Tipo de campo
     * @returns {string} Mensaje de error
     */
    getFieldErrorMessage(fieldType) {
        const messages = {
            nombre: 'El nombre debe tener al menos 2 caracteres',
            categoria: 'La categoría debe tener al menos 2 caracteres',
            marca: 'La marca es requerida',
            unidad: 'La unidad es requerida'
        };
        
        return messages[fieldType] || 'Campo inválido';
    }

    /**
     * Configurar tooltips
     */
    setupTooltips() {
        try {
            if (!this.uiConfig.showTooltips) return;
            
            // Tooltips para botones
            this.addTooltip('agregar-fila-btn', 'Agregar nueva fila de subproducto');
            this.addTooltip('limpiar-tabla-btn', 'Limpiar toda la tabla');
            this.addTooltip('guardar-tabla-btn', 'Guardar tabla de productos');
            
            // Tooltips para campos
            this.addTooltip('codigo-primario', 'Ingrese el código del producto primario. Use guión (-) para representar ceros.');
            
            this.debug('Tooltips configurados');
            
        } catch (error) {
            this.error('Error al configurar tooltips:', error);
        }
    }

    /**
     * Agregar tooltip a elemento
     * @param {string} elementId - ID del elemento
     * @param {string} text - Texto del tooltip
     */
    addTooltip(elementId, text) {
        try {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            element.setAttribute('title', text);
            element.setAttribute('data-tooltip', text);
            
        } catch (error) {
            this.warn('Error al agregar tooltip:', error);
        }
    }

    /**
     * Mostrar tooltip temporal
     * @param {string} content - Contenido HTML
     * @param {string} context - Contexto
     */
    showTemporaryTooltip(content, context) {
        try {
            const tooltip = document.createElement('div');
            tooltip.className = 'temporary-tooltip';
            tooltip.innerHTML = content;
            
            const targetElement = this.getContextElement(context);
            if (!targetElement) return;
            
            // Posicionar tooltip
            const rect = targetElement.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.zIndex = '9999';
            
            document.body.appendChild(tooltip);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 3000);
            
        } catch (error) {
            this.warn('Error al mostrar tooltip temporal:', error);
        }
    }

    /**
     * Configurar modo responsivo
     */
    setupResponsiveMode() {
        try {
            if (!this.uiConfig.responsiveMode) return;
            
            // Observador de cambios de viewport
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    this.handleViewportChange(entry.contentRect);
                }
            });
            
            if (this.uiElements.mainContainer) {
                resizeObserver.observe(this.uiElements.mainContainer);
            }
            
            this.debug('Modo responsivo configurado');
            
        } catch (error) {
            this.warn('Error al configurar modo responsivo:', error);
        }
    }

    /**
     * Manejar cambio de viewport
     * @param {Object} rect - Dimensiones del viewport
     */
    handleViewportChange(rect) {
        try {
            const isMobile = rect.width < 768;
            
            // Aplicar clases CSS responsivas
            if (this.uiElements.mainContainer) {
                this.uiElements.mainContainer.classList.toggle('mobile-mode', isMobile);
                this.uiElements.mainContainer.classList.toggle('desktop-mode', !isMobile);
            }
            
            // Ajustar formularios
            this.adjustFormsForViewport(isMobile);
            
        } catch (error) {
            this.warn('Error al manejar cambio de viewport:', error);
        }
    }

    /**
     * Ajustar formularios para viewport
     * @param {boolean} isMobile - Si es vista móvil
     */
    adjustFormsForViewport(isMobile) {
        try {
            const forms = document.querySelectorAll('.subproducto-row');
            
            forms.forEach(form => {
                if (isMobile) {
                    form.classList.add('mobile-form');
                    form.classList.remove('desktop-form');
                } else {
                    form.classList.remove('mobile-form');
                    form.classList.add('desktop-form');
                }
            });
            
        } catch (error) {
            this.warn('Error al ajustar formularios:', error);
        }
    }

    /**
     * Configurar observador de tema
     */
    setupThemeObserver() {
        try {
            // Observar cambios en el atributo data-theme
            this.uiState.themeObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                        this.handleThemeChange(mutation.target.getAttribute('data-theme'));
                    }
                });
            });
            
            this.uiState.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
            
            this.debug('Observador de tema configurado');
            
        } catch (error) {
            this.warn('Error al configurar observador de tema:', error);
        }
    }

    /**
     * Manejar cambio de tema
     * @param {string} theme - Nuevo tema
     */
    handleThemeChange(theme) {
        try {
            // Actualizar estilos específicos de tema
            if (this.uiElements.mainContainer) {
                this.uiElements.mainContainer.setAttribute('data-theme', theme);
            }
            
            // Notificar cambio
            this.emit('themeChanged', theme);
            
        } catch (error) {
            this.warn('Error al manejar cambio de tema:', error);
        }
    }

    /**
     * Mejorar accesibilidad
     */
    enhanceAccessibility() {
        try {
            // Agregar roles ARIA
            if (this.uiElements.mainContainer) {
                this.uiElements.mainContainer.setAttribute('role', 'form');
                this.uiElements.mainContainer.setAttribute('aria-label', 'Formulario de tabla de productos');
            }
            
            // Agregar etiquetas aria-describedby
            this.addAriaDescriptions();
            
            // Configurar navegación por teclado
            this.setupKeyboardNavigation();
            
            this.debug('Accesibilidad mejorada');
            
        } catch (error) {
            this.error('Error al mejorar accesibilidad:', error);
        }
    }

    /**
     * Agregar descripciones ARIA
     */
    addAriaDescriptions() {
        try {
            const descriptions = {
                'codigo-primario': 'Código del producto principal. Use guión para representar ceros.',
                'primario-nombre': 'Nombre del producto principal',
                'primario-categoria': 'Categoría del producto principal',
                'primario-marca': 'Marca del producto principal',
                'primario-unidad': 'Unidad de medida del producto principal'
            };
            
            Object.entries(descriptions).forEach(([id, description]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.setAttribute('aria-description', description);
                }
            });
            
        } catch (error) {
            this.warn('Error al agregar descripciones ARIA:', error);
        }
    }

    /**
     * Configurar navegación por teclado
     */
    setupKeyboardNavigation() {
        try {
            // Configurar orden de tabulación
            this.configureTabOrder();
            
            // Configurar atajos de teclado
            this.setupKeyboardShortcuts();
            
        } catch (error) {
            this.error('Error al configurar navegación por teclado:', error);
        }
    }

    /**
     * Configurar orden de tabulación
     */
    configureTabOrder() {
        try {
            const elements = [
                'codigo-primario',
                'primario-nombre',
                'primario-categoria', 
                'primario-marca',
                'primario-unidad',
                'agregar-fila-btn',
                'limpiar-tabla-btn',
                'guardar-tabla-btn'
            ];
            
            elements.forEach((id, index) => {
                const element = document.getElementById(id);
                if (element) {
                    element.setAttribute('tabindex', index + 1);
                }
            });
            
        } catch (error) {
            this.warn('Error al configurar orden de tabulación:', error);
        }
    }

    /**
     * Configurar atajos de teclado
     */
    setupKeyboardShortcuts() {
        try {
            document.addEventListener('keydown', (e) => {
                // Ctrl+Shift+A: Agregar fila
                if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                    e.preventDefault();
                    productTableService.addSubproductRow();
                }
                
                // Ctrl+Shift+C: Limpiar tabla
                if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    productTableService.clearTable();
                }
                
                // Ctrl+Shift+S: Guardar tabla
                if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                    e.preventDefault();
                    productTableService.saveTable();
                }
            });
            
        } catch (error) {
            this.warn('Error al configurar atajos de teclado:', error);
        }
    }

    /**
     * Actualizar indicadores de progreso
     */
    updateProgressIndicators() {
        try {
            const state = productTableService.getTableState();
            
            // Actualizar indicador de producto primario
            const primaryIndicator = document.getElementById('primary-progress');
            if (primaryIndicator) {
                primaryIndicator.classList.toggle('completed', state.hasPrimaryProduct);
            }
            
            // Actualizar indicador de subproductos
            const subproductsIndicator = document.getElementById('subproducts-progress');
            if (subproductsIndicator) {
                subproductsIndicator.textContent = `${state.subproductsCount} subproductos`;
                subproductsIndicator.classList.toggle('has-items', state.subproductsCount > 0);
            }
            
        } catch (error) {
            this.warn('Error al actualizar indicadores de progreso:', error);
        }
    }

    /**
     * Actualizar estadísticas
     * @param {Object} data - Datos de la tabla guardada
     */
    updateStatistics(data) {
        try {
            const stats = {
                productosGuardados: 1 + data.subproductsData.length,
                productosNuevos: (data.primaryData.esNuevo ? 1 : 0) + 
                                data.subproductsData.filter(s => s.esNuevo).length,
                relacionesCreadas: data.subproductsData.length
            };
            
            // Emitir estadísticas
            this.emit('statisticsUpdated', stats);
            
        } catch (error) {
            this.warn('Error al actualizar estadísticas:', error);
        }
    }

    /**
     * Mostrar celebración
     */
    showCelebration() {
        try {
            if (!this.uiConfig.animations) return;
            
            // Crear confeti o animación de celebración
            const celebration = document.createElement('div');
            celebration.className = 'celebration-animation';
            celebration.innerHTML = '🎉 ¡Tabla guardada exitosamente! 🎉';
            
            if (this.uiElements.mainContainer) {
                this.uiElements.mainContainer.appendChild(celebration);
                
                setTimeout(() => {
                    if (celebration.parentNode) {
                        celebration.parentNode.removeChild(celebration);
                    }
                }, 3000);
            }
            
        } catch (error) {
            this.warn('Error al mostrar celebración:', error);
        }
    }

    /**
     * Mostrar notificación
     * @param {string} message - Mensaje
     * @param {string} type - Tipo de notificación
     */
    showNotification(message, type = 'info') {
        try {
            this.emit('notification', { message, type });
            
            // Usar sistema de notificaciones global si está disponible
            if (typeof mostrarAlertaBurbuja !== 'undefined') {
                mostrarAlertaBurbuja(message, type);
            }
            
        } catch (error) {
            this.warn('Error al mostrar notificación:', error);
        }
    }

    /**
     * Enfocar campo inicial
     */
    focusInitialField() {
        try {
            const primaryCodeInput = document.getElementById('codigo-primario');
            if (primaryCodeInput) {
                setTimeout(() => {
                    primaryCodeInput.focus();
                }, 100);
            }
            
        } catch (error) {
            this.warn('Error al enfocar campo inicial:', error);
        }
    }

    /**
     * Actualizar estado de UI
     * @param {string} key - Clave del estado
     * @param {*} value - Valor
     */
    updateUIState(key, value) {
        try {
            this.uiState[key] = value;
            this.emit('uiStateChanged', { key, value });
            
        } catch (error) {
            this.warn('Error al actualizar estado de UI:', error);
        }
    }

    /**
     * Resetear estado de UI
     */
    resetUIState() {
        try {
            this.uiState.primaryProductLoaded = false;
            this.uiState.primaryProductNew = false;
            
            // Limpiar animaciones
            this.clearAllAnimations();
            
            // Limpiar validaciones
            this.clearValidationState();
            
            this.emit('uiStateReset');
            
        } catch (error) {
            this.warn('Error al resetear estado de UI:', error);
        }
    }

    /**
     * Limpiar todas las animaciones
     */
    clearAllAnimations() {
        try {
            const animatedElements = document.querySelectorAll('.success-animation, .warning-animation');
            animatedElements.forEach(element => {
                element.classList.remove('success-animation', 'warning-animation');
            });
            
        } catch (error) {
            this.warn('Error al limpiar animaciones:', error);
        }
    }

    /**
     * Limpiar estado de validación
     */
    clearValidationState() {
        try {
            const validatedElements = document.querySelectorAll('.field-valid, .field-invalid, .required-highlight');
            validatedElements.forEach(element => {
                element.classList.remove('field-valid', 'field-invalid', 'required-highlight');
            });
            
            // Remover mensajes de error
            const errorMessages = document.querySelectorAll('.field-error');
            errorMessages.forEach(error => error.remove());
            
        } catch (error) {
            this.warn('Error al limpiar estado de validación:', error);
        }
    }

    /**
     * Obtener estadísticas del servicio de UI
     */
    getUIStats() {
        return {
            ...super.getStats(),
            uiStats: {
                isInitialized: this.uiState.isInitialized,
                activeModals: this.uiState.activeModals.length,
                validatorsCount: this.uiState.fieldValidators.size,
                configuration: this.uiConfig
            }
        };
    }

    /**
     * Limpiar recursos del servicio de UI
     */
    cleanup() {
        try {
            // Desconectar observador de tema
            if (this.uiState.themeObserver) {
                this.uiState.themeObserver.disconnect();
            }
            
            // Limpiar validadores
            this.uiState.fieldValidators.clear();
            
            // Limpiar elementos cacheados
            this.uiElements = {};
            
            // Limpiar estado
            this.uiState.isInitialized = false;
            this.uiState.activeModals = [];
            
            super.cleanup();
            this.debug('Recursos de ProductTableUIService limpiados');
            
        } catch (error) {
            this.error('Error al limpiar recursos de UI:', error);
        }
    }
}

// Crear instancia singleton
export const productTableUIService = new ProductTableUIService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        productTableUIService.initialize().catch(error => {
            console.warn('ProductTableUIService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        productTableUIService.initialize().catch(error => {
            console.warn('ProductTableUIService auto-inicialización falló:', error.message);
        });
    }
}

export default ProductTableUIService;
