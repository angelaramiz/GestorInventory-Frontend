# Repositorios - Documentación y Ejemplos de Uso

## 📋 Descripción General

Los repositorios implementan el patrón Repository para abstraer el acceso a datos. Proporcionan una interfaz uniforme para operaciones CRUD, sincronización offline/online y manejo de datos tanto en IndexedDB como en Supabase.

## 🏗️ Arquitectura

```
BaseRepository (abstracto)
├── InventoryRepository
├── ProductRepository
└── [Futuros repositorios...]

Dependencias:
├── IndexedDBAdapter    # Abstracción de IndexedDB
├── SyncQueue          # Cola de sincronización
└── Models             # Validación de datos
```

## 📚 Repositorios Disponibles

### InventoryRepository
Gestiona el inventario de productos con lotes y cantidades.

### ProductRepository  
Gestiona el catálogo de productos y sincronización con FastAPI.

## 🔧 Uso Básico

### Inicialización
```javascript
import { InventoryRepository, ProductRepository } from '../core/repositories/index.js';

// Crear instancias
const inventoryRepo = new InventoryRepository();
const productRepo = new ProductRepository();

// Inicializar bases de datos
await inventoryRepo.initializeDatabase();
await productRepo.initializeDatabase();
```

### Operaciones CRUD

#### Crear Registros
```javascript
// Crear producto
const producto = await productRepo.create({
    codigo: 'PROD001',
    nombre: 'Producto de Prueba',
    categoria: 'Categoria A',
    marca: 'Marca Test',
    unidad: 'pcs',
    precio: 10.50
});

// Crear item de inventario
const inventario = await inventoryRepo.create({
    codigo: 'PROD001',
    nombre: 'Producto de Prueba',
    lote: 'LOTE001',
    cantidad: 100,
    unidad: 'pcs',
    caducidad: '2025-12-31'
});
```

#### Leer Registros
```javascript
// Buscar producto por código
const producto = await productRepo.findByCodigo('PROD001');

// Buscar inventario por código y lote
const inventario = await inventoryRepo.findByCodigoAndLote('PROD001', 'LOTE001');

// Obtener todos los productos
const productos = await productRepo.findAll();

// Buscar con filtros
const productosCategoria = await productRepo.findAll({
    categoria: 'Categoria A'
});
```

#### Actualizar Registros
```javascript
// Actualizar producto
const productoActualizado = await productRepo.update('PROD001', {
    precio: 12.00,
    descripcion: 'Descripción actualizada'
});

// Actualizar cantidad en inventario
const inventarioActualizado = await inventoryRepo.updateQuantity(
    'inventory-id',
    150,
    'Restock mensual'
);
```

#### Eliminar Registros
```javascript
// Eliminar producto
await productRepo.delete('PROD001');

// Eliminar item de inventario
await inventoryRepo.delete('inventory-id');
```

## 🔄 Sincronización

### Sincronización Automática
Los repositorios manejan sincronización automática entre IndexedDB y los backends:

```javascript
// La sincronización ocurre automáticamente en:
// - Operaciones CRUD cuando hay conexión
// - Cuando se detecta conexión de red
// - Al procesar la cola de sincronización

// Sincronización manual
await inventoryRepo.syncFromSupabase();
await productRepo.syncWithFastAPI();
```

### Trabajo Offline
```javascript
// Las operaciones funcionan offline automáticamente
const producto = await productRepo.create({
    codigo: 'OFFLINE001',
    nombre: 'Producto Offline'
});
// Se guarda localmente y se sincroniza cuando hay conexión
```

## 📊 Operaciones Avanzadas

### Gestión de Stock
```javascript
// Obtener stock total por código
const stockTotal = await inventoryRepo.getStockByCodigo('PROD001');

// Buscar items con stock bajo
const stockBajo = await inventoryRepo.findLowStock(10);

// Buscar items próximos a caducar
const proximosCaducar = await inventoryRepo.findExpiringItems(30);
```

### Estadísticas e Informes
```javascript
// Resumen de inventario
const resumen = await inventoryRepo.getInventorySummary();
console.log(`Total items: ${resumen.totalItems}`);
console.log(`Valor total: $${resumen.totalValor}`);

// Estadísticas de productos
const stats = await productRepo.getStatistics();
console.log(`Productos por categoría:`, stats.porCategoria);
```

