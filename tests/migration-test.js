/**
 * Test de migración para verificar la compatibilidad entre
 * db-operations.js legacy y la nueva arquitectura de servicios
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { 
    databaseService, 
    fileOperationsService,
    inicializarTodosLosServicios,
    verificarEstadoDB,
    obtenerEstadisticasSincronizacion
} from '../js/db-operations-bridge.js';

/**
 * Ejecutar tests de migración
 */
async function ejecutarTestsMigracion() {
    console.log('🧪 Iniciando tests de migración...');
    
    const resultados = {
        inicializacion: false,
        baseDatos: false,
        archivos: false,
        compatibilidad: false,
        errores: []
    };

    try {
        // Test 1: Inicialización de servicios
        console.log('📋 Test 1: Inicialización de servicios');
        const servicios = await inicializarTodosLosServicios();
        resultados.inicializacion = servicios && 
            servicios.databaseService && 
            servicios.fileOperationsService;
        
        if (resultados.inicializacion) {
            console.log('✅ Servicios inicializados correctamente');
        } else {
            throw new Error('Fallo en inicialización de servicios');
        }

        // Test 2: Funcionalidad de base de datos
        console.log('📋 Test 2: Funcionalidad de base de datos');
        const estadoDB = verificarEstadoDB();
        resultados.baseDatos = estadoDB.servicioInicializado;
        
        if (resultados.baseDatos) {
            console.log('✅ Base de datos funcional');
            console.log('📊 Estado DB:', estadoDB);
        } else {
            throw new Error('Base de datos no inicializada correctamente');
        }

        // Test 3: Estadísticas de sincronización
        console.log('📋 Test 3: Sistema de sincronización');
        const stats = obtenerEstadisticasSincronizacion();
        console.log('📊 Estadísticas de sync:', stats);

        // Test 4: Compatibilidad con funciones legacy
        console.log('📋 Test 4: Compatibilidad con API legacy');
        
        // Verificar que las funciones exportadas existen
        const funcionesRequeridas = [
            'inicializarDB',
            'inicializarDBInventario',
            'agregarAColaSincronizacion',
            'procesarColaSincronizacion',
            'cargarCSV',
            'descargarCSV',
            'descargarInventarioCSV'
        ];

        const moduloMigracion = await import('../js/db-operations-bridge.js');
        
        let funcionesFaltantes = [];
        funcionesRequeridas.forEach(nombreFuncion => {
            if (typeof moduloMigracion[nombreFuncion] !== 'function') {
                funcionesFaltantes.push(nombreFuncion);
            }
        });

        if (funcionesFaltantes.length === 0) {
            resultados.compatibilidad = true;
            console.log('✅ Todas las funciones legacy están disponibles');
        } else {
            throw new Error(`Funciones faltantes: ${funcionesFaltantes.join(', ')}`);
        }

        // Test 5: Funcionalidad de archivos
        console.log('📋 Test 5: Servicio de archivos');
        if (fileOperationsService.status === 'initialized') {
            resultados.archivos = true;
            console.log('✅ Servicio de archivos listo');
        } else {
            throw new Error('Servicio de archivos no inicializado');
        }

    } catch (error) {
        console.error('❌ Error en tests:', error);
        resultados.errores.push(error.message);
    }

    // Generar reporte final
    generarReporteFinal(resultados);
    
    return resultados;
}

/**
 * Generar reporte final de la migración
 */
function generarReporteFinal(resultados) {
    console.log('\n📊 REPORTE FINAL DE MIGRACIÓN');
    console.log('=' .repeat(50));
    
    const tests = [
        { nombre: 'Inicialización', resultado: resultados.inicializacion },
        { nombre: 'Base de Datos', resultado: resultados.baseDatos },
        { nombre: 'Servicio Archivos', resultado: resultados.archivos },
        { nombre: 'Compatibilidad Legacy', resultado: resultados.compatibilidad }
    ];

    tests.forEach(test => {
        const icono = test.resultado ? '✅' : '❌';
        const estado = test.resultado ? 'PASS' : 'FAIL';
        console.log(`${icono} ${test.nombre}: ${estado}`);
    });

    const exito = tests.every(test => test.resultado);
    const porcentajeExito = (tests.filter(test => test.resultado).length / tests.length) * 100;

    console.log('=' .repeat(50));
    console.log(`🎯 Resultado general: ${exito ? 'ÉXITO' : 'FALLO'}`);
    console.log(`📈 Porcentaje de éxito: ${porcentajeExito.toFixed(1)}%`);
    
    if (resultados.errores.length > 0) {
        console.log('\n🚨 Errores encontrados:');
        resultados.errores.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    if (exito) {
        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log('✨ Los archivos legacy pueden ser reemplazados gradualmente');
    } else {
        console.log('\n⚠️  Migración incompleta - Revisar errores antes de proceder');
    }

    return exito;
}

/**
 * Verificar dependencias necesarias
 */
function verificarDependencias() {
    const dependencias = [
        { nombre: 'IndexedDB', disponible: typeof indexedDB !== 'undefined' },
        { nombre: 'localStorage', disponible: typeof localStorage !== 'undefined' },
        { nombre: 'Fetch API', disponible: typeof fetch !== 'undefined' },
        { nombre: 'Promises', disponible: typeof Promise !== 'undefined' },
        { nombre: 'ES6 Modules', disponible: typeof window !== 'undefined' && 'import' in window }
    ];

    console.log('🔍 Verificando dependencias...');
    
    dependencias.forEach(dep => {
        const icono = dep.disponible ? '✅' : '❌';
        console.log(`${icono} ${dep.nombre}: ${dep.disponible ? 'Disponible' : 'No disponible'}`);
    });

    const todasDisponibles = dependencias.every(dep => dep.disponible);
    
    if (!todasDisponibles) {
        console.error('❌ Algunas dependencias no están disponibles');
        return false;
    }

    console.log('✅ Todas las dependencias están disponibles');
    return true;
}

/**
 * Función principal de testing
 */
async function main() {
    try {
        console.log('🚀 INICIANDO VERIFICACIÓN DE MIGRACIÓN');
        console.log('🕒 Fecha:', new Date().toLocaleString());
        console.log('=' .repeat(60));

        // Verificar dependencias primero
        if (!verificarDependencias()) {
            throw new Error('Dependencias faltantes - No se puede continuar');
        }

        // Ejecutar tests de migración
        const resultado = await ejecutarTestsMigracion();
        
        // Mostrar instrucciones finales
        if (resultado.inicializacion && resultado.compatibilidad) {
            console.log('\n📋 PRÓXIMOS PASOS:');
            console.log('1. Reemplazar importaciones de db-operations.js por db-operations-bridge.js');
            console.log('2. Actualizar código para usar la nueva API de servicios');
            console.log('3. Ejecutar tests unitarios para verificar funcionalidad');
            console.log('4. Gradualmente migrar hacia el uso directo de servicios');
        }

        return resultado;

    } catch (error) {
        console.error('💥 Error fatal en verificación:', error);
        return false;
    }
}

// Exportar funciones para uso externo
export { 
    ejecutarTestsMigracion, 
    verificarDependencias, 
    generarReporteFinal 
};

// Auto-ejecutar si se importa directamente
if (typeof window !== 'undefined' && window.location) {
    // Ejecutar automáticamente en el navegador
    main().then(resultado => {
        if (resultado) {
            console.log('🎯 Verificación completada - El sistema está listo para migración');
        } else {
            console.log('⚠️  Verificación falló - Revisar errores antes de continuar');
        }
    });
}

export default main;
