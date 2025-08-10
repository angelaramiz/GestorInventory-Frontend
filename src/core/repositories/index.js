/**
 * Index para repositorios - Exportaciones centralizadas
 * 
 * Este archivo centraliza todas las exportaciones de repositorios
 * para facilitar las importaciones en otros módulos.
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

// Repositorio base
export { BaseRepository } from './BaseRepository.js';

// Repositorios específicos
export { InventoryRepository } from './InventoryRepository.js';
export { ProductRepository } from './ProductRepository.js';

// Adaptadores de storage
export { IndexedDBAdapter } from '../../storage/IndexedDBAdapter.js';
export { SyncQueue } from '../../storage/SyncQueue.js';

/**
 * Factory para crear instancias de repositorios
 * Útil para inyección de dependencias y testing
 */
export class RepositoryFactory {
    /**
     * Crear instancia de InventoryRepository
     * @returns {InventoryRepository} Instancia del repositorio
     */
    static createInventoryRepository() {
        return new InventoryRepository();
    }

    /**
     * Crear instancia de ProductRepository
     * @returns {ProductRepository} Instancia del repositorio
     */
    static createProductRepository() {
        return new ProductRepository();
    }

    /**
     * Obtener todos los repositorios disponibles
     * @returns {Object} Objeto con todos los repositorios
     */
    static getAllRepositories() {
        return {
            inventory: this.createInventoryRepository(),
            product: this.createProductRepository()
        };
    }
}

/**
 * Configuración global para repositorios
 */
export const RepositoryConfig = {
    // Configuración de retry para sincronización
    syncRetry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000
    },
    
    // Configuración de IndexedDB
    indexedDB: {
        version: 3,
        timeout: 10000
    },
    
    // Configuración de cache
    cache: {
        enabled: true,
        ttl: 300000 // 5 minutos
    }
};
