/**
 * @fileoverview Tests para la clase User
 */

import User from '../../../../src/core/models/User';

describe('User', () => {
  let user;
  const mockDate = '2023-01-01T00:00:00.000Z';
  const mockId = 'test-user-id';

  beforeEach(() => {
    // Mock para Date.toISOString
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue(mockId)
    };
    
    user = new User();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(user.id).toBe(mockId);
      expect(user.username).toBe('');
      expect(user.email).toBe('');
      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.role).toBe('user');
      expect(user.permissions).toEqual([]);
      expect(user.active).toBe(true);
      expect(user.lastLogin).toBeNull();
      expect(user.createdAt).toBe(mockDate);
      expect(user.updatedAt).toBe(mockDate);
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = {
        id: 'existing-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        permissions: ['create', 'read', 'update', 'delete'],
        active: false,
        lastLogin: '2022-12-01T00:00:00.000Z',
        createdAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-12-01T00:00:00.000Z'
      };
      
      user = new User(testData);
      
      expect(user.id).toBe('existing-id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.role).toBe('admin');
      expect(user.permissions).toEqual(['create', 'read', 'update', 'delete']);
      expect(user.active).toBe(false);
      expect(user.lastLogin).toBe('2022-12-01T00:00:00.000Z');
      expect(user.createdAt).toBe('2022-01-01T00:00:00.000Z');
      expect(user.updatedAt).toBe('2022-12-01T00:00:00.000Z');
    });
  });

  describe('validate', () => {
    test('debe validar un usuario válido', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(true);
      expect(user.getErrors()).toEqual({});
    });

    test('debe detectar username vacío', () => {
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('username')).toBe(true);
      expect(user.getError('username')).toBe('El nombre de usuario es obligatorio');
    });

    test('debe detectar username demasiado corto', () => {
      user.username = 'ab';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('username')).toBe(true);
      expect(user.getError('username')).toBe('El nombre de usuario debe tener al menos 3 caracteres');
    });

    test('debe detectar username con caracteres inválidos', () => {
      user.username = 'test@user';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('username')).toBe(true);
      expect(user.getError('username')).toBe('El nombre de usuario solo puede contener letras, números y guiones bajos');
    });

    test('debe detectar email vacío', () => {
      user.username = 'testuser';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('email')).toBe(true);
      expect(user.getError('email')).toBe('El correo electrónico es obligatorio');
    });

    test('debe detectar email inválido', () => {
      user.username = 'testuser';
      user.email = 'invalid-email';
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('email')).toBe(true);
      expect(user.getError('email')).toBe('El correo electrónico no es válido');
    });

    test('debe detectar firstName vacío', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.lastName = 'User';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('firstName')).toBe(true);
      expect(user.getError('firstName')).toBe('El nombre es obligatorio');
    });

    test('debe detectar lastName vacío', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('lastName')).toBe(true);
      expect(user.getError('lastName')).toBe('El apellido es obligatorio');
    });

    test('debe detectar rol inválido', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      user._data.role = 'invalid-role';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('role')).toBe(true);
      expect(user.getError('role')).toContain('El rol debe ser uno de:');
    });

    test('debe detectar permisos no array', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      user._data.permissions = 'not-an-array';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('permissions')).toBe(true);
      expect(user.getError('permissions')).toBe('Los permisos deben ser un array');
    });

    test('debe detectar active no booleano', () => {
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      user._data.active = 'not-a-boolean';
      
      expect(user.validate()).toBe(false);
      expect(user.hasError('active')).toBe(true);
      expect(user.getError('active')).toBe('El estado activo debe ser un booleano');
    });
  });

  describe('activate y deactivate', () => {
    test('debe activar un usuario', () => {
      user.active = false;
      user.activate();
      
      expect(user.active).toBe(true);
      expect(user.updatedAt).toBe(mockDate);
    });

    test('debe desactivar un usuario', () => {
      user.active = true;
      user.deactivate();
      
      expect(user.active).toBe(false);
      expect(user.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(user.activate()).toBe(user);
      expect(user.deactivate()).toBe(user);
    });
  });

  describe('addPermission y removePermission', () => {
    test('debe añadir un permiso', () => {
      user.addPermission('create');
      
      expect(user.permissions).toContain('create');
      expect(user.updatedAt).toBe(mockDate);
    });

    test('no debe añadir un permiso duplicado', () => {
      user.addPermission('create');
      jest.clearAllMocks(); // Limpiar el mock para verificar que no se llama de nuevo
      
      user.addPermission('create');
      
      expect(user.permissions).toEqual(['create']);
      expect(Date.prototype.toISOString).not.toHaveBeenCalled();
    });

    test('debe eliminar un permiso', () => {
      user.permissions = ['create', 'read', 'update'];
      user.removePermission('read');
      
      expect(user.permissions).toEqual(['create', 'update']);
      expect(user.updatedAt).toBe(mockDate);
    });

    test('no debe hacer nada si el permiso a eliminar no existe', () => {
      user.permissions = ['create', 'read'];
      jest.clearAllMocks(); // Limpiar el mock para verificar que no se llama de nuevo
      
      user.removePermission('delete');
      
      expect(user.permissions).toEqual(['create', 'read']);
      expect(Date.prototype.toISOString).not.toHaveBeenCalled();
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(user.addPermission('create')).toBe(user);
      expect(user.removePermission('create')).toBe(user);
    });
  });

  describe('hasPermission, hasAllPermissions y hasAnyPermission', () => {
    beforeEach(() => {
      user.permissions = ['create', 'read', 'update'];
    });

    test('debe verificar si tiene un permiso específico', () => {
      expect(user.hasPermission('create')).toBe(true);
      expect(user.hasPermission('delete')).toBe(false);
    });

    test('debe verificar si tiene todos los permisos especificados', () => {
      expect(user.hasAllPermissions(['create', 'read'])).toBe(true);
      expect(user.hasAllPermissions(['create', 'delete'])).toBe(false);
    });

    test('debe verificar si tiene alguno de los permisos especificados', () => {
      expect(user.hasAnyPermission(['create', 'delete'])).toBe(true);
      expect(user.hasAnyPermission(['delete', 'export'])).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    test('debe actualizar la fecha de último inicio de sesión', () => {
      user.updateLastLogin();
      
      expect(user.lastLogin).toBe(mockDate);
      expect(user.updatedAt).toBe(mockDate);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(user.updateLastLogin()).toBe(user);
    });
  });

  describe('getFullName', () => {
    test('debe retornar el nombre completo', () => {
      user.firstName = 'Test';
      user.lastName = 'User';
      
      expect(user.getFullName()).toBe('Test User');
    });

    test('debe manejar espacios en blanco', () => {
      user.firstName = 'Test';
      user.lastName = '';
      
      expect(user.getFullName()).toBe('Test');
      
      user.firstName = '';
      user.lastName = 'User';
      
      expect(user.getFullName()).toBe('User');
      
      user.firstName = '';
      user.lastName = '';
      
      expect(user.getFullName()).toBe('');
    });
  });

  describe('getters y setters', () => {
    test('debe actualizar la fecha de actualización al modificar propiedades', () => {
      // Resetear el mock para asegurarnos de que se llama para cada setter
      jest.clearAllMocks();
      
      user.username = 'newusername';
      expect(user.username).toBe('newusername');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      expect(user.updatedAt).toBe(mockDate);
      
      jest.clearAllMocks();
      user.email = 'new@example.com';
      expect(user.email).toBe('new@example.com');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      user.firstName = 'NewName';
      expect(user.firstName).toBe('NewName');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      user.lastName = 'NewLastName';
      expect(user.lastName).toBe('NewLastName');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      user.role = 'admin';
      expect(user.role).toBe('admin');
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      user.permissions = ['create', 'read'];
      expect(user.permissions).toEqual(['create', 'read']);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
      
      jest.clearAllMocks();
      user.active = false;
      expect(user.active).toBe(false);
      expect(Date.prototype.toISOString).toHaveBeenCalled();
    });

    test('debe lanzar error si se intenta establecer un rol inválido', () => {
      expect(() => user.role = 'invalid-role')
        .toThrow(/Rol inválido. Debe ser uno de:/);
    });

    test('debe lanzar error si se intenta establecer permisos no array', () => {
      expect(() => user.permissions = 'not-an-array')
        .toThrow('Los permisos deben ser un array');
    });

    test('debe convertir el valor de active a booleano', () => {
      user.active = 0;
      expect(user.active).toBe(false);
      
      user.active = 1;
      expect(user.active).toBe(true);
      
      user.active = '';
      expect(user.active).toBe(false);
      
      user.active = 'true';
      expect(user.active).toBe(true);
    });

    test('debe devolver una copia de los permisos para evitar modificación directa', () => {
      user.permissions = ['create', 'read'];
      const permissions = user.permissions;
      permissions.push('update');
      
      expect(user.permissions).toEqual(['create', 'read']);
    });
  });

  describe('toJSON', () => {
    test('debe serializar correctamente el usuario', () => {
      const testData = {
        id: 'test-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        permissions: ['create', 'read']
      };
      
      user = new User(testData);
      const json = user.toJSON();
      
      expect(json).toEqual(expect.objectContaining(testData));
      expect(json.active).toBe(true);
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});