/**
 * EntryReportService - Servicio para generación de reportes de entradas
 * 
 * Gestiona la creación de reportes:
 * - Generación de reportes CSV
 * - Generación de reportes PDF
 * - Estadísticas de entradas
 * - Exportación de datos
 * 
 * @class EntryReportService
 * @version 4.0.0
 * @since 2025-10-04
 */

import { generarReporteEntradas } from '../../../js/db-operations.js';

export class EntryReportService {
    constructor() {
        this.reportData = null;
    }

    /**
     * Genera un reporte de entradas
     * @async
     * @param {Object} filtros - Filtros a aplicar
     * @returns {Promise<void>}
     */
    async generateReport(filtros = {}) {
        try {
            await generarReporteEntradas(filtros);
        } catch (error) {
            console.error("Error al generar reporte:", error);
            throw error;
        }
    }

    /**
     * Genera reporte CSV
     * @async
     * @param {Array} entradas - Array de entradas
     * @param {string} filename - Nombre del archivo
     * @returns {Promise<void>}
     */
    async generateCSV(entradas, filename = 'reporte_entradas.csv') {
        try {
            // Encabezados del CSV
            const headers = ['Código', 'Nombre', 'Marca', 'Categoría', 'Unidad', 'Cantidad', 'Fecha Entrada', 'Comentarios'];
            
            // Convertir entradas a filas CSV
            const rows = entradas.map(entrada => [
                entrada.codigo || '',
                entrada.nombre || '',
                entrada.marca || '',
                entrada.categoria || '',
                entrada.unidad || '',
                entrada.cantidad || 0,
                entrada.fecha_entrada ? new Date(entrada.fecha_entrada).toLocaleDateString() : '',
                entrada.comentarios || ''
            ]);

            // Construir CSV
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Descargar archivo
            this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

        } catch (error) {
            console.error("Error al generar CSV:", error);
            throw error;
        }
    }

    /**
     * Genera reporte en formato JSON
     * @async
     * @param {Array} entradas - Array de entradas
     * @param {string} filename - Nombre del archivo
     * @returns {Promise<void>}
     */
    async generateJSON(entradas, filename = 'reporte_entradas.json') {
        try {
            const jsonContent = JSON.stringify(entradas, null, 2);
            this.downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
        } catch (error) {
            console.error("Error al generar JSON:", error);
            throw error;
        }
    }

    /**
     * Calcula estadísticas de entradas
     * @param {Array} entradas - Array de entradas
     * @returns {Object} Objeto con estadísticas
     */
    calculateStatistics(entradas) {
        const stats = {
            totalEntradas: entradas.length,
            totalCantidad: 0,
            porCategoria: {},
            porMarca: {},
            porMes: {},
            promediosPorDia: {}
        };

        entradas.forEach(entrada => {
            // Total cantidad
            stats.totalCantidad += parseFloat(entrada.cantidad) || 0;

            // Por categoría
            const cat = entrada.categoria || 'Sin categoría';
            if (!stats.porCategoria[cat]) {
                stats.porCategoria[cat] = { cantidad: 0, entradas: 0 };
            }
            stats.porCategoria[cat].cantidad += parseFloat(entrada.cantidad) || 0;
            stats.porCategoria[cat].entradas++;

            // Por marca
            const marca = entrada.marca || 'Sin marca';
            if (!stats.porMarca[marca]) {
                stats.porMarca[marca] = { cantidad: 0, entradas: 0 };
            }
            stats.porMarca[marca].cantidad += parseFloat(entrada.cantidad) || 0;
            stats.porMarca[marca].entradas++;

            // Por mes
            if (entrada.fecha_entrada) {
                const fecha = new Date(entrada.fecha_entrada);
                const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                if (!stats.porMes[mes]) {
                    stats.porMes[mes] = { cantidad: 0, entradas: 0 };
                }
                stats.porMes[mes].cantidad += parseFloat(entrada.cantidad) || 0;
                stats.porMes[mes].entradas++;
            }
        });

        return stats;
    }

