/**
 * BaseService - Clase base abstracta para todos los servicios
 * 
 * Proporciona funcionalidad común para servicios:
 * - Inyección de dependencias
 * - Manejo de errores estándar
 * - Logging integrado
 * - Validaciones comunes
 * - Sistema de eventos
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

// NO importar logs.js para evitar dependencias circulares
// Los servicios pueden usar console o window.Swal directamente si es necesario

export class BaseService {
    /**
     * Constructor del servicio base
     * @param {string} serviceName - Nombre del servicio
     */
    constructor(serviceName) {
        if (new.target === BaseService) {
            throw new Error("BaseService es una clase abstracta y no puede ser instanciada directamente");
        }
        
        this.serviceName = serviceName;
        this.repositories = {};
        this.eventListeners = new Map();
        this.isInitialized = false;
    }

    /**
     * Helper para mostrar mensajes UI (reemplaza mostrarMensaje de logs.js)
     * @param {string} mensaje - Mensaje a mostrar
     * @param {string} tipo - Tipo de alerta ('success', 'error', 'info', 'warning')
     */
    showMessage(mensaje, tipo = 'info') {
        if (window.Swal) {
            window.Swal.fire({
                icon: tipo,
                title: tipo === 'success' ? 'Éxito' : tipo === 'error' ? 'Error' : 'Información',
                text: mensaje,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        }
    }

    /**
     * Helper para mostrar alertas toast (reemplaza mostrarAlertaBurbuja de logs.js)
     * @param {string} mensaje - Mensaje a mostrar
     * @param {string} tipo - Tipo de alerta
     */
    showToast(mensaje, tipo = 'info') {
        if (window.Swal) {
            window.Swal.fire({
                icon: tipo,
                text: mensaje,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            console.log(`[TOAST ${tipo.toUpperCase()}] ${mensaje}`);
        }
    }

    /**
     * Inicializar el servicio
     * @abstract
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error("initialize() debe ser implementado por la clase hija");
    }

    /**
     * Inyectar repositorio
     * @param {string} name - Nombre del repositorio
     * @param {Object} repository - Instancia del repositorio
     */
    injectRepository(name, repository) {
        this.repositories[name] = repository;
        this.log(`Repository ${name} injected`);
    }

    /**
     * Obtener repositorio inyectado
     * @param {string} name - Nombre del repositorio
     * @returns {Object} Repositorio
     */
    getRepository(name) {
        if (!this.repositories[name]) {
            throw new Error(`Repository ${name} no está disponible en ${this.serviceName}`);
        }
        return this.repositories[name];
    }

    /**
     * Validar que el servicio esté inicializado
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error(`${this.serviceName} no ha sido inicializado. Llame a initialize() primero.`);
        }
    }

    /**
     * Validar datos de entrada
     * @param {Object} data - Datos a validar
     * @param {Object} schema - Esquema de validación
     * @returns {Object} Resultado de validación
     */
    validateInput(data, schema) {
        const errors = [];
        
        // Validar campos requeridos
        if (schema.required) {
            for (const field of schema.required) {
                if (!data[field] && data[field] !== 0) {
                    errors.push(`Campo requerido: ${field}`);
                }
            }
        }
        
        // Validar tipos
        if (schema.types) {
            for (const [field, expectedType] of Object.entries(schema.types)) {
                if (data[field] !== undefined && typeof data[field] !== expectedType) {
                    errors.push(`${field} debe ser de tipo ${expectedType}`);
                }
            }
        }
        
        // Validar rangos numéricos
        if (schema.ranges) {
            for (const [field, range] of Object.entries(schema.ranges)) {
                const value = parseFloat(data[field]);
                if (!isNaN(value)) {
                    if (range.min !== undefined && value < range.min) {
                        errors.push(`${field} debe ser mayor o igual a ${range.min}`);
                    }
                    if (range.max !== undefined && value > range.max) {
                        errors.push(`${field} debe ser menor o igual a ${range.max}`);
                    }
                }
            }
        }
        
        // Validar longitudes de string
        if (schema.lengths) {
            for (const [field, length] of Object.entries(schema.lengths)) {
                const value = data[field];
                if (typeof value === 'string') {
                    if (length.min !== undefined && value.length < length.min) {
                        errors.push(`${field} debe tener al menos ${length.min} caracteres`);
                    }
                    if (length.max !== undefined && value.length > length.max) {
                        errors.push(`${field} debe tener máximo ${length.max} caracteres`);
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Ejecutar operación con manejo de errores
     * @param {Function} operation - Operación a ejecutar
     * @param {string} operationName - Nombre de la operación
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<any>} Resultado de la operación
     */
    async executeOperation(operation, operationName, options = {}) {
        const startTime = Date.now();
        this.log(`Iniciando operación: ${operationName}`);
        
        try {
            // Validar prerequisitos si están definidos
            if (options.requiresInitialization !== false) {
                this.ensureInitialized();
            }
            
            if (options.requiresOnline && !navigator.onLine) {
                throw new Error('Esta operación requiere conexión a internet');
            }
            
            // Ejecutar operación
            const result = await operation();
            
            const duration = Date.now() - startTime;
            this.log(`Operación ${operationName} completada en ${duration}ms`);
            
            // Mostrar mensaje de éxito si está configurado
            if (options.successMessage && window.Swal) {
                window.Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: options.successMessage,
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            
            // Emitir evento de éxito
            this.emit('operationSuccess', {
                operation: operationName,
                result,
                duration
            });
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.handleError(error, operationName, duration);
            
            // Mostrar mensaje de error si está configurado
            if (options.showErrorAlert !== false && window.Swal) {
                window.Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Error en ${operationName}: ${error.message}`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
            
            // Emitir evento de error
            this.emit('operationError', {
                operation: operationName,
                error: error.message,
                duration
            });
            
            throw error;
        }
    }

    /**
     * Manejar errores de manera consistente
     * @param {Error} error - Error ocurrido
     * @param {string} operation - Operación que falló
     * @param {number} duration - Duración de la operación
     */
    handleError(error, operation, duration) {
        const errorInfo = {
            service: this.serviceName,
            operation,
            error: error?.message || String(error),
            stack: error?.stack,
            duration,
            timestamp: new Date().toISOString()
        };
        
        // Log del error
        console.error(`[${this.serviceName}] Error en ${operation}:`, errorInfo);
        
        // Obtener mensaje de error de forma segura
        const errorMessage = error?.message || String(error);
        
        // Clasificar tipo de error
        if (error?.name === 'ValidationError') {
            this.log(`Error de validación en ${operation}: ${errorMessage}`);
        } else if (errorMessage.includes?.('conexión') || errorMessage.includes?.('network')) {
            this.log(`Error de conexión en ${operation}: ${errorMessage}`);
        } else if (errorMessage.includes?.('autenticación') || errorMessage.includes?.('authorization')) {
            this.log(`Error de autenticación en ${operation}: ${errorMessage}`);
        } else {
            this.log(`Error no clasificado en ${operation}: ${errorMessage}`);
        }
    }

    /**
     * Sistema de logging
     * @param {string} message - Mensaje a loguear
     * @param {string} level - Nivel de log (info, warn, error)
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${this.serviceName}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }

    /**
     * Log de debug (más detallado que log normal)
     * @param {string} message - Mensaje a logear
     * @param {Object} data - Datos adicionales opcionales
     */
    debug(message, data = null) {
        if (localStorage.getItem('debug') === 'true') {
            const debugMessage = `[DEBUG ${this.serviceName}] ${message}`;
            if (data) {
                console.log(debugMessage, data);
            } else {
                console.log(debugMessage);
            }
        }
    }

    /**
     * Log de errores
     * @param {string} message - Mensaje de error
     * @param {Error|Object} error - Error opcional
     */
    error(message, error = null) {
        const errorMessage = `[ERROR ${this.serviceName}] ${message}`;
        if (error) {
            console.error(errorMessage, error);
        } else {
            console.error(errorMessage);
        }
    }

    /**
     * Log de advertencias
     * @param {string} message - Mensaje de advertencia
     * @param {Object} data - Datos adicionales opcionales
     */
    warn(message, data = null) {
        const warnMessage = `[WARN ${this.serviceName}] ${message}`;
        if (data) {
            console.warn(warnMessage, data);
        } else {
            console.warn(warnMessage);
        }
    }

    /**
     * Sistema de eventos simple
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * Remover listener de evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback a remover
     */
    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emitir evento
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos del evento
     */
    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en listener de evento ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Obtener métricas del servicio
     * @returns {Object} Métricas
     */
    getMetrics() {
        return {
            serviceName: this.serviceName,
            isInitialized: this.isInitialized,
            repositoriesCount: Object.keys(this.repositories).length,
            eventListenersCount: this.eventListeners.size,
            uptime: Date.now() - this.startTime
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    dispose() {
        this.eventListeners.clear();
        this.repositories = {};
        this.isInitialized = false;
        this.log('Service disposed');
    }

    // ========================================
    // MÉTODOS DE UTILIDAD COMUNES
    // ========================================

    /**
     * Obtener ID del usuario actual
     * @returns {string|null} ID del usuario
     */
    getCurrentUserId() {
        return localStorage.getItem('usuario_id');
    }

    /**
     * Obtener ID del área actual
     * @returns {string|null} ID del área
     */
    getCurrentAreaId() {
        return localStorage.getItem('area_id');
    }

    /**
     * Obtener ID de categoría actual
     * @returns {string|null} ID de categoría
     */
    getCurrentCategoryId() {
        return localStorage.getItem('categoria_id');
    }

    /**
     * Verificar si el usuario está autenticado
     * @returns {boolean} true si está autenticado
     */
    isAuthenticated() {
        const userId = this.getCurrentUserId();
        const token = localStorage.getItem('supabase.auth.token');
        return !!(userId && token);
    }

    /**
     * Verificar si hay conexión a internet
     * @returns {boolean} true si hay conexión
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Esperar a que haya conexión
     * @param {number} timeout - Timeout en ms
     * @returns {Promise<boolean>} true si se conecta
     */
    waitForConnection(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.isOnline()) {
                resolve(true);
                return;
            }

            const timeoutId = setTimeout(() => {
                window.removeEventListener('online', onlineHandler);
                reject(new Error('Timeout esperando conexión'));
            }, timeout);

            const onlineHandler = () => {
                clearTimeout(timeoutId);
                window.removeEventListener('online', onlineHandler);
                resolve(true);
            };

            window.addEventListener('online', onlineHandler);
        });
    }

    /**
     * Formatear fecha para mostrar
     * @param {string|Date} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Formatear número como moneda
     * @param {number} amount - Cantidad
     * @param {string} currency - Código de moneda
     * @returns {string} Cantidad formateada
     */
    formatCurrency(amount, currency = 'USD') {
        if (typeof amount !== 'number') return '$0.00';
        
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Generar ID único
     * @returns {string} ID único
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debounce para limitar frecuencia de ejecución
     * @param {Function} func - Función a ejecutar
     * @param {number} delay - Delay en ms
     * @returns {Function} Función debounced
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle para limitar frecuencia de ejecución
     * @param {Function} func - Función a ejecutar
     * @param {number} delay - Delay en ms
     * @returns {Function} Función throttled
     */
    throttle(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
}
