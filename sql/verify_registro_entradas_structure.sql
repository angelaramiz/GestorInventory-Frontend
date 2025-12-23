-- Script para verificar la estructura de la tabla registro_entradas
-- Ejecutar después del script principal para confirmar que las columnas se agregaron correctamente

-- Verificar columnas de la tabla registro_entradas
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'registro_entradas'
ORDER BY ordinal_position;

-- Verificar que todas las columnas necesarias existen
SELECT
    'codigo' as columna_requerida,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'codigo') THEN '✅ Existe' ELSE '❌ Falta' END as estado
UNION ALL
SELECT 'nombre', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'nombre') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'marca', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'marca') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'categoria', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'categoria') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'unidad', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'unidad') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'cantidad', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'cantidad') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'fecha_entrada', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'fecha_entrada') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'comentarios', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'comentarios') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'producto_id', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'producto_id') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'usuario_id', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'usuario_id') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'created_at', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'created_at') THEN '✅ Existe' ELSE '❌ Falta' END
UNION ALL
SELECT 'updated_at', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_entradas' AND column_name = 'updated_at') THEN '✅ Existe' ELSE '❌ Falta' END;

-- Verificar índices de la tabla registro_entradas
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'registro_entradas';

-- Contar registros en la tabla
SELECT COUNT(*) as total_registros FROM registro_entradas;

-- Verificar que las nuevas columnas tienen valores
SELECT
    COUNT(*) as total,
    COUNT(usuario_id) as con_usuario_id,
    COUNT(updated_at) as con_updated_at,
    COUNT(created_at) as con_created_at
FROM registro_entradas;