### Búsquedas Avanzadas
```javascript
// Búsqueda con múltiples filtros
const productos = await productRepo.searchWithFilters({
    categoria: 'Electrónicos',
    marca: 'Samsung',
    nombre: 'smartphone'
});

// Buscar por código parcial
const coincidencias = await productRepo.findByCodigoParcial('SAM');
```

### Exportación de Datos
```javascript
// Exportar a CSV
const csvInventario = await inventoryRepo.exportToCSV({
    categoria: 'Categoria A'
});

const csvProductos = await productRepo.exportToCSV();

// Crear archivo y descargar
const blob = new Blob([csvInventario], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'inventario.csv';
a.click();
```

## 🧪 Testing

### Configurar Mocks
```javascript
import { InventoryRepository } from '../core/repositories/InventoryRepository.js';

// Mock IndexedDB
global.indexedDB = {
    open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        result: mockDB
    }))
};

// Mock Supabase
const mockSupabase = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({ data: [], error: null }))
    }))
};
```

### Tests de Ejemplo
```javascript
describe('InventoryRepository', () => {
    let repository;
    
    beforeEach(() => {
        repository = new InventoryRepository();
        // Setup mocks...
    });
    
    test('should create inventory item', async () => {
        const data = {
            codigo: 'TEST001',
            cantidad: 10
        };
        
        const result = await repository.create(data);
        expect(result.codigo).toBe('TEST001');
    });
});
```

## ⚠️ Consideraciones Importantes

### Manejo de Errores
```javascript
try {
    const producto = await productRepo.create(data);
} catch (error) {
    if (error.message.includes('Ya existe')) {
        console.log('Producto duplicado');
    } else {
        console.error('Error inesperado:', error);
    }
}
```

### Performance
```javascript
// Usar transacciones para operaciones múltiples
await inventoryRepo.dbAdapter.transaction(['inventario'], 'readwrite', (stores) => {
    // Múltiples operaciones en una transacción
});

// Batch operations para grandes volúmenes
const productos = [...]; // Array grande
for (const batch of chunks(productos, 100)) {
    await Promise.all(batch.map(p => productRepo.create(p)));
}
```

### Limpieza de Recursos
```javascript
// Cerrar conexiones cuando sea necesario
inventoryRepo.dbAdapter.close();
productRepo.dbAdapter.close();
```

## 🔧 Configuración Avanzada

### Personalizar Configuración
```javascript
import { RepositoryConfig } from '../core/repositories/index.js';

// Modificar configuración global
RepositoryConfig.syncRetry.maxRetries = 5;
RepositoryConfig.cache.ttl = 600000; // 10 minutos
```

### Factory Pattern
```javascript
import { RepositoryFactory } from '../core/repositories/index.js';

// Usar factory para crear instancias
const repos = RepositoryFactory.getAllRepositories();
const inventario = repos.inventory;
const productos = repos.product;
```

## 📝 Migración desde Código Legacy

### Reemplazar db-operations.js
```javascript
// ANTES (db-operations.js)
import { sincronizarInventarioDesdeSupabase } from './db-operations.js';
const datos = await sincronizarInventarioDesdeSupabase();

// DESPUÉS (InventoryRepository)
import { InventoryRepository } from '../core/repositories/InventoryRepository.js';
const repo = new InventoryRepository();
await repo.initializeDatabase();
const datos = await repo.syncFromSupabase();
```

### Reemplazar product-operations.js
```javascript
// ANTES (product-operations.js)
import { buscarProducto } from './product-operations.js';
const producto = await buscarProducto(codigo);

// DESPUÉS (ProductRepository)
import { ProductRepository } from '../core/repositories/ProductRepository.js';
const repo = new ProductRepository();
await repo.initializeDatabase();
const producto = await repo.findByCodigo(codigo);
```

## 🚀 Próximos Pasos

1. **BatchRepository** - Para gestión avanzada de lotes
2. **TransactionRepository** - Para movimientos de inventario
3. **UserRepository** - Para gestión de usuarios
4. **CategoryRepository** - Para gestión de categorías
5. **ReportRepository** - Para reportes y analítica

## 📞 Soporte

Para dudas o problemas con los repositorios:
- Revisar logs en console del navegador
- Verificar configuración de IndexedDB
- Comprobar conectividad con Supabase/FastAPI
- Consultar tests unitarios para ejemplos de uso
