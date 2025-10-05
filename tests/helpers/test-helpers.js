// tests/helpers/test-helpers.js
// Helpers y utilidades para testing

/**
 * Crea un mock completo de DatabaseService
 */
export function createMockDatabaseService() {
  return {
    initialize: jest.fn().mockResolvedValue(true),
    openConnection: jest.fn().mockResolvedValue({}),
    closeConnection: jest.fn().mockResolvedValue(true),
    getAll: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockResolvedValue(null),
    add: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(true),
    count: jest.fn().mockResolvedValue(0)
  };
}

/**
 * Crea un mock de Supabase Client
 */
export function createMockSupabaseClient() {
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockIn = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ 
        data: { session: { access_token: 'mock-token' } }, 
        error: null 
      }),
      signOut: jest.fn().mockResolvedValue({ error: null })
    }
  };
}

/**
 * Crea un mock de SweetAlert2
 */
export function createMockSwal() {
  const mockSwal = jest.fn().mockResolvedValue({ 
    isConfirmed: true,
    value: null
  });
  
  mockSwal.fire = jest.fn().mockResolvedValue({ 
    isConfirmed: true,
    value: null
  });
  
  mockSwal.showLoading = jest.fn();
  mockSwal.close = jest.fn();
  mockSwal.isVisible = jest.fn().mockReturnValue(false);
  
  return mockSwal;
}

/**
 * Crea elementos DOM mockeados para testing
 */
export function createMockDOMElements(elementIds = []) {
  const elements = {};
  
  elementIds.forEach(id => {
    elements[id] = document.createElement('div');
    elements[id].id = id;
    document.body.appendChild(elements[id]);
  });
  
  return elements;
}

/**
 * Limpia elementos DOM creados
 */
export function cleanupMockDOMElements() {
  document.body.innerHTML = '';
}

/**
 * Crea un mock de producto
 */
export function createMockProduct(overrides = {}) {
  return {
    id: 1,
    codigo: 'TEST001',
    nombre: 'Producto Test',
    marca: 'Marca Test',
    precio: 100,
    cantidad: 10,
    categoria: 'Categoría Test',
    proveedor: 'Proveedor Test',
    ubicacion: 'Ubicación Test',
    fechaCreacion: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Crea un mock de entrada
 */
export function createMockEntry(overrides = {}) {
  return {
    id: 1,
    productoId: 1,
    codigo: 'TEST001',
    nombre: 'Producto Test',
    cantidad: 5,
    precio: 100,
    total: 500,
    proveedor: 'Proveedor Test',
    fecha: new Date().toISOString(),
    usuario: 'test@test.com',
    ...overrides
  };
}

/**
 * Crea un mock de lote
 */
export function createMockBatch(overrides = {}) {
  return {
    id: 1,
    codigo: 'LOTE001',
    productoId: 1,
    cantidad: 100,
    fechaFabricacion: '2025-01-01',
    fechaVencimiento: '2026-01-01',
    estado: 'activo',
    ...overrides
  };
}

/**
 * Crea un mock de área
 */
export function createMockArea(overrides = {}) {
  return {
    id: 1,
    nombre: 'Área Test',
    descripcion: 'Descripción de área test',
    activo: true,
    ...overrides
  };
}

/**
 * Espera a que se resuelvan todas las promesas pendientes
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Simula un delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea un mock de localStorage
 */
export function createMockLocalStorage() {
  const store = {};
  
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(index => Object.keys(store)[index] || null)
  };
}

/**
 * Crea un mock de fetch response
 */
export function createMockFetchResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    headers: new Headers(),
    clone: jest.fn()
  };
}

/**
 * Crea un mock de IndexedDB database
 */
export function createMockIDBDatabase() {
  return {
    transaction: jest.fn((storeNames, mode) => ({
      objectStore: jest.fn(name => ({
        get: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        getAll: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        add: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        put: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        delete: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        clear: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        }),
        count: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null
        })
      })),
      oncomplete: null,
      onerror: null
    })),
    close: jest.fn()
  };
}

/**
 * Helper para testear errores async
 */
export async function expectAsyncError(fn, errorMessage) {
  await expect(fn()).rejects.toThrow(errorMessage);
}

/**
 * Helper para verificar que un método fue llamado con ciertos parámetros
 */
export function expectCalledWith(mockFn, ...args) {
  expect(mockFn).toHaveBeenCalledWith(...args);
}

/**
 * Helper para verificar que un método NO fue llamado
 */
export function expectNotCalled(mockFn) {
  expect(mockFn).not.toHaveBeenCalled();
}

/**
 * Helper para resetear todos los mocks
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * Crea un mock de jsPDF
 */
export function createMockJsPDF() {
  return {
    internal: {
      pageSize: { width: 210, height: 297 }
    },
    text: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    setTextColor: jest.fn(),
    setFillColor: jest.fn(),
    setDrawColor: jest.fn(),
    setLineWidth: jest.fn(),
    rect: jest.fn(),
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    output: jest.fn().mockReturnValue('mock-pdf-data'),
    splitTextToSize: jest.fn((text, maxWidth) => {
      if (Array.isArray(text)) return text;
      return [text];
    }),
    getFontSize: jest.fn().mockReturnValue(10)
  };
}

/**
 * Crea un mock de JsBarcode
 */
export function createMockJsBarcode() {
  return jest.fn((element, text, options) => {
    if (element) {
      element.src = `data:image/png;base64,mock-barcode-${text}`;
    }
    return {
      render: jest.fn()
    };
  });
}

/**
 * Crea un mock de canvas para testing de barcodes
 */
export function createMockCanvas() {
  const canvas = document.createElement('canvas');
  canvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock-canvas-data');
  canvas.getContext = jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn()
  });
  return canvas;
}

/**
 * Espera a que un elemento esté visible en el DOM
 */
export async function waitForElement(selector, timeout = 3000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await delay(50);
  }
  
  throw new Error(`Element ${selector} not found after ${timeout}ms`);
}

/**
 * Simula un evento de teclado
 */
export function simulateKeyPress(element, key, keyCode) {
  const event = new KeyboardEvent('keydown', {
    key,
    keyCode,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

/**
 * Simula un click en un elemento
 */
export function simulateClick(element) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

/**
 * Simula un cambio en un input
 */
export function simulateInput(element, value) {
  element.value = value;
  const event = new Event('input', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

/**
 * Crea un array de productos mock
 */
export function createMockProducts(count = 5) {
  return Array.from({ length: count }, (_, i) => createMockProduct({
    id: i + 1,
    codigo: `TEST${String(i + 1).padStart(3, '0')}`,
    nombre: `Producto Test ${i + 1}`,
    precio: 100 + (i * 10),
    cantidad: 10 + i
  }));
}

/**
 * Crea un array de entradas mock
 */
export function createMockEntries(count = 5) {
  return Array.from({ length: count }, (_, i) => createMockEntry({
    id: i + 1,
    codigo: `TEST${String(i + 1).padStart(3, '0')}`,
    cantidad: 5 + i,
    total: (5 + i) * 100
  }));
}
