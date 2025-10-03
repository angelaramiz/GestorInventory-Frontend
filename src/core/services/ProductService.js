/**
 * ProductService - Servicio para operaciones de productos
 * 
 * Extrae la lógica de negocio relacionada con:
 * - Gestión de catálogo de productos
 * - Sincronización con FastAPI
 * - Búsquedas y filtros avanzados
 * - Categorización y organización
 * - Códigos de barras y QR
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseService } from './BaseService.js';
// NO importar logs.js - usar this.showMessage() y this.showToast() de BaseService
import { Product } from '../models/Product.js';

export class ProductService extends BaseService {
    constructor() {
        super('ProductService');
        this.searchCache = new Map();
        this.lastSyncTime = null;
        this.syncInterval = 5 * 60 * 1000; // 5 minutos
        this.fastApiEndpoint = localStorage.getItem('fastapi_endpoint') || '';
    }

    /**
     * Inicializar el serv    /**
     * Obtener servicio por nombre (placeholder)
     * @param {string} serviceName - Nombre del servicio
     * @returns {Object} Instancia del servicio
     */
    getService(serviceName) {
        // Esta implementación debe ser proporcionada por el ServiceManager
        // Por ahora es un placeholder para sistema de conteo
        return {
            getProductStock: async () => ({ cantidad_actual: 0 })
        };
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        this.log('Inicializando ProductService');
        
        // Configurar sincronización automática
        this.setupAutoSync();
        
        // Configurar listeners de búsqueda
        this.setupSearchOptimizations();
        
        this.isInitialized = true;
        this.startTime = Date.now();
        this.log('ProductService inicializado correctamente');
    }

    // ========================================
    // OPERACIONES PRINCIPALES DE PRODUCTOS
    // ========================================

    /**
     * Buscar productos con filtros avanzados
     * @param {Object} searchParams - Parámetros de búsqueda
     * @returns {Promise<Array>} Lista de productos
     */
    async searchProducts(searchParams = {}) {
        return this.executeOperation(async () => {
            const productRepository = this.getRepository('product');
            
            // Generar clave de caché
            const cacheKey = this.generateSearchCacheKey(searchParams);
            
            // Verificar caché
            if (this.searchCache.has(cacheKey)) {
                const cached = this.searchCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 30000) { // 30 segundos
                    this.log('Retornando resultados desde caché');
                    return cached.results;
                }
            }
            
            // Construir filtros
            const filters = this.buildSearchFilters(searchParams);
            
            // Buscar en repositorio
            const products = await productRepository.findAll(filters);
            
            // Aplicar ordenamiento
            const sortedProducts = this.sortSearchResults(products, searchParams.sortBy);
            
            // Enriquecer resultados
            const enrichedProducts = await this.enrichProductData(sortedProducts, searchParams);
            
            // Guardar en caché
            this.searchCache.set(cacheKey, {
                results: enrichedProducts,
                timestamp: Date.now()
            });
            
            // Limpiar caché viejo
            this.cleanSearchCache();
            
            return enrichedProducts;
            
        }, 'searchProducts');
    }

    /**
     * Obtener producto por ID
     * @param {string} productId - ID del producto
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Producto completo
     */
    async getProductById(productId, options = {}) {
        return this.executeOperation(async () => {
            const productRepository = this.getRepository('product');
            
            const product = await productRepository.findById(productId);
            if (!product) {
                throw new Error(`Producto ${productId} no encontrado`);
            }
            
            // Enriquecer con información adicional si se solicita
            if (options.includeStock) {
                const inventoryService = this.getService('inventory');
                product.stock_info = await inventoryService.getProductStock(productId);
            }
            
            if (options.includeHistory) {
                product.price_history = await this.getProductPriceHistory(productId);
            }
            
            if (options.includeRelated) {
                product.related_products = await this.getRelatedProducts(productId);
            }
            
            return product;
            
        }, 'getProductById');
    }

    /**
     * Crear nuevo producto
     * @param {Object} productData - Datos del producto
     * @returns {Promise<Object>} Producto creado
     */
    async createProduct(productData) {
        return this.executeOperation(async () => {
            // Validar datos
            const validation = this.validateProductData(productData);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }
            
            // Verificar código único
            await this.ensureUniqueCode(productData.codigo, null);
            
            const productRepository = this.getRepository('product');
            
            // Enriquecer datos del producto
            const enrichedData = {
                ...productData,
                id: productData.id || this.generateId(),
                fecha_creacion: new Date().toISOString(),
                fecha_actualizacion: new Date().toISOString(),
                usuario_creacion: this.getCurrentUserId(),
                estado: productData.estado || 'active'
            };
            
            // Generar código de barras si no existe
            if (!enrichedData.codigo_barras && enrichedData.codigo) {
                enrichedData.codigo_barras = await this.generateBarcode(enrichedData.codigo);
            }
            
            const product = await productRepository.create(enrichedData);
            
            // Sincronizar con FastAPI si está configurado
            if (this.shouldSyncWithFastAPI()) {
                await this.syncProductToFastAPI(product);
            }
            
            // Limpiar caché de búsqueda
            this.clearSearchCache();
            
            this.emit('productCreated', product);
            
            return product;
            
        }, 'createProduct', {
            successMessage: 'Producto creado correctamente'
        });
    }

    /**
     * Actualizar producto existente
     * @param {string} productId - ID del producto
     * @param {Object} updateData - Datos a actualizar
     * @returns {Promise<Object>} Producto actualizado
     */
    async updateProduct(productId, updateData) {
        return this.executeOperation(async () => {
            // Validar datos
            const validation = this.validateProductData(updateData, false);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }
            
            const productRepository = this.getRepository('product');
            
            // Obtener producto actual
            const currentProduct = await productRepository.findById(productId);
            if (!currentProduct) {
                throw new Error(`Producto ${productId} no encontrado`);
            }
            
            // Verificar código único si se está cambiando
            if (updateData.codigo && updateData.codigo !== currentProduct.codigo) {
                await this.ensureUniqueCode(updateData.codigo, productId);
            }
            
            // Preparar datos de actualización
            const updatePayload = {
                ...updateData,
                fecha_actualizacion: new Date().toISOString(),
                usuario_actualizacion: this.getCurrentUserId()
            };
            
            // Actualizar código de barras si el código cambió
            if (updateData.codigo && updateData.codigo !== currentProduct.codigo) {
                updatePayload.codigo_barras = await this.generateBarcode(updateData.codigo);
            }
            
            const updatedProduct = await productRepository.update(productId, updatePayload);
            
            // Sincronizar con FastAPI si está configurado
            if (this.shouldSyncWithFastAPI()) {
                await this.syncProductToFastAPI(updatedProduct);
            }
            
            // Limpiar caché de búsqueda
            this.clearSearchCache();
            
            this.emit('productUpdated', {
                previous: currentProduct,
                updated: updatedProduct
            });
            
            return updatedProduct;
            
        }, 'updateProduct', {
            successMessage: 'Producto actualizado correctamente'
        });
    }

    /**
     * Eliminar producto
     * @param {string} productId - ID del producto
     * @param {Object} options - Opciones de eliminación
     * @returns {Promise<boolean>} Resultado de la eliminación
     */
    async deleteProduct(productId, options = {}) {
        return this.executeOperation(async () => {
            const productRepository = this.getRepository('product');
            
            // Verificar que el producto existe
            const product = await productRepository.findById(productId);
            if (!product) {
                throw new Error(`Producto ${productId} no encontrado`);
            }
            
            // Verificar dependencias si se solicita
            if (options.checkDependencies !== false) {
                await this.checkProductDependencies(productId);
            }
            
            // Eliminación lógica por defecto
            if (options.hardDelete) {
                await productRepository.delete(productId);
            } else {
                await productRepository.update(productId, {
                    estado: 'deleted',
                    fecha_eliminacion: new Date().toISOString(),
                    usuario_eliminacion: this.getCurrentUserId()
                });
            }
            
            // Sincronizar eliminación con FastAPI
            if (this.shouldSyncWithFastAPI()) {
                await this.syncProductDeletionToFastAPI(productId, options.hardDelete);
            }
            
            // Limpiar caché
            this.clearSearchCache();
            
            this.emit('productDeleted', {
                productId,
                product,
                hardDelete: options.hardDelete
            });
            
            return true;
            
        }, 'deleteProduct', {
            successMessage: 'Producto eliminado correctamente'
        });
    }

    // ========================================
    // SINCRONIZACIÓN CON FASTAPI
    // ========================================

    /**
     * Sincronizar todos los productos con FastAPI
     * @param {Object} options - Opciones de sincronización
     * @returns {Promise<Object>} Resultado de la sincronización
     */
    async syncWithFastAPI(options = {}) {
        return this.executeOperation(async () => {
            if (!this.shouldSyncWithFastAPI()) {
                throw new Error('FastAPI no está configurado para sincronización');
            }
            
            const productRepository = this.getRepository('product');
            
            // Obtener productos locales
            const localProducts = await productRepository.findAll({
                estado: 'active'
            });
            
            // Obtener productos de FastAPI
            const remoteProducts = await this.fetchProductsFromFastAPI();
            
            const syncResults = {
                created: 0,
                updated: 0,
                deleted: 0,
                errors: []
            };
            
            // Procesar productos remotos
            for (const remoteProduct of remoteProducts) {
                try {
                    const localProduct = localProducts.find(p => p.codigo === remoteProduct.codigo);
                    
                    if (!localProduct) {
                        // Crear producto local
                        await this.createProduct(this.adaptFastAPIProduct(remoteProduct));
                        syncResults.created++;
                    } else if (this.shouldUpdateLocalProduct(localProduct, remoteProduct)) {
                        // Actualizar producto local
                        await this.updateProduct(localProduct.id, this.adaptFastAPIProduct(remoteProduct));
                        syncResults.updated++;
                    }
                } catch (error) {
                    syncResults.errors.push({
                        product: remoteProduct.codigo,
                        error: error.message
                    });
                }
            }
            
            // Marcar productos eliminados en remoto
            if (options.deleteRemoved) {
                const remoteCodes = new Set(remoteProducts.map(p => p.codigo));
                for (const localProduct of localProducts) {
                    if (!remoteCodes.has(localProduct.codigo)) {
                        try {
                            await this.deleteProduct(localProduct.id, { hardDelete: false });
                            syncResults.deleted++;
                        } catch (error) {
                            syncResults.errors.push({
                                product: localProduct.codigo,
                                error: error.message
                            });
                        }
                    }
                }
            }
            
            this.lastSyncTime = Date.now();
            localStorage.setItem('last_fastapi_sync', this.lastSyncTime.toString());
            
            this.emit('fastApiSyncCompleted', syncResults);
            
            return syncResults;
            
        }, 'syncWithFastAPI', {
            requiresOnline: true,
            successMessage: 'Sincronización con FastAPI completada'
        });
    }

    /**
     * Sincronizar producto individual con FastAPI
     * @param {Object} product - Producto a sincronizar
     */
    async syncProductToFastAPI(product) {
        if (!this.shouldSyncWithFastAPI()) {
            return;
        }
        
        try {
            const endpoint = `${this.fastApiEndpoint}/products`;
            const token = localStorage.getItem('fastapi_token');
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(this.adaptProductForFastAPI(product))
            });
            
            if (!response.ok) {
                throw new Error(`Error sincronizando con FastAPI: ${response.statusText}`);
            }
            
            this.log(`Producto ${product.codigo} sincronizado con FastAPI`);
            
        } catch (error) {
            this.log(`Error sincronizando producto ${product.codigo} con FastAPI: ${error.message}`, 'error');
            // No relanzar el error para no interrumpir operaciones locales
        }
    }

    // ========================================
    // BÚSQUEDA Y FILTROS
    // ========================================

    /**
     * Buscar producto por código de barras
     * @param {string} barcode - Código de barras
     * @returns {Promise<Object|null>} Producto encontrado
     */
    async findByBarcode(barcode) {
        return this.executeOperation(async () => {
            const productRepository = this.getRepository('product');
            
            // Buscar por código de barras exacto
            let products = await productRepository.findAll({
                codigo_barras: barcode,
                estado: 'active'
            });
            
            // Si no se encuentra, buscar por código
            if (products.length === 0) {
                products = await productRepository.findAll({
                    codigo: barcode,
                    estado: 'active'
                });
            }
            
            return products.length > 0 ? products[0] : null;
            
        }, 'findByBarcode');
    }

    /**
     * Buscar productos por texto
     * @param {string} searchText - Texto de búsqueda
     * @param {Object} options - Opciones de búsqueda
     * @returns {Promise<Array>} Productos encontrados
     */
    async searchByText(searchText, options = {}) {
        return this.executeOperation(async () => {
            if (!searchText || searchText.trim().length < 2) {
                return [];
            }
            
            const searchParams = {
                text: searchText.trim(),
                limit: options.limit || 50,
                includeInactive: options.includeInactive || false,
                sortBy: options.sortBy || 'relevance'
            };
            
            return this.searchProducts(searchParams);
            
        }, 'searchByText');
    }

    /**
     * Obtener productos por categoría
     * @param {string} categoryId - ID de categoría
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Array>} Productos de la categoría
     */
    async getProductsByCategory(categoryId, options = {}) {
        return this.executeOperation(async () => {
            const searchParams = {
                categoria_id: categoryId,
                includeInactive: options.includeInactive || false,
                sortBy: options.sortBy || 'nombre',
                limit: options.limit
            };
            
            return this.searchProducts(searchParams);
            
        }, 'getProductsByCategory');
    }

    /**
     * Obtener productos relacionados
     * @param {string} productId - ID del producto
     * @returns {Promise<Array>} Productos relacionados
     */
    async getRelatedProducts(productId) {
        return this.executeOperation(async () => {
            const productRepository = this.getRepository('product');
            
            const product = await productRepository.findById(productId);
            if (!product) {
                return [];
            }
            
            // Buscar productos de la misma categoría
            const related = await productRepository.findAll({
                categoria_id: product.categoria_id,
                estado: 'active'
            });
            
            // Filtrar el producto actual y limitar resultados
            return related
                .filter(p => p.id !== productId)
                .slice(0, 10);
                
        }, 'getRelatedProducts');
    }

    // ========================================
    // CÓDIGOS DE BARRAS Y QR
    // ========================================

    /**
     * Generar código de barras para un producto
     * @param {string} code - Código del producto
     * @returns {Promise<string>} Código de barras generado
     */
    async generateBarcode(code) {
        return this.executeOperation(async () => {
            // Verificar que la librería JsBarcode esté disponible
            if (typeof JsBarcode === 'undefined') {
                throw new Error('Librería JsBarcode no está disponible');
            }
            
            // Crear canvas temporal
            const canvas = document.createElement('canvas');
            
            try {
                // Generar código de barras
                JsBarcode(canvas, code, {
                    format: "CODE128",
                    width: 2,
                    height: 100,
                    displayValue: true
                });
                
                // Convertir a base64
                const barcodeData = canvas.toDataURL('image/png');
                
                this.log(`Código de barras generado para: ${code}`);
                return barcodeData;
                
            } catch (error) {
                this.log(`Error generando código de barras para ${code}: ${error.message}`, 'error');
                return null;
            }
            
        }, 'generateBarcode');
    }

    /**
     * Generar código QR para un producto
     * @param {Object} product - Producto
     * @returns {Promise<string>} Código QR generado
     */
    async generateQRCode(product) {
        return this.executeOperation(async () => {
            // Crear datos para el QR
            const qrData = {
                id: product.id,
                codigo: product.codigo,
                nombre: product.nombre,
                precio: product.precio_venta,
                timestamp: new Date().toISOString()
            };
            
            const qrString = JSON.stringify(qrData);
            
            // En una implementación real, aquí se generaría el QR
            // Por ahora retornamos los datos
            this.log(`Datos QR generados para producto: ${product.codigo}`);
            return qrString;
            
        }, 'generateQRCode');
    }

    // ========================================
    // UTILIDADES Y HELPERS
    // ========================================

    /**
     * Construir filtros de búsqueda
     * @param {Object} searchParams - Parámetros de búsqueda
     * @returns {Object} Filtros construidos
     */
    buildSearchFilters(searchParams) {
        const filters = {};
        
        // Filtro de texto
        if (searchParams.text) {
            filters.search_text = searchParams.text;
        }
        
        // Filtros específicos
        if (searchParams.categoria_id) {
            filters.categoria_id = searchParams.categoria_id;
        }
        
        if (searchParams.area_id) {
            filters.area_id = searchParams.area_id;
        }
        
        if (searchParams.proveedor_id) {
            filters.proveedor_id = searchParams.proveedor_id;
        }
        
        // Filtro de estado
        if (!searchParams.includeInactive) {
            filters.estado = 'active';
        }
        
        // Filtros de fecha de vencimiento si aplica
        if (searchParams.fecha_vencimiento_desde) {
            filters.fecha_vencimiento_gte = searchParams.fecha_vencimiento_desde;
        }
        
        if (searchParams.fecha_vencimiento_hasta) {
            filters.fecha_vencimiento_lte = searchParams.fecha_vencimiento_hasta;
        }
        
        // Límite de resultados
        if (searchParams.limit) {
            filters.limit = searchParams.limit;
        }
        
        return filters;
    }

    /**
     * Ordenar resultados de búsqueda
     * @param {Array} products - Productos a ordenar
     * @param {string} sortBy - Criterio de ordenamiento
     * @returns {Array} Productos ordenados
     */
    sortSearchResults(products, sortBy = 'nombre') {
        return products.sort((a, b) => {
            switch (sortBy) {
                case 'nombre':
                    return (a.nombre || '').localeCompare(b.nombre || '');
                    
                case 'codigo':
                    return (a.codigo || '').localeCompare(b.codigo || '');
                    
                case 'fecha_vencimiento':
                    return new Date(a.fecha_vencimiento || '9999-12-31') - new Date(b.fecha_vencimiento || '9999-12-31');
                    
                case 'fecha_creacion':
                    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
                    
                case 'relevance':
                default:
                    // Por ahora usa orden alfabético
                    return (a.nombre || '').localeCompare(b.nombre || '');
            }
        });
    }

    /**
     * Enriquecer datos de productos (sin cálculos de precio/margen)
     * @param {Array} products - Productos a enriquecer
     * @param {Object} searchParams - Parámetros de búsqueda
     * @returns {Promise<Array>} Productos enriquecidos
     */
    async enrichProductData(products, searchParams = {}) {
        const enriched = [];
        
        for (const product of products) {
            const enrichedProduct = { ...product };
            
            // Añadir información de conteo si se solicita
            if (searchParams.includeStock) {
                try {
                    const inventoryService = this.getService('inventory');
                    enrichedProduct.count_info = await inventoryService.getProductStock(product.id);
                } catch (error) {
                    // No fallar si no se puede obtener info de conteo
                    enrichedProduct.count_info = null;
                }
            }
            
            // Estado de disponibilidad
            enrichedProduct.disponible = product.estado === 'active';
            
            // Información de fechas de vencimiento si aplica
            if (product.fecha_vencimiento) {
                const daysUntilExpiry = this.calculateDaysUntilExpiry(product.fecha_vencimiento);
                enrichedProduct.expiry_info = {
                    days_until_expiry: daysUntilExpiry,
                    expiry_status: this.getExpiryStatus(daysUntilExpiry)
                };
            }
            
            enriched.push(enrichedProduct);
        }
        
        return enriched;
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
     * Verificar dependencias del producto antes de eliminar
     * @param {string} productId - ID del producto
     */
    async checkProductDependencies(productId) {
        // Verificar si el producto tiene conteo en inventario
        const inventoryService = this.getService('inventory');
        const countInfo = await inventoryService.getProductStock(productId);
        
        if (countInfo.cantidad_actual > 0) {
            throw new Error('No se puede eliminar un producto que tiene existencias en el inventario');
        }
        
        // Aquí se pueden añadir más verificaciones:
        // - Verificar si está en reportes pendientes
        // - Verificar si tiene movimientos recientes
        // - etc.
    }

    // ========================================
    // VALIDACIONES
    // ========================================

    /**
     * Validar datos de producto (sin campos de precio)
     * @param {Object} productData - Datos del producto
     * @param {boolean} isCreate - Si es creación (requiere más campos)
     * @returns {Object} Resultado de validación
     */
    validateProductData(productData, isCreate = true) {
        const required = isCreate ? 
            ['codigo', 'nombre', 'categoria_id'] : 
            [];
            
        return this.validateInput(productData, {
            required,
            types: {
                cantidad_minima: 'number',
                cantidad_maxima: 'number'
            },
            ranges: {
                cantidad_minima: { min: 0 },
                cantidad_maxima: { min: 0 }
            },
            lengths: {
                codigo: { min: 1, max: 50 },
                nombre: { min: 1, max: 200 },
                descripcion: { max: 1000 }
            }
        });
    }

    /**
     * Asegurar que el código sea único
     * @param {string} code - Código a verificar
     * @param {string} excludeId - ID a excluir de la verificación
     */
    async ensureUniqueCode(code, excludeId = null) {
        const productRepository = this.getRepository('product');
        
        const existing = await productRepository.findAll({
            codigo: code,
            estado: 'active'
        });
        
        const duplicates = excludeId ? 
            existing.filter(p => p.id !== excludeId) : 
            existing;
            
        if (duplicates.length > 0) {
            throw new Error(`Ya existe un producto con el código: ${code}`);
        }
    }

    // ========================================
    // CONFIGURACIÓN Y SINCRONIZACIÓN
    // ========================================

    /**
     * Configurar sincronización automática
     */
    setupAutoSync() {
        if (!this.shouldSyncWithFastAPI()) {
            return;
        }
        
        // Configurar intervalo de sincronización
        setInterval(async () => {
            try {
                if (this.isOnline()) {
                    await this.syncWithFastAPI({ deleteRemoved: false });
                }
            } catch (error) {
                this.log(`Error en sincronización automática: ${error.message}`, 'error');
            }
        }, this.syncInterval);
        
        this.log('Sincronización automática configurada');
    }

    /**
     * Configurar optimizaciones de búsqueda
     */
    setupSearchOptimizations() {
        // Limpiar caché periódicamente
        setInterval(() => {
            this.cleanSearchCache();
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Verificar si debe sincronizar con FastAPI
     * @returns {boolean} true si debe sincronizar
     */
    shouldSyncWithFastAPI() {
        return !!(this.fastApiEndpoint && localStorage.getItem('fastapi_token'));
    }

    /**
     * Generar clave de caché para búsqueda
     * @param {Object} searchParams - Parámetros de búsqueda
     * @returns {string} Clave de caché
     */
    generateSearchCacheKey(searchParams) {
        return JSON.stringify(searchParams);
    }

    /**
     * Limpiar caché de búsqueda
     */
    clearSearchCache() {
        this.searchCache.clear();
        this.log('Caché de búsqueda limpiado');
    }

    /**
     * Limpiar entradas viejas del caché
     */
    cleanSearchCache() {
        const now = Date.now();
        const expireTime = 5 * 60 * 1000; // 5 minutos
        
        for (const [key, value] of this.searchCache.entries()) {
            if (now - value.timestamp > expireTime) {
                this.searchCache.delete(key);
            }
        }
    }

    /**
     * Obtener servicio por nombre
     * @param {string} serviceName - Nombre del servicio
     * @returns {Object} Instancia del servicio
     */
    getService(serviceName) {
        // Esta implementación debe ser proporcionada por el ServiceManager
        // Por ahora es un placeholder
        return {
            getProductStock: async () => ({ cantidad_actual: 0 })
        };
    }

    // Métodos de FastAPI (placeholders para implementación completa)
    async fetchProductsFromFastAPI() { return []; }
    adaptFastAPIProduct(product) { return product; }
    adaptProductForFastAPI(product) { return product; }
    shouldUpdateLocalProduct(local, remote) { return false; }
    async syncProductDeletionToFastAPI(productId, hardDelete) { }
    async getProductPriceHistory(productId) { return []; }
}
