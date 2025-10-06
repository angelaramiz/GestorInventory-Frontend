# 🎨 Patrones y Mejores Prácticas de Testing

> **Documento**: Guía de Patrones de Testing  
> **Fecha**: 6 de octubre de 2025  
> **Basado en**: 377 tests de ProductService e InventoryService  
> **Estado**: ✅ Patrones Validados y Probados

---

## 📚 Tabla de Contenidos

1. [Patrones Fundamentales](#patrones-fundamentales)
2. [Patrones de Estructura](#patrones-de-estructura)
3. [Patrones de Mocking](#patrones-de-mocking)
4. [Patrones de Validación](#patrones-de-validación)
5. [Patrones de Casos Límite](#patrones-de-casos-límite)
6. [Patrones de Eventos](#patrones-de-eventos)
7. [Patrones de Error Handling](#patrones-de-error-handling)
8. [Patrones Avanzados](#patrones-avanzados)
9. [Anti-Patrones a Evitar](#anti-patrones-a-evitar)
10. [Checklist de Testing](#checklist-de-testing)

---

## 🔷 Patrones Fundamentales

### Patrón 1: AAA (Arrange-Act-Assert)

**Descripción**: Estructura clara de tres fases en cada test.

**Cuándo usar**: SIEMPRE - Es la base de todos los tests.

```javascript
it('should update product successfully', async () => {
    // ARRANGE - Preparar el escenario
    const product = createProductData({ nombre: 'Original' });
    const updates = { nombre: 'Updated' };
    setupProductRepositoryMock(mockRepo, [product]);
    
    // ACT - Ejecutar la acción a probar
    const result = await service.updateProduct('prod-001', updates);
    
    // ASSERT - Verificar el resultado
    expect(result.nombre).toBe('Updated');
    expect(mockRepo.update).toHaveBeenCalledWith('prod-001', updates);
});
```

**Ventajas**:
- ✅ Claridad inmediata del propósito del test
- ✅ Fácil de leer y mantener
- ✅ Identificación rápida de problemas

**Malas prácticas**:
```javascript
// ❌ MALO - Todo mezclado
it('should work', async () => {
    const p = createProductData();
    setupProductRepositoryMock(mockRepo, [p]);
    expect((await service.updateProduct('p1', { nombre: 'X' })).nombre).toBe('X');
});
```

---

### Patrón 2: Nombres Descriptivos

**Descripción**: Los nombres deben ser oraciones completas que describan el comportamiento.

**Cuándo usar**: SIEMPRE - Nombres = documentación ejecutable.

```javascript
// ✅ BUENO - Describe el comportamiento esperado
it('should throw error when product not found', async () => { /* ... */ });
it('should calculate days until expiry correctly', () => { /* ... */ });
it('should not notify duplicate alert within time window', () => { /* ... */ });

// ❌ MALO - Nombres ambiguos
it('test1', () => { /* ... */ });
it('update', () => { /* ... */ });
it('works', () => { /* ... */ });
```

**Convenciones**:
- Empezar con `should`
- Describir comportamiento, no implementación
- Incluir condiciones: "when...", "with...", "without..."
- Ser específico sobre el resultado esperado

---

### Patrón 3: Un Test, Una Responsabilidad

**Descripción**: Cada test debe verificar un solo comportamiento.

**Cuándo usar**: SIEMPRE - Tests pequeños son tests mantenibles.

```javascript
// ✅ BUENO - Un comportamiento por test
it('should validate product name is required', () => {
    const product = createProductData();
    delete product.nombre;
    
    const result = service.validateProductData(product);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('nombre');
});

it('should validate product name type', () => {
    const product = createProductData({ nombre: 123 });
    
    const result = service.validateProductData(product);
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('tipo');
});

// ❌ MALO - Múltiples responsabilidades
it('should validate product', () => {
    // Validar nombre requerido
    expect(/* ... */).toBe(false);
    
    // Validar tipo de nombre
    expect(/* ... */).toContain('tipo');
    
    // Validar precio
    expect(/* ... */).toBeGreaterThan(0);
    
    // Validar categoría
    expect(/* ... */).toBeDefined();
});
```

**Ventajas**:
- ✅ Fallos precisos (sabes exactamente qué se rompió)
- ✅ Tests independientes y aislados
- ✅ Fácil refactorización

---

## 🏗️ Patrones de Estructura

### Patrón 4: beforeEach para Setup Compartido

**Descripción**: Usar beforeEach para configuración común de tests.

**Cuándo usar**: Cuando múltiples tests necesitan la misma configuración inicial.

```javascript
describe('ProductService', () => {
    let service, mocks;
    
    beforeEach(() => {
        // Setup común para todos los tests del suite
        mocks = setupProductServiceMocks();
        service = new ProductService(
            mocks.productRepo,
            mocks.categoryRepo
        );
        service.isInitialized = true; // Bypass initialization checks
    });
    
    it('should create product', async () => {
        // service y mocks ya están listos
        const product = createProductData();
        const result = await service.createProduct(product);
        expect(result).toBeDefined();
    });
    
    it('should update product', async () => {
        // Mismo setup, diferente test
        const updates = { nombre: 'Updated' };
        const result = await service.updateProduct('prod-001', updates);
        expect(result.nombre).toBe('Updated');
    });
});
```

**Alternativa: Setup en línea**
```javascript
// Usar solo cuando el setup es único para ese test
it('should handle special case', async () => {
    const specialService = new ProductService(
        createSpecialMockRepo(), // Mock específico
        null
    );
    // ...
});
```

---

### Patrón 5: Organización por Fases

**Descripción**: Agrupar tests en fases lógicas de complejidad creciente.

**Cuándo usar**: En servicios grandes con múltiples responsabilidades.

```javascript
describe('InventoryService', () => {
    
    describe('Phase 1: Setup & Core Operations', () => {
        describe('constructor()', () => {
            it('should initialize with default values', () => { /* ... */ });
            it('should initialize empty alert maps', () => { /* ... */ });
        });
        
        describe('initialize()', () => {
            it('should set isInitialized to true', async () => { /* ... */ });
            it('should call loadStockThresholds', async () => { /* ... */ });
        });
    });
    
    describe('Phase 2: Entry & Exit Operations', () => {
        describe('registerEntry()', () => {
            it('should register entry successfully', async () => { /* ... */ });
            it('should validate entry data', async () => { /* ... */ });
        });
    });
    
    // ... más fases
});
```

**Ventajas**:
- ✅ Estructura clara y navegable
- ✅ Progresión lógica de complejidad
- ✅ Facilita encontrar tests específicos
- ✅ Permite ejecutar fases individualmente

---

### Patrón 6: Helpers Reutilizables

**Descripción**: Crear biblioteca de funciones auxiliares para reducir duplicación.

**Cuándo usar**: Cuando el mismo código de setup se repite 3+ veces.

```javascript
// tests/helpers/product-test-helpers.js
export function createProductData(overrides = {}) {
    return {
        id: 'prod-' + Date.now(),
        nombre: 'Test Product',
        descripcion: 'Test Description',
        categoria_id: 'cat-001',
        area_id: 'area-001',
        codigo: 'CODE-001',
        estado: 'active',
        ...overrides // Permite personalización
    };
}

export function setupProductRepositoryMock(repo, products = []) {
    repo.findAll.mockResolvedValue(products);
    repo.findById.mockImplementation(id => 
        Promise.resolve(products.find(p => p.id === id))
    );
    repo.create.mockImplementation(data => 
        Promise.resolve({ id: 'new-id', ...data })
    );
    repo.update.mockImplementation((id, data) => 
        Promise.resolve({ id, ...data })
    );
}

// En los tests
it('should create product', async () => {
    const product = createProductData({ nombre: 'Custom Name' });
    setupProductRepositoryMock(mockRepo, [product]);
    // ...
});
```

**Organización de helpers**:
```
tests/helpers/
├── product-test-helpers.js
│   ├── Data Creation (createProductData, createProductList, ...)
│   ├── Mock Repositories (createMockProductRepository, setupProductRepositoryMock)
│   ├── Validations (isValidProductData, ...)
│   └── Calculations (calculateSomething, ...)
└── inventory-test-helpers.js
    └── (similar structure)
```

---

## 🎭 Patrones de Mocking

### Patrón 7: Mock por Defecto con Sobrescritura

**Descripción**: Configurar mocks con comportamiento por defecto, sobrescribir cuando sea necesario.

**Cuándo usar**: SIEMPRE - Reduce configuración repetitiva.

```javascript
beforeEach(() => {
    // Mock con comportamiento por defecto
    mocks = {
        productRepo: {
            findAll: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue(true)
        }
    };
    service = new ProductService(mocks.productRepo);
});

// En tests específicos, sobrescribir solo lo necesario
it('should find product by id', async () => {
    const product = createProductData();
    mocks.productRepo.findById.mockResolvedValue(product); // Sobrescritura
    
    const result = await service.getProductById('prod-001');
    
    expect(result).toEqual(product);
});

it('should handle not found error', async () => {
    // findById ya retorna null por defecto
    await expect(service.getProductById('invalid'))
        .rejects.toThrow('not found');
});
```

---

### Patrón 8: Mock de localStorage

**Descripción**: Crear implementación completa de localStorage para tests.

**Cuándo usar**: Cuando el servicio usa localStorage.

```javascript
// Helper
export function mockLocalStorage() {
    const store = {};
    
    const mock = {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn(key => { delete store[key]; }),
        clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
        get length() { return Object.keys(store).length; },
        key: jest.fn(index => Object.keys(store)[index] || null)
    };
    
    global.localStorage = mock;
    return mock;
}

// En tests
beforeEach(() => {
    mockLocalStorage();
});

it('should load thresholds from localStorage', async () => {
    localStorage.setItem('stock_thresholds', JSON.stringify({ critical: 10 }));
    
    await service.loadStockThresholds();
    
    expect(service.stockThresholds.critical).toBe(10);
});
```

---

### Patrón 9: Mock de Window Events

**Descripción**: Mock de addEventListener con capacidad de trigger.

**Cuándo usar**: Cuando se necesitan simular eventos del navegador.

```javascript
// Helper
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

// En tests
it('should emit connectionRestored on online event', () => {
    const windowMock = mockWindowEvents();
    service.setupInventoryListeners();
    
    windowMock.triggerEvent('online');
    
    expect(service.emit).toHaveBeenCalledWith('connectionRestored');
    
    windowMock.cleanup();
});
```

---

## ✅ Patrones de Validación

### Patrón 10: Helpers de Validación de Estructura

**Descripción**: Funciones para validar que objetos tengan la estructura esperada.

**Cuándo usar**: Cuando necesitas verificar objetos complejos.

```javascript
// Helper
export function isValidProductData(product) {
    return (
        product &&
        typeof product === 'object' &&
        typeof product.id === 'string' &&
        typeof product.nombre === 'string' &&
        typeof product.descripcion === 'string' &&
        typeof product.categoria_id === 'string' &&
        typeof product.area_id === 'string' &&
        typeof product.estado === 'string'
    );
}

export function isValidStockInfo(stockInfo) {
    return (
        stockInfo &&
        typeof stockInfo === 'object' &&
        typeof stockInfo.cantidad_actual === 'number' &&
        Array.isArray(stockInfo.alerts)
    );
}

// En tests
it('should return valid product structure', async () => {
    const product = await service.getProductById('prod-001');
    
    expect(isValidProductData(product)).toBe(true);
});

it('should return valid stock info', async () => {
    const stockInfo = await service.getProductStock('prod-001');
    
    expect(isValidStockInfo(stockInfo)).toBe(true);
    expect(stockInfo.cantidad_actual).toBeGreaterThanOrEqual(0);
});
```

**Ventajas**:
- ✅ Reutilizable en múltiples tests
- ✅ Centraliza lógica de validación
- ✅ Fácil de actualizar cuando cambia estructura

---

### Patrón 11: Validación Flexible con toContain

**Descripción**: Usar toContain para mensajes de error localizados o dinámicos.

**Cuándo usar**: Cuando los mensajes exactos pueden variar.

```javascript
// ✅ BUENO - Flexible con mensajes en español
it('should require product_id field', () => {
    const entryData = createEntryData({ items: [{ cantidad: 10 }] });
    
    const result = service.validateEntryData(entryData);
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('product_id');
    expect(result.errors[0]).toContain('requerido'); // o 'required'
});

// ❌ MALO - Frágil con mensajes exactos
it('should require product_id field', () => {
    const result = service.validateEntryData(entryData);
    
    expect(result.errors[0]).toBe('product_id is required'); // Se rompe si cambia mensaje
});
```

---

## 🔍 Patrones de Casos Límite

### Patrón 12: Boundary Testing

**Descripción**: Probar valores en los límites de rangos válidos.

**Cuándo usar**: En validaciones numéricas, strings, arrays.

```javascript
describe('getExpiryStatus()', () => {
    // Límite inferior
    it('should return expired for negative days', () => {
        expect(service.getExpiryStatus(-1)).toBe('expired');
        expect(service.getExpiryStatus(0)).toBe('critical'); // Justo en el límite
    });
    
    // Límite entre critical y warning
    it('should handle boundary at 7 days', () => {
        expect(service.getExpiryStatus(7)).toBe('critical');
        expect(service.getExpiryStatus(8)).toBe('warning'); // Justo después
    });
    
    // Límite entre warning y good
    it('should handle boundary at 30 days', () => {
        expect(service.getExpiryStatus(30)).toBe('warning');
        expect(service.getExpiryStatus(31)).toBe('good'); // Justo después
    });
});

describe('validateQuantity()', () => {
    it('should reject zero', () => {
        expect(service.validateQuantity(0)).toBe(false);
    });
    
    it('should accept minimum valid value', () => {
        expect(service.validateQuantity(0.01)).toBe(true); // Justo válido
    });
    
    it('should reject below minimum', () => {
        expect(service.validateQuantity(0.001)).toBe(false);
    });
});
```

---

### Patrón 13: Null/Undefined Handling

**Descripción**: Siempre probar null y undefined como inputs.

**Cuándo usar**: En cualquier función que acepte parámetros opcionales.

```javascript
describe('calculateDaysUntilExpiry()', () => {
    it('should return Infinity when no expiry date', () => {
        expect(service.calculateDaysUntilExpiry(null)).toBe(Infinity);
    });
    
    it('should handle undefined expiry date', () => {
        expect(service.calculateDaysUntilExpiry(undefined)).toBe(Infinity);
    });
    
    it('should handle empty string', () => {
        expect(service.calculateDaysUntilExpiry('')).toBe(Infinity);
    });
});

describe('calculateStockTotals()', () => {
    it('should handle empty inventory', () => {
        const totals = service.calculateStockTotals([]);
        
        expect(totals.cantidad_actual).toBe(0);
        expect(totals.items_count).toBe(0);
    });
    
    it('should handle null cantidad values', () => {
        const inventory = [
            { cantidad_actual: null },
            { cantidad_actual: 50 }
        ];
        
        const totals = service.calculateStockTotals(inventory);
        
        expect(totals.cantidad_actual).toBe(50); // Ignora nulls
    });
});
```

---

### Patrón 14: Empty Collections

**Descripción**: Probar arrays vacíos, objetos vacíos, Maps vacíos.

**Cuándo usar**: En funciones que procesan colecciones.

```javascript
it('should handle empty product list', async () => {
    setupProductRepositoryMock(mockRepo, []); // Array vacío
    
    const result = await service.getProducts();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
});

it('should handle empty filters', async () => {
    const result = await service.getProducts({}); // Objeto vacío
    
    expect(mockRepo.findAll).toHaveBeenCalledWith({});
});

it('should not notify when no alerts', async () => {
    service.checkCountAlerts = jest.fn().mockReturnValue([]); // Array vacío
    
    await service.checkAndNotifyCountAlerts('prod-001');
    
    expect(service.notifyCountAlert).not.toHaveBeenCalled();
});
```

---

## 📡 Patrones de Eventos

### Patrón 15: Event Emission Testing

**Descripción**: Verificar que eventos se emitan correctamente.

**Cuándo usar**: En operaciones que notifican cambios.

```javascript
it('should emit productCreated event', async () => {
    const product = createProductData();
    
    await service.createProduct(product);
    
    expect(service.emit).toHaveBeenCalledWith('productCreated', {
        product: expect.objectContaining({ id: expect.any(String) })
    });
});

it('should emit countAlert event', () => {
    const alert = { type: 'low_count', level: 'warning', message: 'Low' };
    
    service.notifyCountAlert('prod-001', alert);
    
    expect(service.emit).toHaveBeenCalledWith('countAlert', {
        productId: 'prod-001',
        alert
    });
});

// Verificar orden de eventos
it('should emit events in correct order', async () => {
    await service.complexOperation();
    
    expect(service.emit).toHaveBeenNthCalledWith(1, 'started');
    expect(service.emit).toHaveBeenNthCalledWith(2, 'progress', 50);
    expect(service.emit).toHaveBeenNthCalledWith(3, 'completed');
});
```

---

## 🚨 Patrones de Error Handling

### Patrón 16: Error Testing con rejects.toThrow

**Descripción**: Verificar que errores se lancen correctamente.

**Cuándo usar**: En validaciones y situaciones de error.

```javascript
it('should throw error when product not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    
    await expect(service.getProductById('invalid'))
        .rejects.toThrow('Producto no encontrado');
});

it('should throw error when validation fails', async () => {
    service.validateProductData = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Invalid name']
    });
    
    await expect(service.createProduct({}))
        .rejects.toThrow('Invalid name');
});

it('should throw error when insufficient stock', async () => {
    service.getProductStock = jest.fn().mockResolvedValue({ cantidad_actual: 5 });
    
    await expect(service.registerExit({ items: [{ product_id: 'p1', cantidad: 10 }] }))
        .rejects.toThrow('Cantidad insuficiente');
});
```

---

### Patrón 17: Error Propagation

**Descripción**: Verificar que errores de dependencias se propagan.

**Cuándo usar**: Para asegurar que errores no se swallow.

```javascript
it('should propagate repository errors', async () => {
    mockRepo.findAll.mockRejectedValue(new Error('Database error'));
    
    await expect(service.getProducts())
        .rejects.toThrow('Database error');
});

it('should handle network errors gracefully', async () => {
    mockRepo.create.mockRejectedValue(new Error('Network timeout'));
    
    await expect(service.createProduct(createProductData()))
        .rejects.toThrow('Network timeout');
});
```

---

## 🎯 Patrones Avanzados

### Patrón 18: FIFO Testing

**Descripción**: Verificar ordenamiento FIFO (First In, First Out).

**Cuándo usar**: En operaciones con prioridad temporal.

```javascript
it('should use FIFO for batch exits', async () => {
    const batches = [
        createBatchData({ 
            id: 1, 
            fecha_vencimiento: '2025-11-01', 
            cantidad_disponible: 30 
        }),
        createBatchData({ 
            id: 2, 
            fecha_vencimiento: '2025-10-01', // Más próximo
            cantidad_disponible: 40 
        })
    ];
    service.getProductStock = jest.fn().mockResolvedValue({
        cantidad_actual: 70,
        batches
    });
    
    const exitData = createExitData({ items: [{ product_id: 'p1', cantidad: 50 }] });
    const result = await service.registerExit(exitData);
    
    // Batch 2 (más próximo) se usa primero
    expect(result[0].batch_exits).toEqual([
        { batch_id: 2, cantidad: 40 }, // Primero el más próximo
        { batch_id: 1, cantidad: 10 }
    ]);
});

it('should maintain FIFO order with multiple operations', async () => {
    const operations = [
        { id: 1, timestamp: '2025-10-01' },
        { id: 2, timestamp: '2025-10-03' },
        { id: 3, timestamp: '2025-10-02' }
    ];
    
    const result = service.sortByFIFO(operations);
    
    expect(result.map(op => op.id)).toEqual([1, 3, 2]); // Ordenado por fecha
});
```

---

### Patrón 19: Spam Prevention Testing

**Descripción**: Verificar cooldowns y throttling.

**Cuándo usar**: En notificaciones, alertas, rate limiting.

```javascript
it('should not notify duplicate alert within time window', () => {
    const alert = { type: 'low_count', level: 'warning', message: 'Low' };
    
    service.notifyCountAlert('prod-001', alert);
    const firstCallCount = global.mostrarAlertaBurbuja.mock.calls.length;
    
    // Intentar notificar de nuevo inmediatamente
    service.notifyCountAlert('prod-001', alert);
    const secondCallCount = global.mostrarAlertaBurbuja.mock.calls.length;
    
    expect(secondCallCount).toBe(firstCallCount); // No cambió
});

it('should allow notification after cooldown period', () => {
    jest.useFakeTimers();
    const alert = { type: 'low_count', level: 'warning', message: 'Low' };
    
    service.notifyCountAlert('prod-001', alert);
    
    // Avanzar tiempo 61 segundos
    jest.advanceTimersByTime(61000);
    
    service.notifyCountAlert('prod-001', alert);
    
    expect(global.mostrarAlertaBurbuja).toHaveBeenCalledTimes(2); // Llamado 2 veces
    
    jest.useRealTimers();
});
```

---

### Patrón 20: Límite de Colecciones con FIFO

**Descripción**: Verificar que colecciones mantengan límite con FIFO.

**Cuándo usar**: En históricos, caches, logs.

```javascript
it('should limit movements to 1000', async () => {
    // Crear 1000 movimientos existentes
    const existing = Array.from({ length: 1000 }, (_, i) => ({ 
        id: `mov-${i}`,
        fecha: new Date(2025, 0, i + 1).toISOString()
    }));
    localStorage.setItem('count_movements', JSON.stringify(existing));
    
    // Agregar uno nuevo
    await service.registerCountMovement({ type: 'entry', cantidad: 10 });
    
    const movements = JSON.parse(localStorage.getItem('count_movements'));
    
    expect(movements).toHaveLength(1000); // Mantiene límite
    expect(movements[0].id).not.toBe('mov-0'); // Eliminó el más antiguo
    expect(movements[999].type).toBe('entry'); // Nuevo al final
});
```

---

## ❌ Anti-Patrones a Evitar

### Anti-Patrón 1: Tests Interdependientes

```javascript
// ❌ MALO - Tests dependen del orden
describe('ProductService', () => {
    let createdProductId;
    
    it('should create product', async () => {
        const product = await service.createProduct(createProductData());
        createdProductId = product.id; // Estado compartido
    });
    
    it('should update product', async () => {
        // Falla si test anterior no se ejecuta primero
        await service.updateProduct(createdProductId, { nombre: 'Updated' });
    });
});

// ✅ BUENO - Tests independientes
describe('ProductService', () => {
    it('should create product', async () => {
        const product = await service.createProduct(createProductData());
        expect(product.id).toBeDefined();
    });
    
    it('should update product', async () => {
        // Setup propio, no depende de otro test
        mockRepo.findById.mockResolvedValue(createProductData({ id: 'prod-001' }));
        await service.updateProduct('prod-001', { nombre: 'Updated' });
    });
});
```

---

### Anti-Patrón 2: Tests Demasiado Amplios

```javascript
// ❌ MALO - Test que hace todo
it('should handle complete product lifecycle', async () => {
    const product = await service.createProduct(createProductData());
    expect(product.id).toBeDefined();
    
    const updated = await service.updateProduct(product.id, { nombre: 'Updated' });
    expect(updated.nombre).toBe('Updated');
    
    await service.deleteProduct(product.id);
    await expect(service.getProductById(product.id))
        .rejects.toThrow('not found');
});

// ✅ BUENO - Tests separados
it('should create product', async () => {
    const product = await service.createProduct(createProductData());
    expect(product.id).toBeDefined();
});

it('should update product', async () => {
    const updated = await service.updateProduct('prod-001', { nombre: 'Updated' });
    expect(updated.nombre).toBe('Updated');
});

it('should delete product', async () => {
    await service.deleteProduct('prod-001');
    await expect(service.getProductById('prod-001'))
        .rejects.toThrow('not found');
});
```

---

### Anti-Patrón 3: Assertions Excesivas

```javascript
// ❌ MALO - Demasiadas assertions
it('should create product', async () => {
    const result = await service.createProduct(createProductData());
    
    expect(result.id).toBeDefined();
    expect(result.nombre).toBe('Test Product');
    expect(result.descripcion).toBe('Test Description');
    expect(result.categoria_id).toBe('cat-001');
    expect(result.area_id).toBe('area-001');
    expect(result.codigo).toBe('CODE-001');
    expect(result.estado).toBe('active');
    expect(result.fecha_creacion).toBeDefined();
    expect(result.fecha_actualizacion).toBeDefined();
    // ... 10 assertions más
});

// ✅ BUENO - Usar helper de validación
it('should create product', async () => {
    const result = await service.createProduct(createProductData());
    
    expect(isValidProductData(result)).toBe(true);
    expect(result.id).toBeDefined(); // Solo lo crítico
});
```

---

### Anti-Patrón 4: Mocks Demasiado Específicos

```javascript
// ❌ MALO - Mock muy acoplado a implementación
it('should search products', async () => {
    mockRepo.findAll.mockImplementation((filters) => {
        expect(filters.nombre_regex).toBe('^Test');
        expect(filters.estado).toBe('active');
        expect(filters.limit).toBe(10);
        return Promise.resolve([]);
    });
    
    await service.searchProducts('Test');
});

// ✅ BUENO - Mock flexible
it('should search products', async () => {
    setupProductRepositoryMock(mockRepo, [createProductData()]);
    
    const results = await service.searchProducts('Test');
    
    expect(results).toHaveLength(1);
    expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ nombre_regex: expect.any(String) })
    );
});
```

---

### Anti-Patrón 5: Tests sin Cleanup

```javascript
// ❌ MALO - Sin cleanup
it('should setup listeners', () => {
    const windowMock = mockWindowEvents();
    service.setupInventoryListeners();
    // No cleanup, puede afectar otros tests
});

// ✅ BUENO - Con cleanup
it('should setup listeners', () => {
    const windowMock = mockWindowEvents();
    
    try {
        service.setupInventoryListeners();
        expect(window.addEventListener).toHaveBeenCalled();
    } finally {
        windowMock.cleanup(); // Siempre limpiar
    }
});

// ✅ MEJOR - Usando afterEach
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
        expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    });
});
```

---

## ✅ Checklist de Testing

### Antes de Escribir Tests

- [ ] Entender el comportamiento esperado del método
- [ ] Identificar casos de éxito y error
- [ ] Listar casos límite y edge cases
- [ ] Verificar si existen helpers reutilizables
- [ ] Planificar estructura de describe/it

### Al Escribir Tests

- [ ] Usar patrón AAA (Arrange-Act-Assert)
- [ ] Nombre descriptivo con "should..."
- [ ] Un test, una responsabilidad
- [ ] Setup en beforeEach si se repite
- [ ] Usar helpers para reducir duplicación
- [ ] Mock por defecto, sobrescribir cuando necesario
- [ ] Cleanup en afterEach si es necesario

### Cobertura Mínima por Método

- [ ] **Happy path**: Caso de éxito principal
- [ ] **Validaciones**: Datos inválidos
- [ ] **Errores**: Manejo de errores esperados
- [ ] **Edge cases**: Null, undefined, vacío
- [ ] **Límites**: Valores en boundaries
- [ ] **Eventos**: Emisión de eventos (si aplica)

### Antes de Commit

- [ ] Todos los tests pasan
- [ ] Sin tests skipped (.skip)
- [ ] Sin console.logs innecesarios
- [ ] Nombres de tests descriptivos
- [ ] Código de test limpio y formateado
- [ ] Helpers documentados si son nuevos

---

## 📊 Métricas de Calidad

### Tests Buenos

- ✅ **Velocidad**: <50ms por test
- ✅ **Independencia**: Puede ejecutarse en cualquier orden
- ✅ **Claridad**: Nombre explica qué prueba
- ✅ **Mantenibilidad**: Fácil de actualizar
- ✅ **Confiabilidad**: No flakey (siempre mismo resultado)

### Tests Malos

- ❌ **Lento**: >500ms por test
- ❌ **Dependiente**: Falla si otros tests no se ejecutan
- ❌ **Ambiguo**: Nombre genérico o poco claro
- ❌ **Frágil**: Se rompe con cambios menores
- ❌ **Flakey**: A veces pasa, a veces falla

---

## 🎓 Conclusión

Los patrones documentados aquí han sido **validados con 377 tests** en ProductService e InventoryService, demostrando:

- ✅ **Mantenibilidad**: Tests fáciles de actualizar
- ✅ **Velocidad**: ~7ms promedio por test
- ✅ **Confiabilidad**: 100% pass rate consistente
- ✅ **Reusabilidad**: 70+ helpers compartidos
- ✅ **Escalabilidad**: Listos para nuevos servicios

Aplicar estos patrones garantiza una suite de testing sólida, mantenible y efectiva.

---

**Última actualización**: 6 de octubre de 2025  
**Versión**: 1.0.0  
**Basado en**: ProductService (164 tests) + InventoryService (213 tests)
