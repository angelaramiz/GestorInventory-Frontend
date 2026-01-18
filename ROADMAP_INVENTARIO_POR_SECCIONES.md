# 🚀 Roadmap: Inventario por Secciones y Niveles (Modo PZ)

**Estado General:** ⏳ No iniciado
**Última actualización:** 2026-01-18

---

## 📋 Fases del Proyecto

### **FASE 1: UI Modal de Selección KG/PZ** ⏳
- [ ] Modificar botón "Iniciar Escaneo por Lotes Avanzado"
- [ ] Crear modal con 2 opciones: KG | PZ
- [ ] Opción KG: ejecutar flujo existente
- [ ] Opción PZ: activar nueva interfaz

---

### **FASE 2: Interfaz Modo PZ - Panel de Control y Hoja de Cálculo** ⏳
#### Panel de Control (Sección 1)
- [ ] Crear estructura HTML para modal PZ
- [ ] Mostrar contador "Sección X, Nivel Y"
- [ ] Inicializar en "Sección 1, Nivel 1"

#### Hoja de Cálculo (Vista)
- [ ] Crear tabla visual (lectura, no interactiva)
- [ ] Mostrar filas por nivel
- [ ] Mostrar columnas: # Producto | Cantidad | Caducidad

#### Inputs y Controles
- [ ] Input de cantidad de producto (dinámica)
- [ ] Select de caducidad (2 opciones):
  - Este mes (Prioridad)
  - Después de este mes (No importante)
- [ ] Label dinámico: "Introduce la cantidad del producto X"
- [ ] Botón "Siguiente" (guardar y limpiar)
- [ ] Botón "Nivel +1" (crear nueva fila)
- [ ] Botón "Siguiente Sección" (guardar sección)

---

### **FASE 3: Lógica de Entrada de Datos - Productos Virtuales** ⏳
#### Almacenamiento en Memoria
- [ ] Crear estructura para productos virtuales
- [ ] Formato: `{ id, seccion, nivel, numero, cantidad, caducidad }`
- [ ] Guardar en variable global mientras se ingresa

#### Funcionalidad de "Siguiente"
- [ ] Validar cantidad > 0
- [ ] Guardar en estructura de nivel actual
- [ ] Actualizar tabla visual
- [ ] Limpiar inputs
- [ ] Incrementar número de producto

#### Funcionalidad de "Nivel +1"
- [ ] Crear nueva fila en tabla visual
- [ ] Incrementar contador de nivel
- [ ] Actualizar título "Sección X, Nivel Y+1"
- [ ] Resetear contador de producto (vuelve a 1)

#### Funcionalidad de "Siguiente Sección"
- [ ] Mostrar confirmación: "¿Guardar Sección 1 y pasar a Sección 2?"
- [ ] Al confirmar: Guardar sección en formato JSON/CSV
- [ ] Crear nueva sección
- [ ] Limpiar tabla visual
- [ ] Resetear contador de nivel a 1

---

### **FASE 4: Persistencia de Secciones - JSON/CSV Temporal** ⏳
#### Formato de Almacenamiento
- [ ] Definir estructura JSON óptima:
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
- [ ] Crear función para guardar sección en JSON
- [ ] Crear función para convertir a CSV (opcional)
- [ ] Almacenar temporalmente en variable global

#### Historial de Secciones
- [ ] Crear array para guardar todas las secciones
- [ ] Mostrar resumen visual de secciones guardadas

---

### **FASE 5: Guardado en IndexedDB** ⏳
#### Base de Datos Local
- [ ] Crear tabla `productos_virtuales_por_seccion`
- [ ] Estructura: `{ id, seccion, nivel, numero, cantidad, caducidad, timestamp }`
- [ ] Crear tabla `secciones_inventario`
- [ ] Estructura: `{ id, seccion_numero, area_id, usuario_id, estado, fecha_inicio }`

#### Botón "Finalizar Conteo por Secciones"
- [ ] Guardar todas las secciones en IndexedDB
- [ ] Marcar estado como "Completado"
- [ ] Mostrar resumen total de productos virtuales
- [ ] Mostrar opciones: "Comenzar a Escanear" | "Contar Otra Área"

---

### **FASE 6: Opción 1 - Comenzar a Escanear** ⏳
#### Modal de Escáner
- [ ] Crear modal con HTML5QrCode
- [ ] Panel arriba mostrando lista de productos virtuales
- [ ] Formato: "Producto 1/25 - Cantidad: 5, Caducidad: Este mes"
- [ ] Mostrar progreso visual (barra o contador)

#### Funcionalidad de Escaneo
- [ ] Escanear código de barras
- [ ] Buscar en tabla `productos` de Supabase
- [ ] Mostrar tarjeta con información del producto físico
- [ ] Botones: "Confirmar" | "Volver a Escanear"

#### Matching Producto Virtual vs Físico
- [ ] Al confirmar:
  - Adjuntar cantidad (del virtual)
  - Adjuntar caducidad (del virtual)
  - Guardar en tabla `inventario_temporal_indexeddb`
  - Mover a siguiente producto virtual
- [ ] Si no coincide: permitir reintentar o saltar

#### Tabla de Inventario Temporal
- [ ] Estructura: `{ id, codigo_producto, nombre, cantidad, caducidad, virtual_id, timestamp }`
- [ ] Guardar en IndexedDB

#### Finalizar Escaneo
- [ ] Una vez escaneados todos: habilitar botón "Finalizar"
- [ ] Cerrar modales
- [ ] Generar reporte en body

---

### **FASE 7: Reporte de Productos Escaneados** ⏳
#### Estructura del Reporte
- [ ] Título: "Reporte de Inventario por Secciones"
- [ ] Mostrar tabla con columnas:
  - Sección | Nivel | Producto Virtual | Producto Físico | Cantidad | Caducidad | Estado
- [ ] Colorear filas:
  - Verde: Coincidencia perfecta
  - Amarillo: Coincidencia parcial
  - Rojo: Falta escanear

#### Botón "Guardar y Subir Productos"
- [ ] Mostrar ventana de confirmación
- [ ] Al confirmar: Preparar datos para Supabase
- [ ] Enviar a tabla `inventario` de Supabase
- [ ] Mostrar estado de guardado

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
