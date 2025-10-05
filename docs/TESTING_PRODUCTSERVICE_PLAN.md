# 📋 Plan de Testing: ProductService

## 📊 **Análisis del Servicio**

**Archivo**: `src/core/services/ProductService.js`  
**Líneas**: 919 líneas  
**Métodos Públicos**: 41  
**Complejidad**: Alta (CRUD + Sync + Search + Cache + Validaciones)

---

## 🎯 **Estructura de Métodos**

### **1. Constructor & Initialization** (2 métodos)
- `constructor()` - Inicialización básica
- `initialize()` - Setup completo con sync y optimizaciones

### **2. CRUD Operations** (5 métodos principales)
- `searchProducts(searchParams)` - Búsqueda con filtros y caché
- `getProductById(productId, options)` - Obtener producto individual
- `createProduct(productData)` - Crear nuevo producto
- `updateProduct(productId, updateData)` - Actualizar producto
- `deleteProduct(productId, options)` - Eliminar producto (soft/hard)

### **3. Synchronization** (3 métodos)
- `syncWithFastAPI(options)` - Sincronización completa
- `syncProductToFastAPI(product)` - Sincronizar un producto
- `syncProductDeletionToFastAPI(productId, hardDelete)` - Sincronizar eliminación

### **4. Search & Filters** (4 métodos)
- `findByBarcode(barcode)` - Buscar por código de barras
- `searchByText(searchText, options)` - Búsqueda de texto
- `getProductsByCategory(categoryId, options)` - Filtrar por categoría
- `getRelatedProducts(productId)` - Productos relacionados

### **5. Code Generation** (2 métodos)
- `generateBarcode(code)` - Generar código de barras
- `generateQRCode(product)` - Generar código QR

### **6. Search Utilities** (4 métodos)
- `buildSearchFilters(searchParams)` - Construir filtros de búsqueda
- `sortSearchResults(products, sortBy)` - Ordenar resultados
- `enrichProductData(products, searchParams)` - Enriquecer datos
- `generateSearchCacheKey(searchParams)` - Generar key de caché

### **7. Validation & Business Logic** (6 métodos)
- `validateProductData(productData, isCreate)` - Validar datos
- `ensureUniqueCode(code, excludeId)` - Validar código único
- `checkProductDependencies(productId)` - Verificar dependencias
- `calculateDaysUntilExpiry(expiryDate)` - Calcular días para expiración
- `getExpiryStatus(daysUntilExpiry)` - Estado de expiración
- `getProductPriceHistory(productId)` - Historial de precios

### **8. Cache Management** (4 métodos)
- `clearSearchCache()` - Limpiar caché completamente
- `cleanSearchCache()` - Limpiar entradas antiguas
- `setupAutoSync()` - Configurar sincronización automática
- `setupSearchOptimizations()` - Configurar optimizaciones

### **9. Utilities** (11 métodos - helpers internos)
- `getService(serviceName)` - Obtener servicio
- `shouldSyncWithFastAPI()` - Verificar si debe sincronizar
- `fetchProductsFromFastAPI()` - Fetch desde API
- `adaptFastAPIProduct(product)` - Adaptar producto desde API
- `adaptProductForFastAPI(product)` - Adaptar producto para API
- `shouldUpdateLocalProduct(local, remote)` - Decidir si actualizar
- Y más...

---

## 📝 **Estimación de Tests**

### **Tests por Categoría**

| Categoría | Tests Estimados | Prioridad |
|-----------|----------------|-----------|
| **Constructor & Init** | 4 tests | 🔴 Alta |
| **CRUD Operations** | 25 tests | 🔴 Alta |
| **Synchronization** | 15 tests | 🟡 Media |
| **Search & Filters** | 20 tests | 🔴 Alta |
| **Code Generation** | 8 tests | 🟢 Baja |
| **Search Utilities** | 12 tests | 🟡 Media |
| **Validation** | 18 tests | 🔴 Alta |
| **Cache Management** | 10 tests | 🟡 Media |
| **Utilities** | 8 tests | 🟢 Baja |

