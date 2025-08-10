/**
 * @fileoverview Pruebas para el modelo Supplier
 */

import Supplier from '../../../../src/core/models/Supplier';

describe('Supplier Model', () => {
  // Datos de prueba
  const supplierData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Proveedor Ejemplo',
    code: 'PROV001',
    contactName: 'Juan Pérez',
    email: 'juan@proveedor.com',
    phone: '+34 612345678',
    address: 'Calle Principal 123',
    city: 'Madrid',
    state: 'Madrid',
    country: 'España',
    postalCode: '28001',
    taxId: 'B12345678',
    notes: 'Proveedor principal de materiales',
    active: true,
    categories: ['Electrónica', 'Informática'],
    paymentTerms: 'Net 30',
    website: 'https://proveedor-ejemplo.com',
    rating: 4.5,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  describe('Constructor', () => {
    test('debería crear una instancia con los valores por defecto cuando no se proporcionan datos', () => {
      const supplier = new Supplier();
      
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('');
      expect(supplier.code).toBe('');
      expect(supplier.active).toBe(true);
      expect(supplier.categories).toEqual([]);
      expect(supplier.rating).toBe(0);
      expect(supplier.createdAt).toBeDefined();
      expect(supplier.updatedAt).toBeDefined();
    });

    test('debería crear una instancia con los datos proporcionados', () => {
      const supplier = new Supplier(supplierData);
      
      expect(supplier.id).toBe(supplierData.id);
      expect(supplier.name).toBe(supplierData.name);
      expect(supplier.code).toBe(supplierData.code);
      expect(supplier.contactName).toBe(supplierData.contactName);
      expect(supplier.email).toBe(supplierData.email);
      expect(supplier.phone).toBe(supplierData.phone);
      expect(supplier.address).toBe(supplierData.address);
      expect(supplier.city).toBe(supplierData.city);
      expect(supplier.state).toBe(supplierData.state);
      expect(supplier.country).toBe(supplierData.country);
      expect(supplier.postalCode).toBe(supplierData.postalCode);
      expect(supplier.taxId).toBe(supplierData.taxId);
      expect(supplier.notes).toBe(supplierData.notes);
      expect(supplier.active).toBe(supplierData.active);
      expect(supplier.categories).toEqual(supplierData.categories);
      expect(supplier.paymentTerms).toBe(supplierData.paymentTerms);
      expect(supplier.website).toBe(supplierData.website);
      expect(supplier.rating).toBe(supplierData.rating);
      expect(supplier.createdAt).toBe(supplierData.createdAt);
      expect(supplier.updatedAt).toBe(supplierData.updatedAt);
    });
  });

  describe('Validación', () => {
    test('debería validar correctamente un proveedor con datos válidos', () => {
      const supplier = new Supplier(supplierData);
      expect(supplier.validate()).toBe(true);
      expect(supplier.getErrors()).toEqual({});
    });

    test('debería fallar la validación cuando el nombre está vacío', () => {
      const supplier = new Supplier({ ...supplierData, name: '' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('name');
    });

    test('debería fallar la validación cuando el código es demasiado largo', () => {
      const supplier = new Supplier({ 
        ...supplierData, 
        code: 'CODIGO_DEMASIADO_LARGO_PARA_LA_VALIDACION' 
      });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('code');
    });

    test('debería fallar la validación cuando el email no es válido', () => {
      const supplier = new Supplier({ ...supplierData, email: 'correo-invalido' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('email');
    });

    test('debería fallar la validación cuando el teléfono no es válido', () => {
      const supplier = new Supplier({ ...supplierData, phone: 'abc123' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('phone');
    });

    test('debería fallar la validación cuando las categorías no son un array', () => {
      const supplier = new Supplier({ ...supplierData, categories: 'Categoría' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('categories');
    });

    test('debería fallar la validación cuando el rating no es válido', () => {
      const supplier = new Supplier({ ...supplierData, rating: 6 });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('rating');
    });

    test('debería fallar la validación cuando active no es booleano', () => {
      const supplier = new Supplier({ ...supplierData, active: 'true' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('active');
    });

    test('debería fallar la validación cuando el website no es válido', () => {
      const supplier = new Supplier({ ...supplierData, website: 'sitio-web-invalido' });
      expect(supplier.validate()).toBe(false);
      expect(supplier.getErrors()).toHaveProperty('website');
    });
  });

  describe('Métodos de activación/desactivación', () => {
    test('debería activar un proveedor desactivado', () => {
      const supplier = new Supplier({ ...supplierData, active: false });
      supplier.activate();
      expect(supplier.active).toBe(true);
    });

    test('debería desactivar un proveedor activo', () => {
      const supplier = new Supplier(supplierData);
      supplier.deactivate();
      expect(supplier.active).toBe(false);
    });
  });

  describe('Métodos de categorías', () => {
    test('debería añadir una nueva categoría', () => {
      const supplier = new Supplier(supplierData);
      supplier.addCategory('Nueva Categoría');
      expect(supplier.categories).toContain('Nueva Categoría');
    });

    test('no debería añadir una categoría duplicada', () => {
      const supplier = new Supplier(supplierData);
      const initialLength = supplier.categories.length;
      supplier.addCategory('Electrónica'); // Ya existe en supplierData
      expect(supplier.categories.length).toBe(initialLength);
    });

    test('debería eliminar una categoría existente', () => {
      const supplier = new Supplier(supplierData);
      supplier.removeCategory('Electrónica');
      expect(supplier.categories).not.toContain('Electrónica');
    });

    test('no debería modificar las categorías al intentar eliminar una que no existe', () => {
      const supplier = new Supplier(supplierData);
      const initialCategories = [...supplier.categories];
      supplier.removeCategory('Categoría Inexistente');
      expect(supplier.categories).toEqual(initialCategories);
    });

    test('debería verificar correctamente si tiene una categoría', () => {
      const supplier = new Supplier(supplierData);
      expect(supplier.hasCategory('Electrónica')).toBe(true);
      expect(supplier.hasCategory('Categoría Inexistente')).toBe(false);
    });

    test('debería establecer correctamente un array de categorías', () => {
      const supplier = new Supplier(supplierData);
      const newCategories = ['Categoría1', 'Categoría2'];
      supplier.categories = newCategories;
      expect(supplier.categories).toEqual(newCategories);
    });

    test('debería lanzar un error al intentar establecer categorías con un valor no array', () => {
      const supplier = new Supplier(supplierData);
      expect(() => {
        supplier.categories = 'No soy un array';
      }).toThrow();
    });
  });

  describe('Método setRating', () => {
    test('debería establecer correctamente una calificación válida', () => {
      const supplier = new Supplier(supplierData);
      supplier.setRating(3);
      expect(supplier.rating).toBe(3);
    });

    test('debería lanzar un error al intentar establecer una calificación inválida', () => {
      const supplier = new Supplier(supplierData);
      expect(() => {
        supplier.setRating(6);
      }).toThrow();
      expect(() => {
        supplier.setRating(-1);
      }).toThrow();
      expect(() => {
        supplier.setRating('3');
      }).toThrow();
    });
  });

  describe('Método getFullAddress', () => {
    test('debería devolver la dirección completa correctamente', () => {
      const supplier = new Supplier(supplierData);
      const expectedAddress = 'Calle Principal 123, Madrid, Madrid, 28001, España';
      expect(supplier.getFullAddress()).toBe(expectedAddress);
    });

    test('debería omitir partes vacías de la dirección', () => {
      const supplier = new Supplier({
        ...supplierData,
        state: '',
        postalCode: ''
      });
      const expectedAddress = 'Calle Principal 123, Madrid, España';
      expect(supplier.getFullAddress()).toBe(expectedAddress);
    });

    test('debería devolver una cadena vacía si no hay datos de dirección', () => {
      const supplier = new Supplier({
        ...supplierData,
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      });
      expect(supplier.getFullAddress()).toBe('');
    });
  });

  describe('Getters y Setters', () => {
    test('debería actualizar la fecha de actualización al modificar propiedades', () => {
      const supplier = new Supplier(supplierData);
      const initialUpdatedAt = supplier.updatedAt;
      
      // Esperar un momento para asegurar que la fecha sea diferente
      jest.advanceTimersByTime(1000);
      
      supplier.name = 'Nuevo Nombre';
      expect(supplier.updatedAt).not.toBe(initialUpdatedAt);
    });

    test('debería actualizar correctamente todas las propiedades', () => {
      const supplier = new Supplier(supplierData);
      
      supplier.name = 'Nuevo Nombre';
      expect(supplier.name).toBe('Nuevo Nombre');
      
      supplier.code = 'NUEVO001';
      expect(supplier.code).toBe('NUEVO001');
      
      supplier.contactName = 'Nuevo Contacto';
      expect(supplier.contactName).toBe('Nuevo Contacto');
      
      supplier.email = 'nuevo@email.com';
      expect(supplier.email).toBe('nuevo@email.com');
      
      supplier.phone = '+34 987654321';
      expect(supplier.phone).toBe('+34 987654321');
      
      supplier.address = 'Nueva Dirección';
      expect(supplier.address).toBe('Nueva Dirección');
      
      supplier.city = 'Nueva Ciudad';
      expect(supplier.city).toBe('Nueva Ciudad');
      
      supplier.state = 'Nuevo Estado';
      expect(supplier.state).toBe('Nuevo Estado');
      
      supplier.country = 'Nuevo País';
      expect(supplier.country).toBe('Nuevo País');
      
      supplier.postalCode = '12345';
      expect(supplier.postalCode).toBe('12345');
      
      supplier.taxId = 'NUEVO12345';
      expect(supplier.taxId).toBe('NUEVO12345');
      
      supplier.notes = 'Nuevas notas';
      expect(supplier.notes).toBe('Nuevas notas');
      
      supplier.active = false;
      expect(supplier.active).toBe(false);
      
      supplier.paymentTerms = 'Net 60';
      expect(supplier.paymentTerms).toBe('Net 60');
      
      supplier.website = 'https://nuevo-sitio.com';
      expect(supplier.website).toBe('https://nuevo-sitio.com');
      
      supplier.rating = 2.5;
      expect(supplier.rating).toBe(2.5);
    });

    test('debería convertir el valor de active a booleano', () => {
      const supplier = new Supplier(supplierData);
      
      supplier.active = 1;
      expect(supplier.active).toBe(true);
      
      supplier.active = 0;
      expect(supplier.active).toBe(false);
      
      supplier.active = '';
      expect(supplier.active).toBe(false);
      
      supplier.active = 'true';
      expect(supplier.active).toBe(true);
    });

    test('debería lanzar un error al establecer un rating inválido', () => {
      const supplier = new Supplier(supplierData);
      
      expect(() => {
        supplier.rating = 6;
      }).toThrow();
      
      expect(() => {
        supplier.rating = -1;
      }).toThrow();
      
      expect(() => {
        supplier.rating = 'no válido';
      }).toThrow();
    });
  });

  describe('Serialización', () => {
    test('debería serializar correctamente a JSON', () => {
      const supplier = new Supplier(supplierData);
      const json = supplier.toJSON();
      
      expect(json).toEqual(supplierData);
    });

    test('debería deserializar correctamente desde JSON', () => {
      const supplier = new Supplier();
      supplier.fromJSON(supplierData);
      
      expect(supplier.id).toBe(supplierData.id);
      expect(supplier.name).toBe(supplierData.name);
      expect(supplier.code).toBe(supplierData.code);
      expect(supplier.contactName).toBe(supplierData.contactName);
      expect(supplier.email).toBe(supplierData.email);
      // ... y así sucesivamente con todas las propiedades
    });
  });
});