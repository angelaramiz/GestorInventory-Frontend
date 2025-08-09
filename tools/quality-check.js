#!/usr/bin/env node
// tools/quality-check.js
// Script para ejecutar todos los checks de calidad del proyecto

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

class QualityChecker {
    constructor() {
        this.results = {
            lint: null,
            format: null,
            test: null,
            analyze: null,
            overall: 'pending'
        };
    }

    async runAllChecks() {
        console.log(chalk.blue.bold('🔍 Ejecutando checks de calidad...\n'));

        try {
            await this.checkLinting();
            await this.checkFormatting();
            await this.runTests();
            await this.analyzeDependencies();
            
            this.generateReport();
            this.displayResults();
            
        } catch (error) {
            console.error(chalk.red('❌ Error durante los checks:'), error.message);
            process.exit(1);
        }
    }

    async checkLinting() {
        console.log(chalk.yellow('📋 Ejecutando ESLint...'));
        
        try {
            execSync('npm run lint', { stdio: 'pipe' });
            this.results.lint = { status: 'pass', message: 'Sin errores de linting' };
            console.log(chalk.green('✅ Linting: PASS\n'));
        } catch (error) {
            this.results.lint = { 
                status: 'fail', 
                message: 'Errores de linting detectados',
                details: error.stdout?.toString() || error.message
            };
            console.log(chalk.red('❌ Linting: FAIL\n'));
        }
    }

    async checkFormatting() {
        console.log(chalk.yellow('🎨 Verificando formato de código...'));
        
        try {
            execSync('npm run format:check', { stdio: 'pipe' });
            this.results.format = { status: 'pass', message: 'Formato correcto' };
            console.log(chalk.green('✅ Formato: PASS\n'));
        } catch (error) {
            this.results.format = { 
                status: 'fail', 
                message: 'Archivos necesitan formateo',
                details: 'Ejecuta: npm run format'
            };
            console.log(chalk.red('❌ Formato: FAIL\n'));
        }
    }

    async runTests() {
        console.log(chalk.yellow('🧪 Ejecutando tests...'));
        
        try {
            const output = execSync('npm run test:ci', { encoding: 'utf8' });
            const coverage = this.extractCoverage(output);
            
            this.results.test = { 
                status: coverage >= 80 ? 'pass' : 'warn',
                message: `Cobertura: ${coverage}%`,
                coverage
            };
            
            const status = coverage >= 80 ? '✅' : '⚠️';
            console.log(chalk[coverage >= 80 ? 'green' : 'yellow'](`${status} Tests: ${coverage}% cobertura\n`));
        } catch (error) {
            this.results.test = { 
                status: 'fail', 
                message: 'Tests fallaron',
                details: error.message
            };
            console.log(chalk.red('❌ Tests: FAIL\n'));
        }
    }

    async analyzeDependencies() {
        console.log(chalk.yellow('🔍 Analizando dependencias...'));
        
        try {
            execSync('npm run analyze', { stdio: 'pipe' });
            
            // Leer el reporte generado
            const reportPath = 'tools/dependency-report.json';
            if (fs.existsSync(reportPath)) {
                const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
                
                this.results.analyze = {
                    status: this.evaluateAnalysis(report),
                    message: `${report.summary.fileCount} archivos analizados`,
                    metrics: {
                        complexity: report.summary.averageComplexity,
                        unusedExports: report.summary.unusedExportCount,
                        circularDeps: report.summary.circularDependencyCount
                    }
                };
            }
            
            console.log(chalk.green('✅ Análisis: Completado\n'));
        } catch (error) {
            this.results.analyze = { 
                status: 'fail', 
                message: 'Error en análisis de dependencias',
                details: error.message
            };
            console.log(chalk.red('❌ Análisis: FAIL\n'));
        }
    }

    evaluateAnalysis(report) {
        const { averageComplexity, circularDependencyCount } = report.summary;
        
        if (circularDependencyCount > 0) return 'fail';
        if (averageComplexity > 50) return 'warn';
        return 'pass';
    }

