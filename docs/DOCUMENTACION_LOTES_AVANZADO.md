# Sistema de Inventario por Lotes Avanzado

## Descripción General

El Sistema de Inventario por Lotes Avanzado es una mejora significativa del sistema de lotes existente, diseñado para facilitar el conteo masivo de productos con unidad tipo "Kg" mediante escaneo automático de códigos de barras CODE128.

## Características Principales

### 1. Interfaz de Pestañas
- **Inventario Manual**: Funcionalidad tradicional de búsqueda y registro individual
- **Inventario por Lotes Avanzado**: Nueva funcionalidad para escaneo masivo

### 2. Escaneo Automático
- **Sin búsqueda previa**: El sistema identifica automáticamente el producto al escanear
- **Extracción automática**: PLU, peso y precio se extraen del código CODE128
- **Validación inteligente**: Verificación automática de productos y precios

### 3. Gestión de Productos Primarios y Subproductos
- **Detección automática**: Identifica si un producto es primario o subproducto
- **Relaciones inteligentes**: Usa tabla `productos_subproducto` para establecer vínculos
- **Agrupación automática**: Organiza productos por categorías principales

### 4. Configuración Avanzada
- **Panel de opciones**: Configuración personalizable del comportamiento
- **Confirmaciones opcionales**: Control de ventanas de confirmación
- **Sonido de confirmación**: Feedback auditivo opcional

## Flujo de Trabajo

### Paso 1: Selección de Pestaña
1. Navegar a la sección de inventario
2. Seleccionar "Inventario por Lotes Avanzado"
3. Revisar panel de alerta y configuración

### Paso 2: Configuración del Sistema
1. **Confirmación de productos similares**: 
   - Activado: Muestra ventana de confirmación para productos con el mismo PLU
   - Desactivado: Procesa automáticamente usando precio previo

2. **Agrupación automática**:
   - Activado: Agrupa productos con el mismo PLU automáticamente
   - Desactivado: Mantiene productos separados

3. **Sonido de confirmación**:
   - Activado: Reproduce beep al escanear exitosamente
   - Desactivado: Escaneo silencioso

### Paso 3: Inicio del Escaneo
1. Hacer clic en "Iniciar Escaneo por Lotes Avanzado"
2. Se abre modal con pestañas:
   - **Escáner**: Cámara para escanear códigos
   - **Productos Escaneados**: Lista de productos procesados

### Paso 4: Procesamiento de Códigos
Para cada código escaneado:

1. **Extracción de datos**: PLU, precio por porción
2. **Búsqueda de producto**: Localiza producto en base de datos por PLU
3. **Verificación de historial**: Busca si ya fue escaneado previamente
4. **Determinación de tipo**:
   - Si existe relación en `productos_subproducto` → Subproducto
   - Si no existe relación → Producto Primario

### Paso 5: Manejo de Nuevos Productos
Para productos no escaneados previamente:

**Producto Primario**:
- Mostrar información del producto
- Solicitar precio por kilo
- Calcular peso: `peso = precioPorción / precioKilo`
- Guardar información

**Subproducto**:
- Mostrar información del subproducto
- Mostrar información del producto primario (informativo)
- Solicitar precio por kilo del subproducto
- Calcular peso y guardar

### Paso 6: Manejo de Productos Existentes
Para productos ya escaneados:
- Usar precio por kilo almacenado
- Calcular peso automáticamente
- Mostrar confirmación opcional (según configuración)

### Paso 7: Finalización
1. Hacer clic en "Finalizar Escaneo por Lotes Avanzado"
2. Productos se agrupan por primario/subproducto
3. Se muestra confirmación con resumen
4. Se cierra modal de escaneo

### Paso 8: Visualización de Resultados
1. Aparecen tarjetas de productos primarios
2. Cada tarjeta muestra:
   - Código y nombre del producto primario
   - Peso total acumulado
   - Cantidad de productos escaneados
3. Hacer clic en tarjeta muestra desglose de subproductos

### Paso 9: Guardado
1. Hacer clic en "Guardar Inventario"
2. Se crean entradas en el inventario
3. Se sincroniza con Supabase
4. Se actualiza tabla de inventario
5. Se limpia la sesión

## Estructura de Datos

### Código CODE128 (Formato de Báscula)
```
Formato: 022630000287341 (15 dígitos)
- Posición 0-1: Prefijo (02)
- Posición 2-5: PLU (2630)
- Posición 6-13: Precio en centavos (00028734 = $287.34)
- Posición 14: Dígito de control (1)
```

