# 🧪 Guía de Prueba: Fix Reporte Duplicado

## 📋 Prerequisitos

- ✅ Todos los archivos validados (sintaxis correcta)
- ✅ Base de datos temporal (IndexedDB) limpia
- ✅ Navegador actualizado (Chrome, Firefox, Edge recomendado)

---

## 🎬 Paso 1: Preparación - FASE 3 (Ingreso de Productos)

### 1.1 Accede a la sección de FASE 3
```
URL: [tu-aplicacion]/index.html
Busca: Sección "FASE 3: Ingreso de Productos"
Deberías ver: Panel para ingresar productos por sección
```

### 1.2 Ingresa 3 productos de prueba

```
PRODUCTO 1:
├─ Sección: 1
├─ Nivel: 1
├─ Nombre: chicles
├─ Cantidad: 5
├─ Unidad: unidad
└─ Caducidad: (cualquier fecha)

PRODUCTO 2:
├─ Sección: 1
├─ Nivel: 2
├─ Nombre: axe
├─ Cantidad: 3
├─ Unidad: spray
└─ Caducidad: (cualquier fecha)

PRODUCTO 3:
├─ Sección: 2
├─ Nivel: 1
├─ Nombre: Producto 1
├─ Cantidad: 8
├─ Unidad: unidad
└─ Caducidad: (cualquier fecha)
```

### 1.3 Verifica en Consola del Navegador

Abre F12 → Consola y deberías ver:

```javascript
✅ [INFO] Productos ingresados:
   - chicles (Sec 1, Nv 1): ID = "1_1_chicles"
   - axe (Sec 1, Nv 2): ID = "1_1_axe"
   - Producto 1 (Sec 2, Nv 1): ID = "2_1_producto_1"
```

---

## 🎬 Paso 2: Escaneo - FASE 6 (Escanea Productos)

### 2.1 Accede a FASE 6 (Escaneo)

```
Busca: Botón "Iniciar Escaneo"
Deberías ver: Modal de escaneo QR con cámara
```

### 2.2 Escanea Producto 1 (chicles)

```
1. Modal mostrará: "Escaneando: chicles"
2. Apunta cámara al código de chicles
3. Se escaneará automáticamente
4. Presiona "Confirmar Escaneo"
5. Verifica en consola:
   
   ✅ Producto escaneado:
      - virtual_id: "1_1_chicles"  ← ¡IMPORTANTE! Debe ser un string
      - codigo: "7622210582027"
      - nombre: "chicles"
      - cantidad: 5
```

### 2.3 Escanea Producto 2 (axe)

```
1. Modal avanza a: "Escaneando: axe"
2. Apunta cámara al código de axe
3. Se escaneará automáticamente
4. Presiona "Confirmar Escaneo"
5. Verifica en consola:
   
   ✅ Producto escaneado:
      - virtual_id: "1_2_axe"  ← ¡IMPORTANTE! Debe coincidir
      - codigo: "7506306250000"
      - nombre: "axe"
      - cantidad: 3
```

### 2.4 Salta Producto 3 (Producto 1)

```
1. Modal muestra: "Escaneando: Producto 1"
2. Presiona botón "Saltar" (sin escanear)
3. Sistema marca como no escaneado
```

### 2.5 Finaliza Escaneo

```
Al completar el escaneo, se mostrará:
✅ "Escaneo Completado"
✅ Contador: 2 de 3 productos escaneados
```

---

## 🎬 Paso 3: Verificación - FASE 7 (Reporte)

### 3.1 Revisa la Tabla de Reporte

```
Deberías ver 3 FILAS:

┌────┬───────────────────┬─────────────────┬─────┬──────────────┐
│ #  │ Código            │ Producto        │ Qty │ Estado       │
├────┼───────────────────┼─────────────────┼─────┼──────────────┤
│ 1  │ 7622210582027     │ chicles         │ 5   │ Inventariado │ ✅
├────┼───────────────────┼─────────────────┼─────┼──────────────┤
│ 2  │ 7506306250000     │ axe             │ 3   │ Inventariado │ ✅
├────┼───────────────────┼─────────────────┼─────┼──────────────┤
│ 3  │ SIN ESCANEAR      │ Producto 1      │ 8   │ Incompleto   │ ✅
└────┴───────────────────┴─────────────────┴─────┴──────────────┘

VALIDACIONES CRÍTICAS:
```

### 3.2 Lista de Validación

#### ✅ Validación 1: Cantidades Correctas

```
VERIFICAR:
□ chicles muestra Qty: 5 (NO 0)
□ axe muestra Qty: 3 (NO 0)
□ Producto 1 muestra Qty: 8 (NO 0)

SI VES 0: El fix NO funcionó
SI VES CANTIDADES: El fix FUNCIONÓ ✅
```

#### ✅ Validación 2: Status Correcto

```
VERIFICAR:
□ chicles estado = "Inventariado" (VERDE o azul)
□ axe estado = "Inventariado" (VERDE o azul)
□ Producto 1 estado = "Incompleto" (ROJO o amarillo)

SI TODOS DICEN "Incompleto": El fix NO funcionó
SI STATUS COINCIDEN: El fix FUNCIONÓ ✅
```

#### ✅ Validación 3: No hay Duplicados

