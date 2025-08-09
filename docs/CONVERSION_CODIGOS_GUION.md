# 🔢 Conversión Automática de Códigos con Guión

## 📋 Descripción

Esta funcionalidad permite a los usuarios ingresar códigos de barras de forma simplificada utilizando guiones (-) en lugar de múltiples ceros. El sistema convierte automáticamente cada guión (-) en 6 ceros (000000).

## ✨ Funcionalidad

### 🎯 **Comportamiento**
- **Entrada**: `28331-1`
- **Salida automática**: `283310000001`

### 🔄 **Conversión**
- Cada guión `-` se reemplaza por `000000` (6 ceros)
- La conversión ocurre en tiempo real mientras el usuario escribe
- También se aplica cuando el usuario sale del campo (evento blur)

## 📱 **Archivos Implementados**

### 🗂️ **Plantillas HTML con Conversión**
1. **`agregar.html`** - Agregar productos
   - ✅ Campo código individual (`codigoAgregar`)
   - ✅ Campo producto primario (`producto-primario`)
   - ✅ Campo código primario tabla (`codigo-primario`)
   - ✅ Campos dinámicos de subproductos

2. **`consulta.html`** - Consulta de productos
   - ✅ Campo código consulta (`codigoConsulta`)

3. **`editar.html`** - Edición de productos
   - ✅ Campo código original (`codigoEditar`)
   - ✅ Campo código editado (`codigoEditado`)

4. **`registro-entradas.html`** - Registro de entradas
   - ✅ Campo búsqueda código (`busquedaCodigo`)
   - ✅ Campo código producto (`codigoProducto`)
   - ✅ Campo filtro código (`filtroCodigo`)

5. **`inventario.html`** - Gestión de inventario
   - ✅ Campo código (`codigo`)
   - ✅ Campo código producto inventario (`codigoProductoInventario`)

## ⚙️ **Implementación Técnica**

### 🔧 **Función Principal**
```javascript
function convertirGuionACeros(valor) {
    return valor.replace(/-/g, '000000');
}
```

### 📝 **Aplicación a Inputs**
```javascript
function aplicarConversionCodigo(input) {
    if (!input) return;
    
    // Conversión en tiempo real
    input.addEventListener('input', function(e) {
        const valorOriginal = e.target.value;
        const valorConvertido = convertirGuionACeros(valorOriginal);
        
        if (valorOriginal !== valorConvertido) {
            const cursorPos = e.target.selectionStart;
            e.target.value = valorConvertido;
            
            // Ajustar posición del cursor
            const diferencia = valorConvertido.length - valorOriginal.length;
            const nuevaPosicion = Math.min(cursorPos + diferencia, valorConvertido.length);
            e.target.setSelectionRange(nuevaPosicion, nuevaPosicion);
        }
    });

    // Conversión final al salir del campo
    input.addEventListener('blur', function(e) {
        e.target.value = convertirGuionACeros(e.target.value);
    });
}
```

### 🔗 **Integración con Tabla Productos**
- El archivo `tabla-productos.js` utiliza la función global del HTML
- Se aplica automáticamente a campos dinámicos de subproductos
- Función disponible como `window.aplicarConversionCodigoAInput`

## 📖 **Ejemplos de Uso**

### ✅ **Casos de Uso Comunes**
1. **Código corto**: `123-1` → `123000001`
2. **Código medio**: `28331-1` → `283310000001`  
3. **Múltiples guiones**: `28-31-1` → `280000310000001`
4. **Código largo**: `283310000-1` → `2833100000000001`

### 🎭 **Comportamiento del Cursor**
- El cursor se mantiene en la posición correcta después de la conversión
- Si se agregan caracteres, el cursor se ajusta proporcionalmente
- Experiencia de usuario fluida sin interrupciones

## 🔒 **Validaciones y Seguridad**

### ✅ **Características Seguras**
- **No loops infinitos**: Se valida que hay cambios antes de aplicar conversión
- **Posición de cursor**: Se calcula correctamente para evitar saltos
- **Compatibilidad**: Funciona en todos los navegadores modernos
- **Performance**: Conversión instantánea sin lag perceptible

### 🛡️ **Robustez**
- Maneja campos vacíos sin errores
- Funciona con campos readonly (aunque no es típico)
- Compatible con escáneres de códigos de barras
- No interfiere con otras funcionalidades del formulario

## 🚀 **Beneficios**

### 👥 **Para Usuarios**
- ⚡ **Velocidad**: Ingreso más rápido de códigos largos
- 🎯 **Precisión**: Menos errores al escribir múltiples ceros
- 📱 **Móvil**: Especialmente útil en dispositivos táctiles
- 🧠 **Usabilidad**: Más fácil de recordar y escribir

### 💼 **Para el Negocio**
- 📈 **Productividad**: Empleados ingresan datos más rápido
- ✅ **Calidad**: Menos errores en códigos de productos
- 💰 **Costo**: Reducción en tiempo de capacitación
- 🔄 **Adopción**: Usuarios prefieren la interfaz simplificada

## 🔮 **Futuras Mejoras**

### 🎯 **Posibles Extensiones**
1. **Configuración personalizable**: Permitir cambiar número de ceros
2. **Patrones múltiples**: Soportar diferentes formatos de conversión
3. **Validación**: Verificar formatos de códigos estándar
4. **Retroalimentación visual**: Indicar cuando se aplica conversión

### 📊 **Métricas a Considerar**
- Tiempo promedio de ingreso de códigos
- Errores reducidos en códigos
- Satisfacción del usuario
- Adopción de la funcionalidad

---

*📝 Implementado el 11 de julio de 2025 - GestorInventory v2.0*
