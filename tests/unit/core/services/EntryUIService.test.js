/**
 * @jest-environment jsdom
 */

import { EntryUIService } from '../../../../src/core/services/EntryUIService.js';
import {
  createMockProduct,
  createMockEntry,
  createMockEntries,
  createMockDOMElements,
  cleanupMockDOMElements,
  createMockSwal,
  simulateClick,
  simulateInput
} from '../../../helpers/test-helpers.js';

// Mock de SweetAlert2
global.Swal = createMockSwal();

describe('EntryUIService', () => {
  let service;
  let mockElements;

  beforeEach(() => {
    // Crear instancia del servicio
    service = new EntryUIService();
    
    // Crear elementos DOM mock
    mockElements = createMockDOMElements([
      'busquedaCodigo', 'busquedaNombre', 'busquedaMarca',
      'buscarPorCodigo', 'buscarPorNombre', 'buscarPorMarca',
      'codigoProducto', 'nombreProducto', 'marcaProducto',
      'categoriaProducto', 'unidadProducto',
      'cantidadEntrada', 'fechaEntrada', 'comentariosEntrada',
      'registrarEntrada', 'limpiarFormulario',
      'filtroCodigo', 'filtroNombre', 'filtroMarca',
      'filtrarEntradas', 'limpiarFiltros',
      'tablaEntradasBody', 'contadorEntradas',
      'sincronizarEntradas', 'generarReporte'
    ]);
    
    // Limpiar mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMockDOMElements();
    jest.restoreAllMocks();
  });

  describe('constructor()', () => {
    it('should initialize with empty elements object', () => {
      expect(service.elements).toBeDefined();
      expect(typeof service.elements).toBe('object');
    });
  });

  describe('initializeElements()', () => {
    it('should initialize all DOM elements', () => {
      service.initializeElements();
      
      expect(service.elements.busquedaCodigo).toBeDefined();
      expect(service.elements.nombreProducto).toBeDefined();
      expect(service.elements.cantidadEntrada).toBeDefined();
      expect(service.elements.tablaEntradasBody).toBeDefined();
    });

    it('should handle missing elements gracefully', () => {
      // Limpiar DOM
      cleanupMockDOMElements();
      
      expect(() => service.initializeElements()).not.toThrow();
    });

    it('should store element references', () => {
      service.initializeElements();
      
      expect(service.elements.codigoProducto).toBe(mockElements.codigoProducto);
      expect(service.elements.nombreProducto).toBe(mockElements.nombreProducto);
    });
  });

  describe('displayProductData()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should display product data in form fields', () => {
      const mockProduct = createMockProduct({
        codigo: 'TEST001',
        nombre: 'Test Product',
        marca: 'Test Brand',
        categoria: 'Test Category',
        unidad: 'Unidad'
      });

      service.displayProductData(mockProduct);

      expect(service.elements.codigoProducto.value).toBe('TEST001');
      expect(service.elements.nombreProducto.value).toBe('Test Product');
      expect(service.elements.marcaProducto.value).toBe('Test Brand');
      expect(service.elements.categoriaProducto.value).toBe('Test Category');
      expect(service.elements.unidadProducto.value).toBe('Unidad');
    });

    it('should handle null product by clearing form', () => {
      service.displayProductData(null);

      expect(service.elements.codigoProducto.value).toBe('');
      expect(service.elements.nombreProducto.value).toBe('');
    });

    it('should handle product with missing fields', () => {
      const incompleteProduct = { codigo: 'TEST001' };

      service.displayProductData(incompleteProduct);

      expect(service.elements.codigoProducto.value).toBe('TEST001');
      expect(service.elements.nombreProducto.value).toBe('');
      expect(service.elements.marcaProducto.value).toBe('');
    });

    it('should set current date after displaying product', () => {
      const mockProduct = createMockProduct();
      const today = new Date().toISOString().split('T')[0];

      service.displayProductData(mockProduct);

      expect(service.elements.fechaEntrada.value).toBe(today);
    });

    it('should focus on quantity field', () => {
      const mockProduct = createMockProduct();
      const focusSpy = jest.spyOn(service.elements.cantidadEntrada, 'focus');

      service.displayProductData(mockProduct);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should clear entry fields', () => {
      service.elements.cantidadEntrada.value = '10';
      service.elements.comentariosEntrada.value = 'Test';

      const mockProduct = createMockProduct();
      service.displayProductData(mockProduct);

      expect(service.elements.cantidadEntrada.value).toBe('');
      expect(service.elements.comentariosEntrada.value).toBe('');
    });
  });

  describe('clearForm()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should clear all form fields', () => {
      // Establecer valores
      service.elements.codigoProducto.value = 'TEST001';
      service.elements.nombreProducto.value = 'Test';
      service.elements.cantidadEntrada.value = '10';

      service.clearForm();

      expect(service.elements.codigoProducto.value).toBe('');
      expect(service.elements.nombreProducto.value).toBe('');
      expect(service.elements.cantidadEntrada.value).toBe('');
    });

    it('should set current date after clearing', () => {
      const today = new Date().toISOString().split('T')[0];
      
      service.clearForm();

      expect(service.elements.fechaEntrada.value).toBe(today);
    });

    it('should handle missing elements gracefully', () => {
      service.elements = {}; // Simular elementos faltantes
      
      expect(() => service.clearForm()).not.toThrow();
    });
  });

  describe('clearEntryFields()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should clear only entry fields', () => {
      service.elements.codigoProducto.value = 'TEST001';
      service.elements.cantidadEntrada.value = '10';
      service.elements.fechaEntrada.value = '2025-01-01';
      service.elements.comentariosEntrada.value = 'Test';

      service.clearEntryFields();

      expect(service.elements.codigoProducto.value).toBe('TEST001'); // No limpiado
      expect(service.elements.cantidadEntrada.value).toBe('');
      expect(service.elements.fechaEntrada.value).toBe('');
      expect(service.elements.comentariosEntrada.value).toBe('');
    });
  });

  describe('setCurrentDate()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should set current date in fecha_entrada field', () => {
      const today = new Date().toISOString().split('T')[0];
      
      service.setCurrentDate();

      expect(service.elements.fechaEntrada.value).toBe(today);
    });

    it('should handle missing fecha_entrada element', () => {
      service.elements.fechaEntrada = null;
      
      expect(() => service.setCurrentDate()).not.toThrow();
    });
  });

  describe('getEntryData()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should get entry data from form', () => {
      service.elements.cantidadEntrada.value = '10';
      service.elements.fechaEntrada.value = '2025-01-01';
      service.elements.comentariosEntrada.value = 'Test comment';

      const data = service.getEntryData();

      expect(data.cantidad).toBe('10');
      expect(data.fecha_entrada).toBe('2025-01-01');
      expect(data.comentarios).toBe('Test comment');
    });

    it('should trim whitespace from values', () => {
      service.elements.cantidadEntrada.value = '  10  ';
      service.elements.comentariosEntrada.value = '  Test  ';

      const data = service.getEntryData();

      expect(data.cantidad).toBe('10');
      expect(data.comentarios).toBe('Test');
    });

    it('should handle empty fields', () => {
      const data = service.getEntryData();

      expect(data.cantidad).toBe('');
      expect(data.fecha_entrada).toBe('');
      expect(data.comentarios).toBe('');
    });

    it('should handle missing elements', () => {
      service.elements = {};
      
      const data = service.getEntryData();

      expect(data).toBeDefined();
      expect(data.cantidad).toBe('');
    });
  });

  describe('getSearchTerm()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should get search term by codigo', () => {
      service.elements.busquedaCodigo.value = 'TEST001';

      const term = service.getSearchTerm('codigo');

      expect(term).toBe('TEST001');
    });

    it('should get search term by nombre', () => {
      service.elements.busquedaNombre.value = 'Test Product';

      const term = service.getSearchTerm('nombre');

      expect(term).toBe('Test Product');
    });

    it('should get search term by marca', () => {
      service.elements.busquedaMarca.value = 'Test Brand';

      const term = service.getSearchTerm('marca');

      expect(term).toBe('Test Brand');
    });

    it('should trim whitespace', () => {
      service.elements.busquedaCodigo.value = '  TEST001  ';

      const term = service.getSearchTerm('codigo');

      expect(term).toBe('TEST001');
    });

    it('should return empty string for invalid type', () => {
      const term = service.getSearchTerm('invalid');

      expect(term).toBe('');
    });
  });

  describe('getFilters()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should get all filters', () => {
      service.elements.filtroCodigo.value = 'TEST';
      service.elements.filtroNombre.value = 'Product';
      service.elements.filtroMarca.value = 'Brand';

      const filters = service.getFilters();

      expect(filters.codigo).toBe('TEST');
      expect(filters.nombre).toBe('Product');
      expect(filters.marca).toBe('Brand');
    });

    it('should trim whitespace from filters', () => {
      service.elements.filtroCodigo.value = '  TEST  ';

      const filters = service.getFilters();

      expect(filters.codigo).toBe('TEST');
    });

    it('should handle empty filters', () => {
      const filters = service.getFilters();

      expect(filters.codigo).toBe('');
      expect(filters.nombre).toBe('');
      expect(filters.marca).toBe('');
    });
  });

  describe('clearFilters()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should clear all filter fields', () => {
      service.elements.filtroCodigo.value = 'TEST';
      service.elements.filtroNombre.value = 'Product';
      service.elements.filtroMarca.value = 'Brand';

      service.clearFilters();

      expect(service.elements.filtroCodigo.value).toBe('');
      expect(service.elements.filtroNombre.value).toBe('');
      expect(service.elements.filtroMarca.value).toBe('');
    });
  });

  describe('renderEntriesTable()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should render entries in table', () => {
      const mockEntries = createMockEntries(3);

      service.renderEntriesTable(mockEntries);

      const tbody = service.elements.tablaEntradasBody;
      expect(tbody.children.length).toBe(3);
    });

    it('should render empty state when no entries', () => {
      service.renderEntriesTable([]);

      const tbody = service.elements.tablaEntradasBody;
      expect(tbody.innerHTML).toContain('No hay entradas registradas');
    });

    it('should alternate row colors', () => {
      const mockEntries = createMockEntries(3);

      service.renderEntriesTable(mockEntries);

      const rows = service.elements.tablaEntradasBody.children;
      expect(rows[0].className).toContain('bg-white');
      expect(rows[1].className).toContain('bg-gray-50');
      expect(rows[2].className).toContain('bg-white');
    });

    it('should include delete button', () => {
      const mockEntries = createMockEntries(1);

      service.renderEntriesTable(mockEntries);

      const tbody = service.elements.tablaEntradasBody;
      expect(tbody.innerHTML).toContain('Eliminar');
      expect(tbody.innerHTML).toContain('window.eliminarEntrada');
    });

    it('should format date correctly', () => {
      const mockEntries = [{
        id: 1,
        codigo: 'TEST001',
        fecha_entrada: '2025-01-15'
      }];

      service.renderEntriesTable(mockEntries);

      const tbody = service.elements.tablaEntradasBody;
      // Check that date is formatted (could be 14 or 15 depending on timezone)
      expect(tbody.innerHTML).toMatch(/1[45]\/1\/2025/);
    });

    it('should handle missing fields with N/A', () => {
      const incompleteEntry = { id: 1 };

      service.renderEntriesTable([incompleteEntry]);

      const tbody = service.elements.tablaEntradasBody;
      expect(tbody.innerHTML).toContain('N/A');
    });

    it('should update counter after rendering', () => {
      const mockEntries = createMockEntries(5);

      service.renderEntriesTable(mockEntries);

      expect(service.elements.contadorEntradas.textContent).toContain('5');
    });

    it('should handle missing tbody element', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.elements.tablaEntradasBody = null;

      service.renderEntriesTable([]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No se encontró el elemento')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateCounter()', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should update counter with correct count', () => {
      service.updateCounter(10);

      expect(service.elements.contadorEntradas.textContent).toBe('Total: 10 entradas');
    });

    it('should handle zero count', () => {
      service.updateCounter(0);

      expect(service.elements.contadorEntradas.textContent).toBe('Total: 0 entradas');
    });

    it('should handle missing counter element', () => {
      service.elements.contadorEntradas = null;
      
      expect(() => service.updateCounter(5)).not.toThrow();
    });
  });

  describe('showSuccess()', () => {
    it('should show success message with Swal', () => {
      service.showSuccess('Test success');

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Test success'
        })
      );
    });

    it('should handle missing Swal', () => {
      const originalSwal = window.Swal;
      window.Swal = undefined;

      expect(() => service.showSuccess('Test')).not.toThrow();

      window.Swal = originalSwal;
    });
  });

  describe('showError()', () => {
    it('should show error message with Swal', () => {
      service.showError('Test error');

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error',
          text: 'Test error'
        })
      );
    });
  });

  describe('showWarning()', () => {
    it('should show warning message with Swal', () => {
      service.showWarning('Test warning');

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Atención',
          text: 'Test warning'
        })
      );
    });
  });

  describe('showInfo()', () => {
    it('should show info message with Swal', () => {
      service.showInfo('Test info');

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Información',
          text: 'Test info'
        })
      );
    });
  });

  describe('confirmDelete()', () => {
    it('should show confirmation dialog', async () => {
      window.Swal.fire.mockResolvedValueOnce({ isConfirmed: true });

      const result = await service.confirmDelete();

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          showCancelButton: true
        })
      );
      expect(result).toBe(true);
    });

    it('should return false when cancelled', async () => {
      window.Swal.fire.mockResolvedValueOnce({ isConfirmed: false });

      const result = await service.confirmDelete();

      expect(result).toBe(false);
    });

    it('should use custom message', async () => {
      window.Swal.fire.mockResolvedValueOnce({ isConfirmed: true });

      await service.confirmDelete('Custom message');

      expect(window.Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom message'
        })
      );
    });

    it('should fallback to window.confirm when Swal not available', async () => {
      const originalSwal = window.Swal;
      window.Swal = undefined;
      window.confirm = jest.fn().mockReturnValue(true);

      const result = await service.confirmDelete('Test');

      expect(window.confirm).toHaveBeenCalledWith('Test');
      expect(result).toBe(true);

      window.Swal = originalSwal;
    });
  });

  describe('showBubbleAlert()', () => {
    it('should show toast notification', () => {
      const mockToast = {
        fire: jest.fn()
      };
      window.Swal.mixin = jest.fn().mockReturnValue(mockToast);

      service.showBubbleAlert('Test message', 'success');

      expect(window.Swal.mixin).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          position: 'top-end'
        })
      );
      expect(mockToast.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Test message'
        })
      );
    });

    it('should default to info type', () => {
      const mockToast = {
        fire: jest.fn()
      };
      window.Swal.mixin = jest.fn().mockReturnValue(mockToast);

      service.showBubbleAlert('Test');

      expect(mockToast.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info'
        })
      );
    });

    it('should handle missing Swal.mixin', () => {
      const originalMixin = window.Swal.mixin;
      window.Swal.mixin = undefined;

      expect(() => service.showBubbleAlert('Test')).not.toThrow();

      window.Swal.mixin = originalMixin;
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      service.initializeElements();
    });

    it('should handle complete form workflow', () => {
      // Display product
      const mockProduct = createMockProduct();
      service.displayProductData(mockProduct);

      expect(service.elements.codigoProducto.value).toBe(mockProduct.codigo);

      // Get entry data
      service.elements.cantidadEntrada.value = '10';
      const data = service.getEntryData();

      expect(data.cantidad).toBe('10');

      // Clear form
      service.clearForm();

      expect(service.elements.cantidadEntrada.value).toBe('');
    });

    it('should handle table rendering workflow', () => {
      const mockEntries = createMockEntries(5);

      service.renderEntriesTable(mockEntries);

      expect(service.elements.tablaEntradasBody.children.length).toBe(5);
      expect(service.elements.contadorEntradas.textContent).toContain('5');
    });
  });
});
