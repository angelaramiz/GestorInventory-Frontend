/**
 * @fileoverview Modelo de Inventario
 * @module core/models/Inventory
 */

import BaseModel from './BaseModel.js';

/**
 * Clase que representa un inventario en el sistema
 * @extends BaseModel
 */
class Inventory extends BaseModel {
  /**
   * @param {Object} data - Datos iniciales del inventario
   */
  constructor(data = {}) {
    super(data);
    
    // Asegurar que siempre tenga un ID
    if (!this._data.id) {
      this._data.id = Inventory.generateId();
    }
    
    // Valores por defecto
    this._data.name = this._data.name || '';
    this._data.description = this._data.description || '';
    this._data.location = this._data.location || '';
    this._data.type = this._data.type || 'general'; // general, warehouse, store, etc.
    this._data.isActive = this._data.isActive !== undefined ? this._data.isActive : true;
    this._data.products = this._data.products || [];
    this._data.createdAt = this._data.createdAt || new Date().toISOString();
    this._data.updatedAt = this._data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida el modelo de inventario
   * @returns {boolean} - true si el inventario es válido, false en caso contrario
   */
  validate() {
    this._errors = {};
    
    // Validación del nombre
    if (!this._data.name) {
      this._errors.name = 'El nombre del inventario es obligatorio';
    } else if (this._data.name.length < 3) {
      this._errors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (this._data.name.length > 100) {
      this._errors.name = 'El nombre no puede exceder los 100 caracteres';
    }
    
    // Validación del tipo
    const validTypes = ['general', 'warehouse', 'store', 'temporary'];
    if (!validTypes.includes(this._data.type)) {
      this._errors.type = `El tipo debe ser uno de: ${validTypes.join(', ')}`;
    }
    
    // Validación de productos
    if (!Array.isArray(this._data.products)) {
      this._errors.products = 'Los productos deben ser un array';
    }
    
    return Object.keys(this._errors).length === 0;
  }

  /**
   * Añade un producto al inventario
   * @param {Object} product - Producto a añadir
   * @returns {Inventory} - Instancia actual para encadenamiento
   */
  addProduct(product) {
    if (!product || !product.id) {
      throw new Error('Producto inválido');
    }
    
    // Verificar si el producto ya existe en el inventario
    const existingIndex = this._data.products.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Actualizar el producto existente
      this._data.products[existingIndex] = { ...product };
    } else {
      // Añadir nuevo producto
      this._data.products.push({ ...product });
    }
    
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Elimina un producto del inventario
   * @param {string} productId - ID del producto a eliminar
   * @returns {Inventory} - Instancia actual para encadenamiento
   */
  removeProduct(productId) {
    const initialLength = this._data.products.length;
    this._data.products = this._data.products.filter(p => p.id !== productId);
    
    if (this._data.products.length !== initialLength) {
      this._data.updatedAt = new Date().toISOString();
    }
    
    return this;
  }

  /**
   * Obtiene un producto del inventario por su ID
   * @param {string} productId - ID del producto a buscar
   * @returns {Object|null} - Producto encontrado o null si no existe
   */
  getProduct(productId) {
    const product = this._data.products.find(p => p.id === productId);
    return product ? { ...product } : null;
  }

  /**
   * Obtiene todos los productos del inventario
   * @returns {Array} - Array de productos
   */
  getAllProducts() {
    return [...this._data.products];
  }

  /**
   * Actualiza la cantidad de un producto en el inventario
   * @param {string} productId - ID del producto
   * @param {number} quantity - Cantidad a añadir (positivo) o restar (negativo)
   * @returns {Inventory} - Instancia actual para encadenamiento
   */
  updateProductQuantity(productId, quantity) {
    const productIndex = this._data.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      throw new Error(`Producto con ID ${productId} no encontrado en el inventario`);
    }
    
    const product = this._data.products[productIndex];
    const newQuantity = (product.quantity || 0) + quantity;
    
    if (newQuantity < 0) {
      throw new Error('No hay suficiente stock disponible');
    }
    
    this._data.products[productIndex] = {
      ...product,
      quantity: newQuantity,
      updatedAt: new Date().toISOString()
    };
    
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Obtiene el ID del inventario
   * @returns {string} - ID del inventario
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre del inventario
   * @returns {string} - Nombre del inventario
   */
  get name() {
    return this._data.name;
  }

  /**
   * Establece el nombre del inventario
   * @param {string} value - Nuevo nombre
   */
  set name(value) {
    this._data.name = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la descripción del inventario
   * @returns {string} - Descripción del inventario
   */
  get description() {
    return this._data.description;
  }

  /**
   * Establece la descripción del inventario
   * @param {string} value - Nueva descripción
   */
  set description(value) {
    this._data.description = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la ubicación del inventario
   * @returns {string} - Ubicación del inventario
   */
  get location() {
    return this._data.location;
  }

  /**
   * Establece la ubicación del inventario
   * @param {string} value - Nueva ubicación
   */
  set location(value) {
    this._data.location = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el tipo de inventario
   * @returns {string} - Tipo de inventario
   */
  get type() {
    return this._data.type;
  }

  /**
   * Establece el tipo de inventario
   * @param {string} value - Nuevo tipo
   */
  set type(value) {
    this._data.type = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene si el inventario está activo
   * @returns {boolean} - true si está activo, false en caso contrario
   */
  get isActive() {
    return this._data.isActive;
  }

  /**
   * Establece si el inventario está activo
   * @param {boolean} value - Nuevo estado de activación
   */
  set isActive(value) {
    this._data.isActive = Boolean(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación del inventario
   * @returns {string} - Fecha de creación en formato ISO
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de última actualización del inventario
   * @returns {string} - Fecha de actualización en formato ISO
   */
  get updatedAt() {
    return this._data.updatedAt;
  }

  /**
   * Obtiene el número total de productos en el inventario
   * @returns {number} - Número total de productos
   */
  get productCount() {
    return this._data.products.length;
  }

  /**
   * Obtiene el número total de unidades en el inventario
   * @returns {number} - Número total de unidades
   */
  get totalQuantity() {
    return this._data.products.reduce((total, product) => total + (product.quantity || 0), 0);
  }
}

export default Inventory;