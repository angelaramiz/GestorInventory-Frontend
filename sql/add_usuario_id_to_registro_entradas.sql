-- Script SQL para agregar las columnas faltantes a la tabla registro_entradas
-- Ejecutar este script en el SQL Editor de Supabase

-- Verificar y agregar columna updated_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'updated_at') THEN
        ALTER TABLE registro_entradas ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna updated_at agregada a registro_entradas';
    ELSE
        RAISE NOTICE 'Columna updated_at ya existe en registro_entradas';
    END IF;
END $$;

-- Verificar y agregar columna usuario_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'usuario_id') THEN
        ALTER TABLE registro_entradas ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Columna usuario_id agregada a registro_entradas';
    ELSE
        RAISE NOTICE 'Columna usuario_id ya existe en registro_entradas';
    END IF;
END $$;

-- Verificar y agregar columna producto_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'producto_id') THEN
        ALTER TABLE registro_entradas ADD COLUMN producto_id TEXT;
        RAISE NOTICE 'Columna producto_id agregada a registro_entradas';
    ELSE
        RAISE NOTICE 'Columna producto_id ya existe en registro_entradas';
    END IF;
END $$;

-- Verificar y agregar otras columnas necesarias si no existen
DO $$
BEGIN
    -- codigo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'codigo') THEN
        ALTER TABLE registro_entradas ADD COLUMN codigo TEXT;
        RAISE NOTICE 'Columna codigo agregada a registro_entradas';
    END IF;

    -- nombre
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'nombre') THEN
        ALTER TABLE registro_entradas ADD COLUMN nombre TEXT;
        RAISE NOTICE 'Columna nombre agregada a registro_entradas';
    END IF;

    -- marca
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'marca') THEN
        ALTER TABLE registro_entradas ADD COLUMN marca TEXT;
        RAISE NOTICE 'Columna marca agregada a registro_entradas';
    END IF;

    -- categoria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'categoria') THEN
        ALTER TABLE registro_entradas ADD COLUMN categoria TEXT;
        RAISE NOTICE 'Columna categoria agregada a registro_entradas';
    END IF;

    -- unidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'unidad') THEN
        ALTER TABLE registro_entradas ADD COLUMN unidad TEXT;
        RAISE NOTICE 'Columna unidad agregada a registro_entradas';
    END IF;

    -- cantidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'cantidad') THEN
        ALTER TABLE registro_entradas ADD COLUMN cantidad DECIMAL;
        RAISE NOTICE 'Columna cantidad agregada a registro_entradas';
    END IF;

    -- fecha_entrada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'fecha_entrada') THEN
        ALTER TABLE registro_entradas ADD COLUMN fecha_entrada DATE;
        RAISE NOTICE 'Columna fecha_entrada agregada a registro_entradas';
    END IF;

    -- comentarios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registro_entradas'
                   AND column_name = 'comentarios') THEN
        ALTER TABLE registro_entradas ADD COLUMN comentarios TEXT;
        RAISE NOTICE 'Columna comentarios agregada a registro_entradas';
    END IF;
END $$;

-- Crear índices para mejorar rendimiento (solo si las columnas existen)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'registro_entradas'
               AND column_name = 'usuario_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes
                       WHERE tablename = 'registro_entradas'
                       AND indexname = 'idx_registro_entradas_usuario_id') THEN
            CREATE INDEX idx_registro_entradas_usuario_id ON registro_entradas(usuario_id);
            RAISE NOTICE 'Índice idx_registro_entradas_usuario_id creado';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'registro_entradas'
               AND column_name = 'updated_at') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes
                       WHERE tablename = 'registro_entradas'
                       AND indexname = 'idx_registro_entradas_updated_at') THEN
            CREATE INDEX idx_registro_entradas_updated_at ON registro_entradas(updated_at);
            RAISE NOTICE 'Índice idx_registro_entradas_updated_at creado';
        END IF;
    END IF;
END $$;

-- Actualizar registros existentes con valores por defecto
DO $$
BEGIN
    -- Actualizar updated_at para registros existentes si la columna existe
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'registro_entradas'
               AND column_name = 'updated_at') THEN
        UPDATE registro_entradas SET updated_at = NOW() WHERE updated_at IS NULL;
        RAISE NOTICE 'Registros existentes actualizados con updated_at';
    END IF;

    -- Actualizar created_at para registros existentes si la columna existe
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'registro_entradas'
               AND column_name = 'created_at') THEN
        UPDATE registro_entradas SET created_at = NOW() WHERE created_at IS NULL;
        RAISE NOTICE 'Registros existentes actualizados con created_at';
    END IF;
END $$;