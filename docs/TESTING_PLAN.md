# 🧪 PLAN DE TESTING - GestorInventory Frontend

**Fecha:** 4 de octubre de 2025  
**Estado:** 📋 En Progreso  
**Objetivo:** Alcanzar 80%+ de cobertura en servicios críticos

---

## 📊 RESUMEN EJECUTIVO

### Objetivos de Testing

1. **Cobertura mínima:** 80% en servicios críticos
2. **Tests unitarios:** Todos los servicios (21 servicios)
3. **Tests de integración:** Flujos principales
4. **Tests E2E:** Funcionalidades críticas (opcional)

### Estado Actual

```
┌───────────────────────────────────────────────────┐
│           ESTADO DE TESTING ACTUAL                │
├───────────────────────────────────────────────────┤
│  Servicios totales:         21                    │
│  Tests creados:             0                     │
│  Cobertura actual:          0%                    │
│  Objetivo:                  80%+                  │
│  Estado:                    📋 Iniciando          │
└───────────────────────────────────────────────────┘
```

---

## 🎯 PRIORIDADES DE TESTING

### Nivel 1: Crítico (Prioridad Alta) ⭐⭐⭐

**Servicios Fase 4 (Recién migrados):**
1. ✅ **EntryManagementService** - Gestión de entradas
2. ✅ **EntryUIService** - UI de entradas
3. ✅ **EntryReportService** - Reportes de entradas
4. ✅ **ReportService** - Lógica de reportes
5. ✅ **PDFGenerationService** - Generación de PDF
6. ✅ **ReportUIService** - UI de reportes

**Servicios Core:**
7. ✅ **DatabaseService** - Operaciones de base de datos
8. ✅ **ProductService** - Gestión de productos
9. ✅ **InventoryService** - Gestión de inventario
10. ✅ **AuthenticationService** - Autenticación

### Nivel 2: Importante (Prioridad Media) ⭐⭐

11. ⏳ **ProductOperationsService**
12. ⏳ **InventoryOperationsService**
13. ⏳ **BatchManagementService**
14. ⏳ **BatchScannerService**
15. ⏳ **ConfigurationService**

### Nivel 3: Complementario (Prioridad Baja) ⭐

16. ⏳ **ProductUIService**
17. ⏳ **BatchUIService**
18. ⏳ **ConfigurationUIService**
19. ⏳ **NotificationService**
20. ⏳ **FileOperationsService**
21. ⏳ **ProductPrintService**

---

## 📋 PLAN DE EJECUCIÓN

### Fase 1: Setup y Servicios Críticos (Día 1-2)

**Duración estimada:** 6-8 horas

#### 1.1 Setup Inicial (30 min)
- [x] Verificar configuración de Jest ✅
- [x] Verificar babel.config.json ✅
- [x] Verificar tests/setup.js ✅
- [ ] Crear helpers de testing
- [ ] Crear mocks globales

#### 1.2 Tests de Servicios Fase 4 (4-5 horas)

**EntryManagementService.test.js** (1h)
- [ ] Tests de initialize()
- [ ] Tests de searchProduct()
- [ ] Tests de selectProduct()
- [ ] Tests de validateEntry()
- [ ] Tests de registerEntry()
- [ ] Tests de loadEntries()
- [ ] Tests de deleteEntry()
- [ ] Tests de syncEntries()
- [ ] Tests de getStatistics()

**EntryUIService.test.js** (1h)
- [ ] Tests de initializeElements()
- [ ] Tests de displayProductData()
- [ ] Tests de clearForm()
- [ ] Tests de getEntryData()
- [ ] Tests de renderEntriesTable()
- [ ] Tests de updateCounter()
- [ ] Tests de showAlerts()
- [ ] Tests de confirmDelete()

**EntryReportService.test.js** (45 min)
- [ ] Tests de generateCSV()
- [ ] Tests de generateJSON()
- [ ] Tests de calculateStatistics()
- [ ] Tests de generateFullReport()
- [ ] Tests de generateChartData()
- [ ] Tests de exportMultipleFormats()

**ReportService.test.js** (1h)
- [ ] Tests de initialize()
- [ ] Tests de loadAreas()
- [ ] Tests de loadProducts()
- [ ] Tests de filterProductsByAreas()
- [ ] Tests de mergeProductsByCode()
- [ ] Tests de groupProductsByArea()
- [ ] Tests de categorizeProductsByExpiry()

