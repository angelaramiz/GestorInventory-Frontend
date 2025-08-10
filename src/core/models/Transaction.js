/**
 * @fileoverview Modelo para representar transacciones de inventario
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa una transacción de inventario
 * @extends BaseModel
 */
class Transaction extends BaseModel {
  /**
   * Crea una nueva instancia de Transaction
   * @param {Object} data - Datos iniciales para la transacción
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      type: data.type || '', // 'entry', 'exit', 'transfer', 'adjustment'
      sourceId: data.sourceId || '', // ID del inventario de origen o proveedor
      destinationId: data.destinationId || '', // ID del inventario de destino o cliente
      items: data.items || [], // Array de objetos {productId, batchId, quantity, cost, price}
      status: data.status || 'pending', // 'pending', 'completed', 'cancelled'
      documentNumber: data.documentNumber || '',
      documentType: data.documentType || '', // 'invoice', 'receipt', 'order', etc.
      date: data.date || new Date().toISOString(),
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      approvedBy: data.approvedBy || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};
  }

  /**
   * Valida los datos de la transacción
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar tipo de transacción
    const validTypes = ['entry', 'exit', 'transfer', 'adjustment'];
    if (!this._data.type) {
      this._errors.type = 'El tipo de transacción es obligatorio';
      isValid = false;
    } else if (!validTypes.includes(this._data.type)) {
      this._errors.type = `El tipo debe ser uno de: ${validTypes.join(', ')}`;
      isValid = false;
    }

    // Validar origen según el tipo
    if (this._data.type === 'entry' || this._data.type === 'transfer') {
      if (!this._data.sourceId) {
        this._errors.sourceId = 'El origen es obligatorio para este tipo de transacción';
        isValid = false;
      }
    }

    // Validar destino según el tipo
    if (this._data.type === 'exit' || this._data.type === 'transfer') {
      if (!this._data.destinationId) {
        this._errors.destinationId = 'El destino es obligatorio para este tipo de transacción';
        isValid = false;
      }
    }

    // Validar que no sean iguales origen y destino en transferencias
    if (this._data.type === 'transfer' && this._data.sourceId === this._data.destinationId) {
      this._errors.destinationId = 'El origen y destino no pueden ser iguales en una transferencia';
      isValid = false;
    }

    // Validar items
    if (!Array.isArray(this._data.items) || this._data.items.length === 0) {
      this._errors.items = 'La transacción debe tener al menos un ítem';
      isValid = false;
    } else {
      // Validar cada ítem
      const itemErrors = [];
      this._data.items.forEach((item, index) => {
        const itemError = {};
        let hasError = false;

        if (!item.productId) {
          itemError.productId = 'El ID del producto es obligatorio';
          hasError = true;
        }

        if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
          itemError.quantity = 'La cantidad debe ser un número';
          hasError = true;
        } else if (item.quantity <= 0) {
          itemError.quantity = 'La cantidad debe ser mayor que cero';
          hasError = true;
        }

        if (typeof item.cost !== 'undefined') {
          if (typeof item.cost !== 'number' || isNaN(item.cost)) {
            itemError.cost = 'El costo debe ser un número';
            hasError = true;
          } else if (item.cost < 0) {
            itemError.cost = 'El costo no puede ser negativo';
            hasError = true;
          }
        }

        if (typeof item.price !== 'undefined') {
          if (typeof item.price !== 'number' || isNaN(item.price)) {
            itemError.price = 'El precio debe ser un número';
            hasError = true;
          } else if (item.price < 0) {
            itemError.price = 'El precio no puede ser negativo';
            hasError = true;
          }
        }

        if (hasError) {
          itemErrors[index] = itemError;
          isValid = false;
        }
      });

      if (itemErrors.length > 0) {
        this._errors.itemDetails = itemErrors;
      }
    }

    // Validar estado
    const validStatus = ['pending', 'completed', 'cancelled'];
    if (!validStatus.includes(this._data.status)) {
      this._errors.status = `El estado debe ser uno de: ${validStatus.join(', ')}`;
      isValid = false;
    }

    // Validar fecha
    if (!this._data.date) {
      this._errors.date = 'La fecha es obligatoria';
      isValid = false;
    } else {
      try {
        new Date(this._data.date);
      } catch (e) {
        this._errors.date = 'Formato de fecha inválido';
        isValid = false;
      }
    }

    // Validar createdBy
    if (!this._data.createdBy) {
      this._errors.createdBy = 'El usuario que crea la transacción es obligatorio';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Completa la transacción
   * @param {string} approvedBy - ID del usuario que aprueba la transacción
   * @returns {Transaction} - La instancia actual para encadenamiento
   * @throws {Error} - Si la transacción no está pendiente o no es válida
   */
  complete(approvedBy) {
    if (this._data.status !== 'pending') {
      throw new Error(`No se puede completar una transacción con estado ${this._data.status}`);
    }

    if (!this.validate()) {
      throw new Error('No se puede completar una transacción inválida');
    }

    if (!approvedBy) {
      throw new Error('Se requiere un usuario para aprobar la transacción');
    }

    this._data.status = 'completed';
    this._data.approvedBy = approvedBy;
    this._data.updatedAt = new Date().toISOString();

    return this;
  }