**TOTAL ESTIMADO**: **~120 tests**

**PROGRESO ACTUAL**:
```
┌──────────────────────────────────────────────────┐
│  PRODUCTSERVICE - ESTADO ACTUAL                  │
├──────────────────────────────────────────────────┤
│  ✅ Fase 1 (CRUD + Search):     60 tests (100%)  │
│  ✅ Fase 2 (Validation):        24 tests (100%)  │
│  ✅ Fase 3 (Synchronization):   21 tests (100%)  │
│  ✅ Fase 4 (Cache & Utilities): 51 tests (100%)  │
│  ⏳ Fase 5 (Code Generation):   0/8 tests        │
│  ────────────────────────────────────────────────│
│  TOTAL IMPLEMENTADO:   156 tests (95% completo)  │
│  TESTS PASANDO:        156/156 (100%)            │
│  TIEMPO EJECUCIÓN:     ~1.2s                     │
│  COBERTURA ESTIMADA:   ~85% del servicio         │
└──────────────────────────────────────────────────┘
```

---

## 🎯 **Plan de Implementación**

## 📋 Checklist de Implementación

### ✅ Fase 1: Core Functionality (60 tests - COMPLETA)
- [x] Constructor & Initialization (8 tests)
  - [x] Default values (4 tests)
  - [x] Initialize behavior (4 tests)
- [x] createProduct() (7 tests)
  - [x] Valid creation
  - [x] Validation errors
  - [x] Unique code enforcement
  - [x] Cache clearing
  - [x] Required fields validation
  - [x] Numeric constraints
  - [x] Error handling
- [x] getProductById() (5 tests)
  - [x] Basic retrieval
  - [x] Not found handling
  - [x] Include stock option
  - [x] Error propagation
  - [x] Parameter validation
- [x] updateProduct() (10 tests)
  - [x] Valid update
  - [x] Validation
  - [x] Not found handling
  - [x] Unique code on change
  - [x] Allow update without code change
  - [x] Event emission
  - [x] Cache clearing
  - [x] Timestamp automation
  - [x] Barcode regeneration
  - [x] Partial updates
- [x] deleteProduct() (8 tests)
  - [x] Soft delete (default)
  - [x] Hard delete
  - [x] Not found handling
  - [x] Dependency checking
  - [x] Skip dependency check
  - [x] Event emission
  - [x] Cache clearing
  - [x] Allow delete with zero stock
- [x] searchProducts() (7 tests)
  - [x] Empty params
  - [x] Category filter
  - [x] Cache usage
  - [x] Cache invalidation
  - [x] Sorting
  - [x] Error handling
  - [x] Cache timeout cleaning
- [x] findByBarcode() (4 tests)
  - [x] Find by barcode
  - [x] Fallback to codigo
  - [x] Return null if not found
  - [x] Only active products
- [x] searchByText() (6 tests)
  - [x] Search by text
  - [x] Minimum length validation
  - [x] Empty text handling
  - [x] Text trimming
  - [x] Limit option
  - [x] SortBy option
- [x] getProductsByCategory() (5 tests)
  - [x] Get by category
  - [x] Default sortBy
  - [x] Custom sortBy
  - [x] Limit option
  - [x] Exclude inactive default

**Status**: ✅ 60/60 tests (100%)  
**Tiempo**: ~1.5s  
**Fecha completada**: 2025-10-05

---

### ✅ Fase 2: Validation (24 tests - COMPLETA)
- [x] validateProductData() (8 tests)
  - [x] Valid data passes
  - [x] Required fields (create mode)
  - [x] No required fields (update mode)
  - [x] Type validation
  - [x] Range validation
  - [x] Length validation
  - [x] Valid ranges accepted
  - [x] Multiple errors reporting
