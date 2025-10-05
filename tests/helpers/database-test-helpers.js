// tests/helpers/database-test-helpers.js
/**
 * Helpers Específicos para Testing de DatabaseService
 * Basado en lecciones aprendidas durante implementación de tests
 * @author Testing Team
 * @date 2025-10-05
 */

/**
 * Validador de Schema de IndexedDB
 * Verifica que un object store tenga el schema esperado
 * 
 * @param {IDBObjectStore} store - Object store a validar
 * @param {Object} expectedSchema - Schema esperado
 * @param {string} expectedSchema.keyPath - KeyPath esperado
 * @param {string[]} expectedSchema.indices - Lista de índices esperados
 * @throws {Error} Si el schema no coincide
 * 
 * @example
 * const store = db.transaction('productos').objectStore('productos');
 * validateIndexedDBSchema(store, {
 *   keyPath: 'codigo',
 *   indices: ['codigo', 'nombre', 'categoria', 'marca', 'unidad']
 * });
 */
export function validateIndexedDBSchema(store, expectedSchema) {
  if (!store) {
    throw new Error('❌ Store is required for schema validation');
  }
  
  if (!expectedSchema) {
    throw new Error('❌ Expected schema is required');
  }

  // Validar keyPath
  if (expectedSchema.keyPath) {
    if (store.keyPath !== expectedSchema.keyPath) {
      throw new Error(
        `❌ KeyPath mismatch: expected "${expectedSchema.keyPath}", got "${store.keyPath}"`
      );
    }
  }

  // Validar índices
  if (expectedSchema.indices && Array.isArray(expectedSchema.indices)) {
    const missingIndices = expectedSchema.indices.filter(
      indexName => !store.indexNames.contains(indexName)
    );
    
    if (missingIndices.length > 0) {
      throw new Error(
        `❌ Missing indices: ${missingIndices.join(', ')}`
      );
    }
  }

  return true;
}

/**
 * Helper para testear eventos emitidos de forma segura
 * Evita falsos positivos y proporciona mejor debugging
 * 
 * @param {EventEmitter} service - Servicio que emite eventos
 * @param {string} eventName - Nombre del evento esperado
 * @param {Function} action - Acción que debería emitir el evento
 * @param {Object} expectedPayload - Payload esperado (partial match)
 * @returns {Promise<Object>} Payload real recibido
 * 
 * @example
 * const payload = await expectEventEmitted(
 *   service,
 *   'productAdded',
 *   () => service.addProduct({ codigo: 'TEST' }),
 *   { product: { codigo: 'TEST' }, eventType: 'INSERT' }
 * );
 */
export async function expectEventEmitted(service, eventName, action, expectedPayload) {
  const listener = jest.fn();
  service.on(eventName, listener);

  try {
    // Ejecutar acción (soporta async y sync)
    const result = action();
    
    // Si es una Promise, esperarla
    if (result && typeof result.then === 'function') {
      await result;
    }
    
    // Pequeño delay para permitir que eventos asíncronos se emitan
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verificar que el evento fue emitido
    if (listener.mock.calls.length === 0) {
      throw new Error(`❌ Event "${eventName}" was not emitted`);
    }

    expect(listener).toHaveBeenCalledTimes(1);

    // Si se especifica payload esperado, verificar
    if (expectedPayload) {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining(expectedPayload)
      );
    }

    // Retornar payload real para verificaciones adicionales
    return listener.mock.calls[0][0];
    
  } finally {
    // Cleanup: remover listener
    service.off(eventName, listener);
  }
}

/**
 * Verificar que localStorage contiene una key con valor específico
 * Útil para tests de persistencia
 * 
 * @param {string} key - Key a verificar
 * @param {*} expectedValue - Valor esperado
 * @param {boolean} parse - Si debe parsear JSON (default: auto-detect)
 * 
 * @example
 * expectLocalStorageToContain('syncQueue', [{ id: 1 }]);
 * expectLocalStorageToContain('lastSync', '2025-10-05T12:00:00.000Z', false);
 */
