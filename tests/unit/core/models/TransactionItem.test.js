/**
 * @fileoverview Tests para la clase TransactionItem
 */

import TransactionItem from '../../../../src/core/models/TransactionItem';

describe('TransactionItem', () => {
  let transactionItem;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-transaction-item-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    transactionItem = new TransactionItem();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(transactionItem.id).toBe(mockId);
      expect(transactionItem.transactionId).toBeNull();
      expect(transactionItem.productId).toBeNull();
      expect(transactionItem.batchId).toBeNull();
      expect(transactionItem.quantity).toBe(0);
      expect(transactionItem.requestedQuantity).toBe(0);
      expect(transactionItem.unitCost).toBe(0);
      expect(transactionItem.unitPrice).toBe(0);
      expect(transactionItem.discount).toBe(0);
      expect(transactionItem.tax).toBe(0);
      expect(transactionItem.subtotal).toBe(0);
      expect(transactionItem.total).toBe(0);
      expect(transactionItem.notes).toBe('');
      expect(transactionItem.status).toBe('pending');
      expect(transactionItem.createdAt).toBe(mockDate);
      expect(transactionItem.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        transactionId: 'transaction-1',
        productId: 'product-1',
        batchId: 'batch-1',
        quantity: 10,
        requestedQuantity: 15,
        unitCost: 5,
        unitPrice: 10,
        discount: 5,
        tax: 10,
        subtotal: 100,
        total: 105,
        notes: 'Test notes',
        status: 'completed',
        createdAt: '2022-12-01T00:00:00.000Z',
        updatedAt: '2022-12-01T00:00:00.000Z'
      };
      
      transactionItem = new TransactionItem(testData);
      
      expect(transactionItem.id).toBe('existing-id');
      expect(transactionItem.transactionId).toBe('transaction-1');
      expect(transactionItem.productId).toBe('product-1');
      expect(transactionItem.batchId).toBe('batch-1');
      expect(transactionItem.quantity).toBe(10);
      expect(transactionItem.requestedQuantity).toBe(15);
      expect(transactionItem.unitCost).toBe(5);
      expect(transactionItem.unitPrice).toBe(10);
      expect(transactionItem.discount).toBe(5);
      expect(transactionItem.tax).toBe(10);
      expect(transactionItem.subtotal).toBe(100);
      expect(transactionItem.total).toBe(105);
      expect(transactionItem.notes).toBe('Test notes');
      expect(transactionItem.status).toBe('completed');
      expect(transactionItem.createdAt).toBe('2022-12-01T00:00:00.000Z');
      expect(transactionItem.updatedAt).toBe('2022-12-01T00:00:00.000Z');
    });

    test('debe calcular subtotal y total si no se proporcionan', () => {
      const testData = {
        productId: 'product-1',
        quantity: 10,
        unitPrice: 10,
        discount: 5,
        tax: 10
      };
      
      transactionItem = new TransactionItem(testData);
      
      // Subtotal = quantity * unitPrice = 10 * 10 = 100
      expect(transactionItem.subtotal).toBe(100);
      
      // Descuento = subtotal * (discount / 100) = 100 * 0.05 = 5
      // Después del descuento = 100 - 5 = 95
      // Impuesto = afterDiscount * (tax / 100) = 95 * 0.1 = 9.5
      // Total = afterDiscount + taxAmount = 95 + 9.5 = 104.5
      // Redondeado a 2 decimales = 104.5
      expect(transactionItem.total).toBe(104.5);
    });
  });

  describe('validate', () => {
    test('debe validar un ítem de transacción válido', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem.requestedQuantity = 10;
      
      expect(transactionItem.validate()).toBe(true);
      expect(transactionItem.getErrors()).toEqual({});
    });

    test('debe detectar transactionId vacío', () => {
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('transactionId')).toBe(true);
      expect(transactionItem.getError('transactionId')).toBe('El ID de transacción es obligatorio');
    });

    test('debe detectar productId vacío', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.quantity = 10;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('productId')).toBe(true);
      expect(transactionItem.getError('productId')).toBe('El ID de producto es obligatorio');
    });

    test('debe detectar cantidad no numérica', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem._data.quantity = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('quantity')).toBe(true);
      expect(transactionItem.getError('quantity')).toBe('La cantidad debe ser un número no negativo');
    });

    test('debe detectar cantidad negativa', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem._data.quantity = -5;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('quantity')).toBe(true);
      expect(transactionItem.getError('quantity')).toBe('La cantidad debe ser un número no negativo');
    });

    test('debe detectar cantidad solicitada no numérica', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.requestedQuantity = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('requestedQuantity')).toBe(true);
      expect(transactionItem.getError('requestedQuantity')).toBe('La cantidad solicitada debe ser un número no negativo');
    });

    test('debe detectar cantidad solicitada negativa', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.requestedQuantity = -5;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('requestedQuantity')).toBe(true);
      expect(transactionItem.getError('requestedQuantity')).toBe('La cantidad solicitada debe ser un número no negativo');
    });

    test('debe detectar costo unitario no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.unitCost = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('unitCost')).toBe(true);
      expect(transactionItem.getError('unitCost')).toBe('El costo unitario debe ser un número no negativo');
    });

    test('debe detectar costo unitario negativo', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.unitCost = -5;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('unitCost')).toBe(true);
      expect(transactionItem.getError('unitCost')).toBe('El costo unitario debe ser un número no negativo');
    });

    test('debe detectar precio unitario no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.unitPrice = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('unitPrice')).toBe(true);
      expect(transactionItem.getError('unitPrice')).toBe('El precio unitario debe ser un número no negativo');
    });

    test('debe detectar precio unitario negativo', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.unitPrice = -10;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('unitPrice')).toBe(true);
      expect(transactionItem.getError('unitPrice')).toBe('El precio unitario debe ser un número no negativo');
    });

    test('debe detectar descuento no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.discount = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('discount')).toBe(true);
      expect(transactionItem.getError('discount')).toBe('El descuento debe ser un número no negativo');
    });

    test('debe detectar descuento negativo', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.discount = -5;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('discount')).toBe(true);
      expect(transactionItem.getError('discount')).toBe('El descuento debe ser un número no negativo');
    });

    test('debe detectar impuesto no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.tax = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('tax')).toBe(true);
      expect(transactionItem.getError('tax')).toBe('El impuesto debe ser un número no negativo');
    });

    test('debe detectar impuesto negativo', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.tax = -10;
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('tax')).toBe(true);
      expect(transactionItem.getError('tax')).toBe('El impuesto debe ser un número no negativo');
    });

    test('debe detectar subtotal no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.subtotal = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('subtotal')).toBe(true);
      expect(transactionItem.getError('subtotal')).toBe('El subtotal debe ser un número');
    });

    test('debe detectar total no numérico', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.total = 'not-a-number';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('total')).toBe(true);
      expect(transactionItem.getError('total')).toBe('El total debe ser un número');
    });

    test('debe detectar estado inválido', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.quantity = 10;
      transactionItem._data.status = 'invalid-status';
      
      expect(transactionItem.validate()).toBe(false);
      expect(transactionItem.hasError('status')).toBe(true);
      expect(transactionItem.getError('status')).toContain('El estado debe ser uno de:');
    });
  });

  describe('calculateAmounts', () => {
    test('debe calcular subtotal y total correctamente', () => {
      transactionItem.quantity = 10;
      transactionItem.unitPrice = 15;
      transactionItem.discount = 5;
      transactionItem.tax = 10;
      
      transactionItem.calculateAmounts();
      
      // Subtotal = quantity * unitPrice = 10 * 15 = 150
      expect(transactionItem.subtotal).toBe(150);
      
      // Descuento = subtotal * (discount / 100) = 150 * 0.05 = 7.5
      // Después del descuento = 150 - 7.5 = 142.5
      // Impuesto = afterDiscount * (tax / 100) = 142.5 * 0.1 = 14.25
      // Total = afterDiscount + taxAmount = 142.5 + 14.25 = 156.75
      // Redondeado a 2 decimales = 156.75
      expect(transactionItem.total).toBe(156.75);
    });

    test('debe actualizar la fecha de actualización', () => {
      jest.clearAllMocks();
      
      transactionItem.calculateAmounts();
      
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(transactionItem.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transactionItem.calculateAmounts()).toBe(transactionItem);
    });
  });

  describe('updateQuantity', () => {
    test('debe actualizar la cantidad y recalcular montos', () => {
      transactionItem.quantity = 10;
      transactionItem.unitPrice = 15;
      transactionItem.discount = 5;
      transactionItem.tax = 10;
      
      // Calcular montos iniciales
      transactionItem.calculateAmounts();
      
      // Actualizar cantidad
      transactionItem.updateQuantity(20);
      
      expect(transactionItem.quantity).toBe(20);
      
      // Subtotal = quantity * unitPrice = 20 * 15 = 300
      expect(transactionItem.subtotal).toBe(300);
      
      // Descuento = subtotal * (discount / 100) = 300 * 0.05 = 15
      // Después del descuento = 300 - 15 = 285
      // Impuesto = afterDiscount * (tax / 100) = 285 * 0.1 = 28.5
      // Total = afterDiscount + taxAmount = 285 + 28.5 = 313.5
      // Redondeado a 2 decimales = 313.5
      expect(transactionItem.total).toBe(313.5);
    });

    test('debe lanzar error si la cantidad es inválida', () => {
      expect(() => transactionItem.updateQuantity('not-a-number'))
        .toThrow('La cantidad debe ser un número no negativo');
      
      expect(() => transactionItem.updateQuantity(-5))
        .toThrow('La cantidad debe ser un número no negativo');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transactionItem.updateQuantity(15)).toBe(transactionItem);
    });
  });

  describe('complete', () => {
    test('debe cambiar el estado a completado', () => {
      transactionItem.complete();
      
      expect(transactionItem.status).toBe('completed');
      expect(transactionItem.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transactionItem.complete()).toBe(transactionItem);
    });
  });

  describe('cancel', () => {
    test('debe cambiar el estado a cancelado', () => {
      transactionItem.cancel();
      
      expect(transactionItem.status).toBe('cancelled');
      expect(transactionItem.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transactionItem.cancel()).toBe(transactionItem);
    });
  });

  describe('isPending', () => {
    test('debe retornar true si el estado es pendiente', () => {
      transactionItem.status = 'pending';
      
      expect(transactionItem.isPending()).toBe(true);
    });

    test('debe retornar false si el estado no es pendiente', () => {
      transactionItem.status = 'completed';
      
      expect(transactionItem.isPending()).toBe(false);
      
      transactionItem.status = 'cancelled';
      
      expect(transactionItem.isPending()).toBe(false);
    });
  });

  describe('isCompleted', () => {
    test('debe retornar true si el estado es completado', () => {
      transactionItem.status = 'completed';
      
      expect(transactionItem.isCompleted()).toBe(true);
    });

    test('debe retornar false si el estado no es completado', () => {
      transactionItem.status = 'pending';
      
      expect(transactionItem.isCompleted()).toBe(false);
      
      transactionItem.status = 'cancelled';
      
      expect(transactionItem.isCompleted()).toBe(false);
    });
  });

  describe('isCancelled', () => {
    test('debe retornar true si el estado es cancelado', () => {
      transactionItem.status = 'cancelled';
      
      expect(transactionItem.isCancelled()).toBe(true);
    });

    test('debe retornar false si el estado no es cancelado', () => {
      transactionItem.status = 'pending';
      
      expect(transactionItem.isCancelled()).toBe(false);
      
      transactionItem.status = 'completed';
      
      expect(transactionItem.isCancelled()).toBe(false);
    });
  });

  describe('getQuantityDifference', () => {
    test('debe calcular la diferencia entre cantidad solicitada y actual', () => {
      transactionItem.requestedQuantity = 20;
      transactionItem.quantity = 15;
      
      expect(transactionItem.getQuantityDifference()).toBe(5);
    });

    test('debe retornar valor negativo si la cantidad actual es mayor que la solicitada', () => {
      transactionItem.requestedQuantity = 15;
      transactionItem.quantity = 20;
      
      expect(transactionItem.getQuantityDifference()).toBe(-5);
    });
  });

  describe('isQuantityFulfilled', () => {
    test('debe retornar true si la cantidad actual es igual a la solicitada', () => {
      transactionItem.requestedQuantity = 15;
      transactionItem.quantity = 15;
      
      expect(transactionItem.isQuantityFulfilled()).toBe(true);
    });

    test('debe retornar true si la cantidad actual es mayor que la solicitada', () => {
      transactionItem.requestedQuantity = 15;
      transactionItem.quantity = 20;
      
      expect(transactionItem.isQuantityFulfilled()).toBe(true);
    });

    test('debe retornar false si la cantidad actual es menor que la solicitada', () => {
      transactionItem.requestedQuantity = 20;
      transactionItem.quantity = 15;
      
      expect(transactionItem.isQuantityFulfilled()).toBe(false);
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      transactionItem.transactionId = 'transaction-1';
      expect(transactionItem.transactionId).toBe('transaction-1');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(transactionItem.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      transactionItem.productId = 'product-1';
      expect(transactionItem.productId).toBe('product-1');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transactionItem.batchId = 'batch-1';
      expect(transactionItem.batchId).toBe('batch-1');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transactionItem.requestedQuantity = 15;
      expect(transactionItem.requestedQuantity).toBe(15);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transactionItem.unitCost = 5;
      expect(transactionItem.unitCost).toBe(5);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transactionItem.notes = 'Test notes';
      expect(transactionItem.notes).toBe('Test notes');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      transactionItem.status = 'completed';
      expect(transactionItem.status).toBe('completed');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });

    test('debe recalcular montos al modificar propiedades que afectan el cálculo', () => {
      // Configurar valores iniciales
      transactionItem.quantity = 10;
      transactionItem.unitPrice = 15;
      transactionItem.discount = 5;
      transactionItem.tax = 10;
      
      // Calcular montos iniciales
      transactionItem.calculateAmounts();
      
      // Modificar cantidad mediante setter
      jest.clearAllMocks();
      transactionItem.quantity = 20;
      
      // Verificar que se recalcularon los montos
      expect(transactionItem.subtotal).toBe(300); // 20 * 15 = 300
      expect(transactionItem.total).toBe(313.5); // Ver cálculo en test de updateQuantity
      
      // Modificar precio unitario mediante setter
      jest.clearAllMocks();
      transactionItem.unitPrice = 20;
      
      // Verificar que se recalcularon los montos
      expect(transactionItem.subtotal).toBe(400); // 20 * 20 = 400
      expect(transactionItem.total).toBe(418); // (400 - 20) + (380 * 0.1) = 380 + 38 = 418
      
      // Modificar descuento mediante setter
      jest.clearAllMocks();
      transactionItem.discount = 10;
      
      // Verificar que se recalcularon los montos
      expect(transactionItem.subtotal).toBe(400); // 20 * 20 = 400
      expect(transactionItem.total).toBe(396); // (400 - 40) + (360 * 0.1) = 360 + 36 = 396
      
      // Modificar impuesto mediante setter
      jest.clearAllMocks();
      transactionItem.tax = 15;
      
      // Verificar que se recalcularon los montos
      expect(transactionItem.subtotal).toBe(400); // 20 * 20 = 400
      expect(transactionItem.total).toBe(414); // (400 - 40) + (360 * 0.15) = 360 + 54 = 414
    });

    test('debe lanzar error al establecer valores inválidos', () => {
      expect(() => { transactionItem.quantity = -5; })
        .toThrow('La cantidad debe ser un número no negativo');
      
      expect(() => { transactionItem.quantity = 'not-a-number'; })
        .toThrow('La cantidad debe ser un número no negativo');
      
      expect(() => { transactionItem.requestedQuantity = -5; })
        .toThrow('La cantidad solicitada debe ser un número no negativo');
      
      expect(() => { transactionItem.requestedQuantity = 'not-a-number'; })
        .toThrow('La cantidad solicitada debe ser un número no negativo');
      
      expect(() => { transactionItem.unitCost = -5; })
        .toThrow('El costo unitario debe ser un número no negativo');
      
      expect(() => { transactionItem.unitCost = 'not-a-number'; })
        .toThrow('El costo unitario debe ser un número no negativo');
      
      expect(() => { transactionItem.unitPrice = -10; })
        .toThrow('El precio unitario debe ser un número no negativo');
      
      expect(() => { transactionItem.unitPrice = 'not-a-number'; })
        .toThrow('El precio unitario debe ser un número no negativo');
      
      expect(() => { transactionItem.discount = -5; })
        .toThrow('El descuento debe ser un número no negativo');
      
      expect(() => { transactionItem.discount = 'not-a-number'; })
        .toThrow('El descuento debe ser un número no negativo');
      
      expect(() => { transactionItem.tax = -10; })
        .toThrow('El impuesto debe ser un número no negativo');
      
      expect(() => { transactionItem.tax = 'not-a-number'; })
        .toThrow('El impuesto debe ser un número no negativo');
      
      expect(() => { transactionItem.status = 'invalid-status'; })
        .toThrow('El estado debe ser uno de:');
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente a JSON', () => {
      transactionItem.transactionId = 'transaction-1';
      transactionItem.productId = 'product-1';
      transactionItem.batchId = 'batch-1';
      transactionItem.quantity = 10;
      transactionItem.requestedQuantity = 15;
      transactionItem.unitCost = 5;
      transactionItem.unitPrice = 10;
      transactionItem.discount = 5;
      transactionItem.tax = 10;
      transactionItem.notes = 'Test notes';
      transactionItem.status = 'completed';
      
      // Recalcular montos
      transactionItem.calculateAmounts();
      
      const json = transactionItem.toJSON();
      
      expect(json).toEqual({
        id: mockId,
        transactionId: 'transaction-1',
        productId: 'product-1',
        batchId: 'batch-1',
        quantity: 10,
        requestedQuantity: 15,
        unitCost: 5,
        unitPrice: 10,
        discount: 5,
        tax: 10,
        subtotal: 100,
        total: 104.5,
        notes: 'Test notes',
        status: 'completed',
        createdAt: mockDate,
        updatedAt: mockDate
      });
    });
  });

  describe('fromJSON', () => {
    test('debe deserializar correctamente desde JSON', () => {
      const json = {
        id: 'json-id',
        transactionId: 'transaction-1',
        productId: 'product-1',
        batchId: 'batch-1',
        quantity: 10,
        requestedQuantity: 15,
        unitCost: 5,
        unitPrice: 10,
        discount: 5,
        tax: 10,
        subtotal: 100,
        total: 104.5,
        notes: 'Test notes',
        status: 'completed',
        createdAt: '2022-12-01T00:00:00.000Z',
        updatedAt: '2022-12-01T00:00:00.000Z'
      };
      
      transactionItem.fromJSON(json);
      
      expect(transactionItem.id).toBe('json-id');
      expect(transactionItem.transactionId).toBe('transaction-1');
      expect(transactionItem.productId).toBe('product-1');
      expect(transactionItem.batchId).toBe('batch-1');
      expect(transactionItem.quantity).toBe(10);
      expect(transactionItem.requestedQuantity).toBe(15);
      expect(transactionItem.unitCost).toBe(5);
      expect(transactionItem.unitPrice).toBe(10);
      expect(transactionItem.discount).toBe(5);
      expect(transactionItem.tax).toBe(10);
      expect(transactionItem.subtotal).toBe(100);
      expect(transactionItem.total).toBe(104.5);
      expect(transactionItem.notes).toBe('Test notes');
      expect(transactionItem.status).toBe('completed');
      expect(transactionItem.createdAt).toBe('2022-12-01T00:00:00.000Z');
      expect(transactionItem.updatedAt).toBe('2022-12-01T00:00:00.000Z');
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(transactionItem.fromJSON({})).toBe(transactionItem);
    });
  });
});