// tests/setup.js
// Configuración global para Jest y mocks

// Mock para IndexedDB
import 'fake-indexeddb/auto';

// Mock para fetch
global.fetch = jest.fn();

// Mock para localStorage con funcionalidad real
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true
});

// Mock para sessionStorage con funcionalidad real
Object.defineProperty(window, 'sessionStorage', {
  value: new LocalStorageMock(),
  writable: true
});

// Mock para navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock para window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
  reload: jest.fn(),
  assign: jest.fn(),
  replace: jest.fn()
};

// Mock para Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        neq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        gt: jest.fn(() => Promise.resolve({ data: [], error: null })),
        lt: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        range: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      upsert: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ user: null, error: null })),
      signUp: jest.fn(() => Promise.resolve({ user: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getUser: jest.fn(() => Promise.resolve({ user: null, error: null })),
      getSession: jest.fn(() => Promise.resolve({ session: null, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      })),
      unsubscribe: jest.fn()
    }))
  }))
}));

// Mock para SweetAlert2
global.Swal = {
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
  close: jest.fn(),
  isVisible: jest.fn(() => false),
  mixin: jest.fn(() => ({
    fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
  }))
};

// Mock para JsBarcode
global.JsBarcode = jest.fn();

// Mock para jsPDF
global.jsPDF = jest.fn(() => ({
  text: jest.fn(),
  addPage: jest.fn(),
  save: jest.fn(),
  setFontSize: jest.fn(),
  setFont: jest.fn(),
  getTextWidth: jest.fn(() => 100),
  internal: {
    pageSize: {
      getWidth: jest.fn(() => 210),
      getHeight: jest.fn(() => 297)
    }
  }
}));

// Mock para Html5QrcodeScanner
global.Html5QrcodeScanner = jest.fn(() => ({
  render: jest.fn(),
  clear: jest.fn(),
  getState: jest.fn(() => 0) // Scanner state UNKNOWN
}));

global.Html5Qrcode = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  getState: jest.fn(() => 0)
}));

// Mock para crypto.randomUUID (si no está disponible en el entorno de test)
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = jest.fn(() => 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  );
}

// Mock para console methods en tests (opcional)
global.console = {
  ...console,
  // Silenciar logs en tests a menos que se especifique lo contrario
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Configurar timeout por defecto para tests asincrónicos
jest.setTimeout(10000);

// Limpiar mocks entre tests
beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  
  // Resetear navigator.onLine
  navigator.onLine = true;
  
  // Resetear fetch mock
  fetch.mockClear();
});

// Utilidades de testing
global.testUtils = {
  // Crear un producto de prueba
  createMockProduct: (overrides = {}) => ({
    id: crypto.randomUUID(),
    codigo: '1234567890123',
    nombre: 'Producto de Prueba',
    marca: 'Marca Test',
    categoria: 'Categoria Test',
    precio: 100,
    unidad: 'Unidad',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  // Crear inventario de prueba
  createMockInventory: (overrides = {}) => ({
    id: crypto.randomUUID(),
    producto_id: crypto.randomUUID(),
    cantidad: 10,
    precio_unitario: 100,
    lote: 'LOTE001',
    fecha_vencimiento: '2024-12-31',
    ubicacion: 'A1-B2-C3',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  // Simular estar offline
  goOffline: () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    window.dispatchEvent(new Event('offline'));
  },

  // Simular estar online
  goOnline: () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    window.dispatchEvent(new Event('online'));
  },

  // Simular delay para testing async
  delay: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock para DOM elements
  createMockElement: (tag = 'div', attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }
};

// Configurar environment variables para testing
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