export function expectLocalStorageToContain(key, expectedValue, parse = null) {
  const value = localStorage.getItem(key);
  
  if (value === null) {
    throw new Error(`❌ localStorage key "${key}" not found`);
  }

  // Auto-detect si debe parsear
  const shouldParse = parse !== null 
    ? parse 
    : typeof expectedValue === 'object' && expectedValue !== null;

  if (shouldParse) {
    try {
      const parsed = JSON.parse(value);
      expect(parsed).toEqual(expectedValue);
    } catch (error) {
      throw new Error(
        `❌ Failed to parse localStorage["${key}"]: ${error.message}\nValue: ${value}`
      );
    }
  } else {
    expect(value).toBe(String(expectedValue));
  }
}

/**
 * Limpiar y resetear todas las stores de IndexedDB de forma segura
 * 
 * @param {IDBDatabase} db - Database a limpiar
 * @param {string[]} storeNames - Nombres de stores a limpiar
 * @returns {Promise<void>}
 * 
 * @example
 * await clearIndexedDBStores(db, ['productos', 'inventario']);
 */
export async function clearIndexedDBStores(db, storeNames) {
  if (!db) {
    throw new Error('❌ Database instance is required');
  }

  const promises = storeNames.map(storeName => {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(
          `Failed to clear store "${storeName}": ${request.error}`
        ));
      } catch (error) {
        reject(new Error(`Store "${storeName}" not found or cannot be cleared`));
      }
    });
  });

  await Promise.all(promises);
}

/**
 * Poblar store de IndexedDB con datos mock
 * 
 * @param {IDBDatabase} db - Database
 * @param {string} storeName - Nombre del store
 * @param {Object[]} items - Items a insertar
 * @returns {Promise<void>}
 * 
 * @example
 * await populateIndexedDBStore(db, 'productos', [
 *   { codigo: 'TEST-001', nombre: 'Producto 1' },
 *   { codigo: 'TEST-002', nombre: 'Producto 2' }
 * ]);
 */
export async function populateIndexedDBStore(db, storeName, items) {
  if (!db || !storeName || !Array.isArray(items)) {
    throw new Error('❌ Invalid parameters for populateIndexedDBStore');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    items.forEach(item => {
      objectStore.add(item);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error(
      `Failed to populate store "${storeName}": ${transaction.error}`
    ));
  });
}

/**
 * Crear producto mock con valores por defecto
 * 
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Producto mock
 * 
 * @example
 * const product = createMockProduct({ 
 *   codigo: 'CUSTOM-001',
 *   precio: 299.99 
 * });
 */
