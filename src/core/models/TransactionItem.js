/**
 * @fileoverview Modelo para representar ítems de transacción
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa un ítem de transacción
 * @extends BaseModel
 */
class TransactionItem extends BaseModel {
  /**
   * Crea una nueva instancia de TransactionItem
   * @param {Object} data - Datos iniciales para el ítem de transacción
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      transactionId: data.transactionId || null,
      productId: data.productId || null,
      batchId: data.batchId || null,
      quantity: data.quantity || 0,
      requestedQuantity: data.requestedQuantity || 0,
      unitCost: data.unitCost || 0,
      unitPrice: data.unitPrice || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      subtotal: data.subtotal || 0,
      total: data.total || 0,
      notes: data.notes || '',
      status: data.status || 'pending', // pending, completed, cancelled
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};

    // Calcular subtotal y total si no se proporcionan
    if (!data.subtotal || !data.total) {
      this.calculateAmounts();
    }
  }

  /**
   * Valida los datos del ítem de transacción
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar transactionId
    if (!this._data.transactionId) {
      this._errors.transactionId = 'El ID de transacción es obligatorio';
      isValid = false;
    }

    // Validar productId
    if (!this._data.productId) {
      this._errors.productId = 'El ID de producto es obligatorio';
      isValid = false;
    }

    // Validar cantidad
    if (typeof this._data.quantity !== 'number' || this._data.quantity < 0) {
      this._errors.quantity = 'La cantidad debe ser un número no negativo';
      isValid = false;
    }

    // Validar cantidad solicitada
    if (typeof this._data.requestedQuantity !== 'number' || this._data.requestedQuantity < 0) {
      this._errors.requestedQuantity = 'La cantidad solicitada debe ser un número no negativo';
      isValid = false;
    }

    // Validar costo unitario
    if (typeof this._data.unitCost !== 'number' || this._data.unitCost < 0) {
      this._errors.unitCost = 'El costo unitario debe ser un número no negativo';
      isValid = false;
    }

    // Validar precio unitario
    if (typeof this._data.unitPrice !== 'number' || this._data.unitPrice < 0) {
      this._errors.unitPrice = 'El precio unitario debe ser un número no negativo';
      isValid = false;
    }

    // Validar descuento
    if (typeof this._data.discount !== 'number' || this._data.discount < 0) {
      this._errors.discount = 'El descuento debe ser un número no negativo';
      isValid = false;
    }

    // Validar impuesto
    if (typeof this._data.tax !== 'number' || this._data.tax < 0) {
      this._errors.tax = 'El impuesto debe ser un número no negativo';
      isValid = false;
    }

    // Validar subtotal
    if (typeof this._data.subtotal !== 'number') {
      this._errors.subtotal = 'El subtotal debe ser un número';
      isValid = false;
    }

    // Validar total
    if (typeof this._data.total !== 'number') {
      this._errors.total = 'El total debe ser un número';
      isValid = false;
    }

    // Validar estado
    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(this._data.status)) {
      this._errors.status = `El estado debe ser uno de: ${validStatuses.join(', ')}`;
      isValid = false;
    }

    return isValid;
  }

  /**
   * Calcula el subtotal y total del ítem
   * @returns {TransactionItem} - La instancia actual para encadenamiento
   */
  calculateAmounts() {
    // Subtotal = cantidad * precio unitario
    this._data.subtotal = this._data.quantity * this._data.unitPrice;
    
    // Aplicar descuento
    const discountAmount = this._data.subtotal * (this._data.discount / 100);
    const afterDiscount = this._data.subtotal - discountAmount;
    
    // Aplicar impuesto
    const taxAmount = afterDiscount * (this._data.tax / 100);
    
    // Total = subtotal - descuento + impuesto
    this._data.total = afterDiscount + taxAmount;
    
    // Redondear a 2 decimales
    this._data.subtotal = Math.round(this._data.subtotal * 100) / 100;
    this._data.total = Math.round(this._data.total * 100) / 100;
    
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Actualiza la cantidad del ítem
   * @param {number} quantity - Nueva cantidad
   * @returns {TransactionItem} - La instancia actual para encadenamiento
   */
  updateQuantity(quantity) {
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new Error('La cantidad debe ser un número no negativo');
    }
    this._data.quantity = quantity;
    this.calculateAmounts();
    return this;
  }

