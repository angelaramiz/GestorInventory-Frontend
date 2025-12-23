# Scripts SQL para Registro de Entradas

## Problema
La tabla `registro_entradas` en Supabase no tenía las columnas necesarias para la sincronización bidireccional:
- `usuario_id`: Para filtrar registros por usuario
- `updated_at`: Para seguimiento de cambios en sincronización
- `created_at`: Para timestamp de creación
- `producto_id`: Referencia al producto
- `codigo`, `nombre`, `marca`, `categoria`, `unidad`, `cantidad`, `fecha_entrada`, `comentarios`: Datos del producto

## Solución

### 1. Ejecutar el script principal
**Archivo:** `add_usuario_id_to_registro_entradas.sql`

Este script:
- ✅ Verifica si las columnas existen antes de crearlas
- ✅ Agrega **todas** las columnas necesarias para sincronización completa
- ✅ Crea índices para mejor rendimiento
- ✅ Actualiza registros existentes con valores por defecto

### 2. Verificar la estructura
**Archivo:** `verify_registro_entradas_structure.sql`

Este script verifica que:
- Las columnas se agregaron correctamente
- Los índices se crearon
- Los registros existentes se actualizaron

## Columnas Agregadas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `usuario_id` | UUID | Referencia al usuario (auth.users.id) |
| `updated_at` | TIMESTAMP | Última modificación |
| `created_at` | TIMESTAMP | Fecha de creación |
| `producto_id` | TEXT | ID del producto referenciado |
| `codigo` | TEXT | Código del producto |
| `nombre` | TEXT | Nombre del producto |
| `marca` | TEXT | Marca del producto |
| `categoria` | TEXT | Categoría del producto |
| `unidad` | TEXT | Unidad de medida |
| `cantidad` | DECIMAL | Cantidad registrada |
| `fecha_entrada` | DATE | Fecha de entrada |
| `comentarios` | TEXT | Comentarios adicionales |

## Pasos para ejecutar

1. Ve a tu proyecto de Supabase
2. Ve a "SQL Editor"
3. Copia y pega el contenido de `add_usuario_id_to_registro_entradas.sql`
4. Ejecuta el script
5. Copia y pega el contenido de `verify_registro_entradas_structure.sql`
6. Ejecuta para verificar

## Después de ejecutar
Una vez ejecutados los scripts, la sincronización bidireccional funcionará correctamente con:
- Filtrado por usuario para seguridad
- Sincronización eficiente usando timestamps
- Mejor rendimiento con índices optimizados
- Almacenamiento completo de datos de entradas

## Notas importantes
- El script es seguro: verifica antes de crear/modificar
- No elimina datos existentes
- Actualiza registros existentes con valores por defecto
- Los índices mejoran el rendimiento de consultas