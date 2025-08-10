/**
 * ProductRepository - Repositorio para gestión de productos
 * 
 * Maneja todas las operaciones CRUD para productos:
 * - Gestión de catálogo de productos
 * - Sincronización con FastAPI backend
 * - Búsquedas y filtros avanzados
 * - Gestión de códigos de barras
 * - Relaciones con categorías y proveedores
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseRepository } from './BaseRepository.js';
import { IndexedDBAdapter } from '../../storage/IndexedDBAdapter.js';
import { SyncQueue } from '../../storage/SyncQueue.js';
import { Product } from '../models/Product.js';

export class ProductRepository extends BaseRepository {
    /**
     * Constructor del repositorio de productos
     */
    constructor() {
        super('productos', 'productos');
        this.dbAdapter = new IndexedDBAdapter('ProductosDB', 1);
        this.syncQueue = new SyncQueue('products');
        this.fastApiBaseUrl = 'https://gestorinventory-backend.fly.dev';
        this.isInitialized = false;
    }

    /**
     * Inicializar base de datos de productos
     * @returns {Promise<void>}
     */
    async initializeDatabase() {
        if (this.isInitialized) return;

        const schema = {
            productos: {
                options: { keyPath: 'codigo' },
                indexes: {
                    codigo: { keyPath: 'codigo', options: { unique: true } },
                    nombre: { keyPath: 'nombre', options: { unique: false } },
                    categoria: { keyPath: 'categoria', options: { unique: false } },
                    marca: { keyPath: 'marca', options: { unique: false } },
                    unidad: { keyPath: 'unidad', options: { unique: false } },
                    proveedor: { keyPath: 'proveedor', options: { unique: false } },
                    categoria_id: { keyPath: 'categoria_id', options: { unique: false } },
                    usuario_id: { keyPath: 'usuario_id', options: { unique: false } }
                }
            }
        };

        await this.dbAdapter.initialize(schema);
        this.isInitialized = true;
    }

    /**
     * Aplicar filtros específicos de productos
     * @param {Object} query - Query de Supabase
     * @param {Object} filters - Filtros a aplicar
     */
    applyFilters(query, filters) {
        // Filtro por usuario (siempre aplicado)
        const userId = this.getCurrentUserId();
        if (userId) {
            query.eq('usuario_id', userId);
        }

        // Filtro por categoría
        const categoriaId = localStorage.getItem('categoria_id');
        if (categoriaId) {
            query.eq('categoria_id', categoriaId);
        }

        // Filtros adicionales
        if (filters.categoria) {
            query.eq('categoria', filters.categoria);
        }

        if (filters.marca) {
            query.eq('marca', filters.marca);
        }

        if (filters.proveedor) {
            query.eq('proveedor', filters.proveedor);
        }

        if (filters.busqueda) {
            query.or(`nombre.ilike.%${filters.busqueda}%,codigo.ilike.%${filters.busqueda}%`);
        }

        return query;
    }

    /**
     * Validar datos de producto
     * @param {Object} data - Datos a validar
     */
    validateData(data) {
        const product = new Product(data);
        const validation = product.validate();
        
        if (!validation.isValid) {
            throw new Error(`Datos de producto inválidos: ${validation.errors.join(', ')}`);
        }
    }

    /**
     * Crear nuevo producto
     * @param {Object} productData - Datos del producto
     * @returns {Promise<Object>} Producto creado
     */
    async create(productData) {
        await this.initializeDatabase();
        
        // Crear modelo para validación
        const product = new Product(productData);
        const validation = product.validate();
        
        if (!validation.isValid) {
            throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
        }

        // Verificar si ya existe el código
        const existing = await this.findById(productData.codigo);
        if (existing) {
            throw new Error('Ya existe un producto con este código');
        }

        // Asegurar campos requeridos
        const enrichedData = {
            ...product.toJSON(),
            usuario_id: this.getCurrentUserId(),
            categoria_id: localStorage.getItem('categoria_id'),
            fechaCreacion: new Date().toISOString()
        };

        return await super.create(enrichedData);
    }

    /**
     * Buscar producto por código
     * @param {string} codigo - Código del producto
     * @returns {Promise<Object|null>} Producto encontrado o null
     */
    async findByCodigo(codigo) {
        await this.initializeDatabase();
        return await this.findById(codigo);
    }

    /**
     * Buscar productos por código parcial
     * @param {string} codigoParcial - Código parcial
     * @returns {Promise<Array>} Array de productos encontrados
     */
    async findByCodigoParcial(codigoParcial) {
        await this.initializeDatabase();
        
        try {
            return await this.dbAdapter.findWithCursor('productos', (producto) => {
                return producto.codigo && producto.codigo.includes(codigoParcial);
            });
        } catch (error) {
            console.error('Error buscando por código parcial:', error);
            return [];
        }
    }

    /**
     * Buscar productos por nombre
     * @param {string} nombre - Nombre o parte del nombre
     * @returns {Promise<Array>} Array de productos encontrados
     */
    async findByNombre(nombre) {
        await this.initializeDatabase();
        
        try {
            const searchTerm = nombre.toLowerCase();
            return await this.dbAdapter.findWithCursor('productos', (producto) => {
                return producto.nombre && 
                       producto.nombre.toLowerCase().includes(searchTerm);
            });
        } catch (error) {
            console.error('Error buscando por nombre:', error);
            return [];
        }
    }

    /**
     * Buscar productos por categoría
     * @param {string} categoria - Categoría
     * @returns {Promise<Array>} Array de productos encontrados
     */
    async findByCategoria(categoria) {
        await this.initializeDatabase();
        
        try {
            return await this.dbAdapter.getByIndex('productos', 'categoria', categoria);
        } catch (error) {
            console.error('Error buscando por categoría:', error);
            return [];
        }
    }

    /**
     * Obtener todas las categorías únicas
     * @returns {Promise<Array>} Array de categorías
     */
    async getUniqueCategories() {
        await this.initializeDatabase();
        
        try {
            const productos = await this.dbAdapter.getAll('productos');
            const categorias = new Set();
            
            productos.forEach(producto => {
                if (producto.categoria) {
                    categorias.add(producto.categoria);
                }
            });
            
            return Array.from(categorias).sort();
        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            return [];
        }
    }

    /**
     * Obtener todas las marcas únicas
     * @returns {Promise<Array>} Array de marcas
     */
    async getUniqueBrands() {
        await this.initializeDatabase();
        
        try {
            const productos = await this.dbAdapter.getAll('productos');
            const marcas = new Set();
            
            productos.forEach(producto => {
                if (producto.marca) {
                    marcas.add(producto.marca);
                }
            });
            
            return Array.from(marcas).sort();
        } catch (error) {
            console.error('Error obteniendo marcas:', error);
            return [];
        }
    }

    /**
     * Sincronizar productos con FastAPI backend
     * @returns {Promise<Array>} Productos sincronizados
     */
    async syncWithFastAPI() {
        const usuarioId = this.getCurrentUserId();
        const categoriaId = localStorage.getItem('categoria_id');
        
        if (!usuarioId || !categoriaId) {
            throw new Error('Usuario o categoría no disponible para sincronizar');
        }

        try {
            const response = await fetch(`${this.fastApiBaseUrl}/productos/sincronizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
                },
                credentials: 'include',
                body: JSON.stringify({ usuarioId, categoriaId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            // Actualizar base de datos local
            for (const producto of data.productos) {
                try {
                    const existing = await this.dbAdapter.get('productos', producto.codigo);
                    
                    if (!existing || JSON.stringify(existing) !== JSON.stringify(producto)) {
                        await this.dbAdapter.put('productos', producto);
                    }
                } catch (error) {
                    console.error(`Error actualizando producto ${producto.codigo}:`, error);
                }
            }

            console.log(`${data.productos.length} productos sincronizados desde FastAPI`);
            return data.productos;
            
        } catch (error) {
            console.error('Error sincronizando con FastAPI:', error);
            throw error;
        }
    }

    /**
     * Subir productos locales al backend
     * @returns {Promise<boolean>} true si se subió correctamente
     */
    async uploadToBackend() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('Usuario no autenticado');
        }

        try {
            const productos = await this.dbAdapter.getAll('productos');
            
            if (productos.length === 0) {
                console.log('No hay productos locales para subir');
                return true;
            }

            const response = await fetch(`${this.fastApiBaseUrl}/productos/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    productos: productos,
                    usuarioId: userId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`${productos.length} productos subidos al backend`);
            
            return true;
        } catch (error) {
            console.error('Error subiendo productos al backend:', error);
            throw error;
        }
    }

    /**
     * Buscar productos con filtros avanzados
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Productos filtrados
     */
    async searchWithFilters(filters = {}) {
        await this.initializeDatabase();
        
        try {
            return await this.dbAdapter.findWithCursor('productos', (producto) => {
                // Filtro por código
                if (filters.codigo && !producto.codigo.includes(filters.codigo)) {
                    return false;
                }
                
                // Filtro por nombre
                if (filters.nombre && !producto.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) {
                    return false;
                }
                
                // Filtro por categoría
                if (filters.categoria && producto.categoria !== filters.categoria) {
                    return false;
                }
                
                // Filtro por marca
                if (filters.marca && producto.marca !== filters.marca) {
                    return false;
                }
                
                // Filtro por proveedor
                if (filters.proveedor && producto.proveedor !== filters.proveedor) {
                    return false;
                }
                
                return true;
            });
        } catch (error) {
            console.error('Error en búsqueda con filtros:', error);
            return [];
        }
    }

    /**
     * Obtener estadísticas de productos
     * @returns {Promise<Object>} Estadísticas
     */
    async getStatistics() {
        await this.initializeDatabase();
        
        try {
            const productos = await this.dbAdapter.getAll('productos');
            
            const stats = {
                totalProductos: productos.length,
                porCategoria: {},
                porMarca: {},
                porProveedor: {},
                sinStock: 0,
                conStock: 0
            };
            
            productos.forEach(producto => {
                // Contar por categoría
                const categoria = producto.categoria || 'Sin categoría';
                stats.porCategoria[categoria] = (stats.porCategoria[categoria] || 0) + 1;
                
                // Contar por marca
                const marca = producto.marca || 'Sin marca';
                stats.porMarca[marca] = (stats.porMarca[marca] || 0) + 1;
                
                // Contar por proveedor
                const proveedor = producto.proveedor || 'Sin proveedor';
                stats.porProveedor[proveedor] = (stats.porProveedor[proveedor] || 0) + 1;
            });
            
            return stats;
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    // ========================================
    // IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS
    // ========================================

    async saveToIndexedDB(data) {
        await this.dbAdapter.put('productos', data);
    }

    async getFromIndexedDB(filters = {}) {
        const userId = this.getCurrentUserId();
        const categoriaId = localStorage.getItem('categoria_id');
        
        return await this.dbAdapter.findWithCursor('productos', (producto) => {
            // Filtros básicos por usuario y categoría
            if (producto.usuario_id !== userId) return false;
            if (categoriaId && producto.categoria_id !== categoriaId) return false;
            
            // Aplicar filtros adicionales
            if (filters.categoria && producto.categoria !== filters.categoria) return false;
            if (filters.marca && producto.marca !== filters.marca) return false;
            if (filters.codigo && !producto.codigo.includes(filters.codigo)) return false;
            
            return true;
        });
    }

    async getFromIndexedDBById(codigo) {
        return await this.dbAdapter.get('productos', codigo);
    }

    async updateInIndexedDB(codigo, data) {
        return await this.dbAdapter.update('productos', codigo, data);
    }

    async deleteFromIndexedDB(codigo) {
        return await this.dbAdapter.delete('productos', codigo);
    }

    async clearLocalData(filters = {}) {
        const userId = this.getCurrentUserId();
        const categoriaId = localStorage.getItem('categoria_id');
        
        if (userId || categoriaId) {
            // Solo limpiar datos del usuario/categoría actual
            const productos = await this.dbAdapter.getAll('productos');
            const productosToDelete = productos.filter(producto => {
                return (userId && producto.usuario_id === userId) ||
                       (categoriaId && producto.categoria_id === categoriaId);
            });
            
            for (const producto of productosToDelete) {
                await this.dbAdapter.delete('productos', producto.codigo);
            }
        } else {
            await this.dbAdapter.clear('productos');
        }
    }

    async replaceInIndexedDB(tempCodigo, realData) {
        // Eliminar registro temporal
        await this.dbAdapter.delete('productos', tempCodigo);
        
        // Insertar datos reales
        await this.dbAdapter.put('productos', realData);
    }

    /**
     * Exportar productos a CSV
     * @param {Object} filters - Filtros para exportación
     * @returns {Promise<string>} Contenido CSV
     */
    async exportToCSV(filters = {}) {
        const productos = await this.searchWithFilters(filters);
        
        const headers = [
            'Código', 'Nombre', 'Categoría', 'Marca', 'Unidad', 
            'Proveedor', 'Precio', 'Descripción'
        ];
        
        let csv = headers.join(',') + '\n';
        
        productos.forEach(producto => {
            const row = [
                producto.codigo,
                producto.nombre,
                producto.categoria,
                producto.marca,
                producto.unidad,
                producto.proveedor,
                producto.precio,
                producto.descripcion
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * Importar productos desde CSV
     * @param {string} csvContent - Contenido CSV
     * @returns {Promise<Object>} Resultado de la importación
     */
    async importFromCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        const results = {
            imported: 0,
            errors: [],
            updated: 0
        };
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const values = line.split(',');
                const productData = {};
                
                headers.forEach((header, index) => {
                    productData[header.trim()] = values[index]?.replace(/"/g, '').trim();
                });
                
                // Verificar si el producto ya existe
                const existing = await this.findByCodigo(productData.codigo);
                
                if (existing) {
                    await this.update(productData.codigo, productData);
                    results.updated++;
                } else {
                    await this.create(productData);
                    results.imported++;
                }
                
            } catch (error) {
                results.errors.push(`Línea ${i + 1}: ${error.message}`);
            }
        }
        
        return results;
    }
}
