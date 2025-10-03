/**
 * fix-curly-quotes.js - Reemplazar comillas tipográficas por comillas rectas
 */

import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Limpiando comillas tipográficas en archivos bridge...\n');

const files = [
    './js/scanner-bridge.js',
    './js/configuraciones-bridge.js',
    './js/tabla-productos-bridge.js',
    './js/product-operations-bridge.js'
];

files.forEach(file => {
    try {
        console.log(`📄 Procesando: ${file}`);
        
        let content = readFileSync(file, 'utf8');
        const original = content;
        
        // Reemplazar comillas tipográficas por comillas rectas
        content = content
            .replace(/[""]/g, '"')  // U+201C y U+201D → U+0022
            .replace(/['']/g, "'"); // U+2018 y U+2019 → U+0027
        
        if (content !== original) {
            writeFileSync(file, content, 'utf8');
            
            const originalCount = (original.match(/[""'']/g) || []).length;
            console.log(`  ✅ Corregidas ${originalCount} comillas tipográficas`);
        } else {
            console.log(`  ℹ️  Sin comillas tipográficas`);
        }
        
    } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
    }
});

console.log('\n✅ Limpieza completada');