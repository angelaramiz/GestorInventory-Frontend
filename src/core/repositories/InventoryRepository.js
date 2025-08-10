/**
 * InventoryRepository - Repositorio para gestión de inventario
 * 
 * Maneja todas las operaciones CRUD para el inventario:
 * - Gestión de stock y cantidades
 * - Movimientos de inventario
 * - Sincronización con Supabase
 * - Búsquedas y filtros avanzados
 * - Manejo de lotes y fechas de caducidad
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseRepository } from './BaseRepository.js';
import { IndexedDBAdapter } from '../../storage/IndexedDBAdapter.js';
import { SyncQueue } from '../../storage/SyncQueue.js';
import { Inventory } from '../models/Inventory.js';

export class InventoryRepository extends BaseRepository {
    /**
     * Constructor del repositorio de inventario
     */
    constructor() {
        super('inventario', 'inventario');
        this.dbAdapter = new IndexedDBAdapter('InventarioDB', 3);
        this.syncQueue = new SyncQueue('inventory');
        this.isInitialized = false;
    }

    /**
     * Inicializar base de datos de inventario
     * @returns {Promise<void>}
     */
    async initializeDatabase() {
        if (this.isInitialized) return;

        const schema = {
            inventario: {
                options: { keyPath: 'id' },
                indexes: {
                    id: { keyPath: 'id', options: { unique: true } },
                    codigo: { keyPath: 'codigo', options: { unique: false } },
                    lote: { keyPath: 'lote', options: { unique: false } },
                    nombre: { keyPath: 'nombre', options: { unique: false } },
                    categoria: { keyPath: 'categoria', options: { unique: false } },
                    marca: { keyPath: 'marca', options: { unique: false } },
                    unidad: { keyPath: 'unidad', options: { unique: false } },
                    cantidad: { keyPath: 'cantidad', options: { unique: false } },
                    caducidad: { keyPath: 'caducidad', options: { unique: false } },
                    comentarios: { keyPath: 'comentarios', options: { unique: false } },
                    area_id: { keyPath: 'area_id', options: { unique: false } },
                    codigo_lote: { keyPath: ['codigo', 'lote'], options: { unique: false } }
                }
            }
        };

        await this.dbAdapter.initialize(schema);
        this.isInitialized = true;
    }

    /**
     * Aplicar filtros específicos de inventario
     * @param {Object} query - Query de Supabase
     * @param {Object} filters - Filtros a aplicar
     */
    applyFilters(query, filters) {
        // Filtro por área (siempre aplicado)
        const areaId = this.getCurrentAreaId();
        if (areaId) {
            query.eq('area_id', areaId);
        }

        // Filtros adicionales
        if (filters.codigo) {
            query.eq('codigo', filters.codigo);
        }

        if (filters.lote) {
            query.eq('lote', filters.lote);
        }

        if (filters.categoria) {
            query.eq('categoria', filters.categoria);
        }

        if (filters.stockBajo && filters.stockBajo > 0) {
            query.lte('cantidad', filters.stockBajo);
        }

        if (filters.proximoCaducar) {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() + filters.proximoCaducar);
            query.lte('caducidad', fechaLimite.toISOString());
        }

        return query;
    }

    /**
     * Validar datos de inventario
     * @param {Object} data - Datos a validar
     */
    validateData(data) {
        const inventory = new Inventory(data);
        const validation = inventory.validate();
        
        if (!validation.isValid) {
            throw new Error(`Datos de inventario inválidos: ${validation.errors.join(', ')}`);
        }
    }

    /**
     * Crear nuevo item de inventario
     * @param {Object} inventoryData - Datos del item de inventario
     * @returns {Promise<Object>} Item creado
     */
    async create(inventoryData) {
        await this.initializeDatabase();
        
        // Crear modelo para validación
        const inventory = new Inventory(inventoryData);
        const validation = inventory.validate();
        
        if (!validation.isValid) {
            throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
        }

        // Verificar si ya existe el mismo código y lote
        const existing = await this.findByCodigoAndLote(inventoryData.codigo, inventoryData.lote);
        if (existing) {
            throw new Error('Ya existe un item con el mismo código y lote');
        }

        return await super.create(inventory.toJSON());
    }

    /**
     * Buscar item por código y lote
     * @param {string} codigo - Código del producto
     * @param {string} lote - Lote del producto
     * @returns {Promise<Object|null>} Item encontrado o null
     */
    async findByCodigoAndLote(codigo, lote) {
        await this.initializeDatabase();
        
        try {
            const results = await this.dbAdapter.findWithCursor('inventario', (item) => {
                return item.codigo === codigo && item.lote === lote;
            });
            
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('Error buscando por código y lote:', error);
            return null;
        }
    }

    /**
     * Buscar items por código (todos los lotes)
     * @param {string} codigo - Código del producto
     * @returns {Promise<Array>} Array de items encontrados
     */
    async findByCodigo(codigo) {
        await this.initializeDatabase();
        
        try {
            return await this.dbAdapter.getByIndex('inventario', 'codigo', codigo);
        } catch (error) {
            console.error('Error buscando por código:', error);
            return [];
        }
    }

    /**
     * Obtener stock total por código
     * @param {string} codigo - Código del producto
     * @returns {Promise<number>} Cantidad total en stock
     */
    async getStockByCodigo(codigo) {
        const items = await this.findByCodigo(codigo);
        return items.reduce((total, item) => total + (parseFloat(item.cantidad) || 0), 0);
    }

    /**
     * Buscar items con stock bajo
     * @param {number} limite - Límite de stock bajo
     * @returns {Promise<Array>} Items con stock bajo
     */
    async findLowStock(limite = 10) {
        await this.initializeDatabase();
        
        try {
            return await this.dbAdapter.findWithCursor('inventario', (item) => {
                const areaId = this.getCurrentAreaId();
                return item.area_id === areaId && parseFloat(item.cantidad) <= limite;
            });
        } catch (error) {
            console.error('Error buscando stock bajo:', error);
            return [];
        }
    }

    /**
     * Buscar items próximos a caducar
     * @param {number} dias - Días antes del vencimiento
     * @returns {Promise<Array>} Items próximos a caducar
     */
    async findExpiringItems(dias = 30) {
        await this.initializeDatabase();
        
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dias);
        
        try {
            return await this.dbAdapter.findWithCursor('inventario', (item) => {
                const areaId = this.getCurrentAreaId();
                if (item.area_id !== areaId) return false;
                
                if (!item.caducidad) return false;
                
                const fechaCaducidad = new Date(item.caducidad);
                return fechaCaducidad <= fechaLimite;
            });
        } catch (error) {
            console.error('Error buscando items próximos a caducar:', error);
            return [];
        }
    }

    /**
     * Actualizar cantidad de un item
     * @param {string} id - ID del item
     * @param {number} nuevaCantidad - Nueva cantidad
     * @param {string} motivo - Motivo del cambio
     * @returns {Promise<Object>} Item actualizado
     */
    async updateQuantity(id, nuevaCantidad, motivo = 'Ajuste manual') {
        await this.initializeDatabase();
        
        const item = await this.findById(id);
        if (!item) {
            throw new Error('Item de inventario no encontrado');
        }

        const cantidadAnterior = parseFloat(item.cantidad) || 0;
        const diferencia = nuevaCantidad - cantidadAnterior;

        // Actualizar item
        const updatedData = {
            ...item,
            cantidad: nuevaCantidad,
            ultima_modificacion: new Date().toISOString()
        };

        const result = await this.update(id, updatedData);

        // Registrar movimiento de inventario
        await this.registrarMovimiento({
            item_id: id,
            codigo: item.codigo,
            lote: item.lote,
            tipo_movimiento: diferencia > 0 ? 'entrada' : 'salida',
            cantidad_anterior: cantidadAnterior,
            cantidad_nueva: nuevaCantidad,
            diferencia: Math.abs(diferencia),
            motivo,
            usuario_id: this.getCurrentUserId(),
            area_id: this.getCurrentAreaId()
        });

        return result;
    }

    /**
     * Registrar movimiento de inventario
     * @param {Object} movimiento - Datos del movimiento
     */
    async registrarMovimiento(movimiento) {
        // Aquí se integraría con un repositorio de movimientos
        // Por ahora solo logueamos
        console.log('Movimiento de inventario registrado:', movimiento);
        
        // Agregar a cola de sincronización para tabla de movimientos
        this.syncQueue.enqueue({
            type: 'create',
            table: 'movimientos_inventario',
            data: {
                ...movimiento,
                fecha: new Date().toISOString()
            }
        }, 2); // Prioridad media
    }

    /**
     * Obtener resumen de inventario
     * @returns {Promise<Object>} Resumen con estadísticas
     */
    async getInventorySummary() {
        await this.initializeDatabase();
        
        const areaId = this.getCurrentAreaId();
        if (!areaId) {
            throw new Error('No se ha seleccionado un área');
        }

        try {
            const allItems = await this.dbAdapter.findWithCursor('inventario', (item) => {
                return item.area_id === areaId;
            });

            const summary = {
                totalItems: allItems.length,
                totalValor: 0,
                itemsPorCategoria: {},
                stockBajo: 0,
                proximosCaducar: 0,
                sinStock: 0
            };

            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() + 30);

            allItems.forEach(item => {
                const cantidad = parseFloat(item.cantidad) || 0;
                const precio = parseFloat(item.precio) || 0;
                
                // Valor total
                summary.totalValor += cantidad * precio;
                
                // Items por categoría
                const categoria = item.categoria || 'Sin categoría';
                summary.itemsPorCategoria[categoria] = (summary.itemsPorCategoria[categoria] || 0) + 1;
                
                // Stock bajo (menos de 10 unidades)
                if (cantidad > 0 && cantidad <= 10) {
                    summary.stockBajo++;
                }
                
                // Sin stock
                if (cantidad <= 0) {
                    summary.sinStock++;
                }
                
                // Próximos a caducar
                if (item.caducidad) {
                    const fechaCaducidad = new Date(item.caducidad);
                    if (fechaCaducidad <= fechaLimite) {
                        summary.proximosCaducar++;
                    }
                }
            });

            return summary;
        } catch (error) {
            console.error('Error obteniendo resumen de inventario:', error);
            throw error;
        }
    }

    // ========================================
    // IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS
    // ========================================

    async saveToIndexedDB(data) {
        await this.dbAdapter.put('inventario', data);
    }

    async getFromIndexedDB(filters = {}) {
        const areaId = this.getCurrentAreaId();
        
        return await this.dbAdapter.findWithCursor('inventario', (item) => {
            // Filtro básico por área
            if (item.area_id !== areaId) return false;
            
            // Aplicar filtros adicionales
            if (filters.codigo && item.codigo !== filters.codigo) return false;
            if (filters.lote && item.lote !== filters.lote) return false;
            if (filters.categoria && item.categoria !== filters.categoria) return false;
            
            return true;
        });
    }

    async getFromIndexedDBById(id) {
        return await this.dbAdapter.get('inventario', id);
    }

    async updateInIndexedDB(id, data) {
        return await this.dbAdapter.update('inventario', id, data);
    }

    async deleteFromIndexedDB(id) {
        return await this.dbAdapter.delete('inventario', id);
    }

    async clearLocalData(filters = {}) {
        const areaId = this.getCurrentAreaId();
        if (areaId) {
            // Solo limpiar datos del área actual
            const allItems = await this.dbAdapter.getAll('inventario');
            const itemsToDelete = allItems.filter(item => item.area_id === areaId);
            
            for (const item of itemsToDelete) {
                await this.dbAdapter.delete('inventario', item.id);
            }
        } else {
            await this.dbAdapter.clear('inventario');
        }
    }

    async replaceInIndexedDB(tempId, realData) {
        // Eliminar registro temporal
        await this.dbAdapter.delete('inventario', tempId);
        
        // Insertar datos reales
        await this.dbAdapter.put('inventario', realData);
    }

    /**
     * Configurar suscripciones en tiempo real
     * @returns {Promise<Object>} Canal de suscripción
     */
    async setupRealTimeSubscription() {
        const supabase = await this.getSupabaseClient();
        
        if (!supabase) {
            console.error("No se pudo obtener cliente de Supabase");
            return null;
        }

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error("Usuario no autenticado");
            }

            const channel = supabase.channel('inventario-real-time')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'inventario' 
                }, (payload) => {
                    this.handleRealTimeUpdate(payload);
                })
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("Suscripción a inventario activa");
                    }
                    if (err) {
                        console.error("Error en suscripción a inventario:", err);
                    }
                });

            return channel;
        } catch (error) {
            console.error("Error configurando suscripción en tiempo real:", error);
            return null;
        }
    }

    /**
     * Manejar actualizaciones en tiempo real
     * @param {Object} payload - Datos del evento
     */
    async handleRealTimeUpdate(payload) {
        try {
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE':
                    await this.saveToIndexedDB({
                        ...payload.new,
                        is_temp_id: false
                    });
                    break;

                case 'DELETE':
                    await this.deleteFromIndexedDB(payload.old.id);
                    break;
            }

            // Notificar a la UI si estamos en la página de inventario
            if (window.location.pathname.includes('inventario.html')) {
                // Disparar evento personalizado para actualizar la UI
                window.dispatchEvent(new CustomEvent('inventoryUpdated', {
                    detail: { payload }
                }));
            }
        } catch (error) {
            console.error("Error manejando actualización en tiempo real:", error);
        }
    }

    /**
     * Exportar inventario a CSV
     * @param {Object} filters - Filtros para exportación
     * @returns {Promise<string>} Contenido CSV
     */
    async exportToCSV(filters = {}) {
        const items = await this.findAll(filters);
        
        const headers = [
            'Código', 'Nombre', 'Categoría', 'Marca', 'Lote', 
            'Tipo de Cantidad', 'Cantidad', 'Fecha de Caducidad', 'Comentarios'
        ];
        
        let csv = headers.join(',') + '\n';
        
        items.forEach(item => {
            const row = [
                item.codigo,
                item.nombre,
                item.categoria,
                item.marca,
                item.lote,
                item.tipoCantidad,
                item.cantidad,
                item.caducidad,
                item.comentarios
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
}
