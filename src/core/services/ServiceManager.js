/**
 * ServiceManager - Gestor centralizado de servicios
 * 
 * Responsabilidades:
 * - Inicialización y configuración de servicios
 * - Inyección de dependencias entre servicios
 * - Gestión del ciclo de vida de servicios
 * - Comunicación entre servicios
 * - Manejo de errores globales
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseService } from './BaseService.js';
import { InventoryService } from './InventoryService.js';
import { ProductService } from './ProductService.js';
import { ScannerService } from './ScannerService.js';

export class ServiceManager {
    constructor() {
        this.services = new Map();
        this.repositories = new Map();
        this.isInitialized = false;
        this.initializationOrder = [
            'product',
            'inventory', 
            'scanner'
        ];
        this.eventBus = new Map();
    }

    /**
     * Inicializar el gestor de servicios
     * @param {Object} repositories - Repositorios a inyectar
     * @returns {Promise<void>}
     */
    async initialize(repositories = {}) {
        if (this.isInitialized) {
            throw new Error('ServiceManager ya está inicializado');
        }

        console.log('[ServiceManager] Iniciando inicialización de servicios...');

        try {
            // Registrar repositorios
            this.registerRepositories(repositories);

            // Crear instancias de servicios
            this.createServiceInstances();

            // Inyectar dependencias
            this.injectDependencies();

            // Inicializar servicios en orden
            await this.initializeServices();

            // Configurar comunicación entre servicios
            this.setupServiceCommunication();

            this.isInitialized = true;
            console.log('[ServiceManager] Servicios inicializados correctamente');

        } catch (error) {
            console.error('[ServiceManager] Error durante inicialización:', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Registrar repositorios disponibles
     * @param {Object} repositories - Repositorios a registrar
     */
    registerRepositories(repositories) {
        for (const [name, repository] of Object.entries(repositories)) {
            this.repositories.set(name, repository);
            console.log(`[ServiceManager] Repository ${name} registrado`);
        }
    }

    /**
     * Crear instancias de todos los servicios
     */
    createServiceInstances() {
        // Crear servicios principales
        this.services.set('product', new ProductService());
        this.services.set('inventory', new InventoryService());
        this.services.set('scanner', new ScannerService());

        console.log(`[ServiceManager] ${this.services.size} servicios creados`);
    }

    /**
     * Inyectar dependencias en servicios
     */
    injectDependencies() {
        for (const [serviceName, service] of this.services) {
            // Inyectar repositorios
            for (const [repoName, repository] of this.repositories) {
                service.injectRepository(repoName, repository);
            }

            // Inyectar referencia al ServiceManager para comunicación entre servicios
            service.serviceManager = this;

            console.log(`[ServiceManager] Dependencias inyectadas en ${serviceName}`);
        }
    }

    /**
     * Inicializar servicios en orden específico
     */
    async initializeServices() {
        for (const serviceName of this.initializationOrder) {
            const service = this.services.get(serviceName);
            if (service) {
                try {
                    await service.initialize();
                    console.log(`[ServiceManager] ${serviceName} inicializado`);
                } catch (error) {
                    console.error(`[ServiceManager] Error inicializando ${serviceName}:`, error);
                    throw new Error(`Fallo inicializando servicio ${serviceName}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Configurar comunicación entre servicios
     */
    setupServiceCommunication() {
        // Configurar eventos entre servicios
        const inventoryService = this.getService('inventory');
        const productService = this.getService('product');
        const scannerService = this.getService('scanner');

        // Inventory -> Product: Alertas de conteo bajo
        inventoryService.on('countAlert', (data) => {
            this.emit('global.countAlert', data);
        });

        // Scanner -> Product: Búsqueda por código escaneado
        scannerService.on('scanSuccess', async (result) => {
            if (result.validation?.isValid) {
                try {
                    const product = await productService.findByBarcode(result.raw_data);
                    if (product) {
                        this.emit('global.productScanned', {
                            scanResult: result,
                            product: product
                        });
                    } else {
                        this.emit('global.unknownCodeScanned', {
                            scanResult: result
                        });
                    }
                } catch (error) {
                    console.error('[ServiceManager] Error procesando código escaneado:', error);
                }
            }
        });

        // Product -> Inventory: Cambios de productos
        productService.on('productUpdated', (data) => {
            this.emit('global.productChanged', data);
        });

        productService.on('productDeleted', (data) => {
            this.emit('global.productDeleted', data);
        });

        console.log('[ServiceManager] Comunicación entre servicios configurada');
    }

    // ========================================
    // MÉTODOS PÚBLICOS DE ACCESO
    // ========================================

    /**
     * Obtener servicio por nombre
     * @param {string} serviceName - Nombre del servicio
     * @returns {BaseService} Instancia del servicio
     */
    getService(serviceName) {
        if (!this.isInitialized) {
            throw new Error('ServiceManager no está inicializado');
        }

        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Servicio ${serviceName} no encontrado`);
        }

        return service;
    }

    /**
     * Verificar si un servicio está disponible
     * @param {string} serviceName - Nombre del servicio
     * @returns {boolean} true si está disponible
     */
    hasService(serviceName) {
        return this.services.has(serviceName) && this.isInitialized;
    }

    /**
     * Obtener lista de servicios disponibles
     * @returns {Array<string>} Nombres de servicios
     */
    getAvailableServices() {
        return Array.from(this.services.keys());
    }

    /**
     * Obtener métricas de todos los servicios
     * @returns {Object} Métricas agrupadas
     */
    getAllMetrics() {
        const metrics = {
            serviceManager: {
                isInitialized: this.isInitialized,
                servicesCount: this.services.size,
                repositoriesCount: this.repositories.size
            },
            services: {}
        };

        for (const [name, service] of this.services) {
            try {
                metrics.services[name] = service.getMetrics();
            } catch (error) {
                metrics.services[name] = { error: error.message };
            }
        }

        return metrics;
    }

    // ========================================
    // SISTEMA DE EVENTOS GLOBAL
    // ========================================

    /**
     * Suscribirse a evento global
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    on(eventName, callback) {
        if (!this.eventBus.has(eventName)) {
            this.eventBus.set(eventName, []);
        }
        this.eventBus.get(eventName).push(callback);
    }

    /**
     * Desuscribirse de evento global
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    off(eventName, callback) {
        if (this.eventBus.has(eventName)) {
            const listeners = this.eventBus.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emitir evento global
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos del evento
     */
    emit(eventName, data) {
        if (this.eventBus.has(eventName)) {
            const listeners = this.eventBus.get(eventName);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[ServiceManager] Error en listener de evento ${eventName}:`, error);
                }
            });
        }
    }

    // ========================================
    // MÉTODOS DE UTILIDAD
    // ========================================

    /**
     * Ejecutar operación en múltiples servicios
     * @param {Array<string>} serviceNames - Nombres de servicios
     * @param {string} operation - Nombre de la operación
     * @param {Array} args - Argumentos para la operación
     * @returns {Promise<Array>} Resultados de cada servicio
     */
    async executeOnServices(serviceNames, operation, ...args) {
        const results = [];

        for (const serviceName of serviceNames) {
            try {
                const service = this.getService(serviceName);
                if (typeof service[operation] === 'function') {
                    const result = await service[operation](...args);
                    results.push({ service: serviceName, result, success: true });
                } else {
                    results.push({ 
                        service: serviceName, 
                        error: `Operación ${operation} no encontrada`,
                        success: false 
                    });
                }
            } catch (error) {
                results.push({ 
                    service: serviceName, 
                    error: error.message,
                    success: false 
                });
            }
        }

        return results;
    }

    /**
     * Reinicializar servicio específico
     * @param {string} serviceName - Nombre del servicio
     * @returns {Promise<void>}
     */
    async reinitializeService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Servicio ${serviceName} no encontrado`);
        }

        console.log(`[ServiceManager] Reinicializando ${serviceName}...`);

        try {
            // Limpiar servicio actual
            if (typeof service.dispose === 'function') {
                service.dispose();
            }

            // Reinicializar
            await service.initialize();

            console.log(`[ServiceManager] ${serviceName} reinicializado correctamente`);

        } catch (error) {
            console.error(`[ServiceManager] Error reinicializando ${serviceName}:`, error);
            throw error;
        }
    }

    /**
     * Verificar estado de salud de servicios
     * @returns {Object} Estado de salud
     */
    async healthCheck() {
        const health = {
            overall: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };

        let hasErrors = false;

        for (const [name, service] of this.services) {
            try {
                const metrics = service.getMetrics();
                health.services[name] = {
                    status: service.isInitialized ? 'healthy' : 'not_initialized',
                    uptime: metrics.uptime,
                    lastActivity: metrics.lastActivity || 'unknown'
                };

                if (!service.isInitialized) {
                    hasErrors = true;
                }

            } catch (error) {
                health.services[name] = {
                    status: 'error',
                    error: error.message
                };
                hasErrors = true;
            }
        }

        if (hasErrors) {
            health.overall = 'degraded';
        }

        return health;
    }

    // ========================================
    // GESTIÓN DE CICLO DE VIDA
    // ========================================

    /**
     * Pausar todos los servicios
     */
    async pauseServices() {
        for (const [name, service] of this.services) {
            try {
                if (typeof service.pause === 'function') {
                    await service.pause();
                }
            } catch (error) {
                console.error(`[ServiceManager] Error pausando ${name}:`, error);
            }
        }
        console.log('[ServiceManager] Servicios pausados');
    }

    /**
     * Reanudar todos los servicios
     */
    async resumeServices() {
        for (const [name, service] of this.services) {
            try {
                if (typeof service.resume === 'function') {
                    await service.resume();
                }
            } catch (error) {
                console.error(`[ServiceManager] Error reanudando ${name}:`, error);
            }
        }
        console.log('[ServiceManager] Servicios reanudados');
    }

    /**
     * Limpiar recursos y cerrar servicios
     */
    async cleanup() {
        console.log('[ServiceManager] Iniciando limpieza de servicios...');

        // Limpiar en orden inverso
        const cleanupOrder = [...this.initializationOrder].reverse();

        for (const serviceName of cleanupOrder) {
            const service = this.services.get(serviceName);
            if (service && typeof service.dispose === 'function') {
                try {
                    service.dispose();
                    console.log(`[ServiceManager] ${serviceName} limpiado`);
                } catch (error) {
                    console.error(`[ServiceManager] Error limpiando ${serviceName}:`, error);
                }
            }
        }

        // Limpiar referencias
        this.services.clear();
        this.repositories.clear();
        this.eventBus.clear();
        this.isInitialized = false;

        console.log('[ServiceManager] Limpieza completada');
    }

    /**
     * Obtener información de diagnóstico
     * @returns {Object} Información de diagnóstico
     */
    getDiagnosticInfo() {
        return {
            isInitialized: this.isInitialized,
            servicesCount: this.services.size,
            repositoriesCount: this.repositories.size,
            eventListenersCount: this.eventBus.size,
            services: Array.from(this.services.keys()),
            repositories: Array.from(this.repositories.keys()),
            initializationOrder: this.initializationOrder
        };
    }
}

// Crear instancia global del ServiceManager
export const serviceManager = new ServiceManager();

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
    window.serviceManager = serviceManager;
}
