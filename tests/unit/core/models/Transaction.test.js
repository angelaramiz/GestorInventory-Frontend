/**
 * @fileoverview Tests para la clase Transaction
 */

import Transaction from '../../../../src/core/models/Transaction';

describe('Transaction', () => {
  let transaction;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-transaction-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    transaction = new Transaction();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(transaction.id).toBe(mockId);
      expect(transaction.type).toBe('');
      expect(transaction.sourceId).toBe('');
      expect(transaction.destinationId).toBe('');
      expect(transaction.items).toEqual([]);
      expect(transaction.status).toBe('pending');
      expect(transaction.documentNumber).toBe('');
      expect(transaction.documentType).toBe('');
      expect(transaction.date).toBe(mockDate);
      expect(transaction.notes).toBe('');
      expect(transaction.createdBy).toBe('');
      expect(transaction.approvedBy).toBeNull();
      expect(transaction.createdAt).toBe(mockDate);
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        type: 'entry',
        sourceId: 'supplier-1',
        destinationId: 'inventory-1',
        items: [{ productId: 'product-1', quantity: 10, cost: 5, price: 10 }],
        status: 'completed',
        documentNumber: 'INV-001',
        documentType: 'invoice',
        date: '2022-12-01T00:00:00.000Z',
        notes: 'Test notes',
        createdBy: 'user-1',
        approvedBy: 'user-2',
        createdAt: '2022-12-01T00:00:00.000Z',
        updatedAt: '2022-12-01T00:00:00.000Z'
      };
      
      transaction = new Transaction(testData);
      
      expect(transaction.id).toBe('existing-id');
      expect(transaction.type).toBe('entry');
      expect(transaction.sourceId).toBe('supplier-1');
      expect(transaction.destinationId).toBe('inventory-1');
      expect(transaction.items).toEqual([{ productId: 'product-1', quantity: 10, cost: 5, price: 10 }]);
      expect(transaction.status).toBe('completed');
      expect(transaction.documentNumber).toBe('INV-001');
      expect(transaction.documentType).toBe('invoice');
      expect(transaction.date).toBe('2022-12-01T00:00:00.000Z');
      expect(transaction.notes).toBe('Test notes');
      expect(transaction.createdBy).toBe('user-1');
      expect(transaction.approvedBy).toBe('user-2');
      expect(transaction.createdAt).toBe('2022-12-01T00:00:00.000Z');
      expect(transaction.updatedAt).toBe('2022-12-01T00:00:00.000Z');
    });
  });

  describe('validate', () => {
    test('debe validar una transacción válida de entrada', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, cost: 5 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(true);
      expect(transaction.getErrors()).toEqual({});
    });

    test('debe validar una transacción válida de salida', () => {
      transaction.type = 'exit';
      transaction.destinationId = 'customer-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, price: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(true);
      expect(transaction.getErrors()).toEqual({});
    });

    test('debe validar una transacción válida de transferencia', () => {
      transaction.type = 'transfer';
      transaction.sourceId = 'inventory-1';
      transaction.destinationId = 'inventory-2';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(true);
      expect(transaction.getErrors()).toEqual({});
    });

    test('debe validar una transacción válida de ajuste', () => {
      transaction.type = 'adjustment';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(true);
      expect(transaction.getErrors()).toEqual({});
    });

    test('debe detectar tipo de transacción vacío', () => {
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('type')).toBe(true);
      expect(transaction.getError('type')).toBe('El tipo de transacción es obligatorio');
    });

    test('debe detectar tipo de transacción inválido', () => {
      transaction.type = 'invalid-type';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('type')).toBe(true);
      expect(transaction.getError('type')).toContain('El tipo debe ser uno de:');
    });

    test('debe detectar sourceId vacío en transacción de entrada', () => {
      transaction.type = 'entry';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('sourceId')).toBe(true);
      expect(transaction.getError('sourceId')).toBe('El origen es obligatorio para este tipo de transacción');
    });

    test('debe detectar destinationId vacío en transacción de salida', () => {
      transaction.type = 'exit';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('destinationId')).toBe(true);
      expect(transaction.getError('destinationId')).toBe('El destino es obligatorio para este tipo de transacción');
    });

    test('debe detectar sourceId y destinationId iguales en transferencia', () => {
      transaction.type = 'transfer';
      transaction.sourceId = 'inventory-1';
      transaction.destinationId = 'inventory-1';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('destinationId')).toBe(true);
      expect(transaction.getError('destinationId')).toBe('El origen y destino no pueden ser iguales en una transferencia');
    });

    test('debe detectar items vacíos', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('items')).toBe(true);
      expect(transaction.getError('items')).toBe('La transacción debe tener al menos un ítem');
    });

    test('debe detectar ítem sin productId', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ quantity: 10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].productId).toBe('El ID del producto es obligatorio');
    });

    test('debe detectar ítem con cantidad no numérica', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 'not-a-number' }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].quantity).toBe('La cantidad debe ser un número');
    });

    test('debe detectar ítem con cantidad cero o negativa', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 0 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].quantity).toBe('La cantidad debe ser mayor que cero');
    });

    test('debe detectar ítem con costo no numérico', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, cost: 'not-a-number' }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].cost).toBe('El costo debe ser un número');
    });

    test('debe detectar ítem con costo negativo', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, cost: -5 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].cost).toBe('El costo no puede ser negativo');
    });

    test('debe detectar ítem con precio no numérico', () => {
      transaction.type = 'exit';
      transaction.destinationId = 'customer-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, price: 'not-a-number' }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].price).toBe('El precio debe ser un número');
    });

    test('debe detectar ítem con precio negativo', () => {
      transaction.type = 'exit';
      transaction.destinationId = 'customer-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, price: -10 }];
      transaction.createdBy = 'user-1';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction._errors.itemDetails).toBeDefined();
      expect(transaction._errors.itemDetails[0].price).toBe('El precio no puede ser negativo');
    });

    test('debe detectar estado inválido', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      transaction.status = 'invalid-status';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('status')).toBe(true);
      expect(transaction.getError('status')).toContain('El estado debe ser uno de:');
    });

    test('debe detectar fecha vacía', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      transaction._data.date = '';
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('date')).toBe(true);
      expect(transaction.getError('date')).toBe('La fecha es obligatoria');
    });

    test('debe detectar fecha inválida', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      transaction.createdBy = 'user-1';
      transaction._data.date = 'invalid-date';
      
      // Mockear el error de Date
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Invalid date');
      });
      global.Date.prototype = originalDate.prototype;
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('date')).toBe(true);
      
      // Restaurar Date
      global.Date = originalDate;
    });

    test('debe detectar createdBy vacío', () => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10 }];
      
      expect(transaction.validate()).toBe(false);
      expect(transaction.hasError('createdBy')).toBe(true);
      expect(transaction.getError('createdBy')).toBe('El usuario que crea la transacción es obligatorio');
    });
  });

  describe('complete', () => {
    beforeEach(() => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, cost: 5 }];
      transaction.createdBy = 'user-1';
    });

    test('debe completar una transacción pendiente', () => {
      transaction.complete('user-2');
      
      expect(transaction.status).toBe('completed');
      expect(transaction.approvedBy).toBe('user-2');
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe lanzar error si la transacción no está pendiente', () => {
      transaction.status = 'completed';
      
      expect(() => transaction.complete('user-2')).toThrow(/No se puede completar una transacción con estado/);
    });

    test('debe lanzar error si la transacción no es válida', () => {
      transaction.items = []; // Hacer inválida la transacción
      
      expect(() => transaction.complete('user-2')).toThrow('No se puede completar una transacción inválida');
    });

    test('debe lanzar error si no se proporciona un usuario para aprobar', () => {
      expect(() => transaction.complete()).toThrow('Se requiere un usuario para aprobar la transacción');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transaction.complete('user-2')).toBe(transaction);
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.items = [{ productId: 'product-1', quantity: 10, cost: 5 }];
      transaction.createdBy = 'user-1';
    });

    test('debe cancelar una transacción pendiente', () => {
      transaction.cancel('Productos no disponibles');
      
      expect(transaction.status).toBe('cancelled');
      expect(transaction.notes).toBe('Cancelada: Productos no disponibles');
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe añadir la razón de cancelación a las notas existentes', () => {
      transaction.notes = 'Notas iniciales';
      transaction.cancel('Productos no disponibles');
      
      expect(transaction.notes).toBe('Notas iniciales\nCancelada: Productos no disponibles');
    });

    test('debe cancelar sin razón si no se proporciona', () => {
      transaction.cancel();
      
      expect(transaction.status).toBe('cancelled');
      expect(transaction.notes).toBe('');
    });

    test('debe lanzar error si la transacción ya está completada', () => {
      transaction.status = 'completed';
      
      expect(() => transaction.cancel('Razón')).toThrow('No se puede cancelar una transacción ya completada');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transaction.cancel('Razón')).toBe(transaction);
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.createdBy = 'user-1';
    });

    test('debe añadir un ítem a la transacción', () => {
      transaction.addItem({ productId: 'product-1', quantity: 10, cost: 5, price: 10 });
      
      expect(transaction.items).toHaveLength(1);
      expect(transaction.items[0]).toEqual({
        productId: 'product-1',
        batchId: null,
        quantity: 10,
        cost: 5,
        price: 10
      });
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe añadir un ítem con valores por defecto para propiedades opcionales', () => {
      transaction.addItem({ productId: 'product-1', quantity: 10 });
      
      expect(transaction.items).toHaveLength(1);
      expect(transaction.items[0]).toEqual({
        productId: 'product-1',
        batchId: null,
        quantity: 10,
        cost: 0,
        price: 0
      });
    });

    test('debe lanzar error si la transacción no está pendiente', () => {
      transaction.status = 'completed';
      
      expect(() => transaction.addItem({ productId: 'product-1', quantity: 10 }))
        .toThrow('No se pueden añadir ítems a una transacción que no está pendiente');
    });

    test('debe lanzar error si el ítem no tiene productId', () => {
      expect(() => transaction.addItem({ quantity: 10 }))
        .toThrow('El ítem debe tener un ID de producto');
    });

    test('debe lanzar error si el ítem tiene cantidad inválida', () => {
      expect(() => transaction.addItem({ productId: 'product-1', quantity: 0 }))
        .toThrow('El ítem debe tener una cantidad válida mayor que cero');
      
      expect(() => transaction.addItem({ productId: 'product-1', quantity: -5 }))
        .toThrow('El ítem debe tener una cantidad válida mayor que cero');
      
      expect(() => transaction.addItem({ productId: 'product-1', quantity: 'not-a-number' }))
        .toThrow('El ítem debe tener una cantidad válida mayor que cero');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transaction.addItem({ productId: 'product-1', quantity: 10 })).toBe(transaction);
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.createdBy = 'user-1';
      transaction.items = [
        { productId: 'product-1', quantity: 10, cost: 5 },
        { productId: 'product-2', quantity: 5, cost: 10 }
      ];
    });

    test('debe eliminar un ítem por su índice', () => {
      transaction.removeItem(0);
      
      expect(transaction.items).toHaveLength(1);
      expect(transaction.items[0].productId).toBe('product-2');
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe lanzar error si la transacción no está pendiente', () => {
      transaction.status = 'completed';
      
      expect(() => transaction.removeItem(0))
        .toThrow('No se pueden eliminar ítems de una transacción que no está pendiente');
    });

    test('debe lanzar error si el índice es inválido', () => {
      expect(() => transaction.removeItem(-1))
        .toThrow('Índice de ítem inválido');
      
      expect(() => transaction.removeItem(2))
        .toThrow('Índice de ítem inválido');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transaction.removeItem(0)).toBe(transaction);
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      transaction.type = 'entry';
      transaction.sourceId = 'supplier-1';
      transaction.createdBy = 'user-1';
      transaction.items = [
        { productId: 'product-1', quantity: 10, cost: 5, price: 10 }
      ];
    });

    test('debe actualizar un ítem por su índice', () => {
      transaction.updateItem(0, { quantity: 15, cost: 7.5 });
      
      expect(transaction.items[0]).toEqual({
        productId: 'product-1',
        quantity: 15,
        cost: 7.5,
        price: 10
      });
      expect(transaction.updatedAt).toBe(mockDate);
    });

    test('debe lanzar error si la transacción no está pendiente', () => {
      transaction.status = 'completed';
      
      expect(() => transaction.updateItem(0, { quantity: 15 }))
        .toThrow('No se pueden actualizar ítems de una transacción que no está pendiente');
    });

    test('debe lanzar error si el índice es inválido', () => {
      expect(() => transaction.updateItem(-1, { quantity: 15 }))
        .toThrow('Índice de ítem inválido');
      
      expect(() => transaction.updateItem(1, { quantity: 15 }))
        .toThrow('Índice de ítem inválido');
    });

    test('debe lanzar error si la cantidad es inválida', () => {
      expect(() => transaction.updateItem(0, { quantity: 0 }))
        .toThrow('La cantidad debe ser un número mayor que cero');
      
      expect(() => transaction.updateItem(0, { quantity: -5 }))
        .toThrow('La cantidad debe ser un número mayor que cero');
      
      expect(() => transaction.updateItem(0, { quantity: 'not-a-number' }))
        .toThrow('La cantidad debe ser un número mayor que cero');
    });

    test('debe lanzar error si el costo es inválido', () => {
      expect(() => transaction.updateItem(0, { cost: -5 }))
        .toThrow('El costo debe ser un número no negativo');
      
      expect(() => transaction.updateItem(0, { cost: 'not-a-number' }))
        .toThrow('El costo debe ser un número no negativo');
    });

    test('debe lanzar error si el precio es inválido', () => {
      expect(() => transaction.updateItem(0, { price: -10 }))
        .toThrow('El precio debe ser un número no negativo');
      
      expect(() => transaction.updateItem(0, { price: 'not-a-number' }))
        .toThrow('El precio debe ser un número no negativo');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transaction.updateItem(0, { quantity: 15 })).toBe(transaction);
    });
  });

  describe('getTotalValue', () => {
    beforeEach(() => {
      transaction.items = [
        { productId: 'product-1', quantity: 10, cost: 5, price: 10 },
        { productId: 'product-2', quantity: 5, cost: 10, price: 20 }
      ];
    });

    test('debe calcular el valor total por costo correctamente', () => {
      expect(transaction.getTotalValue('cost')).toBe(100); // (10*5) + (5*10) = 50 + 50 = 100
    });

    test('debe calcular el valor total por precio correctamente', () => {
      expect(transaction.getTotalValue('price')).toBe(200); // (10*10) + (5*20) = 100 + 100 = 200
    });

    test('debe usar costo por defecto si no se especifica campo', () => {
      expect(transaction.getTotalValue()).toBe(100);
    });

    test('debe lanzar error si el campo es inválido', () => {
      expect(() => transaction.getTotalValue('invalid-field'))
        .toThrow('El campo debe ser "cost" o "price"');
    });

    test('debe manejar ítems sin costo o precio', () => {
      transaction.items = [
        { productId: 'product-1', quantity: 10 },
        { productId: 'product-2', quantity: 5, cost: 10 }
      ];
      
      expect(transaction.getTotalValue('cost')).toBe(50); // (10*0) + (5*10) = 0 + 50 = 50
      expect(transaction.getTotalValue('price')).toBe(0); // (10*0) + (5*0) = 0
    });
  });

  describe('getTotalQuantity', () => {
    test('debe calcular la cantidad total correctamente', () => {
      transaction.items = [
        { productId: 'product-1', quantity: 10 },
        { productId: 'product-2', quantity: 5 },
        { productId: 'product-3', quantity: 15 }
      ];
      
      expect(transaction.getTotalQuantity()).toBe(30); // 10 + 5 + 15 = 30
    });

    test('debe retornar 0 si no hay ítems', () => {
      transaction.items = [];
      
      expect(transaction.getTotalQuantity()).toBe(0);
    });
  });

  describe('getUniqueItemsCount', () => {
    test('debe contar productos únicos correctamente', () => {
      transaction.items = [
        { productId: 'product-1', quantity: 10 },
        { productId: 'product-2', quantity: 5 },
        { productId: 'product-1', quantity: 15 } // Duplicado
      ];
      
      expect(transaction.getUniqueItemsCount()).toBe(2); // product-1, product-2
    });

    test('debe retornar 0 si no hay ítems', () => {
      transaction.items = [];
      
      expect(transaction.getUniqueItemsCount()).toBe(0);
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      transaction.type = 'entry';
      expect(transaction.type).toBe('entry');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(transaction.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      transaction.sourceId = 'supplier-1';
      expect(transaction.sourceId).toBe('supplier-1');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.destinationId = 'inventory-1';
      expect(transaction.destinationId).toBe('inventory-1');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.status = 'completed';
      expect(transaction.status).toBe('completed');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.documentNumber = 'INV-001';
      expect(transaction.documentNumber).toBe('INV-001');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.documentType = 'invoice';
      expect(transaction.documentType).toBe('invoice');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.date = '2023-02-01T00:00:00.000Z';
      expect(transaction.date).toBe('2023-02-01T00:00:00.000Z');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.notes = 'New notes';
      expect(transaction.notes).toBe('New notes');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transaction.createdBy = 'user-2';
      expect(transaction.createdBy).toBe('user-2');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });

    test('debe lanzar error si se intenta establecer un tipo inválido', () => {
      expect(() => transaction.type = 'invalid-type')
        .toThrow(/Tipo inválido. Debe ser uno de:/);
    });

    test('debe lanzar error si se intenta establecer un estado inválido', () => {
      expect(() => transaction.status = 'invalid-status')
        .toThrow(/Estado inválido. Debe ser uno de:/);
    });

    test('debe manejar fechas como objetos Date', () => {
      const dateObj = new Date('2023-02-01');
      transaction.date = dateObj;
      
      expect(transaction.date).toBe(mockDate); // Usa el mock de toISOString
    });

    test('debe lanzar error si se intenta establecer una fecha inválida', () => {
      // Mockear el error de Date
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Invalid date');
      });
      global.Date.prototype = originalDate.prototype;
      
      expect(() => transaction.date = 'invalid-date')
        .toThrow('Formato de fecha inválido');
      
      // Restaurar Date
      global.Date = originalDate;
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente la transacción', () => {
      const testData = {
        id: 'test-id',
        type: 'entry',
        sourceId: 'supplier-1',
        items: [{ productId: 'product-1', quantity: 10, cost: 5 }],
        createdBy: 'user-1'
      };
      
      transaction = new Transaction(testData);
      const json = transaction.toJSON();
      
      expect(json).toEqual(expect.objectContaining(testData));
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});