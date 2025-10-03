/**
 * @fileoverview Modelo de Lote
 * @module core/models/Batch
 */

import BaseModel from './BaseModel.js';

/**
 * Clase que representa un lote de productos en el sistema
 * @extends BaseModel
 */
class Batch extends BaseModel {
  /**
   * @param {Object} data - Datos iniciales del lote
   */
  constructor(data = {}) {
    super(data);
    
    // Asegurar que siempre tenga un ID
    if (!this._data.id) {
      this._data.id = Batch.generateId();
    }
    
    // Valores por defecto
    this._data.productId = this._data.productId || '';
    this._data.inventoryId = this._data.inventoryId || '';
    this._data.quantity = this._data.quantity || 0;
    this._data.cost = this._data.cost || 0;
    this._data.price = this._data.price || 0;
    this._data.batchNumber = this._data.batchNumber || '';
    this._data.expirationDate = this._data.expirationDate || null;
    this._data.manufacturingDate = this._data.manufacturingDate || null;
    this._data.supplier = this._data.supplier || '';
    this._data.notes = this._data.notes || '';
    this._data.status = this._data.status || 'active'; // active, depleted, expired, quarantine
    this._data.createdAt = this._data.createdAt || new Date().toISOString();
    this._data.updatedAt = this._data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida el modelo de lote
   * @returns {boolean} - true si el lote es válido, false en caso contrario
   */
  validate() {
    this._errors = {};
    
    // Validación del ID de producto
    if (!this._data.productId) {
      this._errors.productId = 'El ID del producto es obligatorio';
    }
    
    // Validación del ID de inventario
    if (!this._data.inventoryId) {
      this._errors.inventoryId = 'El ID del inventario es obligatorio';
    }
    
    // Validación de la cantidad
    if (typeof this._data.quantity !== 'number') {
      this._errors.quantity = 'La cantidad debe ser un número';
    } else if (this._data.quantity < 0) {
      this._errors.quantity = 'La cantidad no puede ser negativa';
    }
    
    // Validación del costo
    if (typeof this._data.cost !== 'number') {
      this._errors.cost = 'El costo debe ser un número';
    } else if (this._data.cost < 0) {
      this._errors.cost = 'El costo no puede ser negativo';
    }
    
    // Validación del precio
    if (typeof this._data.price !== 'number') {
      this._errors.price = 'El precio debe ser un número';
    } else if (this._data.price < 0) {
      this._errors.price = 'El precio no puede ser negativo';
    }
    
    // Validación del estado
    const validStatuses = ['active', 'depleted', 'expired', 'quarantine'];
    if (!validStatuses.includes(this._data.status)) {
      this._errors.status = `El estado debe ser uno de: ${validStatuses.join(', ')}`;
    }
    
    // Validación de fechas
    if (this._data.expirationDate) {
      try {
        new Date(this._data.expirationDate);
      } catch (e) {
        this._errors.expirationDate = 'La fecha de expiración no es válida';
      }
    }
    
    if (this._data.manufacturingDate) {
      try {
        new Date(this._data.manufacturingDate);
      } catch (e) {
        this._errors.manufacturingDate = 'La fecha de fabricación no es válida';
      }
    }
    
    return Object.keys(this._errors).length === 0;
  }

  /**
   * Actualiza la cantidad del lote
   * @param {number} quantity - Cantidad a añadir (positivo) o restar (negativo)
   * @returns {Batch} - Instancia actual para encadenamiento
   */
  updateQuantity(quantity) {
    const newQuantity = this._data.quantity + quantity;
    if (newQuantity < 0) {
      throw new Error('No hay suficiente cantidad disponible en el lote');
    }
    
    this._data.quantity = newQuantity;
    this._data.updatedAt = new Date().toISOString();
    
    // Actualizar el estado si la cantidad llega a cero
    if (newQuantity === 0) {
      this._data.status = 'depleted';
    }
    
    return this;
  }

  /**
   * Verifica si el lote está expirado
   * @returns {boolean} - true si el lote está expirado, false en caso contrario
   */
  isExpired() {
    if (!this._data.expirationDate) return false;
    
    const now = new Date();
    const expirationDate = new Date(this._data.expirationDate);
    
    return now > expirationDate;
  }

  /**
   * Marca el lote como expirado
   * @returns {Batch} - Instancia actual para encadenamiento
   */
  markAsExpired() {
    this._data.status = 'expired';
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Marca el lote como en cuarentena
   * @param {string} reason - Razón de la cuarentena
   * @returns {Batch} - Instancia actual para encadenamiento
   */
  markAsQuarantine(reason = '') {
    this._data.status = 'quarantine';
    this._data.notes = reason ? `${this._data.notes}\nEn cuarentena: ${reason}`.trim() : this._data.notes;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Marca el lote como activo
   * @returns {Batch} - Instancia actual para encadenamiento
   */
  markAsActive() {
    if (this._data.quantity <= 0) {
      throw new Error('No se puede marcar como activo un lote sin existencias');
    }
    
    if (this.isExpired()) {
      throw new Error('No se puede marcar como activo un lote expirado');
    }
    
    this._data.status = 'active';
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Calcula el valor total del lote (cantidad * costo)
   * @returns {number} - Valor total del lote
   */
  getTotalValue() {
    return this._data.quantity * this._data.cost;
  }

  /**
   * Calcula los días restantes hasta la expiración
   * @returns {number|null} - Días restantes o null si no hay fecha de expiración
   */
  getDaysUntilExpiration() {
    if (!this._data.expirationDate) return null;
    
    const now = new Date();
    const expirationDate = new Date(this._data.expirationDate);
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Obtiene el ID del lote
   * @returns {string} - ID del lote
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el ID del producto
   * @returns {string} - ID del producto
   */
  get productId() {
    return this._data.productId;
  }

  /**
   * Establece el ID del producto
   * @param {string} value - Nuevo ID de producto
   */
  set productId(value) {
    this._data.productId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID del inventario
   * @returns {string} - ID del inventario
   */
  get inventoryId() {
    return this._data.inventoryId;
  }

  /**
   * Establece el ID del inventario
   * @param {string} value - Nuevo ID de inventario
   */
  set inventoryId(value) {
    this._data.inventoryId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la cantidad del lote
   * @returns {number} - Cantidad del lote
   */
  get quantity() {
    return this._data.quantity;
  }

  /**
   * Establece la cantidad del lote
   * @param {number} value - Nueva cantidad
   */
  set quantity(value) {
    const newQuantity = Number(value);
    if (newQuantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    
    this._data.quantity = newQuantity;
    
    // Actualizar el estado si la cantidad llega a cero
    if (newQuantity === 0) {
      this._data.status = 'depleted';
    }
    
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el costo del lote
   * @returns {number} - Costo del lote
   */
  get cost() {
    return this._data.cost;
  }

  /**
   * Establece el costo del lote
   * @param {number} value - Nuevo costo
   */
  set cost(value) {
    this._data.cost = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el precio del lote
   * @returns {number} - Precio del lote
   */
  get price() {
    return this._data.price;
  }

  /**
   * Establece el precio del lote
   * @param {number} value - Nuevo precio
   */
  set price(value) {
    this._data.price = Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el número de lote
   * @returns {string} - Número de lote
   */
  get batchNumber() {
    return this._data.batchNumber;
  }

  /**
   * Establece el número de lote
   * @param {string} value - Nuevo número de lote
   */
  set batchNumber(value) {
    this._data.batchNumber = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de expiración
   * @returns {string|null} - Fecha de expiración
   */
  get expirationDate() {
    return this._data.expirationDate;
  }

  /**
   * Establece la fecha de expiración
   * @param {string|Date} value - Nueva fecha de expiración
   */
  set expirationDate(value) {
    if (value instanceof Date) {
      this._data.expirationDate = value.toISOString();
    } else {
      this._data.expirationDate = value;
    }
    
    // Actualizar el estado si la fecha de expiración es anterior a la fecha actual
    if (this.isExpired()) {
      this._data.status = 'expired';
    }
    
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de fabricación
   * @returns {string|null} - Fecha de fabricación
   */
  get manufacturingDate() {
    return this._data.manufacturingDate;
  }

  /**
   * Establece la fecha de fabricación
   * @param {string|Date} value - Nueva fecha de fabricación
   */
  set manufacturingDate(value) {
    if (value instanceof Date) {
      this._data.manufacturingDate = value.toISOString();
    } else {
      this._data.manufacturingDate = value;
    }
    
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el proveedor del lote
   * @returns {string} - Proveedor del lote
   */
  get supplier() {
    return this._data.supplier;
  }

  /**
   * Establece el proveedor del lote
   * @param {string} value - Nuevo proveedor
   */
  set supplier(value) {
    this._data.supplier = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene las notas del lote
   * @returns {string} - Notas del lote
   */
  get notes() {
    return this._data.notes;
  }

  /**
   * Establece las notas del lote
   * @param {string} value - Nuevas notas
   */
  set notes(value) {
    this._data.notes = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el estado del lote
   * @returns {string} - Estado del lote
   */
  get status() {
    return this._data.status;
  }

  /**
   * Establece el estado del lote
   * @param {string} value - Nuevo estado
   */
  set status(value) {
    const validStatuses = ['active', 'depleted', 'expired', 'quarantine'];
    if (!validStatuses.includes(value)) {
      throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
    }
    
    this._data.status = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación del lote
   * @returns {string} - Fecha de creación en formato ISO
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de última actualización del lote
   * @returns {string} - Fecha de actualización en formato ISO
   */
  get updatedAt() {
    return this._data.updatedAt;
  }
}

export default Batch;
export { Batch }; // Named export para consistencia