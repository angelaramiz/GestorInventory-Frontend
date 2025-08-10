/**
 * Índice de exportación para el módulo de servicios
 * 
 * Centraliza las exportaciones de todos los servicios para facilitar
 * las importaciones desde otras partes del sistema.
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

// Servicios principales
export { BaseService } from './BaseService.js';
export { InventoryService } from './InventoryService.js';
export { ProductService } from './ProductService.js';
export { ScannerService } from './ScannerService.js';

// Gestor de servicios
export { ServiceManager, serviceManager } from './ServiceManager.js';

// Funciones de utilidad para inicialización rápida
export async function initializeServices(repositories = {}) {
    const { serviceManager } = await import('./ServiceManager.js');
    await serviceManager.initialize(repositories);
    return serviceManager;
}

export function getService(serviceName) {
    const { serviceManager } = require('./ServiceManager.js');
    return serviceManager.getService(serviceName);
}

// Constantes del módulo
export const SERVICE_NAMES = {
    INVENTORY: 'inventory',
    PRODUCT: 'product',
    SCANNER: 'scanner'
};

export const SERVICE_EVENTS = {
    // Eventos globales
    COUNT_ALERT: 'global.countAlert',
    PRODUCT_SCANNED: 'global.productScanned',
    UNKNOWN_CODE_SCANNED: 'global.unknownCodeScanned',
    PRODUCT_CHANGED: 'global.productChanged',
    PRODUCT_DELETED: 'global.productDeleted',
    
    // Eventos de servicios específicos
    INVENTORY: {
        ENTRY_REGISTERED: 'entryRegistered',
        EXIT_REGISTERED: 'exitRegistered',
        COUNT_MOVEMENT: 'countMovement'
    },
    
    PRODUCT: {
        CREATED: 'productCreated',
        UPDATED: 'productUpdated',
        DELETED: 'productDeleted',
        FASTAPI_SYNC_COMPLETED: 'fastApiSyncCompleted'
    },
    
    SCANNER: {
        SCANNING_STARTED: 'scanningStarted',
        SCANNING_STOPPED: 'scanningStopped',
        SCAN_SUCCESS: 'scanSuccess',
        SCAN_ERROR: 'scanError',
        FILE_SCAN_COMPLETED: 'fileScanCompleted'
    }
};

// Configuraciones por defecto
export const DEFAULT_CONFIGS = {
    SCANNER: {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        scanCooldown: 1000
    },
    
    INVENTORY: {
        countThresholds: {
            critical: 5,
            warning: 10,
            good: 50
        }
    },
    
    PRODUCT: {
        searchCacheTimeout: 30000, // 30 segundos
        syncInterval: 300000 // 5 minutos
    }
};
