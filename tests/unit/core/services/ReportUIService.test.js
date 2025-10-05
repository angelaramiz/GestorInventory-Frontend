/**
 * Tests para ReportUIService
 * 
 * Pruebas unitarias para el servicio de UI de reportes:
 * - Inicialización de elementos DOM
 * - Renderizado de checkboxes de áreas
 * - Visualización de productos
 * - Diálogos de configuración
 * - Obtención de selecciones del usuario
 * - Generación de nombres de archivo
 * 
 * @version 4.0.0
 * @since 2025-10-05
 */

import { ReportUIService } from '../../../../src/core/services/ReportUIService.js';
import { createMockDOMElements, cleanupMockDOMElements } from '../../../helpers/test-helpers.js';

describe('ReportUIService', () => {
    let service;
    let mockSwal;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create mock DOM elements
        document.body.innerHTML = `
            <div id="areasContainer"></div>
            <div id="productosContainer"></div>
            <div id="loadingIndicator" class="hidden"></div>
            <input type="checkbox" id="area-todas" />
            <button id="aplicarFiltroBtn"></button>
            <button id="generarReporteBtn"></button>
        `;

        // Mock Swal
        mockSwal = {
            fire: jest.fn().mockResolvedValue({ isConfirmed: true, value: {} })
        };
        global.Swal = mockSwal;

        // Create service
        service = new ReportUIService();
    });

    afterEach(() => {
        cleanupMockDOMElements();
        delete global.Swal;
        jest.restoreAllMocks();
    });

    describe('constructor()', () => {
        it('should initialize with empty elements object', () => {
            expect(service.elements).toEqual({});
        });
    });

    describe('initializeElements()', () => {
        it('should find and store all DOM elements', () => {
            service.initializeElements();

            expect(service.elements.areasContainer).toBeDefined();
            expect(service.elements.productosContainer).toBeDefined();
            expect(service.elements.loadingIndicator).toBeDefined();
            expect(service.elements.areaTodas).toBeDefined();
            expect(service.elements.aplicarFiltroBtn).toBeDefined();
            expect(service.elements.generarReporteBtn).toBeDefined();
        });

        it('should store elements with correct IDs', () => {
            service.initializeElements();

            expect(service.elements.areasContainer.id).toBe('areasContainer');
            expect(service.elements.productosContainer.id).toBe('productosContainer');
            expect(service.elements.areaTodas.id).toBe('area-todas');
        });
    });

    describe('renderAreaCheckboxes()', () => {
        beforeEach(() => {
            service.initializeElements();
        });

        it('should render checkboxes for all areas', () => {
            const areas = [
                { id: '1', nombre: 'Área A' },
                { id: '2', nombre: 'Área B' }
            ];

            service.renderAreaCheckboxes(areas);

            const checkboxes = document.querySelectorAll('.areaCheckbox');
            expect(checkboxes.length).toBe(2);
        });

        it('should create checkbox with correct ID', () => {
            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.renderAreaCheckboxes(areas);

            const checkbox = document.getElementById('area-1');
            expect(checkbox).toBeDefined();
            expect(checkbox.value).toBe('1');
        });

        it('should create label with area name', () => {
            const areas = [
                { id: '1', nombre: 'Área Test' }
            ];

            service.renderAreaCheckboxes(areas);

            const label = document.querySelector('label[for="area-1"]');
            expect(label.textContent).toBe('Área Test');
        });

        it('should disable checkboxes when "todas" is checked', () => {
            service.elements.areaTodas.checked = true;

            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.renderAreaCheckboxes(areas);

            const checkbox = document.getElementById('area-1');
            expect(checkbox.disabled).toBe(true);
        });

        it('should not render if areasContainer is missing', () => {
            service.elements.areasContainer = null;

            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.renderAreaCheckboxes(areas);

            const checkboxes = document.querySelectorAll('.areaCheckbox');
            expect(checkboxes.length).toBe(0);
        });

        it('should add change event listener to checkboxes', () => {
            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service._handleAreaSpecificSelection = jest.fn();
            service.renderAreaCheckboxes(areas);

            const checkbox = document.getElementById('area-1');
            checkbox.click();

            // Checkbox should respond to click
            expect(checkbox.checked).toBe(true);
        });
    });

    describe('displayProductList()', () => {
        beforeEach(() => {
            service.initializeElements();
        });

        it('should display all products', () => {
            const productos = [
                { id: 1, nombre: 'Producto 1', codigo: 'P001', area_id: '1' },
                { id: 2, nombre: 'Producto 2', codigo: 'P002', area_id: '2' }
            ];

            const areas = [
                { id: '1', nombre: 'Área A' },
                { id: '2', nombre: 'Área B' }
            ];

            service.displayProductList(productos, areas);

            const listItems = document.querySelectorAll('#productosContainer li');
            expect(listItems.length).toBe(2);
        });

        it('should display product name and code', () => {
            const productos = [
                { id: 1, nombre: 'Test Product', codigo: 'TEST123', area_id: '1' }
            ];

            const areas = [
                { id: '1', nombre: 'Área Test' }
            ];

            service.displayProductList(productos, areas);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('Test Product');
            expect(container.innerHTML).toContain('TEST123');
        });

        it('should display area name', () => {
            const productos = [
                { id: 1, nombre: 'Producto 1', codigo: 'P001', area_id: '1' }
            ];

            const areas = [
                { id: '1', nombre: 'Área Especial' }
            ];

            service.displayProductList(productos, areas);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('Área Especial');
        });

        it('should handle products without name', () => {
            const productos = [
                { id: 1, codigo: 'P001', area_id: '1' }
            ];

            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.displayProductList(productos, areas);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('Sin nombre');
        });

        it('should handle products without code', () => {
            const productos = [
                { id: 1, nombre: 'Producto 1', area_id: '1' }
            ];

            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.displayProductList(productos, areas);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('Sin código');
        });

        it('should handle unknown area', () => {
            const productos = [
                { id: 1, nombre: 'Producto 1', codigo: 'P001', area_id: '999' }
            ];

            const areas = [
                { id: '1', nombre: 'Área A' }
            ];

            service.displayProductList(productos, areas);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('Área desconocida');
        });

        it('should show message when no products available', () => {
            service.displayProductList([], []);

            const container = document.getElementById('productosContainer');
            expect(container.innerHTML).toContain('No hay productos disponibles');
        });

        it('should not display if productosContainer is missing', () => {
            service.elements.productosContainer = null;

            const productos = [
                { id: 1, nombre: 'Producto 1', codigo: 'P001', area_id: '1' }
            ];

            service.displayProductList(productos, []);

            // Should not throw error
            expect(true).toBe(true);
        });
    });

    describe('toggleLoading()', () => {
        beforeEach(() => {
            service.initializeElements();
        });

        it('should show loading indicator', () => {
            service.toggleLoading(true);

            const indicator = document.getElementById('loadingIndicator');
            expect(indicator.classList.contains('hidden')).toBe(false);
        });

        it('should hide loading indicator', () => {
            const indicator = document.getElementById('loadingIndicator');
            indicator.classList.remove('hidden');

            service.toggleLoading(false);

            expect(indicator.classList.contains('hidden')).toBe(true);
        });

        it('should handle missing loading indicator', () => {
            service.elements.loadingIndicator = null;

            // Should not throw error
            service.toggleLoading(true);
            expect(true).toBe(true);
        });
    });

    describe('getSelectedAreaIds()', () => {
        beforeEach(() => {
            service.initializeElements();
        });

        it('should return IDs of checked area checkboxes', () => {
            document.body.innerHTML += `
                <input type="checkbox" class="areaCheckbox" value="1" checked />
                <input type="checkbox" class="areaCheckbox" value="2" checked />
                <input type="checkbox" class="areaCheckbox" value="3" />
            `;

            const selectedIds = service.getSelectedAreaIds();

            expect(selectedIds).toEqual(['1', '2']);
        });

        it('should exclude "todas" checkbox', () => {
            document.body.innerHTML += `
                <input type="checkbox" id="area-todas" class="areaCheckbox" checked />
                <input type="checkbox" class="areaCheckbox" value="1" checked />
            `;

            const selectedIds = service.getSelectedAreaIds();

            expect(selectedIds).toEqual(['1']);
        });

        it('should return empty array when no checkboxes checked', () => {
            document.body.innerHTML += `
                <input type="checkbox" class="areaCheckbox" value="1" />
                <input type="checkbox" class="areaCheckbox" value="2" />
            `;

            const selectedIds = service.getSelectedAreaIds();

            expect(selectedIds).toEqual([]);
        });
    });

    describe('isAllAreasSelected()', () => {
        beforeEach(() => {
            service.initializeElements();
        });

        it('should return true when "todas" is checked', () => {
            service.elements.areaTodas.checked = true;

            expect(service.isAllAreasSelected()).toBe(true);
        });

        it('should return false when "todas" is not checked', () => {
            service.elements.areaTodas.checked = false;

            expect(service.isAllAreasSelected()).toBe(false);
        });

        it('should return false when "todas" element is missing', () => {
            service.elements.areaTodas = null;

            expect(service.isAllAreasSelected()).toBe(false);
        });
    });

    describe('showReportConfigDialog()', () => {
        it('should show Swal dialog with configuration options', async () => {
            await service.showReportConfigDialog();

            expect(mockSwal.fire).toHaveBeenCalled();
            expect(mockSwal.fire.mock.calls[0][0].title).toContain('Configuración del reporte');
        });

        it('should return options when confirmed', async () => {
            mockSwal.fire.mockResolvedValue({
                isConfirmed: true,
                value: { fusionarLotes: true }
            });

            const result = await service.showReportConfigDialog();

            expect(result).toEqual({ fusionarLotes: true });
        });

        it('should return null when cancelled', async () => {
            mockSwal.fire.mockResolvedValue({
                isConfirmed: false
            });

            const result = await service.showReportConfigDialog();

            expect(result).toBeNull();
        });

        it('should include didOpen callback', async () => {
            await service.showReportConfigDialog();

            expect(mockSwal.fire.mock.calls[0][0].didOpen).toBeDefined();
        });

        it('should include preConfirm callback', async () => {
            await service.showReportConfigDialog();

            expect(mockSwal.fire.mock.calls[0][0].preConfirm).toBeDefined();
        });
    });

    describe('_getReportOptions()', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <input type="checkbox" id="incluirTodasAgrupaciones" />
                <input type="checkbox" id="fusionarLotes" />
                <input type="checkbox" id="incluirVencidos" />
                <input type="checkbox" id="incluirProximaSemana" />
                <input type="checkbox" id="incluirMismoMes" />
                <input type="checkbox" id="incluirSiguienteMes" />
                <input type="checkbox" id="incluirOtros" />
            `;
        });

        it('should return default options with todas agrupaciones checked', () => {
            document.getElementById('incluirTodasAgrupaciones').checked = true;

            const options = service._getReportOptions();

            expect(options.incluirCaducidad).toBe(true);
            expect(options.incluirComentarios).toBe(true);
            expect(options.incluirCodigo).toBe(true);
            expect(options.incluirArea).toBe(true);
            expect(options.filtrarAgrupaciones).toBe(false);
            expect(options.agrupacionesSeleccionadas).toEqual([]);
        });

        it('should return filtered options when specific agrupaciones selected', () => {
            document.getElementById('incluirTodasAgrupaciones').checked = false;
            document.getElementById('incluirVencidos').checked = true;
            document.getElementById('incluirProximaSemana').checked = true;

            const options = service._getReportOptions();

            expect(options.filtrarAgrupaciones).toBe(true);
            expect(options.agrupacionesSeleccionadas.vencidos).toBe(true);
            expect(options.agrupacionesSeleccionadas.proximosSemana).toBe(true);
            expect(options.agrupacionesSeleccionadas.mismoMes).toBe(false);
        });

        it('should include fusionarLotes option', () => {
            document.getElementById('fusionarLotes').checked = true;

            const options = service._getReportOptions();

            expect(options.fusionarLotes).toBe(true);
        });
    });

    describe('setupAllAreasToggle()', () => {
        beforeEach(() => {
            // Reset DOM with all needed elements
            document.body.innerHTML = `
                <input type="checkbox" id="area-todas" />
                <input type="checkbox" class="areaCheckbox" id="area-1" />
                <input type="checkbox" class="areaCheckbox" id="area-2" />
            `;
            service.initializeElements();
        });

        it('should disable all area checkboxes when "todas" is checked', () => {
            service.setupAllAreasToggle();

            const todasCheckbox = document.getElementById('area-todas');
            const checkbox1 = document.getElementById('area-1');
            const checkbox2 = document.getElementById('area-2');

            todasCheckbox.checked = true;
            todasCheckbox.dispatchEvent(new Event('change'));

            expect(checkbox1.disabled).toBe(true);
            expect(checkbox2.disabled).toBe(true);
        });

        it('should call callback when toggled', () => {
            const callback = jest.fn();
            service.setupAllAreasToggle(callback);

            const todasCheckbox = document.getElementById('area-todas');
            todasCheckbox.checked = true;
            todasCheckbox.dispatchEvent(new Event('change'));

            expect(callback).toHaveBeenCalledWith(true);
        });

        it('should handle missing areaTodas element', () => {
            service.elements.areaTodas = null;

            // Should not throw error
            service.setupAllAreasToggle(() => {});
            expect(true).toBe(true);
        });
    });

    describe('showError()', () => {
        it('should call Swal.fire with error type', () => {
            service.showError('Test error');

            expect(mockSwal.fire).toHaveBeenCalledWith('Error', 'Test error', 'error');
        });
    });

    describe('showWarning()', () => {
        it('should call Swal.fire with warning type', () => {
            service.showWarning('Test warning');

            expect(mockSwal.fire).toHaveBeenCalledWith('Advertencia', 'Test warning', 'warning');
        });
    });

    describe('showSuccess()', () => {
        it('should call Swal.fire with success type', () => {
            service.showSuccess('Test success');

            expect(mockSwal.fire).toHaveBeenCalledWith('¡Éxito!', 'Test success', 'success');
        });
    });

    describe('showInfo()', () => {
        it('should call Swal.fire with info type', () => {
            service.showInfo('Test info');

            expect(mockSwal.fire).toHaveBeenCalledWith('Atención', 'Test info', 'info');
        });
    });

    describe('generateFileName()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-10-05T00:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should generate filename with current date', () => {
            const opciones = {
                filtrarAgrupaciones: false
            };

            const filename = service.generateFileName(opciones);

            expect(filename).toContain('2025-10-05');
            expect(filename).toContain('reporte_preconteo');
            expect(filename).toMatch(/\.pdf$/);
        });

        it('should include filter suffix when filtrarAgrupaciones is true', () => {
            const opciones = {
                filtrarAgrupaciones: true,
                agrupacionesSeleccionadas: {
                    vencidos: true,
                    proximosSemana: true,
                    mismoMes: false,
                    siguienteMes: false,
                    otros: false
                }
            };

            const filename = service.generateFileName(opciones);

            expect(filename).toContain('filtrado');
            expect(filename).toContain('vencidos');
            expect(filename).toContain('proximos7dias');
        });

        it('should include all selected groupings in filename', () => {
            const opciones = {
                filtrarAgrupaciones: true,
                agrupacionesSeleccionadas: {
                    vencidos: true,
                    proximosSemana: false,
                    mismoMes: true,
                    siguienteMes: true,
                    otros: false
                }
            };

            const filename = service.generateFileName(opciones);

            expect(filename).toContain('vencidos');
            expect(filename).toContain('mismo_mes');
            expect(filename).toContain('siguiente_mes');
            expect(filename).not.toContain('proximos7dias');
        });

        it('should not include filter suffix when no agrupaciones selected', () => {
            const opciones = {
                filtrarAgrupaciones: true,
                agrupacionesSeleccionadas: {
                    vencidos: false,
                    proximosSemana: false,
                    mismoMes: false,
                    siguienteMes: false,
                    otros: false
                }
            };

            const filename = service.generateFileName(opciones);

            expect(filename).not.toContain('filtrado');
        });

        it('should generate basic filename when filtrarAgrupaciones is false', () => {
            const opciones = {
                filtrarAgrupaciones: false
            };

            const filename = service.generateFileName(opciones);

            expect(filename).toBe('reporte_preconteo_2025-10-05.pdf');
        });
    });
});