**PDFGenerationService.test.js** (30 min)
- [ ] Tests de generateBarcodes()
- [ ] Tests de generatePDF()
- [ ] Tests de savePDF()
- [ ] Tests de _getCategoryConfig()

**ReportUIService.test.js** (45 min)
- [ ] Tests de initializeElements()
- [ ] Tests de renderAreaCheckboxes()
- [ ] Tests de displayProductList()
- [ ] Tests de showReportConfigDialog()
- [ ] Tests de showAlerts()

#### 1.3 Tests de Servicios Core (1-2 horas)

**DatabaseService.test.js** (45 min)
- [ ] Tests de initialize()
- [ ] Tests de openConnection()
- [ ] Tests de closeConnection()
- [ ] Tests de getAll()
- [ ] Tests de getById()
- [ ] Tests de add()
- [ ] Tests de update()
- [ ] Tests de delete()

**ProductService.test.js** (1h)
- [ ] Tests de CRUD básico
- [ ] Tests de búsqueda
- [ ] Tests de filtros
- [ ] Tests de validación

---

### Fase 2: Servicios Importantes (Día 3-4)

**Duración estimada:** 4-6 horas

#### 2.1 Servicios de Operaciones

- [ ] **ProductOperationsService.test.js** (1.5h)
- [ ] **InventoryOperationsService.test.js** (1.5h)
- [ ] **BatchManagementService.test.js** (1h)
- [ ] **BatchScannerService.test.js** (1h)

#### 2.2 Servicios de Configuración

- [ ] **ConfigurationService.test.js** (1h)

---

### Fase 3: Servicios Complementarios (Día 5)

**Duración estimada:** 3-4 horas

- [ ] **ProductUIService.test.js** (45 min)
- [ ] **BatchUIService.test.js** (45 min)
- [ ] **ConfigurationUIService.test.js** (45 min)
- [ ] **NotificationService.test.js** (30 min)
- [ ] **FileOperationsService.test.js** (30 min)
- [ ] **ProductPrintService.test.js** (30 min)

---

### Fase 4: Tests de Integración (Día 6-7)

**Duración estimada:** 4-6 horas

#### 4.1 Flujos de Usuario

- [ ] **Flujo de registro de entradas completo**
  - Búsqueda de producto → Selección → Validación → Registro → Verificación
  
- [ ] **Flujo de generación de reportes**
  - Carga de datos → Filtrado → Generación PDF → Descarga

- [ ] **Flujo de gestión de lotes**
  - Escaneo → Validación → Guardado → Consulta

- [ ] **Flujo de gestión de productos**
  - Crear → Editar → Eliminar → Consultar

#### 4.2 Integración con IndexedDB

- [ ] Tests de sincronización
- [ ] Tests de persistencia
- [ ] Tests de recuperación ante errores

#### 4.3 Integración con Supabase

- [ ] Tests de autenticación
- [ ] Tests de sincronización
- [ ] Tests de manejo de errores de red

---

## 🛠️ HERRAMIENTAS Y ESTRATEGIAS

### Configuración de Jest

```javascript
// jest.config.js (ya configurado)
{
  testEnvironment: 'jsdom',
  coverage: 70%+ objetivo,
  setupFiles: tests/setup.js,
  mocks: IndexedDB, fetch, localStorage
}
```

### Estrategias de Testing

#### 1. Tests Unitarios
- **Scope:** Una función/método a la vez
- **Mocks:** Todas las dependencias
- **Objetivo:** 80%+ cobertura

#### 2. Tests de Integración
- **Scope:** Múltiples servicios juntos
- **Mocks:** Solo APIs externas
- **Objetivo:** Flujos principales

#### 3. Mocking Strategy

**Servicios a mockear:**
- IndexedDB → fake-indexeddb
- Supabase → Manual mocks
- SweetAlert2 → Manual mocks
- jsPDF → Manual mocks
- JsBarcode → Manual mocks

**Ejemplo de mock:**
```javascript
// Mock de Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  }))
}));
```

---

## 📝 TEMPLATE DE TEST

### Estructura Estándar

```javascript
/**
 * @jest-environment jsdom
 */

import { ServiceName } from '../../../src/core/services/ServiceName.js';

describe('ServiceName', () => {
  let service;
  
  beforeEach(() => {
    // Setup
    service = new ServiceName();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
  });
  
  describe('methodName()', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = 'test';
      const expected = 'result';
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should throw error when invalid input', async () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      await expect(service.methodName(invalidInput))
        .rejects.toThrow('Error message');
    });
  });
});
```

---