- [x] ensureUniqueCode() (5 tests)
  - [x] Accept unique code
  - [x] Reject duplicate
  - [x] Exclude current product
  - [x] Allow same code for same product
  - [x] Only active products
- [x] checkProductDependencies() (3 tests)
  - [x] Block with inventory > 0
  - [x] Allow with inventory = 0
  - [x] Call inventoryService
- [x] Expiry Functions (8 tests)
  - [x] calculateDaysUntilExpiry() (3 tests)
    - [x] Calculate correctly
    - [x] Return Infinity for null
    - [x] Return negative for past dates
  - [x] getExpiryStatus() (5 tests)
    - [x] Return "expired" for negative
    - [x] Return "critical" for 0-7 days
    - [x] Return "warning" for 8-30 days
    - [x] Return "good" for >30 days
    - [x] Return "good" for Infinity

**Status**: ✅ 24/24 tests (100%)  
**Tiempo**: ~0.8s  
**Fecha completada**: 2025-10-05

---

### ✅ Fase 3: Synchronization (21 tests implementados, +6 extra)

**Estado**: ✅ COMPLETADA  
**Tests**: 21/21 (100%)  
**Tiempo**: ~0.7s  
**Fecha completada**: 2025-10-05

#### syncWithFastAPI() - 10 tests ✅
```javascript
✅ should throw error if FastAPI is not configured
✅ should create local products from remote products
✅ should update local products if remote is newer
✅ should handle sync errors gracefully
✅ should delete local products not in remote when deleteRemoved is true
✅ should NOT delete local products when deleteRemoved is false
✅ should update lastSyncTime after successful sync
✅ should emit fastApiSyncCompleted event with results
✅ should handle empty remote products list
✅ should handle large batch of products efficiently
```

#### syncProductToFastAPI() - 5 tests ✅
```javascript
✅ should send product to FastAPI successfully
✅ should not sync if FastAPI is not configured
✅ should handle API errors gracefully without throwing
✅ should adapt product data before sending
✅ should handle network errors gracefully
```

#### syncProductDeletionToFastAPI() - 2 tests ✅
```javascript
✅ should be a placeholder method (implementation pending)
✅ should accept productId and hardDelete parameters
```

#### shouldSyncWithFastAPI() - 4 tests ✅ (No planeados, agregados)
```javascript
✅ should return true when both endpoint and token are configured
✅ should return false when endpoint is missing
✅ should return false when token is missing
✅ should return false when both are missing
```

#### **1.1 Constructor & Initialization** (4 tests) ✅
```javascript
describe('constructor()', () => {
  ✅ should initialize with default values
  ✅ should set searchCache as Map
  ✅ should load fastapi_endpoint from localStorage
  ✅ should set sync interval to 5 minutes
});

describe('initialize()', () => {
  ✅ should setup auto sync
  ✅ should setup search optimizations
  ✅ should set isInitialized to true
  ✅ should emit initialized event
});
```

#### **1.2 CRUD Operations** (25 tests) ✅

**createProduct()** - 7 tests
```javascript
✅ should create product with valid data
✅ should validate product data before creation
✅ should ensure unique product code
✅ should emit productCreated event
✅ should sync to FastAPI if configured
✅ should throw error if validation fails
✅ should throw error if code already exists
```

**getProductById()** - 5 tests
```javascript
✅ should get product by ID
✅ should include inventory if requested
✅ should include related products if requested
✅ should throw error if product not found
✅ should return from cache if available
```

**updateProduct()** - 7 tests
```javascript
✅ should update product with valid data
✅ should validate update data
✅ should ensure unique code if changing
✅ should emit productUpdated event
✅ should sync to FastAPI if configured
✅ should throw error if product not found
✅ should throw error if validation fails
```

**deleteProduct()** - 6 tests
```javascript
✅ should soft delete product by default
✅ should hard delete if specified
✅ should check dependencies before deleting
✅ should emit productDeleted event
✅ should sync deletion to FastAPI
✅ should throw error if has dependencies
```

