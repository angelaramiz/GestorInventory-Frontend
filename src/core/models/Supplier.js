/**
 * @fileoverview Modelo para representar proveedores
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa un proveedor
 * @extends BaseModel
 */
class Supplier extends BaseModel {
  /**
   * Crea una nueva instancia de Supplier
   * @param {Object} data - Datos iniciales para el proveedor
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      name: data.name || '',
      code: data.code || '',
      contactName: data.contactName || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      postalCode: data.postalCode || '',
      taxId: data.taxId || '',
      notes: data.notes || '',
      active: data.hasOwnProperty('active') ? data.active : true,
      categories: data.categories || [],
      paymentTerms: data.paymentTerms || '',
      website: data.website || '',
      rating: data.rating || 0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};
  }

  /**
   * Valida los datos del proveedor
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar nombre
    if (!this._data.name) {
      this._errors.name = 'El nombre del proveedor es obligatorio';
      isValid = false;
    }

    // Validar código
    if (this._data.code && this._data.code.length > 20) {
      this._errors.code = 'El código no puede tener más de 20 caracteres';
      isValid = false;
    }

    // Validar email
    if (this._data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._data.email)) {
      this._errors.email = 'El correo electrónico no es válido';
      isValid = false;
    }

    // Validar teléfono
    if (this._data.phone && !/^[+]?[0-9\s-()]+$/.test(this._data.phone)) {
      this._errors.phone = 'El número de teléfono no es válido';
      isValid = false;
    }

    // Validar categorías
    if (!Array.isArray(this._data.categories)) {
      this._errors.categories = 'Las categorías deben ser un array';
      isValid = false;
    }

    // Validar rating
    if (typeof this._data.rating !== 'number' || this._data.rating < 0 || this._data.rating > 5) {
      this._errors.rating = 'La calificación debe ser un número entre 0 y 5';
      isValid = false;
    }

    // Validar active
    if (typeof this._data.active !== 'boolean') {
      this._errors.active = 'El estado activo debe ser un booleano';
      isValid = false;
    }

    // Validar website
    if (this._data.website && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(this._data.website)) {
      this._errors.website = 'La URL del sitio web no es válida';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Activa el proveedor
   * @returns {Supplier} - La instancia actual para encadenamiento
   */
  activate() {
    this._data.active = true;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Desactiva el proveedor
   * @returns {Supplier} - La instancia actual para encadenamiento
   */
  deactivate() {
    this._data.active = false;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Añade una categoría al proveedor
   * @param {string} category - Categoría a añadir
   * @returns {Supplier} - La instancia actual para encadenamiento
   */
  addCategory(category) {
    if (!this._data.categories.includes(category)) {
      this._data.categories.push(category);
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Elimina una categoría del proveedor
   * @param {string} category - Categoría a eliminar
   * @returns {Supplier} - La instancia actual para encadenamiento
   */
  removeCategory(category) {
    const index = this._data.categories.indexOf(category);
    if (index !== -1) {
      this._data.categories.splice(index, 1);
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Verifica si el proveedor tiene una categoría específica
   * @param {string} category - Categoría a verificar
   * @returns {boolean} - True si tiene la categoría, false en caso contrario
   */
  hasCategory(category) {
    return this._data.categories.includes(category);
  }

  /**
   * Establece la calificación del proveedor
   * @param {number} value - Calificación (0-5)
   * @returns {Supplier} - La instancia actual para encadenamiento
   * @throws {Error} - Si la calificación no es válida
   */
  setRating(value) {
    if (typeof value !== 'number' || value < 0 || value > 5) {
      throw new Error('La calificación debe ser un número entre 0 y 5');
    }
    this._data.rating = value;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Obtiene la dirección completa del proveedor
   * @returns {string} - Dirección completa
   */
  getFullAddress() {
    const parts = [
      this._data.address,
      this._data.city,
      this._data.state,
      this._data.postalCode,
      this._data.country
    ].filter(part => part); // Filtrar partes vacías

    return parts.join(', ');
  }

  // Getters y setters

  /**
   * Obtiene el ID del proveedor
   * @returns {string} - ID del proveedor
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre del proveedor
   * @returns {string} - Nombre del proveedor
   */
  get name() {
    return this._data.name;
  }

  /**
   * Establece el nombre del proveedor
   * @param {string} value - Nombre del proveedor
   */
  set name(value) {
    this._data.name = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código del proveedor
   * @returns {string} - Código del proveedor
   */
  get code() {
    return this._data.code;
  }

  /**
   * Establece el código del proveedor
   * @param {string} value - Código del proveedor
   */
  set code(value) {
    this._data.code = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el nombre de contacto
   * @returns {string} - Nombre de contacto
   */
  get contactName() {
    return this._data.contactName;
  }

  /**
   * Establece el nombre de contacto
   * @param {string} value - Nombre de contacto
   */
  set contactName(value) {
    this._data.contactName = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el correo electrónico
   * @returns {string} - Correo electrónico
   */
  get email() {
    return this._data.email;
  }

  /**
   * Establece el correo electrónico
   * @param {string} value - Correo electrónico
   */
  set email(value) {
    this._data.email = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el teléfono
   * @returns {string} - Teléfono
   */
  get phone() {
    return this._data.phone;
  }

  /**
   * Establece el teléfono
   * @param {string} value - Teléfono
   */
  set phone(value) {
    this._data.phone = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la dirección
   * @returns {string} - Dirección
   */
  get address() {
    return this._data.address;
  }

  /**
   * Establece la dirección
   * @param {string} value - Dirección
   */
  set address(value) {
    this._data.address = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la ciudad
   * @returns {string} - Ciudad
   */
  get city() {
    return this._data.city;
  }

  /**
   * Establece la ciudad
   * @param {string} value - Ciudad
   */
  set city(value) {
    this._data.city = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el estado/provincia
   * @returns {string} - Estado/provincia
   */
  get state() {
    return this._data.state;
  }

  /**
   * Establece el estado/provincia
   * @param {string} value - Estado/provincia
   */
  set state(value) {
    this._data.state = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el país
   * @returns {string} - País
   */
  get country() {
    return this._data.country;
  }

  /**
   * Establece el país
   * @param {string} value - País
   */
  set country(value) {
    this._data.country = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código postal
   * @returns {string} - Código postal
   */
  get postalCode() {
    return this._data.postalCode;
  }

  /**
   * Establece el código postal
   * @param {string} value - Código postal
   */
  set postalCode(value) {
    this._data.postalCode = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID fiscal
   * @returns {string} - ID fiscal
   */
  get taxId() {
    return this._data.taxId;
  }

  /**
   * Establece el ID fiscal
   * @param {string} value - ID fiscal
   */
  set taxId(value) {
    this._data.taxId = value;
    this._data.updatedAt = new Date().toISOString();
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
   * Obtiene el estado activo
   * @returns {boolean} - Estado activo
   */
  get active() {
    return this._data.active;
  }

  /**
   * Establece el estado activo
   * @param {boolean} value - Estado activo
   */
  set active(value) {
    this._data.active = Boolean(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene las categorías
   * @returns {Array<string>} - Categorías
   */
  get categories() {
    return [...this._data.categories]; // Devolver copia para evitar modificación directa
  }

  /**
   * Establece las categorías
   * @param {Array<string>} value - Categorías
   */
  set categories(value) {
    if (!Array.isArray(value)) {
      throw new Error('Las categorías deben ser un array');
    }
    this._data.categories = [...value]; // Crear copia para evitar referencias
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene los términos de pago
   * @returns {string} - Términos de pago
   */
  get paymentTerms() {
    return this._data.paymentTerms;
  }

  /**
   * Establece los términos de pago
   * @param {string} value - Términos de pago
   */
  set paymentTerms(value) {
    this._data.paymentTerms = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el sitio web
   * @returns {string} - Sitio web
   */
  get website() {
    return this._data.website;
  }

  /**
   * Establece el sitio web
   * @param {string} value - Sitio web
   */
  set website(value) {
    this._data.website = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la calificación
   * @returns {number} - Calificación
   */
  get rating() {
    return this._data.rating;
  }

  /**
   * Establece la calificación
   * @param {number} value - Calificación
   */
  set rating(value) {
    if (typeof value !== 'number' || value < 0 || value > 5) {
      throw new Error('La calificación debe ser un número entre 0 y 5');
    }
    this._data.rating = value;
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

export default Supplier;