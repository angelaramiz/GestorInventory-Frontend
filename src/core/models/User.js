/**
 * @fileoverview Modelo para representar usuarios del sistema
 */

import BaseModel from './BaseModel';

/**
 * Clase que representa un usuario del sistema
 * @extends BaseModel
 */
class User extends BaseModel {
  /**
   * Crea una nueva instancia de User
   * @param {Object} data - Datos iniciales para el usuario
   */
  constructor(data = {}) {
    super(data);

    // Inicializar con valores por defecto si no se proporcionan
    this._data = {
      id: data.id || crypto.randomUUID(),
      username: data.username || '',
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      role: data.role || 'user', // 'admin', 'user', 'manager', 'viewer'
      permissions: data.permissions || [],
      active: data.hasOwnProperty('active') ? data.active : true,
      lastLogin: data.lastLogin || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Inicializar errores
    this._errors = {};
  }

  /**
   * Valida los datos del usuario
   * @returns {boolean} - True si la validación es exitosa, false en caso contrario
   */
  validate() {
    this._errors = {};
    let isValid = true;

    // Validar username
    if (!this._data.username) {
      this._errors.username = 'El nombre de usuario es obligatorio';
      isValid = false;
    } else if (this._data.username.length < 3) {
      this._errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(this._data.username)) {
      this._errors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
      isValid = false;
    }

    // Validar email
    if (!this._data.email) {
      this._errors.email = 'El correo electrónico es obligatorio';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._data.email)) {
      this._errors.email = 'El correo electrónico no es válido';
      isValid = false;
    }

    // Validar firstName
    if (!this._data.firstName) {
      this._errors.firstName = 'El nombre es obligatorio';
      isValid = false;
    }

    // Validar lastName
    if (!this._data.lastName) {
      this._errors.lastName = 'El apellido es obligatorio';
      isValid = false;
    }

    // Validar role
    const validRoles = ['admin', 'user', 'manager', 'viewer'];
    if (!validRoles.includes(this._data.role)) {
      this._errors.role = `El rol debe ser uno de: ${validRoles.join(', ')}`;
      isValid = false;
    }

    // Validar permissions
    if (!Array.isArray(this._data.permissions)) {
      this._errors.permissions = 'Los permisos deben ser un array';
      isValid = false;
    }

    // Validar active
    if (typeof this._data.active !== 'boolean') {
      this._errors.active = 'El estado activo debe ser un booleano';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Activa el usuario
   * @returns {User} - La instancia actual para encadenamiento
   */
  activate() {
    this._data.active = true;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Desactiva el usuario
   * @returns {User} - La instancia actual para encadenamiento
   */
  deactivate() {
    this._data.active = false;
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Añade un permiso al usuario
   * @param {string} permission - Permiso a añadir
   * @returns {User} - La instancia actual para encadenamiento
   */
  addPermission(permission) {
    if (!this._data.permissions.includes(permission)) {
      this._data.permissions.push(permission);
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Elimina un permiso del usuario
   * @param {string} permission - Permiso a eliminar
   * @returns {User} - La instancia actual para encadenamiento
   */
  removePermission(permission) {
    const index = this._data.permissions.indexOf(permission);
    if (index !== -1) {
      this._data.permissions.splice(index, 1);
      this._data.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} permission - Permiso a verificar
   * @returns {boolean} - True si tiene el permiso, false en caso contrario
   */
  hasPermission(permission) {
    return this._data.permissions.includes(permission);
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param {Array<string>} permissions - Permisos a verificar
   * @returns {boolean} - True si tiene todos los permisos, false en caso contrario
   */
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Verifica si el usuario tiene alguno de los permisos especificados
   * @param {Array<string>} permissions - Permisos a verificar
   * @returns {boolean} - True si tiene alguno de los permisos, false en caso contrario
   */
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Actualiza la fecha de último inicio de sesión
   * @returns {User} - La instancia actual para encadenamiento
   */
  updateLastLogin() {
    this._data.lastLogin = new Date().toISOString();
    this._data.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Obtiene el nombre completo del usuario
   * @returns {string} - Nombre completo
   */
  getFullName() {
    return `${this._data.firstName} ${this._data.lastName}`.trim();
  }

  // Getters y setters

  /**
   * Obtiene el ID del usuario
   * @returns {string} - ID del usuario
   */
  get id() {
    return this._data.id;
  }

  /**
   * Obtiene el nombre de usuario
   * @returns {string} - Nombre de usuario
   */
  get username() {
    return this._data.username;
  }

  /**
   * Establece el nombre de usuario
   * @param {string} value - Nombre de usuario
   */
  set username(value) {
    this._data.username = value;
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
   * Obtiene el nombre
   * @returns {string} - Nombre
   */
  get firstName() {
    return this._data.firstName;
  }

  /**
   * Establece el nombre
   * @param {string} value - Nombre
   */
  set firstName(value) {
    this._data.firstName = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el apellido
   * @returns {string} - Apellido
   */
  get lastName() {
    return this._data.lastName;
  }

  /**
   * Establece el apellido
   * @param {string} value - Apellido
   */
  set lastName(value) {
    this._data.lastName = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene el rol
   * @returns {string} - Rol
   */
  get role() {
    return this._data.role;
  }

  /**
   * Establece el rol
   * @param {string} value - Rol
   */
  set role(value) {
    const validRoles = ['admin', 'user', 'manager', 'viewer'];
    if (!validRoles.includes(value)) {
      throw new Error(`Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`);
    }
    this._data.role = value;
    this._data.updatedAt = new Date().toISOString();
  }

  /**
   * Obtiene los permisos
   * @returns {Array<string>} - Permisos
   */
  get permissions() {
    return [...this._data.permissions]; // Devolver copia para evitar modificación directa
  }

  /**
   * Establece los permisos
   * @param {Array<string>} value - Permisos
   */
  set permissions(value) {
    if (!Array.isArray(value)) {
      throw new Error('Los permisos deben ser un array');
    }
    this._data.permissions = [...value]; // Crear copia para evitar referencias
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
   * Obtiene la fecha de último inicio de sesión
   * @returns {string|null} - Fecha de último inicio de sesión
   */
  get lastLogin() {
    return this._data.lastLogin;
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

export default User;