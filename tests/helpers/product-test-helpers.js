// tests/helpers/product-test-helpers.js
/**
 * Helpers Específicos para Testing de ProductService
 * @author Testing Team
 * @date 2025-10-05
 */

/**
 * Campos de producto clasificados por tipo
 */
export const PRODUCT_FIELDS = {
    REQUIRED: ['codigo', 'nombre', 'categoria_id'],
    OPTIONAL: ['descripcion', 'marca', 'precio', 'cantidad', 'unidad', 'categoria'],
    NUMERIC: ['precio', 'cantidad', 'categoria_id'],
    STRING: ['codigo', 'nombre', 'descripcion', 'categoria', 'marca', 'unidad'],
    BOOLEAN: ['activo']
};

/**
 * Crear datos mock de un producto con valores por defecto
 * 
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Datos del producto
 * 
 * @example
 * const product = createMockProductData({ precio: 500 });
 */
export function createMockProductData(overrides = {}) {
    return {
        codigo: `PROD-${Date.now().toString().slice(-6)}`,
        nombre: 'Producto Test',
        descripcion: 'Descripción del producto test',
        categoria: 'Categoría Test',
        categoria_id: 1, // Campo requerido
        marca: 'Marca Test',
        unidad: 'UND',
        precio: 100.00,
        cantidad: 10,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ...overrides
    };
}

/**
 * Crear múltiples productos mock
 * 
 * @param {number} count - Cantidad de productos
 * @param {Function} customizer - Función para customizar cada producto
 * @returns {Array<Object>} Array de productos
 * 
 * @example
 * const products = createMockProductsData(5, (i) => ({
 *   precio: (i + 1) * 100
 * }));
 */
export function createMockProductsData(count, customizer = () => ({})) {
    return Array.from({ length: count }, (_, i) => 
        createMockProductData({
            codigo: `PROD-${String(i + 1).padStart(3, '0')}`,
            nombre: `Producto ${i + 1}`,
            ...customizer(i)
        })
    );
}

/**
 * Validar que un producto tenga la estructura correcta
 * 
 * @param {Object} product - Producto a validar
 * @throws {Error} Si falta un campo requerido
 * 
 * @example
 * validateProductStructure({ codigo: 'TEST', nombre: 'Test' }); // throws
 */
export function validateProductStructure(product) {
    PRODUCT_FIELDS.REQUIRED.forEach(field => {
        if (!(field in product)) {
            throw new Error(`❌ Missing required field: ${field}`);
        }
    });
    
    // Validar tipos
    PRODUCT_FIELDS.NUMERIC.forEach(field => {
        if (field in product && typeof product[field] !== 'number') {
            throw new Error(`❌ Field ${field} must be a number, got ${typeof product[field]}`);
        }
    });
    
    PRODUCT_FIELDS.STRING.forEach(field => {
        if (field in product && typeof product[field] !== 'string') {
            throw new Error(`❌ Field ${field} must be a string, got ${typeof product[field]}`);
        }
    });
    
    PRODUCT_FIELDS.BOOLEAN.forEach(field => {
        if (field in product && typeof product[field] !== 'boolean') {
            throw new Error(`❌ Field ${field} must be a boolean, got ${typeof product[field]}`);
        }
    });
}

/**
 * Esperar que una función lance un error de validación
 * 
 * @param {Function} fn - Función a ejecutar
 * @param {string} expectedMessage - Mensaje esperado en el error
 * @returns {Promise<void>}
 * 
 * @example
 * await expectValidationError(
 *   () => service.createProduct({}),
 *   'codigo is required'
 * );
 */
export async function expectValidationError(fn, expectedMessage) {
    try {
        await fn();
        throw new Error('❌ Expected validation error but none was thrown');
    } catch (error) {
        if (error.message === '❌ Expected validation error but none was thrown') {
            throw error;
        }
        expect(error.message).toContain(expectedMessage);
    }
}

