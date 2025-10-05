/**
 * Tests para PDFGenerationService
 * 
 * Pruebas unitarias para el servicio de generación de PDFs:
 * - Generación de códigos de barras con JsBarcode
 * - Generación de documentos PDF con jsPDF
 * - Categorización de productos por color
 * - Layouts de tarjetas de productos
 * - Headers y footers personalizados
 * 
 * @version 4.0.0
 * @since 2025-10-05
 */

import { PDFGenerationService } from '../../../../src/core/services/PDFGenerationService.js';
import { createMockJsPDF, createMockJsBarcode } from '../../../helpers/test-helpers.js';

describe('PDFGenerationService', () => {
    let service;
    let mockJsPDF;
    let mockJsBarcode;
    let mockDoc;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock jsPDF
        mockDoc = createMockJsPDF();
        mockJsPDF = jest.fn().mockReturnValue(mockDoc);

        // Mock JsBarcode
        mockJsBarcode = createMockJsBarcode();

        // Setup window objects
        window.jspdf = { jsPDF: mockJsPDF };
        window.JsBarcode = mockJsBarcode;

        // Create service
        service = new PDFGenerationService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete window.jspdf;
        delete window.JsBarcode;
    });

    describe('constructor()', () => {
        it('should initialize with null jsPDF and window.JsBarcode', () => {
            expect(service.jsPDF).toBeNull();
            expect(service.JsBarcode).toBe(mockJsBarcode);
        });
    });

    describe('generateBarcodes()', () => {
        it('should generate barcodes for products with codes', async () => {
            const productos = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1' },
                { id: 2, codigo: 'P002', nombre: 'Producto 2' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledTimes(2);
            expect(productos[0].barcodeCanvas).toBeDefined();
            expect(productos[1].barcodeCanvas).toBeDefined();
        });

        it('should skip products without codes', async () => {
            const productos = [
                { id: 1, nombre: 'Producto 1' },
                { id: 2, codigo: 'P002', nombre: 'Producto 2' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledTimes(1);
            expect(productos[0].barcodeCanvas).toBeUndefined();
            expect(productos[1].barcodeCanvas).toBeDefined();
        });

        it('should use EAN13 format for 13-digit codes', async () => {
            const productos = [
                { id: 1, codigo: '1234567890123', nombre: 'Producto 1' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledWith(
                expect.any(HTMLCanvasElement),
                '1234567890123',
                expect.objectContaining({ format: 'EAN13' })
            );
        });

        it('should use UPC format for 12-digit codes', async () => {
            const productos = [
                { id: 1, codigo: '123456789012', nombre: 'Producto 1' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledWith(
                expect.any(HTMLCanvasElement),
                '123456789012',
                expect.objectContaining({ format: 'UPC' })
            );
        });

        it('should use CODE128 format for other codes', async () => {
            const productos = [
                { id: 1, codigo: 'ABC123', nombre: 'Producto 1' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledWith(
                expect.any(HTMLCanvasElement),
                'ABC123',
                expect.objectContaining({ format: 'CODE128' })
            );
        });

        it('should fallback to CODE128 on error', async () => {
            const productos = [
                { id: 1, codigo: '1234567890123', nombre: 'Producto 1' }
            ];

            // Mock first call to throw error, second call to succeed
            mockJsBarcode
                .mockImplementationOnce(() => { throw new Error('Invalid format'); })
                .mockImplementationOnce(() => {});

            console.log = jest.fn();
            console.error = jest.fn();

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledTimes(2);
            expect(mockJsBarcode).toHaveBeenLastCalledWith(
                expect.any(HTMLCanvasElement),
                '1234567890123',
                expect.objectContaining({ format: 'CODE128' })
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('generado con CODE128 como fallback')
            );
        });

        it('should set barcodeCanvas to null if fallback fails', async () => {
            const productos = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1' }
            ];

            mockJsBarcode.mockImplementation(() => { throw new Error('Error'); });
            console.error = jest.fn();

            await service.generateBarcodes(productos);

            expect(productos[0].barcodeCanvas).toBeNull();
            expect(console.error).toHaveBeenCalled();
        });

        it('should configure barcode with correct options', async () => {
            const productos = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1' }
            ];

            await service.generateBarcodes(productos);

            expect(mockJsBarcode).toHaveBeenCalledWith(
                expect.any(HTMLCanvasElement),
                'P001',
                expect.objectContaining({
                    format: 'CODE128',
                    width: 1.5,
                    height: 60,
                    displayValue: true,
                    fontSize: 12,
                    textMargin: 2.5,
                    margin: 2
                })
            );
        });
    });

    describe('generatePDF()', () => {
        let mockAreas;
        let mockProductosPorArea;
        let mockOpciones;

        beforeEach(() => {
            mockAreas = [
                { id: '1', nombre: 'Área A' },
                { id: '2', nombre: 'Área B' }
            ];

            mockProductosPorArea = {
                '1': [
                    {
                        id: 1,
                        codigo: 'P001',
                        nombre: 'Producto 1',
                        cantidad: '10',
                        unidad: 'kg',
                        caducidad: '2025-10-08',
                        area_id: '1',
                        barcodeCanvas: { toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test') }
                    }
                ]
            };

            mockOpciones = {
                incluirCodigo: true,
                incluirCaducidad: true,
                incluirArea: true,
                incluirComentarios: true,
                filtrarAgrupaciones: false
            };

            // Mock fake timers for date consistency
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-10-05T00:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should create a PDF document', async () => {
            const result = await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockJsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
            expect(result.doc).toBeDefined();
            expect(result.contenidoProcesado).toBe(true);
        });

        it('should add area title to PDF', async () => {
            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('Área A'),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should add product cards to PDF', async () => {
            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            // Verify product name was added
            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.arrayContaining(['Producto 1']),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should add barcode to PDF when incluirCodigo is true', async () => {
            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.addImage).toHaveBeenCalled();
        });

        it('should not add barcode when incluirCodigo is false', async () => {
            mockOpciones.incluirCodigo = false;

            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.addImage).not.toHaveBeenCalled();
        });

        it('should add expiration date when incluirCaducidad is true', async () => {
            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('Cad:'),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should add area name when incluirArea is true', async () => {
            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('Área:'),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should filter categories when filtrarAgrupaciones is true', async () => {
            mockOpciones.filtrarAgrupaciones = true;
            mockOpciones.agrupacionesSeleccionadas = {
                vencidos: false,
                proximosSemana: true,
                mismoMes: false,
                siguienteMes: false,
                otros: false
            };

            const result = await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            // Should only show "proximosSemana" category header
            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('VENCEN EN MENOS DE UNA SEMANA'),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should skip areas without products in selected categories', async () => {
            mockProductosPorArea = {
                '1': [
                    {
                        id: 1,
                        codigo: 'P001',
                        nombre: 'Producto 1',
                        caducidad: '2025-12-31', // categoria: otros
                        area_id: '1'
                    }
                ]
            };

            mockOpciones.filtrarAgrupaciones = true;
            mockOpciones.agrupacionesSeleccionadas = {
                vencidos: true,
                proximosSemana: false,
                mismoMes: false,
                siguienteMes: false,
                otros: false
            };

            const result = await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(result.contenidoProcesado).toBe(false);
        });

        it('should add new page for multiple areas', async () => {
            mockProductosPorArea = {
                '1': [
                    {
                        id: 1,
                        codigo: 'P001',
                        nombre: 'Producto 1',
                        caducidad: '2025-10-08',
                        area_id: '1'
                    }
                ],
                '2': [
                    {
                        id: 2,
                        codigo: 'P002',
                        nombre: 'Producto 2',
                        caducidad: '2025-10-08',
                        area_id: '2'
                    }
                ]
            };

            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.addPage).toHaveBeenCalled();
        });

        it('should sort areas alphabetically', async () => {
            mockAreas = [
                { id: '1', nombre: 'Zebra' },
                { id: '2', nombre: 'Alpha' }
            ];

            mockProductosPorArea = {
                '1': [{ id: 1, nombre: 'P1', caducidad: '2025-10-08', area_id: '1' }],
                '2': [{ id: 2, nombre: 'P2', caducidad: '2025-10-08', area_id: '2' }]
            };

            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            const textCalls = mockDoc.text.mock.calls;
            const alphaCalls = textCalls.find(call => 
                typeof call[0] === 'string' && call[0].includes('Alpha')
            );
            const zebraCalls = textCalls.find(call => 
                typeof call[0] === 'string' && call[0].includes('Zebra')
            );

            // Alpha should be called before Zebra
            expect(textCalls.indexOf(alphaCalls)).toBeLessThan(textCalls.indexOf(zebraCalls));
        });

        it('should handle products with multiple lotes', async () => {
            mockProductosPorArea = {
                '1': [
                    {
                        id: 1,
                        codigo: 'P001',
                        nombre: 'Producto 1',
                        cantidad: '30',
                        unidad: 'kg',
                        caducidad: '2025-10-08',
                        area_id: '1',
                        lotesFusionados: [
                            { lote: 'L001', cantidad: 10, caducidad: '2025-10-08', area_id: '1' },
                            { lote: 'L002', cantidad: 20, caducidad: '2025-10-15', area_id: '1' }
                        ]
                    }
                ]
            };

            mockOpciones.incluirComentarios = true;

            await service.generatePDF(mockProductosPorArea, mockAreas, mockOpciones);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.arrayContaining([expect.stringContaining('Lotes:')]),
                expect.any(Number),
                expect.any(Number)
            );
        });
    });

    describe('_getCategoryConfig()', () => {
        it('should return config for vencidos category', () => {
            const config = service._getCategoryConfig('vencidos');

            expect(config.titulo).toContain('VENCIDOS');
            expect(config.fondo).toEqual({ r: 220, g: 53, b: 69 });
            expect(config.texto).toEqual({ r: 255, g: 255, b: 255 });
        });

        it('should return config for proximosSemana category', () => {
            const config = service._getCategoryConfig('proximosSemana');

            expect(config.titulo).toContain('MENOS DE UNA SEMANA');
            expect(config.fondo).toEqual({ r: 255, g: 193, b: 7 });
        });

        it('should return config for mismoMes category', () => {
            const config = service._getCategoryConfig('mismoMes');

            expect(config.titulo).toContain('ESTE MES');
            expect(config.fondo).toEqual({ r: 255, g: 152, b: 0 });
        });

        it('should return config for siguienteMes category', () => {
            const config = service._getCategoryConfig('siguienteMes');

            expect(config.titulo).toContain('PRÓXIMO MES');
            expect(config.fondo).toEqual({ r: 32, g: 201, b: 151 });
        });

        it('should return config for otros category', () => {
            const config = service._getCategoryConfig('otros');

            expect(config.titulo).toContain('OTROS PRODUCTOS');
            expect(config.fondo).toEqual({ r: 108, g: 117, b: 125 });
        });

        it('should return otros config for unknown category', () => {
            const config = service._getCategoryConfig('unknown');

            expect(config).toEqual(service._getCategoryConfig('otros'));
        });
    });

    describe('_categorizeProductsByExpiry()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-10-05T00:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should categorize expired products', () => {
            const productos = [
                { id: 1, nombre: 'P1', caducidad: '2025-10-01' }
            ];

            const result = service._categorizeProductsByExpiry(productos);

            expect(result.vencidos).toHaveLength(1);
            expect(result.vencidos[0].id).toBe(1);
        });

        it('should categorize products expiring this week', () => {
            const productos = [
                { id: 1, nombre: 'P1', caducidad: '2025-10-08' }
            ];

            const result = service._categorizeProductsByExpiry(productos);

            expect(result.proximosSemana).toHaveLength(1);
        });

        it('should categorize products expiring this month', () => {
            const productos = [
                { id: 1, nombre: 'P1', caducidad: '2025-10-20' }
            ];

            const result = service._categorizeProductsByExpiry(productos);

            expect(result.mismoMes).toHaveLength(1);
        });

        it('should categorize products expiring next month', () => {
            const productos = [
                { id: 1, nombre: 'P1', caducidad: '2025-11-15' }
            ];

            const result = service._categorizeProductsByExpiry(productos);

            expect(result.siguienteMes).toHaveLength(1);
        });

        it('should categorize products without expiration date', () => {
            const productos = [
                { id: 1, nombre: 'P1', caducidad: null }
            ];

            const result = service._categorizeProductsByExpiry(productos);

            expect(result.otros).toHaveLength(1);
        });
    });

    describe('savePDF()', () => {
        it('should call doc.save with filename', () => {
            const mockDoc = createMockJsPDF();
            const filename = 'test-report.pdf';

            service.savePDF(mockDoc, filename);

            expect(mockDoc.save).toHaveBeenCalledWith(filename);
        });
    });

    describe('_addProductCard()', () => {
        let mockDoc;
        let mockAreas;
        let mockOpciones;
        let mockConfig;

        beforeEach(() => {
            mockDoc = createMockJsPDF();
            mockAreas = [
                { id: '1', nombre: 'Área Test' }
            ];
            mockOpciones = {
                incluirCodigo: true,
                incluirCaducidad: true,
                incluirArea: true,
                incluirComentarios: true
            };
            mockConfig = {
                bordeTarjeta: { r: 100, g: 100, b: 100 }
            };
        });

        it('should draw product card border', () => {
            const producto = {
                id: 1,
                nombre: 'Test Product',
                cantidad: '10',
                unidad: 'kg',
                area_id: '1'
            };

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.rect).toHaveBeenCalledWith(10, 10, 90, 45);
        });

        it('should add product name', () => {
            const producto = {
                id: 1,
                nombre: 'Test Product',
                cantidad: '10',
                area_id: '1'
            };

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.arrayContaining(['Test Product']),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should add quantity', () => {
            const producto = {
                id: 1,
                nombre: 'Test Product',
                cantidad: '10',
                unidad: 'kg',
                area_id: '1'
            };

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.text).toHaveBeenCalledWith(
                'Cant: 10 kg',
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should add brand if present', () => {
            const producto = {
                id: 1,
                nombre: 'Test Product',
                cantidad: '10',
                marca: 'Test Brand',
                area_id: '1'
            };

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.text).toHaveBeenCalledWith(
                'Marca: Test Brand',
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should handle missing product name', () => {
            const producto = {
                id: 1,
                cantidad: '10',
                area_id: '1'
            };

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.arrayContaining(['Sin nombre']),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should handle missing expiration date', () => {
            const producto = {
                id: 1,
                nombre: 'Test Product',
                cantidad: '10',
                area_id: '1'
            };

            mockOpciones.incluirCaducidad = true;

            service._addProductCard(mockDoc, producto, 10, 10, 90, 45, mockOpciones, mockConfig, mockAreas);

            expect(mockDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('Sin caducidad'),
                expect.any(Number),
                expect.any(Number)
            );
        });
    });
});
