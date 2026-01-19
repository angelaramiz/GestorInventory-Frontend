# 🚀 Roadmap: Inventario por Secciones y Niveles (Modo PZ)

**Estado General:** 🔄 Fases 1-7 Completadas - Fase 8 en espera
**Última actualización:** 2026-01-19 15:30

---

## 📋 Fases del Proyecto

### **FASE 1: UI Modal de Selección KG/PZ** ✅ COMPLETADA
- [x] Modificar botón "Iniciar Escaneo por Lotes Avanzado"
- [x] Crear modal con 2 opciones: KG | PZ
- [x] Opción KG: ejecutar flujo existente
- [x] Opción PZ: activar nueva interfaz

**Archivos creados/modificados:**
- ✅ [plantillas/inventario.html](plantillas/inventario.html) - Modal añadido
- ✅ [js/scanner/modules/selection.js](js/scanner/modules/selection.js) - Nuevo módulo
- ✅ [js/scanner/modules/init.js](js/scanner/modules/init.js) - Integración

---

### **FASE 2: Interfaz Modo PZ - Panel de Control y Hoja de Cálculo** ✅ COMPLETADA

#### Panel de Control (Sección 1)
- [x] Crear estructura HTML para modal PZ
- [x] Mostrar contador "Sección X, Nivel Y"
- [x] Inicializar en "Sección 1, Nivel 1"

#### Hoja de Cálculo (Vista)
- [x] Crear tabla visual (lectura, no interactiva)
- [x] Mostrar filas por nivel
- [x] Mostrar columnas: # Producto | Cantidad | Caducidad

#### Inputs y Controles
- [x] Input de cantidad de producto (dinámica)
- [x] Select de caducidad (2 opciones):
  - Este mes (Prioridad)
  - Después de este mes (No importante)
- [x] Label dinámico: "Introduce la cantidad del producto X"
- [x] Botón "Siguiente" (guardar y limpiar)
- [x] Botón "Nivel +1" (crear nueva fila)
- [x] Botón "Siguiente Sección" (guardar sección)

**Archivos creados/modificados:**
- ✅ [plantillas/inventario.html](plantillas/inventario.html) - Modal PZ completo
- ✅ [js/scanner/modules/pz-modo.js](js/scanner/modules/pz-modo.js) - Lógica principal

---

### **FASE 3: Lógica de Entrada de Datos - Productos Virtuales** ✅ COMPLETADA
#### Almacenamiento en Memoria
- [x] Crear estructura para productos virtuales
- [x] Formato: `{ numero, cantidad, caducidad, timestamp }`
- [x] Guardar en variable global mientras se ingresa

#### Funcionalidad de "Siguiente"
- [x] Validar cantidad > 0
- [x] Guardar en estructura de nivel actual
- [x] Actualizar tabla visual
- [x] Limpiar inputs
- [x] Incrementar número de producto

#### Funcionalidad de "Nivel +1"
- [x] Crear nueva fila en tabla visual
- [x] Incrementar contador de nivel
- [x] Actualizar título "Sección X, Nivel Y+1"
- [x] Resetear contador de producto (vuelve a 1)

#### Funcionalidad de "Siguiente Sección"
- [x] Mostrar confirmación: "¿Guardar Sección 1 y pasar a Sección 2?"
- [x] Al confirmar: Guardar sección en formato JSON
- [x] Crear nueva sección
- [x] Limpiar tabla visual
- [x] Resetear contador de nivel a 1

**Validaciones:** ✅ Prueba completa ejecutada - 5/5 validaciones pasadas

---

### **FASE 4: Persistencia de Secciones - JSON/CSV Temporal** ✅ COMPLETADA
#### Formato de Almacenamiento
- [x] Definir estructura JSON óptima:
  ```json
  {
    "seccion": 1,
    "niveles": [
      {
        "nivel": 1,
        "productos": [
          { "numero": 1, "cantidad": 5, "caducidad": "este_mes" },
          { "numero": 2, "cantidad": 3, "caducidad": "después_mes" }
        ]
      }
    ]
  }
  ```
