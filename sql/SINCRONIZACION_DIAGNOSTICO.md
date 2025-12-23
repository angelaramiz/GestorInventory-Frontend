# Diagnóstico de Sincronización de Entradas

## Problema Reportado
Los datos locales no se sincronizan con Supabase después de ejecutar el script SQL.

## Solución Implementada

### ✅ **Problema Identificado**
La función `sincronizarEntradas()` solo llamaba a `sincronizarEntradasDesdeSupabase()` (unidireccional), pero no procesaba la cola local para enviar datos a Supabase.

### ✅ **Problema Adicional Encontrado**
Faltaban varias columnas en la tabla `registro_entradas`:
- `producto_id` - Referencia al producto
- `codigo`, `nombre`, `marca`, `categoria`, `unidad`, `cantidad`, `fecha_entrada`, `comentarios` - Datos del producto
- `usuario_id`, `created_at`, `updated_at` - Metadatos

### ✅ **Solución Completa:**
- ✅ Agregada importación de `procesarColaSincronizacionEntradas`
- ✅ Modificada función `sincronizarEntradas()` para sincronización bidireccional completa
- ✅ Actualizado script SQL para agregar **todas** las columnas faltantes
- ✅ Agregados logs detallados para debugging
- ✅ Creado script de diagnóstico

## Cómo Diagnosticar Problemas

### 1. **Usar el Diagnóstico Automático**
En la consola del navegador (F12), ejecuta:
```javascript
diagnosticarSincronizacionEntradas()
```

Esto mostrará:
- ✅ Estado de conexión
- 👤 Usuario actual
- 📋 Estado de la cola de sincronización
- ⏰ Última sincronización
- 💾 Registros en IndexedDB

### 2. **Verificar Logs en Consola**
Al hacer clic en "Sincronizar con Servidor", deberías ver:
```
🔄 Iniciando sincronización bidireccional de entradas
📋 Cola de sincronización antes: X elementos
⬇️ Sincronizando desde Supabase a local...
⬆️ Procesando cola local a Supabase...
📋 Cola de sincronización después: 0 elementos
✅ Sincronización bidireccional completada
```

### 3. **Pasos de Troubleshooting**

#### **Si hay errores de "Key already exists":**
1. **Limpiar la cola de sincronización:**
   ```javascript
   limpiarColaSincronizacionEntradas() // Confirma la acción
   ```
2. **Verificar IDs duplicados:**
   ```javascript
   diagnosticarSincronizacionEntradas()
   ```
3. **Recargar la página** y registrar nuevas entradas

#### **Si el error persiste:**
- Verificar que no hay registros duplicados en Supabase
- Revisar que los IDs temporales se están generando correctamente
- Verificar que la tabla de Supabase tiene las restricciones de clave primaria correctas

#### **Si hay errores de red:**
- Verificar configuración de Supabase
- Revisar CORS settings
- Verificar que el usuario esté autenticado

## Flujo de Sincronización Actual

1. **Usuario registra entrada** → Se guarda en IndexedDB con ID temporal
2. **Se agrega a cola de sync** → `syncQueueEntradas` en localStorage
3. **Al sincronizar:**
   - ⬇️ Primero: Descarga cambios desde Supabase
   - ⬆️ Después: Procesa cola local y envía a Supabase
   - ✅ Actualiza IDs temporales por IDs permanentes
4. **Resultado:** Datos consistentes en ambas bases

## Comandos Útiles para Debugging

```javascript
// Ver estado completo
diagnosticarSincronizacionEntradas()

// Ver solo la cola
JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]')

// Ver último sync
localStorage.getItem('lastSyncEntradas')

// Limpiar cola (cuidado!)
localStorage.setItem('syncQueueEntradas', '[]')
```

## Próximos Pasos

1. **Probar la sincronización** después de ejecutar el script SQL
2. **Usar diagnóstico** si hay problemas
3. **Revisar logs** para identificar errores específicos
4. **Contactar soporte** si persisten los problemas