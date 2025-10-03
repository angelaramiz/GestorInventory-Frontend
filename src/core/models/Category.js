/**
 * @fileoverview Modelo para representar categorías de productos
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa una categoría de productos
 * @extends BaseModel
 */
class Category extends BaseModel {
  /**
   * Crea una nueva instancia de Category
   * @param {Object} data - Datos iniciales para la categoría
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      parentId: data.parentId || null,
      path: data.path || '',
      level: data.level || 0,
      active: data.hasOwnProperty('active') ? data.active : true,
      attributes: data.attributes || [],
      imageUrl: data.imageUrl || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};
  }

  /**
   * Valida los datos de la categoría
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar nombre
    if (!this._data.name) {
      this._errors.name = 'El nombre de la categoría es obligatorio';
      isValid = false;
    }

    // Validar código
    if (this._data.code && this._data.code.length > 20) {
      this._errors.code = 'El código no puede tener más de 20 caracteres';
      isValid = false;
    }

    // Validar nivel
    if (typeof this._data.level !== 'number' || this._data.level < 0) {
      this._errors.level = 'El nivel debe ser un número no negativo';
      isValid = false;
    }

    // Validar active
    if (typeof this._data.active !== 'boolean') {
      this._errors.active = 'El estado activo debe ser un booleano';
      isValid = false;
    }

    // Validar atributos
    if (!Array.isArray(this._data.attributes)) {
      this._errors.attributes = 'Los atributos deben ser un array';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Activa la categoría
   * @returns {Category} - La instancia actual para encadenamiento
   */
  activate() {
    this._data.active = true;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Desactiva la categoría
   * @returns {Category} - La instancia actual para encadenamiento
   */
  deactivate() {
    this._data.active = false;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Establece la categoría padre
   * @param {string} parentId - ID de la categoría padre
   * @param {string} parentPath - Ruta de la categoría padre
   * @param {number} parentLevel - Nivel de la categoría padre
   * @returns {Category} - La instancia actual para encadenamiento
   */
  setParent(parentId, parentPath, parentLevel) {
    if (!parentId) {
      this._data.parentId = null;
      this._data.path = '';
      this._data.level = 0;
    } else {
      this._data.parentId = parentId;
      this._data.path = parentPath ? `${parentPath}/${this._data.id}` : this._data.id;
      this._data.level = (parentLevel || 0) + 1;
    }
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Elimina la categoría padre
   * @returns {Category} - La instancia actual para encadenamiento
   */
  removeParent() {
    return this.setParent(null, '', 0);
  }

  /**
   * Añade un atributo a la categoría
   * @param {Object} attribute - Atributo a añadir
   * @param {string} attribute.name - Nombre del atributo
   * @param {string} attribute.type - Tipo del atributo (text, number, boolean, date, etc.)
   * @param {boolean} attribute.required - Si el atributo es obligatorio
   * @param {*} attribute.defaultValue - Valor por defecto del atributo
   * @returns {Category} - La instancia actual para encadenamiento
   */
  addAttribute(attribute) {
    if (!attribute || typeof attribute !== 'object' || !attribute.name || !attribute.type) {
      throw new Error('El atributo debe tener al menos un nombre y un tipo');
    }

    // Verificar si ya existe un atributo con el mismo nombre
    const existingIndex = this._data.attributes.findIndex(attr => attr.name === attribute.name);
    if (existingIndex !== -1) {
      // Actualizar el atributo existente
      this._data.attributes[existingIndex] = { ...attribute };
    } else {
      // Añadir nuevo atributo
      this._data.attributes.push({ ...attribute });
    }

    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Elimina un atributo de la categoría
   * @param {string} attributeName - Nombre del atributo a eliminar
   * @returns {Category} - La instancia actual para encadenamiento
   */
  removeAttribute(attributeName) {
    const index = this._data.attributes.findIndex(attr => attr.name === attributeName);
    if (index !== -1) {
      this._data.attributes.splice(index, 1);
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Verifica si la categoría tiene un atributo específico
   * @param {string} attributeName - Nombre del atributo a verificar
   * @returns {boolean} - True si tiene el atributo, false en caso contrario
   */
  hasAttribute(attributeName) {
    return this._data.attributes.some(attr => attr.name === attributeName);
  }

  /**
   * Obtiene un atributo por su nombre
   * @param {string} attributeName - Nombre del atributo a obtener
   * @returns {Object|null} - El atributo o null si no existe
   */
  getAttribute(attributeName) {
    const attribute = this._data.attributes.find(attr => attr.name === attributeName);
    return attribute ? { ...attribute } : null;
  }

  /**
   * Verifica si la categoría es una categoría raíz (sin padre)
   * @returns {boolean} - True si es una categoría raíz, false en caso contrario
   */
  isRoot() {
    return !this._data.parentId;
  }

  /**
   * Verifica si la categoría es una subcategoría de otra
   * @param {string} categoryId - ID de la categoría a verificar
   * @returns {boolean} - True si es una subcategoría, false en caso contrario
   */
  isChildOf(categoryId) {
    if (!categoryId || !this._data.path) return false;
    const pathParts = this._data.path.split('/');
    return pathParts.includes(categoryId);
  }

  // Getters y setters

  /**
   * Obtiene el ID de la categoría
   * @returns {string} - ID de la categoría
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre de la categoría
   * @returns {string} - Nombre de la categoría
   */
  get name() {
    return this._data.name;
  }

  /**
   * Establece el nombre de la categoría
   * @param {string} value - Nombre de la categoría
   */
  set name(value) {
    this._data.name = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código de la categoría
   * @returns {string} - Código de la categoría
   */
  get code() {
    return this._data.code;
  }

  /**
   * Establece el código de la categoría
   * @param {string} value - Código de la categoría
   */
  set code(value) {
    this._data.code = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la descripción de la categoría
   * @returns {string} - Descripción de la categoría
   */
  get description() {
    return this._data.description;
  }

  /**
   * Establece la descripción de la categoría
   * @param {string} value - Descripción de la categoría
   */
  set description(value) {
    this._data.description = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID de la categoría padre
   * @returns {string|null} - ID de la categoría padre o null si no tiene
   */
  get parentId() {
    return this._data.parentId;
  }

  /**
   * Obtiene la ruta de la categoría
   * @returns {string} - Ruta de la categoría
   */
  get path() {
    return this._data.path;
  }

  /**
   * Obtiene el nivel de la categoría
   * @returns {number} - Nivel de la categoría
   */
  get level() {
    return this._data.level;
  }

  /**
   * Obtiene el estado activo de la categoría
   * @returns {boolean} - Estado activo de la categoría
   */
  get active() {
    return this._data.active;
  }

  /**
   * Establece el estado activo de la categoría
   * @param {boolean} value - Estado activo de la categoría
   */
  set active(value) {
    this._data.active = Boolean(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene los atributos de la categoría
   * @returns {Array<Object>} - Atributos de la categoría
   */
  get attributes() {
    return [...this._data.attributes]; // Devolver copia para evitar modificación directa
  }

  /**
   * Establece los atributos de la categoría
   * @param {Array<Object>} value - Atributos de la categoría
   */
  set attributes(value) {
    if (!Array.isArray(value)) {
      throw new Error('Los atributos deben ser un array');
    }
    this._data.attributes = [...value]; // Crear copia para evitar referencias
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la URL de la imagen de la categoría
   * @returns {string} - URL de la imagen
   */
  get imageUrl() {
    return this._data.imageUrl;
  }

  /**
   * Establece la URL de la imagen de la categoría
   * @param {string} value - URL de la imagen
   */
  set imageUrl(value) {
    this._data.imageUrl = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación de la categoría
   * @returns {string} - Fecha de creación
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de actualización de la categoría
   * @returns {string} - Fecha de actualización
   */
  get updatedAt() {
    return this._data.updatedAt;
  }
}

export default Category;
export { Category }; // Named export