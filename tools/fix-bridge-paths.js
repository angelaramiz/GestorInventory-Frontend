/**
 * fix-bridge-paths.js - Corregir rutas en archivos bridge
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔧 Corrigiendo rutas en archivos bridge...');

const bridges = [
  'db-operations-bridge.js',
  'product-operations-bridge.js',
  'scanner-bridge.js',
  'configuraciones-bridge.js',
  'tabla-productos-bridge.js'
];

bridges.forEach(bridgeFile => {
  const filePath = join('./js', bridgeFile);
  
  if (!existsSync(filePath)) {
    console.log('❌', bridgeFile, 'no encontrado');
    return;
  }
  
  let content = readFileSync(filePath, 'utf8');
  
  // Corregir las rutas de importación - problema común es ../src/ en lugar de ../src/
  const patterns = [
    // Corregir doble navegación hacia arriba
    { from: /\.\.\/\.\.\/src\//g, to: '../src/' },
    // Corregir rutas que empiecen con tres puntos
    { from: /from ['"]\.\.\.\//g, to: 'from "../' },
    { from: /import\(['"]\.\.\.\//g, to: 'import("../' },
    // Asegurar que las rutas de servicios sean correctas
    { from: /from ['"]\.\.\/core\//g, to: 'from "../src/core/' },
    { from: /import\(['"]\.\.\/core\//g, to: 'import("../src/core/' }
  ];
  
  let hasChanges = false;
  patterns.forEach(pattern => {
    const before = content;
    content = content.replace(pattern.from, pattern.to);
    if (before !== content) {
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    writeFileSync(filePath, content, 'utf8');
    console.log('✅', bridgeFile, 'actualizado');
  } else {
    console.log('ℹ️', bridgeFile, 'ya tiene rutas correctas');
  }
});

console.log('🎯 Corrección de rutas completada');
