/**
 * @fileoverview Clase base para todos los modelos de dominio
 * @module core/models/BaseModel
 */

/**
 * Clase base para todos los modelos de dominio
 * Proporciona funcionalidad común como validación, serialización y deserialización
 */
class BaseModel {
  /**
   * @param {Object} data - Datos iniciales para el modelo
   */
  constructor(data = {}) {
    this._data = {};
    this._errors = {};
    this._originalData = {};
    
    if (data) {
      this.fromJSON(data);
      this._originalData = { ...this._data };
    }
  }

  /**
   * Valida el modelo según las reglas definidas en las subclases
   * @returns {boolean} - true si el modelo es válido, false en caso contrario
   */
  validate() {
    this._errors = {};
    return true;
  }

  /**
   * Verifica si el modelo es válido
   * @returns {boolean} - true si el modelo es válido, false en caso contrario
   */
  isValid() {
    return this.validate();
  }

  /**
   * Obtiene los errores de validación
   * @returns {Object} - Objeto con los errores de validación
   */
  getErrors() {
    return this._errors;
  }

  /**
   * Verifica si una propiedad específica tiene errores
   * @param {string} property - Nombre de la propiedad
   * @returns {boolean} - true si la propiedad tiene errores, false en caso contrario
   */
  hasError(property) {
    return Object.prototype.hasOwnProperty.call(this._errors, property);
  }

  /**
   * Obtiene el error de una propiedad específica
   * @param {string} property - Nombre de la propiedad
   * @returns {string|null} - Mensaje de error o null si no hay error
   */
  getError(property) {
    return this.hasError(property) ? this._errors[property] : null;
  }

  /**
   * Convierte el modelo a un objeto JSON
   * @returns {Object} - Representación JSON del modelo
   */
  toJSON() {
    return { ...this._data };
  }

  /**
   * Carga datos en el modelo desde un objeto JSON
   * @param {Object} json - Datos en formato JSON
   * @returns {BaseModel} - Instancia actual para encadenamiento
   */
  fromJSON(json) {
    if (json && typeof json === 'object') {
      this._data = { ...json };
    }
    return this;
  }

  /**
   * Verifica si el modelo ha sido modificado desde su carga inicial
   * @returns {boolean} - true si el modelo ha sido modificado, false en caso contrario
   */
  isDirty() {
    const currentData = this.toJSON();
    const keys = new Set([...Object.keys(this._originalData), ...Object.keys(currentData)]);
    
    for (const key of keys) {
      if (JSON.stringify(currentData[key]) !== JSON.stringify(this._originalData[key])) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Restablece el modelo a su estado original
   * @returns {BaseModel} - Instancia actual para encadenamiento
   */
  reset() {
    this._data = { ...this._originalData };
    this._errors = {};
    return this;
  }

  /**
   * Actualiza los datos originales con los datos actuales
   * @returns {BaseModel} - Instancia actual para encadenamiento
   */
  commit() {
    this._originalData = { ...this._data };
    return this;
  }

  /**
   * Genera un ID único para el modelo
   * @returns {string} - ID único generado
   */
  static generateId() {
    return crypto.randomUUID();
  }
}

export default BaseModel;