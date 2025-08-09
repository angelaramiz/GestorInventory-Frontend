# Convenciones de Código - GestorInventory-Frontend

## 📝 Convenciones de Nomenclatura

### Archivos y Directorios
- **Archivos JavaScript**: `kebab-case.js` (ej: `product-repository.js`)
- **Archivos HTML**: `kebab-case.html` (ej: `product-list.html`)
- **Archivos CSS**: `kebab-case.css` (ej: `mobile-components.css`)
- **Directorios**: `kebab-case` (ej: `core/services/`)

### Código JavaScript

#### Clases
```javascript
// ✅ Correcto - PascalCase
class ProductRepository { }
class InventoryService { }
class AuthManager { }

// ❌ Incorrecto
class productRepository { }
class inventory_service { }
```

#### Funciones y Métodos
```javascript
// ✅ Correcto - camelCase
function findProductById(id) { }
async function saveProductToDatabase(product) { }
const calculateTotalPrice = (items) => { };

// ❌ Incorrecto
function FindProductById(id) { }
function save_product_to_database(product) { }
```

#### Variables
```javascript
// ✅ Correcto - camelCase
const productList = [];
let currentUser = null;
const isAuthenticated = false;

// ❌ Incorrecto
const ProductList = [];
let current_user = null;
const is_authenticated = false;
```

#### Constantes
```javascript
// ✅ Correcto - UPPER_SNAKE_CASE
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = 'https://api.example.com';
const ERROR_MESSAGES = {
  PRODUCT_NOT_FOUND: 'Producto no encontrado',
  INVALID_CREDENTIALS: 'Credenciales inválidas'
};

// ❌ Incorrecto
const defaultPageSize = 20;
const ApiBaseUrl = 'https://api.example.com';
```

#### Elementos DOM
```javascript
// ✅ Correcto - kebab-case para IDs y clases
<div id="product-list" class="inventory-card">
<button class="btn-primary" id="save-product-btn">

// ❌ Incorrecto
<div id="productList" class="inventoryCard">
<button class="btnPrimary" id="saveProductBtn">
```

## 🏗️ Patrones de Código

### Importaciones y Exportaciones

#### Estructura de Imports
```javascript
// 1. Imports de librerías externas
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

// 2. Imports de módulos del core
import { ProductRepository } from '../core/repositories/product-repository.js';
import { InventoryService } from '../core/services/inventory-service.js';

// 3. Imports de utilidades
import { logger } from '../utils/logger.js';
import { validateProduct } from '../utils/validation.js';

// 4. Imports de UI
import { showMessage } from '../ui/components/message.js';
```

#### Estructura de Exports
```javascript
// Exports nombrados al final del archivo
export {
  ProductRepository,
  findProductById,
  saveProduct,
  deleteProduct
};

// Export por defecto para la clase principal
export default ProductRepository;
```

### Manejo de Errores
```javascript
// ✅ Correcto - Manejo completo de errores
async function saveProduct(product) {
  try {
    const validatedProduct = validateProduct(product);
    const result = await productRepository.save(validatedProduct);
    
    logger.info('Producto guardado exitosamente', { productId: result.id });
    return { success: true, data: result };
    
  } catch (error) {
    logger.error('Error al guardar producto', { error, product });
    
    if (error instanceof ValidationError) {
      return { success: false, error: 'Datos de producto inválidos' };
    }
    
    return { success: false, error: 'Error interno del servidor' };
  }
}
```

### Funciones Async/Await
```javascript
// ✅ Correcto - Uso consistente de async/await
async function loadProducts() {
  try {
    const products = await productRepository.findAll();
    const processedProducts = await Promise.all(
      products.map(product => processProduct(product))
    );
    return processedProducts;
  } catch (error) {
    throw new Error(`Error al cargar productos: ${error.message}`);
  }
}

// ❌ Incorrecto - Mezclar promises y async/await
async function loadProducts() {
  return productRepository.findAll()
    .then(products => {
      return products.map(product => processProduct(product));
    });
}
```

## 📚 Documentación de Código

### JSDoc para Funciones
```javascript
/**
 * Busca un producto por su código de barras
 * @param {string} barcode - Código de barras del producto
 * @param {Object} options - Opciones de búsqueda
 * @param {boolean} options.includeInactive - Incluir productos inactivos
 * @param {string} options.source - Fuente de datos ('local', 'remote', 'both')
 * @returns {Promise<Object|null>} Producto encontrado o null si no existe
 * @throws {ValidationError} Cuando el código de barras es inválido
 * @example
 * const product = await findProductByBarcode('1234567890123', {
 *   includeInactive: false,
 *   source: 'both'
 * });
 */
async function findProductByBarcode(barcode, options = {}) {
  // Implementación...
}
```

