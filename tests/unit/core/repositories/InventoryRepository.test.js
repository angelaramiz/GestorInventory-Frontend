/**
 * Tests para InventoryRepository
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { InventoryRepository } from '../../../../src/core/repositories/InventoryRepository.js';
import { Inventory } from '../../../../src/core/models/Inventory.js';

// Mock de IndexedDB
const mockIndexedDB = {
    open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
            createObjectStore: jest.fn(() => ({
                createIndex: jest.fn()
            })),
            deleteObjectStore: jest.fn(),
            objectStoreNames: {
                contains: jest.fn(() => false)
            }
        }
    }))
};

global.indexedDB = mockIndexedDB;

// Mock de localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock de navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

describe('InventoryRepository', () => {
    let repository;
    
    beforeEach(() => {
        repository = new InventoryRepository();
        jest.clearAllMocks();
        
        // Setup localStorage mocks
        localStorageMock.getItem.mockImplementation((key) => {
            const values = {
                'area_id': 'test-area-123',
                'usuario_id': 'test-user-123',
                'syncQueue_inventario': '[]'
            };
            return values[key] || null;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct table and store names', () => {
            expect(repository.tableName).toBe('inventario');
            expect(repository.localStoreName).toBe('inventario');
        });

        test('should initialize sync queue from localStorage', () => {
            expect(repository.syncQueue).toBeDefined();
        });
    });

    describe('Data Validation', () => {
        test('should validate correct inventory data', () => {
            const validData = {
                codigo: 'TEST001',
                nombre: 'Producto Test',
                lote: 'LOTE001',
                cantidad: 10,
                unidad: 'pcs',
                caducidad: '2025-12-31'
            };

            expect(() => repository.validateData(validData)).not.toThrow();
        });

        test('should reject invalid inventory data', () => {
            const invalidData = {
                codigo: '', // código vacío
                cantidad: -5 // cantidad negativa
            };

            expect(() => repository.validateData(invalidData)).toThrow();
        });

        test('should reject inventory with missing required fields', () => {
            const incompleteData = {
                nombre: 'Producto Test'
                // falta código
            };

            expect(() => repository.validateData(incompleteData)).toThrow();
        });
    });

    describe('Database Initialization', () => {
        test('should initialize database schema correctly', async () => {
            const mockInitialize = jest.fn().mockResolvedValue(true);
            repository.dbAdapter = { initialize: mockInitialize };

            await repository.initializeDatabase();

            expect(mockInitialize).toHaveBeenCalledWith({
                inventario: {
                    options: { keyPath: 'id' },
                    indexes: expect.objectContaining({
                        codigo: { keyPath: 'codigo', options: { unique: false } },
                        lote: { keyPath: 'lote', options: { unique: false } },
                        codigo_lote: { keyPath: ['codigo', 'lote'], options: { unique: false } }
                    })
                }
            });
        });

        test('should not initialize database twice', async () => {
            const mockInitialize = jest.fn().mockResolvedValue(true);
            repository.dbAdapter = { initialize: mockInitialize };

            await repository.initializeDatabase();
            await repository.initializeDatabase();

            expect(mockInitialize).toHaveBeenCalledTimes(1);
        });
    });

    describe('CRUD Operations', () => {
        beforeEach(async () => {
            // Mock database adapter
            repository.dbAdapter = {
                initialize: jest.fn().mockResolvedValue(true),
                put: jest.fn().mockResolvedValue('test-id'),
                get: jest.fn().mockResolvedValue(null),
                findWithCursor: jest.fn().mockResolvedValue([]),
                getByIndex: jest.fn().mockResolvedValue([]),
                delete: jest.fn().mockResolvedValue(true),
                clear: jest.fn().mockResolvedValue(true),
                getAll: jest.fn().mockResolvedValue([])
            };

            // Mock Supabase
            repository.getSupabaseClient = jest.fn().mockResolvedValue({
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'supabase-id', codigo: 'TEST001' },
                                error: null
                            })
                        }))
                    })),
                    select: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'supabase-id', codigo: 'TEST001' },
                                error: null
                            })
                        }))
                    }))
                }))
            });

            await repository.initializeDatabase();
        });

        test('should create inventory item successfully', async () => {
            const inventoryData = {
                codigo: 'TEST001',
                nombre: 'Producto Test',
                lote: 'LOTE001',
                cantidad: 10,
                unidad: 'pcs'
            };

            const result = await repository.create(inventoryData);

            expect(result).toEqual(expect.objectContaining({
                id: 'supabase-id',
                codigo: 'TEST001'
            }));
        });

        test('should prevent duplicate codigo-lote combinations', async () => {
            const inventoryData = {
                codigo: 'TEST001',
                lote: 'LOTE001',
                cantidad: 10
            };

            // Mock existing item
            repository.findByCodigoAndLote = jest.fn().mockResolvedValue({
                id: 'existing-id',
                codigo: 'TEST001',
                lote: 'LOTE001'
            });

            await expect(repository.create(inventoryData)).rejects.toThrow(
                'Ya existe un item con el mismo código y lote'
            );
        });

        test('should find item by codigo and lote', async () => {
            const mockItem = {
                id: 'test-id',
                codigo: 'TEST001',
                lote: 'LOTE001'
            };

            repository.dbAdapter.findWithCursor.mockResolvedValue([mockItem]);

            const result = await repository.findByCodigoAndLote('TEST001', 'LOTE001');

            expect(result).toEqual(mockItem);
        });

        test('should return null when item not found', async () => {
            repository.dbAdapter.findWithCursor.mockResolvedValue([]);

            const result = await repository.findByCodigoAndLote('NONEXISTENT', 'LOTE001');

            expect(result).toBeNull();
        });
    });

    describe('Stock Management', () => {
        beforeEach(async () => {
            repository.dbAdapter = {
                initialize: jest.fn().mockResolvedValue(true),
                getByIndex: jest.fn(),
                findWithCursor: jest.fn(),
                get: jest.fn(),
                update: jest.fn(),
                put: jest.fn()
            };
            
            repository.getSupabaseClient = jest.fn().mockResolvedValue({
                from: jest.fn(() => ({
                    update: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            select: jest.fn(() => ({
                                single: jest.fn().mockResolvedValue({
                                    data: { id: 'test-id', cantidad: 15 },
                                    error: null
                                })
                            }))
                        }))
                    }))
                }))
            });

            await repository.initializeDatabase();
        });

        test('should calculate total stock by codigo', async () => {
            const mockItems = [
                { codigo: 'TEST001', cantidad: 10 },
                { codigo: 'TEST001', cantidad: 5 },
                { codigo: 'TEST001', cantidad: 3 }
            ];

            repository.dbAdapter.getByIndex.mockResolvedValue(mockItems);

            const totalStock = await repository.getStockByCodigo('TEST001');

            expect(totalStock).toBe(18);
        });

        test('should find items with low stock', async () => {
            const mockItems = [
                { codigo: 'TEST001', cantidad: 5, area_id: 'test-area-123' },
                { codigo: 'TEST002', cantidad: 15, area_id: 'test-area-123' }
            ];

            repository.dbAdapter.findWithCursor.mockImplementation((storeName, filterFn) => {
                return Promise.resolve(mockItems.filter(filterFn));
            });

            const lowStockItems = await repository.findLowStock(10);

            expect(lowStockItems).toHaveLength(1);
            expect(lowStockItems[0].codigo).toBe('TEST001');
        });

        test('should update item quantity and register movement', async () => {
            const mockItem = {
                id: 'test-id',
                codigo: 'TEST001',
                lote: 'LOTE001',
                cantidad: 10
            };

            repository.findById = jest.fn().mockResolvedValue(mockItem);
            repository.update = jest.fn().mockResolvedValue({
                ...mockItem,
                cantidad: 15
            });
            repository.registrarMovimiento = jest.fn().mockResolvedValue(true);

            const result = await repository.updateQuantity('test-id', 15, 'Restock');

            expect(repository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
                cantidad: 15
            }));
            expect(repository.registrarMovimiento).toHaveBeenCalledWith(expect.objectContaining({
                diferencia: 5,
                tipo_movimiento: 'entrada',
                motivo: 'Restock'
            }));
        });
    });

    describe('Expiry Management', () => {
        beforeEach(async () => {
            repository.dbAdapter = {
                initialize: jest.fn().mockResolvedValue(true),
                findWithCursor: jest.fn()
            };

            await repository.initializeDatabase();
        });

        test('should find items expiring within specified days', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 35);

            const mockItems = [
                { 
                    codigo: 'TEST001', 
                    caducidad: tomorrow.toISOString(), 
                    area_id: 'test-area-123' 
                },
                { 
                    codigo: 'TEST002', 
                    caducidad: nextMonth.toISOString(), 
                    area_id: 'test-area-123' 
                }
            ];

            repository.dbAdapter.findWithCursor.mockImplementation((storeName, filterFn) => {
                return Promise.resolve(mockItems.filter(filterFn));
            });

            const expiringItems = await repository.findExpiringItems(30);

            expect(expiringItems).toHaveLength(1);
            expect(expiringItems[0].codigo).toBe('TEST001');
        });

        test('should ignore items without expiry date', async () => {
            const mockItems = [
                { codigo: 'TEST001', caducidad: null, area_id: 'test-area-123' },
                { codigo: 'TEST002', caducidad: undefined, area_id: 'test-area-123' }
            ];

            repository.dbAdapter.findWithCursor.mockImplementation((storeName, filterFn) => {
                return Promise.resolve(mockItems.filter(filterFn));
            });

            const expiringItems = await repository.findExpiringItems(30);

            expect(expiringItems).toHaveLength(0);
        });
    });

    describe('Inventory Summary', () => {
        beforeEach(async () => {
            repository.dbAdapter = {
                initialize: jest.fn().mockResolvedValue(true),
                findWithCursor: jest.fn()
            };

            await repository.initializeDatabase();
        });

        test('should generate comprehensive inventory summary', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const mockItems = [
                { 
                    codigo: 'TEST001', 
                    categoria: 'Categoria A', 
                    cantidad: 5, 
                    precio: 10,
                    caducidad: tomorrow.toISOString(),
                    area_id: 'test-area-123' 
                },
                { 
                    codigo: 'TEST002', 
                    categoria: 'Categoria B', 
                    cantidad: 0, 
                    precio: 15,
                    area_id: 'test-area-123' 
                },
                { 
                    codigo: 'TEST003', 
                    categoria: 'Categoria A', 
                    cantidad: 20, 
                    precio: 5,
                    area_id: 'test-area-123' 
                }
            ];

            repository.dbAdapter.findWithCursor.mockImplementation((storeName, filterFn) => {
                return Promise.resolve(mockItems.filter(filterFn));
            });

            const summary = await repository.getInventorySummary();

            expect(summary.totalItems).toBe(3);
            expect(summary.totalValor).toBe(150); // (5*10) + (0*15) + (20*5)
            expect(summary.itemsPorCategoria['Categoria A']).toBe(2);
            expect(summary.itemsPorCategoria['Categoria B']).toBe(1);
            expect(summary.stockBajo).toBe(1); // TEST001 con cantidad 5
            expect(summary.sinStock).toBe(1); // TEST002 con cantidad 0
            expect(summary.proximosCaducar).toBe(1); // TEST001 caduca mañana
        });
    });

    describe('Export Functionality', () => {
        beforeEach(async () => {
            repository.findAll = jest.fn();
            await repository.initializeDatabase();
        });

        test('should export inventory to CSV format', async () => {
            const mockItems = [
                {
                    codigo: 'TEST001',
                    nombre: 'Producto Test',
                    categoria: 'Categoria A',
                    marca: 'Marca A',
                    lote: 'LOTE001',
                    tipoCantidad: 'unidades',
                    cantidad: 10,
                    caducidad: '2025-12-31',
                    comentarios: 'Sin comentarios'
                }
            ];

            repository.findAll.mockResolvedValue(mockItems);

            const csv = await repository.exportToCSV();

            expect(csv).toContain('Código,Nombre,Categoría');
            expect(csv).toContain('TEST001');
            expect(csv).toContain('Producto Test');
            expect(csv).toContain('Categoria A');
        });

        test('should handle empty inventory export', async () => {
            repository.findAll.mockResolvedValue([]);

            const csv = await repository.exportToCSV();

            const lines = csv.split('\n');
            expect(lines[0]).toContain('Código,Nombre,Categoría'); // Headers
            expect(lines[1]).toBe(''); // No data
        });
    });

    describe('Error Handling', () => {
        test('should handle database initialization errors', async () => {
            repository.dbAdapter = {
                initialize: jest.fn().mockRejectedValue(new Error('DB Error'))
            };

            await expect(repository.initializeDatabase()).rejects.toThrow('DB Error');
        });

        test('should handle validation errors gracefully', async () => {
            const invalidData = {
                codigo: '',
                cantidad: -1
            };

            await expect(repository.create(invalidData)).rejects.toThrow('Datos inválidos');
        });

        test('should handle missing area ID', async () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'area_id') return null;
                return 'test-value';
            });

            await expect(repository.getInventorySummary()).rejects.toThrow('No se ha seleccionado un área');
        });
    });

    describe('Real-time Updates', () => {
        beforeEach(async () => {
            repository.dbAdapter = {
                initialize: jest.fn().mockResolvedValue(true),
                put: jest.fn().mockResolvedValue(true),
                delete: jest.fn().mockResolvedValue(true)
            };

            repository.getSupabaseClient = jest.fn().mockResolvedValue({
                channel: jest.fn(() => ({
                    on: jest.fn(() => ({
                        subscribe: jest.fn()
                    }))
                }))
            });

            await repository.initializeDatabase();
        });

        test('should handle INSERT real-time updates', async () => {
            const payload = {
                eventType: 'INSERT',
                new: { id: 'new-id', codigo: 'TEST001' }
            };

            await repository.handleRealTimeUpdate(payload);

            expect(repository.dbAdapter.put).toHaveBeenCalledWith('inventario', {
                id: 'new-id',
                codigo: 'TEST001',
                is_temp_id: false
            });
        });

        test('should handle DELETE real-time updates', async () => {
            const payload = {
                eventType: 'DELETE',
                old: { id: 'deleted-id' }
            };

            await repository.handleRealTimeUpdate(payload);

            expect(repository.dbAdapter.delete).toHaveBeenCalledWith('inventario', 'deleted-id');
        });
    });
});
