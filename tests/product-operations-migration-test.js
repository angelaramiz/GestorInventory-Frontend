/**
 * Test de migración para product-operations.js
 * 
 * Verifica que todas las funciones del archivo legacy product-operations.js
 * funcionan correctamente a través del nuevo puente de migración.
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { 
    // Funciones de productos
    agregarProducto,
    buscarProducto,
    buscarProductoParaEditar,
    validarCodigoUnico,
    guardarCambios,
    eliminarProducto,
    buscarPorCodigoParcial,
    
    // Funciones de inventario
    guardarInventario,
    modificarInventario,
    buscarProductoInventario,
    seleccionarUbicacionAlmacen,
    verificarYSeleccionarUbicacion,
    iniciarInventario,
    agregarNuevoProductoDesdeInventario,
    
    // Funciones de UI
    mostrarResultados,
    mostrarResultadosInventario,
    mostrarResultadosEdicion,
    mostrarFormularioInventario,
    limpiarFormularioInventario,
    mostrarDetallesProductoConBarcode,
    
    // Funciones de impresión
    generarCodigoBarras,
    imprimirEtiquetaProducto,
    crearPDFEtiquetas,
    configurarImpresion,
    
    // Funciones de utilidad
    generarIdTemporal,
    
    // Servicios para uso avanzado
    productOperationsService,
    productUIService,
    inventoryOperationsService,
    productPrintService,
    
    // Función de inicialización
    inicializarTodosLosServiciosProductos
} from '../js/product-operations-bridge.js';

/**
 * Configuración de tests
 */
const TEST_CONFIG = {
    timeout: 5000,
    verbose: true,
    runBasicTests: true,
    runIntegrationTests: true,
    runUITests: false, // Deshabilitado por defecto (requiere DOM)
    runPrintTests: false // Deshabilitado por defecto (requiere librerías)
};

/**
 * Datos de prueba
 */
const TEST_DATA = {
    producto: {
        codigo: 'TEST001',
        nombre: 'Producto de Prueba',
        marca: 'Marca Test',
        precio: 99.99,
        cantidad: 10,
        categoria: 'Pruebas',
        ubicacion: 'A1-B2',
        proveedor: 'Proveedor Test'
    },
    inventario: {
        codigo: 'TEST001',
        cantidad: 5,
        observaciones: 'Test de inventario',
        ubicacion: 'A1-B2'
    }
};

/**
 * Utilidades de test
 */
class TestUtils {
    static log(message, type = 'info') {
        if (!TEST_CONFIG.verbose) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            info: '🔍',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            test: '🧪'
        }[type] || 'ℹ️';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }
    
    static async measure(fn, description) {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.log(`${description} - Completado en ${duration.toFixed(2)}ms`, 'success');
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.log(`${description} - Error en ${duration.toFixed(2)}ms: ${error.message}`, 'error');
            throw error;
        }
    }
    
    static assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    static async waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
}

/**
 * Tests básicos de servicios
 */
class BasicServiceTests {
    static async testServiceInitialization() {
        TestUtils.log('Iniciando test de inicialización de servicios...', 'test');
        
        return TestUtils.measure(async () => {
            const services = await inicializarTodosLosServiciosProductos();
            
            TestUtils.assert(services.productOperationsService, 'productOperationsService debe estar disponible');
            TestUtils.assert(services.productUIService, 'productUIService debe estar disponible');
            TestUtils.assert(services.inventoryOperationsService, 'inventoryOperationsService debe estar disponible');
            TestUtils.assert(services.productPrintService, 'productPrintService debe estar disponible');
            
            // Verificar estado de inicialización
            TestUtils.assert(
                productOperationsService.status === 'initialized',
                'productOperationsService debe estar inicializado'
            );
            TestUtils.assert(
                productUIService.status === 'initialized',
                'productUIService debe estar inicializado'
            );
            TestUtils.assert(
                inventoryOperationsService.status === 'initialized',
                'inventoryOperationsService debe estar inicializado'
            );
            TestUtils.assert(
                productPrintService.status === 'initialized',
                'productPrintService debe estar inicializado'
            );
            
            return services;
        }, 'Inicialización de servicios');
    }
    
    static async testServiceStats() {
        TestUtils.log('Verificando estadísticas de servicios...', 'test');
        
        return TestUtils.measure(async () => {
            const services = [
                productOperationsService,
                productUIService,
                inventoryOperationsService,
                productPrintService
            ];
            
            for (const service of services) {
                const stats = service.getStats();
                TestUtils.assert(stats.name, `${service.name} debe tener nombre en stats`);
                TestUtils.assert(stats.status, `${service.name} debe tener status en stats`);
                TestUtils.assert(typeof stats.version === 'string', `${service.name} debe tener versión`);
            }
            
            return true;
        }, 'Verificación de estadísticas');
    }
    
