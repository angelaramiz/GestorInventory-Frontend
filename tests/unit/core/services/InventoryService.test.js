/**
 * ============================================================================
 * INVENTORY SERVICE TESTS - PHASES 1 & 2
 * ============================================================================
 * 
 * Test coverage for InventoryService:
 * 
 * PHASE 1: SETUP & CORE OPERATIONS
 * - Constructor initialization
 * - Service initialization
 * - Get inventory operations
 * - Get product stock operations
 * - Update product count operations
 * - Update count with batch operations
 * 
 * PHASE 2: ENTRY & EXIT OPERATIONS
 * - Register entry operations
 * - Register exit operations
 * 
 * @version 1.0.0
 * @date 2025-10-06
 */

import { jest } from '@jest/globals';
import { InventoryService } from '../../../../src/core/services/InventoryService.js';
import {
    // Data Fields
    INVENTORY_FIELDS,
    BATCH_FIELDS,
    
    // Inventory Creation
    createInventoryData,
    createInventoryList,
    createLowStockInventory,
    createOutOfStockInventory,
    createCriticalStockInventory,
    
    // Batch Creation
    createBatchData,
    createBatchList,
    createExpiringBatch,
    createExpiredBatch,
    
    // Entry/Exit Creation
    createCountData,
    createCountDataWithBatch,
    createEntryData,
    createExitData,
    
    // Mock Repositories
    createMockInventoryRepository,
    createMockBatchRepository,
    setupInventoryRepositoryMock,
    setupBatchRepositoryMock,
    
    // Mock Setup
    setupInventoryServiceMocks,
    mockLocalStorage,
    mockWindowEvents,
    
    // Validations
    isValidStockInfo,
    isValidAlert,
    isValidEnrichedBatch,
    isValidMovement,
    
    // Calculations
    calculateDaysTo,
    createDateWithOffset
} from '../../../helpers/inventory-test-helpers.js';

// Mock Batch model
jest.mock('../../../../src/core/models/Batch.js', () => ({
    Batch: jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ id: 1, ...data })
    }))
}));