#### **1.3 Search Operations** (20 tests) ✅

**searchProducts()** - 8 tests
```javascript
✅ should search with empty params (return all)
✅ should filter by category
✅ should filter by price range
✅ should filter by stock status
✅ should use cache for repeated searches
✅ should sort results by specified field
✅ should enrich results with inventory
✅ should handle search errors gracefully
```

**findByBarcode()** - 4 tests
```javascript
✅ should find product by barcode
✅ should return null if not found
✅ should handle multiple barcode formats
✅ should throw error on invalid barcode
```

**searchByText()** - 4 tests
```javascript
✅ should search in nombre and descripcion
✅ should be case insensitive
✅ should support partial matches
✅ should return empty array if no matches
```

**getProductsByCategory()** - 4 tests
```javascript
✅ should return products from category
✅ should support pagination
✅ should sort results
✅ should return empty array if category empty
```

---

### **Fase 2: Validation & Business Logic** (Prioridad Alta - 18 tests)

**validateProductData()** - 8 tests
```javascript
✅ should validate required fields
✅ should validate field types
✅ should validate numeric constraints
✅ should validate string lengths
✅ should allow partial validation for updates
✅ should throw descriptive errors
✅ should validate precio >= 0
✅ should validate cantidad >= 0
```

**ensureUniqueCode()** - 4 tests
```javascript
✅ should pass if code is unique
✅ should throw if code exists
✅ should exclude own ID when updating
✅ should handle case sensitivity
```

**checkProductDependencies()** - 3 tests
```javascript
✅ should check inventory entries
✅ should check batch associations
✅ should return dependency summary
```

**Expiry Functions** - 3 tests
```javascript
✅ calculateDaysUntilExpiry() - should calculate correctly
✅ getExpiryStatus() - should return correct status
✅ getExpiryStatus() - should handle edge cases
```

---

### **Fase 3: Synchronization** (Prioridad Media - 15 tests)

**syncWithFastAPI()** - 10 tests
```javascript
✅ should sync all products
✅ should fetch products from FastAPI
✅ should update local products
✅ should create missing products
✅ should handle sync errors gracefully
✅ should emit syncProgress events
✅ should update lastSyncTime
✅ should skip if not configured
✅ should handle network errors
✅ should rollback on critical errors
```

**syncProductToFastAPI()** - 3 tests
```javascript
✅ should sync single product
✅ should adapt product for API
✅ should handle API errors
```

**syncProductDeletionToFastAPI()** - 2 tests
```javascript
✅ should sync soft delete
✅ should sync hard delete
```

---

### ✅ **Fase 4: Cache & Utilities** - COMPLETADA (51 tests implementados, +29 extra)

**Fecha de Completación**: 2025-10-05  
**Tests Implementados**: 51 / 22 planeados (+132%)  
**Estado**: ✅ 100% pasando  
**Tiempo**: ~0.4s  

**Cache Management** - 13 tests (planeados: 10, +3)
```javascript
✅ generateSearchCacheKey() - should generate consistent cache keys for same params
✅ generateSearchCacheKey() - should generate different keys for different params
✅ generateSearchCacheKey() - should handle empty params
✅ generateSearchCacheKey() - should handle nested objects in params
✅ generateSearchCacheKey() - should be order-independent for object keys
✅ clearSearchCache() - should clear all cache entries
✅ clearSearchCache() - should work on empty cache
✅ clearSearchCache() - should allow adding entries after clear
✅ cleanSearchCache() - should remove expired entries (older than 5 minutes)
✅ cleanSearchCache() - should not remove entries within TTL (5 minutes)
✅ cleanSearchCache() - should work with empty cache
✅ cleanSearchCache() - should handle mixed expired and fresh entries
✅ setupSearchOptimizations() - should configure periodic cache cleanup
```

