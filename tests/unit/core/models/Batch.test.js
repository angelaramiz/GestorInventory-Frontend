/**
 * @fileoverview Tests para la clase Batch
 */

import Batch from '../../../../src/core/models/Batch';

describe('Batch', () => {
  let batch;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-batch-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para Date.now para controlar las comparaciones de fechas
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2023-01-01').getTime());
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    batch = new Batch();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(batch.id).toBe(mockId);
      expect(batch.productId).toBe('');
      expect(batch.inventoryId).toBe('');
      expect(batch.quantity).toBe(0);
      expect(batch.cost).toBe(0);
      expect(batch.price).toBe(0);
      expect(batch.batchNumber).toBe('');
      expect(batch.expirationDate).toBeNull();
      expect(batch.manufacturingDate).toBeNull();
      expect(batch.supplier).toBe('');
      expect(batch.notes).toBe('');
      expect(batch.status).toBe('active');
      expect(batch.createdAt).toBe(mockDate);
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        productId: 'product-1',
        inventoryId: 'inventory-1',
        quantity: 100,
        cost: 5.99,
        price: 10.99,
        batchNumber: 'BATCH-123',
        expirationDate: '2024-01-01T00:00:00.000Z',
        manufacturingDate: '2022-01-01T00:00:00.000Z',
        supplier: 'Test Supplier',
        notes: 'Test notes',
        status: 'quarantine',
        createdAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-01-01T00:00:00.000Z'
      };
      
      batch = new Batch(testData);
      
      expect(batch.id).toBe('existing-id');
      expect(batch.productId).toBe('product-1');
      expect(batch.inventoryId).toBe('inventory-1');
      expect(batch.quantity).toBe(100);
      expect(batch.cost).toBe(5.99);
      expect(batch.price).toBe(10.99);
      expect(batch.batchNumber).toBe('BATCH-123');
      expect(batch.expirationDate).toBe('2024-01-01T00:00:00.000Z');
      expect(batch.manufacturingDate).toBe('2022-01-01T00:00:00.000Z');
      expect(batch.supplier).toBe('Test Supplier');
      expect(batch.notes).toBe('Test notes');
      expect(batch.status).toBe('quarantine');
      expect(batch.createdAt).toBe('2022-01-01T00:00:00.000Z');
      expect(batch.updatedAt).toBe('2022-01-01T00:00:00.000Z');
    });
  });

  describe('validate', () => {
    test('debe validar un lote válido', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5.99;
      batch.price = 10.99;
      batch.status = 'active';
      
      expect(batch.validate()).toBe(true);
      expect(batch.getErrors()).toEqual({});
    });

    test('debe detectar productId vacío', () => {
      batch.inventoryId = 'inventory-1';
      
      expect(batch.validate()).toBe(false);
      expect(batch.hasError('productId')).toBe(true);
      expect(batch.getError('productId')).toBe('El ID del producto es obligatorio');
    });

    test('debe detectar inventoryId vacío', () => {
      batch.productId = 'product-1';
      
      expect(batch.validate()).toBe(false);
      expect(batch.hasError('inventoryId')).toBe(true);
      expect(batch.getError('inventoryId')).toBe('El ID del inventario es obligatorio');
    });

    test('debe validar que la cantidad sea un número', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 'not-a-number';
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('quantity')).toBe('La cantidad debe ser un número');
    });

    test('debe validar que la cantidad no sea negativa', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = -10;
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('quantity')).toBe('La cantidad no puede ser negativa');
    });

    test('debe validar que el costo sea un número', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 'not-a-number';
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('cost')).toBe('El costo debe ser un número');
    });

    test('debe validar que el costo no sea negativo', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = -5;
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('cost')).toBe('El costo no puede ser negativo');
    });

    test('debe validar que el precio sea un número', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5;
      batch.price = 'not-a-number';
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('price')).toBe('El precio debe ser un número');
    });

    test('debe validar que el precio no sea negativo', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5;
      batch.price = -10;
      
      expect(batch.validate()).toBe(false);
      expect(batch.getError('price')).toBe('El precio no puede ser negativo');
    });

    test('debe validar el estado del lote', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5;
      batch.price = 10;
      batch.status = 'invalid-status';
      
      expect(batch.validate()).toBe(false);
      expect(batch.hasError('status')).toBe(true);
      expect(batch.getError('status')).toContain('El estado debe ser uno de:');
    });

    test('debe validar el formato de la fecha de expiración', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5;
      batch.price = 10;
      batch._data.expirationDate = 'invalid-date';
      
      // Mockear el error de Date
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Invalid date');
      });
      global.Date.prototype = originalDate.prototype;
      
      expect(batch.validate()).toBe(false);
      expect(batch.hasError('expirationDate')).toBe(true);
      
      // Restaurar Date
      global.Date = originalDate;
    });

    test('debe validar el formato de la fecha de fabricación', () => {
      batch.productId = 'product-1';
      batch.inventoryId = 'inventory-1';
      batch.quantity = 100;
      batch.cost = 5;
      batch.price = 10;
      batch._data.manufacturingDate = 'invalid-date';
      
      // Mockear el error de Date
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Invalid date');
      });
      global.Date.prototype = originalDate.prototype;
      
      expect(batch.validate()).toBe(false);
      expect(batch.hasError('manufacturingDate')).toBe(true);
      
      // Restaurar Date
      global.Date = originalDate;
    });
  });

  describe('updateQuantity', () => {
    test('debe incrementar la cantidad correctamente', () => {
      batch.quantity = 10;
      batch.updateQuantity(5);
      
      expect(batch.quantity).toBe(15);
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe decrementar la cantidad correctamente', () => {
      batch.quantity = 10;
      batch.updateQuantity(-5);
      
      expect(batch.quantity).toBe(5);
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe cambiar el estado a depleted cuando la cantidad llega a cero', () => {
      batch.quantity = 5;
      batch.updateQuantity(-5);
      
      expect(batch.quantity).toBe(0);
      expect(batch.status).toBe('depleted');
    });

    test('debe lanzar error si se intenta decrementar más de lo disponible', () => {
      batch.quantity = 10;
      
      expect(() => batch.updateQuantity(-15)).toThrow('No hay suficiente cantidad disponible en el lote');
      expect(batch.quantity).toBe(10); // La cantidad no debe cambiar
    });

    test('debe retornar la instancia para encadenamiento', () => {
      batch.quantity = 10;
      
      expect(batch.updateQuantity(5)).toBe(batch);
    });
  });

  describe('isExpired', () => {
    test('debe retornar true si la fecha de expiración es anterior a la fecha actual', () => {
      batch.expirationDate = '2022-01-01T00:00:00.000Z'; // Anterior a mockDate
      
      expect(batch.isExpired()).toBe(true);
    });

    test('debe retornar false si la fecha de expiración es posterior a la fecha actual', () => {
      batch.expirationDate = '2024-01-01T00:00:00.000Z'; // Posterior a mockDate
      
      expect(batch.isExpired()).toBe(false);
    });

    test('debe retornar false si no hay fecha de expiración', () => {
      batch.expirationDate = null;
      
      expect(batch.isExpired()).toBe(false);
    });
  });

  describe('markAsExpired', () => {
    test('debe marcar el lote como expirado', () => {
      batch.status = 'active';
      batch.markAsExpired();
      
      expect(batch.status).toBe('expired');
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(batch.markAsExpired()).toBe(batch);
    });
  });

  describe('markAsQuarantine', () => {
    test('debe marcar el lote como en cuarentena', () => {
      batch.status = 'active';
      batch.markAsQuarantine();
      
      expect(batch.status).toBe('quarantine');
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe añadir la razón de la cuarentena a las notas', () => {
      batch.notes = 'Notas iniciales';
      batch.markAsQuarantine('Producto dañado');
      
      expect(batch.notes).toBe('Notas iniciales\nEn cuarentena: Producto dañado');
    });

    test('no debe modificar las notas si no se proporciona una razón', () => {
      batch.notes = 'Notas iniciales';
      batch.markAsQuarantine();
      
      expect(batch.notes).toBe('Notas iniciales');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(batch.markAsQuarantine()).toBe(batch);
    });
  });

  describe('markAsActive', () => {
    test('debe marcar el lote como activo', () => {
      batch.status = 'quarantine';
      batch.quantity = 10;
      batch.markAsActive();
      
      expect(batch.status).toBe('active');
      expect(batch.updatedAt).toBe(mockDate);
    });

    test('debe lanzar error si el lote no tiene existencias', () => {
      batch.status = 'depleted';
      batch.quantity = 0;
      
      expect(() => batch.markAsActive()).toThrow('No se puede marcar como activo un lote sin existencias');
      expect(batch.status).toBe('depleted');
    });

    test('debe lanzar error si el lote está expirado', () => {
      batch.status = 'expired';
      batch.quantity = 10;
      batch.expirationDate = '2022-01-01T00:00:00.000Z'; // Anterior a mockDate
      
      expect(() => batch.markAsActive()).toThrow('No se puede marcar como activo un lote expirado');
      expect(batch.status).toBe('expired');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      batch.quantity = 10;
      batch.expirationDate = '2024-01-01T00:00:00.000Z'; // Posterior a mockDate
      
      expect(batch.markAsActive()).toBe(batch);
    });
  });

  describe('getTotalValue', () => {
    test('debe calcular el valor total correctamente', () => {
      batch.quantity = 10;
      batch.cost = 5;
      
      expect(batch.getTotalValue()).toBe(50); // 10 * 5 = 50
    });

    test('debe retornar 0 si la cantidad es 0', () => {
      batch.quantity = 0;
      batch.cost = 5;
      
      expect(batch.getTotalValue()).toBe(0);
    });

    test('debe retornar 0 si el costo es 0', () => {
      batch.quantity = 10;
      batch.cost = 0;
      
      expect(batch.getTotalValue()).toBe(0);
    });
  });

  describe('getDaysUntilExpiration', () => {
    test('debe calcular los días hasta la expiración correctamente', () => {
      // Configurar la fecha actual como 2023-01-01
      const mockNow = new Date('2023-01-01').getTime();
      jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
      
      // Fecha de expiración 10 días después
      batch.expirationDate = '2023-01-11T00:00:00.000Z';
      
      expect(batch.getDaysUntilExpiration()).toBe(10);
    });

    test('debe retornar 0 si la fecha de expiración es anterior a la fecha actual', () => {
      // Configurar la fecha actual como 2023-01-01
      const mockNow = new Date('2023-01-01').getTime();
      jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
      
      // Fecha de expiración 10 días antes
      batch.expirationDate = '2022-12-22T00:00:00.000Z';
      
      expect(batch.getDaysUntilExpiration()).toBe(0);
    });

    test('debe retornar null si no hay fecha de expiración', () => {
      batch.expirationDate = null;
      
      expect(batch.getDaysUntilExpiration()).toBeNull();
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      batch.productId = 'new-product';
      expect(batch.productId).toBe('new-product');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(batch.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      batch.inventoryId = 'new-inventory';
      expect(batch.inventoryId).toBe('new-inventory');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.quantity = 20;
      expect(batch.quantity).toBe(20);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.cost = 7.99;
      expect(batch.cost).toBe(7.99);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.price = 15.99;
      expect(batch.price).toBe(15.99);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.batchNumber = 'NEW-BATCH';
      expect(batch.batchNumber).toBe('NEW-BATCH');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.expirationDate = '2024-01-01T00:00:00.000Z';
      expect(batch.expirationDate).toBe('2024-01-01T00:00:00.000Z');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.manufacturingDate = '2022-01-01T00:00:00.000Z';
      expect(batch.manufacturingDate).toBe('2022-01-01T00:00:00.000Z');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.supplier = 'New Supplier';
      expect(batch.supplier).toBe('New Supplier');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.notes = 'New notes';
      expect(batch.notes).toBe('New notes');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      batch.status = 'depleted';
      expect(batch.status).toBe('depleted');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });

    test('debe convertir valores a los tipos correctos', () => {
      batch.quantity = '15';
      expect(batch.quantity).toBe(15);
      
      batch.cost = '7.50';
      expect(batch.cost).toBe(7.5);
      
      batch.price = '12.99';
      expect(batch.price).toBe(12.99);
    });

    test('debe lanzar error si se intenta establecer una cantidad negativa', () => {
      expect(() => batch.quantity = -10).toThrow('La cantidad no puede ser negativa');
      expect(batch.quantity).toBe(0); // La cantidad no debe cambiar
    });

    test('debe cambiar el estado a depleted cuando la cantidad se establece a cero', () => {
      batch.status = 'active';
      batch.quantity = 0;
      
      expect(batch.status).toBe('depleted');
    });

    test('debe lanzar error si se intenta establecer un estado inválido', () => {
      expect(() => batch.status = 'invalid-status').toThrow('Estado inválido');
      expect(batch.status).toBe('active'); // El estado no debe cambiar
    });

    test('debe manejar fechas como objetos Date', () => {
      const dateObj = new Date('2024-01-01');
      batch.expirationDate = dateObj;
      
      expect(batch.expirationDate).toBe(mockDate); // Usa el mock de toISOString
      
      const dateObj2 = new Date('2022-01-01');
      batch.manufacturingDate = dateObj2;
      
      expect(batch.manufacturingDate).toBe(mockDate); // Usa el mock de toISOString
    });

    test('debe actualizar el estado a expired si la fecha de expiración es anterior a la fecha actual', () => {
      batch.status = 'active';
      batch.expirationDate = '2022-01-01T00:00:00.000Z'; // Anterior a mockDate
      
      expect(batch.status).toBe('expired');
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente el lote', () => {
      const testData = {
        id: 'test-id',
        productId: 'product-1',
        inventoryId: 'inventory-1',
        quantity: 100,
        cost: 5.99,
        price: 10.99
      };
      
      batch = new Batch(testData);
      const json = batch.toJSON();
      
      expect(json).toEqual(expect.objectContaining(testData));
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});