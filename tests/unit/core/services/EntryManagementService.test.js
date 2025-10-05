/**
 * @jest-environment jsdom
 */

import { EntryManagementService } from '../../../../src/core/services/EntryManagementService.js';
import {
  createMockDatabaseService,
  createMockProduct,
  createMockEntry,
  createMockEntries,
  flushPromises
} from '../../../helpers/test-helpers.js';

// Mock de db-operations
jest.mock('../../../../js/db-operations.js', () => ({
  agregarRegistroEntrada: jest.fn(),
  cargarEntradasEnTabla: jest.fn(),
  sincronizarEntradasDesdeSupabase: jest.fn(),
  eliminarRegistroEntrada: jest.fn(),
  inicializarDBEntradas: jest.fn().mockResolvedValue(true)
}));

describe('EntryManagementService', () => {
  let service;
  let mockDB;
  let mockDbOperations;

  beforeEach(() => {
    // Crear instancia del servicio
    service = new EntryManagementService();
    
    // Mock de IndexedDB
    mockDB = {
      transaction: jest.fn(),
      objectStore: jest.fn()
    };
    
    // Obtener mocks de db-operations
    mockDbOperations = require('../../../../js/db-operations.js');
    
    // Limpiar todos los mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor()', () => {
    it('should initialize with null selected product', () => {
      expect(service.productoSeleccionado).toBeNull();
    });

    it('should initialize DatabaseService', () => {
      expect(service.databaseService).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('should initialize database successfully', async () => {
      await service.initialize();
      
      expect(mockDbOperations.inicializarDBEntradas).toHaveBeenCalled();
    });

    it('should throw error if database initialization fails', async () => {
      mockDbOperations.inicializarDBEntradas.mockRejectedValueOnce(
        new Error('DB Init Error')
      );

      await expect(service.initialize()).rejects.toThrow('DB Init Error');
    });

    it('should log success message on successful initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EntryManagementService inicializado correctamente')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log error message on failed initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDbOperations.inicializarDBEntradas.mockRejectedValueOnce(
        new Error('DB Init Error')
      );

      try {
        await service.initialize();
      } catch (error) {
        // Expected error
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error al inicializar'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('selectProduct()', () => {
    it('should select a product successfully', () => {
      const mockProduct = createMockProduct();
      
      service.selectProduct(mockProduct);
      
      expect(service.productoSeleccionado).toEqual(mockProduct);
    });

    it('should replace previously selected product', () => {
      const firstProduct = createMockProduct({ id: 1 });
      const secondProduct = createMockProduct({ id: 2 });
      
      service.selectProduct(firstProduct);
      expect(service.productoSeleccionado).toEqual(firstProduct);
      
      service.selectProduct(secondProduct);
      expect(service.productoSeleccionado).toEqual(secondProduct);
    });

    it('should handle null product', () => {
      service.selectProduct(null);
      expect(service.productoSeleccionado).toBeNull();
    });
  });

  describe('clearSelection()', () => {
    it('should clear selected product', () => {
      const mockProduct = createMockProduct();
      service.productoSeleccionado = mockProduct;
      
      service.clearSelection();
      
      expect(service.productoSeleccionado).toBeNull();
    });

    it('should work even when no product is selected', () => {
      service.productoSeleccionado = null;
      
      expect(() => service.clearSelection()).not.toThrow();
      expect(service.productoSeleccionado).toBeNull();
    });
  });

  describe('getSelectedProduct()', () => {
    it('should return selected product', () => {
      const mockProduct = createMockProduct();
      service.productoSeleccionado = mockProduct;
      
      expect(service.getSelectedProduct()).toEqual(mockProduct);
    });

    it('should return null when no product selected', () => {
      service.productoSeleccionado = null;
      
      expect(service.getSelectedProduct()).toBeNull();
    });
  });

  describe('validateEntry()', () => {
    it('should validate correct entry data', () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const validEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };

      const result = service.validateEntry(validEntry);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject entry without selected product', () => {
      service.productoSeleccionado = null;
      
      const invalidEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };

      const result = service.validateEntry(invalidEntry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No hay producto seleccionado');
    });

    it('should reject entry with invalid cantidad', () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const invalidEntry = {
        cantidad: 0,
        fecha_entrada: '2025-01-01'
      };

      const result = service.validateEntry(invalidEntry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cantidad inválida');
    });

    it('should reject entry with negative cantidad', () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const invalidEntry = {
        cantidad: -5,
        fecha_entrada: '2025-01-01'
      };

      const result = service.validateEntry(invalidEntry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cantidad inválida');
    });

    it('should reject entry without fecha_entrada', () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const invalidEntry = {
        cantidad: 10
      };

      const result = service.validateEntry(invalidEntry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fecha de entrada requerida');
    });

    it('should collect multiple validation errors', () => {
      service.productoSeleccionado = null;

      const invalidEntry = {
        cantidad: -5
      };

      const result = service.validateEntry(invalidEntry);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('registerEntry()', () => {
    it('should register valid entry successfully', async () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const validEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01',
        comentarios: 'Test entry'
      };

      const mockRegisteredEntry = { id: 1, ...validEntry };
      mockDbOperations.agregarRegistroEntrada.mockResolvedValueOnce(mockRegisteredEntry);

      const result = await service.registerEntry(validEntry);
      
      expect(mockDbOperations.agregarRegistroEntrada).toHaveBeenCalled();
      expect(result).toEqual(mockRegisteredEntry);
      expect(service.productoSeleccionado).toBeNull(); // Should clear after register
    });

    it('should throw error if no product selected', async () => {
      service.productoSeleccionado = null;
      
      const validEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };

      await expect(service.registerEntry(validEntry)).rejects.toThrow('No hay producto seleccionado');
    });

    it('should validate entry before registering', async () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const invalidEntry = { 
        cantidad: -5,
        fecha_entrada: '2025-01-01'
      };

      await expect(service.registerEntry(invalidEntry)).rejects.toThrow();
    });

    it('should handle registration errors', async () => {
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);

      const validEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };

      mockDbOperations.agregarRegistroEntrada.mockRejectedValueOnce(
        new Error('Registration Error')
      );

      await expect(service.registerEntry(validEntry)).rejects.toThrow('Registration Error');
    });

    it('should include product data in entry', async () => {
      const mockProduct = createMockProduct({
        codigo: 'TEST001',
        nombre: 'Test Product',
        marca: 'Test Brand',
        categoria: 'Test Category'
      });
      service.selectProduct(mockProduct);

      const validEntry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };

      mockDbOperations.agregarRegistroEntrada.mockResolvedValueOnce({ id: 1 });

      await service.registerEntry(validEntry);

      expect(mockDbOperations.agregarRegistroEntrada).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: 'TEST001',
          nombre: 'Test Product',
          marca: 'Test Brand',
          categoria: 'Test Category',
          cantidad: 10,
          fecha_entrada: '2025-01-01'
        })
      );
    });
  });

  describe('loadEntries()', () => {
    it('should load entries successfully', async () => {
      const mockEntries = createMockEntries(5);
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      const result = await service.loadEntries();
      
      expect(mockDbOperations.cargarEntradasEnTabla).toHaveBeenCalled();
      expect(result).toEqual(mockEntries);
    });

    it('should load entries with filters', async () => {
      const filters = {
        fechaInicio: '2025-01-01',
        fechaFin: '2025-12-31'
      };
      const mockEntries = createMockEntries(3);
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      await service.loadEntries(filters);
      
      expect(mockDbOperations.cargarEntradasEnTabla).toHaveBeenCalledWith(filters);
    });

    it('should handle empty results', async () => {
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce([]);

      const result = await service.loadEntries();
      
      expect(result).toEqual([]);
    });

    it('should handle null results', async () => {
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(null);

      const result = await service.loadEntries();
      
      expect(result).toEqual([]);
    });
  });

  describe('deleteEntry()', () => {
    it('should delete entry successfully', async () => {
      mockDbOperations.eliminarRegistroEntrada.mockResolvedValueOnce(true);

      const result = await service.deleteEntry(1);
      
      expect(mockDbOperations.eliminarRegistroEntrada).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockDbOperations.eliminarRegistroEntrada.mockRejectedValueOnce(
        new Error('Delete Error')
      );

      await expect(service.deleteEntry(1)).rejects.toThrow('Delete Error');
    });

    it('should accept null entry ID', async () => {
      mockDbOperations.eliminarRegistroEntrada.mockResolvedValueOnce(true);
      
      const result = await service.deleteEntry(null);
      expect(result).toBe(true);
    });
  });

  describe('syncEntries()', () => {
    it('should sync entries successfully', async () => {
      mockDbOperations.sincronizarEntradasDesdeSupabase.mockResolvedValueOnce();

      await service.syncEntries();
      
      expect(mockDbOperations.sincronizarEntradasDesdeSupabase).toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      mockDbOperations.sincronizarEntradasDesdeSupabase.mockRejectedValueOnce(
        new Error('Sync Error')
      );

      await expect(service.syncEntries()).rejects.toThrow('Sync Error');
    });
  });

  describe('getStatistics()', () => {
    it('should calculate statistics from entries', async () => {
      const mockEntries = [
        { cantidad: 10, categoria: 'Cat1', marca: 'Brand1', fecha_entrada: '2025-10-01' },
        { cantidad: 20, categoria: 'Cat1', marca: 'Brand2', fecha_entrada: '2025-10-02' },
        { cantidad: 30, categoria: 'Cat2', marca: 'Brand1', fecha_entrada: '2025-10-03' }
      ];
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      const stats = await service.getStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('totalCantidad');
      expect(stats).toHaveProperty('porCategoria');
      expect(stats).toHaveProperty('porMarca');
      expect(stats).toHaveProperty('ultimaSemana');
      expect(stats.total).toBe(3);
      expect(stats.totalCantidad).toBe(60);
    });

    it('should handle empty entries for statistics', async () => {
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce([]);

      const stats = await service.getStatistics();
      
      expect(stats.total).toBe(0);
      expect(stats.totalCantidad).toBe(0);
    });

    it('should group entries by category', async () => {
      const mockEntries = [
        { cantidad: 10, categoria: 'Cat1', marca: 'Brand1', fecha_entrada: '2025-10-01' },
        { cantidad: 20, categoria: 'Cat1', marca: 'Brand2', fecha_entrada: '2025-10-02' },
        { cantidad: 30, categoria: 'Cat2', marca: 'Brand1', fecha_entrada: '2025-10-03' }
      ];
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      const stats = await service.getStatistics();
      
      expect(stats.porCategoria['Cat1']).toBe(2);
      expect(stats.porCategoria['Cat2']).toBe(1);
    });

    it('should group entries by brand', async () => {
      const mockEntries = [
        { cantidad: 10, categoria: 'Cat1', marca: 'Brand1', fecha_entrada: '2025-10-01' },
        { cantidad: 20, categoria: 'Cat1', marca: 'Brand2', fecha_entrada: '2025-10-02' },
        { cantidad: 30, categoria: 'Cat2', marca: 'Brand1', fecha_entrada: '2025-10-03' }
      ];
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      const stats = await service.getStatistics();
      
      expect(stats.porMarca['Brand1']).toBe(2);
      expect(stats.porMarca['Brand2']).toBe(1);
    });

    it('should apply filters to statistics', async () => {
      const filters = { fechaInicio: '2025-01-01' };
      const mockEntries = createMockEntries(3);
      mockDbOperations.cargarEntradasEnTabla.mockResolvedValueOnce(mockEntries);

      await service.getStatistics(filters);
      
      expect(mockDbOperations.cargarEntradasEnTabla).toHaveBeenCalledWith(filters);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete entry workflow', async () => {
      // Initialize
      await service.initialize();
      expect(mockDbOperations.inicializarDBEntradas).toHaveBeenCalled();

      // Select product
      const mockProduct = createMockProduct();
      service.selectProduct(mockProduct);
      expect(service.productoSeleccionado).toEqual(mockProduct);

      // Register entry
      const entry = {
        cantidad: 10,
        fecha_entrada: '2025-01-01'
      };
      mockDbOperations.agregarRegistroEntrada.mockResolvedValueOnce({ id: 1 });
      
      await service.registerEntry(entry);
      expect(mockDbOperations.agregarRegistroEntrada).toHaveBeenCalled();

      // Should auto-clear selection after register
      expect(service.productoSeleccionado).toBeNull();
    });
  });
});