**Search Utilities** - 20 tests (planeados: 12, +8)
```javascript
✅ buildSearchFilters() - should build filters from text search
✅ buildSearchFilters() - should build filters with categoria_id
✅ buildSearchFilters() - should build filters with area_id
✅ buildSearchFilters() - should build filters with proveedor_id
✅ buildSearchFilters() - should default to active estado when includeInactive is false
✅ buildSearchFilters() - should not add estado filter when includeInactive is true
✅ buildSearchFilters() - should build filters with fecha_vencimiento range
✅ buildSearchFilters() - should build filters with limit
✅ buildSearchFilters() - should handle empty searchParams
✅ buildSearchFilters() - should build complex filters with multiple criteria
✅ buildSearchFilters() - should validate filter structure
✅ sortSearchResults() - should sort by nombre (default)
✅ sortSearchResults() - should sort by nombre explicitly
✅ sortSearchResults() - should sort by codigo
✅ sortSearchResults() - should sort by fecha_vencimiento (ascending)
✅ sortSearchResults() - should sort by fecha_creacion (descending - newest first)
✅ sortSearchResults() - should handle missing nombre fields
✅ sortSearchResults() - should handle missing fecha_vencimiento (treat as far future)
✅ sortSearchResults() - should default to nombre for unknown sortBy
✅ sortSearchResults() - should handle empty array
```

**Product Enrichment** - 8 tests (BONUS - no planeados)
```javascript
✅ enrichProductData() - should add disponible field based on estado
✅ enrichProductData() - should include stock info when includeStock is true
✅ enrichProductData() - should not include stock info when includeStock is false
✅ enrichProductData() - should add expiry_info for products with fecha_vencimiento
✅ enrichProductData() - should not add expiry_info when fecha_vencimiento is null
✅ enrichProductData() - should handle inventory service errors gracefully
✅ enrichProductData() - should preserve original product data
✅ enrichProductData() - should handle empty products array
```

**Expiry Calculations** - 10 tests (BONUS - no planeados)
```javascript
✅ calculateDaysUntilExpiry() - should calculate days until expiry correctly
✅ calculateDaysUntilExpiry() - should return negative days for expired products
✅ calculateDaysUntilExpiry() - should return Infinity for null date
✅ calculateDaysUntilExpiry() - should return Infinity for undefined date
✅ calculateDaysUntilExpiry() - should return 0 for today
✅ getExpiryStatus() - should return "expired" for negative days
✅ getExpiryStatus() - should return "critical" for 0-7 days
✅ getExpiryStatus() - should return "warning" for 8-30 days
✅ getExpiryStatus() - should return "good" for more than 30 days
✅ getExpiryStatus() - should return "good" for Infinity
```

**Helpers Creados** (10 nuevos):
- `createCacheTestSearchParams()` - Parámetros de búsqueda para tests
- `getCacheSize()` - Tamaño actual del cache
- `getCacheKeys()` - Claves en cache
- `addCacheEntry()` - Agregar entrada manual
- `createExpiredCacheEntry()` - Crear entrada expirada
- `cacheHasKey()` - Verificar existencia
- `getCacheEntry()` - Obtener entrada
- `createTestProductsForSearch()` - Productos con características específicas
- `isValidSearchFilters()` - Validar estructura de filtros
- `mockTimerFunctions()` - Mock de setInterval/setTimeout

---

### **Fase 5: Code Generation** (Prioridad Baja - 8 tests)

**generateBarcode()** - 4 tests
```javascript
✅ should generate barcode canvas
✅ should use JsBarcode library
✅ should throw on invalid code
✅ should return canvas element
```

**generateQRCode()** - 4 tests
```javascript
✅ should generate QR code
✅ should include product info
✅ should handle errors gracefully
✅ should return QR data URL
```

---
## 🛠️ **Helpers Necesarios**

### **Nuevos Helpers a Crear**