- [x] Crear función para guardar sección en JSON
- [x] Crear función para convertir a CSV (opcional)
- [x] Almacenar temporalmente en variable global

#### Historial de Secciones
- [x] Crear array para guardar todas las secciones
- [x] Mostrar resumen visual de secciones guardadas

**Archivos creados/modificados:**
- ✅ [js/scanner/modules/pz-persistencia.js](js/scanner/modules/pz-persistencia.js) - Persistencia JSON/CSV
- ✅ [js/scanner/modules/pz-modo.js](js/scanner/modules/pz-modo.js) - Integración con persistencia

**Validaciones:** ✅ Prueba completa ejecutada - 7/7 validaciones pasadas

---

### **FASE 5: Guardado en IndexedDB** ✅ COMPLETADA
#### Base de Datos Local
- [x] Crear tabla `productos_virtuales_por_seccion`
- [x] Estructura: `{ id, seccion_id, nivel, numero, cantidad, caducidad, timestamp, estado }`
- [x] Crear tabla `secciones_inventario`
- [x] Estructura: `{ id, seccion_numero, total_productos, total_niveles, estado, fecha_inicio, fecha_guardado }`

#### Integración con Persistencia
- [x] Exportar desde pz-persistencia.js (JSON en memoria)
- [x] Importar en IndexedDB al finalizar
- [x] Crear índices por seccion_id, estado, timestamp

#### Botón "Finalizar Conteo por Secciones"
- [x] Guardar todas las secciones en IndexedDB
- [x] Marcar estado como "Completado"
- [x] Mostrar resumen total de productos virtuales
- [x] Mostrar opciones: "Comenzar a Escanear" | "Contar Otra Área"

**Archivos creados/modificados:**
- ✅ [js/db/db-operations-pz.js](js/db/db-operations-pz.js) - Operaciones IndexedDB
- ✅ [js/scanner/modules/pz-modo.js](js/scanner/modules/pz-modo.js) - Integración con BD
- ✅ [VERIFICACION_FASE5.md](VERIFICACION_FASE5.md) - Plan de verificación en navegador

**Estado:** ✅ Código completado - Verificación pendiente en navegador

---

### **FASE 6: Opción 1 - Comenzar a Escanear** 🔄 En Progreso
#### Modal de Escáner
- [x] Crear modal con HTML5QrCode
- [x] Panel arriba mostrando lista de productos virtuales
- [x] Formato: "Producto 1/25 - Cantidad: 5, Caducidad: Este mes"
- [x] Mostrar progreso visual (barra o contador)

#### Funcionalidad de Escaneo
- [x] Escanear código de barras
- [x] Buscar en tabla `productos` de Supabase
- [x] Mostrar tarjeta con información del producto (solo datos relevantes: código, nombre, categoría, marca)
- [x] Botones: "Confirmar" | "Reintentar" | "Saltar"
- [x] **Nota:** Solo se muestra información de inventario, no precios ni stock BD (irrelevantes para gestión de cantidades)

#### Manejo de Productos NO Encontrados
- [x] Si código NO existe en tabla `productos`:
  - Mostrar modal: "❌ Código de producto no encontrado"
  - 3 opciones:
    1. **Volver a escanear** - Reactivar escáner (reintentar)
    2. **Registrar producto** - Abrir formulario modal (como agregar.html)
    3. **Saltar** - Marcar producto como "Pendiente a revisar"

#### Registrar Producto Inexistente
- [x] Modal formulario con campos:
  - 🏷️ **Código** (pre-llenado, no editable)
  - 📝 Nombre del producto
  - 📦 Categoría
  - 🏢 Marca
  - 📊 Unidad (por defecto: "Pz", editable)
  - [Confirmar] [Cancelar]
