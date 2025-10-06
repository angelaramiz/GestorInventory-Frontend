/**
 * ============================================================================
 * INVENTORY TEST HELPERS
 * ============================================================================
 * 
 * Helpers específicos para testing de InventoryService
 * 
 * Secciones:
 * 1. INVENTORY DATA CREATION
 * 2. BATCH DATA CREATION
 * 3. ENTRY/EXIT DATA CREATION
 * 4. MOCK REPOSITORIES
 * 5. MOCK SETUP
 * 6. VALIDATION HELPERS
 * 7. CALCULATION HELPERS
 */

import { jest } from '@jest/globals';

// ============================================================================
// INVENTORY DATA FIELDS
// ============================================================================

export const INVENTORY_FIELDS = {
    id: 1,
    product_id: 'prod-001',
    area_id: 'area-001',
    categoria_id: 'cat-001',
    cantidad_actual: 100,
    cantidad_minima: 10,
    cantidad_maxima: 500,
    fecha_actualizacion: '2025-10-06T10:00:00.000Z',
    usuario_id: 'user-001'
};

export const BATCH_FIELDS = {
    id: 1,
    inventory_id: 1,
    product_id: 'prod-001',
    lote_numero: 'LOTE-001',
    fecha_vencimiento: '2025-12-31T00:00:00.000Z',
    cantidad_lote: 50,
    estado: 'active',
    fecha_creacion: '2025-10-06T10:00:00.000Z'
};

// ============================================================================
// INVENTORY DATA CREATION HELPERS
// ============================================================================

/**
 * Crear datos de inventario de prueba
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de inventario
 */
export function createInventoryData(overrides = {}) {
    return {
        ...INVENTORY_FIELDS,
        ...overrides
    };
}

/**
 * Crear múltiples items de inventario
 * @param {number} count - Número de items
 * @param {Function} customizer - Función para personalizar cada item
 * @returns {Array} Lista de items de inventario
 */
export function createInventoryList(count = 3, customizer = null) {
    return Array.from({ length: count }, (_, index) => {
        const base = createInventoryData({
            id: index + 1,
            product_id: `prod-${String(index + 1).padStart(3, '0')}`,
            cantidad_actual: (index + 1) * 10
        });
        return customizer ? customizer(base, index) : base;
    });
}

/**
 * Crear inventario con stock bajo
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Inventario con stock bajo
 */
export function createLowStockInventory(overrides = {}) {
    return createInventoryData({
        cantidad_actual: 5,
        cantidad_minima: 10,
        ...overrides
    });
}

/**
 * Crear inventario sin stock
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Inventario sin stock
 */
export function createOutOfStockInventory(overrides = {}) {
    return createInventoryData({
        cantidad_actual: 0,
        cantidad_minima: 10,
        ...overrides
    });
}

/**
 * Crear inventario con stock crítico
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Inventario con stock crítico
 */
export function createCriticalStockInventory(overrides = {}) {
    return createInventoryData({
        cantidad_actual: 3,
        cantidad_minima: 10,
        ...overrides
    });
}

// ============================================================================
// BATCH DATA CREATION HELPERS
// ============================================================================

/**
 * Crear datos de lote de prueba
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de lote
 */
export function createBatchData(overrides = {}) {
    return {
        ...BATCH_FIELDS,
        ...overrides
    };
}

/**
 * Crear lote próximo a vencer
 * @param {number} daysUntilExpiry - Días hasta vencimiento
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Lote próximo a vencer
 */
export function createExpiringBatch(daysUntilExpiry = 7, overrides = {}) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
    
    return createBatchData({
        fecha_vencimiento: expiryDate.toISOString(),
        ...overrides
    });
}

/**
 * Crear lote vencido
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Lote vencido
 */
export function createExpiredBatch(overrides = {}) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 10); // 10 días atrás
    
    return createBatchData({
        fecha_vencimiento: expiryDate.toISOString(),
        estado: 'expired',
        ...overrides
    });
}

