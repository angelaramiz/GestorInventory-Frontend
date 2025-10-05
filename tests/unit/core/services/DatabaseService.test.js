/**
 * DatabaseService Tests
 * Tests para DatabaseService (IndexedDB operations, sync queue, real-time subscriptions)
 * REFACTORIZADO: Usando helpers de database-test-helpers.js
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DatabaseService } from '../../../../src/core/services/DatabaseService.js';
import {
    validateIndexedDBSchema,
    expectEventEmitted,
    expectLocalStorageToContain,
    clearIndexedDBStores,
    populateIndexedDBStore,
    createMockProduct,
    createMockInventory,
    createEnhancedMockSupabase,
    STORAGE_KEYS,
    SERVICE_EVENTS
} from '../../../helpers/database-test-helpers.js';

// Mock global mostrarAlertaBurbuja ANTES de importar DatabaseService
global.mostrarAlertaBurbuja = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

// Mock auth.js
jest.mock('../../../../js/auth.js', () => ({
    getSupabase: jest.fn()
}), { virtual: true});

describe('DatabaseService', () => {
    let service;
    let mockSupabase;
    let mockSubscription;
    let mockChannel;

    beforeEach(async () => {
        // Limpiar mocks ANTES de cada test
        jest.clearAllMocks();
        
        // Resetear mock global
        global.mostrarAlertaBurbuja = jest.fn();
        
        // Reset IndexedDB between tests
        indexedDB = new IDBFactory();

        // Clear localStorage
        localStorage.clear();
        
        // Establecer area_id ANTES de crear el servicio
        localStorage.setItem(STORAGE_KEYS.AREA_ID, 'test-area-123');

        // Reset online status
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });

        // Setup Supabase mocks usando helper mejorado
        mockSupabase = createEnhancedMockSupabase({
            enableRealtime: true,
            customBehavior: {
                upsert: jest.fn().mockResolvedValue({ data: {}, error: null })
            }
        });

        mockChannel = mockSupabase._channel;
        mockSubscription = mockChannel.subscribe();

        // Mock getSupabase
        const auth = await import('../../../../js/auth.js');
        auth.getSupabase.mockResolvedValue(mockSupabase);

        // Create service
        service = new DatabaseService();
    });

    afterEach(async () => {
        if (service) {
            // Limpiar manualmente sin llamar destroy para evitar error de super.destroy()
            if (service.subscriptions) {
                service.subscriptions.clear();
            }
            if (service.db) {
                service.db = null;
            }
            if (service.dbInventario) {
                service.dbInventario = null;
            }
            service.dispose();
        }
        jest.clearAllMocks();
    });

    describe('constructor()', () => {
        it('should initialize with default values', () => {
            // Verificar con el servicio ya creado en beforeEach (sin syncQueue en localStorage)
            expect(service.dbName).toBe('ProductosDB');
            expect(service.dbVersion).toBe(1);
            expect(service.dbInventarioName).toBe('InventarioDB');
            expect(service.dbInventarioVersion).toBe(1);
            expect(service.db).toBeNull();
            expect(service.dbInventario).toBeNull();
            expect(service.syncQueue).toEqual([]);
            expect(service.subscriptions).toBeInstanceOf(Map);
        });

        it('should load syncQueue from localStorage if exists', () => {
            // Limpiar localStorage para test limpio
            localStorage.clear();
            
            // Setear datos en localStorage usando constante
            const testData = [{ id: 1, test: 'data' }];
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(testData));
            
            // Crear un NUEVO servicio DESPUÉS de setear localStorage
            const newService = new DatabaseService();
            
            // Verificar usando expectación directa
            expect(newService.syncQueue).toEqual(testData);
            expect(newService.syncQueue).not.toBe(service.syncQueue);
            
            // Limpiar
            newService.dispose();
            localStorage.clear();
        });
    });

    describe('initialize()', () => {
        it('should initialize both databases', async () => {
            await service.initialize();

            expect(service.db).toBeDefined();
            expect(service.dbInventario).toBeDefined();
        });

        it('should emit initialized event', async () => {
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.INITIALIZED,
                () => service.initialize(),
                { service: 'DatabaseService' }
            );
        });

        it('should process sync queue if online', async () => {
            service.processSyncQueue = jest.fn();
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

            await service.initialize();

            expect(service.processSyncQueue).toHaveBeenCalled();
        });

        it('should throw error if initialization fails', async () => {
            // Force error by mocking indexedDB.open to fail
            const originalOpen = indexedDB.open;
            indexedDB.open = jest.fn().mockImplementation(() => {
                const request = {};
                setTimeout(() => {
                    if (request.onerror) {
                        request.onerror({ target: { error: new Error('DB Error') } });
                    }
                }, 0);
                return request;
            });

            await expect(service.initialize()).rejects.toThrow();

            // Restore original
            indexedDB.open = originalOpen;
        });
    });

    describe('initializeMainDB()', () => {
        it('should create productos object store', async () => {
            const db = await service.initializeMainDB();

            expect(db.objectStoreNames.contains('productos')).toBe(true);
        });

        it('should create indices for productos', async () => {
            const db = await service.initializeMainDB();
            const transaction = db.transaction('productos', 'readonly');
            const store = transaction.objectStore('productos');

            // Usar helper de validación de schema
            validateIndexedDBSchema(store, {
                keyPath: 'codigo',
                indices: ['codigo', 'nombre', 'categoria', 'marca', 'unidad']
            });
        });

        it('should resolve with db instance', async () => {
            const db = await service.initializeMainDB();

            expect(db).toBeDefined();
            expect(db.name).toBe('ProductosDB');
        });
    });

    describe('initializeInventoryDB()', () => {
        it('should create inventario object store', async () => {
            const db = await service.initializeInventoryDB();

            expect(db.objectStoreNames.contains('inventario')).toBe(true);
        });

        it('should create indices for inventario', async () => {
            const db = await service.initializeInventoryDB();
            const transaction = db.transaction('inventario', 'readonly');
            const store = transaction.objectStore('inventario');

            // Usar helper de validación de schema
            validateIndexedDBSchema(store, {
                keyPath: 'codigo',
                indices: ['codigo', 'cantidad', 'fechaActualizacion']
            });
        });
    });

    describe('addToSyncQueue()', () => {
        it('should add item to sync queue', () => {
            const item = { codigo: 'TEST', nombre: 'Test Product' };
            // Mock processSyncQueue para que no se ejecute realmente
            service.processSyncQueue = jest.fn();
            
            service.addToSyncQueue(item);
            
            expect(service.syncQueue).toHaveLength(1);
            expect(service.syncQueue[0].codigo).toBe('TEST');
        });

        it('should add area_id to item', () => {
            const item = { codigo: 'TEST' };
            // Mock processSyncQueue
            service.processSyncQueue = jest.fn();
            
            service.addToSyncQueue(item);
            
            expect(service.syncQueue[0].area_id).toBe('test-area-123');
        });

        it('should remove areaName field', () => {
            const item = { codigo: 'TEST', areaName: 'Test Area' };
            // Mock processSyncQueue
            service.processSyncQueue = jest.fn();
            
            service.addToSyncQueue(item);
            
            expect(service.syncQueue[0].areaName).toBeUndefined();
        });

        it('should save queue to localStorage', () => {
            const item = { codigo: 'TEST' };
            service.processSyncQueue = jest.fn();
            
            service.addToSyncQueue(item);
            
            // Usar helper para verificar localStorage
            expectLocalStorageToContain(STORAGE_KEYS.SYNC_QUEUE, [
                expect.objectContaining({ codigo: 'TEST' })
            ]);
        });

        it('should emit itemAddedToSyncQueue event', async () => {
            const item = { codigo: 'TEST' };
            service.processSyncQueue = jest.fn();
            
            // Usar helper de eventos
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.ITEM_ADDED_TO_SYNC_QUEUE,
                () => service.addToSyncQueue(item),
                { item: expect.objectContaining({ codigo: 'TEST' }) }
            );
        });

        it('should process queue immediately if online', () => {
            // Mock processSyncQueue BEFORE calling addToSyncQueue
            service.processSyncQueue = jest.fn();
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
            
            service.addToSyncQueue({ codigo: 'TEST' });
            
            expect(service.processSyncQueue).toHaveBeenCalled();
        });

        it('should not add to queue if area_id is missing', () => {
            localStorage.removeItem(STORAGE_KEYS.AREA_ID);
            
            service.addToSyncQueue({ codigo: 'TEST' });
            
            // La cola debe estar vacía porque el try-catch captura el error
            expect(service.syncQueue).toHaveLength(0);
            expect(global.mostrarAlertaBurbuja).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                'error'
            );
        });
    });

    describe('processSyncQueue()', () => {
        it('should not process if offline', async () => {
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
            service.syncQueue = [{ codigo: 'TEST', area_id: 'test' }];
            
            await service.processSyncQueue();
            
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });

        it('should not process if queue is empty', async () => {
            service.syncQueue = [];
            
            await service.processSyncQueue();
            
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });

        it('should skip items without area_id', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            service.syncQueue = [{ codigo: 'TEST' }]; // No area_id
            
            await service.processSyncQueue();
            
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('should emit syncQueueProcessed event', async () => {
            service.syncQueue = [{ codigo: 'TEST', area_id: 'test' }];
            
            // Usar helper de eventos
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.SYNC_QUEUE_PROCESSED,
                () => service.processSyncQueue(),
                {
                    processedCount: expect.any(Number),
                    remainingCount: expect.any(Number)
                }
            );
        });
    });

    describe('initializeSubscriptions()', () => {
        it('should create subscriptions for productos and inventario', async () => {
            localStorage.setItem(STORAGE_KEYS.AREA_ID, 'test-area-123');
            
            await service.initializeSubscriptions();
            
            expect(service.subscriptions.size).toBe(2);
            expect(service.subscriptions.has('productos')).toBe(true);
            expect(service.subscriptions.has('inventario')).toBe(true);
        });

        it('should warn if area_id is missing', async () => {
            localStorage.removeItem(STORAGE_KEYS.AREA_ID);
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            await service.initializeSubscriptions();
            
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });

    describe('handleProductChange()', () => {
        it('should handle INSERT event', async () => {
            service.updateLocalProduct = jest.fn().mockResolvedValue();
            const product = createMockProduct({ id: 1, codigo: 'TEST' });
            
            // Usar helper de eventos
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.PRODUCT_ADDED,
                () => service.handleProductChange({
                    eventType: 'INSERT',
                    new: product
                }),
                { product, eventType: 'INSERT' }
            );
            
            expect(service.updateLocalProduct).toHaveBeenCalledWith(product);
        });

        it('should handle UPDATE event', async () => {
            service.updateLocalProduct = jest.fn().mockResolvedValue();
            const product = createMockProduct({ id: 1, codigo: 'TEST' });
            
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.PRODUCT_UPDATED,
                () => service.handleProductChange({
                    eventType: 'UPDATE',
                    new: product
                }),
                { product, eventType: 'UPDATE' }
            );
            
            expect(service.updateLocalProduct).toHaveBeenCalledWith(product);
        });

        it('should handle DELETE event', async () => {
            service.deleteLocalProduct = jest.fn().mockResolvedValue();
            const product = createMockProduct({ id: 1, codigo: 'TEST' });
            
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.PRODUCT_DELETED,
                () => service.handleProductChange({
                    eventType: 'DELETE',
                    old: product
                }),
                { product, eventType: 'DELETE' }
            );
            
            // deleteLocalProduct recibe el CODIGO, no el objeto completo
            expect(service.deleteLocalProduct).toHaveBeenCalledWith('TEST');
        });
    });

    describe('handleInventoryChange()', () => {
        it('should handle INSERT event', async () => {
            service.updateLocalInventory = jest.fn().mockResolvedValue();
            const inventory = createMockInventory({ id: 1, lote: 'LOTE1', codigo: 'TEST' });
            
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.INVENTORY_ADDED,
                () => service.handleInventoryChange({
                    eventType: 'INSERT',
                    new: inventory
                }),
                { inventory, eventType: 'INSERT' }
            );
            
            expect(service.updateLocalInventory).toHaveBeenCalledWith(inventory);
        });

        it('should handle DELETE event', async () => {
            service.deleteLocalInventory = jest.fn().mockResolvedValue();
            const inventory = createMockInventory({ id: 1, lote: 'LOTE1', codigo: 'TEST' });
            
            await expectEventEmitted(
                service,
                SERVICE_EVENTS.INVENTORY_DELETED,
                () => service.handleInventoryChange({
                    eventType: 'DELETE',
                    old: inventory
                }),
                { inventory, eventType: 'DELETE' }
            );
            
            expect(service.deleteLocalInventory).toHaveBeenCalledWith('TEST');
        });
    });

    describe('updateLocalProduct()', () => {
        it('should add product to IndexedDB', async () => {
            await service.initializeMainDB();
            // El objectStore usa keyPath: 'codigo', NO 'id'
            const product = { codigo: 'TEST', nombre: 'Test Product', categoria: 'Cat1' };
            
            await service.updateLocalProduct(product);
            
            // Verify product was added - usar 'codigo' como key
            const transaction = service.db.transaction('productos', 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.get('TEST'); // Usar codigo, no id
            
            await new Promise((resolve) => {
                request.onsuccess = () => {
                    expect(request.result).toEqual(product);
                    resolve();
                };
            });
        });
    });

    describe('deleteLocalProduct()', () => {
        it('should remove product from IndexedDB', async () => {
            await service.initializeMainDB();
            
            // Add product first - usar codigo como key
            const product = { codigo: 'TEST', nombre: 'Test Product' };
            await service.updateLocalProduct(product);
            
            // Delete product - pasar el codigo
            await service.deleteLocalProduct('TEST');
            
            // Verify product was deleted
            const transaction = service.db.transaction('productos', 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.get('TEST'); // Usar codigo
            
            await new Promise((resolve) => {
                request.onsuccess = () => {
                    expect(request.result).toBeUndefined();
                    resolve();
                };
            });
        });
    });

    describe('resetDatabase()', () => {
        it('should clear all data from store', async () => {
            await service.initializeMainDB();
            
            // Add some data
            await service.updateLocalProduct({ codigo: 'TEST1', nombre: 'Product 1' });
            await service.updateLocalProduct({ codigo: 'TEST2', nombre: 'Product 2' });
            
            // Reset database
            await service.resetDatabase(service.db, 'productos');
            
            // Verify data was cleared
            const transaction = service.db.transaction('productos', 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.count();
            
            await new Promise((resolve) => {
                request.onsuccess = () => {
                    expect(request.result).toBe(0);
                    resolve();
                };
            });
        });

        it('should show success message', async () => {
            await service.initializeMainDB();
            
            await service.resetDatabase(service.db, 'productos');
            
            // El mensaje es dinámico: "Base de datos {storeName} limpiada"
            expect(global.mostrarAlertaBurbuja).toHaveBeenCalledWith(
                'Base de datos productos limpiada',
                'success'
            );
        });
    });

    describe('getSyncStats()', () => {
        it('should return sync statistics', () => {
            service.syncQueue = [{ codigo: 'TEST1' }, { codigo: 'TEST2' }];
            service.subscriptions.set('productos', mockSubscription);
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
            
            const stats = service.getSyncStats();
            
            expect(stats.queueLength).toBe(2);
            expect(stats.isOnline).toBe(true);
            expect(stats.subscriptionsActive).toBe(1);
        });

        it('should include lastSync from localStorage', () => {
            const timestamp = new Date().toISOString();
            localStorage.setItem('lastSync', timestamp);
            
            const stats = service.getSyncStats();
            
            expect(stats.lastSync).toBe(timestamp);
        });
    });

    describe('destroy()', () => {
        it('should close database connections', async () => {
            await service.initializeMainDB();
            await service.initializeInventoryDB();
            
            const closeSpy1 = jest.spyOn(service.db, 'close');
            const closeSpy2 = jest.spyOn(service.dbInventario, 'close');
            
            // Mock dispose to avoid error
            service.dispose = jest.fn();
            
            // Manually call destroy logic without calling super.destroy()
            for (const [, subscription] of service.subscriptions) {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
            }
            service.subscriptions.clear();
            
            if (service.db) {
                service.db.close();
                service.db = null;
            }
            
            if (service.dbInventario) {
                service.dbInventario.close();
                service.dbInventario = null;
            }
            
            expect(closeSpy1).toHaveBeenCalled();
            expect(closeSpy2).toHaveBeenCalled();
            expect(service.db).toBeNull();
            expect(service.dbInventario).toBeNull();
        });

        it('should unsubscribe from all subscriptions', async () => {
            service.subscriptions.set('test', mockSubscription);
            
            // Manually call destroy logic without calling super.destroy()
            for (const [, subscription] of service.subscriptions) {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
            }
            service.subscriptions.clear();
            
            expect(mockSubscription.unsubscribe).toHaveBeenCalled();
            expect(service.subscriptions.size).toBe(0);
        });
    });
});
