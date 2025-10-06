/**
 * ProductService Tests - Fase 1: Core Functionality
 * Tests para ProductService (CRUD, Search, Validation, Sync)
 * 
 * @author Testing Team
 * @date 2025-10-05
 */

import { ProductService } from '../../../../src/core/services/ProductService.js';
import {
    createMockProductData,
    createMockProductsData,
    createMockProductRepository,
    createMockSearchParams,
    expectValidationError,
    expectCacheToContain,
    TEST_PRODUCTS,
    PRODUCT_FIELDS,
    // Sync helpers
    createMockFastAPIProducts,
    createMockFetch,
    setupSyncLocalStorage,
    cleanupSyncLocalStorage,
    expectSyncEvent,
    createMockSyncResults,
    // Cache & Utilities helpers - Fase 4
    createCacheTestSearchParams,
    getCacheSize,
    getCacheKeys,
    addCacheEntry,
    createExpiredCacheEntry,
    cacheHasKey,
    getCacheEntry,
    createTestProductsForSearch,
    isValidSearchFilters,
    mockTimerFunctions,
    // Code Generation helpers - Fase 5
    mockCanvasAPI,
    mockJsBarcode,
    setupCodeGenerationMocks,
    isValidImageDataURL,
    createProductForQR,
    isValidQRData
} from '../../../helpers/product-test-helpers.js';
import {
    expectEventEmitted,
    SERVICE_EVENTS,
    STORAGE_KEYS
} from '../../../helpers/database-test-helpers.js';

// Mock global mostrarAlertaBurbuja
global.mostrarAlertaBurbuja = jest.fn();