- [x] Al confirmar:
  - Insertar producto en tabla `productos` de Supabase
  - Guardar código temporalmente
  - Repetir búsqueda automáticamente con el código guardado
  - Como producto ya existe, continúa flujo normal

#### Productos Marcados como Pendientes
- [x] Si usuario hace clic "Saltar":
  - Producto etiquetado como "pendiente_revision"
  - En reporte body: mostrará con estado ⚠️
  - 2 botones en reporte:
    1. **Volver a escanear** - Repite proceso completo (puede registrar o intentar de nuevo)
    2. **Eliminar** - Remover del reporte

#### Matching Producto Virtual vs Físico
- [x] Al confirmar:
  - Adjuntar cantidad (del virtual)
  - Adjuntar caducidad (del virtual)
  - Guardar en tabla `inventario_temporal_escaneo`
  - Mover a siguiente producto virtual
- [x] Si no coincide: permitir reintentar o saltar

#### Tabla de Inventario Temporal
- [x] Estructura: `{ id, virtual_id, codigo_producto, nombre, cantidad, caducidad, estado }`
- [x] Guardar en IndexedDB

#### Finalizar Escaneo
- [x] Una vez escaneados todos: habilitar botón "Finalizar"
- [x] Cerrar modales
- [x] Generar reporte en body

**Archivos creados/modificados:**
- ✅ [js/scanner/modules/pz-scanner.js](js/scanner/modules/pz-scanner.js) - Lógica de escaneo
- ✅ [js/scanner/modules/pz-inventario-temporal.js](js/scanner/modules/pz-inventario-temporal.js) - Gestión temporal
- ✅ [plantillas/inventario.html](plantillas/inventario.html) - Modal escáner añadido

**Estado:** ✅ Infraestructura completada - Integración en progreso

---

### **FASE 7: Reporte de Productos Escaneados** ✅ COMPLETADA
#### Estructura del Reporte
- [x] Generar tabla comparativa virtual vs físico
- [x] Colorear filas por estado (verde/amarillo/rojo/azul)
- [x] Mostrar estadísticas (perfectas, parciales, faltantes, extras)
- [x] Calcular porcentajes automáticamente
- [x] Renderizar HTML visual
- [x] Integrar con flujo FASE 6

#### Componentes Implementados
- [x] Módulo pz-reportes.js (280+ líneas)
- [x] Función generarReporte()
- [x] Función renderizarReporteHTML()
- [x] Función mostrarReporte()
- [x] Validación de coincidencias
- [x] Cálculo de estadísticas
- [x] Integración en pz-modo.js

#### Botón "Guardar y Subir Productos"
- [x] Mostrar ventana de confirmación
- [x] Al confirmar: Preparar datos para Supabase
- [x] Enviar a tabla `inventario` de Supabase
- [x] Mostrar estado de guardado
- [x] **IMPORTANTE:** Botón DESHABILITADO hasta que:
  - ✅ No haya productos con error
  - ✅ No haya productos pendientes (todos confirmados)
  - Una vez todo validado: botón se habilita automáticamente

#### Botones de Exportación
- [ ] 🖨️ Imprimir - (Innecesario: report.html ya hace reportes)
- [ ] 📥 Descargar PDF - (Innecesario: report.html ya hace reportes)
- [x] 📊 Exportar CSV - Descarga datos en formato CSV

**Archivos creados/modificados:**
- ✅ [js/scanner/modules/pz-reportes.js](js/scanner/modules/pz-reportes.js) - Módulo completo
- ✅ [js/scanner/modules/pz-modo.js](js/scanner/modules/pz-modo.js) - Integración
- ✅ [FASE7_REPORTES.md](FASE7_REPORTES.md) - Documentación

**Estado:** ✅ Estructura completada - Descarga/Guardar en progreso

---

### **FASE 8: Opción 2 - Contar Otra Área** ⏳
#### Seleccionar Nueva Área
- [ ] Mostrar modal con lista de áreas (desde `areas` de Supabase)
- [ ] Seleccionar área_id y ubicación
- [ ] Guardar en localStorage
- [ ] Limpiar datos anteriores
- [ ] Volver a "Sección 1, Nivel 1"

