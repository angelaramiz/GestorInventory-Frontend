/**
 * Tests para ReportService
 * 
 * Pruebas unitarias para el servicio de reportes de inventario:
 * - Carga de áreas y productos
 * - Filtrado por áreas
 * - Fusión de productos por código
 * - Agrupación por área
 * - Categorización por fecha de caducidad
 * 
 * @version 4.0.0
 * @since 2025-10-05
 */

import { ReportService } from '../../../../src/core/services/ReportService.js';
import { DatabaseService } from '../../../../src/core/services/DatabaseService.js';
import * as dbOperations from '../../../../js/db-operations.js';
import {
    createMockSupabaseClient,
    createMockDatabaseService,
    flushPromises
} from '../../../helpers/test-helpers.js';

// Mock de dependencias
jest.mock('../../../../src/core/services/DatabaseService.js');
jest.mock('../../../../js/db-operations.js', () => ({
    obtenerAreasPorCategoria: jest.fn()
}));

describe('ReportService', () => {
    let service;
    let mockSupabase;
    let mockDatabaseService;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock Supabase with chained methods
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis()
        };

        // Setup mock DatabaseService with getSupabase method
        mockDatabaseService = {
            getSupabase: jest.fn().mockResolvedValue(mockSupabase)
        };

        // Mock DatabaseService
        DatabaseService.mockImplementation(() => mockDatabaseService);

        // Create service instance
        service = new ReportService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor()', () => {
        it('should initialize with empty arrays', () => {
            expect(service.productosInventario).toEqual([]);
            expect(service.todasLasAreas).toEqual([]);
            expect(service.databaseService).toBeDefined();
        });
    });

    describe('initialize()', () => {
        it('should load areas and products', async () => {
            const mockAreas = [
                { id: 1, nombre: 'Área 1', categoria: 'Cat A' },
                { id: 2, nombre: 'Área 2', categoria: 'Cat B' }
            ];

            const mockProducts = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', cantidad: '10' },
                { id: 2, codigo: 'P002', nombre: 'Producto 2', cantidad: '20' }
            ];

            dbOperations.obtenerAreasPorCategoria.mockResolvedValue(mockAreas);
            
            // Configure mock for loadProducts
            mockSupabase.order.mockResolvedValue({
                data: mockProducts,
                error: null
            });

            await service.initialize();

            expect(service.todasLasAreas).toEqual(mockAreas);
            expect(service.productosInventario).toEqual(mockProducts);
        });

        it('should throw error if initialization fails', async () => {
            dbOperations.obtenerAreasPorCategoria.mockRejectedValue(
                new Error('Database error')
            );

            await expect(service.initialize()).rejects.toThrow(
                'No se pudo inicializar el servicio de reportes'
            );
        });
    });

    describe('loadAreas()', () => {
        it('should load areas successfully', async () => {
            const mockAreas = [
                { id: 1, nombre: 'Área 1', categoria: 'Cat A' },
                { id: 2, nombre: 'Área 2', categoria: 'Cat B' }
            ];

            dbOperations.obtenerAreasPorCategoria.mockResolvedValue(mockAreas);

            const result = await service.loadAreas();

            expect(result).toEqual(mockAreas);
            expect(service.todasLasAreas).toEqual(mockAreas);
            expect(dbOperations.obtenerAreasPorCategoria).toHaveBeenCalled();
        });

        it('should return empty array if no areas found', async () => {
            dbOperations.obtenerAreasPorCategoria.mockResolvedValue([]);
            console.warn = jest.fn();

            const result = await service.loadAreas();

            expect(result).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith('No se encontraron áreas disponibles');
        });

        it('should throw error on failure', async () => {
            const error = new Error('Database error');
            dbOperations.obtenerAreasPorCategoria.mockRejectedValue(error);

            await expect(service.loadAreas()).rejects.toThrow('Database error');
        });
    });

    describe('loadProducts()', () => {
        it('should load products successfully', async () => {
            const mockProducts = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', cantidad: '10' },
                { id: 2, codigo: 'P002', nombre: 'Producto 2', cantidad: '20' }
            ];

            mockSupabase.order.mockResolvedValue({
                data: mockProducts,
                error: null
            });

            const result = await service.loadProducts();

            expect(result).toEqual(mockProducts);
            expect(service.productosInventario).toEqual(mockProducts);
            expect(mockSupabase.from).toHaveBeenCalledWith('inventario');
        });

        it('should return empty array if no products found', async () => {
            mockSupabase.order.mockResolvedValue({
                data: null,
                error: null
            });

            const result = await service.loadProducts();

            expect(result).toEqual([]);
            expect(service.productosInventario).toEqual([]);
        });

        it('should throw error on database failure', async () => {
            mockSupabase.order.mockResolvedValue({
                data: null,
                error: new Error('Query failed')
            });

            await expect(service.loadProducts()).rejects.toThrow('Query failed');
        });
    });

    describe('filterProductsByAreas()', () => {
        beforeEach(() => {
            service.productosInventario = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', area_id: 1 },
                { id: 2, codigo: 'P002', nombre: 'Producto 2', area_id: 2 },
                { id: 3, codigo: 'P003', nombre: 'Producto 3', area_id: 1 }
            ];
        });

        it('should return all products when todasSeleccionadas is true', async () => {
            const result = await service.filterProductsByAreas([1], true);

            expect(result).toEqual(service.productosInventario);
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });

        it('should return empty array when no areaIds provided', async () => {
            const result = await service.filterProductsByAreas([]);

            expect(result).toEqual([]);
        });

        it('should filter products by area IDs', async () => {
            const filteredProducts = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', area_id: 1 },
                { id: 3, codigo: 'P003', nombre: 'Producto 3', area_id: 1 }
            ];

            mockSupabase.order.mockResolvedValue({
                data: filteredProducts,
                error: null
            });

            const result = await service.filterProductsByAreas([1]);

            expect(result).toEqual(filteredProducts);
            expect(mockSupabase.from).toHaveBeenCalledWith('inventario');
        });

        it('should handle multiple area IDs', async () => {
            const filteredProducts = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', area_id: 1 },
                { id: 2, codigo: 'P002', nombre: 'Producto 2', area_id: 2 }
            ];

            mockSupabase.order.mockResolvedValue({
                data: filteredProducts,
                error: null
            });

            const result = await service.filterProductsByAreas([1, 2]);

            expect(result).toEqual(filteredProducts);
        });

        it('should throw error on database failure', async () => {
            mockSupabase.order.mockResolvedValue({
                data: null,
                error: new Error('Query failed')
            });

            await expect(service.filterProductsByAreas([1])).rejects.toThrow('Query failed');
        });
    });

    describe('mergeProductsByCode()', () => {
        beforeEach(() => {
            service.todasLasAreas = [
                { id: 1, nombre: 'Área 1' },
                { id: 2, nombre: 'Área 2' }
            ];
        });

        it('should merge products with same code', () => {
            const productos = [
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    lote: 'L001',
                    unidad: 'kg',
                    area_id: 1,
                    comentarios: 'Nota 1'
                },
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '20',
                    lote: 'L002',
                    unidad: 'kg',
                    area_id: 2,
                    comentarios: 'Nota 2'
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result.length).toBe(1);
            expect(result[0].cantidad).toBe('30');
            expect(result[0].lotesFusionados).toHaveLength(2);
            expect(result[0].comentarios).toContain('Producto fusionado con múltiples lotes');
        });

        it('should not merge products with different codes', () => {
            const productos = [
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    lote: 'L001'
                },
                {
                    codigo: 'P002',
                    nombre: 'Producto 2',
                    cantidad: '20',
                    lote: 'L002'
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result.length).toBe(2);
            expect(result[0].cantidad).toBe('10');
            expect(result[1].cantidad).toBe('20');
        });

        it('should handle products without code', () => {
            const productos = [
                {
                    nombre: 'Producto 1',
                    cantidad: '10',
                    lote: 'L001'
                },
                {
                    nombre: 'Producto 2',
                    cantidad: '20',
                    lote: 'L002'
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result.length).toBe(1); // Ambos sin código se fusionan bajo 'sincodigo'
            expect(result[0].cantidad).toBe('30');
        });

        it('should preserve earliest expiration date', () => {
            const productos = [
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    caducidad: '2025-12-31',
                    lote: 'L001'
                },
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '20',
                    caducidad: '2025-06-30',
                    lote: 'L002'
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result[0].caducidad).toBe('2025-06-30');
        });

        it('should include expiration dates in comments', () => {
            const productos = [
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    caducidad: '2025-12-31',
                    lote: 'L001',
                    unidad: 'kg',
                    area_id: 1
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result[0].lotesFusionados[0]).toMatchObject({
                lote: 'L001',
                cantidad: 10,
                caducidad: '2025-12-31',
                area_id: 1
            });
        });

        it('should include area names in comments', () => {
            const productos = [
                {
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    lote: 'L001',
                    unidad: 'kg',
                    area_id: 1,
                    comentarios: 'Nota'
                }
            ];

            const result = service.mergeProductsByCode(productos);

            expect(result[0].lotesFusionados[0].area_id).toBe(1);
        });

        it('should handle empty array', () => {
            const result = service.mergeProductsByCode([]);

            expect(result).toEqual([]);
        });

        it('should log merge statistics', () => {
            console.log = jest.fn();

            const productos = [
                { codigo: 'P001', nombre: 'Producto 1', cantidad: '10', lote: 'L001' },
                { codigo: 'P001', nombre: 'Producto 1', cantidad: '20', lote: 'L002' },
                { codigo: 'P002', nombre: 'Producto 2', cantidad: '15', lote: 'L003' }
            ];

            service.mergeProductsByCode(productos);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Se fusionaron 3 productos en 2 elementos únicos')
            );
        });
    });

    describe('groupProductsByArea()', () => {
        it('should group products by area_id', () => {
            const productos = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1', area_id: 1 },
                { id: 2, codigo: 'P002', nombre: 'Producto 2', area_id: 2 },
                { id: 3, codigo: 'P003', nombre: 'Producto 3', area_id: 1 }
            ];

            const result = service.groupProductsByArea(productos);

            expect(result[1]).toHaveLength(2);
            expect(result[2]).toHaveLength(1);
            expect(result[1][0].codigo).toBe('P001');
            expect(result[2][0].codigo).toBe('P002');
        });

        it('should sort products by expiration date within each area', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    area_id: 1,
                    caducidad: '2025-12-31'
                },
                {
                    id: 2,
                    codigo: 'P002',
                    nombre: 'Producto 2',
                    area_id: 1,
                    caducidad: '2025-06-30'
                },
                {
                    id: 3,
                    codigo: 'P003',
                    nombre: 'Producto 3',
                    area_id: 1,
                    caducidad: '2025-09-15'
                }
            ];

            const result = service.groupProductsByArea(productos);

            expect(result[1][0].caducidad).toBe('2025-06-30');
            expect(result[1][1].caducidad).toBe('2025-09-15');
            expect(result[1][2].caducidad).toBe('2025-12-31');
        });

        it('should place products without expiration at the end', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    area_id: 1,
                    caducidad: null
                },
                {
                    id: 2,
                    codigo: 'P002',
                    nombre: 'Producto 2',
                    area_id: 1,
                    caducidad: '2025-06-30'
                }
            ];

            const result = service.groupProductsByArea(productos);

            expect(result[1][0].caducidad).toBe('2025-06-30');
            expect(result[1][1].caducidad).toBeNull();
        });

        it('should handle empty array', () => {
            const result = service.groupProductsByArea([]);

            expect(result).toEqual({});
        });
    });

    describe('categorizeProductsByExpiry()', () => {
        beforeEach(() => {
            // Mock current date to 2025-10-05
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-10-05T00:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should categorize expired products', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-10-01'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.vencidos).toHaveLength(1);
            expect(result.vencidos[0].codigo).toBe('P001');
        });

        it('should categorize products expiring in the next week', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-10-08'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.proximosSemana).toHaveLength(1);
            expect(result.proximosSemana[0].codigo).toBe('P001');
        });

        it('should categorize products expiring this month', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-10-20'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.mismoMes).toHaveLength(1);
            expect(result.mismoMes[0].codigo).toBe('P001');
        });

        it('should categorize products expiring next month', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-11-15'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.siguienteMes).toHaveLength(1);
            expect(result.siguienteMes[0].codigo).toBe('P001');
        });

        it('should categorize products expiring later', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-12-31'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.otros).toHaveLength(1);
            expect(result.otros[0].codigo).toBe('P001');
        });

        it('should categorize products without expiration date', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: null
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.otros).toHaveLength(1);
            expect(result.otros[0].codigo).toBe('P001');
        });

        it('should categorize multiple products correctly', () => {
            const productos = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    caducidad: '2025-10-01'
                },
                {
                    id: 2,
                    codigo: 'P002',
                    nombre: 'Producto 2',
                    caducidad: '2025-10-08'
                },
                {
                    id: 3,
                    codigo: 'P003',
                    nombre: 'Producto 3',
                    caducidad: '2025-10-20'
                },
                {
                    id: 4,
                    codigo: 'P004',
                    nombre: 'Producto 4',
                    caducidad: '2025-11-15'
                },
                {
                    id: 5,
                    codigo: 'P005',
                    nombre: 'Producto 5',
                    caducidad: '2025-12-31'
                }
            ];

            const result = service.categorizeProductsByExpiry(productos);

            expect(result.vencidos).toHaveLength(1);
            expect(result.proximosSemana).toHaveLength(1);
            expect(result.mismoMes).toHaveLength(1);
            expect(result.siguienteMes).toHaveLength(1);
            expect(result.otros).toHaveLength(1);
        });

        it('should handle empty array', () => {
            const result = service.categorizeProductsByExpiry([]);

            expect(result.vencidos).toEqual([]);
            expect(result.proximosSemana).toEqual([]);
            expect(result.mismoMes).toEqual([]);
            expect(result.siguienteMes).toEqual([]);
            expect(result.otros).toEqual([]);
        });
    });

    describe('getAreas()', () => {
        it('should return loaded areas', () => {
            const mockAreas = [
                { id: 1, nombre: 'Área 1' },
                { id: 2, nombre: 'Área 2' }
            ];

            service.todasLasAreas = mockAreas;

            const result = service.getAreas();

            expect(result).toEqual(mockAreas);
        });

        it('should return empty array if no areas loaded', () => {
            const result = service.getAreas();

            expect(result).toEqual([]);
        });
    });

    describe('getProducts()', () => {
        it('should return loaded products', () => {
            const mockProducts = [
                { id: 1, codigo: 'P001', nombre: 'Producto 1' },
                { id: 2, codigo: 'P002', nombre: 'Producto 2' }
            ];

            service.productosInventario = mockProducts;

            const result = service.getProducts();

            expect(result).toEqual(mockProducts);
        });

        it('should return empty array if no products loaded', () => {
            const result = service.getProducts();

            expect(result).toEqual([]);
        });
    });

    describe('Integration tests', () => {
        it('should complete full workflow: initialize -> filter -> merge -> categorize', async () => {
            // Setup mock data
            const mockAreas = [
                { id: 1, nombre: 'Área 1', categoria: 'Cat A' },
                { id: 2, nombre: 'Área 2', categoria: 'Cat B' }
            ];

            const mockProducts = [
                {
                    id: 1,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '10',
                    area_id: 1,
                    caducidad: '2025-10-08',
                    lote: 'L001'
                },
                {
                    id: 2,
                    codigo: 'P001',
                    nombre: 'Producto 1',
                    cantidad: '20',
                    area_id: 2,
                    caducidad: '2025-10-20',
                    lote: 'L002'
                },
                {
                    id: 3,
                    codigo: 'P002',
                    nombre: 'Producto 2',
                    cantidad: '15',
                    area_id: 1,
                    caducidad: '2025-11-15',
                    lote: 'L003'
                }
            ];

            // Mock responses
            dbOperations.obtenerAreasPorCategoria.mockResolvedValue(mockAreas);
            mockSupabase.order.mockResolvedValue({
                data: mockProducts,
                error: null
            });

            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-10-05T00:00:00Z'));

            // Initialize
            await service.initialize();

            // Merge products
            const merged = service.mergeProductsByCode(mockProducts);
            expect(merged).toHaveLength(2);

            // Group by area
            const grouped = service.groupProductsByArea(merged);
            expect(Object.keys(grouped).length).toBeGreaterThan(0);

            // Categorize by expiry
            const categorized = service.categorizeProductsByExpiry(merged);
            expect(categorized.proximosSemana.length).toBeGreaterThan(0);

            jest.useRealTimers();
        });
    });
});