describe('InventoryService', () => {
    let service;
    let mocks;
    let localStorageMock;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Setup localStorage mock
        localStorageMock = mockLocalStorage();
        
        // Create service instance
        service = new InventoryService();
        
        // Setup service mocks
        mocks = setupInventoryServiceMocks(service);
        
        // Mark service as initialized for tests that need executeOperation
        service.isInitialized = true;
    });

    afterEach(() => {
        localStorageMock.cleanup();
        mocks.cleanup();
    });

    // ========================================================================
    // CONSTRUCTOR TESTS
    // ========================================================================

    describe('constructor()', () => {
        it('should initialize with default values', () => {
            expect(service.stockAlerts).toBeInstanceOf(Map);
            expect(service.batchExpiryAlerts).toBeInstanceOf(Map);
            expect(service.stockThresholds).toEqual({
                critical: 5,
                warning: 10,
                good: 50
            });
        });

        it('should initialize empty alert maps', () => {
            expect(service.stockAlerts.size).toBe(0);
            expect(service.batchExpiryAlerts.size).toBe(0);
        });

        it('should call BaseService constructor with service name', () => {
            // BaseService sets serviceName internally
            expect(service.serviceName).toBe('InventoryService');
        });
    });

    // ========================================================================
    // INITIALIZE TESTS
    // ========================================================================

    describe('initialize()', () => {
        it('should set isInitialized to true', async () => {
            service.loadStockThresholds = jest.fn().mockResolvedValue();
            service.setupInventoryListeners = jest.fn();

            await service.initialize();

            expect(service.isInitialized).toBe(true);
        });

        it('should call loadStockThresholds', async () => {
            service.loadStockThresholds = jest.fn().mockResolvedValue();
            service.setupInventoryListeners = jest.fn();

            await service.initialize();

            expect(service.loadStockThresholds).toHaveBeenCalled();
        });

        it('should call setupInventoryListeners', async () => {
            service.loadStockThresholds = jest.fn().mockResolvedValue();
            service.setupInventoryListeners = jest.fn();

            await service.initialize();

            expect(service.setupInventoryListeners).toHaveBeenCalled();
        });

        it('should set startTime', async () => {
            service.loadStockThresholds = jest.fn().mockResolvedValue();
            service.setupInventoryListeners = jest.fn();

            const beforeTime = Date.now();
            await service.initialize();
            const afterTime = Date.now();

            expect(service.startTime).toBeGreaterThanOrEqual(beforeTime);
            expect(service.startTime).toBeLessThanOrEqual(afterTime);
        });
    });

    // ========================================================================
    // GET INVENTORY TESTS
    // ========================================================================

    describe('getInventory()', () => {
        it('should get inventory with no filters', async () => {
            const inventoryData = createInventoryList(3);
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.enrichInventoryData = jest.fn().mockResolvedValue(inventoryData);

            const result = await service.getInventory();

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith({
                area_id: 'area-001',
                categoria_id: 'cat-001'
            });
            expect(result).toEqual(inventoryData);
        });

        it('should apply custom filters', async () => {
            const inventoryData = createInventoryList(2);
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.enrichInventoryData = jest.fn().mockResolvedValue(inventoryData);

            await service.getInventory({
                area_id: 'area-002',
                categoria_id: 'cat-002',
                custom_filter: 'value'
            });

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith({
                area_id: 'area-002',
                categoria_id: 'cat-002',
                custom_filter: 'value'
            });
        });

        it('should enrich inventory data', async () => {
            const inventoryData = createInventoryList(2);
            const enrichedData = inventoryData.map(item => ({
                ...item,
                alerts: [],
                count_status: 'good'
            }));
            
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            service.enrichInventoryData = jest.fn().mockResolvedValue(enrichedData);

            const result = await service.getInventory();

            expect(service.enrichInventoryData).toHaveBeenCalledWith(inventoryData);
            expect(result).toEqual(enrichedData);
        });

        it('should use default area_id when not provided', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.enrichInventoryData = jest.fn().mockResolvedValue([]);

            await service.getInventory({ categoria_id: 'cat-002' });

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ area_id: 'area-001' })
            );
        });

        it('should use default categoria_id when not provided', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.enrichInventoryData = jest.fn().mockResolvedValue([]);

            await service.getInventory({ area_id: 'area-002' });

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ categoria_id: 'cat-001' })
            );
        });

        it('should return empty array when no inventory found', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.enrichInventoryData = jest.fn().mockResolvedValue([]);

            const result = await service.getInventory();

            expect(result).toEqual([]);
        });

        it('should handle repository errors', async () => {
            mocks.inventoryRepo.findAll.mockRejectedValue(new Error('Database error'));

            await expect(service.getInventory()).rejects.toThrow('Database error');
        });

        it('should merge filters correctly', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.enrichInventoryData = jest.fn().mockResolvedValue([]);

            await service.getInventory({
                area_id: 'custom-area',
                extra_field: 'value'
            });

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith({
                area_id: 'custom-area',
                categoria_id: 'cat-001',
                extra_field: 'value'
            });
        });
    });

    // ========================================================================
    // GET PRODUCT STOCK TESTS
    // ========================================================================

    describe('getProductStock()', () => {
        it('should get stock for product', async () => {
            const inventoryData = [createInventoryData({ product_id: 'prod-001' })];
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.calculateStockTotals = jest.fn().mockReturnValue({
                cantidad_actual: 100,
                items_count: 1
            });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            const result = await service.getProductStock('prod-001');

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith({
                product_id: 'prod-001',
                area_id: 'area-001'
            });
            expect(result.cantidad_actual).toBe(100);
        });

        it('should use custom area_id when provided', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.calculateStockTotals = jest.fn().mockReturnValue({});
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            await service.getProductStock('prod-001', { area_id: 'area-002' });

            expect(mocks.inventoryRepo.findAll).toHaveBeenCalledWith({
                product_id: 'prod-001',
                area_id: 'area-002'
            });
        });

        it('should calculate stock totals', async () => {
            const inventoryData = createInventoryList(3);
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.calculateStockTotals = jest.fn().mockReturnValue({
                cantidad_actual: 300,
                items_count: 3
            });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            await service.getProductStock('prod-001');

            expect(service.calculateStockTotals).toHaveBeenCalledWith(inventoryData);
        });

        it('should check stock alerts', async () => {
            const inventoryData = [createInventoryData()];
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            const stockInfo = { cantidad_actual: 100 };
            service.calculateStockTotals = jest.fn().mockReturnValue(stockInfo);
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            await service.getProductStock('prod-001');

            expect(service.checkStockAlerts).toHaveBeenCalledWith(stockInfo);
        });

        it('should include alerts in result', async () => {
            const inventoryData = [createLowStockInventory()];
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            const alerts = [{ type: 'low_count', level: 'warning' }];
            service.calculateStockTotals = jest.fn().mockReturnValue({ cantidad_actual: 5 });
            service.checkStockAlerts = jest.fn().mockReturnValue(alerts);

            const result = await service.getProductStock('prod-001');

            expect(result.alerts).toEqual(alerts);
        });

        it('should include batches when requested', async () => {
            const inventoryData = [createInventoryData()];
            const batchData = createBatchList(2);
            
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            service.calculateStockTotals = jest.fn().mockReturnValue({ cantidad_actual: 100 });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);
            service.getProductBatches = jest.fn().mockResolvedValue(batchData);

            const result = await service.getProductStock('prod-001', { includeBatches: true });

            expect(service.getProductBatches).toHaveBeenCalledWith('prod-001', { includeBatches: true });
            expect(result.batches).toEqual(batchData);
        });

        it('should not include batches when not requested', async () => {
            const inventoryData = [createInventoryData()];
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.calculateStockTotals = jest.fn().mockReturnValue({ cantidad_actual: 100 });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);
            service.getProductBatches = jest.fn();

            const result = await service.getProductStock('prod-001');

            expect(service.getProductBatches).not.toHaveBeenCalled();
            expect(result.batches).toBeUndefined();
        });

        it('should return valid stock info structure', async () => {
            const inventoryData = [createInventoryData()];
            setupInventoryRepositoryMock(mocks.inventoryRepo, inventoryData);
            
            service.calculateStockTotals = jest.fn().mockReturnValue({
                cantidad_actual: 100,
                items_count: 1
            });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            const result = await service.getProductStock('prod-001');

            expect(isValidStockInfo(result)).toBe(true);
        });

        it('should handle empty inventory', async () => {
            setupInventoryRepositoryMock(mocks.inventoryRepo, []);
            service.calculateStockTotals = jest.fn().mockReturnValue({
                cantidad_actual: 0,
                items_count: 0
            });
            service.checkStockAlerts = jest.fn().mockReturnValue([]);

            const result = await service.getProductStock('prod-999');

            expect(result.cantidad_actual).toBe(0);
            expect(result.items_count).toBe(0);
        });

        it('should handle repository errors', async () => {
            mocks.inventoryRepo.findAll.mockRejectedValue(new Error('Database error'));

            await expect(service.getProductStock('prod-001')).rejects.toThrow('Database error');
        });
    });

    // ========================================================================
    // UPDATE PRODUCT COUNT TESTS
    // ========================================================================

    describe('updateProductCount()', () => {
        beforeEach(() => {
            service.validateCountData = jest.fn().mockReturnValue({ isValid: true, errors: [] });
            service.getProductStock = jest.fn().mockResolvedValue({
                cantidad_actual: 50,
                cantidad_minima: 10,
                cantidad_maxima: 500
            });
            service.registerCountMovement = jest.fn().mockResolvedValue();
            service.checkAndNotifyCountAlerts = jest.fn().mockResolvedValue();
        });

        it('should update product count successfully', async () => {
            const countData = createCountData({ cantidad: 150 });
            mocks.inventoryRepo.createOrUpdate.mockResolvedValue({
                id: 1,
                cantidad_actual: 150
            });

            const result = await service.updateProductCount('prod-001', countData);

            expect(result.cantidad_actual).toBe(150);
        });

        it('should validate count data before updating', async () => {
            const countData = createCountData();

            await service.updateProductCount('prod-001', countData);

            expect(service.validateCountData).toHaveBeenCalledWith(countData);
        });

        it('should throw error when validation fails', async () => {
            service.validateCountData.mockReturnValue({
                isValid: false,
                errors: ['cantidad is required']
            });

            await expect(
                service.updateProductCount('prod-001', {})
            ).rejects.toThrow('Datos inválidos: cantidad is required');
        });

        it('should get current stock before updating', async () => {
            const countData = createCountData();

            await service.updateProductCount('prod-001', countData);

            expect(service.getProductStock).toHaveBeenCalledWith('prod-001');
        });

        it('should use provided area_id', async () => {
            const countData = createCountData({ area_id: 'area-002' });

            await service.updateProductCount('prod-001', countData);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ area_id: 'area-002' })
            );
        });

        it('should use default area_id when not provided', async () => {
            const countData = createCountData();
            delete countData.area_id;

            await service.updateProductCount('prod-001', countData);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ area_id: 'area-001' })
            );
        });

        it('should preserve cantidad_minima from current stock', async () => {
            service.getProductStock.mockResolvedValue({
                cantidad_actual: 50,
                cantidad_minima: 25,
                cantidad_maxima: 500
            });

            const countData = createCountData({ cantidad: 100 });

            await service.updateProductCount('prod-001', countData);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ cantidad_minima: 25 })
            );
        });

        it('should use provided cantidad_minima when specified', async () => {
            const countData = createCountData({
                cantidad: 100,
                cantidad_minima: 30
            });

            await service.updateProductCount('prod-001', countData);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ cantidad_minima: 30 })
            );
        });

        it('should register count movement', async () => {
            const countData = createCountData({ cantidad: 150 });
            
            service.getProductStock.mockResolvedValue({ cantidad_actual: 100 });

            await service.updateProductCount('prod-001', countData);

            expect(service.registerCountMovement).toHaveBeenCalledWith({
                product_id: 'prod-001',
                type: 'count_adjustment',
                cantidad_anterior: 100,
                cantidad_nueva: 150,
                motivo: countData.motivo
            });
        });

        it('should check and notify count alerts', async () => {
            const countData = createCountData();

            await service.updateProductCount('prod-001', countData);

            expect(service.checkAndNotifyCountAlerts).toHaveBeenCalledWith('prod-001');
        });

        it('should call updateCountWithBatch when batch_info provided', async () => {
            const countData = createCountDataWithBatch();
            service.updateCountWithBatch = jest.fn().mockResolvedValue({
                inventory: { id: 1 },
                batch: { id: 1 }
            });

            await service.updateProductCount('prod-001', countData);

            expect(service.updateCountWithBatch).toHaveBeenCalled();
        });

        it('should include usuario_id in inventory data', async () => {
            const countData = createCountData();

            await service.updateProductCount('prod-001', countData);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ usuario_id: 'user-001' })
            );
        });

        it('should set fecha_actualizacion', async () => {
            const countData = createCountData();
            const beforeTime = new Date().toISOString();

            await service.updateProductCount('prod-001', countData);

            const callArgs = mocks.inventoryRepo.createOrUpdate.mock.calls[0][0];
            expect(callArgs.fecha_actualizacion).toBeDefined();
            expect(new Date(callArgs.fecha_actualizacion).getTime()).toBeGreaterThanOrEqual(
                new Date(beforeTime).getTime()
            );
        });
    });

    // ========================================================================
    // UPDATE COUNT WITH BATCH TESTS
    // ========================================================================

    describe('updateCountWithBatch()', () => {
        it('should create or update inventory', async () => {
            const inventoryData = {
                product_id: 'prod-001',
                area_id: 'area-001',
                cantidad_actual: 100
            };
            const batchInfo = {
                numero: 'LOTE-001',
                fecha_vencimiento: '2025-12-31',
                cantidad: 50
            };

            mocks.inventoryRepo.createOrUpdate.mockResolvedValue({
                id: 1,
                ...inventoryData
            });

            await service.updateCountWithBatch(inventoryData, batchInfo);

            expect(mocks.inventoryRepo.createOrUpdate).toHaveBeenCalledWith(inventoryData);
        });

        it('should create batch with correct data', async () => {
            const { Batch } = await import('../../../../src/core/models/Batch.js');
            
            const inventoryData = {
                product_id: 'prod-001',
                area_id: 'area-001',
                cantidad_actual: 100
            };
            const batchInfo = {
                numero: 'LOTE-001',
                fecha_vencimiento: '2025-12-31',
                cantidad: 50
            };

            mocks.inventoryRepo.createOrUpdate.mockResolvedValue({ id: 1 });

            await service.updateCountWithBatch(inventoryData, batchInfo);

            expect(Batch).toHaveBeenCalledWith(
                expect.objectContaining({
                    inventory_id: 1,
                    product_id: 'prod-001',
                    lote_numero: 'LOTE-001',
                    fecha_vencimiento: '2025-12-31',
                    cantidad_lote: 50,
                    estado: 'active'
                })
            );
        });

        it('should save batch', async () => {
            const inventoryData = { product_id: 'prod-001' };
            const batchInfo = { numero: 'LOTE-001', fecha_vencimiento: '2025-12-31', cantidad: 50 };

            mocks.inventoryRepo.createOrUpdate.mockResolvedValue({ id: 1 });

            const result = await service.updateCountWithBatch(inventoryData, batchInfo);

            expect(result.batch).toBeDefined();
        });

        it('should return inventory and batch', async () => {
            const inventoryData = { product_id: 'prod-001' };
            const batchInfo = { numero: 'LOTE-001', fecha_vencimiento: '2025-12-31', cantidad: 50 };

            const inventoryResult = { id: 1, ...inventoryData };
            mocks.inventoryRepo.createOrUpdate.mockResolvedValue(inventoryResult);

            const result = await service.updateCountWithBatch(inventoryData, batchInfo);

            expect(result).toHaveProperty('inventory');
            expect(result).toHaveProperty('batch');
            expect(result.inventory).toEqual(inventoryResult);
        });

        it('should set batch estado to active', async () => {
            const { Batch } = await import('../../../../src/core/models/Batch.js');
            
            const inventoryData = { product_id: 'prod-001' };
            const batchInfo = { numero: 'LOTE-001', fecha_vencimiento: '2025-12-31', cantidad: 50 };

            mocks.inventoryRepo.createOrUpdate.mockResolvedValue({ id: 1 });

            await service.updateCountWithBatch(inventoryData, batchInfo);

            expect(Batch).toHaveBeenCalledWith(
                expect.objectContaining({ estado: 'active' })
            );
        });
    });

    // ========================================================================
    // PHASE 2: ENTRY & EXIT OPERATIONS
    // ========================================================================

    describe('Phase 2: Entry & Exit Operations', () => {

        // ====================================================================
        // REGISTER ENTRY TESTS
        // ====================================================================

        describe('registerEntry()', () => {
            beforeEach(() => {
                service.validateEntryData = jest.fn().mockReturnValue({ isValid: true, errors: [] });
                service.getProductStock = jest.fn().mockResolvedValue({
                    cantidad_actual: 50
                });
                service.updateProductCount = jest.fn().mockResolvedValue({
                    id: 1,
                    cantidad_actual: 100
                });
                service.registerCountMovement = jest.fn().mockResolvedValue();
            });

            it('should register entry successfully', async () => {
                const entryData = createEntryData();

                const result = await service.registerEntry(entryData);

                expect(result).toHaveLength(1);
                expect(result[0].product_id).toBe('prod-001');
            });

            it('should validate entry data before processing', async () => {
                const entryData = createEntryData();

                await service.registerEntry(entryData);

                expect(service.validateEntryData).toHaveBeenCalledWith(entryData);
            });

            it('should throw error when validation fails', async () => {
                service.validateEntryData.mockReturnValue({
                    isValid: false,
                    errors: ['items is required', 'cantidad must be positive']
                });

                const entryData = createEntryData();

                await expect(service.registerEntry(entryData))
                    .rejects.toThrow('Datos inválidos: items is required, cantidad must be positive');
            });

            it('should get current stock for each item', async () => {
                const entryData = createEntryData({
                    items: [
                        { product_id: 'prod-001', cantidad: 50 },
                        { product_id: 'prod-002', cantidad: 30 }
                    ]
                });

                await service.registerEntry(entryData);

                expect(service.getProductStock).toHaveBeenCalledTimes(2);
                expect(service.getProductStock).toHaveBeenCalledWith('prod-001');
                expect(service.getProductStock).toHaveBeenCalledWith('prod-002');
            });

            it('should calculate new quantity correctly', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 100 });

                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 50 }]
                });

                await service.registerEntry(entryData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    'prod-001',
                    expect.objectContaining({ cantidad: 150 })
                );
            });

            it('should handle zero current stock', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 0 });

                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 50 }]
                });

                await service.registerEntry(entryData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    'prod-001',
                    expect.objectContaining({ cantidad: 50 })
                );
            });

            it('should pass area_id and categoria_id to updateProductCount', async () => {
                const entryData = createEntryData({
                    area_id: 'area-002',
                    categoria_id: 'cat-002'
                });

                await service.registerEntry(entryData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        area_id: 'area-002',
                        categoria_id: 'cat-002'
                    })
                );
            });

            it('should pass batch_info when provided', async () => {
                const entryData = createEntryData({
                    items: [{
                        product_id: 'prod-001',
                        cantidad: 50,
                        batch_info: {
                            numero: 'LOTE-001',
                            fecha_vencimiento: '2025-12-31',
                            cantidad: 50
                        }
                    }]
                });

                await service.registerEntry(entryData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    'prod-001',
                    expect.objectContaining({
                        batch_info: expect.objectContaining({
                            numero: 'LOTE-001'
                        })
                    })
                );
            });

            it('should register count movement for each item', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 50 });

                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 30 }],
                    motivo: 'Compra de mercancía',
                    documento_referencia: 'DOC-123'
                });

                await service.registerEntry(entryData);

                expect(service.registerCountMovement).toHaveBeenCalledWith({
                    product_id: 'prod-001',
                    type: 'entry',
                    cantidad_anterior: 50,
                    cantidad_nueva: 80,
                    cantidad_movimiento: 30,
                    motivo: 'Entrada: Compra de mercancía',
                    documento_referencia: 'DOC-123'
                });
            });

            it('should use default motivo when not provided', async () => {
                const entryData = createEntryData();
                delete entryData.motivo;

                await service.registerEntry(entryData);

                expect(service.registerCountMovement).toHaveBeenCalledWith(
                    expect.objectContaining({
                        motivo: 'Entrada: Recepción de mercancía'
                    })
                );
            });

            it('should emit entryRegistered event', async () => {
                const entryData = createEntryData();

                await service.registerEntry(entryData);

                expect(service.emit).toHaveBeenCalledWith('entryRegistered', {
                    entryData,
                    results: expect.any(Array)
                });
            });

            it('should return results for all items', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 100 });
                service.updateProductCount.mockResolvedValue({ id: 1 });

                const entryData = createEntryData({
                    items: [
                        { product_id: 'prod-001', cantidad: 50 },
                        { product_id: 'prod-002', cantidad: 30 }
                    ]
                });

                const result = await service.registerEntry(entryData);

                expect(result).toHaveLength(2);
                expect(result[0]).toMatchObject({
                    product_id: 'prod-001',
                    cantidad_anterior: 100,
                    cantidad_nueva: 150
                });
                expect(result[1]).toMatchObject({
                    product_id: 'prod-002',
                    cantidad_anterior: 100,
                    cantidad_nueva: 130
                });
            });

            it('should process multiple items sequentially', async () => {
                let callCount = 0;
                service.getProductStock.mockImplementation(() => {
                    callCount++;
                    return Promise.resolve({ cantidad_actual: 50 * callCount });
                });

                const entryData = createEntryData({
                    items: [
                        { product_id: 'prod-001', cantidad: 10 },
                        { product_id: 'prod-002', cantidad: 20 }
                    ]
                });

                const result = await service.registerEntry(entryData);

                expect(result[0].cantidad_anterior).toBe(50);
                expect(result[1].cantidad_anterior).toBe(100);
            });

            it('should handle entry with single item', async () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 25 }]
                });

                const result = await service.registerEntry(entryData);

                expect(result).toHaveLength(1);
                expect(service.updateProductCount).toHaveBeenCalledTimes(1);
                expect(service.registerCountMovement).toHaveBeenCalledTimes(1);
            });

            it('should propagate errors from updateProductCount', async () => {
                service.updateProductCount.mockRejectedValue(new Error('Update failed'));

                const entryData = createEntryData();

                await expect(service.registerEntry(entryData))
                    .rejects.toThrow('Update failed');
            });
        });

        // ====================================================================
        // REGISTER EXIT TESTS
        // ====================================================================

        describe('registerExit()', () => {
            beforeEach(() => {
                service.validateExitData = jest.fn().mockReturnValue({ isValid: true, errors: [] });
                service.getProductStock = jest.fn().mockResolvedValue({
                    cantidad_actual: 100,
                    batches: []
                });
                service.updateProductCount = jest.fn().mockResolvedValue({
                    id: 1,
                    cantidad_actual: 50
                });
                service.registerCountMovement = jest.fn().mockResolvedValue();
            });

            it('should register exit successfully', async () => {
                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 20 }]
                });

                const result = await service.registerExit(exitData);

                expect(result).toHaveLength(1);
                expect(result[0].product_id).toBe('prod-001');
            });

            it('should validate exit data before processing', async () => {
                const exitData = createExitData();

                await service.registerExit(exitData);

                expect(service.validateExitData).toHaveBeenCalledWith(exitData);
            });

            it('should throw error when validation fails', async () => {
                service.validateExitData.mockReturnValue({
                    isValid: false,
                    errors: ['items is required']
                });

                const exitData = createExitData();

                await expect(service.registerExit(exitData))
                    .rejects.toThrow('Datos inválidos: items is required');
            });

            it('should get current stock with batches', async () => {
                const exitData = createExitData();

                await service.registerExit(exitData);

                expect(service.getProductStock).toHaveBeenCalledWith('prod-001', {
                    includeBatches: true
                });
            });

            it('should throw error when insufficient stock', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 10 });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 50 }]
                });

                await expect(service.registerExit(exitData))
                    .rejects.toThrow('Cantidad insuficiente para producto prod-001. Disponible: 10, Solicitado: 50');
            });

            it('should allow exit when stock equals requested quantity', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 50 });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 50 }]
                });

                const result = await service.registerExit(exitData);

                expect(result).toHaveLength(1);
                expect(service.updateProductCount).toHaveBeenCalledWith(
                    'prod-001',
                    expect.objectContaining({ cantidad: 0 })
                );
            });

            it('should calculate new quantity correctly', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 100 });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 30 }]
                });

                await service.registerExit(exitData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    'prod-001',
                    expect.objectContaining({ cantidad: 70 })
                );
            });

            it('should pass area_id and categoria_id to updateProductCount', async () => {
                const exitData = createExitData({
                    area_id: 'area-003',
                    categoria_id: 'cat-003'
                });

                await service.registerExit(exitData);

                expect(service.updateProductCount).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        area_id: 'area-003',
                        categoria_id: 'cat-003'
                    })
                );
            });

            it('should use FIFO for batch exits', async () => {
                const batches = [
                    createBatchData({
                        id: 1,
                        fecha_vencimiento: '2025-11-01',
                        cantidad_disponible: 30
                    }),
                    createBatchData({
                        id: 2,
                        fecha_vencimiento: '2025-10-01',
                        cantidad_disponible: 40
                    }),
                    createBatchData({
                        id: 3,
                        fecha_vencimiento: '2025-12-01',
                        cantidad_disponible: 30
                    })
                ];

                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 100,
                    batches
                });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 50 }]
                });

                await service.registerExit(exitData);

                expect(service.registerCountMovement).toHaveBeenCalledWith(
                    expect.objectContaining({
                        batch_exits: [
                            { batch_id: 2, cantidad: 40 },
                            { batch_id: 1, cantidad: 10 }
                        ]
                    })
                );
            });

            it('should filter out batches with zero disponible', async () => {
                const batches = [
                    createBatchData({ id: 1, cantidad_disponible: 0 }),
                    createBatchData({ id: 2, cantidad_disponible: 50 })
                ];

                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 50,
                    batches
                });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 30 }]
                });

                await service.registerExit(exitData);

                expect(service.registerCountMovement).toHaveBeenCalledWith(
                    expect.objectContaining({
                        batch_exits: [{ batch_id: 2, cantidad: 30 }]
                    })
                );
            });

            it('should handle exit without batches', async () => {
                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 100,
                    batches: []
                });

                const exitData = createExitData();

                const result = await service.registerExit(exitData);

                expect(result[0].batch_exits).toEqual([]);
            });

            it('should register count movement for each item', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 100 });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 25 }],
                    motivo: 'Venta',
                    documento_referencia: 'VENTA-456'
                });

                await service.registerExit(exitData);

                expect(service.registerCountMovement).toHaveBeenCalledWith({
                    product_id: 'prod-001',
                    type: 'exit',
                    cantidad_anterior: 100,
                    cantidad_nueva: 75,
                    cantidad_movimiento: -25,
                    motivo: 'Salida: Venta',
                    documento_referencia: 'VENTA-456',
                    batch_exits: []
                });
            });

            it('should use default motivo when not provided', async () => {
                const exitData = createExitData();
                delete exitData.motivo;

                await service.registerExit(exitData);

                expect(service.registerCountMovement).toHaveBeenCalledWith(
                    expect.objectContaining({
                        motivo: 'Salida: Despacho de mercancía'
                    })
                );
            });

            it('should emit exitRegistered event', async () => {
                const exitData = createExitData();

                await service.registerExit(exitData);

                expect(service.emit).toHaveBeenCalledWith('exitRegistered', {
                    exitData,
                    results: expect.any(Array)
                });
            });

            it('should return results for all items', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 100, batches: [] });

                const exitData = createExitData({
                    items: [
                        { product_id: 'prod-001', cantidad: 20 },
                        { product_id: 'prod-002', cantidad: 30 }
                    ]
                });

                const result = await service.registerExit(exitData);

                expect(result).toHaveLength(2);
                expect(result[0]).toMatchObject({
                    product_id: 'prod-001',
                    cantidad_anterior: 100,
                    cantidad_nueva: 80
                });
                expect(result[1]).toMatchObject({
                    product_id: 'prod-002',
                    cantidad_anterior: 100,
                    cantidad_nueva: 70
                });
            });

            it('should include batch_exits in results', async () => {
                const batches = [
                    createBatchData({ id: 1, cantidad_disponible: 50 })
                ];

                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 100,
                    batches
                });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 30 }]
                });

                const result = await service.registerExit(exitData);

                expect(result[0]).toHaveProperty('batch_exits');
                expect(result[0].batch_exits).toEqual([{ batch_id: 1, cantidad: 30 }]);
            });

            it('should handle multiple batches in single exit', async () => {
                const batches = [
                    createBatchData({ id: 1, fecha_vencimiento: '2025-10-01', cantidad_disponible: 20 }),
                    createBatchData({ id: 2, fecha_vencimiento: '2025-11-01', cantidad_disponible: 20 }),
                    createBatchData({ id: 3, fecha_vencimiento: '2025-12-01', cantidad_disponible: 20 })
                ];

                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 60,
                    batches
                });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 45 }]
                });

                await service.registerExit(exitData);

                expect(service.registerCountMovement).toHaveBeenCalledWith(
                    expect.objectContaining({
                        batch_exits: [
                            { batch_id: 1, cantidad: 20 },
                            { batch_id: 2, cantidad: 20 },
                            { batch_id: 3, cantidad: 5 }
                        ]
                    })
                );
            });

            it('should stop processing batches when quantity fulfilled', async () => {
                const batches = [
                    createBatchData({ id: 1, cantidad_disponible: 50 }),
                    createBatchData({ id: 2, cantidad_disponible: 50 })
                ];

                service.getProductStock.mockResolvedValue({
                    cantidad_actual: 100,
                    batches
                });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 30 }]
                });

                await service.registerExit(exitData);

                const batchExits = service.registerCountMovement.mock.calls[0][0].batch_exits;
                expect(batchExits).toHaveLength(1);
                expect(batchExits[0]).toEqual({ batch_id: 1, cantidad: 30 });
            });

            it('should propagate errors from updateProductCount', async () => {
                service.updateProductCount.mockRejectedValue(new Error('Update failed'));

                const exitData = createExitData();

                await expect(service.registerExit(exitData))
                    .rejects.toThrow('Update failed');
            });

            it('should handle exit with single item', async () => {
                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 15 }]
                });

                const result = await service.registerExit(exitData);

                expect(result).toHaveLength(1);
                expect(service.updateProductCount).toHaveBeenCalledTimes(1);
                expect(service.registerCountMovement).toHaveBeenCalledTimes(1);
            });

            it('should handle zero stock after exit', async () => {
                service.getProductStock.mockResolvedValue({ cantidad_actual: 25 });

                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 25 }]
                });

                const result = await service.registerExit(exitData);

                expect(result[0].cantidad_nueva).toBe(0);
            });
        });
    });

    // ========================================================================
    // PHASE 3: BATCH MANAGEMENT
    // ========================================================================

    describe('Phase 3: Batch Management', () => {

        // ====================================================================
        // GET PRODUCT BATCHES TESTS
        // ====================================================================

        describe('getProductBatches()', () => {
            beforeEach(() => {
                service.calculateDaysUntilExpiry = jest.fn((date) => {
                    const expiry = new Date(date);
                    const today = new Date();
                    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                });
                service.getExpiryStatus = jest.fn((days) => {
                    if (days < 0) return 'expired';
                    if (days <= 7) return 'critical';
                    if (days <= 30) return 'warning';
                    return 'good';
                });
                service.calculateAvailableBatchQuantity = jest.fn((batch) => batch.cantidad_lote || 0);
            });

            it('should get batches for product', async () => {
                const batches = createBatchList(3);
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                const result = await service.getProductBatches('prod-001');

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith({
                    product_id: 'prod-001',
                    estado: 'active'
                });
                expect(result).toHaveLength(3);
            });

            it('should filter by estado active by default', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getProductBatches('prod-001');

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith(
                    expect.objectContaining({ estado: 'active' })
                );
            });

            it('should use custom estado when provided', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getProductBatches('prod-001', { estado: 'expired' });

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith(
                    expect.objectContaining({ estado: 'expired' })
                );
            });

            it('should filter by area_id when provided', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getProductBatches('prod-001', { area_id: 'area-002' });

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith(
                    expect.objectContaining({ area_id: 'area-002' })
                );
            });

            it('should enrich batches with expiry information', async () => {
                const batches = [createBatchData()];
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                const result = await service.getProductBatches('prod-001');

                expect(result[0]).toHaveProperty('days_until_expiry');
                expect(result[0]).toHaveProperty('expiry_status');
                expect(result[0]).toHaveProperty('cantidad_disponible');
            });

            it('should calculate days until expiry for each batch', async () => {
                const batches = createBatchList(2);
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                await service.getProductBatches('prod-001');

                expect(service.calculateDaysUntilExpiry).toHaveBeenCalledTimes(2);
            });

            it('should determine expiry status for each batch', async () => {
                const batches = createBatchList(2);
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                await service.getProductBatches('prod-001');

                expect(service.getExpiryStatus).toHaveBeenCalledTimes(2);
            });

            it('should calculate available quantity for each batch', async () => {
                const batches = createBatchList(2);
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                await service.getProductBatches('prod-001');

                expect(service.calculateAvailableBatchQuantity).toHaveBeenCalledTimes(2);
            });

            it('should return enriched batches with valid structure', async () => {
                const batches = [createBatchData()];
                setupBatchRepositoryMock(mocks.batchRepo, batches);
                service.calculateDaysUntilExpiry.mockReturnValue(30);
                service.getExpiryStatus.mockReturnValue('warning');
                service.calculateAvailableBatchQuantity.mockReturnValue(50);

                const result = await service.getProductBatches('prod-001');

                expect(isValidEnrichedBatch(result[0])).toBe(true);
            });

            it('should return empty array when no batches found', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                const result = await service.getProductBatches('prod-001');

                expect(result).toEqual([]);
            });

            it('should preserve original batch data', async () => {
                const batches = [createBatchData({ custom_field: 'value' })];
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                const result = await service.getProductBatches('prod-001');

                expect(result[0]).toHaveProperty('custom_field', 'value');
            });

            it('should handle repository errors', async () => {
                mocks.batchRepo.findAll.mockRejectedValue(new Error('Database error'));

                await expect(service.getProductBatches('prod-001'))
                    .rejects.toThrow('Database error');
            });
        });

        // ====================================================================
        // GET EXPIRING BATCHES TESTS
        // ====================================================================

        describe('getExpiringBatches()', () => {
            beforeEach(() => {
                service.calculateDaysUntilExpiry = jest.fn((date) => {
                    const expiry = new Date(date);
                    const today = new Date();
                    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                });
                service.getExpiryStatus = jest.fn((days) => {
                    if (days < 0) return 'expired';
                    if (days <= 7) return 'critical';
                    if (days <= 30) return 'warning';
                    return 'good';
                });
            });

            it('should get batches expiring within default 30 days', async () => {
                const batches = [createExpiringBatch(20)];
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                await service.getExpiringBatches();

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith(
                    expect.objectContaining({
                        estado: 'active',
                        fecha_vencimiento_lte: expect.any(String)
                    })
                );
            });

            it('should get batches expiring within custom days', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getExpiringBatches(60);

                const call = mocks.batchRepo.findAll.mock.calls[0][0];
                const cutoffDate = new Date(call.fecha_vencimiento_lte);
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() + 60);

                expect(cutoffDate.getDate()).toBe(expectedDate.getDate());
            });

            it('should filter by active estado', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getExpiringBatches();

                expect(mocks.batchRepo.findAll).toHaveBeenCalledWith(
                    expect.objectContaining({ estado: 'active' })
                );
            });

            it('should enrich batches with expiry information', async () => {
                const batches = [createExpiringBatch(15)];
                setupBatchRepositoryMock(mocks.batchRepo, batches);
                service.calculateDaysUntilExpiry.mockReturnValue(15);
                service.getExpiryStatus.mockReturnValue('warning');

                const result = await service.getExpiringBatches();

                expect(result[0]).toHaveProperty('days_until_expiry');
                expect(result[0]).toHaveProperty('expiry_status');
            });

            it('should sort batches by days until expiry (ascending)', async () => {
                const batches = [
                    createExpiringBatch(25, { id: 1 }),
                    createExpiringBatch(5, { id: 2 }),
                    createExpiringBatch(15, { id: 3 })
                ];
                setupBatchRepositoryMock(mocks.batchRepo, batches);
                
                service.calculateDaysUntilExpiry
                    .mockReturnValueOnce(25)
                    .mockReturnValueOnce(5)
                    .mockReturnValueOnce(15);

                const result = await service.getExpiringBatches();

                expect(result[0].days_until_expiry).toBe(5);
                expect(result[1].days_until_expiry).toBe(15);
                expect(result[2].days_until_expiry).toBe(25);
            });

            it('should include expired batches (negative days)', async () => {
                const batches = [createExpiredBatch()];
                setupBatchRepositoryMock(mocks.batchRepo, batches);
                service.calculateDaysUntilExpiry.mockReturnValue(-5);
                service.getExpiryStatus.mockReturnValue('expired');

                const result = await service.getExpiringBatches();

                expect(result).toHaveLength(1);
                expect(result[0].days_until_expiry).toBe(-5);
                expect(result[0].expiry_status).toBe('expired');
            });

            it('should return empty array when no expiring batches', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                const result = await service.getExpiringBatches();

                expect(result).toEqual([]);
            });

            it('should handle repository errors', async () => {
                mocks.batchRepo.findAll.mockRejectedValue(new Error('Database error'));

                await expect(service.getExpiringBatches())
                    .rejects.toThrow('Database error');
            });

            it('should handle 0 days parameter', async () => {
                setupBatchRepositoryMock(mocks.batchRepo, []);

                await service.getExpiringBatches(0);

                const call = mocks.batchRepo.findAll.mock.calls[0][0];
                const cutoffDate = new Date(call.fecha_vencimiento_lte);
                const today = new Date();

                expect(cutoffDate.getDate()).toBe(today.getDate());
            });

            it('should calculate days for each batch before sorting', async () => {
                const batches = createBatchList(3);
                setupBatchRepositoryMock(mocks.batchRepo, batches);

                await service.getExpiringBatches();

                expect(service.calculateDaysUntilExpiry).toHaveBeenCalledTimes(3);
            });
        });

        // ====================================================================
        // CALCULATE AVAILABLE BATCH QUANTITY TESTS
        // ====================================================================

        describe('calculateAvailableBatchQuantity()', () => {
            it('should return cantidad_lote when available', () => {
                const batch = createBatchData({ cantidad_lote: 100 });

                const result = service.calculateAvailableBatchQuantity(batch);

                expect(result).toBe(100);
            });

            it('should return 0 when cantidad_lote is 0', () => {
                const batch = createBatchData({ cantidad_lote: 0 });

                const result = service.calculateAvailableBatchQuantity(batch);

                expect(result).toBe(0);
            });

            it('should return 0 when cantidad_lote is undefined', () => {
                const batch = createBatchData();
                delete batch.cantidad_lote;

                const result = service.calculateAvailableBatchQuantity(batch);

                expect(result).toBe(0);
            });

            it('should return 0 when cantidad_lote is null', () => {
                const batch = createBatchData({ cantidad_lote: null });

                const result = service.calculateAvailableBatchQuantity(batch);

                expect(result).toBe(0);
            });

            it('should handle decimal quantities', () => {
                const batch = createBatchData({ cantidad_lote: 50.5 });

                const result = service.calculateAvailableBatchQuantity(batch);

                expect(result).toBe(50.5);
            });
        });
    });

    // ========================================================================
    // PHASE 4: ALERTS & CALCULATIONS
    // ========================================================================

    describe('Phase 4: Alerts & Calculations', () => {

        // ====================================================================
        // CHECK AND NOTIFY COUNT ALERTS TESTS
        // ====================================================================

        describe('checkAndNotifyCountAlerts()', () => {
            beforeEach(() => {
                service.getProductStock = jest.fn().mockResolvedValue({
                    cantidad_actual: 50,
                    cantidad_minima: 10
                });
                service.checkCountAlerts = jest.fn().mockReturnValue([]);
                service.notifyCountAlert = jest.fn();
            });

            it('should get current stock for product', async () => {
                await service.checkAndNotifyCountAlerts('prod-001');

                expect(service.getProductStock).toHaveBeenCalledWith('prod-001');
            });

            it('should check count alerts', async () => {
                const stockInfo = { cantidad_actual: 50 };
                service.getProductStock.mockResolvedValue(stockInfo);

                await service.checkAndNotifyCountAlerts('prod-001');

                expect(service.checkCountAlerts).toHaveBeenCalledWith(stockInfo);
            });

            it('should not notify when no alerts', async () => {
                service.checkCountAlerts.mockReturnValue([]);

                await service.checkAndNotifyCountAlerts('prod-001');

                expect(service.notifyCountAlert).not.toHaveBeenCalled();
            });

            it('should notify for each alert', async () => {
                const alerts = [
                    { type: 'low_count', level: 'warning' },
                    { type: 'critical_count', level: 'critical' }
                ];
                service.checkCountAlerts.mockReturnValue(alerts);

                await service.checkAndNotifyCountAlerts('prod-001');

                expect(service.notifyCountAlert).toHaveBeenCalledTimes(2);
                expect(service.notifyCountAlert).toHaveBeenCalledWith('prod-001', alerts[0]);
                expect(service.notifyCountAlert).toHaveBeenCalledWith('prod-001', alerts[1]);
            });

            it('should handle single alert', async () => {
                const alerts = [{ type: 'out_of_count', level: 'critical' }];
                service.checkCountAlerts.mockReturnValue(alerts);

                await service.checkAndNotifyCountAlerts('prod-001');

                expect(service.notifyCountAlert).toHaveBeenCalledTimes(1);
            });

            it('should handle errors from getProductStock', async () => {
                service.getProductStock.mockRejectedValue(new Error('Stock error'));

                await expect(service.checkAndNotifyCountAlerts('prod-001'))
                    .rejects.toThrow('Stock error');
            });
        });

        // ====================================================================
        // CHECK COUNT ALERTS TESTS
        // ====================================================================

        describe('checkCountAlerts()', () => {
            it('should return out_of_count alert when cantidad is 0', () => {
                const countInfo = { cantidad_actual: 0, cantidad_minima: 10 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toHaveLength(1);
                expect(alerts[0]).toMatchObject({
                    type: 'out_of_count',
                    level: 'critical',
                    message: 'Producto sin existencias en el conteo'
                });
            });

            it('should return critical_count alert when below threshold', () => {
                service.stockThresholds.critical = 5;
                const countInfo = { cantidad_actual: 3, cantidad_minima: 10 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toHaveLength(1);
                expect(alerts[0]).toMatchObject({
                    type: 'critical_count',
                    level: 'critical',
                    message: 'Conteo crítico: 3 unidades'
                });
            });

            it('should return low_count alert when below minima', () => {
                const countInfo = { cantidad_actual: 8, cantidad_minima: 10 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toHaveLength(1);
                expect(alerts[0]).toMatchObject({
                    type: 'low_count',
                    level: 'warning',
                    message: 'Conteo bajo: 8 unidades (mínimo: 10)'
                });
            });

            it('should return empty array when stock is good', () => {
                const countInfo = { cantidad_actual: 50, cantidad_minima: 10 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toEqual([]);
            });

            it('should prioritize out_of_count over other alerts', () => {
                const countInfo = { cantidad_actual: 0, cantidad_minima: 10 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts[0].type).toBe('out_of_count');
            });

            it('should handle undefined cantidad_minima', () => {
                const countInfo = { cantidad_actual: 3 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toHaveLength(1);
                expect(alerts[0].type).toBe('critical_count');
            });

            it('should handle null values', () => {
                const countInfo = { cantidad_actual: null, cantidad_minima: null };

                const alerts = service.checkCountAlerts(countInfo);

                expect(alerts).toHaveLength(1);
                expect(alerts[0].type).toBe('out_of_count');
            });

            it('should validate alert structure', () => {
                const countInfo = { cantidad_actual: 0 };

                const alerts = service.checkCountAlerts(countInfo);

                expect(isValidAlert(alerts[0])).toBe(true);
            });
        });

        // ====================================================================
        // NOTIFY COUNT ALERT TESTS
        // ====================================================================

        describe('notifyCountAlert()', () => {
            beforeEach(() => {
                // Mock mostrarAlertaBurbuja (would be imported from logs.js)
                global.mostrarAlertaBurbuja = jest.fn();
                service.stockAlerts.clear();
            });

            afterEach(() => {
                delete global.mostrarAlertaBurbuja;
            });

            it('should add alert to stockAlerts map', () => {
                const alert = { type: 'low_count', level: 'warning', message: 'Low stock' };

                service.notifyCountAlert('prod-001', alert);

                expect(service.stockAlerts.has('prod-001_low_count')).toBe(true);
            });

            it('should call mostrarAlertaBurbuja with warning type', () => {
                const alert = { type: 'low_count', level: 'warning', message: 'Low stock' };

                service.notifyCountAlert('prod-001', alert);

                expect(global.mostrarAlertaBurbuja).toHaveBeenCalledWith('Low stock', 'warning');
            });

            it('should call mostrarAlertaBurbuja with error type for critical', () => {
                const alert = { type: 'out_of_count', level: 'critical', message: 'No stock' };

                service.notifyCountAlert('prod-001', alert);

                expect(global.mostrarAlertaBurbuja).toHaveBeenCalledWith('No stock', 'error');
            });

            it('should emit countAlert event', () => {
                const alert = { type: 'low_count', level: 'warning', message: 'Low stock' };

                service.notifyCountAlert('prod-001', alert);

                expect(service.emit).toHaveBeenCalledWith('countAlert', {
                    productId: 'prod-001',
                    alert
                });
            });

            it('should not notify duplicate alert within time window', () => {
                const alert = { type: 'low_count', level: 'warning', message: 'Low stock' };
                
                service.notifyCountAlert('prod-001', alert);
                const firstCallCount = global.mostrarAlertaBurbuja.mock.calls.length;
                
                service.notifyCountAlert('prod-001', alert);
                const secondCallCount = global.mostrarAlertaBurbuja.mock.calls.length;

                expect(secondCallCount).toBe(firstCallCount);
            });

            it('should store timestamp for each alert', () => {
                const alert = { type: 'low_count', level: 'warning', message: 'Low stock' };
                const beforeTime = Date.now();

                service.notifyCountAlert('prod-001', alert);

                const timestamp = service.stockAlerts.get('prod-001_low_count');
                expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
                expect(timestamp).toBeLessThanOrEqual(Date.now());
            });
        });

        // ====================================================================
        // CALCULATE STOCK TOTALS TESTS
        // ====================================================================

        describe('calculateStockTotals()', () => {
            it('should calculate totals from inventory list', () => {
                const inventory = [
                    createInventoryData({ cantidad_actual: 100 }),
                    createInventoryData({ cantidad_actual: 50 }),
                    createInventoryData({ cantidad_actual: 75 })
                ];

                const totals = service.calculateStockTotals(inventory);

                expect(totals.cantidad_actual).toBe(225);
                expect(totals.items_count).toBe(3);
            });

            it('should find maximum cantidad_minima', () => {
                const inventory = [
                    createInventoryData({ cantidad_minima: 10 }),
                    createInventoryData({ cantidad_minima: 25 }),
                    createInventoryData({ cantidad_minima: 15 })
                ];

                const totals = service.calculateStockTotals(inventory);

                expect(totals.cantidad_minima).toBe(25);
            });

            it('should find maximum cantidad_maxima', () => {
                const inventory = [
                    createInventoryData({ cantidad_maxima: 500 }),
                    createInventoryData({ cantidad_maxima: 1000 }),
                    createInventoryData({ cantidad_maxima: 750 })
                ];

                const totals = service.calculateStockTotals(inventory);

                expect(totals.cantidad_maxima).toBe(1000);
            });

            it('should find most recent fecha_actualizacion', () => {
                const inventory = [
                    createInventoryData({ fecha_actualizacion: '2025-10-01T10:00:00Z' }),
                    createInventoryData({ fecha_actualizacion: '2025-10-06T10:00:00Z' }),
                    createInventoryData({ fecha_actualizacion: '2025-10-03T10:00:00Z' })
                ];

                const totals = service.calculateStockTotals(inventory);

                expect(totals.ultima_actualizacion).toBe('2025-10-06T10:00:00Z');
            });

            it('should handle empty inventory', () => {
                const totals = service.calculateStockTotals([]);

                expect(totals).toEqual({
                    cantidad_actual: 0,
                    cantidad_minima: 0,
                    cantidad_maxima: 0,
                    items_count: 0,
                    ultima_actualizacion: null
                });
            });

            it('should handle null cantidad values', () => {
                const inventory = [
                    createInventoryData({ cantidad_actual: null }),
                    createInventoryData({ cantidad_actual: 50 })
                ];

                const totals = service.calculateStockTotals(inventory);

                expect(totals.cantidad_actual).toBe(50);
            });

            it('should handle missing fecha_actualizacion', () => {
                const inventory = [
                    createInventoryData(),
                    createInventoryData()
                ];
                delete inventory[0].fecha_actualizacion;
                delete inventory[1].fecha_actualizacion;

                const totals = service.calculateStockTotals(inventory);

                expect(totals.ultima_actualizacion).toBeNull();
            });

            it('should return correct items_count', () => {
                const inventory = createInventoryList(5);

                const totals = service.calculateStockTotals(inventory);

                expect(totals.items_count).toBe(5);
            });
        });

        // ====================================================================
        // GET COUNT STATUS TESTS
        // ====================================================================

        describe('getCountStatus()', () => {
            it('should return out_of_count when cantidad is 0', () => {
                const item = { cantidad_actual: 0, cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('out_of_count');
            });

            it('should return critical when below threshold', () => {
                service.stockThresholds.critical = 5;
                const item = { cantidad_actual: 3, cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('critical');
            });

            it('should return low when below minima', () => {
                const item = { cantidad_actual: 8, cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('low');
            });

            it('should return good when stock is adequate', () => {
                const item = { cantidad_actual: 50, cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('good');
            });

            it('should handle undefined cantidad_actual', () => {
                const item = { cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('out_of_count');
            });

            it('should handle null cantidad_actual', () => {
                const item = { cantidad_actual: null, cantidad_minima: 10 };

                const status = service.getCountStatus(item);

                expect(status).toBe('out_of_count');
            });
        });
    });

    // ========================================================================
    // PHASE 5: VALIDATIONS & UTILITIES
    // ========================================================================

    describe('Phase 5: Validations & Utilities', () => {

        // ====================================================================
        // VALIDATE COUNT DATA TESTS
        // ====================================================================

        describe('validateCountData()', () => {
            it('should validate valid count data', () => {
                const countData = createCountData({ cantidad: 50 });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should require cantidad field', () => {
                const countData = createCountData();
                delete countData.cantidad;

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('requerido');
            });

            it('should validate cantidad type as number', () => {
                const countData = createCountData({ cantidad: '50' });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('number');
            });

            it('should validate cantidad is non-negative', () => {
                const countData = createCountData({ cantidad: -5 });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });

            it('should accept cantidad_minima as optional', () => {
                const countData = createCountData({ cantidad: 50 });
                delete countData.cantidad_minima;

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(true);
            });

            it('should validate cantidad_minima type when provided', () => {
                const countData = createCountData({ 
                    cantidad: 50,
                    cantidad_minima: '10'
                });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad_minima');
                expect(result.errors[0]).toContain('number');
            });

            it('should validate cantidad_maxima type when provided', () => {
                const countData = createCountData({ 
                    cantidad: 50,
                    cantidad_maxima: '100'
                });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad_maxima');
                expect(result.errors[0]).toContain('number');
            });

            it('should accept zero as valid cantidad', () => {
                const countData = createCountData({ cantidad: 0 });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(true);
            });

            it('should accept decimal quantities', () => {
                const countData = createCountData({ cantidad: 25.5 });

                const result = service.validateCountData(countData);

                expect(result.isValid).toBe(true);
            });
        });

        // ====================================================================
        // VALIDATE ENTRY DATA TESTS
        // ====================================================================

        describe('validateEntryData()', () => {
            it('should validate valid entry data', () => {
                const entryData = createEntryData();

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should require items array', () => {
                const entryData = createEntryData();
                delete entryData.items;

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Se requiere al menos un item');
            });

            it('should require non-empty items array', () => {
                const entryData = createEntryData({ items: [] });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Se requiere al menos un item');
            });

            it('should require items to be an array', () => {
                const entryData = createEntryData();
                entryData.items = 'not-an-array';

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Se requiere al menos un item');
            });

            it('should validate each item has product_id', () => {
                const entryData = createEntryData({
                    items: [{ cantidad: 10 }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('product_id');
                expect(result.errors[0]).toContain('requerido');
            });

            it('should validate each item has cantidad', () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001' }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('requerido');
            });

            it('should validate cantidad is a number', () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: '10' }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('number');
            });

            it('should validate cantidad is positive', () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 0 }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
            });

            it('should validate cantidad minimum value', () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 0.001 }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
            });

            it('should include item index in error messages', () => {
                const entryData = createEntryData({
                    items: [
                        { product_id: 'prod-001', cantidad: 10 },
                        { product_id: 'prod-002' } // Missing cantidad
                    ]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Item 2');
            });

            it('should validate all items and accumulate errors', () => {
                const entryData = createEntryData({
                    items: [
                        { cantidad: 10 }, // Missing product_id
                        { product_id: 'prod-002' } // Missing cantidad
                    ]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });

            it('should accept decimal quantities', () => {
                const entryData = createEntryData({
                    items: [{ product_id: 'prod-001', cantidad: 10.5 }]
                });

                const result = service.validateEntryData(entryData);

                expect(result.isValid).toBe(true);
            });
        });

        // ====================================================================
        // VALIDATE EXIT DATA TESTS
        // ====================================================================

        describe('validateExitData()', () => {
            it('should validate valid exit data', () => {
                const exitData = createExitData();

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should require items array', () => {
                const exitData = createExitData();
                delete exitData.items;

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Se requiere al menos un item');
            });

            it('should require non-empty items array', () => {
                const exitData = createExitData({ items: [] });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Se requiere al menos un item');
            });

            it('should validate each item has product_id', () => {
                const exitData = createExitData({
                    items: [{ cantidad: 10 }]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('product_id');
                expect(result.errors[0]).toContain('requerido');
            });

            it('should validate each item has cantidad', () => {
                const exitData = createExitData({
                    items: [{ product_id: 'prod-001' }]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('requerido');
            });

            it('should validate cantidad is a number', () => {
                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: '10' }]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('cantidad');
                expect(result.errors[0]).toContain('number');
            });

            it('should validate cantidad is positive', () => {
                const exitData = createExitData({
                    items: [{ product_id: 'prod-001', cantidad: 0 }]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
            });

            it('should include item index in error messages', () => {
                const exitData = createExitData({
                    items: [
                        { product_id: 'prod-001', cantidad: 10 },
                        { product_id: 'prod-002' } // Missing cantidad
                    ]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors[0]).toContain('Item 2');
            });

            it('should validate all items and accumulate errors', () => {
                const exitData = createExitData({
                    items: [
                        { cantidad: 10 }, // Missing product_id
                        { product_id: 'prod-002' } // Missing cantidad
                    ]
                });

                const result = service.validateExitData(exitData);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });
        });

        // ====================================================================
        // ENRICH INVENTORY DATA TESTS
        // ====================================================================

        describe('enrichInventoryData()', () => {
            beforeEach(() => {
                service.checkCountAlerts = jest.fn().mockReturnValue([]);
                service.getCountStatus = jest.fn().mockReturnValue('good');
                service.calculateDaysUntilExpiry = jest.fn().mockReturnValue(30);
                service.getExpiryStatus = jest.fn().mockReturnValue('warning');
            });

            it('should enrich inventory data with alerts', async () => {
                const inventory = [createInventoryData()];
                const alerts = [{ type: 'low_count', level: 'warning' }];
                service.checkCountAlerts.mockReturnValue(alerts);

                const result = await service.enrichInventoryData(inventory);

                expect(result[0].alerts).toEqual(alerts);
            });

            it('should enrich inventory data with count status', async () => {
                const inventory = [createInventoryData()];
                service.getCountStatus.mockReturnValue('critical');

                const result = await service.enrichInventoryData(inventory);

                expect(result[0].count_status).toBe('critical');
            });

            it('should add expiry info when fecha_vencimiento exists', async () => {
                const inventory = [createInventoryData({ 
                    fecha_vencimiento: '2025-11-05T00:00:00Z'
                })];

                const result = await service.enrichInventoryData(inventory);

                expect(result[0]).toHaveProperty('expiry_info');
                expect(result[0].expiry_info).toHaveProperty('days_until_expiry');
                expect(result[0].expiry_info).toHaveProperty('expiry_status');
            });

            it('should not add expiry info when fecha_vencimiento is missing', async () => {
                const inventory = [createInventoryData()];
                delete inventory[0].fecha_vencimiento;

                const result = await service.enrichInventoryData(inventory);

                expect(result[0]).not.toHaveProperty('expiry_info');
            });

            it('should preserve original item data', async () => {
                const inventory = [createInventoryData({ custom_field: 'value' })];

                const result = await service.enrichInventoryData(inventory);

                expect(result[0]).toHaveProperty('custom_field', 'value');
            });

            it('should process multiple items', async () => {
                const inventory = createInventoryList(3);

                const result = await service.enrichInventoryData(inventory);

                expect(result).toHaveLength(3);
                expect(service.checkCountAlerts).toHaveBeenCalledTimes(3);
                expect(service.getCountStatus).toHaveBeenCalledTimes(3);
            });

            it('should handle empty inventory', async () => {
                const result = await service.enrichInventoryData([]);

                expect(result).toEqual([]);
            });

            it('should call checkCountAlerts for each item', async () => {
                const inventory = createInventoryList(2);

                await service.enrichInventoryData(inventory);

                expect(service.checkCountAlerts).toHaveBeenCalledTimes(2);
            });

            it('should call getCountStatus for each item', async () => {
                const inventory = createInventoryList(2);

                await service.enrichInventoryData(inventory);

                expect(service.getCountStatus).toHaveBeenCalledTimes(2);
            });

            it('should calculate expiry days when fecha_vencimiento present', async () => {
                const inventory = [createInventoryData({ 
                    fecha_vencimiento: '2025-11-05T00:00:00Z'
                })];

                await service.enrichInventoryData(inventory);

                expect(service.calculateDaysUntilExpiry).toHaveBeenCalledWith('2025-11-05T00:00:00Z');
            });
        });

        // ====================================================================
        // CALCULATE DAYS UNTIL EXPIRY TESTS
        // ====================================================================

        describe('calculateDaysUntilExpiry()', () => {
            it('should calculate days until expiry', () => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);
                const expiryDate = futureDate.toISOString();

                const days = service.calculateDaysUntilExpiry(expiryDate);

                expect(days).toBeGreaterThanOrEqual(29);
                expect(days).toBeLessThanOrEqual(31);
            });

            it('should return negative days for expired dates', () => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 10);
                const expiryDate = pastDate.toISOString();

                const days = service.calculateDaysUntilExpiry(expiryDate);

                expect(days).toBeLessThan(0);
                expect(days).toBeGreaterThanOrEqual(-11);
                expect(days).toBeLessThanOrEqual(-9);
            });

            it('should return Infinity when no expiry date', () => {
                const days = service.calculateDaysUntilExpiry(null);

                expect(days).toBe(Infinity);
            });

            it('should handle undefined expiry date', () => {
                const days = service.calculateDaysUntilExpiry(undefined);

                expect(days).toBe(Infinity);
            });

            it('should return 0 for today', () => {
                const today = new Date().toISOString().split('T')[0];

                const days = service.calculateDaysUntilExpiry(today);

                expect(days).toBeGreaterThanOrEqual(0);
                expect(days).toBeLessThanOrEqual(1);
            });

            it('should ceil fractional days', () => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                date.setHours(date.getHours() - 1); // Slightly less than 1 day
                const expiryDate = date.toISOString();

                const days = service.calculateDaysUntilExpiry(expiryDate);

                expect(days).toBe(1); // Should ceil to 1
            });
        });

        // ====================================================================
        // GET EXPIRY STATUS TESTS
        // ====================================================================

        describe('getExpiryStatus()', () => {
            it('should return expired for negative days', () => {
                const status = service.getExpiryStatus(-1);

                expect(status).toBe('expired');
            });

            it('should return critical for 7 days or less', () => {
                expect(service.getExpiryStatus(7)).toBe('critical');
                expect(service.getExpiryStatus(3)).toBe('critical');
                expect(service.getExpiryStatus(0)).toBe('critical');
            });

            it('should return warning for 8-30 days', () => {
                expect(service.getExpiryStatus(8)).toBe('warning');
                expect(service.getExpiryStatus(15)).toBe('warning');
                expect(service.getExpiryStatus(30)).toBe('warning');
            });

            it('should return good for more than 30 days', () => {
                expect(service.getExpiryStatus(31)).toBe('good');
                expect(service.getExpiryStatus(60)).toBe('good');
                expect(service.getExpiryStatus(100)).toBe('good');
            });

            it('should handle boundary at 7 days', () => {
                expect(service.getExpiryStatus(7)).toBe('critical');
                expect(service.getExpiryStatus(8)).toBe('warning');
            });

            it('should handle boundary at 30 days', () => {
                expect(service.getExpiryStatus(30)).toBe('warning');
                expect(service.getExpiryStatus(31)).toBe('good');
            });
        });

        // ====================================================================
        // LOAD STOCK THRESHOLDS TESTS
        // ====================================================================

        describe('loadStockThresholds()', () => {
            beforeEach(() => {
                mockLocalStorage();
            });

            it('should load thresholds from localStorage', async () => {
                const config = { critical: 10, warning: 20 };
                localStorage.setItem('stock_thresholds', JSON.stringify(config));

                await service.loadStockThresholds();

                expect(service.stockThresholds.critical).toBe(10);
                expect(service.stockThresholds.warning).toBe(20);
            });

            it('should merge with default thresholds', async () => {
                service.stockThresholds = { critical: 5, warning: 10, custom: 'value' };
                const config = { critical: 10 };
                localStorage.setItem('stock_thresholds', JSON.stringify(config));

                await service.loadStockThresholds();

                expect(service.stockThresholds.critical).toBe(10);
                expect(service.stockThresholds.warning).toBe(10); // Preserved
                expect(service.stockThresholds.custom).toBe('value'); // Preserved
            });

            it('should handle empty localStorage', async () => {
                const originalThresholds = { ...service.stockThresholds };

                await service.loadStockThresholds();

                expect(service.stockThresholds).toEqual(originalThresholds);
            });

            it('should handle invalid JSON', async () => {
                localStorage.setItem('stock_thresholds', 'invalid-json');
                const originalThresholds = { ...service.stockThresholds };

                await service.loadStockThresholds();

                expect(service.stockThresholds).toEqual(originalThresholds);
            });

            it('should log warning on error', async () => {
                localStorage.setItem('stock_thresholds', 'invalid-json');
                service.log = jest.fn();

                await service.loadStockThresholds();

                expect(service.log).toHaveBeenCalledWith(
                    expect.stringContaining('Error cargando umbrales'),
                    'warn'
                );
            });
        });

        // ====================================================================
        // SETUP INVENTORY LISTENERS TESTS
        // ====================================================================

        describe('setupInventoryListeners()', () => {
            let windowMock;

            beforeEach(() => {
                windowMock = mockWindowEvents();
            });

            afterEach(() => {
                if (windowMock && windowMock.cleanup) {
                    windowMock.cleanup();
                }
            });

            it('should setup online listener', () => {
                service.setupInventoryListeners();

                expect(window.addEventListener).toHaveBeenCalledWith(
                    'online',
                    expect.any(Function)
                );
            });

            it('should setup offline listener', () => {
                service.setupInventoryListeners();

                expect(window.addEventListener).toHaveBeenCalledWith(
                    'offline',
                    expect.any(Function)
                );
            });

            it('should emit connectionRestored on online event', () => {
                service.setupInventoryListeners();

                windowMock.triggerEvent('online');

                expect(service.emit).toHaveBeenCalledWith('connectionRestored');
            });

            it('should emit connectionLost on offline event', () => {
                service.setupInventoryListeners();

                windowMock.triggerEvent('offline');

                expect(service.emit).toHaveBeenCalledWith('connectionLost');
            });

            it('should log on connection restored', () => {
                service.log = jest.fn();
                service.setupInventoryListeners();

                windowMock.triggerEvent('online');

                expect(service.log).toHaveBeenCalledWith(
                    expect.stringContaining('Conexión restaurada')
                );
            });

            it('should log on connection lost', () => {
                service.log = jest.fn();
                service.setupInventoryListeners();

                windowMock.triggerEvent('offline');

                expect(service.log).toHaveBeenCalledWith(
                    expect.stringContaining('Conexión perdida')
                );
            });
        });

        // ====================================================================
        // REGISTER COUNT MOVEMENT TESTS
        // ====================================================================

        describe('registerCountMovement()', () => {
            beforeEach(() => {
                mockLocalStorage();
                service.generateId = jest.fn().mockReturnValue('mov-001');
                service.getCurrentUserId = jest.fn().mockReturnValue('user-001');
                service.getCurrentAreaId = jest.fn().mockReturnValue('area-001');
            });

            it('should register count movement', async () => {
                const movementData = {
                    product_id: 'prod-001',
                    type: 'entry',
                    cantidad: 10
                };

                await service.registerCountMovement(movementData);

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements).toHaveLength(1);
                expect(movements[0]).toMatchObject(movementData);
            });

            it('should add id to movement', async () => {
                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements[0].id).toBe('mov-001');
            });

            it('should add fecha to movement', async () => {
                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements[0]).toHaveProperty('fecha');
                expect(new Date(movements[0].fecha)).toBeInstanceOf(Date);
            });

            it('should add usuario_id to movement', async () => {
                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements[0].usuario_id).toBe('user-001');
            });

            it('should add area_id to movement', async () => {
                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements[0].area_id).toBe('area-001');
            });

            it('should emit countMovement event', async () => {
                const movementData = { type: 'entry' };

                await service.registerCountMovement(movementData);

                expect(service.emit).toHaveBeenCalledWith(
                    'countMovement',
                    expect.objectContaining(movementData)
                );
            });

            it('should append to existing movements', async () => {
                localStorage.setItem('count_movements', JSON.stringify([
                    { id: 'mov-000', type: 'exit' }
                ]));

                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements).toHaveLength(2);
            });

            it('should limit movements to 1000', async () => {
                const existing = Array.from({ length: 1000 }, (_, i) => ({ id: `mov-${i}` }));
                localStorage.setItem('count_movements', JSON.stringify(existing));

                await service.registerCountMovement({ type: 'entry' });

                const movements = JSON.parse(localStorage.getItem('count_movements'));
                expect(movements).toHaveLength(1000);
                expect(movements[999].id).toBe('mov-001');
            });

            it('should handle localStorage errors', async () => {
                service.log = jest.fn();
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = jest.fn().mockImplementation(() => {
                    throw new Error('Storage error');
                });

                await service.registerCountMovement({ type: 'entry' });

                expect(service.log).toHaveBeenCalledWith(
                    expect.stringContaining('Error registrando movimiento'),
                    'error'
                );

                // Restore original setItem
                localStorage.setItem = originalSetItem;
            });

            it('should validate movement structure', async () => {
                const movementData = {
                    product_id: 'prod-001',
                    type: 'entry',
                    cantidad: 10
                };

                // Setup fresh localStorage
                localStorage.setItem('count_movements', '[]');
                await service.registerCountMovement(movementData);

                const movementsStr = localStorage.getItem('count_movements');
                expect(movementsStr).not.toBeNull();
                
                const movements = JSON.parse(movementsStr);
                expect(movements).toHaveLength(1);
                expect(isValidMovement(movements[0])).toBe(true);
            });
        });
    });
});
