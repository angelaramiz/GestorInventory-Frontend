# Best Practices - Testing Services
**Basado en lecciones aprendidas de DatabaseService**  
**Fecha:** 5 de octubre de 2025

---

## 🎯 Reglas de Oro

### 1. Mock de Infraestructura = Funcionalidad Real
```javascript
// ❌ NUNCA: Mock vacío
const mock = { getItem: jest.fn() };

// ✅ SIEMPRE: Mock funcional
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, val) { this.store[key] = String(val); }
}
```

### 2. Schema First, Operations Second
```javascript
// ✅ Test 1: Validar schema
it('should use codigo as keyPath', () => {
  expect(store.keyPath).toBe('codigo');
});

// ✅ Test 2: Luego operaciones
it('should add product', () => {
  service.addProduct({ codigo: 'TEST' });
});
```

### 3. Eventos Específicos, No Genéricos
```javascript
// ❌ NUNCA: Combinar acciones diferentes
case 'INSERT':
case 'UPDATE':
  emit('updated'); // ¿Qué pasó realmente?

// ✅ SIEMPRE: Evento por acción
case 'INSERT': emit('added'); break;
case 'UPDATE': emit('updated'); break;
```

### 4. Constantes para Magic Strings
```javascript
// ❌ NUNCA: Strings hardcodeadas
localStorage.getItem('lastSync');
localStorage.getItem('lastSyncTime'); // Typo!

// ✅ SIEMPRE: Constantes
const KEYS = { LAST_SYNC: 'lastSync' };
localStorage.getItem(KEYS.LAST_SYNC);
```

### 5. Verificar Antes de Llamar Globals
```javascript
// ❌ NUNCA: Acceso directo
mostrarAlerta('error'); // ReferenceError!

// ✅ SIEMPRE: Safe access
if (typeof window.mostrarAlerta === 'function') {
  window.mostrarAlerta('error');
}
```

---

## 📋 Checklist Pre-Testing

```
[ ] Revisar código fuente REAL (no asumir)
[ ] Verificar schema de DB (keyPath, índices)
[ ] Probar mocks de infraestructura
[ ] Identificar dependencias externas
[ ] Definir constantes para strings repetidos
[ ] Documentar eventos emitidos
```

---

## 🔍 Checklist Code Review

```
[ ] ¿Mocks implementan funcionalidad real?
[ ] ¿Tests matchean código real?
[ ] ¿Eventos tienen semántica correcta?
[ ] ¿Se usan constantes en lugar de magic strings?
[ ] ¿Funciones globales verificadas antes de llamar?
[ ] ¿Métodos abstractos implementados en clase base?
```

---

## 🚀 Template de Test Service

```javascript
import { ServiceName } from '../../../../src/core/services/ServiceName.js';

describe('ServiceName', () => {
  let service;
  
  beforeEach(() => {
    // 1. Setup mocks funcionales
    global.mockFunction = jest.fn();
    
    // 2. Crear servicio
    service = new ServiceName();
  });
  
  afterEach(() => {
    // 3. Cleanup
    service.dispose();
    jest.clearAllMocks();
  });
  
  // GRUPO 1: Tests de Schema/Inicialización
  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(service.configProperty).toBeDefined();
    });
  });
  
  // GRUPO 2: Tests de Operaciones CRUD
  describe('operations', () => {
    it('should perform action', async () => {
      await service.action();
      expect(service.state).toBe('expected');
    });
  });
  
  // GRUPO 3: Tests de Eventos
  describe('events', () => {
    it('should emit specific event', () => {
      const listener = jest.fn();
      service.on('eventName', listener);
      
      service.action();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ prop: 'value' })
      );
    });
  });
  
  // GRUPO 4: Tests de Edge Cases
  describe('error handling', () => {
    it('should handle error gracefully', async () => {
      // Setup error condition
      await expect(service.failingAction()).rejects.toThrow();
    });
  });
});
```

---

## 🛠️ Helpers Recomendados

### Storage Constants
```javascript
// src/core/constants/storage.js
export const STORAGE_KEYS = {
  SYNC_QUEUE: 'syncQueue',
  LAST_SYNC: 'lastSync',
  AREA_ID: 'area_id'
};
```

### Event Constants
```javascript
// src/core/constants/events.js
export const EVENTS = {
  PRODUCT_ADDED: 'productAdded',
  PRODUCT_UPDATED: 'productUpdated',
  PRODUCT_DELETED: 'productDeleted'
};
```

### Schema Validator
```javascript
// tests/helpers/schema-validator.js
export function validateSchema(store, expected) {
  expect(store.keyPath).toBe(expected.keyPath);
  expected.indices.forEach(idx => {
    expect(store.indexNames.contains(idx)).toBe(true);
  });
}
```

### Event Tester
```javascript
// tests/helpers/event-tester.js
export function expectEvent(service, eventName, action, matcher) {
  const listener = jest.fn();
  service.on(eventName, listener);
  
  action();
  
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining(matcher)
  );
}
```

---

## 📊 Métricas de Calidad Objetivo

```
✅ Tests passing: 100%
✅ Coverage: >80%
✅ Tiempo por test: <50ms
✅ No console warnings
✅ No memory leaks (cleanup correcto)
```

---

## ⚠️ Patrones a Evitar

### 1. Mock Vacío
```javascript
// ❌ NO
const mock = { fn: jest.fn() };

// ✅ SÍ
class Mock { 
  fn() { /* implementación real */ }
}
```

### 2. Combinar Eventos
```javascript
// ❌ NO
case 'INSERT':
case 'UPDATE': emit('changed');

// ✅ SÍ
case 'INSERT': emit('added'); break;
case 'UPDATE': emit('updated'); break;
```

### 3. Asumir Schema
```javascript
// ❌ NO (asumir sin verificar)
store.get(product.id);

// ✅ SÍ (verificar primero)
it('should use codigo as key', () => {
  expect(store.keyPath).toBe('codigo');
});
store.get(product.codigo);
```

### 4. Magic Strings
```javascript
// ❌ NO
localStorage.getItem('lastSync');
localStorage.getItem('lastSyncTime'); // Inconsistente!

// ✅ SÍ
const KEY = 'lastSync';
localStorage.getItem(KEY);
```

### 5. Acceso Directo a Globals
```javascript
// ❌ NO
mostrarAlerta('msg'); // ReferenceError

// ✅ SÍ
if (typeof window.mostrarAlerta === 'function') {
  window.mostrarAlerta('msg');
}
```

---

## 🎓 Referencias

- [Reporte Completo de Bugs](./TESTING_DATABASESERVICE_BUGS_REPORT.md)
- [Jest Best Practices](https://jestjs.io/docs/tutorial-async)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles/)

---

**Actualización:** 5 de octubre de 2025  
**Mantenido por:** Testing Team  
**Versión:** 1.0
