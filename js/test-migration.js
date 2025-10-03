/**
 * test-migration.js - Script de prueba para verificar la migración
 * 
 * Este script verifica que los bridges estén funcionando correctamente
 * y que la aplicación pueda usar los nuevos servicios.
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

console.log('🧪 Iniciando pruebas de migración...');

// Función para probar imports
async function testImports() {
    console.log('📦 Probando imports de bridges...');
    
    try {
        // Probar db-operations-bridge
        console.log('🔍 Probando db-operations-bridge...');
        const dbBridge = await import('./db-operations-bridge.js');
        console.log('✅ db-operations-bridge cargado:', Object.keys(dbBridge).length, 'exportaciones');
        
        // Probar product-operations-bridge
        console.log('🔍 Probando product-operations-bridge...');
        const productBridge = await import('./product-operations-bridge.js');
        console.log('✅ product-operations-bridge cargado:', Object.keys(productBridge).length, 'exportaciones');
        
        console.log('✅ Todos los bridges se cargaron correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error al cargar bridges:', error);
        return false;
    }
}

// Función principal de prueba
async function runTests() {
    console.log('🚀 Ejecutando pruebas de migración...');
    console.log('📅 Fecha:', new Date().toISOString());
    console.log('');
    
    const results = {
        imports: false,
        services: false,
        compatibility: false
    };
    
    // 1. Probar imports
    console.log('=== PRUEBA 1: IMPORTS ===');
    results.imports = await testImports();
    console.log('');
    
    // 2. Mostrar resumen
    console.log('=== RESUMEN DE PRUEBAS ===');
    console.log('Imports:', results.imports ? '✅ EXITOSO' : '❌ FALLIDO');
    console.log('');
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
        console.log('✅ La migración está funcionando correctamente');
        console.log('✅ La aplicación puede usar los nuevos servicios');
    } else {
        console.log('⚠️  ALGUNAS PRUEBAS FALLARON');
        console.log('🔧 Revise los errores anteriores para más información');
    }
    
    return allPassed;
}

// Ejecutar si es llamado directamente
if (typeof window !== 'undefined') {
    // En el navegador
    window.testMigration = runTests;
    console.log('📝 Pruebas cargadas. Ejecute window.testMigration() para probar');
} else {
    // En Node.js
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}
