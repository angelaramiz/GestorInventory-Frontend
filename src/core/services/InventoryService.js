/**
 * InventoryService - Servicio para operaciones de inventario
 * 
 * Extrae la lógica de negocio relacionada con:
 * - Gestión de stock
 * - Control de lotes
 * - Movimientos de inventario
 * - Alertas de stock bajo
 * - Cálculos de inventario
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseService } from './BaseService.js';
import { mostrarAlertaBurbuja, mostrarMensaje } from '../../js/logs.js';
import { Inventory } from '../models/Inventory.js';
import { Batch } from '../models/Batch.js';

export class InventoryService extends BaseService {
    constructor() {
        super('InventoryService');
        this.stockAlerts = new Map();
        this.batchExpiryAlerts = new Map();
        this.stockThresholds = {
            critical: 5,
            warning: 10,
            good: 50
        };
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        this.log('Inicializando InventoryService');
        
        // Configurar alertas de stock
        await this.loadStockThresholds();
        
        // Configurar listeners para cambios de inventario
        this.setupInventoryListeners();
        
        this.isInitialized = true;
        this.startTime = Date.now();
        this.log('InventoryService inicializado correctamente');
    }

    // ========================================
    // OPERACIONES PRINCIPALES DE INVENTARIO
    // ========================================

    /**
     * Obtener inventario completo con filtros
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>} Lista de inventario
     */
    async getInventory(filters = {}) {
        return this.executeOperation(async () => {
            const inventoryRepository = this.getRepository('inventory');
            
            // Aplicar filtros estándar
            const query = {
                area_id: filters.area_id || this.getCurrentAreaId(),
                categoria_id: filters.categoria_id || this.getCurrentCategoryId(),
                ...filters
            };
            
            const inventory = await inventoryRepository.findAll(query);
            
            // Enriquecer con información adicional
            return this.enrichInventoryData(inventory);
            
        }, 'getInventory');
    }

    /**
     * Obtener stock de un producto específico
     * @param {string} productId - ID del producto
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Información de stock
     */
    async getProductStock(productId, options = {}) {
        return this.executeOperation(async () => {
            const inventoryRepository = this.getRepository('inventory');
            
            // Obtener inventario del producto
            const inventory = await inventoryRepository.findAll({
                product_id: productId,
                area_id: options.area_id || this.getCurrentAreaId()
            });
            
            // Calcular totales de stock
            const stockInfo = this.calculateStockTotals(inventory);
            
            // Obtener información de lotes si se solicita
            if (options.includeBatches) {
                stockInfo.batches = await this.getProductBatches(productId, options);
            }
            
            // Verificar alertas de stock
            stockInfo.alerts = this.checkStockAlerts(stockInfo);
            
            return stockInfo;
            
        }, 'getProductStock');
    }

    /**
     * Actualizar conteo de producto
     * @param {string} productId - ID del producto
     * @param {Object} countData - Datos del conteo
     * @returns {Promise<Object>} Resultado de la actualización
     */
    async updateProductCount(productId, countData) {
        return this.executeOperation(async () => {
            // Validar datos de entrada
            const validation = this.validateCountData(countData);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }
            
            const inventoryRepository = this.getRepository('inventory');
            
            // Obtener conteo actual
            const currentCount = await this.getProductStock(productId);
            
            // Crear registro de inventario (solo conteo)
            const inventoryData = {
                product_id: productId,
                area_id: countData.area_id || this.getCurrentAreaId(),
                categoria_id: countData.categoria_id || this.getCurrentCategoryId(),
                cantidad_actual: countData.cantidad,
                cantidad_minima: countData.cantidad_minima || currentCount.cantidad_minima,
                cantidad_maxima: countData.cantidad_maxima || currentCount.cantidad_maxima,
                fecha_actualizacion: new Date().toISOString(),
                usuario_id: this.getCurrentUserId()
            };
            
            // Si es actualización con lotes
            if (countData.batch_info) {
                return await this.updateCountWithBatch(inventoryData, countData.batch_info);
            }
            
            // Actualización simple
            const result = await inventoryRepository.createOrUpdate(inventoryData);
            
            // Registrar movimiento de conteo
            await this.registerCountMovement({
                product_id: productId,
                type: 'count_adjustment',
                cantidad_anterior: currentCount.cantidad_actual,
                cantidad_nueva: countData.cantidad,
                motivo: countData.motivo || 'Ajuste de conteo'
            });
            
            // Verificar alertas de cantidad
            await this.checkAndNotifyCountAlerts(productId);
            
            return result;
            
        }, 'updateProductCount', {
            successMessage: 'Conteo actualizado correctamente'
        });
    }

    /**
     * Actualizar conteo con información de lote
     * @param {Object} inventoryData - Datos de inventario
     * @param {Object} batchInfo - Información del lote
     * @returns {Promise<Object>} Resultado
     */
    async updateCountWithBatch(inventoryData, batchInfo) {
        const inventoryRepository = this.getRepository('inventory');
        
        // Crear o actualizar inventario
        const inventory = await inventoryRepository.createOrUpdate(inventoryData);
        
        // Crear o actualizar lote (sin precios, solo conteo y fechas)
        const batchData = {
            inventory_id: inventory.id,
            product_id: inventoryData.product_id,
            lote_numero: batchInfo.numero,
            fecha_vencimiento: batchInfo.fecha_vencimiento,
            cantidad_lote: batchInfo.cantidad,
            estado: 'active',
            fecha_creacion: new Date().toISOString()
        };
        
        const batch = new Batch(batchData);
        await batch.save();
        
        return { inventory, batch };
    }

    /**
     * Registrar entrada de mercancía (solo conteo)
     * @param {Object} entryData - Datos de entrada
     * @returns {Promise<Object>} Resultado del registro
     */
    async registerEntry(entryData) {
        return this.executeOperation(async () => {
            // Validar datos de entrada
            const validation = this.validateEntryData(entryData);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }
            
            const results = [];
            
            // Procesar cada producto en la entrada
            for (const item of entryData.items) {
                const currentCount = await this.getProductStock(item.product_id);
                const newQuantity = (currentCount.cantidad_actual || 0) + item.cantidad;
                
                // Actualizar conteo
                const countUpdate = await this.updateProductCount(item.product_id, {
                    cantidad: newQuantity,
                    area_id: entryData.area_id,
                    categoria_id: entryData.categoria_id,
                    batch_info: item.batch_info
                });
                
                // Registrar movimiento de entrada
                await this.registerCountMovement({
                    product_id: item.product_id,
                    type: 'entry',
                    cantidad_anterior: currentCount.cantidad_actual || 0,
                    cantidad_nueva: newQuantity,
                    cantidad_movimiento: item.cantidad,
                    motivo: `Entrada: ${entryData.motivo || 'Recepción de mercancía'}`,
                    documento_referencia: entryData.documento_referencia
                });
                
                results.push({
                    product_id: item.product_id,
                    cantidad_anterior: currentCount.cantidad_actual || 0,
                    cantidad_nueva: newQuantity,
                    result: countUpdate
                });
            }
            
            this.emit('entryRegistered', {
                entryData,
                results
            });
            
            return results;
            
        }, 'registerEntry', {
            successMessage: `Entrada registrada: ${entryData.items.length} productos procesados`
        });
    }

    /**
     * Registrar salida de mercancía (solo conteo)
     * @param {Object} exitData - Datos de salida
     * @returns {Promise<Object>} Resultado del registro
     */
    async registerExit(exitData) {
        return this.executeOperation(async () => {
            // Validar datos de salida
            const validation = this.validateExitData(exitData);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }
            
            const results = [];
            
            // Procesar cada producto en la salida
            for (const item of exitData.items) {
                const currentCount = await this.getProductStock(item.product_id, {
                    includeBatches: true
                });
                
                // Verificar disponibilidad de cantidad
                if ((currentCount.cantidad_actual || 0) < item.cantidad) {
                    throw new Error(
                        `Cantidad insuficiente para producto ${item.product_id}. ` +
                        `Disponible: ${currentCount.cantidad_actual}, Solicitado: ${item.cantidad}`
                    );
                }
                
                const newQuantity = currentCount.cantidad_actual - item.cantidad;
                
                // Si hay lotes, usar FIFO para el conteo
                let remainingToExit = item.cantidad;
                const batchExits = [];
                
                if (currentCount.batches && currentCount.batches.length > 0) {
                    const sortedBatches = currentCount.batches
                        .filter(b => b.cantidad_disponible > 0)
                        .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
                    
                    for (const batch of sortedBatches) {
                        if (remainingToExit <= 0) break;
                        
                        const exitFromBatch = Math.min(remainingToExit, batch.cantidad_disponible);
                        batchExits.push({
                            batch_id: batch.id,
                            cantidad: exitFromBatch
                        });
                        remainingToExit -= exitFromBatch;
                    }
                }
                
                // Actualizar conteo
                const countUpdate = await this.updateProductCount(item.product_id, {
                    cantidad: newQuantity,
                    area_id: exitData.area_id,
                    categoria_id: exitData.categoria_id
                });
                
                // Registrar movimiento de salida
                await this.registerCountMovement({
                    product_id: item.product_id,
                    type: 'exit',
                    cantidad_anterior: currentCount.cantidad_actual,
                    cantidad_nueva: newQuantity,
                    cantidad_movimiento: -item.cantidad,
                    motivo: `Salida: ${exitData.motivo || 'Despacho de mercancía'}`,
                    documento_referencia: exitData.documento_referencia,
                    batch_exits: batchExits
                });
                
                results.push({
                    product_id: item.product_id,
                    cantidad_anterior: currentCount.cantidad_actual,
                    cantidad_nueva: newQuantity,
                    batch_exits: batchExits,
                    result: countUpdate
                });
            }
            
            this.emit('exitRegistered', {
                exitData,
                results
            });
            
            return results;
            
        }, 'registerExit', {
            successMessage: `Salida registrada: ${exitData.items.length} productos procesados`
        });
    }

    // ========================================
    // GESTIÓN DE LOTES
    // ========================================

    /**
     * Obtener lotes de un producto
     * @param {string} productId - ID del producto
     * @param {Object} options - Opciones de filtrado
     * @returns {Promise<Array>} Lista de lotes
     */
    async getProductBatches(productId, options = {}) {
        return this.executeOperation(async () => {
            const batchRepository = this.getRepository('batch');
            
            const filters = {
                product_id: productId,
                estado: options.estado || 'active'
            };
            
            if (options.area_id) {
                filters.area_id = options.area_id;
            }
            
            const batches = await batchRepository.findAll(filters);
            
            // Enriquecer con información de expiración
            return batches.map(batch => {
                const daysUntilExpiry = this.calculateDaysUntilExpiry(batch.fecha_vencimiento);
                return {
                    ...batch,
                    days_until_expiry: daysUntilExpiry,
                    expiry_status: this.getExpiryStatus(daysUntilExpiry),
                    cantidad_disponible: this.calculateAvailableBatchQuantity(batch)
                };
            });
            
        }, 'getProductBatches');
    }

    /**
     * Obtener lotes próximos a vencer
     * @param {number} days - Días de anticipación
     * @returns {Promise<Array>} Lotes próximos a vencer
     */
    async getExpiringBatches(days = 30) {
        return this.executeOperation(async () => {
            const batchRepository = this.getRepository('batch');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() + days);
            
            const batches = await batchRepository.findAll({
                estado: 'active',
                fecha_vencimiento_lte: cutoffDate.toISOString()
            });
            
            return batches
                .map(batch => {
                    const daysUntilExpiry = this.calculateDaysUntilExpiry(batch.fecha_vencimiento);
                    return {
                        ...batch,
                        days_until_expiry: daysUntilExpiry,
                        expiry_status: this.getExpiryStatus(daysUntilExpiry)
                    };
                })
                .sort((a, b) => a.days_until_expiry - b.days_until_expiry);
                
        }, 'getExpiringBatches');
    }

    // ========================================
    // ALERTAS Y NOTIFICACIONES
    // ========================================

    /**
     * Verificar y notificar alertas de conteo
     * @param {string} productId - ID del producto
     */
    async checkAndNotifyCountAlerts(productId) {
        const countInfo = await this.getProductStock(productId);
        const alerts = this.checkCountAlerts(countInfo);
        
        if (alerts.length > 0) {
            for (const alert of alerts) {
                this.notifyCountAlert(productId, alert);
            }
        }
    }

    /**
     * Verificar alertas de conteo
     * @param {Object} countInfo - Información de conteo
     * @returns {Array} Lista de alertas
     */
    checkCountAlerts(countInfo) {
        const alerts = [];
        const currentCount = countInfo.cantidad_actual || 0;
        const minCount = countInfo.cantidad_minima || 0;
        
        if (currentCount <= 0) {
            alerts.push({
                type: 'out_of_count',
                level: 'critical',
                message: 'Producto sin existencias en el conteo'
            });
        } else if (currentCount <= this.stockThresholds.critical) {
            alerts.push({
                type: 'critical_count',
                level: 'critical',
                message: `Conteo crítico: ${currentCount} unidades`
            });
        } else if (currentCount <= minCount) {
            alerts.push({
                type: 'low_count',
                level: 'warning',
                message: `Conteo bajo: ${currentCount} unidades (mínimo: ${minCount})`
            });
        }
        
        return alerts;
    }

    /**
     * Notificar alerta de conteo
     * @param {string} productId - ID del producto
     * @param {Object} alert - Información de la alerta
     */
    notifyCountAlert(productId, alert) {
        const alertKey = `${productId}_${alert.type}`;
        
        // Evitar spam de alertas
        if (this.stockAlerts.has(alertKey)) {
            const lastAlert = this.stockAlerts.get(alertKey);
            if (Date.now() - lastAlert < 60000) { // 1 minuto
                return;
            }
        }
        
        this.stockAlerts.set(alertKey, Date.now());
        
        // Mostrar alerta visual
        const alertType = alert.level === 'critical' ? 'error' : 'warning';
        mostrarAlertaBurbuja(alert.message, alertType);
        
        // Emitir evento para otros listeners
        this.emit('countAlert', {
            productId,
            alert
        });
    }

    // ========================================
    // CÁLCULOS Y UTILIDADES
    // ========================================

    /**
     * Calcular totales de conteo (sin valores monetarios)
     * @param {Array} inventory - Lista de inventario
     * @returns {Object} Totales calculados
     */
    calculateStockTotals(inventory) {
        const totals = {
            cantidad_actual: 0,
            cantidad_minima: 0,
            cantidad_maxima: 0,
            items_count: inventory.length,
            ultima_actualizacion: null
        };
        
        for (const item of inventory) {
            totals.cantidad_actual += item.cantidad_actual || 0;
            totals.cantidad_minima = Math.max(totals.cantidad_minima, item.cantidad_minima || 0);
            totals.cantidad_maxima = Math.max(totals.cantidad_maxima, item.cantidad_maxima || 0);
            
            if (item.fecha_actualizacion > (totals.ultima_actualizacion || '')) {
                totals.ultima_actualizacion = item.fecha_actualizacion;
            }
        }
        
        return totals;
    }

    /**
     * Calcular días hasta expiración
     * @param {string} expiryDate - Fecha de vencimiento
     * @returns {number} Días hasta expiración
     */
    calculateDaysUntilExpiry(expiryDate) {
        if (!expiryDate) return Infinity;
        
        const expiry = new Date(expiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Obtener estado de expiración
     * @param {number} daysUntilExpiry - Días hasta expiración
     * @returns {string} Estado de expiración
     */
    getExpiryStatus(daysUntilExpiry) {
        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 7) return 'critical';
        if (daysUntilExpiry <= 30) return 'warning';
        return 'good';
    }

    /**
     * Enriquecer datos de inventario (sin cálculos de valor)
     * @param {Array} inventory - Lista de inventario
     * @returns {Array} Inventario enriquecido
     */
    async enrichInventoryData(inventory) {
        const enriched = [];
        
        for (const item of inventory) {
            const enrichedItem = { ...item };
            
            // Calcular alertas de conteo
            enrichedItem.alerts = this.checkCountAlerts(item);
            
            // Estado de conteo
            enrichedItem.count_status = this.getCountStatus(item);
            
            // Información de vencimiento si aplica
            if (item.fecha_vencimiento) {
                const daysUntilExpiry = this.calculateDaysUntilExpiry(item.fecha_vencimiento);
                enrichedItem.expiry_info = {
                    days_until_expiry: daysUntilExpiry,
                    expiry_status: this.getExpiryStatus(daysUntilExpiry)
                };
            }
            
            enriched.push(enrichedItem);
        }
        
        return enriched;
    }

    /**
     * Obtener estado de conteo
     * @param {Object} item - Item de inventario
     * @returns {string} Estado de conteo
     */
    getCountStatus(item) {
        const current = item.cantidad_actual || 0;
        const min = item.cantidad_minima || 0;
        
        if (current <= 0) return 'out_of_count';
        if (current <= this.stockThresholds.critical) return 'critical';
        if (current <= min) return 'low';
        return 'good';
    }

    // ========================================
    // VALIDACIONES
    // ========================================

    /**
     * Validar datos de conteo
     * @param {Object} countData - Datos de conteo
     * @returns {Object} Resultado de validación
     */
    validateCountData(countData) {
        return this.validateInput(countData, {
            required: ['cantidad'],
            types: {
                cantidad: 'number',
                cantidad_minima: 'number',
                cantidad_maxima: 'number'
            },
            ranges: {
                cantidad: { min: 0 },
                cantidad_minima: { min: 0 },
                cantidad_maxima: { min: 0 }
            }
        });
    }

    /**
     * Validar datos de entrada (sin precios)
     * @param {Object} entryData - Datos de entrada
     * @returns {Object} Resultado de validación
     */
    validateEntryData(entryData) {
        if (!entryData.items || !Array.isArray(entryData.items) || entryData.items.length === 0) {
            return {
                isValid: false,
                errors: ['Se requiere al menos un item en la entrada']
            };
        }
        
        const errors = [];
        
        for (let i = 0; i < entryData.items.length; i++) {
            const item = entryData.items[i];
            const itemValidation = this.validateInput(item, {
                required: ['product_id', 'cantidad'],
                types: {
                    cantidad: 'number'
                },
                ranges: {
                    cantidad: { min: 0.01 }
                }
            });
            
            if (!itemValidation.isValid) {
                errors.push(`Item ${i + 1}: ${itemValidation.errors.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar datos de salida
     * @param {Object} exitData - Datos de salida
     * @returns {Object} Resultado de validación
     */
    validateExitData(exitData) {
        if (!exitData.items || !Array.isArray(exitData.items) || exitData.items.length === 0) {
            return {
                isValid: false,
                errors: ['Se requiere al menos un item en la salida']
            };
        }
        
        const errors = [];
        
        for (let i = 0; i < exitData.items.length; i++) {
            const item = exitData.items[i];
            const itemValidation = this.validateInput(item, {
                required: ['product_id', 'cantidad'],
                types: {
                    cantidad: 'number'
                },
                ranges: {
                    cantidad: { min: 0.01 }
                }
            });
            
            if (!itemValidation.isValid) {
                errors.push(`Item ${i + 1}: ${itemValidation.errors.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ========================================
    // CONFIGURACIÓN Y SETUP
    // ========================================

    /**
     * Cargar umbrales de stock desde configuración
     */
    async loadStockThresholds() {
        try {
            const config = JSON.parse(localStorage.getItem('stock_thresholds') || '{}');
            this.stockThresholds = {
                ...this.stockThresholds,
                ...config
            };
        } catch (error) {
            this.log('Error cargando umbrales de stock, usando valores por defecto', 'warn');
        }
    }

    /**
     * Configurar listeners de inventario
     */
    setupInventoryListeners() {
        // Listener para cambios online/offline
        window.addEventListener('online', () => {
            this.log('Conexión restaurada, sincronizando inventario');
            this.emit('connectionRestored');
        });
        
        window.addEventListener('offline', () => {
            this.log('Conexión perdida, modo offline activado');
            this.emit('connectionLost');
        });
    }

    /**
     * Registrar movimiento de conteo
     * @param {Object} movementData - Datos del movimiento
     */
    async registerCountMovement(movementData) {
        try {
            const movement = {
                ...movementData,
                id: this.generateId(),
                fecha: new Date().toISOString(),
                usuario_id: this.getCurrentUserId(),
                area_id: this.getCurrentAreaId()
            };
            
            // Guardar en histórico local
            const movements = JSON.parse(localStorage.getItem('count_movements') || '[]');
            movements.push(movement);
            
            // Mantener solo los últimos 1000 movimientos
            if (movements.length > 1000) {
                movements.splice(0, movements.length - 1000);
            }
            
            localStorage.setItem('count_movements', JSON.stringify(movements));
            
            this.emit('countMovement', movement);
            
        } catch (error) {
            this.log(`Error registrando movimiento de conteo: ${error.message}`, 'error');
        }
    }

    /**
     * Calcular cantidad disponible de lote
     * @param {Object} batch - Datos del lote
     * @returns {number} Cantidad disponible
     */
    calculateAvailableBatchQuantity(batch) {
        // Por ahora retorna la cantidad del lote
        // En el futuro se puede implementar lógica más compleja
        // considerando reservas, movimientos parciales, etc.
        return batch.cantidad_lote || 0;
    }
}
