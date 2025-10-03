# 📋 Checklist - Fase 3: Actualización de Archivos Legacy

**Estado:** 🟡 PENDIENTE  
**Fecha de Inicio:** Por definir  
**Objetivo:** Actualizar los 11 archivos legacy para usar bridges y eliminar duplicación

---

## 🎯 Objetivos de Fase 3

1. Actualizar archivos legacy para usar bridges en lugar de código directo
2. Eliminar código duplicado entre legacy y nueva arquitectura
3. Mantener funcionalidad 100% compatible durante migración
4. Probar cada archivo actualizado individualmente
5. Completar migración al 100%

---

## 📝 Archivos a Actualizar (11 archivos)

### Prioridad Alta ⚠️

#### ☐ 1. auth.js
- **Dependencias:** databaseService, configuraciones
- **Líneas estimadas:** ~300
- **Complejidad:** Alta
- **Impacto:** Crítico - Usado por toda la app
- **Tareas:**
  - [ ] Revisar funciones exportadas
  - [ ] Identificar usos de db directos → usar bridge
  - [ ] Actualizar imports a bridges
  - [ ] Probar login/logout
  - [ ] Verificar sincronización Supabase
  - [ ] Testing completo

#### ☐ 2. scanner.js
- **Dependencias:** product-operations, db-operations
- **Líneas estimadas:** ~250
- **Complejidad:** Media-Alta
- **Impacto:** Alto - Funcionalidad principal
- **Tareas:**
  - [ ] Usar scanner-bridge en lugar de código directo
  - [ ] Actualizar llamadas a DB → usar bridge
  - [ ] Probar escaneo QR
  - [ ] Probar escaneo código de barras
  - [ ] Verificar búsqueda de productos
  - [ ] Testing de rendimiento

#### ☐ 3. product-operations.js
- **Dependencias:** db-operations, configuraciones
- **Líneas estimadas:** ~400
- **Complejidad:** Alta
- **Impacto:** Crítico - CRUD de productos
- **Tareas:**
  - [ ] Reemplazar todo por product-operations-bridge
  - [ ] Verificar que bridge tiene todas las funciones
  - [ ] Actualizar llamadas directas a DB
  - [ ] Probar agregar producto
  - [ ] Probar editar producto
  - [ ] Probar eliminar producto
  - [ ] Probar búsqueda
  - [ ] Testing de inventario

---

### Prioridad Media 🔶

#### ☐ 4. tabla-productos.js
- **Dependencias:** product-operations, db-operations
- **Líneas estimadas:** ~200
- **Complejidad:** Media
- **Impacto:** Medio - UI de tabla
- **Tareas:**
  - [ ] Usar tabla-productos-bridge
  - [ ] Actualizar renderizado de tabla
  - [ ] Probar filtros
  - [ ] Probar ordenamiento
  - [ ] Probar paginación
  - [ ] Testing de rendimiento con muchos productos

#### ☐ 5. configuraciones.js
- **Dependencias:** db-operations
- **Líneas estimadas:** ~150
- **Complejidad:** Media
- **Impacto:** Medio - Configuración de app
- **Tareas:**
  - [ ] Usar configuraciones-bridge
  - [ ] Actualizar guardado de configs
  - [ ] Probar cambio de ubicación
  - [ ] Probar cambio de área
  - [ ] Verificar persistencia
  - [ ] Testing de sincronización

#### ☐ 6. registro-entradas-operations.js
- **Dependencias:** db-operations
- **Líneas estimadas:** ~200
- **Complejidad:** Media
- **Impacto:** Medio - Registro de entradas
- **Tareas:**
  - [ ] Usar db-operations-bridge
  - [ ] Actualizar funciones de entradas
  - [ ] Probar registro de entrada
  - [ ] Probar consulta de entradas
  - [ ] Verificar sincronización
  - [ ] Testing de historial

---

### Prioridad Baja 🟢

#### ☐ 7. lotes-avanzado.js
- **Dependencias:** db-operations, product-operations
- **Líneas estimadas:** ~350
- **Complejidad:** Alta
- **Impacto:** Bajo-Medio - Funcionalidad avanzada
- **Tareas:**
  - [ ] Identificar funciones a migrar
  - [ ] Crear batch-bridge si es necesario
  - [ ] Actualizar gestión de lotes
  - [ ] Probar creación de lotes
  - [ ] Probar edición de lotes
  - [ ] Testing de inventario por lotes

#### ☐ 8. lotes-database.js
- **Dependencias:** db-operations
- **Líneas estimadas:** ~180
- **Complejidad:** Media
- **Impacto:** Bajo - DB de lotes
- **Tareas:**
  - [ ] Usar db-operations-bridge
  - [ ] Actualizar operaciones de DB
  - [ ] Probar guardado de lotes
  - [ ] Probar consulta de lotes
  - [ ] Verificar integridad de datos
  - [ ] Testing de migraciones

