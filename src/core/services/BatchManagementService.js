/**
 * BatchManagementService - Servicio especializado para gestión de lotes
 * 
 * Este servicio maneja la creación, agrupación y gestión de productos en lotes,
 * incluyendo productos por peso, subproductos y precios por kilo.
 * 
 * @class BatchManagementService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';

class BatchManagementService extends BaseService {
    constructor() {
        super('BatchManagementService');
        
        // Productos escaneados y agrupados
        this.scannedProducts = [];
        this.groupedProducts = [];
        
        // Diccionario de subproductos (PLU -> código primario)
        this.subproductDictionary = new Map();
        
        // Precios por kilo guardados (PLU -> precio por kilo)
        this.savedPricesPerKilo = new Map();
        
        // Configuración de lotes
        this.batchConfig = {
            autoGroup: true,
            pricePerKilo: 100.00, // Precio temporal por defecto
            confirmSimilarProducts: false
        };
        
        // Contadores
        this.counters = {
            totalProducts: 0,
            uniqueProducts: 0,
            totalValue: 0
        };
        
        this.debug('BatchManagementService inicializado');
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
            this.debug('Inicializando BatchManagementService...');

            // Cargar configuración guardada
            await this.loadConfiguration();
            
            // Cargar diccionario de subproductos
            await this.loadSubproductDictionary();
            
            // Cargar precios guardados
            await this.loadSavedPrices();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('BatchManagementService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar BatchManagementService:', error);
            throw error;
        }
    }

    /**
     * Cargar configuración guardada
     */
    async loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('batch_management_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.batchConfig = { ...this.batchConfig, ...config };
                this.debug('Configuración cargada:', this.batchConfig);
            }
        } catch (error) {
            this.warn('Error al cargar configuración:', error);
        }
    }

    /**
     * Guardar configuración
     */
    async saveConfiguration() {
        try {
            localStorage.setItem('batch_management_config', JSON.stringify(this.batchConfig));
            this.debug('Configuración guardada');
            this.emit('configurationSaved', this.batchConfig);
        } catch (error) {
            this.error('Error al guardar configuración:', error);
        }
    }

    /**
     * Cargar diccionario de subproductos desde Supabase
     */
    async loadSubproductDictionary() {
        try {
            this.debug('Cargando diccionario de subproductos...');

            // Importar función de auth
            const { getSupabase } = await import('../../../js/auth.js');
            const supabase = await getSupabase();

            const { data, error } = await supabase
                .from('productos_subproductos')
                .select(`
                    id,
                    principalproductid,
                    subproductid
                `);

            if (error) {
                throw error;
            }

            // Limpiar diccionario existente
            this.subproductDictionary.clear();

            // Llenar diccionario
            if (data && data.length > 0) {
                data.forEach(item => {
                    this.subproductDictionary.set(
                        item.subproductid.toString(),
                        item.principalproductid.toString()
                    );
                });

                this.debug(`Diccionario cargado con ${this.subproductDictionary.size} relaciones`);
                this.emit('dictionaryLoaded', { 
                    count: this.subproductDictionary.size,
                    entries: Array.from(this.subproductDictionary.entries())
                });
            } else {
                this.debug('No se encontraron relaciones de subproductos');
            }

        } catch (error) {
            this.error('Error al cargar diccionario de subproductos:', error);
            this.subproductDictionary.clear();
            this.emit('dictionaryError', { error: error.message });
        }
    }

    /**
     * Cargar precios guardados
     */
    async loadSavedPrices() {
        try {
            const savedPrices = localStorage.getItem('saved_prices_per_kilo');
            if (savedPrices) {
                const prices = JSON.parse(savedPrices);
                this.savedPricesPerKilo = new Map(prices);
                this.debug(`Precios cargados: ${this.savedPricesPerKilo.size} entradas`);
            }
        } catch (error) {
            this.warn('Error al cargar precios guardados:', error);
        }
    }

    /**
     * Guardar precios por kilo
     */
    async savePrices() {
        try {
            const pricesArray = Array.from(this.savedPricesPerKilo.entries());
            localStorage.setItem('saved_prices_per_kilo', JSON.stringify(pricesArray));
            this.debug('Precios guardados');
            this.emit('pricesSaved', { count: this.savedPricesPerKilo.size });
        } catch (error) {
            this.error('Error al guardar precios:', error);
        }
    }

    /**
     * Iniciar nueva sesión de lotes
     */
    startBatchSession() {
        try {
            // Limpiar arrays
            this.scannedProducts = [];
            this.groupedProducts = [];
            
            // Resetear contadores
            this.counters = {
                totalProducts: 0,
                uniqueProducts: 0,
                totalValue: 0
            };
            
            this.debug('Nueva sesión de lotes iniciada');
            this.emit('batchSessionStarted');
            
            return {
                sessionId: this.generateUniqueId(),
                startTime: new Date().toISOString(),
                products: this.scannedProducts,
                groupedProducts: this.groupedProducts
            };

        } catch (error) {
            this.error('Error al iniciar sesión de lotes:', error);
            throw error;
        }
    }

    /**
     * Agregar producto al lote
     * @param {Object} productData - Datos del producto
     * @param {Object} extractedData - Datos extraídos del código (opcional)
     * @returns {Object} Producto agregado
     */
    async addProductToBatch(productData, extractedData = null) {
        try {
            if (!productData || !productData.codigo) {
                throw new Error('Datos de producto requeridos');
            }

            // Generar ID único para el producto en el lote
            const batchId = this.generateUniqueId();
            
            // Buscar producto primario si es subproducto
            const primaryProduct = await this.findPrimaryProduct(productData.codigo);
            
            // Crear entrada del producto
            const productEntry = {
                id: batchId,
                codigo: productData.codigo,
                nombre: productData.nombre,
                marca: productData.marca || '',
                categoria: productData.categoria || '',
                unidad: productData.unidad || 'UNIDAD',
                precio: productData.precio || 0,
                cantidad: 1,
                lote: await this.generateBatchNumber(productData.codigo),
                timestamp: new Date().toISOString(),
                extractedData: extractedData,
                primaryProduct: primaryProduct,
                isPrimary: !primaryProduct || primaryProduct.codigo === productData.codigo
            };

            // Si tiene datos extraídos (CODE128), procesar peso y precio
            if (extractedData) {
                await this.processWeightedProduct(productEntry, extractedData);
            }

            // Verificar si el producto ya existe
            const existingProduct = this.findExistingProduct(productEntry);
            
            if (existingProduct && this.batchConfig.confirmSimilarProducts) {
                // Emitir evento para confirmación
                this.emit('productConfirmationRequired', { 
                    newProduct: productEntry,
                    existingProduct 
                });
                return { requiresConfirmation: true, productEntry, existingProduct };
            }

            // Agregar producto al lote
            this.scannedProducts.push(productEntry);
            
            // Agrupar automáticamente si está habilitado
            if (this.batchConfig.autoGroup) {
                this.groupProducts();
            }
            
            // Actualizar contadores
            this.updateCounters();
            
            this.debug('Producto agregado al lote:', productEntry);
            this.emit('productAddedToBatch', { product: productEntry });
            
            return { success: true, product: productEntry };

        } catch (error) {
            this.error('Error al agregar producto al lote:', error);
            throw error;
        }
    }

    /**
     * Procesar producto con peso (CODE128)
     * @param {Object} productEntry - Entrada del producto
     * @param {Object} extractedData - Datos extraídos
     */
    async processWeightedProduct(productEntry, extractedData) {
        try {
            const plu = extractedData.plu;
            
            // Buscar precio por kilo guardado
            let pricePerKilo = this.savedPricesPerKilo.get(plu);
            
            if (!pricePerKilo) {
                // Usar precio temporal y solicitar confirmación
                pricePerKilo = this.batchConfig.pricePerKilo;
                this.emit('priceConfirmationRequired', { 
                    plu, 
                    temporaryPrice: pricePerKilo,
                    extractedData 
                });
            }

            // Calcular peso real
            const realWeight = extractedData.precioPorcion / pricePerKilo;
            
            // Actualizar entrada del producto
            productEntry.plu = plu;
            productEntry.pricePerKilo = pricePerKilo;
            productEntry.portionPrice = extractedData.precioPorcion;
            productEntry.weight = realWeight;
            productEntry.unidad = 'KG';
            productEntry.cantidad = realWeight;
            productEntry.precio = extractedData.precioPorcion;
            
            // Agregar metadatos de CODE128
            productEntry.code128Data = {
                ...extractedData,
                pricePerKilo,
                realWeight
            };

            this.debug(`Producto por peso procesado - PLU: ${plu}, Peso: ${realWeight.toFixed(3)}kg, Precio: $${extractedData.precioPorcion}`);

        } catch (error) {
            this.error('Error al procesar producto por peso:', error);
            throw error;
        }
    }

    /**
     * Buscar producto primario para un subproducto
     * @param {string} productCode - Código del producto
     * @returns {Object|null} Producto primario o null
     */
    async findPrimaryProduct(productCode) {
        try {
            // Verificar si es subproducto
            const primaryCode = this.subproductDictionary.get(productCode);
            
            if (!primaryCode || primaryCode === productCode) {
                return null; // No es subproducto o es el mismo
            }

            // Buscar producto primario en la base de datos
            const { buscarPorCodigoParcial } = await import('../../../js/product-operations.js');
            const results = await buscarPorCodigoParcial(primaryCode, 'productos');
            
            if (results && results.length > 0) {
                const primaryProduct = results.find(p => p.codigo === primaryCode);
                if (primaryProduct) {
                    this.debug(`Producto primario encontrado: ${primaryCode} para subproducto: ${productCode}`);
                    return primaryProduct;
                }
            }

            return null;

        } catch (error) {
            this.error('Error al buscar producto primario:', error);
            return null;
        }
    }

    /**
     * Buscar producto existente en el lote
     * @param {Object} productEntry - Entrada del producto
     * @returns {Object|null} Producto existente o null
     */
    findExistingProduct(productEntry) {
        // Buscar por código exacto primero
        let existing = this.scannedProducts.find(p => p.codigo === productEntry.codigo);
        
        if (existing) {
            return existing;
        }

        // Si tiene producto primario, buscar por código primario
        if (productEntry.primaryProduct) {
            existing = this.scannedProducts.find(p => 
                p.primaryProduct && 
                p.primaryProduct.codigo === productEntry.primaryProduct.codigo
            );
        }

        return existing;
    }

    /**
     * Agrupar productos por producto primario
     */
    groupProducts() {
        try {
            const grouped = new Map();

            this.scannedProducts.forEach(product => {
                const groupKey = product.primaryProduct ? 
                    product.primaryProduct.codigo : 
                    product.codigo;

                if (!grouped.has(groupKey)) {
                    grouped.set(groupKey, {
                        primaryCode: groupKey,
                        primaryProduct: product.primaryProduct || product,
                        products: [],
                        totalQuantity: 0,
                        totalValue: 0,
                        count: 0
                    });
                }

                const group = grouped.get(groupKey);
                group.products.push(product);
                group.totalQuantity += product.cantidad || 1;
                group.totalValue += product.precio || 0;
                group.count++;
            });

            this.groupedProducts = Array.from(grouped.values());
            
            this.debug(`Productos agrupados: ${this.groupedProducts.length} grupos`);
            this.emit('productsGrouped', { groups: this.groupedProducts });

        } catch (error) {
            this.error('Error al agrupar productos:', error);
        }
    }

    /**
     * Actualizar contadores
     */
    updateCounters() {
        try {
            this.counters.totalProducts = this.scannedProducts.length;
            this.counters.uniqueProducts = this.groupedProducts.length;
            this.counters.totalValue = this.scannedProducts.reduce((sum, p) => sum + (p.precio || 0), 0);
            
            this.emit('countersUpdated', this.counters);

        } catch (error) {
            this.error('Error al actualizar contadores:', error);
        }
    }

    /**
     * Eliminar producto del lote
     * @param {string} productId - ID del producto
     * @returns {boolean} True si se eliminó exitosamente
     */
    removeProductFromBatch(productId) {
        try {
            const initialLength = this.scannedProducts.length;
            this.scannedProducts = this.scannedProducts.filter(p => p.id !== productId);
            
            const removed = this.scannedProducts.length < initialLength;
            
            if (removed) {
                // Reagrupar y actualizar contadores
                if (this.batchConfig.autoGroup) {
                    this.groupProducts();
                }
                this.updateCounters();
                
                this.debug(`Producto eliminado del lote: ${productId}`);
                this.emit('productRemovedFromBatch', { productId });
            }
            
            return removed;

        } catch (error) {
            this.error('Error al eliminar producto del lote:', error);
            return false;
        }
    }

    /**
     * Actualizar precio por kilo
     * @param {string} plu - PLU del producto
     * @param {number} pricePerKilo - Precio por kilo
     */
    updatePricePerKilo(plu, pricePerKilo) {
        try {
            this.savedPricesPerKilo.set(plu, pricePerKilo);
            this.savePrices();
            
            // Recalcular productos existentes con este PLU
            this.scannedProducts.forEach(product => {
                if (product.plu === plu && product.code128Data) {
                    const realWeight = product.portionPrice / pricePerKilo;
                    product.pricePerKilo = pricePerKilo;
                    product.weight = realWeight;
                    product.cantidad = realWeight;
                    product.code128Data.pricePerKilo = pricePerKilo;
                    product.code128Data.realWeight = realWeight;
                }
            });

            // Reagrupar y actualizar contadores
            if (this.batchConfig.autoGroup) {
                this.groupProducts();
            }
            this.updateCounters();
            
            this.debug(`Precio por kilo actualizado - PLU: ${plu}, Precio: $${pricePerKilo}`);
            this.emit('pricePerKiloUpdated', { plu, pricePerKilo });

        } catch (error) {
            this.error('Error al actualizar precio por kilo:', error);
            throw error;
        }
    }

    /**
     * Generar número de lote
     * @param {string} productCode - Código del producto
     * @returns {Promise<string>} Número de lote generado
     */
    async generateBatchNumber(productCode) {
        try {
            // Importar función de auth
            const { getSupabase } = await import('../../../js/auth.js');
            const supabase = await getSupabase();

            const { data, error } = await supabase
                .from('inventario')
                .select('lote')
                .eq('codigo', productCode)
                .order('lote', { ascending: false })
                .limit(1);

            if (error) {
                this.error('Error al buscar lotes existentes:', error);
                return "1";
            }

            if (data && data.length > 0) {
                const lastBatch = data[0].lote;
                const batchNumber = parseInt(lastBatch) || 0;
                return String(batchNumber + 1);
            } else {
                return "1";
            }

        } catch (error) {
            this.error('Error al generar número de lote:', error);
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
     * Obtener productos escaneados
     * @returns {Array} Lista de productos escaneados
     */
    getScannedProducts() {
        return [...this.scannedProducts];
    }

    /**
     * Obtener productos agrupados
     * @returns {Array} Lista de productos agrupados
     */
    getGroupedProducts() {
        return [...this.groupedProducts];
    }

    /**
     * Obtener contadores
     * @returns {Object} Contadores actuales
     */
    getCounters() {
        return { ...this.counters };
    }

    /**
     * Obtener configuración
     * @returns {Object} Configuración actual
     */
    getConfiguration() {
        return { ...this.batchConfig };
    }

    /**
     * Actualizar configuración
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfiguration(newConfig) {
        this.batchConfig = { ...this.batchConfig, ...newConfig };
        this.saveConfiguration();
        this.emit('configurationUpdated', this.batchConfig);
    }

    /**
     * Limpiar sesión actual
     */
    clearSession() {
        this.scannedProducts = [];
        this.groupedProducts = [];
        this.counters = {
            totalProducts: 0,
            uniqueProducts: 0,
            totalValue: 0
        };
        
        this.debug('Sesión de lotes limpiada');
        this.emit('sessionCleared');
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            scannedProductsCount: this.scannedProducts.length,
            groupedProductsCount: this.groupedProducts.length,
            subproductDictionarySize: this.subproductDictionary.size,
            savedPricesCount: this.savedPricesPerKilo.size,
            counters: this.counters,
            configuration: this.batchConfig
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            // Limpiar sesión
            this.clearSession();
            
            // Limpiar mapas
            this.subproductDictionary.clear();
            this.savedPricesPerKilo.clear();

            super.cleanup();
            this.debug('Recursos de BatchManagementService limpiados');

        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const batchManagementService = new BatchManagementService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        batchManagementService.initialize().catch(error => {
            console.warn('BatchManagementService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        batchManagementService.initialize().catch(error => {
            console.warn('BatchManagementService auto-inicialización falló:', error.message);
        });
    }
}

export default BatchManagementService;
