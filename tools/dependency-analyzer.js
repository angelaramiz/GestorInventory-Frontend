// dependency-analyzer.js
// Herramienta para analizar dependencias entre módulos del proyecto GestorInventory-Frontend

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DependencyAnalyzer {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.jsDir = path.join(projectPath, 'js');
        this.dependencies = {};
        this.exportMap = {};
        this.unusedExports = new Set();
        this.circularDependencies = [];
    }

    // Analizar todos los archivos JS del proyecto
    async analyze() {
        console.log('🔍 Iniciando análisis de dependencias...\n');
        
        const files = this.getJavaScriptFiles();
        
        // Fase 1: Extraer imports y exports
        files.forEach(file => {
            this.analyzeFile(file);
        });

        // Fase 2: Detectar dependencias circulares
        this.detectCircularDependencies();

        // Fase 3: Detectar exports no utilizados
        this.detectUnusedExports();

        // Generar reporte
        this.generateReport();
    }

    // Obtener todos los archivos JavaScript
    getJavaScriptFiles() {
        try {
            return fs.readdirSync(this.jsDir)
                .filter(file => file.endsWith('.js'))
                .map(file => path.join(this.jsDir, file));
        } catch (error) {
            console.error('❌ Error al leer directorio JS:', error);
            return [];
        }
    }

    // Analizar un archivo específico
    analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            
            this.dependencies[fileName] = {
                imports: this.extractImports(content),
                exports: this.extractExports(content),
                size: content.length,
                lines: content.split('\n').length,
                complexity: this.calculateComplexity(content)
            };

            // Mapear exports para análisis posterior
            this.exportMap[fileName] = this.dependencies[fileName].exports;

        } catch (error) {
            console.error(`❌ Error al analizar ${filePath}:`, error);
        }
    }

    // Extraer declaraciones import
    extractImports(content) {
        const imports = [];
        
        // Imports ES6
        const importRegex = /import\s*(?:{([^}]+)}\s*from\s*)?['"](\.\/[^'"]+)['"];?/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            const modulePath = match[2].replace('./', '') + '.js';
            const importedItems = match[1] ? 
                match[1].split(',').map(item => item.trim()) : 
                ['default'];
            
            imports.push({
                module: modulePath,
                items: importedItems,
                type: 'es6'
            });
        }

        // Dynamic imports
        const dynamicImportRegex = /import\(['"`](\.\/[^'"`]+)['"`]\)/g;
        while ((match = dynamicImportRegex.exec(content)) !== null) {
            const modulePath = match[1].replace('./', '') + '.js';
            imports.push({
                module: modulePath,
                items: ['dynamic'],
                type: 'dynamic'
            });
        }

        return imports;
    }

    // Extraer declaraciones export
    extractExports(content) {
        const exports = [];

        // Export functions
        const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
        let match;
        while ((match = exportFunctionRegex.exec(content)) !== null) {
            exports.push({ name: match[1], type: 'function' });
        }

        // Export variables/constants
        const exportVarRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
        while ((match = exportVarRegex.exec(content)) !== null) {
            exports.push({ name: match[1], type: 'variable' });
        }

        // Export classes
        const exportClassRegex = /export\s+class\s+(\w+)/g;
        while ((match = exportClassRegex.exec(content)) !== null) {
            exports.push({ name: match[1], type: 'class' });
        }

        // Named exports in braces
        const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
        while ((match = namedExportRegex.exec(content)) !== null) {
            const names = match[1].split(',').map(name => name.trim());
            names.forEach(name => {
                exports.push({ name, type: 'named' });
            });
        }

        // Default exports
        const defaultExportRegex = /export\s+default\s+(\w+)/g;
        while ((match = defaultExportRegex.exec(content)) !== null) {
            exports.push({ name: match[1], type: 'default' });
        }

        return exports;
    }

    // Calcular complejidad ciclomática básica
    calculateComplexity(content) {
        const patterns = [
            /\bif\s*\(/g,
            /\belse\s+if\s*\(/g,
            /\bwhile\s*\(/g,
            /\bfor\s*\(/g,
            /\bdo\s*{/g,
            /\bswitch\s*\(/g,
            /\bcase\s+/g,
            /\bcatch\s*\(/g,
            /\btry\s*{/g,
            /&&|\|\|/g,
            /\?[^:]*:/g
        ];

        let complexity = 1; // Base complexity
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        });

        return complexity;
    }

    // Detectar dependencias circulares
    detectCircularDependencies() {
        const visited = new Set();
        const recStack = new Set();
        const path = [];

        for (const file in this.dependencies) {
            if (!visited.has(file)) {
                this.dfsCircular(file, visited, recStack, path);
            }
        }
    }

    dfsCircular(file, visited, recStack, path) {
        visited.add(file);
        recStack.add(file);
        path.push(file);

        const deps = this.dependencies[file]?.imports || [];
        
        for (const dep of deps) {
            const depFile = dep.module;
            
            if (this.dependencies[depFile]) {
                if (!visited.has(depFile)) {
                    this.dfsCircular(depFile, visited, recStack, path);
                } else if (recStack.has(depFile)) {
                    const cycleStart = path.indexOf(depFile);
                    const cycle = path.slice(cycleStart).concat(depFile);
                    this.circularDependencies.push(cycle);
                }
            }
        }

        recStack.delete(file);
        path.pop();
    }

    // Detectar exports no utilizados
    detectUnusedExports() {
        const usedExports = new Set();

        // Recopilar todos los imports
        for (const file in this.dependencies) {
            const imports = this.dependencies[file].imports || [];
            imports.forEach(imp => {
                imp.items.forEach(item => {
                    if (item !== 'default' && item !== 'dynamic') {
                        usedExports.add(item);
                    }
                });
            });
        }

        // Identificar exports no utilizados
        for (const file in this.exportMap) {
            const exports = this.exportMap[file] || [];
            exports.forEach(exp => {
                if (!usedExports.has(exp.name)) {
                    this.unusedExports.add(`${file}: ${exp.name} (${exp.type})`);
                }
            });
        }
    }

    // Generar reporte completo
    generateReport() {
        const report = {
            summary: this.generateSummary(),
            dependencyGraph: this.dependencies,
            circularDependencies: this.circularDependencies,
            unusedExports: Array.from(this.unusedExports),
            largestFiles: this.getLargestFiles(),
            mostComplexFiles: this.getMostComplexFiles(),
            recommendations: this.generateRecommendations()
        };

        // Guardar reporte en archivo
        const reportPath = path.join(this.projectPath, 'tools', 'dependency-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Mostrar resumen en consola
        this.displaySummary(report);

        return report;
    }

    generateSummary() {
        const fileCount = Object.keys(this.dependencies).length;
        const totalLines = Object.values(this.dependencies)
            .reduce((sum, dep) => sum + dep.lines, 0);
        const totalSize = Object.values(this.dependencies)
            .reduce((sum, dep) => sum + dep.size, 0);
        const avgComplexity = Object.values(this.dependencies)
            .reduce((sum, dep) => sum + dep.complexity, 0) / fileCount;

        return {
            fileCount,
            totalLines,
            totalSize: Math.round(totalSize / 1024) + ' KB',
            averageComplexity: Math.round(avgComplexity * 100) / 100,
            circularDependencyCount: this.circularDependencies.length,
            unusedExportCount: this.unusedExports.size
        };
    }

    getLargestFiles() {
        return Object.entries(this.dependencies)
            .sort((a, b) => b[1].lines - a[1].lines)
            .slice(0, 5)
            .map(([file, data]) => ({
                file,
                lines: data.lines,
                size: Math.round(data.size / 1024) + ' KB'
            }));
    }

    getMostComplexFiles() {
        return Object.entries(this.dependencies)
            .sort((a, b) => b[1].complexity - a[1].complexity)
            .slice(0, 5)
            .map(([file, data]) => ({
                file,
                complexity: data.complexity
            }));
    }

    generateRecommendations() {
        const recommendations = [];

        // Recomendaciones basadas en tamaño
        const largeFiles = Object.entries(this.dependencies)
            .filter(([, data]) => data.lines > 500);
        
        if (largeFiles.length > 0) {
            recommendations.push({
                type: 'refactoring',
                priority: 'high',
                description: `Archivos muy grandes detectados: ${largeFiles.map(([file]) => file).join(', ')}. Considerar dividir en módulos más pequeños.`
            });
        }

        // Recomendaciones basadas en complejidad
        const complexFiles = Object.entries(this.dependencies)
            .filter(([, data]) => data.complexity > 20);
        
        if (complexFiles.length > 0) {
            recommendations.push({
                type: 'complexity',
                priority: 'medium',
                description: `Archivos con alta complejidad: ${complexFiles.map(([file]) => file).join(', ')}. Considerar refactorizar funciones complejas.`
            });
        }

        // Recomendaciones para dependencias circulares
        if (this.circularDependencies.length > 0) {
            recommendations.push({
                type: 'architecture',
                priority: 'high',
                description: `Dependencias circulares detectadas. Estas deben resolverse para mejorar la mantenibilidad.`
            });
        }

        // Recomendaciones para exports no utilizados
        if (this.unusedExports.size > 0) {
            recommendations.push({
                type: 'cleanup',
                priority: 'low',
                description: `${this.unusedExports.size} exports no utilizados detectados. Considerar eliminarlos para simplificar el código.`
            });
        }

        return recommendations;
    }

    displaySummary(report) {
        console.log('\n📊 RESUMEN DEL ANÁLISIS DE DEPENDENCIAS');
        console.log('=====================================');
        console.log(`📁 Archivos analizados: ${report.summary.fileCount}`);
        console.log(`📏 Total de líneas: ${report.summary.totalLines.toLocaleString()}`);
        console.log(`💾 Tamaño total: ${report.summary.totalSize}`);
        console.log(`🔧 Complejidad promedio: ${report.summary.averageComplexity}`);
        console.log(`🔄 Dependencias circulares: ${report.summary.circularDependencyCount}`);
        console.log(`📤 Exports no utilizados: ${report.summary.unusedExportCount}`);

        if (report.circularDependencies.length > 0) {
            console.log('\n🚨 DEPENDENCIAS CIRCULARES DETECTADAS:');
            report.circularDependencies.forEach((cycle, i) => {
                console.log(`${i + 1}. ${cycle.join(' → ')}`);
            });
        }

        console.log('\n📈 ARCHIVOS MÁS GRANDES:');
        report.largestFiles.forEach((file, i) => {
            console.log(`${i + 1}. ${file.file} (${file.lines} líneas, ${file.size})`);
        });

        console.log('\n🧮 ARCHIVOS MÁS COMPLEJOS:');
        report.mostComplexFiles.forEach((file, i) => {
            console.log(`${i + 1}. ${file.file} (complejidad: ${file.complexity})`);
        });

        console.log('\n💡 RECOMENDACIONES:');
        report.recommendations.forEach((rec, i) => {
            const priority = rec.priority === 'high' ? '🔴' : 
                           rec.priority === 'medium' ? '🟡' : '🟢';
            console.log(`${priority} ${i + 1}. [${rec.type.toUpperCase()}] ${rec.description}`);
        });

        console.log(`\n✅ Reporte completo guardado en: tools/dependency-report.json`);
    }
}

// Ejecutar análisis si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                    import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
    const projectPath = process.argv[2] || path.dirname(__dirname);
    const analyzer = new DependencyAnalyzer(projectPath);
    analyzer.analyze().catch(console.error);
}

export default DependencyAnalyzer;