/**
 * Crear mock de ProductRepository
 * 
 * @param {Object} customBehavior - Comportamientos personalizados
 * @returns {Object} Mock del repositorio
 * 
 * @example
 * const repo = createMockProductRepository({
 *   findById: jest.fn().mockResolvedValue({ id: 1 })
 * });
 */
export function createMockProductRepository(customBehavior = {}) {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        findByCode: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(data => Promise.resolve(data)),
        update: jest.fn().mockImplementation(data => Promise.resolve(data)),
        delete: jest.fn().mockResolvedValue(true),
        softDelete: jest.fn().mockResolvedValue(true),
        count: jest.fn().mockResolvedValue(0),
        ...customBehavior
    };
}

/**
 * Crear mock de InventoryService
 * 
 * @param {Object} customBehavior - Comportamientos personalizados
 * @returns {Object} Mock del servicio
 */
export function createMockInventoryService(customBehavior = {}) {
    return {
        getProductStock: jest.fn().mockResolvedValue({ 
            cantidad_actual: 10,
            cantidad_minima: 5,
            cantidad_maxima: 100
        }),
        hasInventoryEntries: jest.fn().mockResolvedValue(false),
        getInventoryHistory: jest.fn().mockResolvedValue([]),
        ...customBehavior
    };
}

/**
 * Crear mock de BatchService
 * 
 * @param {Object} customBehavior - Comportamientos personalizados
 * @returns {Object} Mock del servicio
 */
export function createMockBatchService(customBehavior = {}) {
    return {
        getProductBatches: jest.fn().mockResolvedValue([]),
        hasActiveBatches: jest.fn().mockResolvedValue(false),
        ...customBehavior
    };
}

/**
 * Crear parámetros de búsqueda mock
 * 
 * @param {Object} overrides - Parámetros a sobrescribir
 * @returns {Object} Parámetros de búsqueda
 * 
 * @example
 * const params = createMockSearchParams({ 
 *   categoria: 'Electronics',
 *   minPrecio: 100 
 * });
 */
export function createMockSearchParams(overrides = {}) {
    return {
        searchText: '',
        categoria: null,
        minPrecio: null,
        maxPrecio: null,
        enStock: null,
        activo: true,
        sortBy: 'nombre',
        page: 1,
        limit: 50,
        ...overrides
    };
}

/**
 * Crear mock de respuesta de FastAPI
 * 
 * @param {Array} products - Productos a incluir
 * @param {Object} meta - Metadatos de respuesta
 * @returns {Object} Respuesta de API
 */
export function createMockFastAPIResponse(products = [], meta = {}) {
    return {
        success: true,
        data: products,
        meta: {
            total: products.length,
            page: 1,
            pageSize: 50,
            timestamp: new Date().toISOString(),
            ...meta
        }
    };
}

/**
 * Esperar que el caché contenga una entrada
 * 
 * @param {Map} cache - Caché a verificar
 * @param {string} key - Key esperada
 * @param {*} expectedValue - Valor esperado (partial match)
 * 
 * @example
 * expectCacheToContain(service.searchCache, 'search:test', { results: [] });
 */
export function expectCacheToContain(cache, key, expectedValue) {
    if (!cache.has(key)) {
        throw new Error(`❌ Cache does not contain key: ${key}`);
    }
    
    const cached = cache.get(key);
    
    if (expectedValue !== undefined) {
        expect(cached).toMatchObject(expectedValue);
    }
}

/**
 * Esperar que el caché NO contenga una entrada
 * 
 * @param {Map} cache - Caché a verificar
 * @param {string} key - Key que no debería existir
 */
export function expectCacheNotToContain(cache, key) {
    if (cache.has(key)) {
        throw new Error(`❌ Cache should not contain key: ${key}, but it does`);
    }
}

/**
 * Crear mock de funciones globales
 * 
 * @returns {Object} Objeto con mocks globales
 */
