// Configuración específica para el sistema de lotes avanzado

// Configuración por defecto del sistema
export const CONFIG_LOTES_AVANZADO = {
    // Configuración del escáner
    escaner: {
        fps: 10,
        qrboxWidth: 300,
        qrboxHeight: 200,
        useBarCodeDetector: true,
        facingMode: "environment"
    },
    
    // Configuración de validación
    validacion: {
        confirmarProductosSimilares: true,
        agruparAutomaticamente: true,
        sonidoConfirmacion: true,
        mostrarAnimaciones: true,
        tiempoEsperaValidacion: 1500,
        tiempoEsperaReanudar: 1000
    },
    
    // Configuración de datos
    datos: {
        diasLimpiezaLocal: 30,
        diasLimpiezaBackup: 7,
        maxProductosCache: 1000,
        intervalosIncronizacion: 300000, // 5 minutos
        timeoutConexion: 10000 // 10 segundos
    },
    
    // Configuración de UI
    interfaz: {
        animacionesDuracion: 300,
        tooltipsDuracion: 2000,
        notificacionesDuracion: 3000,
        coloresPersonalizados: {
            primario: '#667eea',
            secundario: '#764ba2',
            exito: '#38a169',
            error: '#e53e3e',
            advertencia: '#f59e0b',
            info: '#3182ce'
        }
    },
    
    // Configuración de exportación
    exportacion: {
        formatosPermitidos: ['json', 'csv', 'xlsx'],
        formatoPorDefecto: 'json',
        incluirMetadatos: true,
        compresion: false
    },
    
    // Configuración de rendimiento
    rendimiento: {
        maxProductosMemoria: 5000,
        limpiezaAutomatica: true,
        cacheImagenes: true,
        precargaDatos: true
    }
};

// Configuración de códigos de barras soportados
export const CODIGOS_SOPORTADOS = {
    CODE128: {
        nombre: 'CODE128',
        descripcion: 'Código de barras para productos con peso',
        longitudes: [13, 15],
        prefijos: ['2', '02'],
        extractor: 'extraerDatosCodeCODE128'
    },
    
    UPCA: {
        nombre: 'UPC-A',
        descripcion: 'Código de barras universal',
        longitudes: [12],
        prefijos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        extractor: 'extraerDatosUPCA'
    },
    
    EAN13: {
        nombre: 'EAN-13',
        descripcion: 'Código de barras europeo',
        longitudes: [13],
        prefijos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        extractor: 'extraerDatosEAN13'
    }
};

// Configuración de tipos de productos
export const TIPOS_PRODUCTOS = {
    PRIMARIO: {
        nombre: 'Producto Primario',
        descripcion: 'Producto independiente sin relaciones',
        color: '#667eea',
        icono: '📦'
    },
    
    SUBPRODUCTO: {
        nombre: 'Subproducto',
        descripcion: 'Producto relacionado con un producto primario',
        color: '#38a169',
        icono: '📋'
    },
    
    VARIANTE: {
        nombre: 'Variante',
        descripcion: 'Variación de un producto existente',
        color: '#f59e0b',
        icono: '🔄'
    }
};

// Configuración de unidades permitidas
export const UNIDADES_PERMITIDAS = {
    PESO: {
        kg: { nombre: 'Kilogramos', simbolo: 'kg', decimal: 3 },
        g: { nombre: 'Gramos', simbolo: 'g', decimal: 0 },
        lb: { nombre: 'Libras', simbolo: 'lb', decimal: 3 },
        oz: { nombre: 'Onzas', simbolo: 'oz', decimal: 2 }
    },
    
    VOLUMEN: {
        l: { nombre: 'Litros', simbolo: 'l', decimal: 3 },
        ml: { nombre: 'Mililitros', simbolo: 'ml', decimal: 0 },
        gal: { nombre: 'Galones', simbolo: 'gal', decimal: 3 }
    },
    
    UNIDAD: {
        pza: { nombre: 'Piezas', simbolo: 'pza', decimal: 0 },
        paq: { nombre: 'Paquetes', simbolo: 'paq', decimal: 0 },
        caja: { nombre: 'Cajas', simbolo: 'caja', decimal: 0 }
    }
};

// Configuración de categorías por defecto
export const CATEGORIAS_DEFECTO = [
    { id: 'frutas', nombre: 'Frutas', color: '#38a169' },
    { id: 'verduras', nombre: 'Verduras', color: '#68d391' },
    { id: 'carnes', nombre: 'Carnes', color: '#e53e3e' },
    { id: 'lacteos', nombre: 'Lácteos', color: '#3182ce' },
    { id: 'panaderia', nombre: 'Panadería', color: '#f59e0b' },
    { id: 'abarrotes', nombre: 'Abarrotes', color: '#a0aec0' },
    { id: 'bebidas', nombre: 'Bebidas', color: '#667eea' },
    { id: 'limpieza', nombre: 'Limpieza', color: '#805ad5' },
    { id: 'otros', nombre: 'Otros', color: '#718096' }
];

// Configuración de validaciones
export const VALIDACIONES = {
    codigo: {
        minLength: 4,
        maxLength: 15,
        pattern: /^[0-9]+$/,
        required: true
    },
    
    nombre: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-.,()0-9]+$/,
        required: true
    },
    
    precio: {
        min: 0.01,
        max: 999999.99,
        decimal: 2,
        required: true
    },
    
    peso: {
        min: 0.001,
        max: 999.999,
        decimal: 3,
        required: true
    },
    
    plu: {
        length: 4,
        pattern: /^[0-9]{4}$/,
        required: true
    }
};