```javascript
// tests/helpers/product-test-helpers.js

export const PRODUCT_FIELDS = {
    REQUIRED: ['codigo', 'nombre', 'categoria'],
    OPTIONAL: ['descripcion', 'marca', 'precio', 'cantidad'],
    NUMERIC: ['precio', 'cantidad'],
    STRING: ['codigo', 'nombre', 'descripcion']
};

export function createMockProductData(overrides = {}) {
    return {
        codigo: `PROD-${Date.now().toString().slice(-6)}`,
        nombre: 'Producto Test',
        descripcion: 'Descripción test',
        categoria: 'Categoría Test',
        marca: 'Marca Test',
        unidad: 'UND',
        precio: 100.00,
        cantidad: 10,
        activo: true,
        ...overrides
    };
}

export function createMockProducts(count, customizer = () => ({})) {
    return Array.from({ length: count }, (_, i) => 
        createMockProductData({
            codigo: `PROD-${String(i + 1).padStart(3, '0')}`,
            nombre: `Producto ${i + 1}`,
            ...customizer(i)
        })
    );
}

export function validateProductStructure(product) {
    // Validar que tiene estructura correcta
    PRODUCT_FIELDS.REQUIRED.forEach(field => {
        if (!(field in product)) {
            throw new Error(`Missing required field: ${field}`);
        }
    });
}

export async function expectValidationError(fn, expectedMessage) {
    try {
        await fn();
        throw new Error('Expected validation error but none was thrown');
    } catch (error) {
        expect(error.message).toContain(expectedMessage);
    }
}

export function createMockRepository() {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue(true),
        findByCode: jest.fn().mockResolvedValue(null)
    };
}
```

---

## 📈 **Cronograma Estimado**

| Fase | Tests | Tiempo Estimado | Acumulado |
|------|-------|----------------|-----------|
| **Fase 1** | 49 tests | 4 horas | 4h |
| **Fase 2** | 18 tests | 2 horas | 6h |
| **Fase 3** | 15 tests | 2 horas | 8h |
| **Fase 4** | 22 tests | 2 horas | 10h |
| **Fase 5** | 8 tests | 1 hora | 11h |
| **Debug & Fix** | - | 2 horas | 13h |
| **Documentation** | - | 1 hora | 14h |
| **TOTAL** | **112 tests** | **14 horas** | - |

---

## ✅ **Checklist de Progreso**

### Fase 1: Core Functionality
- [ ] Constructor & Initialization (4 tests)
- [ ] createProduct() (7 tests)
- [ ] getProductById() (5 tests)
- [ ] updateProduct() (7 tests)
- [ ] deleteProduct() (6 tests)
- [ ] searchProducts() (8 tests)
- [ ] findByBarcode() (4 tests)
- [ ] searchByText() (4 tests)
- [ ] getProductsByCategory() (4 tests)

### Fase 2: Validation
- [ ] validateProductData() (8 tests)
- [ ] ensureUniqueCode() (4 tests)
- [ ] checkProductDependencies() (3 tests)
- [ ] Expiry functions (3 tests)

### Fase 3: Synchronization
- [ ] syncWithFastAPI() (10 tests)
- [ ] syncProductToFastAPI() (3 tests)
- [ ] syncProductDeletionToFastAPI() (2 tests)

### Fase 4: Cache & Utilities
- [ ] Cache management (10 tests)
- [ ] Search utilities (12 tests)

### Fase 5: Code Generation
- [ ] generateBarcode() (4 tests)
- [ ] generateQRCode() (4 tests)

---

## 🎯 **Próximo Paso Inmediato**

**ACCIÓN**: Crear `tests/helpers/product-test-helpers.js` con todos los helpers necesarios.

**Comando para iniciar**:
```bash
# Crear archivo de helpers
# Luego crear archivo de tests
# Finalmente ejecutar: npm test -- ProductService.test.js
```

---

**Estado**: 📋 Plan Completo - Listo para Implementación  
**Fecha**: 5 de octubre de 2025  
**Estimación Total**: 112 tests en ~14 horas
