/**
 * BatchPersistenceService - Servicio especializado para persistencia de lotes
 * 
 * Este servicio maneja el guardado de inventario por lotes en IndexedDB y Supabase,
 * con manejo de errores, reintentos y sincronización.
 * 
 * @class BatchPersistenceService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

class BatchPersistenceService extends BaseService {
    constructor() {
        super('BatchPersistenceService');
        
        // Configuración de persistencia
        this.persistenceConfig = {
            maxRetries: 3,
            retryDelay: 100, // ms
            batchSize: 10,
            syncOnSave: true,
            validateBeforeSave: true
        };
        
        // Cola de operaciones pendientes
        this.pendingOperations = [];
        this.isProcessing = false;
        
        // Estadísticas de operaciones
        this.stats = {
            totalSaved: 0,
            totalErrors: 0,
            lastSaveTime: null,
            averageSaveTime: 0
        };
        
        this.debug('BatchPersistenceService inicializado');
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            if (this.status === 'initialized') {
                this.debug('Servicio ya inicializado');
                return;
            }

            this.status = 'initializing';
            this.debug('Inicializando BatchPersistenceService...');

            // Verificar IndexedDB
            await this.verifyIndexedDB();
            
            // Cargar configuración
            await this.loadConfiguration();
            
            // Procesar operaciones pendientes
            this.processPendingOperations();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('BatchPersistenceService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar BatchPersistenceService:', error);
            throw error;
        }
    }

    /**
     * Verificar disponibilidad de IndexedDB
     */
    async verifyIndexedDB() {
        try {
            if (typeof indexedDB === 'undefined') {
                throw new Error('IndexedDB no está disponible');
            }

            // Probar apertura de base de datos
            const testDB = await this.openDatabase('InventarioDB', 3);
            this.debug('IndexedDB verificado y disponible');
            return true;

        } catch (error) {
            this.error('Error al verificar IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Abrir base de datos IndexedDB
     * @param {string} dbName - Nombre de la base de datos
     * @param {number} version - Versión de la base de datos
     * @returns {Promise<IDBDatabase>} Base de datos abierta
     */
    openDatabase(dbName, version) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(new Error(`Error al abrir base de datos: ${event.target.error}`));
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear object store si no existe
                if (!db.objectStoreNames.contains('inventario')) {
                    const objectStore = db.createObjectStore('inventario', {
                        keyPath: 'id'
                    });
                    
                    // Crear índices
                    objectStore.createIndex('id', 'id', { unique: true });
                    objectStore.createIndex('codigo', 'codigo', { unique: false });
                    objectStore.createIndex('lote', 'lote', { unique: false });
                    objectStore.createIndex('nombre', 'nombre', { unique: false });
                    objectStore.createIndex('categoria', 'categoria', { unique: false });
                    objectStore.createIndex('marca', 'marca', { unique: false });
                    objectStore.createIndex('unidad', 'unidad', { unique: false });
                    objectStore.createIndex('cantidad', 'cantidad', { unique: false });
                    objectStore.createIndex('caducidad', 'caducidad', { unique: false });
                    objectStore.createIndex('comentarios', 'comentarios', { unique: false });
                    objectStore.createIndex('codigo_lote', ['codigo', 'lote'], { unique: false });
                    
                    this.debug('Object store "inventario" creado con índices');
                }
            };
        });
    }

    /**
     * Cargar configuración
     */
    async loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('batch_persistence_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.persistenceConfig = { ...this.persistenceConfig, ...config };
                this.debug('Configuración cargada:', this.persistenceConfig);
            }
        } catch (error) {
            this.warn('Error al cargar configuración:', error);
        }
    }

    /**
     * Guardar lote de productos en inventario
     * @param {Array} products - Lista de productos del lote
     * @param {Object} options - Opciones de guardado
     * @returns {Promise<Object>} Resultado del guardado
     */
    async saveBatchInventory(products, options = {}) {
        try {
            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('Lista de productos requerida');
            }

            const saveOptions = {
                validateData: options.validateData !== false,
                syncToSupabase: options.syncToSupabase !== false,
                generateIds: options.generateIds !== false,
                ...options
            };

            this.debug(`Iniciando guardado de lote con ${products.length} productos`);
            const startTime = performance.now();

            // Validar datos si está habilitado
            if (saveOptions.validateData) {
                this.validateProducts(products);
            }

            // Preparar datos para guardado
            const inventoryData = await this.prepareInventoryData(products, saveOptions);

            // Guardar en IndexedDB
            const indexedDBResults = await this.saveToIndexedDB(inventoryData);

            // Sincronizar con Supabase si está habilitado
            let supabaseResults = null;
            if (saveOptions.syncToSupabase) {
                try {
                    supabaseResults = await this.syncToSupabase(inventoryData);
                } catch (syncError) {
                    this.warn('Error en sincronización con Supabase (guardado local exitoso):', syncError);
                    // No lanzar error, el guardado local fue exitoso
                }
            }

            // Actualizar estadísticas
            const duration = performance.now() - startTime;
            this.updateStats(products.length, duration, true);

            const result = {
                success: true,
                savedCount: inventoryData.length,
                indexedDBResults,
                supabaseResults,
                duration: Math.round(duration),
                timestamp: new Date().toISOString()
            };

            this.debug('Lote guardado exitosamente:', result);
            this.emit('batchSaved', result);

            return result;

        } catch (error) {
            this.updateStats(products?.length || 0, 0, false);
            this.error('Error al guardar lote:', error);
            this.emit('batchSaveError', { error: error.message, products });
            throw error;
        }
    }

    /**
     * Validar productos antes del guardado
     * @param {Array} products - Lista de productos a validar
     */
    validateProducts(products) {
        const errors = [];

        products.forEach((product, index) => {
            // Validaciones requeridas
            if (!product.codigo) {
                errors.push(`Producto ${index + 1}: Código requerido`);
            }
            if (!product.nombre) {
                errors.push(`Producto ${index + 1}: Nombre requerido`);
            }
            if (typeof product.cantidad !== 'number' || product.cantidad <= 0) {
                errors.push(`Producto ${index + 1}: Cantidad debe ser un número positivo`);
            }
            if (typeof product.precio !== 'number' || product.precio < 0) {
                errors.push(`Producto ${index + 1}: Precio debe ser un número no negativo`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`Errores de validación:\n${errors.join('\n')}`);
        }
    }

    /**
     * Preparar datos de inventario para guardado
     * @param {Array} products - Lista de productos
     * @param {Object} options - Opciones de preparación
     * @returns {Promise<Array>} Datos preparados
     */
    async prepareInventoryData(products, options) {
        try {
            const inventoryData = [];

            for (const product of products) {
                const inventoryItem = {
                    id: options.generateIds ? this.generateUniqueId() : product.id,
                    codigo: product.codigo,
                    nombre: product.nombre,
                    marca: product.marca || '',
                    categoria: product.categoria || '',
                    unidad: product.unidad || 'UNIDAD',
                    cantidad: product.cantidad || 1,
                    precio: product.precio || 0,
                    lote: product.lote || await this.generateBatchNumber(product.codigo),
                    caducidad: product.caducidad || '',
                    comentarios: this.generateComments(product),
                    ubicacion: product.ubicacion || 'GENERAL',
                    fechaRegistro: new Date().toISOString(),
                    usuario: 'sistema',
                    sesionLote: product.sesionLote || this.generateUniqueId(),
                    
                    // Metadatos específicos de lotes
                    metadata: {
                        esLoteAvanzado: true,
                        tipoEscaneo: product.code128Data ? 'CODE128' : 'regular',
                        productoPrimario: product.primaryProduct?.codigo || null,
                        esSubproducto: !!product.primaryProduct,
                        datosOriginales: {
                            timestamp: product.timestamp,
                            extractedData: product.extractedData
                        }
                    }
                };

                // Agregar datos específicos de CODE128 si existen
                if (product.code128Data) {
                    inventoryItem.metadata.code128 = {
                        plu: product.plu,
                        precioPorcion: product.portionPrice,
                        peso: product.weight,
                        precioPorKilo: product.pricePerKilo,
                        digitoControl: product.code128Data.digitoControl
                    };
                }

                inventoryData.push(inventoryItem);
            }

            this.debug(`Datos de inventario preparados: ${inventoryData.length} items`);
            return inventoryData;

        } catch (error) {
            this.error('Error al preparar datos de inventario:', error);
            throw error;
        }
    }

    /**
     * Generar comentarios para el producto
     * @param {Object} product - Datos del producto
     * @returns {string} Comentarios generados
     */
    generateComments(product) {
        const comments = [];

        if (product.code128Data) {
            comments.push(`Producto por peso - PLU: ${product.plu}`);
            comments.push(`Peso: ${product.weight?.toFixed(3)}kg @ $${product.pricePerKilo}/kg`);
        }

        if (product.primaryProduct) {
            comments.push(`Subproducto de: ${product.primaryProduct.codigo} (${product.primaryProduct.nombre})`);
        }

        if (product.extractedData) {
            comments.push(`Código original: ${product.extractedData.originalCode}`);
        }

        return comments.join(' | ');
    }

    /**
     * Guardar datos en IndexedDB con reintentos
     * @param {Array} inventoryData - Datos de inventario
     * @returns {Promise<Array>} Resultados del guardado
     */
    async saveToIndexedDB(inventoryData) {
        const results = [];

        for (const item of inventoryData) {
            try {
                await this.saveItemToIndexedDBWithRetry(item);
                results.push({ id: item.id, success: true });
            } catch (error) {
                this.error(`Error al guardar item ${item.id} en IndexedDB:`, error);
                results.push({ id: item.id, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Guardar item individual en IndexedDB con reintentos
     * @param {Object} item - Item a guardar
     * @returns {Promise<void>}
     */
    async saveItemToIndexedDBWithRetry(item) {
        let lastError;

        for (let attempt = 1; attempt <= this.persistenceConfig.maxRetries; attempt++) {
            try {
                await this.saveItemToIndexedDB(item);
                return; // Éxito, salir
            } catch (error) {
                lastError = error;
                this.warn(`Intento ${attempt} fallido para item ${item.id}:`, error.message);
                
                if (attempt < this.persistenceConfig.maxRetries) {
                    await this.delay(this.persistenceConfig.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Guardar item individual en IndexedDB
     * @param {Object} item - Item a guardar
     * @returns {Promise<void>}
     */
    saveItemToIndexedDB(item) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.openDatabase('InventarioDB', 3);
                const transaction = db.transaction(['inventario'], 'readwrite');
                const objectStore = transaction.objectStore('inventario');

                const request = objectStore.put(item);
                
                request.onsuccess = () => {
                    this.debug(`Item ${item.id} guardado en IndexedDB`);
                    resolve();
                };
                
                request.onerror = (event) => {
                    reject(new Error(`Error IndexedDB: ${event.target.error?.message || 'Unknown error'}`));
                };
                
                transaction.onerror = (event) => {
                    reject(new Error(`Error de transacción: ${event.target.error?.message || 'Unknown error'}`));
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Sincronizar datos con Supabase
     * @param {Array} inventoryData - Datos de inventario
     * @returns {Promise<Object>} Resultado de la sincronización
     */
    async syncToSupabase(inventoryData) {
        try {
            // Importar función de auth
            const { getSupabase } = await import('../../../js/auth.js');
            const supabase = await getSupabase();

            // Preparar datos para Supabase (remover metadata compleja)
            const supabaseData = inventoryData.map(item => ({
                id: item.id,
                codigo: item.codigo,
                nombre: item.nombre,
                marca: item.marca,
                categoria: item.categoria,
                unidad: item.unidad,
                cantidad: item.cantidad,
                precio: item.precio,
                lote: item.lote,
                caducidad: item.caducidad,
                comentarios: item.comentarios,
                ubicacion: item.ubicacion,
                fecha_registro: item.fechaRegistro,
                usuario: item.usuario
            }));

            // Insertar en Supabase
            const { data, error } = await supabase
                .from('inventario')
                .upsert(supabaseData, { 
                    onConflict: 'id',
                    returning: 'minimal'
                });

            if (error) {
                throw error;
            }

            this.debug(`${supabaseData.length} items sincronizados con Supabase`);
            return { success: true, count: supabaseData.length };

        } catch (error) {
            this.error('Error al sincronizar con Supabase:', error);
            throw error;
        }
    }

    /**
     * Generar número de lote
     * @param {string} productCode - Código del producto
     * @returns {Promise<string>} Número de lote
     */
    async generateBatchNumber(productCode) {
        try {
            const { getSupabase } = await import('../../../js/auth.js');
            const supabase = await getSupabase();

            const { data, error } = await supabase
                .from('inventario')
                .select('lote')
                .eq('codigo', productCode)
                .order('lote', { ascending: false })
                .limit(1);

            if (error) {
                this.warn('Error al consultar lotes existentes:', error);
                return "1";
            }

            if (data && data.length > 0) {
                const lastBatch = data[0].lote;
                const batchNumber = parseInt(lastBatch) || 0;
                return String(batchNumber + 1);
            }

            return "1";

        } catch (error) {
            this.warn('Error al generar número de lote:', error);
            return "1";
        }
    }

    /**
     * Generar ID único
     * @returns {string} ID único
     */
    generateUniqueId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Procesar operaciones pendientes
     */
    async processPendingOperations() {
        if (this.isProcessing || this.pendingOperations.length === 0) {
            return;
        }

        this.isProcessing = true;
        
        try {
            while (this.pendingOperations.length > 0) {
                const operation = this.pendingOperations.shift();
                try {
                    await this.executeOperation(operation);
                } catch (error) {
                    this.error('Error al procesar operación pendiente:', error);
                    operation.reject(error);
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Ejecutar operación
     * @param {Object} operation - Operación a ejecutar
     */
    async executeOperation(operation) {
        switch (operation.type) {
            case 'saveBatch':
                const result = await this.saveBatchInventory(operation.data.products, operation.data.options);
                operation.resolve(result);
                break;
            default:
                throw new Error(`Tipo de operación desconocido: ${operation.type}`);
        }
    }

    /**
     * Agregar operación a la cola
     * @param {string} type - Tipo de operación
     * @param {Object} data - Datos de la operación
     * @returns {Promise} Promesa de la operación
     */
    queueOperation(type, data) {
        return new Promise((resolve, reject) => {
            this.pendingOperations.push({
                type,
                data,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Procesar inmediatamente si no está procesando
            if (!this.isProcessing) {
                this.processPendingOperations();
            }
        });
    }

    /**
     * Actualizar estadísticas
     * @param {number} count - Cantidad de items procesados
     * @param {number} duration - Duración en ms
     * @param {boolean} success - Si fue exitoso
     */
    updateStats(count, duration, success) {
        if (success) {
            this.stats.totalSaved += count;
            this.stats.lastSaveTime = Date.now();
            
            // Calcular promedio de tiempo de guardado
            if (this.stats.averageSaveTime === 0) {
                this.stats.averageSaveTime = duration;
            } else {
                this.stats.averageSaveTime = (this.stats.averageSaveTime + duration) / 2;
            }
        } else {
            this.stats.totalErrors++;
        }

        this.emit('statsUpdated', this.stats);
    }

    /**
     * Delay helper
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            persistenceStats: this.stats,
            pendingOperations: this.pendingOperations.length,
            isProcessing: this.isProcessing,
            configuration: this.persistenceConfig
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            // Cancelar operaciones pendientes
            this.pendingOperations.forEach(operation => {
                operation.reject(new Error('Servicio siendo limpiado'));
            });
            this.pendingOperations = [];
            
            // Resetear estado
            this.isProcessing = false;

            super.cleanup();
            this.debug('Recursos de BatchPersistenceService limpiados');

        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const batchPersistenceService = new BatchPersistenceService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        batchPersistenceService.initialize().catch(error => {
            console.warn('BatchPersistenceService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        batchPersistenceService.initialize().catch(error => {
            console.warn('BatchPersistenceService auto-inicialización falló:', error.message);
        });
    }
}

export default BatchPersistenceService;