#### Flujo de Conteo
- [ ] Permitir ingresar nuevas secciones y niveles
- [ ] Guardar en IndexedDB con area_id diferente
- [ ] Al finalizar conteo: mostrar opciones nuevamente

#### Seleccionar Área para Escaneo
- [ ] Antes de "Comenzar a Escanear"
- [ ] Mostrar modal: "¿Qué área deseas escanear?"
- [ ] Opciones: todas las áreas contadas
- [ ] Cargar productos virtuales de área seleccionada
- [ ] Ejecutar flujo de escaneo

---

### **FASE 9: Guardado en Supabase** ⏳
#### Preparación de Datos
- [ ] Crear payload para tabla `inventario`
- [ ] Incluir: area_id, usuario_id, codigo, nombre, cantidad, caducidad, fecha

#### Inserción en Supabase
- [ ] Usar `.insert()` para cada producto
- [ ] Manejar errores de duplicados
- [ ] Mostrar mensajes de éxito/error

#### Limpieza Post-Guardado
- [ ] Limpiar IndexedDB (opcional: guardar historial)
- [ ] Volver a pantalla principal
- [ ] Mostrar resumen de guardado

---

### **FASE 10: Validaciones y Manejo de Errores** ⏳
- [ ] Validar cantidad > 0
- [ ] Validar que se haya ingresado al menos 1 producto virtual
- [ ] Validar conexión a Supabase antes de escanear
- [ ] Manejo de productos no encontrados
- [ ] Manejo de escáner sin cámara disponible
- [ ] Confirmaciones antes de cambios irreversibles

---

### **FASE 11: UX/UI Refinamiento** ⏳
- [ ] Estilos CSS para modal PZ
- [ ] Estilos para tabla de cálculo
- [ ] Animaciones de transición
- [ ] Indicadores de progreso
- [ ] Temas dark mode compatible
- [ ] Responsividad mobile

---

### **FASE 12: Testing y Optimización** ⏳
- [ ] Test de flujo completo KG → PZ
- [ ] Test de guardado en IndexedDB
- [ ] Test de sincronización con Supabase
- [ ] Performance: verificar velocidad de carga
- [ ] Memory leaks en variables globales
- [ ] Logs de debug

---

## 📊 Estructura de Archivos a Crear/Modificar

```
js/scanner/modules/
├── processor.js (ya existe)
├── pz-modo.js (NUEVO - Lógica PZ)
├── pz-ui.js (NUEVO - UI PZ)
├── pz-database.js (NUEVO - IndexedDB para PZ)
└── pz-supabase.js (NUEVO - Sincronización Supabase)

plantillas/
└── inventario.html (MODIFICAR - Agregar modales PZ)
```

---

## 🎯 Prioridades

**Alta Prioridad:**
1. Modal de selección KG/PZ
2. UI Panel + Tabla + Inputs
3. Guardado en IndexedDB

**Media Prioridad:**
4. Escaneo y matching
5. Reporte
6. Supabase

**Baja Prioridad:**
7. Contar otra área
8. UX refinamiento
9. Testing completo

---

## ⏱️ Estimación de Tiempo

- Fase 1-2: 2 horas
- Fase 3-4: 3 horas
- Fase 5-6: 4 horas
- Fase 7-8: 3 horas
- Fase 9-12: 4 horas

**Total Estimado: 16 horas**

---

## ✅ Checklist de Validación Final

- [ ] Flujo KG funciona igual que antes
- [ ] Flujo PZ completo funciona end-to-end
- [ ] Datos en IndexedDB están bien estructurados
- [ ] Supabase recibe todos los datos correctamente
- [ ] Reporte es preciso
- [ ] Mobile responsive
- [ ] Sin errores en consola
- [ ] Performance aceptable

---

**¿Listo para comenzar con Fase 1?**
