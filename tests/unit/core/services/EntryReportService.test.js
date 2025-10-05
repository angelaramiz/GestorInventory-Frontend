/**
 * @jest-environment jsdom
 */

import { EntryReportService } from '../../../../src/core/services/EntryReportService.js';
import {
  createMockEntry,
  createMockEntries
} from '../../../helpers/test-helpers.js';

// Mock de db-operations
jest.mock('../../../../js/db-operations.js', () => ({
  generarReporteEntradas: jest.fn().mockResolvedValue(true)
}));

describe('EntryReportService', () => {
  let service;
  let mockDbOperations;

  beforeEach(() => {
    // Crear instancia del servicio
    service = new EntryReportService();
    
    // Obtener mocks de db-operations
    mockDbOperations = require('../../../../js/db-operations.js');
    
    // Mock URL.createObjectURL y revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Limpiar todos los mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor()', () => {
    it('should initialize with null reportData', () => {
      expect(service.reportData).toBeNull();
    });
  });

  describe('generateReport()', () => {
    it('should generate report with filters', async () => {
      const filters = { fechaInicio: '2025-01-01' };

      await service.generateReport(filters);

      expect(mockDbOperations.generarReporteEntradas).toHaveBeenCalledWith(filters);
    });

    it('should generate report without filters', async () => {
      await service.generateReport();

      expect(mockDbOperations.generarReporteEntradas).toHaveBeenCalledWith({});
    });

    it('should handle errors', async () => {
      mockDbOperations.generarReporteEntradas.mockRejectedValueOnce(
        new Error('Report Error')
      );

      await expect(service.generateReport()).rejects.toThrow('Report Error');
    });
  });

  describe('generateCSV()', () => {
    it('should generate CSV file', async () => {
      const mockEntries = [
        createMockEntry({
          codigo: 'TEST001',
          nombre: 'Product 1',
          cantidad: 10,
          fecha_entrada: '2025-01-01'
        })
      ];

      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateCSV(mockEntries);

      expect(downloadSpy).toHaveBeenCalled();
      const csvContent = downloadSpy.mock.calls[0][0];
      expect(csvContent).toContain('Código,Nombre');
      expect(csvContent).toContain('TEST001');
      expect(csvContent).toContain('Product 1');
    });

    it('should use custom filename', async () => {
      const mockEntries = createMockEntries(1);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateCSV(mockEntries, 'custom.csv');

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.any(String),
        'custom.csv',
        expect.any(String)
      );
    });

    it('should handle empty entries', async () => {
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateCSV([]);

      expect(downloadSpy).toHaveBeenCalled();
      const csvContent = downloadSpy.mock.calls[0][0];
      expect(csvContent).toContain('Código,Nombre'); // Headers only
    });

    it('should handle missing entry fields', async () => {
      const incompleteEntry = { id: 1, codigo: 'TEST001' };
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateCSV([incompleteEntry]);

      expect(downloadSpy).toHaveBeenCalled();
      const csvContent = downloadSpy.mock.calls[0][0];
      expect(csvContent).toContain('TEST001');
    });

    it('should escape CSV values', async () => {
      const entryWithComma = createMockEntry({
        nombre: 'Product, with comma'
      });
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateCSV([entryWithComma]);

      const csvContent = downloadSpy.mock.calls[0][0];
      expect(csvContent).toContain('"Product, with comma"');
    });
  });

  describe('generateJSON()', () => {
    it('should generate JSON file', async () => {
      const mockEntries = createMockEntries(2);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateJSON(mockEntries);

      expect(downloadSpy).toHaveBeenCalled();
      const jsonContent = downloadSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonContent);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should use custom filename', async () => {
      const mockEntries = createMockEntries(1);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateJSON(mockEntries, 'custom.json');

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.any(String),
        'custom.json',
        'application/json;charset=utf-8;'
      );
    });

    it('should format JSON with indentation', async () => {
      const mockEntries = createMockEntries(1);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateJSON(mockEntries);

      const jsonContent = downloadSpy.mock.calls[0][0];
      expect(jsonContent).toContain('\n'); // Has formatting
      expect(jsonContent).toContain('  '); // Has indentation
    });

    it('should handle empty entries', async () => {
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateJSON([]);

      const jsonContent = downloadSpy.mock.calls[0][0];
      expect(JSON.parse(jsonContent)).toEqual([]);
    });
  });

  describe('calculateStatistics()', () => {
    it('should calculate basic statistics', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, categoria: 'Cat1', marca: 'Brand1' }),
        createMockEntry({ cantidad: 20, categoria: 'Cat1', marca: 'Brand2' }),
        createMockEntry({ cantidad: 30, categoria: 'Cat2', marca: 'Brand1' })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.totalEntradas).toBe(3);
      expect(stats.totalCantidad).toBe(60);
    });

    it('should group by category', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, categoria: 'Cat1' }),
        createMockEntry({ cantidad: 20, categoria: 'Cat1' }),
        createMockEntry({ cantidad: 30, categoria: 'Cat2' })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.porCategoria['Cat1'].entradas).toBe(2);
      expect(stats.porCategoria['Cat1'].cantidad).toBe(30);
      expect(stats.porCategoria['Cat2'].entradas).toBe(1);
      expect(stats.porCategoria['Cat2'].cantidad).toBe(30);
    });

    it('should group by brand', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, marca: 'Brand1' }),
        createMockEntry({ cantidad: 20, marca: 'Brand2' }),
        createMockEntry({ cantidad: 30, marca: 'Brand1' })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.porMarca['Brand1'].entradas).toBe(2);
      expect(stats.porMarca['Brand1'].cantidad).toBe(40);
      expect(stats.porMarca['Brand2'].entradas).toBe(1);
    });

    it('should group by month', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, fecha_entrada: '2025-01-15' }),
        createMockEntry({ cantidad: 20, fecha_entrada: '2025-01-20' }),
        createMockEntry({ cantidad: 30, fecha_entrada: '2025-02-10' })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.porMes['2025-01']).toBeDefined();
      expect(stats.porMes['2025-01'].entradas).toBe(2);
      expect(stats.porMes['2025-01'].cantidad).toBe(30);
      expect(stats.porMes['2025-02'].entradas).toBe(1);
    });

    it('should handle entries without category', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, categoria: null })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.porCategoria['Sin categoría']).toBeDefined();
    });

    it('should handle entries without brand', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, marca: null })
      ];

      const stats = service.calculateStatistics(mockEntries);

      expect(stats.porMarca['Sin marca']).toBeDefined();
    });

    it('should handle empty entries', () => {
      const stats = service.calculateStatistics([]);

      expect(stats.totalEntradas).toBe(0);
      expect(stats.totalCantidad).toBe(0);
      expect(Object.keys(stats.porCategoria).length).toBe(0);
    });
  });

  describe('generateStatisticsSummary()', () => {
    it('should generate text summary', () => {
      const stats = {
        totalEntradas: 3,
        totalCantidad: 60,
        porCategoria: {
          'Cat1': { entradas: 2, cantidad: 30 }
        },
        porMarca: {
          'Brand1': { entradas: 2, cantidad: 40 }
        },
        porMes: {
          '2025-01': { entradas: 3, cantidad: 60 }
        }
      };

      const summary = service.generateStatisticsSummary(stats);

      expect(summary).toContain('RESUMEN DE ENTRADAS');
      expect(summary).toContain('Total de entradas: 3');
      expect(summary).toContain('Cantidad total ingresada: 60.00');
      expect(summary).toContain('POR CATEGORÍA');
      expect(summary).toContain('Cat1');
      expect(summary).toContain('POR MARCA');
      expect(summary).toContain('Brand1');
      expect(summary).toContain('POR MES');
      expect(summary).toContain('2025-01');
    });

    it('should format numbers with 2 decimals', () => {
      const stats = {
        totalEntradas: 1,
        totalCantidad: 15.5,
        porCategoria: {
          'Cat1': { entradas: 1, cantidad: 15.5 }
        },
        porMarca: {},
        porMes: {}
      };

      const summary = service.generateStatisticsSummary(stats);

      expect(summary).toContain('15.50');
    });
  });

  describe('generateFullReport()', () => {
    it('should generate CSV report', async () => {
      const mockEntries = createMockEntries(2);
      const csvSpy = jest.spyOn(service, 'generateCSV').mockResolvedValue();

      await service.generateFullReport(mockEntries, 'csv');

      expect(csvSpy).toHaveBeenCalled();
    });

    it('should generate JSON report with statistics', async () => {
      const mockEntries = createMockEntries(2);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateFullReport(mockEntries, 'json');

      expect(downloadSpy).toHaveBeenCalled();
      const jsonContent = downloadSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonContent);
      expect(parsed).toHaveProperty('fecha_reporte');
      expect(parsed).toHaveProperty('estadisticas');
      expect(parsed).toHaveProperty('entradas');
    });

    it('should generate TXT summary', async () => {
      const mockEntries = createMockEntries(2);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();

      await service.generateFullReport(mockEntries, 'txt');

      expect(downloadSpy).toHaveBeenCalled();
      const txtContent = downloadSpy.mock.calls[0][0];
      expect(txtContent).toContain('RESUMEN DE ENTRADAS');
    });

    it('should include date in filename', async () => {
      const mockEntries = createMockEntries(1);
      const downloadSpy = jest.spyOn(service, 'downloadFile').mockImplementation();
      const today = new Date().toISOString().split('T')[0];

      await service.generateFullReport(mockEntries, 'csv');

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(today),
        expect.any(String)
      );
    });

    it('should throw error for unsupported format', async () => {
      const mockEntries = createMockEntries(1);

      await expect(
        service.generateFullReport(mockEntries, 'pdf')
      ).rejects.toThrow('Formato no soportado');
    });
  });

  describe('downloadFile()', () => {
    it('should create download link', () => {
      const content = 'test content';
      const filename = 'test.txt';
      const mimeType = 'text/plain';

      // Mock document.createElement
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);

      service.downloadFile(content, filename, mimeType);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should create blob with correct type', () => {
      const content = 'test';
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);

      service.downloadFile(content, 'test.txt', 'text/plain');

      // Verify URL.createObjectURL was called (it requires a blob)
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('generateChartData()', () => {
    it('should generate chart data by category', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, categoria: 'Cat1' }),
        createMockEntry({ cantidad: 20, categoria: 'Cat2' })
      ];

      const chartData = service.generateChartData(mockEntries, 'categoria');

      expect(chartData.labels).toContain('Cat1');
      expect(chartData.labels).toContain('Cat2');
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[0].label).toBe('Entradas');
      expect(chartData.datasets[1].label).toBe('Cantidad');
    });

    it('should generate chart data by brand', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, marca: 'Brand1' }),
        createMockEntry({ cantidad: 20, marca: 'Brand2' })
      ];

      const chartData = service.generateChartData(mockEntries, 'marca');

      expect(chartData.labels).toContain('Brand1');
      expect(chartData.labels).toContain('Brand2');
    });

    it('should generate chart data by month', () => {
      const mockEntries = [
        createMockEntry({ cantidad: 10, fecha_entrada: '2025-01-15' }),
        createMockEntry({ cantidad: 20, fecha_entrada: '2025-02-15' })
      ];

      const chartData = service.generateChartData(mockEntries, 'mes');

      expect(chartData.labels).toContain('2025-01');
      expect(chartData.labels).toContain('2025-02');
    });

    it('should default to category', () => {
      const mockEntries = createMockEntries(2);

      const chartData = service.generateChartData(mockEntries);

      expect(chartData.datasets[0].label).toBe('Entradas');
    });

    it('should handle invalid type', () => {
      const mockEntries = createMockEntries(1);

      const chartData = service.generateChartData(mockEntries, 'invalid');

      expect(chartData.labels).toEqual([]);
    });

    it('should include colors in datasets', () => {
      const mockEntries = createMockEntries(1);

      const chartData = service.generateChartData(mockEntries);

      expect(chartData.datasets[0]).toHaveProperty('backgroundColor');
      expect(chartData.datasets[0]).toHaveProperty('borderColor');
    });
  });

  describe('exportMultipleFormats()', () => {
    it('should export in multiple formats', async () => {
      const mockEntries = createMockEntries(1);
      const reportSpy = jest.spyOn(service, 'generateFullReport').mockResolvedValue();

      await service.exportMultipleFormats(mockEntries, ['csv', 'json']);

      expect(reportSpy).toHaveBeenCalledTimes(2);
      expect(reportSpy).toHaveBeenCalledWith(mockEntries, 'csv');
      expect(reportSpy).toHaveBeenCalledWith(mockEntries, 'json');
    });

    it('should have delay between exports', async () => {
      const mockEntries = createMockEntries(1);
      jest.spyOn(service, 'generateFullReport').mockResolvedValue();

      const start = Date.now();
      await service.exportMultipleFormats(mockEntries, ['csv', 'json']);
      const duration = Date.now() - start;

      // Should have at least 500ms delay (one between two exports)
      expect(duration).toBeGreaterThanOrEqual(400);
    });

    it('should default to CSV', async () => {
      const mockEntries = createMockEntries(1);
      const reportSpy = jest.spyOn(service, 'generateFullReport').mockResolvedValue();

      await service.exportMultipleFormats(mockEntries);

      expect(reportSpy).toHaveBeenCalledWith(mockEntries, 'csv');
    });

    it('should handle errors', async () => {
      const mockEntries = createMockEntries(1);
      jest.spyOn(service, 'generateFullReport').mockRejectedValue(
        new Error('Export Error')
      );

      await expect(
        service.exportMultipleFormats(mockEntries, ['csv'])
      ).rejects.toThrow('Export Error');
    });
  });
});