export function createMockGlobals() {
    return {
        JsBarcode: jest.fn((canvas, code, options) => {
            // Simular generación de barcode
            canvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock');
        }),
        QRCode: {
            toCanvas: jest.fn().mockResolvedValue(undefined),
            toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrmock')
        }
    };
}

/**
 * Simular delay para tests de sincronización
 * 
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verificar que un objeto cumple con el schema de Product
 * 
 * @param {Object} product - Producto a verificar
 * @returns {boolean} true si cumple el schema
 */
export function isValidProductSchema(product) {
    try {
        validateProductStructure(product);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Constantes de productos para tests
 */
export const TEST_PRODUCTS = {
    VALID: createMockProductData({ 
        codigo: 'TEST-001', 
        nombre: 'Producto Válido' 
    }),
    INVALID_NO_CODE: createMockProductData({ nombre: 'Sin Código' }),
    INVALID_NO_NAME: createMockProductData({ codigo: 'TEST-002' }),
    WITH_HIGH_PRICE: createMockProductData({ 
        codigo: 'EXPENSIVE-001', 
        precio: 10000 
    }),
    OUT_OF_STOCK: createMockProductData({ 
        codigo: 'OOS-001', 
        cantidad: 0 
    }),
    EXPIRED: createMockProductData({ 
        codigo: 'EXP-001',
        fechaVencimiento: new Date(Date.now() - 86400000).toISOString() 
    })
};

// Eliminar campos no válidos de TEST_PRODUCTS
delete TEST_PRODUCTS.INVALID_NO_CODE.codigo;
delete TEST_PRODUCTS.INVALID_NO_NAME.nombre;

// ========================================
// SYNC HELPERS
// ========================================

/**
 * Crear productos remotos de FastAPI para testing
 * @param {number} count - Número de productos a crear
 * @returns {Array<Object>} Array de productos FastAPI
 */
export function createMockFastAPIProducts(count = 3) {
    return Array.from({ length: count }, (_, i) => ({
        codigo: `REMOTE-${String(i + 1).padStart(3, '0')}`,
        nombre: `Producto Remoto ${i + 1}`,
        categoria_id: 1,
        precio_venta: 100 + (i * 10),
        precio_compra: 50 + (i * 5),
        cantidad_minima: 5,
        ubicacion: `Estante ${i + 1}`,
        estado: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
}

/**
 * Mock de fetch global para testing de sincronización
 * @param {Object} options - Opciones de configuración
 * @returns {Function} Mock de fetch
 */
export function createMockFetch(options = {}) {
    const {
        shouldSucceed = true,
        responseData = [],
        statusCode = 200,
        delay = 0
    } = options;

    return jest.fn(async (url, config) => {
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!shouldSucceed) {
            return {
                ok: false,
                status: statusCode,
                statusText: 'Error',
                json: async () => ({ error: 'API Error' })
            };
        }

        return {
            ok: true,
            status: statusCode,
            json: async () => responseData
        };
    });
}

/**
 * Configurar localStorage para sincronización
 * @param {Object} options - Opciones de configuración
 */
export function setupSyncLocalStorage(options = {}) {
    const {
        endpoint = 'https://api.example.com',
        token = 'test-token-123',
        lastSync = null
    } = options;

    localStorage.setItem('fastapi_endpoint', endpoint);
    localStorage.setItem('fastapi_token', token);
    
    if (lastSync) {
        localStorage.setItem('last_fastapi_sync', lastSync.toString());
    }
}

/**
 * Limpiar configuración de sincronización
 */
export function cleanupSyncLocalStorage() {
    localStorage.removeItem('fastapi_endpoint');
    localStorage.removeItem('fastapi_token');
    localStorage.removeItem('last_fastapi_sync');
}

/**
 * Verificar que un evento de sincronización fue emitido
 * @param {Object} service - Instancia del servicio
 * @param {string} eventName - Nombre del evento
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<Object>} Payload del evento
 */
export function expectSyncEvent(service, eventName, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Event ${eventName} no fue emitido en ${timeout}ms`));
        }, timeout);

        service.once(eventName, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

/**
 * Crear resultados de sincronización mock
 * @param {Object} overrides - Valores personalizados
 * @returns {Object} Resultados de sync
 */
export function createMockSyncResults(overrides = {}) {
    return {
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [],
        ...overrides
    };
}

// ========================================
// CACHE & UTILITIES HELPERS - FASE 4
// ========================================

/**
 * Crear parámetros de búsqueda variados para cache testing
 * @param {Object} overrides - Valores personalizados
 * @returns {Object} Parámetros de búsqueda
 */
export function createCacheTestSearchParams(overrides = {}) {
    return {
        text: 'test',
        categoria_id: 1,
        sortBy: 'nombre',
        limit: 10,
        ...overrides
    };
}

/**
 * Obtener tamaño actual del cache
 * @param {ProductService} service - Instancia del servicio
 * @returns {number} Número de entradas en cache
 */
export function getCacheSize(service) {
    return service.searchCache.size;
}

/**
 * Obtener todas las claves del cache
 * @param {ProductService} service - Instancia del servicio
 * @returns {Array<string>} Array de claves
 */
export function getCacheKeys(service) {
    return Array.from(service.searchCache.keys());
}

/**
 * Agregar entrada al cache manualmente
 * @param {ProductService} service - Instancia del servicio
 * @param {string} key - Clave de cache
 * @param {Object} value - Valor a almacenar
 */
export function addCacheEntry(service, key, value) {
    service.searchCache.set(key, {
        results: value.results || [],
        timestamp: value.timestamp || Date.now()
    });
}

/**
 * Crear entrada de cache expirada
 * @param {ProductService} service - Instancia del servicio
 * @param {string} key - Clave de cache
 * @param {number} ageInMinutes - Edad en minutos
 */
export function createExpiredCacheEntry(service, key, ageInMinutes = 10) {
    const expiredTimestamp = Date.now() - (ageInMinutes * 60 * 1000);
    service.searchCache.set(key, {
        results: [],
        timestamp: expiredTimestamp
    });
}

/**
 * Verificar si una clave existe en cache
 * @param {ProductService} service - Instancia del servicio
 * @param {string} key - Clave a buscar
 * @returns {boolean} true si existe
 */
export function cacheHasKey(service, key) {
    return service.searchCache.has(key);
}

/**
 * Obtener entrada de cache por clave
 * @param {ProductService} service - Instancia del servicio
 * @param {string} key - Clave a buscar
 * @returns {Object|undefined} Entrada de cache
 */
export function getCacheEntry(service, key) {
    return service.searchCache.get(key);
}

/**
 * Crear múltiples productos con características específicas
 * @param {Object} config - Configuración de productos
 * @returns {Array} Array de productos
 */
export function createTestProductsForSearch(config = {}) {
    const {
        count = 5,
        categoria_id = null,
        estado = 'active',
        prefix = 'PROD'
    } = config;

    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        codigo: `${prefix}-${String(i + 1).padStart(3, '0')}`,
        nombre: `Producto Test ${i + 1}`,
        categoria_id: categoria_id || (i % 3) + 1,
        precio_venta: (i + 1) * 100,
        precio_compra: (i + 1) * 50,
        cantidad_minima: 10,
        ubicacion: `Estante ${i + 1}`,
        estado: estado,
        fecha_creacion: new Date(Date.now() - (i * 86400000)).toISOString(),
        fecha_vencimiento: i % 2 === 0 ? new Date(Date.now() + (30 * 86400000)).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
}

/**
 * Validar estructura de filtros de búsqueda
 * @param {Object} filters - Filtros a validar
 * @returns {boolean} true si es válido
 */
export function isValidSearchFilters(filters) {
    if (!filters || typeof filters !== 'object') return false;
    
    // Validar que solo tenga propiedades permitidas
    const allowedKeys = [
        'search_text', 'categoria_id', 'area_id', 'proveedor_id',
        'estado', 'fecha_vencimiento_gte', 'fecha_vencimiento_lte', 'limit'
    ];
    
    return Object.keys(filters).every(key => allowedKeys.includes(key));
}

/**
 * Mock de setInterval para tests de cache cleanup
 * @returns {Object} Mocks de timer functions
 */
export function mockTimerFunctions() {
    jest.useFakeTimers();
    return {
        advanceTime: (ms) => jest.advanceTimersByTime(ms),
        runAllTimers: () => jest.runAllTimers(),
        cleanup: () => jest.useRealTimers()
    };
}

// ========================================
// CODE GENERATION HELPERS - FASE 5
// ========================================

/**
 * Mock completo de Canvas API para testing
 * @returns {Object} Mocks de Canvas
 */
export function mockCanvasAPI() {
    const mockCanvas = {
        width: 200,
        height: 100,
        toDataURL: jest.fn(() => 'data:image/png;base64,mockBarcodeData123'),
        getContext: jest.fn(() => mockContext)
    };

    const mockContext = {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100 })),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        closePath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn()
    };

    // Mock document.createElement para Canvas
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
            return mockCanvas;
        }
        return originalCreateElement(tagName);
    });

    return {
        mockCanvas,
        mockContext,
        cleanup: () => {
            document.createElement = originalCreateElement;
        }
    };
}

/**
 * Mock de librería JsBarcode
 * @returns {Object} Mock de JsBarcode
 */
export function mockJsBarcode() {
    const jsBarcodeFunc = jest.fn((canvas, code, options) => {
        // Simular que JsBarcode modificó el canvas
        canvas.width = options?.width || 2;
        canvas.height = options?.height || 100;
        return true;
    });

    global.JsBarcode = jsBarcodeFunc;

    return {
        jsBarcodeFunc,
        cleanup: () => {
            delete global.JsBarcode;
        }
    };
}

/**
 * Setup completo de mocks para code generation
 * @returns {Object} Todos los mocks configurados
 */
export function setupCodeGenerationMocks() {
    const canvasMocks = mockCanvasAPI();
    const jsBarcodeMock = mockJsBarcode();

    return {
        ...canvasMocks,
        jsBarcodeMock: jsBarcodeMock.jsBarcodeFunc,
        cleanupAll: () => {
            canvasMocks.cleanup();
            jsBarcodeMock.cleanup();
        }
    };
}

/**
 * Verificar que un string es un data URL de imagen válido
 * @param {string} dataUrl - Data URL a validar
 * @returns {boolean} true si es válido
 */
export function isValidImageDataURL(dataUrl) {
    if (typeof dataUrl !== 'string') return false;
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(dataUrl);
}

/**
 * Crear producto mock con datos mínimos para QR
 * @param {Object} overrides - Valores personalizados
 * @returns {Object} Producto para QR
 */
export function createProductForQR(overrides = {}) {
    return {
        id: 1,
        codigo: 'PROD-001',
        nombre: 'Producto Test',
        precio_venta: 100.00,
        ...overrides
    };
}

/**
 * Validar estructura de datos QR
 * @param {string} qrString - String JSON del QR
 * @returns {boolean} true si es válido
 */
export function isValidQRData(qrString) {
    try {
        const data = JSON.parse(qrString);
        return (
            data.hasOwnProperty('id') &&
            data.hasOwnProperty('codigo') &&
            data.hasOwnProperty('nombre') &&
            data.hasOwnProperty('precio') &&
            data.hasOwnProperty('timestamp')
        );
    } catch {
        return false;
    }
}

// Export por defecto con todos los helpers
export default {
    PRODUCT_FIELDS,
    createMockProductData,
    createMockProductsData,
    validateProductStructure,
    expectValidationError,
    createMockProductRepository,
    createMockInventoryService,
    createMockBatchService,
    createMockSearchParams,
    createMockFastAPIResponse,
    expectCacheToContain,
    expectCacheNotToContain,
    createMockGlobals,
    delay,
    isValidProductSchema,
    TEST_PRODUCTS,
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
};