/**
 * Crear múltiples lotes con diferentes fechas de vencimiento
 * @param {number} count - Número de lotes
 * @returns {Array} Lista de lotes
 */
export function createBatchList(count = 3) {
    return Array.from({ length: count }, (_, index) => {
        const daysToAdd = (index + 1) * 30; // 30, 60, 90 días
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysToAdd);
        
        return createBatchData({
            id: index + 1,
            lote_numero: `LOTE-${String(index + 1).padStart(3, '0')}`,
            fecha_vencimiento: expiryDate.toISOString(),
            cantidad_lote: (index + 1) * 20
        });
    });
}

// ============================================================================
// ENTRY/EXIT DATA CREATION HELPERS
// ============================================================================

/**
 * Crear datos de entrada
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de entrada
 */
export function createEntryData(overrides = {}) {
    return {
        area_id: 'area-001',
        categoria_id: 'cat-001',
        motivo: 'Recepción de mercancía',
        documento_referencia: 'DOC-001',
        items: [
            {
                product_id: 'prod-001',
                cantidad: 50
            }
        ],
        ...overrides
    };
}

/**
 * Crear datos de salida
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de salida
 */
export function createExitData(overrides = {}) {
    return {
        area_id: 'area-001',
        categoria_id: 'cat-001',
        motivo: 'Despacho de mercancía',
        documento_referencia: 'DOC-002',
        items: [
            {
                product_id: 'prod-001',
                cantidad: 20
            }
        ],
        ...overrides
    };
}

/**
 * Crear datos de conteo
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de conteo
 */
export function createCountData(overrides = {}) {
    return {
        cantidad: 100,
        area_id: 'area-001',
        categoria_id: 'cat-001',
        motivo: 'Ajuste de inventario',
        ...overrides
    };
}

/**
 * Crear datos de conteo con lote
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Datos de conteo con lote
 */
export function createCountDataWithBatch(overrides = {}) {
    return {
        ...createCountData(),
        batch_info: {
            numero: 'LOTE-001',
            fecha_vencimiento: '2025-12-31T00:00:00.000Z',
            cantidad: 50
        },
        ...overrides
    };
}

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

/**
 * Crear mock del repositorio de inventario
 * @returns {Object} Mock del repositorio
 */
export function createMockInventoryRepository() {
    return {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createOrUpdate: jest.fn()
    };
}

/**
 * Crear mock del repositorio de lotes
 * @returns {Object} Mock del repositorio
 */
export function createMockBatchRepository() {
    return {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    };
}

/**
 * Configurar mock de inventario repository con datos predeterminados
 * @param {Object} mockRepo - Mock del repositorio
 * @param {Array} inventoryData - Datos a retornar
 */
export function setupInventoryRepositoryMock(mockRepo, inventoryData = []) {
    mockRepo.findAll.mockResolvedValue(inventoryData);
    mockRepo.findById.mockImplementation((id) => {
        const item = inventoryData.find(i => i.id === id);
        return Promise.resolve(item || null);
    });
    mockRepo.createOrUpdate.mockImplementation((data) => {
        return Promise.resolve({ id: 1, ...data });
    });
}

/**
 * Configurar mock de batch repository con datos predeterminados
 * @param {Object} mockRepo - Mock del repositorio
 * @param {Array} batchData - Datos a retornar
 */
export function setupBatchRepositoryMock(mockRepo, batchData = []) {
    mockRepo.findAll.mockResolvedValue(batchData);
    mockRepo.findById.mockImplementation((id) => {
        const item = batchData.find(b => b.id === id);
        return Promise.resolve(item || null);
    });
    mockRepo.create.mockImplementation((data) => {
        return Promise.resolve({ id: 1, ...data });
    });
}

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

/**
 * Configurar mocks completos del servicio
 * @param {Object} service - Instancia del servicio
 * @returns {Object} Objeto con todos los mocks
 */