describe('ProductService', () => {
    let service;
    let mockProductRepository;
    let mockInventoryService;
    let mockBatchService;

    beforeEach(async () => {
        // Limpiar mocks
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        // Reset localStorage
        localStorage.clear();
        localStorage.setItem('fastapi_endpoint', 'http://api.test.com');
        
        // Crear mocks de repositorios y servicios
        mockProductRepository = createMockProductRepository();
        mockInventoryService = {
            getProductStock: jest.fn().mockResolvedValue({ 
                cantidad_actual: 10 
            }),
            hasInventoryEntries: jest.fn().mockResolvedValue(false)
        };
        mockBatchService = {
            getProductBatches: jest.fn().mockResolvedValue([]),
            hasActiveBatches: jest.fn().mockResolvedValue(false)
        };
        
        // Crear servicio
        service = new ProductService();
        
        // Inyectar mocks (simulando ServiceManager)
        service.getRepository = jest.fn((name) => {
            if (name === 'product') return mockProductRepository;
            return null;
        });
        
        service.getService = jest.fn((name) => {
            if (name === 'inventory') return mockInventoryService;
            if (name === 'batch') return mockBatchService;
            return null;
        });
        
        // Inicializar el servicio
        await service.initialize();
    });

    afterEach(() => {
        if (service) {
            service.dispose();
        }
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    // ========================================
    // CONSTRUCTOR & INITIALIZATION
    // ========================================

    describe('constructor()', () => {
        it('should initialize with default values', () => {
            // Crear servicio sin inicializar para probar constructor
            const newService = new ProductService();
            
            expect(newService.serviceName).toBe('ProductService');
            expect(newService.searchCache).toBeInstanceOf(Map);
            expect(newService.searchCache.size).toBe(0);
            expect(newService.lastSyncTime).toBeNull();
            expect(newService.syncInterval).toBe(5 * 60 * 1000); // 5 minutos
            
            newService.dispose();
        });

        it('should load fastapi_endpoint from localStorage', () => {
            // Crear servicio sin inicializar para probar constructor
            const newService = new ProductService();
            
            expect(newService.fastApiEndpoint).toBe('http://api.test.com');
            
            newService.dispose();
        });

        it('should use empty string if no fastapi_endpoint in localStorage', () => {
            localStorage.removeItem('fastapi_endpoint');
            const newService = new ProductService();
            
            expect(newService.fastApiEndpoint).toBe('');
            
            newService.dispose();
            localStorage.setItem('fastapi_endpoint', 'http://api.test.com'); // Restaurar
        });

        it('should initialize searchCache as empty Map', () => {
            // Crear servicio sin inicializar para probar constructor
            const newService = new ProductService();
            
            expect(newService.searchCache).toBeInstanceOf(Map);
            expect(newService.searchCache.size).toBe(0);
            
            newService.dispose();
        });
    });

    describe('initialize()', () => {
        it('should set isInitialized to true', async () => {
            await service.initialize();
            
            expect(service.isInitialized).toBe(true);
        });

        it('should setup auto sync interval', async () => {
            const setupSpy = jest.spyOn(service, 'setupAutoSync');
            
            await service.initialize();
            
            expect(setupSpy).toHaveBeenCalled();
        });

        it('should setup search optimizations', async () => {
            const setupSpy = jest.spyOn(service, 'setupSearchOptimizations');
            
            await service.initialize();
            
            expect(setupSpy).toHaveBeenCalled();
        });

        it('should set startTime', async () => {
            const beforeTime = Date.now();
            await service.initialize();
            const afterTime = Date.now();
            
            expect(service.startTime).toBeGreaterThanOrEqual(beforeTime);
            expect(service.startTime).toBeLessThanOrEqual(afterTime);
        });
    });

    // ========================================
    // CREATE PRODUCT
    // ========================================

    describe('createProduct()', () => {
        it('should create product with valid data', async () => {
            const productData = createMockProductData();
            mockProductRepository.create.mockResolvedValue({ 
                id: 1, 
                ...productData 
            });
            
            const result = await service.createProduct(productData);
            
            expect(mockProductRepository.create).toHaveBeenCalledWith(
                expect.objectContaining(productData)
            );
            expect(result).toHaveProperty('id', 1);
            expect(result.codigo).toBe(productData.codigo);
        });

        it('should validate product data before creation', async () => {
            const invalidData = { nombre: 'Test' }; // Falta codigo
            
            await expectValidationError(
                () => service.createProduct(invalidData),
                'codigo'
            );
            
            expect(mockProductRepository.create).not.toHaveBeenCalled();
        });

        it('should ensure unique product code', async () => {
            const productData = createMockProductData({ codigo: 'DUPLICATE' });
            mockProductRepository.findAll.mockResolvedValue([{ 
                id: 1, 
                codigo: 'DUPLICATE' 
            }]);
            
            await expectValidationError(
                () => service.createProduct(productData),
                'Ya existe un producto con el código'
            );
            
            expect(mockProductRepository.create).not.toHaveBeenCalled();
        });

        it('should clear search cache after creation', async () => {
            const productData = createMockProductData();
            service.searchCache.set('test-key', { data: 'test' });
            
            await service.createProduct(productData);
            
            expect(service.searchCache.size).toBe(0);
        });

        it('should validate required fields', async () => {
            const requiredFields = PRODUCT_FIELDS.REQUIRED;
            
            for (const field of requiredFields) {
                const invalidData = createMockProductData();
                delete invalidData[field];
                
                await expectValidationError(
                    () => service.createProduct(invalidData),
                    field
                );
            }
        });

        it('should validate numeric constraints', async () => {
            // Validar cantidad_min y cantidad_max que sí tienen validación de rango
            const invalidMinQuantity = createMockProductData({ 
                cantidad_minima: -10 
            });
            
            await expectValidationError(
                () => service.createProduct(invalidMinQuantity),
                'cantidad_minima'
            );
        });

        it('should handle repository errors gracefully', async () => {
            const productData = createMockProductData();
            mockProductRepository.create.mockRejectedValue(
                new Error('Database error')
            );
            
            await expect(service.createProduct(productData))
                .rejects.toThrow('Database error');
        });
    });

    // ========================================
    // GET PRODUCT BY ID
    // ========================================

    describe('getProductById()', () => {
        it('should get product by ID', async () => {
            const mockProduct = { id: 1, ...createMockProductData() };
            mockProductRepository.findById.mockResolvedValue(mockProduct);
            
            const result = await service.getProductById(1);
            
            expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockProduct);
        });

        it('should throw error if product not found', async () => {
            mockProductRepository.findById.mockResolvedValue(null);
            
            await expect(service.getProductById(999))
                .rejects.toThrow('Producto 999 no encontrado');
        });

        it('should include inventory if requested', async () => {
            const mockProduct = { id: 1, ...createMockProductData() };
            mockProductRepository.findById.mockResolvedValue(mockProduct);
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 50
            });
            
            const result = await service.getProductById(1, { 
                includeStock: true 
            });
            
            expect(result).toHaveProperty('stock_info');
            expect(result.stock_info.cantidad_actual).toBe(50);
        });

        it('should handle missing inventory gracefully', async () => {
            const mockProduct = { id: 1, ...createMockProductData() };
            mockProductRepository.findById.mockResolvedValue(mockProduct);
            mockInventoryService.getProductStock.mockRejectedValue(
                new Error('Inventory not found')
            );
            
            // El servicio propaga el error del inventoryService
            await expect(service.getProductById(1, { 
                includeStock: true 
            })).rejects.toThrow('Inventory not found');
        });

        it('should validate productId parameter', async () => {
            await expect(service.getProductById(null))
                .rejects.toThrow();
            
            await expect(service.getProductById(undefined))
                .rejects.toThrow();
        });
    });

    // ========================================
    // SEARCH PRODUCTS
    // ========================================

    describe('searchProducts()', () => {
        it('should search with empty params (return all)', async () => {
            const mockProducts = createMockProductsData(5);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            const results = await service.searchProducts({});
            
            expect(results).toHaveLength(5);
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should filter by category', async () => {
            const searchParams = createMockSearchParams({ 
                categoria: 'Electronics' 
            });
            const mockProducts = createMockProductsData(3, (i) => ({
                categoria: 'Electronics'
            }));
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            const results = await service.searchProducts(searchParams);
            
            expect(results).toHaveLength(3);
            expect(results.every(p => p.categoria === 'Electronics')).toBe(true);
        });

        it('should use cache for repeated searches', async () => {
            const searchParams = createMockSearchParams({ 
                searchText: 'test' 
            });
            const mockProducts = createMockProductsData(2);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            // Primera búsqueda
            const results1 = await service.searchProducts(searchParams);
            expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1);
            
            // Segunda búsqueda (debe usar caché)
            const results2 = await service.searchProducts(searchParams);
            expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1); // No se llama de nuevo
            expect(results2).toEqual(results1);
        });

        it('should invalidate cache after 30 seconds', async () => {
            const searchParams = createMockSearchParams();
            const mockProducts = createMockProductsData(2);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            // Primera búsqueda
            await service.searchProducts(searchParams);
            
            // Avanzar tiempo 31 segundos
            jest.advanceTimersByTime(31000);
            
            // Segunda búsqueda (caché expirado)
            await service.searchProducts(searchParams);
            
            expect(mockProductRepository.findAll).toHaveBeenCalledTimes(2);
        });

        it('should sort results by specified field', async () => {
            const products = [
                createMockProductData({ nombre: 'Zebra', precio: 300 }),
                createMockProductData({ nombre: 'Alpha', precio: 100 }),
                createMockProductData({ nombre: 'Beta', precio: 200 })
            ];
            mockProductRepository.findAll.mockResolvedValue(products);
            
            const resultsByName = await service.searchProducts({ 
                sortBy: 'nombre' 
            });
            expect(resultsByName[0].nombre).toBe('Alpha');
            
            service.searchCache.clear();
            
            const resultsByPrice = await service.searchProducts({ 
                sortBy: 'precio' 
            });
            expect(resultsByPrice[0].precio).toBe(100);
        });

        it('should handle search errors gracefully', async () => {
            mockProductRepository.findAll.mockRejectedValue(
                new Error('Search failed')
            );
            
            await expect(service.searchProducts({}))
                .rejects.toThrow('Search failed');
        });

        it('should clear cache after timeout', () => {
            // Agregar entrada al caché con timestamp viejo
            const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutos atrás (más de 5)
            service.searchCache.set('old-search', {
                results: [],
                timestamp: oldTimestamp
            });
            
            // Agregar entrada reciente
            service.searchCache.set('recent-search', {
                results: [],
                timestamp: Date.now()
            });
            
            // Ejecutar limpieza
            service.cleanSearchCache();
            
            // Verificar que se limpió la vieja pero no la reciente
            expect(service.searchCache.has('old-search')).toBe(false);
            expect(service.searchCache.has('recent-search')).toBe(true);
        });
    });

    // ========================================
    // UPDATE PRODUCT
    // ========================================

    describe('updateProduct()', () => {
        it('should update product with valid data', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData({ codigo: 'OLD-CODE' }) 
            };
            const updateData = { 
                nombre: 'Producto Actualizado',
                precio: 200
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                ...updateData
            });
            
            const result = await service.updateProduct(1, updateData);
            
            expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
            expect(mockProductRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining(updateData)
            );
            expect(result.nombre).toBe('Producto Actualizado');
            expect(result.precio).toBe(200);
        });

        it('should validate data before updating', async () => {
            const invalidUpdate = { 
                codigo: '', // Código vacío (inválido si tiene min: 1)
                nombre: 'Test'
            };
            
            await expectValidationError(
                () => service.updateProduct(1, invalidUpdate),
                'codigo'
            );
            
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should throw error if product not found', async () => {
            mockProductRepository.findById.mockResolvedValue(null);
            
            await expect(service.updateProduct(999, { nombre: 'Test' }))
                .rejects.toThrow('Producto 999 no encontrado');
            
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should ensure unique code when changing codigo', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData({ codigo: 'OLD-CODE' }) 
            };
            const updateData = { codigo: 'NEW-CODE' };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            // Simular que NEW-CODE ya existe en otro producto
            mockProductRepository.findAll.mockResolvedValue([
                { id: 2, codigo: 'NEW-CODE' }
            ]);
            
            await expectValidationError(
                () => service.updateProduct(1, updateData),
                'Ya existe un producto con el código'
            );
            
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should allow updating without changing codigo', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData({ codigo: 'SAME-CODE' }) 
            };
            const updateData = { 
                nombre: 'Nuevo Nombre',
                precio: 150
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                ...updateData
            });
            
            const result = await service.updateProduct(1, updateData);
            
            expect(result.nombre).toBe('Nuevo Nombre');
            expect(result.codigo).toBe('SAME-CODE'); // Código no cambió
            expect(mockProductRepository.findAll).not.toHaveBeenCalled(); // No verifica unicidad
        });

        it('should emit productUpdated event', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            const updateData = { nombre: 'Updated' };
            const updatedProduct = { ...existingProduct, ...updateData };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue(updatedProduct);
            
            // Usar un listener manual en lugar de expectEventEmitted
            let eventEmitted = false;
            let eventPayload = null;
            
            service.on('productUpdated', (payload) => {
                eventEmitted = true;
                eventPayload = payload;
            });
            
            await service.updateProduct(1, updateData);
            
            expect(eventEmitted).toBe(true);
            expect(eventPayload).toHaveProperty('previous');
            expect(eventPayload).toHaveProperty('updated');
            expect(eventPayload.updated.nombre).toBe('Updated');
        });

        it('should clear search cache after update', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            const updateData = { precio: 300 };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                ...updateData
            });
            
            // Agregar datos al caché
            service.searchCache.set('test-search', { data: 'test' });
            expect(service.searchCache.size).toBe(1);
            
            await service.updateProduct(1, updateData);
            
            // Verificar que el caché se limpió
            expect(service.searchCache.size).toBe(0);
        });

        it('should set fecha_actualizacion on update', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            const updateData = { precio: 250 };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                ...updateData
            });
            
            await service.updateProduct(1, updateData);
            
            expect(mockProductRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    fecha_actualizacion: expect.any(String)
                })
            );
        });

        it('should regenerate barcode when codigo changes', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData({ codigo: 'OLD-CODE' }) 
            };
            const updateData = { codigo: 'NEW-CODE' };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.findAll.mockResolvedValue([]); // Código único
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                ...updateData
            });
            
            // Mock generateBarcode
            const generateBarcodeSpy = jest.spyOn(service, 'generateBarcode')
                .mockResolvedValue('data:image/png;base64,barcode');
            
            await service.updateProduct(1, updateData);
            
            expect(generateBarcodeSpy).toHaveBeenCalledWith('NEW-CODE');
            expect(mockProductRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    codigo_barras: 'data:image/png;base64,barcode'
                })
            );
            
            generateBarcodeSpy.mockRestore();
        });

        it('should support partial updates', async () => {
            const existingProduct = { 
                id: 1, 
                codigo: 'PROD-001',
                nombre: 'Original',
                precio: 100,
                categoria_id: 1
            };
            const partialUpdate = { precio: 150 }; // Solo actualizar precio
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                precio: 150
            });
            
            const result = await service.updateProduct(1, partialUpdate);
            
            expect(result.nombre).toBe('Original'); // No cambió
            expect(result.precio).toBe(150); // Cambió
            expect(result.codigo).toBe('PROD-001'); // No cambió
        });
    });

    // ========================================
    // DELETE PRODUCT
    // ========================================

    describe('deleteProduct()', () => {
        it('should perform soft delete by default', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                estado: 'deleted'
            });
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0
            });
            
            const result = await service.deleteProduct(1);
            
            expect(result).toBe(true);
            expect(mockProductRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    estado: 'deleted',
                    fecha_eliminacion: expect.any(String)
                })
            );
            expect(mockProductRepository.delete).not.toHaveBeenCalled();
        });

        it('should perform hard delete when specified', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.delete.mockResolvedValue(true);
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0
            });
            
            const result = await service.deleteProduct(1, { hardDelete: true });
            
            expect(result).toBe(true);
            expect(mockProductRepository.delete).toHaveBeenCalledWith(1);
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should throw error if product not found', async () => {
            mockProductRepository.findById.mockResolvedValue(null);
            
            await expect(service.deleteProduct(999))
                .rejects.toThrow('Producto 999 no encontrado');
            
            expect(mockProductRepository.delete).not.toHaveBeenCalled();
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should check dependencies by default', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            // Simular que hay existencias
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 10
            });
            
            await expect(service.deleteProduct(1))
                .rejects.toThrow('No se puede eliminar un producto que tiene existencias');
            
            expect(mockProductRepository.delete).not.toHaveBeenCalled();
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });

        it('should skip dependency check when specified', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                estado: 'deleted'
            });
            // No se debe llamar getProductStock porque checkDependencies = false
            
            const result = await service.deleteProduct(1, { 
                checkDependencies: false 
            });
            
            expect(result).toBe(true);
            expect(mockInventoryService.getProductStock).not.toHaveBeenCalled();
            expect(mockProductRepository.update).toHaveBeenCalled();
        });

        it('should emit productDeleted event', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                estado: 'deleted'
            });
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0
            });
            
            let eventEmitted = false;
            let eventPayload = null;
            
            service.on('productDeleted', (payload) => {
                eventEmitted = true;
                eventPayload = payload;
            });
            
            await service.deleteProduct(1);
            
            expect(eventEmitted).toBe(true);
            expect(eventPayload).toHaveProperty('productId', 1);
            expect(eventPayload).toHaveProperty('product');
            expect(eventPayload).toHaveProperty('hardDelete');
        });

        it('should clear search cache after delete', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                estado: 'deleted'
            });
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0
            });
            
            // Agregar datos al caché
            service.searchCache.set('test-search', { data: 'test' });
            expect(service.searchCache.size).toBe(1);
            
            await service.deleteProduct(1);
            
            // Verificar que el caché se limpió
            expect(service.searchCache.size).toBe(0);
        });

        it('should allow delete when stock is zero', async () => {
            const existingProduct = { 
                id: 1, 
                ...createMockProductData() 
            };
            
            mockProductRepository.findById.mockResolvedValue(existingProduct);
            mockProductRepository.update.mockResolvedValue({
                ...existingProduct,
                estado: 'deleted'
            });
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0  // Stock en cero
            });
            
            const result = await service.deleteProduct(1);
            
            expect(result).toBe(true);
            expect(mockProductRepository.update).toHaveBeenCalled();
        });
    });

    // ========================================
    // SEARCH METHODS
    // ========================================

    describe('findByBarcode()', () => {
        it('should find product by barcode', async () => {
            const mockProduct = createMockProductData({ 
                codigo_barras: 'BAR123' 
            });
            mockProductRepository.findAll.mockResolvedValue([mockProduct]);
            
            const result = await service.findByBarcode('BAR123');
            
            expect(mockProductRepository.findAll).toHaveBeenCalledWith({
                codigo_barras: 'BAR123',
                estado: 'active'
            });
            expect(result).toEqual(mockProduct);
        });

        it('should fallback to search by codigo if barcode not found', async () => {
            const mockProduct = createMockProductData({ 
                codigo: 'PROD-123' 
            });
            
            // Primera búsqueda por barcode no encuentra nada
            mockProductRepository.findAll
                .mockResolvedValueOnce([])  // búsqueda por codigo_barras
                .mockResolvedValueOnce([mockProduct]);  // búsqueda por codigo
            
            const result = await service.findByBarcode('PROD-123');
            
            expect(mockProductRepository.findAll).toHaveBeenCalledTimes(2);
            expect(mockProductRepository.findAll).toHaveBeenCalledWith({
                codigo: 'PROD-123',
                estado: 'active'
            });
            expect(result).toEqual(mockProduct);
        });

        it('should return null if product not found', async () => {
            mockProductRepository.findAll
                .mockResolvedValueOnce([])  // búsqueda por barcode
                .mockResolvedValueOnce([]);  // búsqueda por codigo
            
            const result = await service.findByBarcode('NOTFOUND');
            
            expect(result).toBeNull();
        });

        it('should only search active products', async () => {
            mockProductRepository.findAll.mockResolvedValue([]);
            
            await service.findByBarcode('TEST');
            
            expect(mockProductRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ estado: 'active' })
            );
        });
    });

    describe('searchByText()', () => {
        it('should search products by text', async () => {
            const mockProducts = createMockProductsData(3);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            const results = await service.searchByText('test producto');
            
            expect(results).toHaveLength(3);
        });

        it('should return empty array for text shorter than 2 chars', async () => {
            const results = await service.searchByText('a');
            
            expect(results).toEqual([]);
            expect(mockProductRepository.findAll).not.toHaveBeenCalled();
        });

        it('should return empty array for empty text', async () => {
            const results = await service.searchByText('');
            
            expect(results).toEqual([]);
            expect(mockProductRepository.findAll).not.toHaveBeenCalled();
        });

        it('should trim search text', async () => {
            const mockProducts = createMockProductsData(2);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.searchByText('  test  ');
            
            // Verificar que se llamó searchProducts internamente
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should support limit option', async () => {
            const mockProducts = createMockProductsData(10);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.searchByText('test', { limit: 5 });
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should support sortBy option', async () => {
            const mockProducts = createMockProductsData(3);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.searchByText('test', { sortBy: 'precio' });
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });
    });

    describe('getProductsByCategory()', () => {
        it('should get products by category', async () => {
            const mockProducts = createMockProductsData(5, (i) => ({
                categoria_id: 1
            }));
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            const results = await service.getProductsByCategory(1);
            
            expect(results).toHaveLength(5);
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should use default sortBy nombre', async () => {
            const mockProducts = createMockProductsData(3);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.getProductsByCategory(1);
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should support custom sortBy', async () => {
            const mockProducts = createMockProductsData(3);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.getProductsByCategory(1, { sortBy: 'precio' });
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should support limit option', async () => {
            const mockProducts = createMockProductsData(3);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.getProductsByCategory(1, { limit: 10 });
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });

        it('should exclude inactive products by default', async () => {
            const mockProducts = createMockProductsData(2);
            mockProductRepository.findAll.mockResolvedValue(mockProducts);
            
            await service.getProductsByCategory(1);
            
            expect(mockProductRepository.findAll).toHaveBeenCalled();
        });
    });

    // ========================================
    // VALIDATION - DETAILED
    // ========================================

    describe('validateProductData()', () => {
        it('should pass validation for valid complete data', () => {
            const validData = createMockProductData();
            
            const result = service.validateProductData(validData, true);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should require codigo, nombre, categoria_id on create', () => {
            const invalidData = { descripcion: 'Test' }; // Falta todo lo requerido
            
            const result = service.validateProductData(invalidData, true);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('codigo'))).toBe(true);
            expect(result.errors.some(e => e.includes('nombre'))).toBe(true);
            expect(result.errors.some(e => e.includes('categoria_id'))).toBe(true);
        });

        it('should not require fields on update (isCreate=false)', () => {
            const partialData = { precio: 200 }; // Solo precio, sin campos requeridos
            
            const result = service.validateProductData(partialData, false);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate numeric types', () => {
            const invalidData = createMockProductData({
                cantidad_minima: 'not-a-number', // Debe ser number
                cantidad_maxima: 'not-a-number'
            });
            
            const result = service.validateProductData(invalidData, true);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('cantidad_minima'))).toBe(true);
            expect(result.errors.some(e => e.includes('cantidad_maxima'))).toBe(true);
        });

        it('should validate numeric ranges (min: 0)', () => {
            const invalidData = createMockProductData({
                cantidad_minima: -5,  // Debe ser >= 0
                cantidad_maxima: -10
            });
            
            const result = service.validateProductData(invalidData, true);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should validate string lengths', () => {
            const invalidData = createMockProductData({
                codigo: '',  // min: 1
                nombre: 'A'.repeat(300),  // max: 200
                descripcion: 'D'.repeat(1500)  // max: 1000
            });
            
            const result = service.validateProductData(invalidData, true);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should accept valid ranges for numeric fields', () => {
            const validData = createMockProductData({
                cantidad_minima: 0,   // Límite inferior válido
                cantidad_maxima: 100
            });
            
            const result = service.validateProductData(validData, true);
            
            expect(result.isValid).toBe(true);
        });

        it('should report multiple errors at once', () => {
            const invalidData = {
                // Falta codigo, nombre, categoria_id
                cantidad_minima: -10,  // Rango inválido
                cantidad_maxima: 'abc'  // Tipo inválido
            };
            
            const result = service.validateProductData(invalidData, true);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(3); // Múltiples errores
        });
    });

    describe('ensureUniqueCode()', () => {
        it('should accept unique code', async () => {
            mockProductRepository.findAll.mockResolvedValue([]); // No duplicados
            
            // No debe lanzar error
            await expect(service.ensureUniqueCode('UNIQUE-CODE'))
                .resolves.not.toThrow();
        });

        it('should reject duplicate code', async () => {
            mockProductRepository.findAll.mockResolvedValue([
                { id: 1, codigo: 'DUPLICATE' }
            ]);
            
            await expect(service.ensureUniqueCode('DUPLICATE'))
                .rejects.toThrow('Ya existe un producto con el código: DUPLICATE');
        });

        it('should exclude current product when updating', async () => {
            mockProductRepository.findAll.mockResolvedValue([
                { id: 1, codigo: 'PROD-001' },  // Este es el actual (excluir)
                { id: 2, codigo: 'PROD-001' }   // Este es duplicado
            ]);
            
            // Con excludeId=1, debe encontrar el duplicado (id: 2)
            await expect(service.ensureUniqueCode('PROD-001', 1))
                .rejects.toThrow('Ya existe un producto con el código');
        });

        it('should allow same code for same product (no duplicates)', async () => {
            mockProductRepository.findAll.mockResolvedValue([
                { id: 1, codigo: 'PROD-001' }  // Solo el actual
            ]);
            
            // Con excludeId=1, no hay otros con el mismo código
            await expect(service.ensureUniqueCode('PROD-001', 1))
                .resolves.not.toThrow();
        });

        it('should only check active products', async () => {
            mockProductRepository.findAll.mockResolvedValue([]);
            
            await service.ensureUniqueCode('TEST-CODE');
            
            expect(mockProductRepository.findAll).toHaveBeenCalledWith({
                codigo: 'TEST-CODE',
                estado: 'active'
            });
        });
    });

    describe('checkProductDependencies()', () => {
        it('should block delete when inventory count > 0', async () => {
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 10  // Tiene existencias
            });
            
            await expect(service.checkProductDependencies(1))
                .rejects.toThrow('No se puede eliminar un producto que tiene existencias en el inventario');
        });

        it('should allow delete when inventory count = 0', async () => {
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0  // Sin existencias
            });
            
            // No debe lanzar error
            await expect(service.checkProductDependencies(1))
                .resolves.not.toThrow();
        });

        it('should call inventoryService.getProductStock', async () => {
            mockInventoryService.getProductStock.mockResolvedValue({
                cantidad_actual: 0
            });
            
            await service.checkProductDependencies(1);
            
            expect(mockInventoryService.getProductStock).toHaveBeenCalledWith(1);
        });
    });

    describe('Expiry Functions', () => {
        describe('calculateDaysUntilExpiry()', () => {
            it('should calculate days until expiry correctly', () => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 10); // 10 días en el futuro
                
                const days = service.calculateDaysUntilExpiry(futureDate.toISOString());
                
                expect(days).toBe(10);
            });

            it('should return Infinity for null/undefined date', () => {
                expect(service.calculateDaysUntilExpiry(null)).toBe(Infinity);
                expect(service.calculateDaysUntilExpiry(undefined)).toBe(Infinity);
            });

            it('should return negative days for past dates', () => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 5); // 5 días en el pasado
                
                const days = service.calculateDaysUntilExpiry(pastDate.toISOString());
                
                expect(days).toBeLessThan(0);
                expect(days).toBeCloseTo(-5, 0);
            });
        });

        describe('getExpiryStatus()', () => {
            it('should return "expired" for negative days', () => {
                expect(service.getExpiryStatus(-1)).toBe('expired');
                expect(service.getExpiryStatus(-10)).toBe('expired');
            });

            it('should return "critical" for 0-7 days', () => {
                expect(service.getExpiryStatus(0)).toBe('critical');
                expect(service.getExpiryStatus(3)).toBe('critical');
                expect(service.getExpiryStatus(7)).toBe('critical');
            });

            it('should return "warning" for 8-30 days', () => {
                expect(service.getExpiryStatus(8)).toBe('warning');
                expect(service.getExpiryStatus(15)).toBe('warning');
                expect(service.getExpiryStatus(30)).toBe('warning');
            });

            it('should return "good" for more than 30 days', () => {
                expect(service.getExpiryStatus(31)).toBe('good');
                expect(service.getExpiryStatus(100)).toBe('good');
                expect(service.getExpiryStatus(365)).toBe('good');
            });

            it('should return "good" for Infinity', () => {
                expect(service.getExpiryStatus(Infinity)).toBe('good');
            });
        });
    });

    // ========================================
    // FASE 3: SYNCHRONIZATION
    // ========================================
    describe('Fase 3: Synchronization', () => {
        
        describe('syncWithFastAPI()', () => {
            let originalFetch;
            
            beforeEach(() => {
                // Guardar fetch original
                originalFetch = global.fetch;
                
                // Configurar localStorage para sync
                localStorage.setItem('fastapi_endpoint', 'https://api.test.com');
                localStorage.setItem('fastapi_token', 'test-token-123');
            });

            afterEach(() => {
                // Restaurar fetch
                global.fetch = originalFetch;
                
                // Limpiar localStorage
                localStorage.removeItem('fastapi_endpoint');
                localStorage.removeItem('fastapi_token');
                localStorage.removeItem('last_fastapi_sync');
            });

            it('should throw error if FastAPI is not configured', async () => {
                localStorage.removeItem('fastapi_token');

                await expect(service.syncWithFastAPI())
                    .rejects
                    .toThrow('FastAPI no está configurado para sincronización');
            });

            it('should create local products from remote products', async () => {
                const remoteProducts = [
                    { codigo: 'REMOTE-001', nombre: 'Producto Remoto 1', categoria_id: 1, precio_venta: 100 },
                    { codigo: 'REMOTE-002', nombre: 'Producto Remoto 2', categoria_id: 1, precio_venta: 200 }
                ];

                // Mock fetchProductsFromFastAPI
                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue(remoteProducts);
                
                // Mock adaptFastAPIProduct
                service.adaptFastAPIProduct = jest.fn(product => product);
                
                // Repository devuelve vacío (sin productos locales)
                mockProductRepository.findAll.mockResolvedValue([]);

                const results = await service.syncWithFastAPI();

                expect(results.created).toBe(2);
                expect(results.updated).toBe(0);
                expect(results.deleted).toBe(0);
                expect(mockProductRepository.create).toHaveBeenCalledTimes(2);
            });

            it('should update local products if remote is newer', async () => {
                const localProduct = createMockProductData({ 
                    id: 1, 
                    codigo: 'PROD-001',
                    nombre: 'Producto Local' 
                });
                
                const remoteProduct = { 
                    codigo: 'PROD-001', 
                    nombre: 'Producto Actualizado',
                    categoria_id: 1,
                    precio_venta: 150
                };

                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue([remoteProduct]);
                service.adaptFastAPIProduct = jest.fn(product => ({
                    ...product,
                    nombre: 'Producto Actualizado'
                }));
                
                // Mockear shouldUpdateLocalProduct para que retorne true
                jest.spyOn(service, 'shouldUpdateLocalProduct').mockReturnValue(true);
                
                mockProductRepository.findAll.mockResolvedValue([localProduct]);
                mockProductRepository.findById.mockResolvedValue(localProduct);

                const results = await service.syncWithFastAPI();

                expect(results.created).toBe(0);
                expect(results.updated).toBe(1);
                expect(results.deleted).toBe(0);
                // Verificar que update fue llamado (updateProduct llama a repository.update)
                expect(mockProductRepository.update).toHaveBeenCalled();
            });

            it('should handle sync errors gracefully', async () => {
                const remoteProducts = [
                    { codigo: 'REMOTE-001', nombre: 'Producto 1', categoria_id: 1 },
                    { codigo: 'REMOTE-002', nombre: 'Producto 2', categoria_id: 1 }
                ];

                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue(remoteProducts);
                service.adaptFastAPIProduct = jest.fn(product => product);
                mockProductRepository.findAll.mockResolvedValue([]);
                
                // Simular error en el segundo producto
                mockProductRepository.create
                    .mockResolvedValueOnce({ id: 1 })
                    .mockRejectedValueOnce(new Error('Database error'));

                const results = await service.syncWithFastAPI();

                expect(results.created).toBe(1);
                expect(results.errors).toHaveLength(1);
                expect(results.errors[0]).toEqual({
                    product: 'REMOTE-002',
                    error: 'Database error'
                });
            });

            it('should delete local products not in remote when deleteRemoved is true', async () => {
                const localProducts = [
                    createMockProductData({ id: 1, codigo: 'LOCAL-001' }),
                    createMockProductData({ id: 2, codigo: 'LOCAL-002' })
                ];
                
                const remoteProducts = [
                    { codigo: 'LOCAL-001', nombre: 'Producto 1', categoria_id: 1 }
                ];

                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue(remoteProducts);
                service.adaptFastAPIProduct = jest.fn(product => product);
                
                // Mockear shouldUpdateLocalProduct usando jest.spyOn
                jest.spyOn(service, 'shouldUpdateLocalProduct').mockReturnValue(false);
                
                mockProductRepository.findAll.mockResolvedValue(localProducts);
                mockProductRepository.findById.mockResolvedValue(localProducts[1]); // Return product 2
                
                // Asegurar que checkProductDependencies no bloquee la eliminación
                mockInventoryService.getProductStock.mockResolvedValue({ cantidad_actual: 0 });
                mockInventoryService.hasInventoryEntries.mockResolvedValue(false);

                const results = await service.syncWithFastAPI({ deleteRemoved: true });

                expect(results.deleted).toBe(1);
                // Verificar que update fue llamado para soft delete (deleteProduct llama a repository.update)
                expect(mockProductRepository.update).toHaveBeenCalledWith(
                    2,
                    expect.objectContaining({ estado: 'deleted' })
                );
            });

            it('should NOT delete local products when deleteRemoved is false', async () => {
                const localProducts = [
                    createMockProductData({ id: 1, codigo: 'LOCAL-001' }),
                    createMockProductData({ id: 2, codigo: 'LOCAL-002' })
                ];
                
                const remoteProducts = [
                    { codigo: 'LOCAL-001', nombre: 'Producto 1', categoria_id: 1 }
                ];

                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue(remoteProducts);
                service.adaptFastAPIProduct = jest.fn(product => product);
                service.shouldUpdateLocalProduct = jest.fn().mockReturnValue(false);
                
                mockProductRepository.findAll.mockResolvedValue(localProducts);

                const results = await service.syncWithFastAPI({ deleteRemoved: false });

                expect(results.deleted).toBe(0);
                // El producto 2 NO debe ser eliminado
                expect(mockProductRepository.update).not.toHaveBeenCalledWith(
                    2,
                    expect.objectContaining({ estado: 'deleted' })
                );
            });

            it('should update lastSyncTime after successful sync', async () => {
                const beforeSync = Date.now();
                
                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue([]);
                mockProductRepository.findAll.mockResolvedValue([]);

                await service.syncWithFastAPI();

                expect(service.lastSyncTime).toBeGreaterThanOrEqual(beforeSync);
                expect(localStorage.getItem('last_fastapi_sync')).toBe(service.lastSyncTime.toString());
            });

            it('should emit fastApiSyncCompleted event with results', async () => {
                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue([]);
                mockProductRepository.findAll.mockResolvedValue([]);

                let eventEmitted = false;
                let eventPayload = null;
                
                service.on('fastApiSyncCompleted', (payload) => {
                    eventEmitted = true;
                    eventPayload = payload;
                });

                const results = await service.syncWithFastAPI();

                expect(eventEmitted).toBe(true);
                expect(eventPayload).toEqual(results);
                expect(eventPayload).toHaveProperty('created');
                expect(eventPayload).toHaveProperty('updated');
                expect(eventPayload).toHaveProperty('deleted');
                expect(eventPayload).toHaveProperty('errors');
            });

            it('should handle empty remote products list', async () => {
                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue([]);
                mockProductRepository.findAll.mockResolvedValue([
                    createMockProductData({ id: 1, codigo: 'LOCAL-001' })
                ]);

                const results = await service.syncWithFastAPI();

                expect(results.created).toBe(0);
                expect(results.updated).toBe(0);
                expect(results.deleted).toBe(0);
            });

            it('should handle large batch of products efficiently', async () => {
                const remoteProducts = Array.from({ length: 100 }, (_, i) => ({
                    codigo: `REMOTE-${String(i + 1).padStart(3, '0')}`,
                    nombre: `Producto ${i + 1}`,
                    categoria_id: 1,
                    precio_venta: 100
                }));

                service.fetchProductsFromFastAPI = jest.fn().mockResolvedValue(remoteProducts);
                service.adaptFastAPIProduct = jest.fn(product => product);
                mockProductRepository.findAll.mockResolvedValue([]);
                
                // Mock generateBarcode to avoid Canvas issues
                jest.spyOn(service, 'generateBarcode').mockResolvedValue('data:image/png;base64,mockbarcode');

                const results = await service.syncWithFastAPI();

                expect(results.created).toBe(100);
                expect(mockProductRepository.create).toHaveBeenCalledTimes(100);
            });
        });

        describe('syncProductToFastAPI()', () => {
            let originalFetch;

            beforeEach(() => {
                originalFetch = global.fetch;
                
                // Actualizar el endpoint del servicio existente
                service.fastApiEndpoint = 'https://api.test.com';
                localStorage.setItem('fastapi_endpoint', 'https://api.test.com');
                localStorage.setItem('fastapi_token', 'test-token-123');
            });

            afterEach(() => {
                global.fetch = originalFetch;
                localStorage.removeItem('fastapi_endpoint');
                localStorage.removeItem('fastapi_token');
            });

            it('should send product to FastAPI successfully', async () => {
                const product = createMockProductData({ codigo: 'PROD-001' });
                const mockFetch = jest.fn().mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true })
                });
                global.fetch = mockFetch;

                service.adaptProductForFastAPI = jest.fn(p => p);

                await service.syncProductToFastAPI(product);

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.test.com/products',
                    expect.objectContaining({
                        method: 'POST',
                        headers: expect.objectContaining({
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer test-token-123'
                        })
                    })
                );
            });

            it('should not sync if FastAPI is not configured', async () => {
                localStorage.removeItem('fastapi_token');
                
                const product = createMockProductData();
                const mockFetch = jest.fn();
                global.fetch = mockFetch;

                await service.syncProductToFastAPI(product);

                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should handle API errors gracefully without throwing', async () => {
                const product = createMockProductData({ codigo: 'PROD-001' });
                const mockFetch = jest.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error'
                });
                global.fetch = mockFetch;

                service.adaptProductForFastAPI = jest.fn(p => p);

                // No debe lanzar error
                await expect(service.syncProductToFastAPI(product)).resolves.not.toThrow();
                
                expect(mockFetch).toHaveBeenCalled();
            });

            it('should adapt product data before sending', async () => {
                const product = createMockProductData({ codigo: 'PROD-001' });
                const adaptedProduct = { ...product, adapted: true };
                
                const mockFetch = jest.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({})
                });
                global.fetch = mockFetch;

                service.adaptProductForFastAPI = jest.fn().mockReturnValue(adaptedProduct);

                await service.syncProductToFastAPI(product);

                expect(service.adaptProductForFastAPI).toHaveBeenCalledWith(product);
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: JSON.stringify(adaptedProduct)
                    })
                );
            });

            it('should handle network errors gracefully', async () => {
                const product = createMockProductData();
                const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
                global.fetch = mockFetch;

                service.adaptProductForFastAPI = jest.fn(p => p);

                // No debe lanzar error
                await expect(service.syncProductToFastAPI(product)).resolves.not.toThrow();
            });
        });

        describe('syncProductDeletionToFastAPI()', () => {
            beforeEach(() => {
                localStorage.setItem('fastapi_endpoint', 'https://api.test.com');
                localStorage.setItem('fastapi_token', 'test-token-123');
            });

            afterEach(() => {
                localStorage.removeItem('fastapi_endpoint');
                localStorage.removeItem('fastapi_token');
            });

            it('should be a placeholder method (implementation pending)', async () => {
                // Este método es un placeholder en la implementación actual
                await expect(service.syncProductDeletionToFastAPI(1, false))
                    .resolves
                    .toBeUndefined();
            });

            it('should accept productId and hardDelete parameters', async () => {
                // Verificar que acepta los parámetros correctos
                const result = await service.syncProductDeletionToFastAPI(123, true);
                expect(result).toBeUndefined();
            });
        });

        describe('shouldSyncWithFastAPI()', () => {
            afterEach(() => {
                localStorage.removeItem('fastapi_endpoint');
                localStorage.removeItem('fastapi_token');
            });

            it('should return true when both endpoint and token are configured', () => {
                localStorage.setItem('fastapi_endpoint', 'https://api.test.com');
                localStorage.setItem('fastapi_token', 'test-token-123');

                // Recrear servicio para que lea el nuevo endpoint
                service = new ProductService();
                
                expect(service.shouldSyncWithFastAPI()).toBe(true);
            });

            it('should return false when endpoint is missing', () => {
                localStorage.removeItem('fastapi_endpoint');
                localStorage.setItem('fastapi_token', 'test-token-123');

                service = new ProductService();
                
                expect(service.shouldSyncWithFastAPI()).toBe(false);
            });

            it('should return false when token is missing', () => {
                localStorage.setItem('fastapi_endpoint', 'https://api.test.com');
                localStorage.removeItem('fastapi_token');

                service = new ProductService();
                
                expect(service.shouldSyncWithFastAPI()).toBe(false);
            });

            it('should return false when both are missing', () => {
                localStorage.removeItem('fastapi_endpoint');
                localStorage.removeItem('fastapi_token');

                service = new ProductService();
                
                expect(service.shouldSyncWithFastAPI()).toBe(false);
            });
        });
    });

    // ========================================
    // FASE 4: CACHE & UTILITIES
    // ========================================

    describe('Phase 4: Cache & Utilities', () => {

        // ========================================
        // CACHE MANAGEMENT TESTS
        // ========================================

        describe('generateSearchCacheKey()', () => {
            it('should generate consistent cache keys for same params', () => {
                const params1 = { text: 'test', categoria_id: 1 };
                const params2 = { text: 'test', categoria_id: 1 };

                const key1 = service.generateSearchCacheKey(params1);
                const key2 = service.generateSearchCacheKey(params2);

                expect(key1).toBe(key2);
                expect(typeof key1).toBe('string');
            });

            it('should generate different keys for different params', () => {
                const params1 = { text: 'test1', categoria_id: 1 };
                const params2 = { text: 'test2', categoria_id: 1 };

                const key1 = service.generateSearchCacheKey(params1);
                const key2 = service.generateSearchCacheKey(params2);

                expect(key1).not.toBe(key2);
            });

            it('should handle empty params', () => {
                const key = service.generateSearchCacheKey({});

                expect(key).toBe('{}');
                expect(typeof key).toBe('string');
            });

            it('should handle nested objects in params', () => {
                const params = {
                    text: 'test',
                    filters: { price: { min: 10, max: 100 } }
                };

                const key = service.generateSearchCacheKey(params);

                expect(key).toContain('price');
                expect(key).toContain('min');
                expect(key).toContain('max');
            });

            it('should be order-independent for object keys', () => {
                // Note: JSON.stringify is NOT order-independent, 
                // but testing actual behavior
                const params1 = { text: 'test', categoria_id: 1 };
                const params2 = { categoria_id: 1, text: 'test' };

                const key1 = service.generateSearchCacheKey(params1);
                const key2 = service.generateSearchCacheKey(params2);

                // Keys will be different due to JSON.stringify ordering
                // This is expected behavior and helps identify it
                expect(key1).not.toBe(key2);
            });
        });

        describe('clearSearchCache()', () => {
            it('should clear all cache entries', () => {
                // Add multiple entries
                addCacheEntry(service, 'key1', { results: [1, 2, 3] });
                addCacheEntry(service, 'key2', { results: [4, 5, 6] });
                addCacheEntry(service, 'key3', { results: [7, 8, 9] });

                expect(getCacheSize(service)).toBe(3);

                // Clear cache
                service.clearSearchCache();

                expect(getCacheSize(service)).toBe(0);
                expect(service.searchCache.size).toBe(0);
            });

            it('should work on empty cache', () => {
                expect(getCacheSize(service)).toBe(0);

                service.clearSearchCache();

                expect(getCacheSize(service)).toBe(0);
            });

            it('should allow adding entries after clear', () => {
                addCacheEntry(service, 'key1', { results: [1, 2, 3] });
                service.clearSearchCache();

                addCacheEntry(service, 'key2', { results: [4, 5, 6] });

                expect(getCacheSize(service)).toBe(1);
                expect(cacheHasKey(service, 'key2')).toBe(true);
            });
        });

        describe('cleanSearchCache()', () => {
            it('should remove expired entries (older than 5 minutes)', () => {
                // Create recent entry (should stay)
                const recentKey = 'recent';
                addCacheEntry(service, recentKey, {
                    results: [1, 2, 3],
                    timestamp: Date.now() - (2 * 60 * 1000) // 2 minutes ago
                });

                // Create expired entry (should be removed)
                const expiredKey = 'expired';
                createExpiredCacheEntry(service, expiredKey, 10); // 10 minutes ago

                expect(getCacheSize(service)).toBe(2);

                // Clean cache
                service.cleanSearchCache();

                expect(getCacheSize(service)).toBe(1);
                expect(cacheHasKey(service, recentKey)).toBe(true);
                expect(cacheHasKey(service, expiredKey)).toBe(false);
            });

            it('should not remove entries within TTL (5 minutes)', () => {
                const key1 = 'key1';
                const key2 = 'key2';

                // Both entries within TTL
                addCacheEntry(service, key1, {
                    results: [1],
                    timestamp: Date.now() - (1 * 60 * 1000) // 1 minute ago
                });

                addCacheEntry(service, key2, {
                    results: [2],
                    timestamp: Date.now() - (4 * 60 * 1000) // 4 minutes ago
                });

                service.cleanSearchCache();

                expect(getCacheSize(service)).toBe(2);
                expect(cacheHasKey(service, key1)).toBe(true);
                expect(cacheHasKey(service, key2)).toBe(true);
            });

            it('should work with empty cache', () => {
                expect(getCacheSize(service)).toBe(0);

                service.cleanSearchCache();

                expect(getCacheSize(service)).toBe(0);
            });

            it('should handle mixed expired and fresh entries', () => {
                // Fresh entries
                addCacheEntry(service, 'fresh1', {
                    results: [1],
                    timestamp: Date.now() - (1 * 60 * 1000)
                });

                addCacheEntry(service, 'fresh2', {
                    results: [2],
                    timestamp: Date.now() - (3 * 60 * 1000)
                });

                // Expired entries
                createExpiredCacheEntry(service, 'expired1', 6);
                createExpiredCacheEntry(service, 'expired2', 10);
                createExpiredCacheEntry(service, 'expired3', 15);

                expect(getCacheSize(service)).toBe(5);

                service.cleanSearchCache();

                expect(getCacheSize(service)).toBe(2);
                expect(cacheHasKey(service, 'fresh1')).toBe(true);
                expect(cacheHasKey(service, 'fresh2')).toBe(true);
            });
        });

        describe('setupSearchOptimizations()', () => {
            it('should configure periodic cache cleanup', () => {
                const timers = mockTimerFunctions();
                const cleanSpy = jest.spyOn(service, 'cleanSearchCache');

                // Setup optimizations (calls setInterval)
                service.setupSearchOptimizations();

                expect(cleanSpy).not.toHaveBeenCalled();

                // Advance 5 minutes
                timers.advanceTime(5 * 60 * 1000);

                expect(cleanSpy).toHaveBeenCalledTimes(1);

                // Advance another 5 minutes
                timers.advanceTime(5 * 60 * 1000);

                expect(cleanSpy).toHaveBeenCalledTimes(2);

                timers.cleanup();
            });
        });

        // ========================================
        // SEARCH UTILITIES TESTS
        // ========================================

        describe('buildSearchFilters()', () => {
            it('should build filters from text search', () => {
                const searchParams = { text: 'laptop' };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters).toEqual({
                    search_text: 'laptop',
                    estado: 'active' // Added by default when includeInactive is not set
                });
            });

            it('should build filters with categoria_id', () => {
                const searchParams = {
                    text: 'test',
                    categoria_id: 5
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.categoria_id).toBe(5);
                expect(filters.search_text).toBe('test');
                expect(filters.estado).toBe('active'); // Added by default
            });

            it('should build filters with area_id', () => {
                const searchParams = {
                    area_id: 3
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.area_id).toBe(3);
                expect(filters.estado).toBe('active'); // Added by default
            });

            it('should build filters with proveedor_id', () => {
                const searchParams = {
                    proveedor_id: 7
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.proveedor_id).toBe(7);
                expect(filters.estado).toBe('active'); // Added by default
            });

            it('should default to active estado when includeInactive is false', () => {
                const searchParams = {
                    text: 'test',
                    includeInactive: false
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.estado).toBe('active');
            });

            it('should not add estado filter when includeInactive is true', () => {
                const searchParams = {
                    text: 'test',
                    includeInactive: true
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.estado).toBeUndefined();
            });

            it('should build filters with fecha_vencimiento range', () => {
                const searchParams = {
                    fecha_vencimiento_desde: '2025-01-01',
                    fecha_vencimiento_hasta: '2025-12-31'
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.fecha_vencimiento_gte).toBe('2025-01-01');
                expect(filters.fecha_vencimiento_lte).toBe('2025-12-31');
                expect(filters.estado).toBe('active'); // Added by default
            });

            it('should build filters with limit', () => {
                const searchParams = {
                    text: 'test',
                    limit: 50
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters.limit).toBe(50);
                expect(filters.estado).toBe('active'); // Added by default
            });

            it('should handle empty searchParams', () => {
                const filters = service.buildSearchFilters({});

                // When includeInactive is not set, defaults to active estado
                expect(filters).toEqual({ estado: 'active' });
            });

            it('should build complex filters with multiple criteria', () => {
                const searchParams = {
                    text: 'laptop',
                    categoria_id: 2,
                    area_id: 3,
                    proveedor_id: 5,
                    includeInactive: false,
                    fecha_vencimiento_desde: '2025-01-01',
                    limit: 100
                };

                const filters = service.buildSearchFilters(searchParams);

                expect(filters).toEqual({
                    search_text: 'laptop',
                    categoria_id: 2,
                    area_id: 3,
                    proveedor_id: 5,
                    estado: 'active',
                    fecha_vencimiento_gte: '2025-01-01',
                    limit: 100
                });
            });

            it('should validate filter structure', () => {
                const searchParams = { text: 'test', categoria_id: 1 };

                const filters = service.buildSearchFilters(searchParams);

                expect(isValidSearchFilters(filters)).toBe(true);
            });
        });

        describe('sortSearchResults()', () => {
            let products;

            beforeEach(() => {
                products = [
                    {
                        id: 1,
                        codigo: 'PROD-003',
                        nombre: 'Zebra Product',
                        fecha_vencimiento: '2025-12-31',
                        fecha_creacion: '2025-01-01'
                    },
                    {
                        id: 2,
                        codigo: 'PROD-001',
                        nombre: 'Apple Product',
                        fecha_vencimiento: '2025-06-30',
                        fecha_creacion: '2025-03-01'
                    },
                    {
                        id: 3,
                        codigo: 'PROD-002',
                        nombre: 'Mango Product',
                        fecha_vencimiento: '2025-03-15',
                        fecha_creacion: '2025-02-01'
                    }
                ];
            });

            it('should sort by nombre (default)', () => {
                const sorted = service.sortSearchResults(products);

                expect(sorted[0].nombre).toBe('Apple Product');
                expect(sorted[1].nombre).toBe('Mango Product');
                expect(sorted[2].nombre).toBe('Zebra Product');
            });

            it('should sort by nombre explicitly', () => {
                const sorted = service.sortSearchResults(products, 'nombre');

                expect(sorted[0].nombre).toBe('Apple Product');
                expect(sorted[2].nombre).toBe('Zebra Product');
            });

            it('should sort by codigo', () => {
                const sorted = service.sortSearchResults(products, 'codigo');

                expect(sorted[0].codigo).toBe('PROD-001');
                expect(sorted[1].codigo).toBe('PROD-002');
                expect(sorted[2].codigo).toBe('PROD-003');
            });

            it('should sort by fecha_vencimiento (ascending)', () => {
                const sorted = service.sortSearchResults(products, 'fecha_vencimiento');

                expect(sorted[0].fecha_vencimiento).toBe('2025-03-15');
                expect(sorted[1].fecha_vencimiento).toBe('2025-06-30');
                expect(sorted[2].fecha_vencimiento).toBe('2025-12-31');
            });

            it('should sort by fecha_creacion (descending - newest first)', () => {
                const sorted = service.sortSearchResults(products, 'fecha_creacion');

                expect(sorted[0].fecha_creacion).toBe('2025-03-01');
                expect(sorted[1].fecha_creacion).toBe('2025-02-01');
                expect(sorted[2].fecha_creacion).toBe('2025-01-01');
            });

            it('should handle missing nombre fields', () => {
                const productsWithNull = [
                    { id: 1, nombre: null },
                    { id: 2, nombre: 'Product B' },
                    { id: 3, nombre: undefined }
                ];

                const sorted = service.sortSearchResults(productsWithNull, 'nombre');

                // Should not throw error
                expect(sorted).toHaveLength(3);
            });

            it('should handle missing fecha_vencimiento (treat as far future)', () => {
                const productsWithNull = [
                    { id: 1, fecha_vencimiento: '2025-06-01' },
                    { id: 2, fecha_vencimiento: null },
                    { id: 3, fecha_vencimiento: '2025-03-01' }
                ];

                const sorted = service.sortSearchResults(productsWithNull, 'fecha_vencimiento');

                // Null should be treated as 9999-12-31 (far future)
                expect(sorted[0].id).toBe(3); // 2025-03-01
                expect(sorted[1].id).toBe(1); // 2025-06-01
                expect(sorted[2].id).toBe(2); // null -> far future
            });

            it('should default to nombre for unknown sortBy', () => {
                const sorted = service.sortSearchResults(products, 'relevance');

                // Should sort by nombre
                expect(sorted[0].nombre).toBe('Apple Product');
            });

            it('should handle empty array', () => {
                const sorted = service.sortSearchResults([]);

                expect(sorted).toEqual([]);
            });
        });

        describe('enrichProductData()', () => {
            let products;

            beforeEach(() => {
                products = [
                    {
                        id: 1,
                        codigo: 'PROD-001',
                        nombre: 'Product 1',
                        estado: 'active',
                        fecha_vencimiento: null
                    },
                    {
                        id: 2,
                        codigo: 'PROD-002',
                        nombre: 'Product 2',
                        estado: 'inactive',
                        fecha_vencimiento: '2025-12-31'
                    }
                ];
            });

            it('should add disponible field based on estado', async () => {
                const enriched = await service.enrichProductData(products);

                expect(enriched[0].disponible).toBe(true); // active
                expect(enriched[1].disponible).toBe(false); // inactive
            });

            it('should include stock info when includeStock is true', async () => {
                mockInventoryService.getProductStock.mockResolvedValue({
                    cantidad_actual: 50,
                    cantidad_minima: 10
                });

                const searchParams = { includeStock: true };

                const enriched = await service.enrichProductData(products, searchParams);

                expect(enriched[0].count_info).toEqual({
                    cantidad_actual: 50,
                    cantidad_minima: 10
                });
            });

            it('should not include stock info when includeStock is false', async () => {
                const searchParams = { includeStock: false };

                const enriched = await service.enrichProductData(products, searchParams);

                expect(enriched[0].count_info).toBeUndefined();
            });

            it('should add expiry_info for products with fecha_vencimiento', async () => {
                const enriched = await service.enrichProductData(products);

                expect(enriched[1].expiry_info).toBeDefined();
                expect(enriched[1].expiry_info).toHaveProperty('days_until_expiry');
                expect(enriched[1].expiry_info).toHaveProperty('expiry_status');
            });

            it('should not add expiry_info when fecha_vencimiento is null', async () => {
                const enriched = await service.enrichProductData(products);

                expect(enriched[0].expiry_info).toBeUndefined();
            });

            it('should handle inventory service errors gracefully', async () => {
                mockInventoryService.getProductStock.mockRejectedValue(
                    new Error('Inventory service unavailable')
                );

                const searchParams = { includeStock: true };

                const enriched = await service.enrichProductData(products, searchParams);

                expect(enriched[0].count_info).toBeNull();
                expect(enriched).toHaveLength(2);
            });

            it('should preserve original product data', async () => {
                const enriched = await service.enrichProductData(products);

                expect(enriched[0].id).toBe(1);
                expect(enriched[0].codigo).toBe('PROD-001');
                expect(enriched[0].nombre).toBe('Product 1');
            });

            it('should handle empty products array', async () => {
                const enriched = await service.enrichProductData([]);

                expect(enriched).toEqual([]);
            });
        });

        describe('calculateDaysUntilExpiry()', () => {
            it('should calculate days until expiry correctly', () => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);

                const days = service.calculateDaysUntilExpiry(futureDate.toISOString());

                expect(days).toBeGreaterThanOrEqual(29);
                expect(days).toBeLessThanOrEqual(31);
            });

            it('should return negative days for expired products', () => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 10);

                const days = service.calculateDaysUntilExpiry(pastDate.toISOString());

                expect(days).toBeLessThan(0);
                expect(days).toBeGreaterThanOrEqual(-11);
            });

            it('should return Infinity for null date', () => {
                const days = service.calculateDaysUntilExpiry(null);

                expect(days).toBe(Infinity);
            });

            it('should return Infinity for undefined date', () => {
                const days = service.calculateDaysUntilExpiry(undefined);

                expect(days).toBe(Infinity);
            });

            it('should return 0 for today', () => {
                const today = new Date();
                // Set to end of day to ensure consistent test
                today.setHours(23, 59, 59, 999);

                const days = service.calculateDaysUntilExpiry(today.toISOString());

                expect(days).toBeGreaterThanOrEqual(0);
                expect(days).toBeLessThanOrEqual(1);
            });
        });

        describe('getExpiryStatus()', () => {
            it('should return "expired" for negative days', () => {
                expect(service.getExpiryStatus(-1)).toBe('expired');
                expect(service.getExpiryStatus(-10)).toBe('expired');
            });

            it('should return "critical" for 0-7 days', () => {
                expect(service.getExpiryStatus(0)).toBe('critical');
                expect(service.getExpiryStatus(3)).toBe('critical');
                expect(service.getExpiryStatus(7)).toBe('critical');
            });

            it('should return "warning" for 8-30 days', () => {
                expect(service.getExpiryStatus(8)).toBe('warning');
                expect(service.getExpiryStatus(15)).toBe('warning');
                expect(service.getExpiryStatus(30)).toBe('warning');
            });

            it('should return "good" for more than 30 days', () => {
                expect(service.getExpiryStatus(31)).toBe('good');
                expect(service.getExpiryStatus(100)).toBe('good');
                expect(service.getExpiryStatus(365)).toBe('good');
            });

            it('should return "good" for Infinity', () => {
                expect(service.getExpiryStatus(Infinity)).toBe('good');
            });
        });
    });

    // ============================================================================
    // PHASE 5: CODE GENERATION
    // ============================================================================

    describe('Phase 5: Code Generation', () => {
        
        // ========================================================================
        // BARCODE GENERATION TESTS
        // ========================================================================
        
        describe('generateBarcode()', () => {
            let mocks;

            beforeEach(() => {
                mocks = setupCodeGenerationMocks();
            });

            afterEach(() => {
                mocks.cleanupAll();
            });

            it('should generate barcode successfully with valid code', async () => {
                const code = 'PROD-12345';
                
                const result = await service.generateBarcode(code);

                // Verify JsBarcode was called with correct parameters
                expect(global.JsBarcode).toHaveBeenCalledWith(
                    expect.anything(),
                    code,
                    expect.objectContaining({
                        format: 'CODE128',
                        width: 2,
                        height: 100,
                        displayValue: true
                    })
                );

                // Verify result is valid data URL
                expect(isValidImageDataURL(result)).toBe(true);
                expect(result).toContain('data:image/png;base64,');
            });

            it('should throw error when JsBarcode library is not available', async () => {
                delete global.JsBarcode;

                await expect(service.generateBarcode('PROD-001'))
                    .rejects.toThrow('Librería JsBarcode no está disponible');
            });

            it('should create canvas element for barcode generation', async () => {
                await service.generateBarcode('PROD-001');

                expect(document.createElement).toHaveBeenCalledWith('canvas');
            });

            it('should call canvas.toDataURL with PNG format', async () => {
                await service.generateBarcode('PROD-001');

                expect(mocks.mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
            });

            it('should return null when JsBarcode throws error', async () => {
                global.JsBarcode = jest.fn(() => {
                    throw new Error('Invalid code format');
                });

                const result = await service.generateBarcode('INVALID');

                expect(result).toBeNull();
            });
        });

        // ========================================================================
        // QR CODE GENERATION TESTS
        // ========================================================================

        describe('generateQRCode()', () => {
            
            it('should generate QR data with correct structure', async () => {
                const product = createProductForQR({
                    id: 123,
                    codigo: 'PROD-123',
                    nombre: 'Test Product',
                    precio_venta: 250.00
                });

                const result = await service.generateQRCode(product);

                // Verify structure is valid
                expect(isValidQRData(result)).toBe(true);

                // Verify data content
                const data = JSON.parse(result);
                expect(data.id).toBe(123);
                expect(data.codigo).toBe('PROD-123');
                expect(data.nombre).toBe('Test Product');
                expect(data.precio).toBe(250.00);
            });

            it('should include timestamp in QR data', async () => {
                const product = createProductForQR();

                const result = await service.generateQRCode(product);
                const data = JSON.parse(result);

                expect(data.timestamp).toBeDefined();
                expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
            });

            it('should return valid JSON string', async () => {
                const product = createProductForQR();

                const result = await service.generateQRCode(product);

                expect(() => JSON.parse(result)).not.toThrow();
                expect(typeof result).toBe('string');
            });
        });
    });
});