  /**
   * Cancela la transacción
   * @param {string} reason - Razón de la cancelación
   * @returns {Transaction} - La instancia actual para encadenamiento
   * @throws {Error} - Si la transacción ya está completada
   */
  cancel(reason) {
    if (this._data.status === 'completed') {
      throw new Error('No se puede cancelar una transacción ya completada');
    }

    this._data.status = 'cancelled';
    if (reason) {
      this._data.notes = this._data.notes 
        ? `${this._data.notes}\nCancelada: ${reason}` 
        : `Cancelada: ${reason}`;
    }
    this._data.updatedAt = new Date().toISOString();

    return this;
  }

  /**
   * Añade un ítem a la transacción
   * @param {Object} item - Ítem a añadir {productId, batchId, quantity, cost, price}
   * @returns {Transaction} - La instancia actual para encadenamiento
   * @throws {Error} - Si la transacción no está pendiente
   */
  addItem(item) {
    if (this._data.status !== 'pending') {
      throw new Error('No se pueden añadir ítems a una transacción que no está pendiente');
    }

    // Validar ítem básico
    if (!item.productId) {
      throw new Error('El ítem debe tener un ID de producto');
    }

    if (typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity <= 0) {
      throw new Error('El ítem debe tener una cantidad válida mayor que cero');
    }

    // Añadir ítem
    this._data.items.push({
      productId: item.productId,
      batchId: item.batchId || null,
      quantity: item.quantity,
      cost: typeof item.cost === 'number' ? item.cost : 0,
      price: typeof item.price === 'number' ? item.price : 0
    });

    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Elimina un ítem de la transacción por su índice
   * @param {number} index - Índice del ítem a eliminar
   * @returns {Transaction} - La instancia actual para encadenamiento
   * @throws {Error} - Si la transacción no está pendiente o el índice es inválido
   */
  removeItem(index) {
    if (this._data.status !== 'pending') {
      throw new Error('No se pueden eliminar ítems de una transacción que no está pendiente');
    }

    if (index < 0 || index >= this._data.items.length) {
      throw new Error('Índice de ítem inválido');
    }

    this._data.items.splice(index, 1);
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Actualiza un ítem de la transacción
   * @param {number} index - Índice del ítem a actualizar
   * @param {Object} updates - Propiedades a actualizar
   * @returns {Transaction} - La instancia actual para encadenamiento
   * @throws {Error} - Si la transacción no está pendiente o el índice es inválido
   */
  updateItem(index, updates) {
    if (this._data.status !== 'pending') {
      throw new Error('No se pueden actualizar ítems de una transacción que no está pendiente');
    }

    if (index < 0 || index >= this._data.items.length) {
      throw new Error('Índice de ítem inválido');
    }

    // Validar cantidad si se proporciona
    if (updates.hasOwnProperty('quantity')) {
      if (typeof updates.quantity !== 'number' || isNaN(updates.quantity) || updates.quantity <= 0) {
        throw new Error('La cantidad debe ser un número mayor que cero');
      }
    }

    // Validar costo si se proporciona
    if (updates.hasOwnProperty('cost')) {
      if (typeof updates.cost !== 'number' || isNaN(updates.cost) || updates.cost < 0) {
        throw new Error('El costo debe ser un número no negativo');
      }
    }

    // Validar precio si se proporciona
    if (updates.hasOwnProperty('price')) {
      if (typeof updates.price !== 'number' || isNaN(updates.price) || updates.price < 0) {
        throw new Error('El precio debe ser un número no negativo');
      }
    }

    // Actualizar ítem
    this._data.items[index] = {
      ...this._data.items[index],
      ...updates
    };

    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Calcula el valor total de la transacción
   * @param {string} field - Campo a utilizar para el cálculo ('cost' o 'price')
   * @returns {number} - Valor total
   */
  getTotalValue(field = 'cost') {
    if (field !== 'cost' && field !== 'price') {
      throw new Error('El campo debe ser "cost" o "price"');
    }

    return this._data.items.reduce((total, item) => {
      return total + (item[field] || 0) * item.quantity;
    }, 0);
  }

  /**
   * Obtiene la cantidad total de ítems en la transacción
   * @returns {number} - Cantidad total
   */
  getTotalQuantity() {
    return this._data.items.reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  }

  /**
   * Obtiene el número de ítems únicos en la transacción
   * @returns {number} - Número de ítems únicos
   */
  getUniqueItemsCount() {
    const uniqueProductIds = new Set(this._data.items.map(item => item.productId));
    return uniqueProductIds.size;
  }

  // Getters y setters

  /**
   * Obtiene el ID de la transacción
   * @returns {string} - ID de la transacción
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el tipo de transacción
   * @returns {string} - Tipo de transacción
   */
  get type() {
    return this._data.type;
  }

  /**
   * Establece el tipo de transacción
   * @param {string} value - Tipo de transacción
   */
  set type(value) {
    const validTypes = ['entry', 'exit', 'transfer', 'adjustment'];
    if (!validTypes.includes(value)) {
      throw new Error(`Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`);
    }
    this._data.type = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID de origen
   * @returns {string} - ID de origen
   */
  get sourceId() {
    return this._data.sourceId;
  }

  /**
   * Establece el ID de origen
   * @param {string} value - ID de origen
   */
  set sourceId(value) {
    this._data.sourceId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID de destino
   * @returns {string} - ID de destino
   */
  get destinationId() {
    return this._data.destinationId;
  }

  /**
   * Establece el ID de destino
   * @param {string} value - ID de destino
   */
  set destinationId(value) {
    this._data.destinationId = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene los ítems de la transacción
   * @returns {Array} - Ítems de la transacción
   */
  get items() {
    return [...this._data.items]; // Devolver copia para evitar modificación directa
  }

  /**
   * Obtiene el estado de la transacción
   * @returns {string} - Estado de la transacción
   */
  get status() {
    return this._data.status;
  }

  /**
   * Establece el estado de la transacción
   * @param {string} value - Estado de la transacción
   */
  set status(value) {
    const validStatus = ['pending', 'completed', 'cancelled'];
    if (!validStatus.includes(value)) {
      throw new Error(`Estado inválido. Debe ser uno de: ${validStatus.join(', ')}`);
    }
    this._data.status = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el número de documento
   * @returns {string} - Número de documento
   */
  get documentNumber() {
    return this._data.documentNumber;
  }

  /**
   * Establece el número de documento
   * @param {string} value - Número de documento
   */
  set documentNumber(value) {
    this._data.documentNumber = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el tipo de documento
   * @returns {string} - Tipo de documento
   */
  get documentType() {
    return this._data.documentType;
  }

  /**
   * Establece el tipo de documento
   * @param {string} value - Tipo de documento
   */
  set documentType(value) {
    this._data.documentType = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de la transacción
   * @returns {string} - Fecha de la transacción
   */
  get date() {
    return this._data.date;
  }

  /**
   * Establece la fecha de la transacción
   * @param {string|Date} value - Fecha de la transacción
   */
  set date(value) {
    if (value instanceof Date) {
      this._data.date = value.toISOString();
    } else {
      try {
        // Validar que sea una fecha válida
        new Date(value);
        this._data.date = value;
      } catch (e) {
        throw new Error('Formato de fecha inválido');
      }
    }
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene las notas de la transacción
   * @returns {string} - Notas de la transacción
   */
  get notes() {
    return this._data.notes;
  }

  /**
   * Establece las notas de la transacción
   * @param {string} value - Notas de la transacción
   */
  set notes(value) {
    this._data.notes = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID del usuario que creó la transacción
   * @returns {string} - ID del usuario
   */
  get createdBy() {
    return this._data.createdBy;
  }

  /**
   * Establece el ID del usuario que creó la transacción
   * @param {string} value - ID del usuario
   */
  set createdBy(value) {
    this._data.createdBy = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID del usuario que aprobó la transacción
   * @returns {string|null} - ID del usuario o null si no ha sido aprobada
   */
  get approvedBy() {
    return this._data.approvedBy;
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

export default Transaction;