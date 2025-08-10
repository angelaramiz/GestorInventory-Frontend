/**
 * @fileoverview Tests para la clase Product
 */

import Product from '../../../../src/core/models/Product';

describe('Product', () => {
  let product;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-product-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    product = new Product();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(product.id).toBe(mockId);
      expect(product.name).toBe('');
      expect(product.sku).toBe('');
      expect(product.description).toBe('');
      expect(product.price).toBe(0);
      expect(product.cost).toBe(0);
      expect(product.stock).toBe(0);
      expect(product.minStock).toBe(0);
      expect(product.category).toBe('');
      expect(product.supplier).toBe('');
      expect(product.location).toBe('');
      expect(product.imageUrl).toBe('');
      expect(product.barcode).toBe('');
      expect(product.isActive).toBe(true);
      expect(product.createdAt).toBe(mockDate);
      expect(product.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        name: 'Test Product',
        sku: 'TEST-123',
        description: 'Test description',
        price: 10.99,
        cost: 5.99,
        stock: 100,
        minStock: 10,
        category: 'Test Category',
        supplier: 'Test Supplier',
        location: 'A1',
        imageUrl: 'test.jpg',
        barcode: '123456789',
        isActive: false,
        createdAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-01-01T00:00:00.000Z'
      };
      
      product = new Product(testData);
      
      expect(product.id).toBe('existing-id');
      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('TEST-123');
      expect(product.description).toBe('Test description');
      expect(product.price).toBe(10.99);
      expect(product.cost).toBe(5.99);
      expect(product.stock).toBe(100);
      expect(product.minStock).toBe(10);
      expect(product.category).toBe('Test Category');
      expect(product.supplier).toBe('Test Supplier');
      expect(product.location).toBe('A1');
      expect(product.imageUrl).toBe('test.jpg');
      expect(product.barcode).toBe('123456789');
      expect(product.isActive).toBe(false);
      expect(product.createdAt).toBe('2022-01-01T00:00:00.000Z');
      expect(product.updatedAt).toBe('2022-01-01T00:00:00.000Z');
    });
  });

  describe('validate', () => {
    test('debe validar un producto válido', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10.99;
      product.cost = 5.99;
      product.stock = 100;
      product.minStock = 10;
      
      expect(product.validate()).toBe(true);
      expect(product.getErrors()).toEqual({});
    });

    test('debe detectar nombre vacío', () => {
      product.sku = 'TEST-123';
      
      expect(product.validate()).toBe(false);
      expect(product.hasError('name')).toBe(true);
      expect(product.getError('name')).toBe('El nombre del producto es obligatorio');
    });

    test('debe validar longitud mínima del nombre', () => {
      product.name = 'AB';
      product.sku = 'TEST-123';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('name')).toBe('El nombre debe tener al menos 3 caracteres');
    });

    test('debe validar longitud máxima del nombre', () => {
      product.name = 'A'.repeat(101);
      product.sku = 'TEST-123';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('name')).toBe('El nombre no puede exceder los 100 caracteres');
    });

    test('debe detectar SKU vacío', () => {
      product.name = 'Test Product';
      
      expect(product.validate()).toBe(false);
      expect(product.hasError('sku')).toBe(true);
      expect(product.getError('sku')).toBe('El SKU es obligatorio');
    });

    test('debe validar formato de SKU', () => {
      product.name = 'Test Product';
      product.sku = 'TEST@123';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('sku')).toBe('El SKU solo puede contener letras, números y guiones');
    });

    test('debe validar que el precio sea un número', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 'not-a-number';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('price')).toBe('El precio debe ser un número');
    });

    test('debe validar que el precio no sea negativo', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = -10;
      
      expect(product.validate()).toBe(false);
      expect(product.getError('price')).toBe('El precio no puede ser negativo');
    });

    test('debe validar que el costo sea un número', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = 'not-a-number';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('cost')).toBe('El costo debe ser un número');
    });

    test('debe validar que el costo no sea negativo', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = -5;
      
      expect(product.validate()).toBe(false);
      expect(product.getError('cost')).toBe('El costo no puede ser negativo');
    });

    test('debe validar que el stock sea un número', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = 5;
      product.stock = 'not-a-number';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('stock')).toBe('El stock debe ser un número');
    });

    test('debe validar que el stock no sea negativo', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = 5;
      product.stock = -10;
      
      expect(product.validate()).toBe(false);
      expect(product.getError('stock')).toBe('El stock no puede ser negativo');
    });

    test('debe validar que el stock mínimo sea un número', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = 5;
      product.stock = 100;
      product.minStock = 'not-a-number';
      
      expect(product.validate()).toBe(false);
      expect(product.getError('minStock')).toBe('El stock mínimo debe ser un número');
    });

    test('debe validar que el stock mínimo no sea negativo', () => {
      product.name = 'Test Product';
      product.sku = 'TEST-123';
      product.price = 10;
      product.cost = 5;
      product.stock = 100;
      product.minStock = -10;
      
      expect(product.validate()).toBe(false);
      expect(product.getError('minStock')).toBe('El stock mínimo no puede ser negativo');
    });
  });

  describe('getProfitMargin', () => {
    test('debe calcular el margen de beneficio correctamente', () => {
      product.price = 10;
      product.cost = 5;
      
      expect(product.getProfitMargin()).toBe(100); // (10-5)/5 * 100 = 100%
    });

    test('debe retornar 0 si el costo es 0', () => {
      product.price = 10;
      product.cost = 0;
      
      expect(product.getProfitMargin()).toBe(0);
    });

    test('debe retornar 0 si el costo es negativo', () => {
      product.price = 10;
      product.cost = -5;
      
      expect(product.getProfitMargin()).toBe(0);
    });
  });

  describe('isBelowMinStock', () => {
    test('debe retornar true si el stock está por debajo del mínimo', () => {
      product.stock = 5;
      product.minStock = 10;
      
      expect(product.isBelowMinStock()).toBe(true);
    });

    test('debe retornar false si el stock es igual al mínimo', () => {
      product.stock = 10;
      product.minStock = 10;
      
      expect(product.isBelowMinStock()).toBe(false);
    });

    test('debe retornar false si el stock está por encima del mínimo', () => {
      product.stock = 15;
      product.minStock = 10;
      
      expect(product.isBelowMinStock()).toBe(false);
    });
  });

  describe('updateStock', () => {
    test('debe incrementar el stock correctamente', () => {
      product.stock = 10;
      product.updateStock(5);
      
      expect(product.stock).toBe(15);
      expect(product.updatedAt).toBe(mockDate);
    });

    test('debe decrementar el stock correctamente', () => {
      product.stock = 10;
      product.updateStock(-5);
      
      expect(product.stock).toBe(5);
      expect(product.updatedAt).toBe(mockDate);
    });

    test('debe lanzar error si se intenta decrementar más del stock disponible', () => {
      product.stock = 10;
      
      expect(() => product.updateStock(-15)).toThrow('No hay suficiente stock disponible');
      expect(product.stock).toBe(10); // El stock no debe cambiar
    });

    test('debe retornar la instancia para encadenamiento', () => {
      product.stock = 10;
      
      expect(product.updateStock(5)).toBe(product);
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      product.name = 'New Name';
      expect(product.name).toBe('New Name');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(product.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      product.sku = 'NEW-SKU';
      expect(product.sku).toBe('NEW-SKU');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.description = 'New description';
      expect(product.description).toBe('New description');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.price = 20;
      expect(product.price).toBe(20);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.cost = 10;
      expect(product.cost).toBe(10);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.stock = 50;
      expect(product.stock).toBe(50);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.minStock = 5;
      expect(product.minStock).toBe(5);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.category = 'New Category';
      expect(product.category).toBe('New Category');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.supplier = 'New Supplier';
      expect(product.supplier).toBe('New Supplier');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.location = 'B2';
      expect(product.location).toBe('B2');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.imageUrl = 'new.jpg';
      expect(product.imageUrl).toBe('new.jpg');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.barcode = '987654321';
      expect(product.barcode).toBe('987654321');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      product.isActive = false;
      expect(product.isActive).toBe(false);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });

    test('debe convertir valores a los tipos correctos', () => {
      product.price = '15.99';
      expect(product.price).toBe(15.99);
      
      product.cost = '7.50';
      expect(product.cost).toBe(7.5);
      
      product.stock = '200';
      expect(product.stock).toBe(200);
      
      product.minStock = '20';
      expect(product.minStock).toBe(20);
      
      product.isActive = 0;
      expect(product.isActive).toBe(false);
      
      product.isActive = 1;
      expect(product.isActive).toBe(true);
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente el producto', () => {
      const testData = {
        id: 'test-id',
        name: 'Test Product',
        sku: 'TEST-123',
        price: 10.99,
        stock: 100
      };
      
      product = new Product(testData);
      const json = product.toJSON();
      
      expect(json).toEqual(expect.objectContaining(testData));
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});