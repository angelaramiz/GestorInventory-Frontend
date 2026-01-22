// Test detallado de importaciones de pz-scanner.js

async function testImports() {
    console.log('🔍 Probando importaciones de pz-scanner.js...\n');
    
    const imports = [
        ['./js/scanner/modules/processor.js', 'buscarProductoPorPLU'],
        ['./js/scanner/modules/pz-inventario-temporal.js', 'guardarProductoEscaneado'],
        ['./js/scanner/modules/pz-scanner-ui.js', 'mostrarResultadoEscaneo'],
        ['./js/auth/auth.js', 'getSupabase']
    ];
    
    for (const [file, export_name] of imports) {
        try {
            console.log(`📦 Importando: ${file}`);
            const module = await import(file);
            console.log(`   ✅ OK - Exporta: ${export_name}`);
            if (!module[export_name]) {
                console.warn(`   ⚠️ ADVERTENCIA: No encontré '${export_name}'`);
            }
        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            return;
        }
    }
    
    console.log('\n✅ Todas las importaciones están bien');
    console.log('\n🔍 Ahora probando pz-scanner.js completo...\n');
    
    try {
        const pzScanner = await import('./js/scanner/modules/pz-scanner.js');
        console.log('✅ pz-scanner.js cargado correctamente');
        console.log('Exporta:', Object.keys(pzScanner));
    } catch (error) {
        console.error('❌ ERROR en pz-scanner.js:', error.message);
        console.error('\nStack completo:');
        console.error(error.stack);
    }
}

testImports();