export function setupInventoryServiceMocks(service) {
    const inventoryRepo = createMockInventoryRepository();
    const batchRepo = createMockBatchRepository();
    
    // Mock getRepository
    service.getRepository = jest.fn((name) => {
        if (name === 'inventory') return inventoryRepo;
        if (name === 'batch') return batchRepo;
        return null;
    });
    
    // Mock helper methods
    service.getCurrentAreaId = jest.fn(() => 'area-001');
    service.getCurrentCategoryId = jest.fn(() => 'cat-001');
    service.getCurrentUserId = jest.fn(() => 'user-001');
    service.generateId = jest.fn(() => `id-${Date.now()}`);
    
    // Mock emit (inherited from BaseService)
    service.emit = jest.fn();
    
    return {
        inventoryRepo,
        batchRepo,
        cleanup: () => {
            jest.restoreAllMocks();
        }
    };
}

/**
 * Mockear localStorage para tests
 * @returns {Object} Objeto con cleanup
 */
export function mockLocalStorage() {
    const storage = {};
    
    Storage.prototype.getItem = jest.fn((key) => storage[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
        storage[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key) => {
        delete storage[key];
    });
    Storage.prototype.clear = jest.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
    });
    
    return {
        storage,
        cleanup: () => {
            jest.restoreAllMocks();
        }
    };
}

/**
 * Mockear window events
 * @returns {Object} Objeto con cleanup
 */
export function mockWindowEvents() {
    const listeners = {};
    
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    
    window.addEventListener = jest.fn((event, handler) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
    });
    
    window.removeEventListener = jest.fn((event, handler) => {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(h => h !== handler);
        }
    });
    
    const triggerEvent = (event) => {
        if (listeners[event]) {
            listeners[event].forEach(handler => handler());
        }
    };
    
    return {
        listeners,
        triggerEvent,
        cleanup: () => {
            window.addEventListener = originalAddEventListener;
            window.removeEventListener = originalRemoveEventListener;
        }
    };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validar estructura de stock info
 * @param {Object} stockInfo - Información de stock a validar
 * @returns {boolean} true si la estructura es válida
 */
export function isValidStockInfo(stockInfo) {
    return (
        stockInfo &&
        typeof stockInfo === 'object' &&
        typeof stockInfo.cantidad_actual === 'number' &&
        Array.isArray(stockInfo.alerts)
    );
}

/**
 * Validar estructura de alerta
 * @param {Object} alert - Alerta a validar
 * @returns {boolean} true si la estructura es válida
 */
export function isValidAlert(alert) {
    return (
        alert &&
        typeof alert === 'object' &&
        typeof alert.type === 'string' &&
        typeof alert.level === 'string' &&
        typeof alert.message === 'string'
    );
}

/**
 * Validar estructura de lote enriquecido
 * @param {Object} batch - Lote a validar
 * @returns {boolean} true si la estructura es válida
 */
export function isValidEnrichedBatch(batch) {
    return (
        batch &&
        typeof batch === 'object' &&
        typeof batch.days_until_expiry === 'number' &&
        typeof batch.expiry_status === 'string' &&
        typeof batch.cantidad_disponible === 'number'
    );
}

/**
 * Validar estructura de movimiento
 * @param {Object} movement - Movimiento a validar
 * @returns {boolean} true si la estructura es válida
 */
export function isValidMovement(movement) {
    return (
        movement &&
        typeof movement === 'object' &&
        typeof movement.product_id === 'string' &&
        typeof movement.type === 'string' &&
        typeof movement.fecha === 'string' &&
        typeof movement.usuario_id === 'string'
    );
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

/**
 * Calcular días hasta fecha (helper para tests)
 * @param {string} dateString - Fecha en formato ISO
 * @returns {number} Días hasta la fecha
 */
export function calculateDaysTo(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Crear fecha con días de offset
 * @param {number} daysOffset - Días a sumar (negativo para restar)
 * @returns {string} Fecha en formato ISO
 */
export function createDateWithOffset(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
    createExpiringBatch,
    createExpiredBatch,
    createBatchList,
    
    // Entry/Exit Creation
    createEntryData,
    createExitData,
    createCountData,
    createCountDataWithBatch,
    
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
};
