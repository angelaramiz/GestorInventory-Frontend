# Documentación: Guardado de Inventario por Lotes Avanzado

## 📋 Flujo de Guardado Implementado

### 1. **Validaciones Iniciales**
- ✅ Verificar que hay productos para guardar
- ✅ Verificar sesión válida del usuario
- ✅ Verificar área_id y ubicación seleccionada
- ✅ Verificar usuario_id

### 2. **Proceso de Guardado por Producto**

#### **PASO 1: Guardar en Supabase** 🌐
```javascript
// Estructura de datos para Supabase
const inventarioData = {
    id: `${codigo}-lotes-${timestamp}`,
    codigo: grupo.productoPrimario.codigo,
    nombre: grupo.productoPrimario.nombre,
    marca: grupo.productoPrimario.marca,
    categoria: grupo.productoPrimario.categoria,
    lote: `lotes-${timestamp}`,
    unidad: grupo.productoPrimario.unidad || 'Kg',
    cantidad: parseFloat(grupo.pesoTotal.toFixed(3)),
    caducidad: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    comentarios: `Lotes avanzado - ${grupo.subproductos.length} productos escaneados...`,
    last_modified: new Date().toISOString(),
    is_temp_id: false,
    area_id: area_id,
    usuario_id: usuario_id
};

// Insertar en Supabase
const { data, error } = await supabase
    .from('inventario')
    .insert([inventarioData])
    .select();
```

#### **PASO 2: Sincronizar con IndexedDB** 💾
```javascript
// Agregar areaName para visualización local
const inventarioDataLocal = {
    ...inventarioData,
    areaName: ubicacionNombre
};

// Guardar en IndexedDB
const request = indexedDB.open('GestorInventarioApp', 1);
// ... lógica de guardado
```

#### **PASO 3: Actualizar localStorage** 📁
```javascript
// Actualizar localStorage si existe
const inventarioLocal = JSON.parse(localStorage.getItem('inventario') || '[]');
inventarioLocal.push(inventarioDataLocal);
localStorage.setItem('inventario', JSON.stringify(inventarioLocal));
```

#### **PASO 4: Actualizar tabla de inventario** 📊
```javascript
// Recargar datos de la tabla si estamos en la página correcta
const tablaInventario = document.getElementById('tablaInventario');
if (tablaInventario) {
    const { actualizarTablaInventario } = await import('./main.js');
    if (typeof actualizarTablaInventario === 'function') {
        await actualizarTablaInventario();
    }
}
```

### 3. **Características Implementadas**

#### **Progreso Visual** 📈
- Loading con barra de progreso
- Indicador de producto actual
- Conteo de productos guardados vs errores

#### **Manejo de Errores** ⚠️
- Captura errores por producto individual
- Continúa con el siguiente producto si hay error
- Muestra resumen de errores al final
- Logs detallados en consola

#### **Gestión de IDs Únicos** 🔑
- ID formato: `{codigo}-lotes-{timestamp}`
- Lote formato: `lotes-{timestamp}`
- Evita duplicados usando timestamp

#### **Datos Completos** 📝
- Peso total calculado correctamente
- Comentarios con detalle de todos los subproductos
- Fecha de caducidad por defecto (30 días)
- Unidad (Kg por defecto)
- Área y usuario asociados

### 4. **Limpieza Post-Guardado** 🧹
```javascript
// Limpiar arrays
productosEscaneados = [];
productosAgrupados = [];
preciosPorKiloGuardados.clear();

// Actualizar contadores
actualizarContadoresAvanzado();

// Ocultar resultados y volver a pestaña manual
document.getElementById('resultadosLotesAvanzado').classList.add('hidden');
cambiarPestanaPrincipal('manual');
```

### 5. **Mensajes de Retroalimentación** 📢

#### **Éxito Total** ✅
- Muestra cantidad de productos guardados
- Confirma sincronización completa
- Mensaje de éxito claro

#### **Éxito Parcial** ⚠️
- Lista productos guardados exitosamente
- Detalla errores específicos
- Permite continuar con productos válidos

#### **Error Total** ❌
- Lista todos los errores encontrados
- Opción de reintentar
- Mantiene datos para corrección

### 6. **Flujo de Sincronización** 🔄

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Productos     │    │   Validaciones  │    │   Supabase      │
│   Escaneados    │───▶│   Iniciales     │───▶│   (Remoto)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tabla HTML    │◀───│   localStorage  │◀───│   IndexedDB     │
│   Actualizada   │    │   Actualizado   │    │   (Local)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 7. **Verificación de Éxito** ✓

Para verificar que el guardado fue exitoso, revisar:

1. **Consola del navegador**: Logs de cada paso
2. **Supabase Dashboard**: Nuevos registros en tabla `inventario`
3. **IndexedDB**: Usar DevTools → Application → IndexedDB
4. **Tabla HTML**: Datos actualizados automáticamente

### 8. **Troubleshooting** 🔧

| Problema | Posible Causa | Solución |
|----------|---------------|----------|
| No guarda en Supabase | Sesión expirada | Verificar autenticación |
| No sincroniza IndexedDB | DB no inicializada | Verificar apertura de DB |
| Tabla no actualiza | Función no encontrada | Verificar import de main.js |
| Errores de área_id | Ubicación no seleccionada | Seleccionar ubicación primero |

---

## 🎯 Resultado Final

Con esta implementación, el sistema de lotes avanzado ahora:

1. **Guarda correctamente** en Supabase
2. **Sincroniza automáticamente** con IndexedDB
3. **Actualiza la tabla** de inventario en tiempo real
4. **Maneja errores** de forma robusta
5. **Proporciona feedback** detallado al usuario

El flujo está completamente implementado y sigue las mejores prácticas de sincronización de datos.