## 📊 MÉTRICAS DE ÉXITO

### Objetivos de Cobertura

| Categoría | Objetivo | Mínimo Aceptable |
|-----------|----------|------------------|
| **Statements** | 85% | 70% |
| **Branches** | 80% | 70% |
| **Functions** | 85% | 70% |
| **Lines** | 85% | 70% |

### Servicios Críticos (Objetivo: 90%+)

- EntryManagementService
- ReportService
- DatabaseService
- ProductService
- InventoryService

### Servicios UI (Objetivo: 70%+)

- EntryUIService
- ReportUIService
- ProductUIService
- BatchUIService

---

## 🚀 COMANDOS DE TESTING

### Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en CI
npm run test:ci

# Ejecutar un test específico
npm test -- EntryManagementService.test.js

# Ejecutar tests de un directorio
npm test -- tests/unit/core/services/
```

---

## 📈 CRONOGRAMA

### Semana 1

| Día | Actividad | Horas | Estado |
|-----|-----------|-------|--------|
| **Día 1** | Setup + Tests Fase 4 (Entry*) | 4h | 📋 Pendiente |
| **Día 2** | Tests Fase 4 (Report*) + Core | 4h | 📋 Pendiente |
| **Día 3** | Tests de Operaciones | 4h | 📋 Pendiente |
| **Día 4** | Tests de Batch + Config | 3h | 📋 Pendiente |
| **Día 5** | Tests UI complementarios | 3h | 📋 Pendiente |
| **Día 6** | Tests de integración | 4h | 📋 Pendiente |
| **Día 7** | Review + fixes + documentación | 3h | 📋 Pendiente |

**Total estimado:** 25 horas (1 semana)

---

## ✅ CHECKLIST DE PROGRESO

### Setup
- [x] Jest configurado ✅
- [x] Babel configurado ✅
- [x] Setup.js configurado ✅
- [ ] Test helpers creados ⏳
- [ ] Mocks globales creados ⏳

### Tests de Servicios Fase 4
- [ ] EntryManagementService.test.js ⏳
- [ ] EntryUIService.test.js ⏳
- [ ] EntryReportService.test.js ⏳
- [ ] ReportService.test.js ⏳
- [ ] PDFGenerationService.test.js ⏳
- [ ] ReportUIService.test.js ⏳

### Tests de Servicios Core
- [ ] DatabaseService.test.js ⏳
- [ ] ProductService.test.js ⏳
- [ ] InventoryService.test.js ⏳
- [ ] AuthenticationService.test.js ⏳

### Tests de Servicios Importantes
- [ ] ProductOperationsService.test.js ⏳
- [ ] InventoryOperationsService.test.js ⏳
- [ ] BatchManagementService.test.js ⏳
- [ ] BatchScannerService.test.js ⏳
- [ ] ConfigurationService.test.js ⏳

### Tests de Servicios UI
- [ ] ProductUIService.test.js ⏳
- [ ] BatchUIService.test.js ⏳
- [ ] ConfigurationUIService.test.js ⏳
- [ ] NotificationService.test.js ⏳
- [ ] FileOperationsService.test.js ⏳
- [ ] ProductPrintService.test.js ⏳

### Tests de Integración
- [ ] Flujo de entradas ⏳
- [ ] Flujo de reportes ⏳
- [ ] Flujo de lotes ⏳
- [ ] Flujo de productos ⏳
- [ ] Integración IndexedDB ⏳
- [ ] Integración Supabase ⏳

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. **Crear helpers de testing** (30 min)
   - createMockDatabaseService()
   - createMockSupabaseClient()
   - createMockSweetAlert()
   - createMockDOMElements()

2. **Empezar con EntryManagementService.test.js** (1h)
   - Test más crítico de Fase 4
   - Funcionalidad recién migrada
   - Alta prioridad

3. **Continuar con servicios de Entry** (2h)
   - EntryUIService.test.js
   - EntryReportService.test.js

4. **Servicios de Report** (2h)
   - ReportService.test.js
   - PDFGenerationService.test.js
   - ReportUIService.test.js

---

## 📚 RECURSOS

### Documentación
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)

### Referencias Internas
- `tests/setup.js` - Configuración global
- `jest.config.js` - Configuración de Jest
- `babel.config.json` - Configuración de Babel

---

**Estado:** 📋 Plan creado, listo para iniciar testing  
**Siguiente paso:** Crear helpers y empezar con EntryManagementService.test.js  
**Estimación total:** ~25 horas (1 semana)