export function createMockProduct(overrides = {}) {
  return {
    codigo: `TEST-${Date.now().toString().slice(-6)}`,
    nombre: 'Producto Test',
    descripcion: 'Descripción del producto test',
    categoria: 'Categoría Test',
    marca: 'Marca Test',
    unidad: 'UND',
    precio: 100.00,
    cantidad: 10,
    area_id: 'test-area-123',
    activo: true,
    fechaCreacion: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Crear inventario mock con valores por defecto
 * 
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Inventario mock
 */
export function createMockInventory(overrides = {}) {
  return {
    codigo: `TEST-${Date.now().toString().slice(-6)}`,
    cantidad: 10,
    cantidadMinima: 5,
    cantidadMaxima: 100,
    fechaActualizacion: new Date().toISOString(),
    lote: `LOTE-${Date.now().toString().slice(-4)}`,
    area_id: 'test-area-123',
    ...overrides
  };
}

/**
 * Crear múltiples productos mock de una vez
 * 
 * @param {number} count - Cantidad de productos
 * @param {Function} customizer - Función para customizar cada producto
 * @returns {Array<Object>} Array de productos
 * 
 * @example
 * const products = createMockProducts(5, (index) => ({
 *   codigo: `PROD-${String(index + 1).padStart(3, '0')}`,
 *   precio: (index + 1) * 100
 * }));
 */
export function createMockProducts(count, customizer = () => ({})) {
  return Array.from({ length: count }, (_, index) => 
    createMockProduct({
      codigo: `TEST-${String(index + 1).padStart(3, '0')}`,
      nombre: `Producto ${index + 1}`,
      ...customizer(index)
    })
  );
}

/**
 * Esperar a que una condición se cumpla (polling con timeout)
 * 
 * @param {Function} condition - Función que retorna boolean
 * @param {number} timeout - Timeout en ms (default: 1000)
 * @param {number} interval - Intervalo de chequeo en ms (default: 50)
 * @returns {Promise<boolean>}
 * @throws {Error} Si timeout se alcanza
 * 
 * @example
 * await waitForCondition(
 *   () => service.isInitialized === true,
 *   2000, // 2 segundos timeout
 *   100   // check cada 100ms
 * );
 */
export async function waitForCondition(condition, timeout = 1000, interval = 50) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (condition()) {
        return true;
      }
    } catch (error) {
      // Ignorar errores durante polling
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(
    `⏱️ Timeout: Condition not met after ${timeout}ms`
  );
}

/**
 * Mock mejorado de Supabase con eventos en tiempo real
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Object} options.customBehavior - Comportamiento custom
 * @param {boolean} options.enableRealtime - Habilitar mocks de realtime
 * @returns {Object} Mock de Supabase client
 * 
 * @example
 * const supabase = createEnhancedMockSupabase({
 *   enableRealtime: true,
 *   customBehavior: {
 *     select: jest.fn().mockResolvedValue({ 
 *       data: [{ id: 1 }], 
 *       error: null 
 *     })
 *   }
 * });
 */
export function createEnhancedMockSupabase(options = {}) {
  const { customBehavior = {}, enableRealtime = true } = options;

  const mockSubscription = {
    unsubscribe: jest.fn().mockResolvedValue({ error: null })
  };

  const mockChannel = {
    on: jest.fn(function(event, schema, callback) {
      // Guardar callback para poder triggerearlo en tests
      this._callbacks = this._callbacks || {};
      this._callbacks[event] = callback;
      return this;
    }),
    subscribe: jest.fn().mockReturnValue(mockSubscription),
    // Helper para trigger eventos en tests
    _triggerEvent: function(eventType, payload) {
      if (this._callbacks && this._callbacks[eventType]) {
        this._callbacks[eventType](payload);
      }
    }
  };

  const baseMock = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn().mockResolvedValue({ data: {}, error: null }),
    upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...customBehavior
  };

  if (enableRealtime) {
    baseMock.channel = jest.fn().mockReturnValue(mockChannel);
    baseMock._channel = mockChannel; // Exponer para tests
  }

  return baseMock;
}

/**
 * Constantes de Storage Keys para evitar magic strings
 */
export const STORAGE_KEYS = {
  SYNC_QUEUE: 'syncQueue',
  LAST_SYNC: 'lastSync',
  AREA_ID: 'area_id',
  USER_ID: 'user_id',
  SESSION: 'session'
};

/**
 * Constantes de Eventos para evitar typos
 */
export const SERVICE_EVENTS = {
  INITIALIZED: 'initialized',
  PRODUCT_ADDED: 'productAdded',
  PRODUCT_UPDATED: 'productUpdated',
  PRODUCT_DELETED: 'productDeleted',
  INVENTORY_ADDED: 'inventoryAdded',
  INVENTORY_UPDATED: 'inventoryUpdated',
  INVENTORY_DELETED: 'inventoryDeleted',
  SYNC_QUEUE_PROCESSED: 'syncQueueProcessed',
  ITEM_ADDED_TO_SYNC_QUEUE: 'itemAddedToSyncQueue',
  OPERATION_ERROR: 'operationError'
};

// Export por defecto con todos los helpers
export default {
  validateIndexedDBSchema,
  expectEventEmitted,
  expectLocalStorageToContain,
  clearIndexedDBStores,
  populateIndexedDBStore,
  createMockProduct,
  createMockInventory,
  createMockProducts,
  waitForCondition,
  createEnhancedMockSupabase,
  STORAGE_KEYS,
  SERVICE_EVENTS
};
