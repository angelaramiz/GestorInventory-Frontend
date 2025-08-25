/**
 * ProductOperationsService - Servicio principal para operaciones de productos
 * 
 * Migra la funcionalidad principal de product-operations.js:
 * - CRUD de productos
 * - Búsquedas y validaciones
 * - Gestión de códigos únicos
 * - Integración con base de datos
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from '../../../js/logs.js';
import { sanitizarProducto, sanitizarEntrada, sanitizarNumeroEntero } from '../../../js/sanitizacion.js';
import { Product } from '../models/Product.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { databaseService } from './DatabaseService.js';

export class ProductOperationsService extends BaseService {
    constructor() {
        super('ProductOperationsService');
        
        // Repositorio de productos
        this.productRepository = null;
        
        // Cache para búsquedas frecuentes
        this.searchCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
        
        // Estado de última área seleccionada
        this.currentArea = null;
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            // Asegurar que DatabaseService esté inicializado
            if (databaseService.status !== 'initialized') {
                await databaseService.initialize();
            }
            
            // Inicializar repositorio
            this.productRepository = new ProductRepository();
            await this.productRepository.initialize();
            
            // Cargar área actual
            this.currentArea = localStorage.getItem('area_id');
            
            this.status = 'initialized';
            this.emit('initialized', { service: this.name });
            
        } catch (error) {
            this.handleError('Error al inicializar ProductOperationsService', error);
            throw error;
        }
    }

    /**
     * Generar ID temporal para productos offline
     */
    generateTemporaryId(codigo, lote = null) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return lote ? `${codigo}-${lote}-${timestamp}-${random}` : `${codigo}-${timestamp}-${random}`;
    }

    /**
     * Agregar nuevo producto
     */
    async addProduct(productData, evento = null) {
        try {
            // Prevenir envío de formulario si es un evento
            if (evento && evento.preventDefault) {
                evento.preventDefault();
            }

            // Sanitizar datos del producto
            const sanitizedData = sanitizarProducto(productData);
            
            // Crear modelo de producto
            const product = new Product(sanitizedData);
            
            // Validar producto
            if (!product.validate()) {
                const errors = product.getErrors();
                const errorMessages = Object.values(errors).join(', ');
                throw new Error(`Datos del producto inválidos: ${errorMessages}`);
            }

            // Verificar código único
            const isUnique = await this.validateUniqueCode(product.codigo);
            if (!isUnique) {
                throw new Error(`El código '${product.codigo}' ya existe en el sistema`);
            }

            // Agregar área actual
            if (this.currentArea) {
                product.area_id = this.currentArea;
            }

            // Guardar producto
            const savedProduct = await this.productRepository.create(product.toJSON());
            
            // Emitir evento de producto agregado
            this.emit('productAdded', { product: savedProduct });
            
            // Limpiar cache de búsquedas
            this.searchCache.clear();
            
            mostrarAlertaBurbuja(`Producto '${savedProduct.nombre}' agregado exitosamente`, 'success');
            
            return savedProduct;
            
        } catch (error) {
            this.handleError('Error al agregar producto', error);
            mostrarAlertaBurbuja(`Error al agregar producto: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Buscar producto por código
     */
    async searchProductByCode(codigo, formato = 'auto') {
        try {
            if (!codigo || codigo.trim() === '') {
                throw new Error('Código de producto requerido');
            }

            const normalizedCode = codigo.trim();
            const cacheKey = `search-${normalizedCode}-${formato}`;
            
            // Verificar cache
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                return cached;
            }

            // Buscar en base de datos
            let results = [];
            
            // Búsqueda exacta
            const exactMatch = await this.productRepository.findByCode(normalizedCode);
            if (exactMatch) {
                results.push(exactMatch);
            }
            
            // Si no hay coincidencia exacta, buscar por código parcial
            if (results.length === 0) {
                const partialMatches = await this.productRepository.findByPartialCode(normalizedCode);
                results = partialMatches;
            }

            // Cachear resultado
            this.setCachedResult(cacheKey, results);
            
            // Emitir evento de búsqueda
            this.emit('productSearched', { 
                codigo: normalizedCode, 
                formato, 
                resultCount: results.length 
            });

            return results;
            
        } catch (error) {
            this.handleError('Error en búsqueda de producto', error);
            mostrarAlertaBurbuja(`Error en búsqueda: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Buscar producto para editar
     */
    async searchProductForEdit(codigo, formato = 'auto') {
        try {
            const products = await this.searchProductByCode(codigo, formato);
            
            if (products.length === 0) {
                mostrarAlertaBurbuja('Producto no encontrado', 'warning');
                return null;
            }
            
            if (products.length === 1) {
                this.emit('productFoundForEdit', { product: products[0] });
                return products[0];
            }
            
            // Múltiples resultados - mostrar opciones
            this.emit('multipleProductsFound', { products, action: 'edit' });
            return products;
            
        } catch (error) {
            this.handleError('Error al buscar producto para editar', error);
            return null;
        }
    }

    /**
     * Validar código único
     */
    async validateUniqueCode(codigo) {
        try {
            if (!codigo || codigo.trim() === '') {
                return false;
            }

            const existingProduct = await this.productRepository.findByCode(codigo.trim());
            return !existingProduct;
            
        } catch (error) {
            this.handleError('Error al validar código único', error);
            return false;
        }
    }

    /**
     * Guardar cambios en producto existente
     */
    async saveProductChanges(productData) {
        try {
            if (!productData || !productData.codigo) {
                throw new Error('Datos de producto requeridos para guardar cambios');
            }

            // Sanitizar datos
            const sanitizedData = sanitizarProducto(productData);
            
            // Crear modelo de producto
            const product = new Product(sanitizedData);
            
            // Validar producto
            if (!product.validate()) {
                const errors = product.getErrors();
                const errorMessages = Object.values(errors).join(', ');
                throw new Error(`Datos del producto inválidos: ${errorMessages}`);
            }

            // Actualizar producto
            const updatedProduct = await this.productRepository.update(product.codigo, product.toJSON());
            
            if (!updatedProduct) {
                throw new Error('No se pudo actualizar el producto');
            }

            // Limpiar cache
            this.searchCache.clear();
            
            // Emitir evento de producto actualizado
            this.emit('productUpdated', { product: updatedProduct });
            
            mostrarAlertaBurbuja(`Producto '${updatedProduct.nombre}' actualizado exitosamente`, 'success');
            
            return updatedProduct;
            
        } catch (error) {
            this.handleError('Error al guardar cambios del producto', error);
            mostrarAlertaBurbuja(`Error al guardar cambios: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Eliminar producto
     */
    async deleteProduct(codigo) {
        try {
            if (!codigo || codigo.trim() === '') {
                throw new Error('Código de producto requerido para eliminar');
            }

            // Verificar que el producto existe
            const product = await this.productRepository.findByCode(codigo.trim());
            if (!product) {
                throw new Error('Producto no encontrado');
            }

            // Eliminar producto
            const deleted = await this.productRepository.delete(codigo.trim());
            
            if (!deleted) {
                throw new Error('No se pudo eliminar el producto');
            }

            // Limpiar cache
            this.searchCache.clear();
            
            // Emitir evento de producto eliminado
            this.emit('productDeleted', { codigo: codigo.trim(), product });
            
            mostrarAlertaBurbuja(`Producto '${product.nombre}' eliminado exitosamente`, 'success');
            
            return true;
            
        } catch (error) {
            this.handleError('Error al eliminar producto', error);
            mostrarAlertaBurbuja(`Error al eliminar producto: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Buscar por código parcial
     */
    async searchByPartialCode(codigoCorto, tipo = 'productos', callback = null) {
        try {
            if (!codigoCorto || codigoCorto.length < 2) {
                if (callback) callback([]);
                return [];
            }

            const cacheKey = `partial-${codigoCorto}-${tipo}`;
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                if (callback) callback(cached);
                return cached;
            }

            let results = [];
            
            if (tipo === 'productos' || tipo === 'all') {
                const productResults = await this.productRepository.findByPartialCode(codigoCorto);
                results = [...results, ...productResults];
            }

            // Cachear resultado
            this.setCachedResult(cacheKey, results);
            
            if (callback) {
                callback(results);
            }
            
            return results;
            
        } catch (error) {
            this.handleError('Error en búsqueda por código parcial', error);
            if (callback) callback([]);
            return [];
        }
    }

    /**
     * Obtener todos los productos
     */
    async getAllProducts() {
        try {
            const products = await this.productRepository.findAll();
            return products || [];
        } catch (error) {
            this.handleError('Error al obtener todos los productos', error);
            return [];
        }
    }

    /**
     * Obtener productos por categoría
     */
    async getProductsByCategory(categoria) {
        try {
            if (!categoria) {
                return [];
            }

            const products = await this.productRepository.findByCategory(categoria);
            return products || [];
            
        } catch (error) {
            this.handleError('Error al obtener productos por categoría', error);
            return [];
        }
    }

    /**
     * Obtener estadísticas de productos
     */
    async getProductStats() {
        try {
            const allProducts = await this.getAllProducts();
            
            const stats = {
                total: allProducts.length,
                categories: {},
                brands: {},
                lowStock: 0,
                noStock: 0,
                averagePrice: 0,
                totalValue: 0
            };

            let totalPrice = 0;
            
            allProducts.forEach(product => {
                // Categorías
                const category = product.categoria || 'Sin categoría';
                stats.categories[category] = (stats.categories[category] || 0) + 1;
                
                // Marcas
                const brand = product.marca || 'Sin marca';
                stats.brands[brand] = (stats.brands[brand] || 0) + 1;
                
                // Stock
                const stock = product.stock || 0;
                const minStock = product.stockMinimo || 0;
                
                if (stock === 0) {
                    stats.noStock++;
                } else if (stock <= minStock) {
                    stats.lowStock++;
                }
                
                // Precios
                const price = product.precio || 0;
                totalPrice += price;
                stats.totalValue += price * stock;
            });

            stats.averagePrice = stats.total > 0 ? totalPrice / stats.total : 0;
            
            return stats;
            
        } catch (error) {
            this.handleError('Error al obtener estadísticas de productos', error);
            return {
                total: 0,
                categories: {},
                brands: {},
                lowStock: 0,
                noStock: 0,
                averagePrice: 0,
                totalValue: 0
            };
        }
    }

    /**
     * Gestión de cache
     */
    getCachedResult(key) {
        const cached = this.searchCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCachedResult(key, data) {
        this.searchCache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Limpiar cache si es muy grande
        if (this.searchCache.size > 100) {
            const oldestKey = this.searchCache.keys().next().value;
            this.searchCache.delete(oldestKey);
        }
    }

    /**
     * Limpiar cache
     */
    clearCache() {
        this.searchCache.clear();
        this.emit('cacheCleared');
    }

    /**
     * Actualizar área actual
     */
    setCurrentArea(areaId) {
        this.currentArea = areaId;
        localStorage.setItem('area_id', areaId);
        this.clearCache(); // Limpiar cache al cambiar área
        this.emit('areaChanged', { areaId });
    }
}

// Crear instancia singleton
export const productOperationsService = new ProductOperationsService();

// Backwards compatibility exports
export const agregarProducto = (productData, evento) => productOperationsService.addProduct(productData, evento);
export const buscarProducto = (codigo, formato) => productOperationsService.searchProductByCode(codigo, formato);
export const buscarProductoParaEditar = (codigo, formato) => productOperationsService.searchProductForEdit(codigo, formato);
export const validarCodigoUnico = (codigo) => productOperationsService.validateUniqueCode(codigo);
export const guardarCambios = (productData) => productOperationsService.saveProductChanges(productData);
export const eliminarProducto = (codigo) => productOperationsService.deleteProduct(codigo);
export const buscarPorCodigoParcial = (codigo, tipo, callback) => productOperationsService.searchByPartialCode(codigo, tipo, callback);