```
VERIFICAR:
□ Solo 1 fila para chicles (no 2)
□ Solo 1 fila para axe (no 2)
□ Solo 1 fila para Producto 1 (no 2)

SI HAY DUPLICADOS: El fix NO funcionó
SI NO HAY DUPLICADOS: El fix FUNCIONÓ ✅
```

#### ✅ Validación 4: Estructura Correcta

```
VERIFICAR EN CONSOLA (F12):
console.log('Reporte:', reporte);

Deberías ver:
{
  titulo: "Reporte de Inventario Realizado",
  fecha: "...",
  hora: "...",
  filas: [
    {
      numero: 1,
      codigo: "7622210582027",
      nombre_fisico: "chicles",
      cantidad: 5,
      estado: "inventariado",  ← ¡IMPORTANTE!
      colorEstado: "verde"
    },
    {
      numero: 2,
      codigo: "7506306250000",
      nombre_fisico: "axe",
      cantidad: 3,
      estado: "inventariado",  ← ¡IMPORTANTE!
      colorEstado: "verde"
    },
    {
      numero: 3,
      codigo: "SIN ESCANEAR",
      nombre_fisico: "Producto 1",
      cantidad: 8,
      estado: "incompleto",    ← ¡IMPORTANTE!
      colorEstado: "rojo"
    }
  ],
  estadisticas: {
    totalProductos: 3,
    totalEscaneados: 2,
    totalIncompletos: 1,
    ...
  }
}
```

---

## 🔍 Debugging - Si algo falla

### Problema: Las cantidades siguen siendo 0

```
PASOS PARA DIAGNOSTICAR:

1. Abre Consola (F12)
2. Busca líneas que digan:
   "📊 FASE 7: Generando reporte"

3. Revisa la línea que dice:
   "✅ Reporte de inventario generado:"

4. Si en "cantidad" ves 0, mira:
   { cantidad: virtual?.cantidad || 0 }
   ↑
   Esto significa: virtual fue NULL
   ↑
   Eso significa: NO encontró coincidencia de IDs

5. Para verificar IDs, en Consola escribe:
   
   // Ver qué IDs se guardaron en FASE 6
   db.transaction(['inventario_temporal']).objectStore('inventario_temporal').getAll()
   
   Deberías ver:
   [{
     virtual_id: "1_1_chicles",  ← ¡ESTE debe coincidir!
     codigo_producto: "7622210582027",
     ...
   }]

6. Si ves virtual_id: 1 (número) en lugar de "1_1_chicles":
   = Los datos viejos aún existen
   = Borra caché/IndexedDB y prueba de nuevo
```

### Problema: Status todos dicen "Incompleto"

```
PASOS PARA DIAGNOSTICAR:

1. En Consola, verifica que productosVirtuales tenga IDs correctos:
   
   console.log('Productos virtuales:', productosVirtuales);
   
   Deberías ver:
   [{
     id: "1_1_chicles",    ← ¡ESTE es el formato correcto!
     nombre: "chicles",
     cantidad: 5,
     ...
   }]

2. Si ves id: 1, 2, 3... (números):
   = El fix aún no está aplicado
   = Recarga la página (Ctrl+F5 para limpiar caché)

3. Si el formato es correcto pero sigue fallando:
   = Borra IndexedDB y prueba de nuevo:
   
   En Consola:
   indexedDB.deleteDatabase('inventario_temporal');
   location.reload();
```

### Problema: Hay duplicados en la tabla

```
PASOS PARA DIAGNOSTICAR:

1. Verifica que cada virtual_id sea único:
   
   In Console:
   const productos = await obtenerProductosEscaneados();
   console.log('Escaneos guardados:', productos);
   productos.forEach(p => console.log(p.virtual_id));
   
   Cada ID debe aparecer UNA SOLA VEZ

2. Si hay duplicados:
   = Borra la BD temporal:
   
   indexedDB.deleteDatabase('inventario_temporal');
   
3. Intenta el flujo de nuevo desde FASE 3
```

---

## 📊 Checklist Final

### Después de Completar Prueba

```
□ FASE 3: Ingresé 3 productos correctamente
□ FASE 6: Escaneé 2 productos y salté 1
□ FASE 7: El reporte muestra:
  □ chicles: Qty 5, Estado Inventariado
  □ axe: Qty 3, Estado Inventariado
  □ Producto 1: Qty 8, Estado Incompleto
□ No hay duplicados
□ No hay cantidades en 0
□ Console no muestra errores rojos

SI TODO ESTÁ MARCADO: ✅ FIX FUNCIONÓ CORRECTAMENTE
```

---

## 📞 Problemas Adicionales

Si encuentras otros problemas, por favor verifica:

1. **Código escaneado incorrecto:**
   - Verifique que el código QR sea válido
   - Pruebe con código diferente

2. **Producto no encontrado en escaneo:**
   - Verifique que el producto esté ingresado en FASE 3
   - Revise la ortografía exacta del nombre

3. **Errores en Consola (F12):**
   - Copie el error completo
   - Revise [CAMBIOS.md](CAMBIOS.md) para contexto
   - Consulte la documentación en [docs-desarrollo/](docs-desarrollo/)

---

## 📝 Notas

- El fix es **backward compatible**: no requiere cambios en BD
- Los datos viejos con IDs numéricos seguirán funcionando
- Se recomienda limpiar IndexedDB después de actualizar el código
- No hay impacto en Supabase (solo en lógica local)

---

**¡A Probar!** 🚀
