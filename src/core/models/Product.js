/**
 * @fileoverview Modelo de Producto
 * @module core/models/Product
 */

import BaseModel from './BaseModel.js';

/**
 * Clase que representa un producto en el sistema
 * @extends BaseModel
 */
class Product extends BaseModel {
  /**
   * @param {Object} data - Datos iniciales del producto
   */
  constructor(data = {}) {
    super(data);
    
    // Asegurar que siempre tenga un ID
    if (!this._data.id) {
      this._data.id = Product.generateId();
    }
    
    // Valores por defecto
    this._data.name = this._data.name || '';
    this._data.sku = this._data.sku || '';
    this._data.description = this._data.description || '';
    this._data.price = this._data.price || 0;
    this._data.cost = this._data.cost || 0;
    this._data.stock = this._data.stock || 0;
    this._data.minStock = this._data.minStock || 0;
    this._data.category = this._data.category || '';
    this._data.supplier = this._data.supplier || '';
    this._data.location = this._data.location || '';
    this._data.imageUrl = this._data.imageUrl || '';
    this._data.barcode = this._data.barcode || '';
    this._data.isActive = this._data.isActive !== undefined ? this._data.isActive : true;
    this._data.createdAt = this._data.createdAt || new Date().toISOString();
    this._data.updatedAt = this._data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida el modelo de producto
   * @returns {boolean} - true si el producto es válido, false en caso contrario
   */
  validate() {
    this._errors = {};
    
    // Validación del nombre
    if (!this._data.name) {
      this._errors.name = 'El nombre del producto es obligatorio';
    } else if (this._data.name.length < 3) {
      this._errors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (this._data.name.length > 100) {
      this._errors.name = 'El nombre no puede exceder los 100 caracteres';
    }
    
    // Validación del SKU
    if (!this._data.sku) {
      this._errors.sku = 'El SKU es obligatorio';
    } else if (!/^[A-Za-z0-9-]+$/.test(this._data.sku)) {
      this._errors.sku = 'El SKU solo puede contener letras, números y guiones';
    }
    
    // Validación del precio
    if (typeof this._data.price !== 'number') {
      this._errors.price = 'El precio debe ser un número';
    } else if (this._data.price < 0) {
      this._errors.price = 'El precio no puede ser negativo';
    }
    
    // Validación del costo
    if (typeof this._data.cost !== 'number') {
      this._errors.cost = 'El costo debe ser un número';
    } else if (this._data.cost < 0) {
      this._errors.cost = 'El costo no puede ser negativo';
    }
    
    // Validación del stock
    if (typeof this._data.stock !== 'number') {
      this._errors.stock = 'El stock debe ser un número';
    } else if (this._data.stock < 0) {
      this._errors.stock = 'El stock no puede ser negativo';
    }
    
    // Validación del stock mínimo
    if (typeof this._data.minStock !== 'number') {
      this._errors.minStock = 'El stock mínimo debe ser un número';
    } else if (this._data.minStock < 0) {
      this._errors.minStock = 'El stock mínimo no puede ser negativo';
    }
    
    return Object.keys(this._errors).length === 0;
  }

  /**
   * Calcula el margen de beneficio del producto
   * @returns {number} - Margen de beneficio en porcentaje
   */
  getProfitMargin() {
    if (this._data.cost <= 0) return 0;
    return ((this._data.price - this._data.cost) / this._data.cost) * 100;
  }

  /**
   * Verifica si el producto está por debajo del stock mínimo
   * @returns {boolean} - true si el stock está por debajo del mínimo
   */
  isBelowMinStock() {
    return this._data.stock < this._data.minStock;
  }

  /**
   * Actualiza el stock del producto
   * @param {number} quantity - Cantidad a añadir (positivo) o restar (negativo)
   * @returns {Product} - Instancia actual para encadenamiento
   */
  updateStock(quantity) {
    const newStock = this._data.stock + quantity;
    if (newStock < 0) {
      throw new Error('No hay suficiente stock disponible');
    }
    this._data.stock = newStock;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Obtiene el ID del producto
   * @returns {string} - ID del producto
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre del producto
   * @returns {string} - Nombre del producto
   */
  get name() {
    return this._data.name;
  }

  /**
   * Establece el nombre del producto
   * @param {string} value - Nuevo nombre
   */
  set name(value) {
    this._data.name = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el SKU del producto
   * @returns {string} - SKU del producto
   */
  get sku() {
    return this._data.sku;
  }

  /**
   * Establece el SKU del producto
   * @param {string} value - Nuevo SKU
   */
  set sku(value) {
    this._data.sku = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la descripción del producto
   * @returns {string} - Descripción del producto
   */
  get description() {
    return this._data.description;
  }

  /**
   * Establece la descripción del producto
   * @param {string} value - Nueva descripción
   */
  set description(value) {
    this._data.description = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el precio del producto
   * @returns {number} - Precio del producto
   */
  get price() {
    return this._data.price;
  }

  /**
   * Establece el precio del producto
   * @param {number} value - Nuevo precio
   */
  set price(value) {
    this._data.price = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el costo del producto
   * @returns {number} - Costo del producto
   */
  get cost() {
    return this._data.cost;
  }

  /**
   * Establece el costo del producto
   * @param {number} value - Nuevo costo
   */
  set cost(value) {
    this._data.cost = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el stock actual del producto
   * @returns {number} - Stock actual
   */
  get stock() {
    return this._data.stock;
  }

  /**
   * Establece el stock del producto
   * @param {number} value - Nuevo stock
   */
  set stock(value) {
    this._data.stock = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el stock mínimo del producto
   * @returns {number} - Stock mínimo
   */
  get minStock() {
    return this._data.minStock;
  }

  /**
   * Establece el stock mínimo del producto
   * @param {number} value - Nuevo stock mínimo
   */
  set minStock(value) {
    this._data.minStock = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la categoría del producto
   * @returns {string} - Categoría del producto
   */
  get category() {
    return this._data.category;
  }

  /**
   * Establece la categoría del producto
   * @param {string} value - Nueva categoría
   */
  set category(value) {
    this._data.category = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el proveedor del producto
   * @returns {string} - Proveedor del producto
   */
  get supplier() {
    return this._data.supplier;
  }

  /**
   * Establece el proveedor del producto
   * @param {string} value - Nuevo proveedor
   */
  set supplier(value) {
    this._data.supplier = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la ubicación del producto
   * @returns {string} - Ubicación del producto
   */
  get location() {
    return this._data.location;
  }

  /**
   * Establece la ubicación del producto
   * @param {string} value - Nueva ubicación
   */
  set location(value) {
    this._data.location = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la URL de la imagen del producto
   * @returns {string} - URL de la imagen
   */
  get imageUrl() {
    return this._data.imageUrl;
  }

  /**
   * Establece la URL de la imagen del producto
   * @param {string} value - Nueva URL de imagen
   */
  set imageUrl(value) {
    this._data.imageUrl = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código de barras del producto
   * @returns {string} - Código de barras
   */
  get barcode() {
    return this._data.barcode;
  }

  /**
   * Establece el código de barras del producto
   * @param {string} value - Nuevo código de barras
   */
  set barcode(value) {
    this._data.barcode = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene si el producto está activo
   * @returns {boolean} - true si está activo, false en caso contrario
   */
  get isActive() {
    return this._data.isActive;
  }

  /**
   * Establece si el producto está activo
   * @param {boolean} value - Nuevo estado de activación
   */
  set isActive(value) {
    this._data.isActive = Boolean(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación del producto
   * @returns {string} - Fecha de creación en formato ISO
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de última actualización del producto
   * @returns {string} - Fecha de actualización en formato ISO
   */
  get updatedAt() {
    return this._data.updatedAt;
  }
}

// Named export para consistencia
export { Product };
export default Product;