    static async testUtilityFunctions() {
        TestUtils.log('Probando funciones de utilidad...', 'test');
        
        return TestUtils.measure(async () => {
            // Test generarIdTemporal
            const id1 = generarIdTemporal('TEST001');
            const id2 = generarIdTemporal('TEST001', 'LOTE001');
            
            TestUtils.assert(typeof id1 === 'string', 'generarIdTemporal debe retornar string');
            TestUtils.assert(id1.includes('TEST001'), 'ID debe incluir el código');
            TestUtils.assert(id2.includes('LOTE001'), 'ID debe incluir el lote cuando se proporciona');
            TestUtils.assert(id1 !== id2, 'IDs deben ser únicos');
            
            return { id1, id2 };
        }, 'Funciones de utilidad');
    }
}

/**
 * Tests de operaciones de productos
 */
class ProductOperationTests {
    static async testProductValidation() {
        TestUtils.log('Probando validación de productos...', 'test');
        
        return TestUtils.measure(async () => {
            // Test validar código único
            const isUnique = await validarCodigoUnico('CODIGO_UNICO_TEST_' + Date.now());
            TestUtils.assert(typeof isUnique === 'boolean', 'validarCodigoUnico debe retornar boolean');
            
            return { isUnique };
        }, 'Validación de productos');
    }
    
    static async testProductSearch() {
        TestUtils.log('Probando búsqueda de productos...', 'test');
        
        return TestUtils.measure(async () => {
            // Test búsqueda básica
            const results1 = await buscarProducto('NONEXISTENT_CODE');
            TestUtils.assert(Array.isArray(results1), 'buscarProducto debe retornar array');
            
            // Test búsqueda parcial
            const results2 = await buscarPorCodigoParcial('TEST', 'productos');
            TestUtils.assert(Array.isArray(results2), 'buscarPorCodigoParcial debe retornar array');
            
            return { basicSearch: results1, partialSearch: results2 };
        }, 'Búsqueda de productos');
    }
}

/**
 * Tests de operaciones de inventario
 */
class InventoryOperationTests {
    static async testInventoryOperations() {
        TestUtils.log('Probando operaciones de inventario...', 'test');
        
        return TestUtils.measure(async () => {
            // Test búsqueda en inventario
            const searchResult = await buscarProductoInventario('NONEXISTENT_CODE');
            TestUtils.assert(
                searchResult === null || typeof searchResult === 'object',
                'buscarProductoInventario debe retornar null u object'
            );
            
            // Test inicialización de sesión de inventario
            const session = iniciarInventario('TEST_LOCATION');
            TestUtils.assert(
                typeof session === 'object',
                'iniciarInventario debe retornar object'
            );
            
            return { searchResult, session };
        }, 'Operaciones de inventario');
    }
}

/**
 * Tests de interfaz de usuario (requiere DOM)
 */
class UITests {
    static async testUIFunctions() {
        if (typeof document === 'undefined') {
            TestUtils.log('Saltando tests de UI - DOM no disponible', 'warning');
            return { skipped: true };
        }
        
        TestUtils.log('Probando funciones de UI...', 'test');
        
        return TestUtils.measure(async () => {
            // Crear elementos de prueba en el DOM
            const testContainer = document.createElement('div');
            testContainer.id = 'test-container';
            testContainer.innerHTML = `
                <div id="resultados-busqueda"></div>
                <div id="resultados-inventario"></div>
                <form id="formulario-inventario"></form>
            `;
            document.body.appendChild(testContainer);
            
            try {
                // Test mostrar resultados
                mostrarResultados([]);
                mostrarResultadosInventario([]);
                mostrarResultadosEdicion([]);
                
                // Test formulario
                limpiarFormularioInventario();
                
                return { success: true };
            } finally {
                // Limpiar DOM
                testContainer.remove();
            }
        }, 'Funciones de UI');
    }
}

/**
 * Tests de impresión (requiere librerías externas)
 */
class PrintTests {
    static async testPrintFunctions() {
        TestUtils.log('Probando funciones de impresión...', 'test');
        
        return TestUtils.measure(async () => {
            // Test configuración de impresión
            const originalConfig = productPrintService.printConfig;
            configurarImpresion({ labelWidth: 250 });
            
            TestUtils.assert(
                productPrintService.printConfig.labelWidth === 250,
                'configurarImpresion debe actualizar la configuración'
            );
            
            // Restaurar configuración original
            configurarImpresion(originalConfig);
            
            // Test validación de servicio
            const validation = productPrintService.validateService();
            TestUtils.assert(
                typeof validation === 'object',
                'validateService debe retornar object'
            );
            TestUtils.assert(
                typeof validation.isValid === 'boolean',
                'validation debe tener propiedad isValid'
            );
            
            return { validation };
        }, 'Funciones de impresión');
    }
}