### JSDoc para Clases
```javascript
/**
 * Repositorio para operaciones CRUD de productos
 * Maneja tanto almacenamiento local (IndexedDB) como remoto (Supabase)
 * 
 * @class ProductRepository
 * @example
 * const repo = new ProductRepository();
 * const product = await repo.findById('123');
 */
class ProductRepository {
  /**
   * Crea una nueva instancia del repositorio de productos
   * @param {Object} config - Configuración del repositorio
   * @param {boolean} config.enableSync - Habilitar sincronización automática
   */
  constructor(config = {}) {
    // Implementación...
  }
}
```

## 🎯 Principios de Diseño

### Single Responsibility Principle (SRP)
```javascript
// ✅ Correcto - Cada clase tiene una responsabilidad
class ProductValidator {
  validate(product) { /* solo validación */ }
}

class ProductRepository {
  save(product) { /* solo persistencia */ }
}

class ProductService {
  createProduct(data) {
    const product = this.validator.validate(data);
    return this.repository.save(product);
  }
}

// ❌ Incorrecto - Clase con múltiples responsabilidades
class ProductManager {
  validate(product) { /* validación */ }
  save(product) { /* persistencia */ }
  sendEmail(product) { /* notificación */ }
  generateReport(products) { /* reportes */ }
}
```

### Dependency Injection
```javascript
// ✅ Correcto - Inyección de dependencias
class ProductService {
  constructor(repository, validator, logger) {
    this.repository = repository;
    this.validator = validator;
    this.logger = logger;
  }
}

// Configuración
const productService = new ProductService(
  new ProductRepository(),
  new ProductValidator(),
  new Logger()
);

// ❌ Incorrecto - Dependencias hardcodeadas
class ProductService {
  constructor() {
    this.repository = new ProductRepository(); // Acoplamiento fuerte
    this.validator = new ProductValidator();   // Difícil de testear
  }
}
```

## 🧪 Patrones de Testing

### Nomenclatura de Tests
```javascript
// ✅ Correcto - Descriptivo y en español
describe('ProductValidator', () => {
  describe('validate', () => {
    test('debe validar un producto correcto', () => {
      // Test...
    });
    
    test('debe rechazar un producto sin código', () => {
      // Test...
    });
    
    test('debe rechazar un producto con precio negativo', () => {
      // Test...
    });
  });
});

// ❌ Incorrecto - Poco descriptivo
describe('ProductValidator', () => {
  test('test1', () => {
    // Test...
  });
  
  test('validation test', () => {
    // Test...
  });
});
```

### Estructura de Tests
```javascript
// ✅ Correcto - Patrón Arrange-Act-Assert
test('debe calcular el precio total correctamente', () => {
  // Arrange
  const products = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 }
  ];
  const calculator = new PriceCalculator();
  
  // Act
  const total = calculator.calculateTotal(products);
  
  // Assert
  expect(total).toBe(350);
});
```

## 📋 Checklist de Revisión de Código

### Antes de Commit
- [ ] El código sigue las convenciones de nomenclatura
- [ ] Todas las funciones tienen documentación JSDoc
- [ ] No hay console.log() en código de producción
- [ ] Se manejan todos los errores posibles
- [ ] Las funciones tienen máximo 50 líneas
- [ ] La complejidad ciclomática es menor a 10
- [ ] Se han añadido tests para nueva funcionalidad
- [ ] Los tests pasan exitosamente
- [ ] No hay código duplicado
- [ ] Las dependencias están bien definidas

### Revisión de Pull Request
- [ ] El código es fácil de entender
- [ ] Los nombres de variables son descriptivos
- [ ] No hay lógica de negocio en componentes de UI
- [ ] Se siguen los principios SOLID
- [ ] El rendimiento es aceptable
- [ ] La documentación está actualizada
- [ ] No hay vulnerabilidades de seguridad

## 🔧 Herramientas de Calidad

### Scripts de Package.json
```json
{
  "scripts": {
    "lint": "eslint js/ --ext .js",
    "lint:fix": "eslint js/ --ext .js --fix",
    "format": "prettier --write js/**/*.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "analyze": "node tools/dependency-analyzer.js"
  }
}
```

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 Ejecutando verificaciones antes del commit..."

# Ejecutar linter
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Error en linting. Corrige los errores antes de hacer commit."
  exit 1
fi

# Ejecutar tests
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests fallaron. Corrige los errores antes de hacer commit."
  exit 1
fi

echo "✅ Todas las verificaciones pasaron. Procediendo con el commit..."
```