### Tabla productos_subproducto
```sql
CREATE TABLE productos_subproducto (
    id SERIAL PRIMARY KEY,
    primarioProductID TEXT NOT NULL,
    subProductoID TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Estructura de Producto Escaneado
```javascript
{
    id: "timestamp_random",
    plu: "2630",
    codigo: "022630000287341",
    nombre: "Manzana Roja",
    marca: "Frutas del Valle",
    unidad: "Kg",
    categoria: "Frutas",
    peso: 1.437,
    precioPorcion: 287.34,
    precioKilo: 200.00,
    tipo: "primario" | "subproducto",
    productoPrimario: { /* info del producto primario */ },
    timestamp: "2025-01-09T12:00:00.000Z"
}
```

## Archivos del Sistema

### Archivos Principales
- `inventario.html`: Interfaz principal con pestañas
- `lotes-avanzado.js`: Lógica principal del sistema
- `lotes-database.js`: Manejo de datos y Supabase
- `lotes-config.js`: Configuración del sistema

### Archivos Relacionados
- `main.js`: Inicialización del sistema
- `styles.css`: Estilos específicos
- `lotes-scanner.js`: Sistema de lotes original

## Configuración del Sistema

### Variables de Configuración
```javascript
configuracionEscaneo = {
    confirmarProductosSimilares: true,
    agruparAutomaticamente: true,
    sonidoConfirmacion: true
}
```

### Configuración de Escáner
```javascript
config = {
    fps: 10,
    qrbox: { width: 300, height: 200 },
    experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
    }
}
```

## Almacenamiento Local

### IndexedDB - Tabla precios_kilo
Almacena precios por kilo para evitar re-ingresar:
```javascript
{
    plu: "2630",
    precioKilo: 200.00,
    productoInfo: { /* información del producto */ },
    timestamp: "2025-01-09T12:00:00.000Z"
}
```

### localStorage - Respaldos
- `backup_lotes_timestamp`: Respaldos automáticos
- `lotes_config_*`: Configuraciones personalizadas

## Manejo de Errores

### Errores Comunes
1. **Código no válido**: Formato incorrecto o no CODE128
2. **Producto no encontrado**: PLU no existe en base de datos
3. **Error de conexión**: Problemas con Supabase
4. **Precio inválido**: Precio por kilo incorrecto

### Validaciones
- Formato de código CODE128
- Existencia de producto en base de datos
- Rango de precios válidos
- Conexión a base de datos

## Rendimiento

### Optimizaciones
- Cache de productos escaneados
- Búsquedas indexadas por PLU
- Procesamiento asíncrono
- Validaciones en paralelo

### Limitaciones
- Máximo 1000 productos por sesión
- Tiempo de espera de conexión: 10 segundos
- Tamaño máximo de caché: 50MB

## Seguridad

### Validaciones de Entrada
- Sanitización de códigos escaneados
- Validación de formato PLU
- Verificación de rangos de precios

### Manejo de Sesiones
- Limpieza automática de datos temporales
- Respaldos automáticos
- Restauración de sesiones

## Extensibilidad

### Nuevos Formatos de Código
Para agregar soporte a nuevos formatos:
1. Definir en `CODIGOS_SOPORTADOS`
2. Crear función extractora
3. Actualizar validaciones

### Nuevos Tipos de Producto
Para agregar tipos de producto:
1. Definir en `TIPOS_PRODUCTOS`
2. Actualizar lógica de agrupación
3. Modificar interfaz de usuario

## Mantenimiento

### Limpieza Automática
- Datos locales: 30 días
- Respaldos: 7 días
- Caché: 1000 elementos máximo

### Monitoreo
- Logs de escaneo
- Métricas de rendimiento
- Estadísticas de uso

## Troubleshooting

### Problemas Comunes

1. **Escáner no inicia**:
   - Verificar permisos de cámara
   - Comprobar compatibilidad del navegador
   - Revisar consola de errores

2. **Productos no se encuentran**:
   - Verificar conexión a Supabase
   - Comprobar formato de PLU
   - Validar datos en base de datos

3. **Cálculos incorrectos**:
   - Verificar formato de código CODE128
   - Comprobar precio por kilo ingresado
   - Revisar configuración de decimales

### Logs de Depuración
```javascript
console.log('Código escaneado:', codigo);
console.log('Datos extraídos:', datosExtraidos);
console.log('Producto encontrado:', producto);
console.log('Peso calculado:', peso);
```

## Actualizaciones Futuras

### Características Planificadas
- Soporte para más formatos de código
- Integración con balanzas
- Exportación avanzada de datos
- Análisis de patrones de escaneo
- Modo offline completo

### Mejoras de Rendimiento
- Optimización de búsquedas
- Compresión de datos
- Procesamiento en background
- Cache inteligente

---

*Documentación actualizada: 9 de enero de 2025*