#### ☐ 9. rep.js
- **Dependencias:** db-operations
- **Líneas estimadas:** ~250
- **Complejidad:** Media
- **Impacto:** Bajo - Reportes
- **Tareas:**
  - [ ] Usar fileOperationsService
  - [ ] Actualizar generación de reportes
  - [ ] Probar reporte PDF
  - [ ] Probar reporte CSV
  - [ ] Verificar formato de datos
  - [ ] Testing de descarga

---

### Archivos a Deprecar 🗑️

#### ☐ 10. db-operations.js
- **Estado:** Puede deprecarse completamente
- **Razón:** Todo migrado a db-operations-bridge.js
- **Acción:** Marcar como deprecated, mantener por compatibilidad temporal
- **Tareas:**
  - [ ] Agregar warnings de deprecación
  - [ ] Verificar que nadie lo importe directamente
  - [ ] Redirigir todo a bridge
  - [ ] Documentar plan de eliminación
  - [ ] Programar eliminación para Fase 4

#### ☐ 11. logs.js
- **Estado:** Puede deprecarse completamente
- **Razón:** Funcionalidad movida a BaseService
- **Acción:** Eliminar después de verificar que nadie lo usa
- **Tareas:**
  - [ ] Buscar todos los imports de logs.js
  - [ ] Verificar que todos usen BaseService
  - [ ] Eliminar archivo
  - [ ] Actualizar referencias en documentación
  - [ ] Limpiar imports

---

## 📊 Estimaciones

### Tiempo por Prioridad
- **Prioridad Alta:** 3 archivos × 2-3 horas = 6-9 horas
- **Prioridad Media:** 3 archivos × 1-2 horas = 3-6 horas
- **Prioridad Baja:** 3 archivos × 1-2 horas = 3-6 horas
- **Deprecación:** 2 archivos × 0.5 horas = 1 hora

**Total estimado:** 13-22 horas

### Complejidad
- Alta: 3 archivos (auth.js, product-operations.js, lotes-avanzado.js)
- Media: 6 archivos
- Baja: 2 archivos (deprecación)

---

## 🧪 Testing por Archivo

### Checklist de Testing Individual

Para cada archivo actualizado:

- [ ] ✅ No hay errores en consola
- [ ] ✅ Imports correctos desde bridges
- [ ] ✅ Funcionalidad básica funciona
- [ ] ✅ Sincronización con Supabase funciona
- [ ] ✅ Modo offline funciona
- [ ] ✅ No hay regresiones
- [ ] ✅ Performance aceptable
- [ ] ✅ Documentación actualizada

---

## 📈 Métricas de Éxito

### Fase 3 se considera completa cuando:

1. ✅ Los 11 archivos están actualizados
2. ✅ Todos los tests pasan
3. ✅ No hay código duplicado entre legacy y nuevo
4. ✅ La app funciona al 100% con bridges
5. ✅ Documentación actualizada
6. ✅ Migración al 100% completada

### KPIs
- **Cobertura de migración:** 100%
- **Tests pasando:** 100%
- **Código duplicado:** 0%
- **Archivos legacy directos:** 0 (solo bridges)
- **Performance:** Sin degradación

---

## 🚀 Plan de Ejecución

### Semana 1: Prioridad Alta
- Días 1-2: auth.js
- Días 3-4: scanner.js
- Días 5: product-operations.js

### Semana 2: Prioridad Media + Baja
- Días 1-2: tabla-productos.js + configuraciones.js
- Día 3: registro-entradas-operations.js
- Días 4-5: lotes-avanzado.js + lotes-database.js + rep.js

### Semana 3: Deprecación y Testing
- Día 1: db-operations.js deprecación
- Día 2: logs.js eliminación
- Días 3-5: Testing integral y ajustes finales

---

## ⚠️ Riesgos y Mitigaciones

### Riesgos Identificados

1. **Funcionalidad rota durante migración**
   - Mitigación: Migrar archivo por archivo, testing exhaustivo
   
2. **Código legacy que importa directamente**
   - Mitigación: Búsqueda exhaustiva de imports antes de deprecar
   
3. **Regresiones en funcionalidad crítica**
   - Mitigación: Suite de tests automatizados
   
4. **Performance degradada**
   - Mitigación: Benchmarks antes y después

---

## 📚 Recursos

### Documentación de Referencia
- [INTEGRACION_LEGACY_COMPLETADA.md](./INTEGRACION_LEGACY_COMPLETADA.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [REPOSITORIES_GUIDE.md](./REPOSITORIES_GUIDE.md)

### Herramientas
- Test de integración: `test-integración-completa.html`
- Service Worker v3
- Consola de desarrollador

---

## ✅ Cuando Fase 3 Esté Completa

Habremos logrado:

1. ✅ **Migración 100% completa** a nueva arquitectura
2. ✅ **Código legacy eliminado** o usando bridges
3. ✅ **Sin duplicación** de lógica
4. ✅ **App totalmente funcional** con nueva estructura
5. ✅ **Base sólida** para Fase 4 (optimizaciones)

---

**Próxima Fase (Fase 4):** Optimizaciones, mejoras de performance, y características nuevas

---

**Última actualización:** 3 de octubre de 2025  
**Responsable:** Angel Aramiz