/**
 * Suite principal de tests
 */
class ProductOperationsMigrationTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
    }
    
    async runTest(testFunction, testName) {
        try {
            TestUtils.log(`\n--- Ejecutando: ${testName} ---`, 'test');
            const result = await testFunction();
            
            if (result && result.skipped) {
                this.results.skipped++;
                TestUtils.log(`${testName} - SALTADO`, 'warning');
            } else {
                this.results.passed++;
                TestUtils.log(`${testName} - PASÓ`, 'success');
            }
            
            return result;
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ test: testName, error: error.message });
            TestUtils.log(`${testName} - FALLÓ: ${error.message}`, 'error');
            return null;
        }
    }
    
    async runAllTests() {
        TestUtils.log('🚀 Iniciando suite de tests de migración product-operations.js', 'info');
        const startTime = performance.now();
        
        try {
            // Tests básicos
            if (TEST_CONFIG.runBasicTests) {
                await this.runTest(
                    BasicServiceTests.testServiceInitialization,
                    'Inicialización de servicios'
                );
                await this.runTest(
                    BasicServiceTests.testServiceStats,
                    'Estadísticas de servicios'
                );
                await this.runTest(
                    BasicServiceTests.testUtilityFunctions,
                    'Funciones de utilidad'
                );
            }
            
            // Tests de productos
            if (TEST_CONFIG.runBasicTests) {
                await this.runTest(
                    ProductOperationTests.testProductValidation,
                    'Validación de productos'
                );
                await this.runTest(
                    ProductOperationTests.testProductSearch,
                    'Búsqueda de productos'
                );
            }
            
            // Tests de inventario
            if (TEST_CONFIG.runBasicTests) {
                await this.runTest(
                    InventoryOperationTests.testInventoryOperations,
                    'Operaciones de inventario'
                );
            }
            
            // Tests de UI (opcional)
            if (TEST_CONFIG.runUITests) {
                await this.runTest(
                    UITests.testUIFunctions,
                    'Funciones de UI'
                );
            }
            
            // Tests de impresión (opcional)
            if (TEST_CONFIG.runPrintTests) {
                await this.runTest(
                    PrintTests.testPrintFunctions,
                    'Funciones de impresión'
                );
            }
            
        } finally {
            const duration = performance.now() - startTime;
            this.printResults(duration);
        }
        
        return this.results;
    }
    
    printResults(duration) {
        const total = this.results.passed + this.results.failed + this.results.skipped;
        
        TestUtils.log('\n📊 RESULTADOS DE TESTS:', 'info');
        TestUtils.log(`⏱️  Duración total: ${duration.toFixed(2)}ms`, 'info');
        TestUtils.log(`✅ Pasaron: ${this.results.passed}/${total}`, 'success');
        TestUtils.log(`❌ Fallaron: ${this.results.failed}/${total}`, this.results.failed > 0 ? 'error' : 'info');
        TestUtils.log(`⚠️  Saltados: ${this.results.skipped}/${total}`, 'warning');
        
        if (this.results.errors.length > 0) {
            TestUtils.log('\n🔍 ERRORES DETALLADOS:', 'error');
            this.results.errors.forEach(({ test, error }, index) => {
                TestUtils.log(`${index + 1}. ${test}: ${error}`, 'error');
            });
        }
        
        const successRate = (this.results.passed / (total - this.results.skipped)) * 100;
        if (successRate === 100) {
            TestUtils.log('\n🎉 ¡TODOS LOS TESTS PASARON!', 'success');
        } else if (successRate >= 80) {
            TestUtils.log(`\n⚠️  Tests pasaron al ${successRate.toFixed(1)}% - Revisar errores`, 'warning');
        } else {
            TestUtils.log(`\n❌ Solo ${successRate.toFixed(1)}% de tests pasaron - Migración requiere atención`, 'error');
        }
    }
}

/**
 * Función principal para ejecutar los tests
 */
export async function runProductOperationsMigrationTests(config = {}) {
    // Configurar tests
    Object.assign(TEST_CONFIG, config);
    
    const testSuite = new ProductOperationsMigrationTestSuite();
    return await testSuite.runAllTests();
}

/**
 * Ejecutar automáticamente si se carga directamente
 */
if (typeof window !== 'undefined' && window.location) {
    window.addEventListener('DOMContentLoaded', async () => {
        // Solo ejecutar si estamos en una página de test
        if (window.location.search.includes('test=product-operations')) {
            try {
                await runProductOperationsMigrationTests({
                    runUITests: true,
                    runPrintTests: true
                });
            } catch (error) {
                console.error('Error al ejecutar tests automáticos:', error);
            }
        }
    });
}

// Exportar utilidades
export { TestUtils, TEST_CONFIG, TEST_DATA };
