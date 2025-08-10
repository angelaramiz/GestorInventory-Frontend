/**
 * @fileoverview Modelo para representar ubicaciones de almacenamiento
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa una ubicación de almacenamiento
 * @extends BaseModel
 */
class Location extends BaseModel {
  /**
   * Crea una nueva instancia de Location
   * @param {Object} data - Datos iniciales para la ubicación
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      type: data.type || 'warehouse', // warehouse, shelf, bin, etc.
      parentId: data.parentId || null,
      path: data.path || '',
      level: data.level || 0,
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      postalCode: data.postalCode || '',
      capacity: data.capacity || null,
      capacityUnit: data.capacityUnit || null,
      temperature: data.temperature || null,
      temperatureUnit: data.temperatureUnit || 'C',
      humidity: data.humidity || null,
      active: data.hasOwnProperty('active') ? data.active : true,
      attributes: data.attributes || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};
  }

  /**
   * Valida los datos de la ubicación
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar nombre
    if (!this._data.name) {
      this._errors.name = 'El nombre de la ubicación es obligatorio';
      isValid = false;
    }

    // Validar código
    if (this._data.code && this._data.code.length > 20) {
      this._errors.code = 'El código no puede tener más de 20 caracteres';
      isValid = false;
    }

    // Validar tipo
    const validTypes = ['warehouse', 'area', 'zone', 'aisle', 'rack', 'shelf', 'bin', 'other'];
    if (!validTypes.includes(this._data.type)) {
      this._errors.type = `El tipo debe ser uno de: ${validTypes.join(', ')}`;
      isValid = false;
    }

    // Validar nivel
    if (typeof this._data.level !== 'number' || this._data.level < 0) {
      this._errors.level = 'El nivel debe ser un número no negativo';
      isValid = false;
    }

    // Validar capacidad
    if (this._data.capacity !== null && (typeof this._data.capacity !== 'number' || this._data.capacity < 0)) {
      this._errors.capacity = 'La capacidad debe ser un número no negativo o null';
      isValid = false;
    }

    // Validar unidad de capacidad cuando hay capacidad
    if (this._data.capacity !== null && !this._data.capacityUnit) {
      this._errors.capacityUnit = 'La unidad de capacidad es obligatoria cuando se especifica una capacidad';
      isValid = false;
    }

    // Validar temperatura
    if (this._data.temperature !== null && typeof this._data.temperature !== 'number') {
      this._errors.temperature = 'La temperatura debe ser un número o null';
      isValid = false;
    }

    // Validar unidad de temperatura cuando hay temperatura
    if (this._data.temperature !== null && !['C', 'F'].includes(this._data.temperatureUnit)) {
      this._errors.temperatureUnit = 'La unidad de temperatura debe ser C o F';
      isValid = false;
    }

    // Validar humedad
    if (this._data.humidity !== null && (typeof this._data.humidity !== 'number' || this._data.humidity < 0 || this._data.humidity > 100)) {
      this._errors.humidity = 'La humedad debe ser un número entre 0 y 100 o null';
      isValid = false;
    }

    // Validar active
    if (typeof this._data.active !== 'boolean') {
      this._errors.active = 'El estado activo debe ser un booleano';
      isValid = false;
    }

    // Validar atributos
    if (typeof this._data.attributes !== 'object' || Array.isArray(this._data.attributes)) {
      this._errors.attributes = 'Los atributos deben ser un objeto';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Activa la ubicación
   * @returns {Location} - La instancia actual para encadenamiento
   */
  activate() {
    this._data.active = true;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Desactiva la ubicación
   * @returns {Location} - La instancia actual para encadenamiento
   */
  deactivate() {
    this._data.active = false;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Establece la ubicación padre
   * @param {string} parentId - ID de la ubicación padre
   * @param {string} parentPath - Ruta de la ubicación padre
   * @param {number} parentLevel - Nivel de la ubicación padre
   * @returns {Location} - La instancia actual para encadenamiento
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
   * Elimina la ubicación padre
   * @returns {Location} - La instancia actual para encadenamiento
   */
  removeParent() {
    return this.setParent(null, '', 0);
  }

  /**
   * Establece un atributo personalizado
   * @param {string} key - Clave del atributo
   * @param {*} value - Valor del atributo
   * @returns {Location} - La instancia actual para encadenamiento
   */
  setAttribute(key, value) {
    if (!key) throw new Error('La clave del atributo es obligatoria');
    this._data.attributes[key] = value;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Elimina un atributo personalizado
   * @param {string} key - Clave del atributo a eliminar
   * @returns {Location} - La instancia actual para encadenamiento
   */
  removeAttribute(key) {
    if (this._data.attributes.hasOwnProperty(key)) {
      delete this._data.attributes[key];
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Verifica si la ubicación tiene un atributo específico
   * @param {string} key - Clave del atributo a verificar
   * @returns {boolean} - True si tiene el atributo, false en caso contrario
   */
  hasAttribute(key) {
    return this._data.attributes.hasOwnProperty(key);
  }

  /**
   * Obtiene un atributo por su clave
   * @param {string} key - Clave del atributo a obtener
   * @returns {*} - El valor del atributo o undefined si no existe
   */
  getAttribute(key) {
    return this._data.attributes[key];
  }

  /**
   * Verifica si la ubicación es una ubicación raíz (sin padre)
   * @returns {boolean} - True si es una ubicación raíz, false en caso contrario
   */
  isRoot() {
    return !this._data.parentId;
  }

  /**
   * Verifica si la ubicación es una sububicación de otra
   * @param {string} locationId - ID de la ubicación a verificar
   * @returns {boolean} - True si es una sububicación, false en caso contrario
   */
  isChildOf(locationId) {
    if (!locationId || !this._data.path) return false;
    const pathParts = this._data.path.split('/');
    return pathParts.includes(locationId);
  }

  /**
   * Obtiene la dirección completa de la ubicación
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

  /**
   * Convierte la temperatura a la unidad especificada
   * @param {string} unit - Unidad de destino ('C' o 'F')
   * @returns {number|null} - Temperatura convertida o null si no hay temperatura
   */
  getTemperatureIn(unit) {
    if (this._data.temperature === null) return null;
    if (unit === this._data.temperatureUnit) return this._data.temperature;
    
    if (unit === 'C' && this._data.temperatureUnit === 'F') {
      // Convertir de F a C: (F - 32) * 5/9
      return (this._data.temperature - 32) * 5/9;
    } else if (unit === 'F' && this._data.temperatureUnit === 'C') {
      // Convertir de C a F: (C * 9/5) + 32
      return (this._data.temperature * 9/5) + 32;
    }
    
    throw new Error(`Unidad de temperatura no válida: ${unit}`);
  }

  // Getters y setters

  /**
   * Obtiene el ID de la ubicación
   * @returns {string} - ID de la ubicación
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre de la ubicación
   * @returns {string} - Nombre de la ubicación
   */
  get name() {
    return this._data.name;
  }

  /**
   * Establece el nombre de la ubicación
   * @param {string} value - Nombre de la ubicación
   */
  set name(value) {
    this._data.name = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código de la ubicación
   * @returns {string} - Código de la ubicación
   */
  get code() {
    return this._data.code;
  }

  /**
   * Establece el código de la ubicación
   * @param {string} value - Código de la ubicación
   */
  set code(value) {
    this._data.code = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la descripción de la ubicación
   * @returns {string} - Descripción de la ubicación
   */
  get description() {
    return this._data.description;
  }

  /**
   * Establece la descripción de la ubicación
   * @param {string} value - Descripción de la ubicación
   */
  set description(value) {
    this._data.description = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el tipo de la ubicación
   * @returns {string} - Tipo de la ubicación
   */
  get type() {
    return this._data.type;
  }

  /**
   * Establece el tipo de la ubicación
   * @param {string} value - Tipo de la ubicación
   */
  set type(value) {
    this._data.type = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el ID de la ubicación padre
   * @returns {string|null} - ID de la ubicación padre o null si no tiene
   */
  get parentId() {
    return this._data.parentId;
  }

  /**
   * Obtiene la ruta de la ubicación
   * @returns {string} - Ruta de la ubicación
   */
  get path() {
    return this._data.path;
  }

  /**
   * Obtiene el nivel de la ubicación
   * @returns {number} - Nivel de la ubicación
   */
  get level() {
    return this._data.level;
  }

  /**
   * Obtiene la dirección de la ubicación
   * @returns {string} - Dirección de la ubicación
   */
  get address() {
    return this._data.address;
  }

  /**
   * Establece la dirección de la ubicación
   * @param {string} value - Dirección de la ubicación
   */
  set address(value) {
    this._data.address = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la ciudad de la ubicación
   * @returns {string} - Ciudad de la ubicación
   */
  get city() {
    return this._data.city;
  }

  /**
   * Establece la ciudad de la ubicación
   * @param {string} value - Ciudad de la ubicación
   */
  set city(value) {
    this._data.city = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el estado/provincia de la ubicación
   * @returns {string} - Estado/provincia de la ubicación
   */
  get state() {
    return this._data.state;
  }

  /**
   * Establece el estado/provincia de la ubicación
   * @param {string} value - Estado/provincia de la ubicación
   */
  set state(value) {
    this._data.state = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el país de la ubicación
   * @returns {string} - País de la ubicación
   */
  get country() {
    return this._data.country;
  }

  /**
   * Establece el país de la ubicación
   * @param {string} value - País de la ubicación
   */
  set country(value) {
    this._data.country = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el código postal de la ubicación
   * @returns {string} - Código postal de la ubicación
   */
  get postalCode() {
    return this._data.postalCode;
  }

  /**
   * Establece el código postal de la ubicación
   * @param {string} value - Código postal de la ubicación
   */
  set postalCode(value) {
    this._data.postalCode = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la capacidad de la ubicación
   * @returns {number|null} - Capacidad de la ubicación
   */
  get capacity() {
    return this._data.capacity;
  }

  /**
   * Establece la capacidad de la ubicación
   * @param {number|null} value - Capacidad de la ubicación
   */
  set capacity(value) {
    this._data.capacity = value === null ? null : Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la unidad de capacidad de la ubicación
   * @returns {string|null} - Unidad de capacidad de la ubicación
   */
  get capacityUnit() {
    return this._data.capacityUnit;
  }

  /**
   * Establece la unidad de capacidad de la ubicación
   * @param {string|null} value - Unidad de capacidad de la ubicación
   */
  set capacityUnit(value) {
    this._data.capacityUnit = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la temperatura de la ubicación
   * @returns {number|null} - Temperatura de la ubicación
   */
  get temperature() {
    return this._data.temperature;
  }

  /**
   * Establece la temperatura de la ubicación
   * @param {number|null} value - Temperatura de la ubicación
   */
  set temperature(value) {
    this._data.temperature = value === null ? null : Number(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la unidad de temperatura de la ubicación
   * @returns {string} - Unidad de temperatura de la ubicación
   */
  get temperatureUnit() {
    return this._data.temperatureUnit;
  }

  /**
   * Establece la unidad de temperatura de la ubicación
   * @param {string} value - Unidad de temperatura de la ubicación
   */
  set temperatureUnit(value) {
    if (value !== 'C' && value !== 'F') {
      throw new Error('La unidad de temperatura debe ser C o F');
    }
    this._data.temperatureUnit = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la humedad de la ubicación
   * @returns {number|null} - Humedad de la ubicación
   */
  get humidity() {
    return this._data.humidity;
  }

  /**
   * Establece la humedad de la ubicación
   * @param {number|null} value - Humedad de la ubicación
   */
  set humidity(value) {
    if (value !== null && (typeof value !== 'number' || value < 0 || value > 100)) {
      throw new Error('La humedad debe ser un número entre 0 y 100 o null');
    }
    this._data.humidity = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el estado activo de la ubicación
   * @returns {boolean} - Estado activo de la ubicación
   */
  get active() {
    return this._data.active;
  }

  /**
   * Establece el estado activo de la ubicación
   * @param {boolean} value - Estado activo de la ubicación
   */
  set active(value) {
    this._data.active = Boolean(value);
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene los atributos de la ubicación
   * @returns {Object} - Atributos de la ubicación
   */
  get attributes() {
    return { ...this._data.attributes }; // Devolver copia para evitar modificación directa
  }

  /**
   * Establece los atributos de la ubicación
   * @param {Object} value - Atributos de la ubicación
   */
  set attributes(value) {
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Los atributos deben ser un objeto');
    }
    this._data.attributes = { ...value }; // Crear copia para evitar referencias
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene la fecha de creación de la ubicación
   * @returns {string} - Fecha de creación
   */
  get createdAt() {
    return this._data.createdAt;
  }

  /**
   * Obtiene la fecha de actualización de la ubicación
   * @returns {string} - Fecha de actualización
   */
  get updatedAt() {
    return this._data.updatedAt;
  }
}

export default Location;