// Configuración de mensajes
export const MENSAJES = {
    exito: {
        productoAgregado: 'Producto agregado exitosamente',
        inventarioGuardado: 'Inventario guardado correctamente',
        datosActualizados: 'Datos actualizados',
        sincronizacionCompleta: 'Sincronización completada'
    },
    
    error: {
        codigoInvalido: 'Código de barras no válido',
        productoNoEncontrado: 'Producto no encontrado',
        errorConexion: 'Error de conexión',
        errorGuardado: 'Error al guardar datos',
        campoRequerido: 'Campo requerido'
    },
    
    advertencia: {
        productoExistente: 'Producto ya existe',
        datosIncompletos: 'Datos incompletos',
        conexionLenta: 'Conexión lenta detectada',
        almacenamientoLleno: 'Almacenamiento casi lleno'
    },
    
    info: {
        procesando: 'Procesando...',
        cargando: 'Cargando datos...',
        sincronizando: 'Sincronizando...',
        validando: 'Validando información...'
    }
};

// Configuración de teclas de acceso rápido
export const TECLAS_ACCESO = {
    iniciarEscaneo: 'F1',
    pausarEscaneo: 'F2',
    cambiarTab: 'Tab',
    guardar: 'Ctrl+S',
    buscar: 'Ctrl+F',
    limpiar: 'Ctrl+L',
    exportar: 'Ctrl+E',
    ayuda: 'F1'
};

// Configuración de almacenamiento local
export const ALMACENAMIENTO_LOCAL = {
    prefijos: {
        configuracion: 'lotes_config_',
        cache: 'lotes_cache_',
        backup: 'lotes_backup_',
        temporal: 'lotes_temp_'
    },
    
    limites: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxItems: 10000,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
    },
    
    compresion: {
        enabled: true,
        algoritmo: 'lz-string',
        nivel: 6
    }
};

// Configuración de logging
export const LOGGING = {
    nivel: 'info', // debug, info, warn, error
    maxEntradas: 1000,
    persistir: true,
    formato: 'json',
    incluirStackTrace: true,
    
    categorias: {
        escaneo: true,
        validacion: true,
        database: true,
        ui: true,
        performance: true
    }
};

// Configuración de desarrollo
export const DESARROLLO = {
    debug: false,
    mostrarLogs: true,
    simularRetrasos: false,
    datosEjemplo: true,
    cacheForzado: false,
    
    endpoints: {
        desarrollo: 'http://localhost:3000',
        pruebas: 'https://test-api.ejemplo.com',
        produccion: 'https://api.ejemplo.com'
    }
};

// Funciones para gestionar configuración
export class ConfiguracionManager {
    static obtenerConfiguracion(clave = null) {
        const config = {
            ...CONFIG_LOTES_AVANZADO,
            codigosSoportados: CODIGOS_SOPORTADOS,
            tiposProductos: TIPOS_PRODUCTOS,
            unidadesPermitidas: UNIDADES_PERMITIDAS,
            categoriasDefecto: CATEGORIAS_DEFECTO,
            validaciones: VALIDACIONES,
            mensajes: MENSAJES,
            teclasAcceso: TECLAS_ACCESO,
            almacenamientoLocal: ALMACENAMIENTO_LOCAL,
            logging: LOGGING,
            desarrollo: DESARROLLO
        };
        
        if (clave) {
            return config[clave];
        }
        
        return config;
    }
    
    static actualizarConfiguracion(clave, valor) {
        try {
            const configActual = this.obtenerConfiguracion();
            configActual[clave] = { ...configActual[clave], ...valor };
            
            // Persistir configuración personalizada
            localStorage.setItem(
                `${ALMACENAMIENTO_LOCAL.prefijos.configuracion}${clave}`,
                JSON.stringify(valor)
            );
            
            console.log(`Configuración actualizada: ${clave}`, valor);
            return true;
        } catch (error) {
            console.error('Error al actualizar configuración:', error);
            return false;
        }
    }
    
    static restaurarConfiguracion(clave = null) {
        try {
            if (clave) {
                localStorage.removeItem(`${ALMACENAMIENTO_LOCAL.prefijos.configuracion}${clave}`);
            } else {
                // Limpiar toda la configuración personalizada
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(ALMACENAMIENTO_LOCAL.prefijos.configuracion)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            
            console.log('Configuración restaurada');
            return true;
        } catch (error) {
            console.error('Error al restaurar configuración:', error);
            return false;
        }
    }
    
    static exportarConfiguracion() {
        try {
            const configPersonalizada = {};
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(ALMACENAMIENTO_LOCAL.prefijos.configuracion)) {
                    const clave = key.replace(ALMACENAMIENTO_LOCAL.prefijos.configuracion, '');
                    configPersonalizada[clave] = JSON.parse(localStorage.getItem(key));
                }
            });
            
            return configPersonalizada;
        } catch (error) {
            console.error('Error al exportar configuración:', error);
            return {};
        }
    }
    
    static importarConfiguracion(configuracion) {
        try {
            Object.entries(configuracion).forEach(([clave, valor]) => {
                this.actualizarConfiguracion(clave, valor);
            });
            
            console.log('Configuración importada exitosamente');
            return true;
        } catch (error) {
            console.error('Error al importar configuración:', error);
            return false;
        }
    }
}

// Exportar configuración por defecto
export default CONFIG_LOTES_AVANZADO;
