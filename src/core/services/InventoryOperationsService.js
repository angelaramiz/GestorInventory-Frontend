/**
 * InventoryOperationsService - Servicio para operaciones específicas de inventario
 * 
 * Migra la funcionalidad de inventario de product-operations.js:
 * - Gestión de inventario por ubicación
 * - Operaciones de entrada y salida
 * - Modificaciones de stock
 * - Historial de movimientos
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from '../../../js/logs.js';
import { sanitizarEntrada, sanitizarNumeroEntero } from '../../../js/sanitizacion.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { databaseService } from './DatabaseService.js';

export class InventoryOperationsService extends BaseService {
    constructor() {
        super('InventoryOperationsService');
        
        // Repositorios
        this.inventoryRepository = null;
        this.productRepository = null;
        
        // Estado actual
        this.currentLocation = null;
        this.inventorySession = null;
        
        // Cache para operaciones frecuentes
        this.locationCache = new Map();
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
            
            // Inicializar repositorios
            this.inventoryRepository = new InventoryRepository();
            this.productRepository = new ProductRepository();
            
            await this.inventoryRepository.initialize();
            await this.productRepository.initialize();
            
            // Cargar ubicación actual del localStorage
            this.currentLocation = localStorage.getItem('current_location');
            
            // Cargar sesión de inventario si existe
            this.loadInventorySession();
            
            this.status = 'initialized';
            this.emit('initialized', { service: this.name });
            
        } catch (error) {
            this.handleError('Error al inicializar InventoryOperationsService', error);
            throw error;
        }
    }

    /**
     * Seleccionar ubicación de almacén
     */
    async selectWarehouseLocation() {
        try {
            // Obtener ubicaciones disponibles
            const locations = await this.getAvailableLocations();
            
            if (locations.length === 0) {
                // Crear ubicación por defecto
                const defaultLocation = {
                    id: 'principal',
                    nombre: 'Almacén Principal',
                    descripcion: 'Ubicación principal del almacén',
                    activo: true
                };
                
                this.currentLocation = defaultLocation.id;
                localStorage.setItem('current_location', defaultLocation.id);
                localStorage.setItem('location_data', JSON.stringify(defaultLocation));
                
                this.emit('locationSelected', { location: defaultLocation });
                return defaultLocation;
            }

            // Si solo hay una ubicación, seleccionarla automáticamente
            if (locations.length === 1) {
                this.currentLocation = locations[0].id;
                localStorage.setItem('current_location', locations[0].id);
                this.emit('locationSelected', { location: locations[0] });
                return locations[0];
            }

            // Mostrar modal para seleccionar ubicación
            const selectedLocation = await this.showLocationSelectionModal(locations);
            
            if (selectedLocation) {
                this.currentLocation = selectedLocation.id;
                localStorage.setItem('current_location', selectedLocation.id);
                localStorage.setItem('location_data', JSON.stringify(selectedLocation));
                this.emit('locationSelected', { location: selectedLocation });
                return selectedLocation;
            }
            
            return null;
            
        } catch (error) {
            this.handleError('Error al seleccionar ubicación', error);
            throw error;
        }
    }

    /**
     * Verificar y seleccionar ubicación
     */
    async verifyAndSelectLocation() {
        try {
            if (this.currentLocation) {
                // Verificar que la ubicación actual sigue siendo válida
                const locationData = localStorage.getItem('location_data');
                if (locationData) {
                    const location = JSON.parse(locationData);
                    this.emit('locationVerified', { location });
                    return location;
                }
            }

            // Seleccionar nueva ubicación
            return await this.selectWarehouseLocation();
            
        } catch (error) {
            this.handleError('Error al verificar ubicación', error);
            return null;
        }
    }

    /**
     * Iniciar sesión de inventario
     */
    startInventorySession(ubicacion) {
        try {
            this.inventorySession = {
                id: this.generateSessionId(),
                ubicacion: ubicacion || this.currentLocation,
                fechaInicio: new Date().toISOString(),
                productos: [],
                estado: 'activa'
            };

            this.saveInventorySession();
            this.emit('inventorySessionStarted', { session: this.inventorySession });
            
            mostrarAlertaBurbuja('Sesión de inventario iniciada', 'success');
            
            return this.inventorySession;
            
        } catch (error) {
            this.handleError('Error al iniciar sesión de inventario', error);
            throw error;
        }
    }

    /**
     * Guardar inventario
     */
    async saveInventory(productData) {
        try {
            if (!this.inventorySession) {
                throw new Error('No hay una sesión de inventario activa');
            }

            // Sanitizar datos de entrada
            const sanitizedData = sanitizarEntrada(productData);
            
            // Validar datos requeridos
            if (!sanitizedData.codigo) {
                throw new Error('Código de producto requerido');
            }

            const cantidad = sanitizarNumeroEntero(sanitizedData.cantidad);
            if (isNaN(cantidad) || cantidad < 0) {
                throw new Error('La cantidad debe ser un número válido mayor o igual a 0');
            }

            // Buscar producto existente
            const existingProduct = await this.productRepository.findByCode(sanitizedData.codigo);
            if (!existingProduct) {
                throw new Error(`Producto con código '${sanitizedData.codigo}' no encontrado`);
            }

            // Obtener inventario actual
            const currentInventory = await this.inventoryRepository.findByCode(sanitizedData.codigo);
            const cantidadAnterior = currentInventory ? currentInventory.cantidad : 0;

            // Crear registro de inventario
            const inventoryRecord = {
                codigo: sanitizedData.codigo,
                cantidad: cantidad,
                cantidadAnterior: cantidadAnterior,
                fechaActualizacion: new Date().toISOString(),
                usuario: localStorage.getItem('username') || 'Sistema',
                ubicacion: this.currentLocation,
                observaciones: sanitizedData.observaciones || '',
                tipoMovimiento: this.determineMovementType(cantidadAnterior, cantidad),
                sesionId: this.inventorySession.id
            };

            // Guardar en repositorio
            const savedRecord = await this.inventoryRepository.createOrUpdate(inventoryRecord);

            // Actualizar stock del producto
            await this.updateProductStock(sanitizedData.codigo, cantidad);

            // Agregar a la sesión actual
            this.addToInventorySession(savedRecord);

            this.emit('inventorySaved', { 
                record: savedRecord, 
                product: existingProduct 
            });

            mostrarAlertaBurbuja(`Inventario actualizado: ${existingProduct.nombre}`, 'success');
            
            return savedRecord;
            
        } catch (error) {
            this.handleError('Error al guardar inventario', error);
            mostrarAlertaBurbuja(`Error al guardar inventario: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Modificar inventario existente
     */
    async modifyInventory(codigo, newQuantity, observaciones = '') {
        try {
            if (!codigo) {
                throw new Error('Código de producto requerido');
            }

            const cantidad = sanitizarNumeroEntero(newQuantity);
            if (isNaN(cantidad) || cantidad < 0) {
                throw new Error('La cantidad debe ser un número válido mayor o igual a 0');
            }

            // Verificar que el producto existe
            const product = await this.productRepository.findByCode(codigo);
            if (!product) {
                throw new Error(`Producto con código '${codigo}' no encontrado`);
            }

            // Obtener inventario actual
            const currentInventory = await this.inventoryRepository.findByCode(codigo);
            const cantidadAnterior = currentInventory ? currentInventory.cantidad : 0;

            // Crear registro de modificación
            const modificationRecord = {
                codigo: codigo,
                cantidad: cantidad,
                cantidadAnterior: cantidadAnterior,
                fechaActualizacion: new Date().toISOString(),
                usuario: localStorage.getItem('username') || 'Sistema',
                ubicacion: this.currentLocation,
                observaciones: observaciones,
                tipoMovimiento: this.determineMovementType(cantidadAnterior, cantidad),
                esModificacion: true
            };

            // Guardar modificación
            const savedRecord = await this.inventoryRepository.createOrUpdate(modificationRecord);

            // Actualizar stock del producto
            await this.updateProductStock(codigo, cantidad);

            this.emit('inventoryModified', { 
                record: savedRecord, 
                product: product 
            });

            mostrarAlertaBurbuja(`Inventario modificado: ${product.nombre}`, 'success');
            
            return savedRecord;
            
        } catch (error) {
            this.handleError('Error al modificar inventario', error);
            mostrarAlertaBurbuja(`Error al modificar inventario: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Buscar producto en inventario
     */
    async searchProductInventory(codigo, formato = 'auto') {
        try {
            if (!codigo) {
                throw new Error('Código requerido para búsqueda');
            }

            const normalizedCode = codigo.trim();
            
            // Buscar en inventario
            const inventoryRecord = await this.inventoryRepository.findByCode(normalizedCode);
            
            if (inventoryRecord) {
                // Obtener datos del producto para información completa
                const product = await this.productRepository.findByCode(normalizedCode);
                
                const result = {
                    ...inventoryRecord,
                    producto: product,
                    encontrado: true
                };

                this.emit('productInventoryFound', { result });
                return result;
            }

            // Si no se encuentra en inventario, buscar el producto para crear nuevo registro
            const product = await this.productRepository.findByCode(normalizedCode);
            
            if (product) {
                const result = {
                    codigo: product.codigo,
                    cantidad: 0,
                    cantidadAnterior: 0,
                    producto: product,
                    encontrado: false,
                    nuevo: true
                };

                this.emit('productInventoryNotFound', { result });
                return result;
            }

            throw new Error(`Producto con código '${normalizedCode}' no encontrado`);
            
        } catch (error) {
            this.handleError('Error en búsqueda de inventario', error);
            throw error;
        }
    }

    /**
     * Agregar nuevo producto desde inventario
     */
    async addNewProductFromInventory(codigo, allowModifyCode = false) {
        try {
            if (!codigo) {
                throw new Error('Código requerido');
            }

            // Verificar que el código no existe
            const existingProduct = await this.productRepository.findByCode(codigo);
            if (existingProduct && !allowModifyCode) {
                throw new Error('El producto ya existe en el sistema');
            }

            // Emitir evento para que la UI maneje la creación del producto
            this.emit('newProductFromInventoryRequested', { 
                codigo, 
                allowModifyCode 
            });

            return { codigo, allowModifyCode };
            
        } catch (error) {
            this.handleError('Error al agregar producto desde inventario', error);
            throw error;
        }
    }

    /**
     * Obtener historial de movimientos
     */
    async getMovementHistory(codigo = null, limit = 50) {
        try {
            let history;
            
            if (codigo) {
                history = await this.inventoryRepository.findHistoryByCode(codigo, limit);
            } else {
                history = await this.inventoryRepository.findRecentHistory(limit);
            }

            return history || [];
            
        } catch (error) {
            this.handleError('Error al obtener historial de movimientos', error);
            return [];
        }
    }

    /**
     * Obtener estadísticas de inventario
     */
    async getInventoryStats() {
        try {
            const allInventory = await this.inventoryRepository.findAll();
            const allProducts = await this.productRepository.findAll();

            const stats = {
                totalProducts: allProducts.length,
                totalWithInventory: allInventory.length,
                totalQuantity: 0,
                lowStockProducts: 0,
                noStockProducts: 0,
                recentMovements: 0,
                totalValue: 0
            };

            // Calcular estadísticas
            allInventory.forEach(item => {
                stats.totalQuantity += item.cantidad || 0;
                
                // Buscar producto correspondiente
                const product = allProducts.find(p => p.codigo === item.codigo);
                if (product) {
                    const stock = item.cantidad || 0;
                    const minStock = product.stockMinimo || 0;
                    const price = product.precio || 0;
                    
                    if (stock === 0) {
                        stats.noStockProducts++;
                    } else if (stock <= minStock) {
                        stats.lowStockProducts++;
                    }
                    
                    stats.totalValue += stock * price;
                }
                
                // Movimientos recientes (últimas 24 horas)
                const updateTime = new Date(item.fechaActualizacion);
                const now = new Date();
                const hoursDiff = (now - updateTime) / (1000 * 60 * 60);
                
                if (hoursDiff <= 24) {
                    stats.recentMovements++;
                }
            });

            return stats;
            
        } catch (error) {
            this.handleError('Error al obtener estadísticas de inventario', error);
            return {
                totalProducts: 0,
                totalWithInventory: 0,
                totalQuantity: 0,
                lowStockProducts: 0,
                noStockProducts: 0,
                recentMovements: 0,
                totalValue: 0
            };
        }
    }

    /**
     * Métodos de utilidad
     */
    generateSessionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `session-${timestamp}-${random}`;
    }

    determineMovementType(cantidadAnterior, cantidadNueva) {
        if (cantidadAnterior === 0 && cantidadNueva > 0) return 'entrada';
        if (cantidadAnterior > 0 && cantidadNueva === 0) return 'salida';
        if (cantidadNueva > cantidadAnterior) return 'incremento';
        if (cantidadNueva < cantidadAnterior) return 'decremento';
        return 'ajuste';
    }

    async updateProductStock(codigo, newStock) {
        try {
            const product = await this.productRepository.findByCode(codigo);
            if (product) {
                product.stock = newStock;
                product.fechaActualizacion = new Date().toISOString();
                await this.productRepository.update(codigo, product);
                
                this.emit('productStockUpdated', { codigo, newStock, product });
            }
        } catch (error) {
            console.error('Error al actualizar stock del producto:', error);
        }
    }

    saveInventorySession() {
        if (this.inventorySession) {
            localStorage.setItem('inventory_session', JSON.stringify(this.inventorySession));
        }
    }

    loadInventorySession() {
        const sessionData = localStorage.getItem('inventory_session');
        if (sessionData) {
            try {
                this.inventorySession = JSON.parse(sessionData);
                
                // Verificar si la sesión sigue siendo válida (menos de 24 horas)
                const sessionTime = new Date(this.inventorySession.fechaInicio);
                const now = new Date();
                const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
                
                if (hoursDiff > 24) {
                    this.inventorySession = null;
                    localStorage.removeItem('inventory_session');
                }
            } catch (error) {
                console.error('Error al cargar sesión de inventario:', error);
                this.inventorySession = null;
            }
        }
    }

    addToInventorySession(record) {
        if (this.inventorySession) {
            this.inventorySession.productos.push(record);
            this.inventorySession.fechaUltimaActualizacion = new Date().toISOString();
            this.saveInventorySession();
        }
    }

    async getAvailableLocations() {
        // Por ahora, devolver ubicaciones por defecto
        // En el futuro, esto podría venir de una API o base de datos
        return [
            {
                id: 'principal',
                nombre: 'Almacén Principal',
                descripcion: 'Ubicación principal del almacén',
                activo: true
            },
            {
                id: 'secundario',
                nombre: 'Almacén Secundario',
                descripcion: 'Almacén para productos de reserva',
                activo: true
            }
        ];
    }

    async showLocationSelectionModal(locations) {
        return new Promise((resolve) => {
            // Emitir evento para que la UI maneje el modal
            this.emit('locationSelectionRequested', { 
                locations, 
                callback: resolve 
            });
        });
    }
}

// Crear instancia singleton
export const inventoryOperationsService = new InventoryOperationsService();

// Backwards compatibility exports
export const guardarInventario = (productData) => inventoryOperationsService.saveInventory(productData);
export const modificarInventario = (codigo, cantidad, obs) => inventoryOperationsService.modifyInventory(codigo, cantidad, obs);
export const buscarProductoInventario = (codigo, formato) => inventoryOperationsService.searchProductInventory(codigo, formato);
export const seleccionarUbicacionAlmacen = () => inventoryOperationsService.selectWarehouseLocation();
export const verificarYSeleccionarUbicacion = () => inventoryOperationsService.verifyAndSelectLocation();
export const iniciarInventario = (ubicacion) => inventoryOperationsService.startInventorySession(ubicacion);
export const agregarNuevoProductoDesdeInventario = (codigo, allowModify) => inventoryOperationsService.addNewProductFromInventory(codigo, allowModify);
