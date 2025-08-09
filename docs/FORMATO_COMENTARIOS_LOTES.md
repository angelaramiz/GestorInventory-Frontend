

# 📝 Formato de Comentarios - Inventario por Lotes Avanzado

## 🎯 Formato Implementado

### **Estructura del Comentario:**
```
Escaneo por lotes - [cantidad] códigos - Valor total: $[total] - Precio/Kg: $[promedio] - Detalles: Lote 1: [peso]kg - $[precio] (PLU: [plu]); Lote 2: [peso]kg - $[precio] (PLU: [plu])
```

### **Ejemplo Real:**
```
Escaneo por lotes - 2 códigos - Valor total: $1206.83 - Precio/Kg: $478.90 - Detalles: Lote 1: 1.920kg - $919.49 (PLU: 2630); Lote 2: 0.600kg - $287.34 (PLU: 2630)
```

## 📊 Componentes del Formato

### **1. Información General**
- `Escaneo por lotes` - Identificador del tipo de inventario
- `[cantidad] códigos` - Número total de productos escaneados

### **2. Totales Calculados**
- `Valor total: $[total]` - Suma de todos los precios de las porciones
- `Precio/Kg: $[promedio]` - Precio promedio por kilogramo (total valor ÷ total peso)

### **3. Detalles por Lote**
- `Lote [n]: [peso]kg - $[precio] (PLU: [plu])` - Información individual de cada producto escaneado
- Separados por punto y coma (`;`) para fácil lectura

## 🔧 Cálculos Automáticos

### **Valores Calculados:**
1. **Total de códigos:** `grupo.subproductos.length`
2. **Valor total:** `suma de todos los precioPorcion`
3. **Precio promedio por kg:** `totalValor ÷ totalPeso`
4. **Peso individual:** `producto.peso.toFixed(3)`
5. **Precio individual:** `producto.precioPorcion.toFixed(2)`

### **Función Implementada:**
```javascript
function generarComentariosDetallados(grupo, ubicacionNombre, fechaEscaneo) {
    // Calcular totales
    let totalProductos = grupo.subproductos.length;
    let totalPeso = grupo.pesoTotal;
    let totalValor = grupo.subproductos.reduce((sum, prod) => sum + prod.precioPorcion, 0);
    let precioPromedioKg = totalValor / totalPeso;

    // Generar detalles de cada producto escaneado
    let detalles = grupo.subproductos.map((producto, index) => {
        return `Lote ${index + 1}: ${producto.peso.toFixed(3)}kg - $${producto.precioPorcion.toFixed(2)} (PLU: ${producto.plu})`;
    }).join('; ');

    // Formato conciso y directo
    const comentarios = `Escaneo por lotes - ${totalProductos} códigos - Valor total: $${totalValor.toFixed(2)} - Precio/Kg: $${precioPromedioKg.toFixed(2)} - Detalles: ${detalles}`;

    return comentarios;
}
```

## ✅ Ventajas del Formato

### **Conciso y Directo**
- ✅ Toda la información en una sola línea
- ✅ Fácil lectura y comprensión
- ✅ Formato estructurado y consistente

### **Información Completa**
- ✅ Cantidad total de productos
- ✅ Valor económico total
- ✅ Precio promedio por kilogramo
- ✅ Detalle individual de cada lote
- ✅ PLU de cada producto para trazabilidad

### **Optimizado para Base de Datos**
- ✅ Formato compacto para almacenamiento
- ✅ Parsing fácil si se necesita extraer datos
- ✅ Legible tanto para humanos como para sistemas

## 📋 Otros Campos del Inventario

### **Datos Adicionales Guardados:**
- **Fecha de Caducidad:** 15 días desde la fecha de escaneo
- **Lote:** `lotes-{timestamp}` para identificación única
- **Unidad:** `Kg` (productos tipo kilogramo)
- **Cantidad:** Peso total acumulado de todos los productos
- **Área:** ID del área donde se realizó el escaneo
- **Usuario:** ID del usuario que realizó el inventario

## 🎯 Resultado Final

El sistema ahora genera comentarios en el formato exacto solicitado:

```
Escaneo por lotes - 2 códigos - Valor total: $1206.83 - Precio/Kg: $478.90 - Detalles: Lote 1: 1.920kg - $919.49 (PLU: 2630); Lote 2: 0.600kg - $287.34 (PLU: 2630)
```

Este formato es:
- ✅ **Conciso** - Una sola línea con toda la información
- ✅ **Completo** - Incluye todos los datos relevantes
- ✅ **Consistente** - Mismo formato para todos los inventarios
- ✅ **Legible** - Fácil de leer y entender
- ✅ **Funcional** - Contiene toda la información necesaria para auditorías
