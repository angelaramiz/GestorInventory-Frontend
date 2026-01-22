// Test script para validar cada importación de pz-modo.js

const files = [
    './js/scanner/modules/pz-persistencia.js',
    './js/db/db-operations-pz.js',
    './js/scanner/modules/pz-scanner.js',
    './js/scanner/modules/pz-inventario-temporal.js',
    './js/scanner/modules/pz-scanner-ui.js',
    './js/scanner/modules/pz-reportes.js',
    './js/scanner/modules/pz-validaciones.js'
];

async function testImports() {
    for (const file of files) {
        try {
            console.log(`📦 Probando: ${file}`);
            await import(file);
            console.log(`✅ OK: ${file}`);
        } catch (error) {
            console.error(`❌ ERROR en ${file}:`, error.message);
            console.error('Stack:', error.stack);
            break;
        }
    }
    console.log('\n🔍 Ahora probando pz-modo.js...');
    try {
        await import('./js/scanner/modules/pz-modo.js');
        console.log('✅ pz-modo.js cargado correctamente');
    } catch (error) {
        console.error('❌ ERROR en pz-modo.js:', error.message);
    }
}

testImports();