    /**
     * Genera un resumen de estadísticas
     * @param {Object} stats - Estadísticas
     * @returns {string} Resumen en texto
     */
    generateStatisticsSummary(stats) {
        let summary = `RESUMEN DE ENTRADAS\n`;
        summary += `==================\n\n`;
        summary += `Total de entradas: ${stats.totalEntradas}\n`;
        summary += `Cantidad total ingresada: ${stats.totalCantidad.toFixed(2)}\n\n`;

        summary += `POR CATEGORÍA:\n`;
        summary += `--------------\n`;
        Object.entries(stats.porCategoria).forEach(([cat, data]) => {
            summary += `${cat}: ${data.entradas} entradas, ${data.cantidad.toFixed(2)} unidades\n`;
        });

        summary += `\nPOR MARCA:\n`;
        summary += `----------\n`;
        Object.entries(stats.porMarca).forEach(([marca, data]) => {
            summary += `${marca}: ${data.entradas} entradas, ${data.cantidad.toFixed(2)} unidades\n`;
        });

        summary += `\nPOR MES:\n`;
        summary += `--------\n`;
        Object.entries(stats.porMes).forEach(([mes, data]) => {
            summary += `${mes}: ${data.entradas} entradas, ${data.cantidad.toFixed(2)} unidades\n`;
        });

        return summary;
    }

    /**
     * Genera reporte completo con estadísticas
     * @async
     * @param {Array} entradas - Array de entradas
     * @param {string} formato - Formato: 'csv', 'json', 'txt'
     * @returns {Promise<void>}
     */
    async generateFullReport(entradas, formato = 'csv') {
        try {
            const stats = this.calculateStatistics(entradas);
            const fecha = new Date().toISOString().split('T')[0];

            switch (formato) {
                case 'csv':
                    await this.generateCSV(entradas, `entradas_${fecha}.csv`);
                    break;
                case 'json':
                    const reportData = {
                        fecha_reporte: fecha,
                        estadisticas: stats,
                        entradas: entradas
                    };
                    const jsonContent = JSON.stringify(reportData, null, 2);
                    this.downloadFile(jsonContent, `entradas_completo_${fecha}.json`, 'application/json;charset=utf-8;');
                    break;
                case 'txt':
                    const summary = this.generateStatisticsSummary(stats);
                    this.downloadFile(summary, `resumen_entradas_${fecha}.txt`, 'text/plain;charset=utf-8;');
                    break;
                default:
                    throw new Error('Formato no soportado');
            }

        } catch (error) {
            console.error("Error al generar reporte completo:", error);
            throw error;
        }
    }

    /**
     * Descarga un archivo
     * @private
     * @param {string} content - Contenido del archivo
     * @param {string} filename - Nombre del archivo
     * @param {string} mimeType - Tipo MIME
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /**
     * Genera gráfico de datos (retorna datos para gráficos)
     * @param {Array} entradas - Array de entradas
     * @param {string} tipo - Tipo: 'categoria', 'marca', 'mes'
     * @returns {Object} Datos para gráfico
     */
    generateChartData(entradas, tipo = 'categoria') {
        const stats = this.calculateStatistics(entradas);
        let data;

        switch (tipo) {
            case 'categoria':
                data = stats.porCategoria;
                break;
            case 'marca':
                data = stats.porMarca;
                break;
            case 'mes':
                data = stats.porMes;
                break;
            default:
                data = {};
        }

        return {
            labels: Object.keys(data),
            datasets: [{
                label: 'Entradas',
                data: Object.values(data).map(d => d.entradas),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }, {
                label: 'Cantidad',
                data: Object.values(data).map(d => d.cantidad),
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1
            }]
        };
    }

    /**
     * Exporta datos en múltiples formatos
     * @async
     * @param {Array} entradas - Array de entradas
     * @param {Array} formatos - Array de formatos: ['csv', 'json', 'txt']
     * @returns {Promise<void>}
     */
    async exportMultipleFormats(entradas, formatos = ['csv']) {
        try {
            for (const formato of formatos) {
                await this.generateFullReport(entradas, formato);
                // Pequeña pausa entre descargas
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("Error al exportar en múltiples formatos:", error);
            throw error;
        }
    }
}

// Exportar instancia singleton
export const entryReportService = new EntryReportService();

// Exportación por defecto
export default EntryReportService;