  /**
   * Completa el ítem de transacción
   * @returns {TransactionItem} - La instancia actual para encadenamiento
   */
  complete() {
    this._data.status = 'completed';
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Cancela el ítem de transacción
   * @returns {TransactionItem} - La instancia actual para encadenamiento
   */
  cancel() {
    this._data.status = 'cancelled';
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Verifica si el ítem está pendiente
   * @returns {boolean} - True si está pendiente, false en caso contrario
   */
  isPending() {
    return this._data.status === 'pending';
  }

  /**
   * Verifica si el ítem está completado
   * @returns {boolean} - True si está completado, false en caso contrario
   */
  isCompleted() {
    return this._data.status === 'completed';
  }

  /**
   * Verifica si el ítem está cancelado
   * @returns {boolean} - True si está cancelado, false en caso contrario
   */
  isCancelled() {
    return this._data.status === 'cancelled';
  }

  /**
   * Calcula la diferencia entre la cantidad solicitada y la cantidad actual
   * @returns {number} - Diferencia de cantidad
   */
  getQuantityDifference() {
    return this._data.requestedQuantity - this._data.quantity;
  }

  /**
   * Verifica si la cantidad actual coincide con la cantidad solicitada
   * @returns {boolean} - True si coinciden, false en caso contrario
   */
  isQuantityFulfilled() {
    return this._data.quantity >= this._data.requestedQuantity;
  }

  // Getters y setters

  /**
   * Obtiene el ID del ítem
   * @returns {string} - ID del ítem
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el ID de la transacción
   * @returns {string} - ID de la transacción
   */
  get transactionId() {
    return this._data.transactionId;
  }

  /**
   * Establece el ID de la transacción
   * @param {string} value - ID de la transacción
   */
  set transactionId(value) {
    this._data.transactionId = value;
    this._data.updatedAt = new Date().toISOString();
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
   * @param {string} value - ID del producto
   */
  set productId(value) {
    this._data.productId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID del lote
   * @returns {string|null} - ID del lote o null si no tiene
   */
  get batchId() {
    return this._data.batchId;
  }

  /**
   * Establece el ID del lote
   * @param {string|null} value - ID del lote
   */
  set batchId(value) {
    this._data.batchId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la cantidad
   * @returns {number} - Cantidad
   */
  get quantity() {
    return this._data.quantity;
  }

  /**
   * Establece la cantidad
   * @param {number} value - Cantidad
   */
  set quantity(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('La cantidad debe ser un número no negativo');
    }
    this._data.quantity = value;
    this.calculateAmounts();
  }

  /**
   * Obtiene la cantidad solicitada
   * @returns {number} - Cantidad solicitada
   */
  get requestedQuantity() {
    return this._data.requestedQuantity;
  }

  /**
   * Establece la cantidad solicitada
   * @param {number} value - Cantidad solicitada
   */
  set requestedQuantity(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('La cantidad solicitada debe ser un número no negativo');
    }
    this._data.requestedQuantity = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el costo unitario
   * @returns {number} - Costo unitario
   */
  get unitCost() {
    return this._data.unitCost;
  }

  /**
   * Establece el costo unitario
   * @param {number} value - Costo unitario
   */
  set unitCost(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('El costo unitario debe ser un número no negativo');
    }
    this._data.unitCost = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el precio unitario
   * @returns {number} - Precio unitario
   */
  get unitPrice() {
    return this._data.unitPrice;
  }

  /**
   * Establece el precio unitario
   * @param {number} value - Precio unitario
   */
  set unitPrice(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('El precio unitario debe ser un número no negativo');
    }
    this._data.unitPrice = value;
    this.calculateAmounts();
  }

  /**
   * Obtiene el descuento
   * @returns {number} - Descuento
   */
  get discount() {
    return this._data.discount;
  }

  /**
   * Establece el descuento
   * @param {number} value - Descuento
   */
  set discount(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('El descuento debe ser un número no negativo');
    }
    this._data.discount = value;
    this.calculateAmounts();
  }

  /**
   * Obtiene el impuesto
   * @returns {number} - Impuesto
   */
  get tax() {
    return this._data.tax;
  }

  /**
   * Establece el impuesto
   * @param {number} value - Impuesto
   */
  set tax(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('El impuesto debe ser un número no negativo');
    }
    this._data.tax = value;
    this.calculateAmounts();
  }

  /**
   * Obtiene el subtotal
   * @returns {number} - Subtotal
   */
  get subtotal() {
    return this._data.subtotal;
  }

  /**
   * Obtiene el total
   * @returns {number} - Total
   */
  get total() {
    return this._data.total;
  }

  /**
   * Obtiene las notas
   * @returns {string} - Notas
   */
  get notes() {
    return this._data.notes;
  }

  /**
   * Establece las notas
   * @param {string} value - Notas
   */
  set notes(value) {
    this._data.notes = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el estado
   * @returns {string} - Estado
   */
  get status() {
    return this._data.status;
  }

  /**
   * Establece el estado
   * @param {string} value - Estado
   */
  set status(value) {
    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(value)) {
      throw new Error(`El estado debe ser uno de: ${validStatuses.join(', ')}`);
    }
    this._data.status = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación
   * @returns {string} - Fecha de creación
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de actualización
   * @returns {string} - Fecha de actualización
   */
  get updatedAt() {
    return this._data.updatedAt;
  }
}

export default TransactionItem;