    extractCoverage(output) {
        const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*([0-9.]+)/);
        return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.calculateOverallStatus()
        };

        fs.writeFileSync('tools/quality-report.json', JSON.stringify(report, null, 2));
    }

    calculateOverallStatus() {
        const statuses = Object.values(this.results).filter(r => r && r.status);
        const fails = statuses.filter(r => r.status === 'fail').length;
        const warns = statuses.filter(r => r.status === 'warn').length;

        if (fails > 0) return 'fail';
        if (warns > 0) return 'warn';
        return 'pass';
    }

    displayResults() {
        console.log(chalk.blue.bold('\n📊 RESUMEN DE CALIDAD'));
        console.log(chalk.blue('='.repeat(50)));

        // Linting
        const lintIcon = this.getStatusIcon(this.results.lint?.status);
        console.log(`${lintIcon} Linting: ${this.results.lint?.message || 'No ejecutado'}`);

        // Formato
        const formatIcon = this.getStatusIcon(this.results.format?.status);
        console.log(`${formatIcon} Formato: ${this.results.format?.message || 'No ejecutado'}`);

        // Tests
        const testIcon = this.getStatusIcon(this.results.test?.status);
        console.log(`${testIcon} Tests: ${this.results.test?.message || 'No ejecutado'}`);

        // Análisis
        const analyzeIcon = this.getStatusIcon(this.results.analyze?.status);
        console.log(`${analyzeIcon} Análisis: ${this.results.analyze?.message || 'No ejecutado'}`);

        if (this.results.analyze?.metrics) {
            const { complexity, unusedExports, circularDeps } = this.results.analyze.metrics;
            console.log(chalk.gray(`   Complejidad promedio: ${complexity.toFixed(2)}`));
            console.log(chalk.gray(`   Exports no utilizados: ${unusedExports}`));
            console.log(chalk.gray(`   Dependencias circulares: ${circularDeps}`));
        }

        // Estado general
        const overall = this.calculateOverallStatus();
        const overallIcon = this.getStatusIcon(overall);
        const overallColor = overall === 'pass' ? 'green' : overall === 'warn' ? 'yellow' : 'red';
        
        console.log('\n' + chalk.blue('='.repeat(50)));
        console.log(chalk[overallColor].bold(`${overallIcon} Estado General: ${overall.toUpperCase()}`));

        // Recomendaciones
        this.showRecommendations();

        console.log(`\n📄 Reporte completo: tools/quality-report.json`);
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pass': return '✅';
            case 'warn': return '⚠️';
            case 'fail': return '❌';
            default: return '⏳';
        }
    }

    showRecommendations() {
        console.log(chalk.blue('\n💡 RECOMENDACIONES:'));
        
        if (this.results.lint?.status === 'fail') {
            console.log(chalk.red('• Corregir errores de linting: npm run lint:fix'));
        }
        
        if (this.results.format?.status === 'fail') {
            console.log(chalk.red('• Formatear código: npm run format'));
        }
        
        if (this.results.test?.status === 'fail') {
            console.log(chalk.red('• Revisar tests fallidos y corregir'));
        }
        
        if (this.results.test?.coverage < 80) {
            console.log(chalk.yellow('• Incrementar cobertura de tests a >80%'));
        }
        
        if (this.results.analyze?.metrics?.complexity > 20) {
            console.log(chalk.yellow('• Refactorizar funciones complejas'));
        }
        
        if (this.results.analyze?.metrics?.unusedExports > 10) {
            console.log(chalk.yellow('• Limpiar exports no utilizados'));
        }
    }
}

// Solo ejecutar si no hay chalk disponible (fallback)
if (typeof chalk === 'undefined') {
    const chalk = {
        blue: { bold: (text) => text },
        green: (text) => text,
        yellow: (text) => text,
        red: (text) => text,
        gray: (text) => text
    };
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new QualityChecker();
    checker.runAllChecks().catch(console.error);
}

export default QualityChecker;
