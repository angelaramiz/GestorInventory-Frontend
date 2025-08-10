/**
 * SyncQueue - Gestión avanzada de cola de sincronización
 * 
 * Maneja la sincronización entre datos locales (IndexedDB) y remotos (Supabase)
 * con funcionalidades avanzadas:
 * - Cola de operaciones offline
 * - Retry logic con backoff exponencial
 * - Resolución de conflictos
 * - Sincronización en lote
 * - Priorización de operaciones
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { getSupabase } from '../../js/auth.js';
import { mostrarAlertaBurbuja } from '../../js/logs.js';

export class SyncQueue {
    /**
     * Constructor de la cola de sincronización
     * @param {string} queueName - Nombre único de la cola
     */
    constructor(queueName) {
        this.queueName = queueName;
        this.queue = this.loadQueue();
        this.isProcessing = false;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseRetryDelay = 1000; // 1 segundo
        
        // Configurar listeners de eventos
        this.setupEventListeners();
    }

    /**
     * Configurar listeners de eventos de red
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            console.log('Conexión restaurada, procesando cola de sincronización');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            console.log('Conexión perdida, modo offline activado');
        });
    }

    /**
     * Cargar cola desde localStorage
     * @returns {Array} Cola de sincronización
     */
    loadQueue() {
        try {
            const stored = localStorage.getItem(`syncQueue_${this.queueName}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading sync queue:', error);
            return [];
        }
    }

    /**
     * Guardar cola en localStorage
     */
    saveQueue() {
        try {
            localStorage.setItem(`syncQueue_${this.queueName}`, JSON.stringify(this.queue));
        } catch (error) {
            console.error('Error saving sync queue:', error);
        }
    }

    /**
     * Agregar operación a la cola
     * @param {Object} operation - Operación a sincronizar
     * @param {number} priority - Prioridad (1=alta, 5=baja)
     */
    enqueue(operation, priority = 3) {
        const queueItem = {
            id: this.generateOperationId(),
            operation,
            priority,
            timestamp: Date.now(),
            attempts: 0,
            lastError: null
        };

        this.queue.push(queueItem);
        this.sortQueueByPriority();
        this.saveQueue();

        // Procesar inmediatamente si estamos online
        if (navigator.onLine && !this.isProcessing) {
            this.processQueue();
        }

        return queueItem.id;
    }

    /**
     * Procesar toda la cola de sincronización
     */
    async processQueue() {
        if (!navigator.onLine || this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`Procesando cola de sincronización: ${this.queue.length} elementos`);

        let successCount = 0;
        let errorCount = 0;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            
            try {
                await this.processQueueItem(item);
                successCount++;
                this.retryAttempts.delete(item.id);
            } catch (error) {
                errorCount++;
                await this.handleProcessingError(item, error);
            }
        }

        this.isProcessing = false;
        this.saveQueue();

        // Mostrar resultado de sincronización
        if (successCount > 0) {
            mostrarAlertaBurbuja(
                `${successCount} elementos sincronizados correctamente`, 
                'success'
            );
        }

        if (errorCount > 0) {
            mostrarAlertaBurbuja(
                `${errorCount} elementos fallaron en sincronización`, 
                'warning'
            );
        }
    }

    /**
     * Procesar un elemento específico de la cola
     * @param {Object} item - Elemento de la cola
     */
    async processQueueItem(item) {
        const { operation } = item;
        const supabase = await getSupabase();

        if (!supabase) {
            throw new Error('No se pudo obtener cliente de Supabase');
        }

        switch (operation.type) {
            case 'create':
                return await this.processCreateOperation(supabase, operation);
            
            case 'update':
                return await this.processUpdateOperation(supabase, operation);
            
            case 'delete':
                return await this.processDeleteOperation(supabase, operation);
            
            case 'upsert':
                return await this.processUpsertOperation(supabase, operation);
            
            default:
                throw new Error(`Tipo de operación no soportado: ${operation.type}`);
        }
    }

    /**
     * Procesar operación CREATE
     * @param {Object} supabase - Cliente de Supabase
     * @param {Object} operation - Operación a procesar
     */
    async processCreateOperation(supabase, operation) {
        const { table, data, onSuccess } = operation;
        
        // Limpiar datos para Supabase (remover campos locales)
        const cleanData = this.cleanDataForSupabase(data);
        
        const { data: result, error } = await supabase
            .from(table)
            .insert(cleanData)
            .select()
            .single();

        if (error) {
            throw new Error(`Error en CREATE: ${error.message}`);
        }

        // Ejecutar callback de éxito si existe
        if (onSuccess && typeof onSuccess === 'function') {
            await onSuccess(result);
        }

        return result;
    }

    /**
     * Procesar operación UPDATE
     * @param {Object} supabase - Cliente de Supabase
     * @param {Object} operation - Operación a procesar
     */
    async processUpdateOperation(supabase, operation) {
        const { table, data, id, onSuccess } = operation;
        
        const cleanData = this.cleanDataForSupabase(data);
        
        const { data: result, error } = await supabase
            .from(table)
            .update(cleanData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Error en UPDATE: ${error.message}`);
        }

        if (onSuccess && typeof onSuccess === 'function') {
            await onSuccess(result);
        }

        return result;
    }

    /**
     * Procesar operación DELETE
     * @param {Object} supabase - Cliente de Supabase
     * @param {Object} operation - Operación a procesar
     */
    async processDeleteOperation(supabase, operation) {
        const { table, id, onSuccess } = operation;
        
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error en DELETE: ${error.message}`);
        }

        if (onSuccess && typeof onSuccess === 'function') {
            await onSuccess({ id });
        }

        return { id };
    }

    /**
     * Procesar operación UPSERT
     * @param {Object} supabase - Cliente de Supabase
     * @param {Object} operation - Operación a procesar
     */
    async processUpsertOperation(supabase, operation) {
        const { table, data, onSuccess } = operation;
        
        const cleanData = this.cleanDataForSupabase(data);
        
        const { data: result, error } = await supabase
            .from(table)
            .upsert(cleanData)
            .select();

        if (error) {
            throw new Error(`Error en UPSERT: ${error.message}`);
        }

        if (onSuccess && typeof onSuccess === 'function') {
            await onSuccess(result);
        }

        return result;
    }

    /**
     * Manejar errores de procesamiento
     * @param {Object} item - Elemento que falló
     * @param {Error} error - Error ocurrido
     */
    async handleProcessingError(item, error) {
        item.attempts++;
        item.lastError = error.message;

        console.error(`Error procesando elemento ${item.id}:`, error);

        // Verificar si excede el máximo de reintentos
        if (item.attempts >= this.maxRetries) {
            console.error(`Elemento ${item.id} descartado después de ${this.maxRetries} intentos`);
            return;
        }

        // Calcular delay para retry con backoff exponencial
        const delay = this.baseRetryDelay * Math.pow(2, item.attempts - 1);
        
        // Programar reintento
        setTimeout(() => {
            this.queue.unshift(item); // Agregar al inicio para procesarlo pronto
            this.saveQueue();
            
            if (navigator.onLine && !this.isProcessing) {
                this.processQueue();
            }
        }, delay);
    }

    /**
     * Limpiar datos para envío a Supabase
     * @param {Object} data - Datos a limpiar
     * @returns {Object} Datos limpios
     */
    cleanDataForSupabase(data) {
        const cleanData = { ...data };
        
        // Remover campos que son solo para uso local
        const localOnlyFields = ['is_temp_id', 'areaName', '_localTimestamp'];
        
        localOnlyFields.forEach(field => {
            delete cleanData[field];
        });

        // Asegurar campos requeridos
        const userId = localStorage.getItem('usuario_id');
        const areaId = localStorage.getItem('area_id');
        
        if (userId && !cleanData.usuario_id) {
            cleanData.usuario_id = userId;
        }
        
        if (areaId && !cleanData.area_id) {
            cleanData.area_id = areaId;
        }

        return cleanData;
    }

    /**
     * Ordenar cola por prioridad
     */
    sortQueueByPriority() {
        this.queue.sort((a, b) => {
            // Prioridad (1=alta, 5=baja)
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            
            // En caso de empate, por timestamp (más antiguo primero)
            return a.timestamp - b.timestamp;
        });
    }

    /**
     * Generar ID único para operación
     * @returns {string} ID único
     */
    generateOperationId() {
        return `${this.queueName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtener estadísticas de la cola
     * @returns {Object} Estadísticas
     */
    getStats() {
        const priorityCount = this.queue.reduce((acc, item) => {
            acc[item.priority] = (acc[item.priority] || 0) + 1;
            return acc;
        }, {});

        const failedItems = this.queue.filter(item => item.attempts > 0);

        return {
            totalItems: this.queue.length,
            priorityBreakdown: priorityCount,
            failedItems: failedItems.length,
            isProcessing: this.isProcessing,
            isOnline: navigator.onLine
        };
    }

    /**
     * Limpiar cola completamente
     */
    clear() {
        this.queue = [];
        this.retryAttempts.clear();
        this.saveQueue();
        console.log(`Cola ${this.queueName} limpiada`);
    }

    /**
     * Obtener elementos pendientes por tipo
     * @param {string} type - Tipo de operación
     * @returns {Array} Elementos del tipo especificado
     */
    getPendingByType(type) {
        return this.queue.filter(item => item.operation.type === type);
    }

    /**
     * Remover elemento específico de la cola
     * @param {string} operationId - ID de la operación
     * @returns {boolean} true si se removió correctamente
     */
    removeById(operationId) {
        const initialLength = this.queue.length;
        this.queue = this.queue.filter(item => item.id !== operationId);
        
        if (this.queue.length < initialLength) {
            this.saveQueue();
            return true;
        }
        
        return false;
    }

    /**
     * Forzar procesamiento inmediato (para testing)
     */
    async forceProcess() {
        if (this.queue.length === 0) {
            console.log('No hay elementos en la cola para procesar');
            return;
        }

        console.log('Forzando procesamiento de cola...');
        await this.processQueue();
    }
}
