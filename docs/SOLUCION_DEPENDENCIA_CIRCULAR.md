# Solución a Dependencia Circular - logs.js

## 🔴 PROBLEMA IDENTIFICADO

**Dependencia circular crítica** que impedía que los módulos ES6 se cargaran:

```
DatabaseService (y otros servicios)
    ↓ importa
logs.js (mostrarMensaje, mostrarAlertaBurbuja)
    ↓ importa
db-operations.js / scanner.js (legacy)
    ↓ importarían (indirectamente)
DatabaseService (vía bridges)
    ↓ CIRCULAR DEADLOCK ❌
```

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Eliminación de Dependencia de logs.js en Servicios

**Todos los servicios** en `src/core/services/` ya NO importan de `logs.js`:

- ❌ ANTES: `import { mostrarMensaje, mostrarAlertaBurbuja } from '../../../js/logs.js';`
- ✅ AHORA: Comentario explicativo + uso de métodos internos

**Archivos modificados:**
- `BaseService.js`
- `DatabaseService.js`
- `ScannerService.js`
- `ProductService.js`
- `InventoryService.js`
- `FileOperationsService.js`
- `ProductOperationsService.js`
- `ProductUIService.js`
- `InventoryOperationsService.js`

### 2. Nuevos Métodos en BaseService

`BaseService.js` ahora incluye **helpers UI independientes**:

```javascript
/**
 * Helper para mostrar mensajes UI (reemplaza mostrarMensaje de logs.js)
 */
showMessage(mensaje, tipo = 'info') {
    if (window.Swal) {
        window.Swal.fire({
            icon: tipo,
            title: tipo === 'success' ? 'Éxito' : tipo === 'error' ? 'Error' : 'Información',
            text: mensaje,
            timer: 2000,
            showConfirmButton: false
        });
    } else {
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    }
}

/**
 * Helper para mostrar alertas toast (reemplaza mostrarAlertaBurbuja de logs.js)
 */
showToast(mensaje, tipo = 'info') {
    if (window.Swal) {
        window.Swal.fire({
            icon: tipo,
            text: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        console.log(`[TOAST ${tipo.toUpperCase()}] ${mensaje}`);
    }
}
```

### 3. Reversión de logs.js

`logs.js` **vuelve a usar archivos legacy** (NO bridges):

```javascript
// ✅ CORRECTO para evitar circular
import { cargarDatosEnTabla } from "./db-operations.js";
import { iniciarEscaneoConModal, detenerEscaner } from "./scanner.js";
```

**Razón**: `logs.js` es parte del ecosistema legacy. Los archivos legacy PUEDEN importar entre sí. Solo los **servicios nuevos** (src/core/services/) deben ser independientes.

## 📐 ARQUITECTURA RESULTANTE

```
┌─────────────────────────────────────────────┐
│  CAPA NUEVA (src/core/services/)           │
│  - Servicios independientes                 │
│  - NO importan logs.js                      │
│  - Usan this.showMessage() / showToast()   │
└─────────────────────────────────────────────┘
           ↓ exportan funcionalidad
┌─────────────────────────────────────────────┐
│  BRIDGES (js/*-bridge.js)                   │
│  - Conectan servicios nuevos con legacy     │
│  - Importan servicios, exportan funciones   │
└─────────────────────────────────────────────┘
           ↓ usados por
┌─────────────────────────────────────────────┐
│  CAPA LEGACY (js/*.js)                      │
│  - Pueden importar entre sí libremente      │
│  - logs.js importa de db-operations.js      │
│  - main.js importa de bridges               │
└─────────────────────────────────────────────┘
```

## 🔄 FLUJO DE MIGRACIÓN

1. **Servicios nuevos** son 100% independientes
2. **Bridges** exportan funciones que llaman a servicios
3. **Legacy** usa bridges en lugar de código antiguo
4. **logs.js permanece legacy** hasta que TODO esté migrado

## ⚠️ REGLAS CRÍTICAS

1. **Servicios NUNCA importan de js/**: Solo de `src/core/`
2. **Legacy puede importar legacy**: No hay problema mientras no se mezcle con servicios
3. **Bridges son la frontera**: Importan servicios, son importados por legacy
4. **logs.js es legacy**: Hasta que se migre completamente al final

## 🎯 SIGUIENTE PASO

Ahora que rompimos la dependencia circular:

```powershell
# Recarga la página con HARD REFRESH
# Ctrl + Shift + R en el navegador
```

Abre: http://127.0.0.1:5500/test-directo.html

Debería cargar **sin errores de módulos**.

## 📝 LECCIONES APRENDIDAS

1. **ES6 Modules NO toleran ciclos**: Cualquier dependencia circular causa fallo total
2. **Isolación de capas es crítica**: Nueva arquitectura debe ser 100% independiente
3. **Bridges son unidireccionales**: Servicios → Bridges → Legacy, nunca al revés
4. **UI helpers internos**: Mejor duplicar código simple (Swal) que crear dependencia

---

**Fecha**: 2025-06-01  
**Estado**: ✅ IMPLEMENTADO - Listo para pruebas
