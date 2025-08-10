/**
 * @fileoverview Tests para la clase Inventory
 */

import Inventory from '../../../../src/core/models/Inventory';

describe('Inventory', () => {
  let inventory;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-inventory-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    inventory = new Inventory();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(inventory.id).toBe(mockId);
      expect(inventory.name).toBe('');
      expect(inventory.description).toBe('');
      expect(inventory.location).toBe('');
      expect(inventory.type).toBe('general');
      expect(inventory.isActive).toBe(true);
      expect(inventory.getAllProducts()).toEqual([]);
      expect(inventory.createdAt).toBe(mockDate);
      expect(inventory.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        name: 'Test Inventory',
        description: 'Test description',
        location: 'Warehouse A',
        type: 'warehouse',
        isActive: false,
        products: [{ id: 'product-1', name: 'Product 1', quantity: 10 }],
        createdAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-01-01T00:00:00.000Z'
      };
      
      inventory = new Inventory(testData);
      
      expect(inventory.id).toBe('existing-id');
      expect(inventory.name).toBe('Test Inventory');
      expect(inventory.description).toBe('Test description');
      expect(inventory.location).toBe('Warehouse A');
      expect(inventory.type).toBe('warehouse');
      expect(inventory.isActive).toBe(false);
      expect(inventory.getAllProducts()).toEqual([{ id: 'product-1', name: 'Product 1', quantity: 10 }]);
      expect(inventory.createdAt).toBe('2022-01-01T00:00:00.000Z');
      expect(inventory.updatedAt).toBe('2022-01-01T00:00:00.000Z');
    });
  });

  describe('validate', () => {
    test('debe validar un inventario válido', () => {
      inventory.name = 'Test Inventory';
      inventory.type = 'warehouse';
      
      expect(inventory.validate()).toBe(true);
      expect(inventory.getErrors()).toEqual({});
    });

    test('debe detectar nombre vacío', () => {
      inventory.type = 'warehouse';
      
      expect(inventory.validate()).toBe(false);
      expect(inventory.hasError('name')).toBe(true);
      expect(inventory.getError('name')).toBe('El nombre del inventario es obligatorio');
    });

    test('debe validar longitud mínima del nombre', () => {
      inventory.name = 'AB';
      inventory.type = 'warehouse';
      
      expect(inventory.validate()).toBe(false);
      expect(inventory.getError('name')).toBe('El nombre debe tener al menos 3 caracteres');
    });

    test('debe validar longitud máxima del nombre', () => {
      inventory.name = 'A'.repeat(101);
      inventory.type = 'warehouse';
      
      expect(inventory.validate()).toBe(false);
      expect(inventory.getError('name')).toBe('El nombre no puede exceder los 100 caracteres');
    });

    test('debe validar tipo de inventario', () => {
      inventory.name = 'Test Inventory';
      inventory.type = 'invalid-type';
      
      expect(inventory.validate()).toBe(false);
      expect(inventory.hasError('type')).toBe(true);
      expect(inventory.getError('type')).toContain('El tipo debe ser uno de:');
    });

    test('debe validar que products sea un array', () => {
      inventory.name = 'Test Inventory';
      inventory._data.products = 'not-an-array';
      
      expect(inventory.validate()).toBe(false);
      expect(inventory.hasError('products')).toBe(true);
      expect(inventory.getError('products')).toBe('Los productos deben ser un array');
    });
  });

  describe('addProduct', () => {
    test('debe añadir un nuevo producto al inventario', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      
      expect(inventory.getAllProducts()).toEqual([product]);
      expect(inventory.updatedAt).toBe(mockDate);
    });

    test('debe actualizar un producto existente', () => {
      const product1 = { id: 'product-1', name: 'Product 1', quantity: 10 };
      const product1Updated = { id: 'product-1', name: 'Product 1 Updated', quantity: 15 };
      
      inventory.addProduct(product1);
      inventory.addProduct(product1Updated);
      
      expect(inventory.getAllProducts()).toEqual([product1Updated]);
      expect(inventory.productCount).toBe(1);
    });

    test('debe lanzar error si el producto es inválido', () => {
      expect(() => inventory.addProduct(null)).toThrow('Producto inválido');
      expect(() => inventory.addProduct({})).toThrow('Producto inválido');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      expect(inventory.addProduct(product)).toBe(inventory);
    });
  });

  describe('removeProduct', () => {
    test('debe eliminar un producto del inventario', () => {
      const product1 = { id: 'product-1', name: 'Product 1', quantity: 10 };
      const product2 = { id: 'product-2', name: 'Product 2', quantity: 20 };
      
      inventory.addProduct(product1);
      inventory.addProduct(product2);
      inventory.removeProduct('product-1');
      
      expect(inventory.getAllProducts()).toEqual([product2]);
      expect(inventory.updatedAt).toBe(mockDate);
    });

    test('no debe modificar el inventario si el producto no existe', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      jest.clearAllMocks(); // Limpiar el mock de Date.toISOString
      
      inventory.removeProduct('non-existent');
      
      expect(inventory.getAllProducts()).toEqual([product]);
      expect(Date.prototype.toISOString).not.toHaveBeenCalled();
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(inventory.removeProduct('any-id')).toBe(inventory);
    });
  });

  describe('getProduct', () => {
    test('debe obtener un producto por su ID', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      
      expect(inventory.getProduct('product-1')).toEqual(product);
    });

    test('debe retornar null si el producto no existe', () => {
      expect(inventory.getProduct('non-existent')).toBeNull();
    });

    test('debe retornar una copia del producto, no la referencia', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      const retrievedProduct = inventory.getProduct('product-1');
      
      expect(retrievedProduct).toEqual(product);
      expect(retrievedProduct).not.toBe(inventory._data.products[0]);
    });
  });

  describe('getAllProducts', () => {
    test('debe obtener todos los productos', () => {
      const product1 = { id: 'product-1', name: 'Product 1', quantity: 10 };
      const product2 = { id: 'product-2', name: 'Product 2', quantity: 20 };
      
      inventory.addProduct(product1);
      inventory.addProduct(product2);
      
      expect(inventory.getAllProducts()).toEqual([product1, product2]);
    });

    test('debe retornar un array vacío si no hay productos', () => {
      expect(inventory.getAllProducts()).toEqual([]);
    });

    test('debe retornar una copia del array, no la referencia', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      const products = inventory.getAllProducts();
      
      expect(products).toEqual([product]);
      expect(products).not.toBe(inventory._data.products);
    });
  });

  describe('updateProductQuantity', () => {
    test('debe incrementar la cantidad de un producto', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      inventory.updateProductQuantity('product-1', 5);
      
      expect(inventory.getProduct('product-1').quantity).toBe(15);
      expect(inventory.updatedAt).toBe(mockDate);
    });

    test('debe decrementar la cantidad de un producto', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      inventory.updateProductQuantity('product-1', -5);
      
      expect(inventory.getProduct('product-1').quantity).toBe(5);
    });

    test('debe manejar productos sin cantidad inicial', () => {
      const product = { id: 'product-1', name: 'Product 1' };
      
      inventory.addProduct(product);
      inventory.updateProductQuantity('product-1', 5);
      
      expect(inventory.getProduct('product-1').quantity).toBe(5);
    });

    test('debe lanzar error si el producto no existe', () => {
      expect(() => inventory.updateProductQuantity('non-existent', 5))
        .toThrow('Producto con ID non-existent no encontrado en el inventario');
    });

    test('debe lanzar error si se intenta decrementar más de lo disponible', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      
      expect(() => inventory.updateProductQuantity('product-1', -15))
        .toThrow('No hay suficiente stock disponible');
      
      // La cantidad no debe cambiar
      expect(inventory.getProduct('product-1').quantity).toBe(10);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      const product = { id: 'product-1', name: 'Product 1', quantity: 10 };
      
      inventory.addProduct(product);
      
      expect(inventory.updateProductQuantity('product-1', 5)).toBe(inventory);
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      inventory.name = 'New Name';
      expect(inventory.name).toBe('New Name');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(inventory.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      inventory.description = 'New description';
      expect(inventory.description).toBe('New description');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      inventory.location = 'New Location';
      expect(inventory.location).toBe('New Location');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      inventory.type = 'store';
      expect(inventory.type).toBe('store');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      inventory.isActive = false;
      expect(inventory.isActive).toBe(false);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });
  });

  describe('productCount', () => {
    test('debe retornar el número de productos en el inventario', () => {
      expect(inventory.productCount).toBe(0);
      
      inventory.addProduct({ id: 'product-1', name: 'Product 1' });
      expect(inventory.productCount).toBe(1);
      
      inventory.addProduct({ id: 'product-2', name: 'Product 2' });
      expect(inventory.productCount).toBe(2);
      
      inventory.removeProduct('product-1');
      expect(inventory.productCount).toBe(1);
    });
  });

  describe('totalQuantity', () => {
    test('debe retornar la cantidad total de unidades en el inventario', () => {
      expect(inventory.totalQuantity).toBe(0);
      
      inventory.addProduct({ id: 'product-1', name: 'Product 1', quantity: 10 });
      expect(inventory.totalQuantity).toBe(10);
      
      inventory.addProduct({ id: 'product-2', name: 'Product 2', quantity: 20 });
      expect(inventory.totalQuantity).toBe(30);
      
      inventory.updateProductQuantity('product-1', 5);
      expect(inventory.totalQuantity).toBe(35);
      
      inventory.removeProduct('product-1');
      expect(inventory.totalQuantity).toBe(20);
    });

    test('debe manejar productos sin cantidad', () => {
      inventory.addProduct({ id: 'product-1', name: 'Product 1' });
      inventory.addProduct({ id: 'product-2', name: 'Product 2', quantity: 20 });
      
      expect(inventory.totalQuantity).toBe(20);
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente el inventario', () => {
      const testData = {
        id: 'test-id',
        name: 'Test Inventory',
        type: 'warehouse',
        products: [{ id: 'product-1', name: 'Product 1', quantity: 10 }]
      };
      
      inventory = new Inventory(testData);
      const json = inventory.toJSON();
      
      expect(json).toEqual(expect.objectContaining(testData));
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});