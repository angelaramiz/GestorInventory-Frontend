/**
 * @fileoverview Pruebas para el modelo Category
 */

import Category from '../../../../src/core/models/Category';

describe('Category Model', () => {
  // Datos de prueba
  const categoryData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Electrónica',
    code: 'ELEC001',
    description: 'Productos electrónicos y accesorios',
    parentId: null,
    path: '',
    level: 0,
    active: true,
    attributes: [
      { name: 'color', type: 'text', required: false, defaultValue: '' },
      { name: 'peso', type: 'number', required: true, defaultValue: 0 }
    ],
    imageUrl: 'https://example.com/images/electronics.jpg',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  // Datos para una subcategoría
  const subcategoryData = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Smartphones',
    code: 'SMART001',
    description: 'Teléfonos inteligentes',
    parentId: '123e4567-e89b-12d3-a456-426614174000',
    path: '123e4567-e89b-12d3-a456-426614174000/223e4567-e89b-12d3-a456-426614174001',
    level: 1,
    active: true,
    attributes: [
      { name: 'marca', type: 'text', required: true, defaultValue: '' },
      { name: 'almacenamiento', type: 'number', required: true, defaultValue: 64 }
    ],
    imageUrl: 'https://example.com/images/smartphones.jpg',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  describe('Constructor', () => {
    test('debería crear una instancia con los valores por defecto cuando no se proporcionan datos', () => {
      const category = new Category();
      
      expect(category.id).toBeDefined();
      expect(category.name).toBe('');
      expect(category.code).toBe('');
      expect(category.description).toBe('');
      expect(category.parentId).toBeNull();
      expect(category.path).toBe('');
      expect(category.level).toBe(0);
      expect(category.active).toBe(true);
      expect(category.attributes).toEqual([]);
      expect(category.imageUrl).toBe('');
      expect(category.createdAt).toBeDefined();
      expect(category.updatedAt).toBeDefined();
    });

    test('debería crear una instancia con los datos proporcionados', () => {
      const category = new Category(categoryData);
      
      expect(category.id).toBe(categoryData.id);
      expect(category.name).toBe(categoryData.name);
      expect(category.code).toBe(categoryData.code);
      expect(category.description).toBe(categoryData.description);
      expect(category.parentId).toBe(categoryData.parentId);
      expect(category.path).toBe(categoryData.path);
      expect(category.level).toBe(categoryData.level);
      expect(category.active).toBe(categoryData.active);
      expect(category.attributes).toEqual(categoryData.attributes);
      expect(category.imageUrl).toBe(categoryData.imageUrl);
      expect(category.createdAt).toBe(categoryData.createdAt);
      expect(category.updatedAt).toBe(categoryData.updatedAt);
    });
  });

  describe('Validación', () => {
    test('debería validar correctamente una categoría con datos válidos', () => {
      const category = new Category(categoryData);
      expect(category.validate()).toBe(true);
      expect(category.getErrors()).toEqual({});
    });

    test('debería fallar la validación cuando el nombre está vacío', () => {
      const category = new Category({ ...categoryData, name: '' });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('name');
    });

    test('debería fallar la validación cuando el código es demasiado largo', () => {
      const category = new Category({ 
        ...categoryData, 
        code: 'CODIGO_DEMASIADO_LARGO_PARA_LA_VALIDACION' 
      });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('code');
    });

    test('debería fallar la validación cuando el nivel no es un número', () => {
      const category = new Category({ ...categoryData, level: 'cero' });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('level');
    });

    test('debería fallar la validación cuando el nivel es negativo', () => {
      const category = new Category({ ...categoryData, level: -1 });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('level');
    });

    test('debería fallar la validación cuando active no es booleano', () => {
      const category = new Category({ ...categoryData, active: 'true' });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('active');
    });

    test('debería fallar la validación cuando los atributos no son un array', () => {
      const category = new Category({ ...categoryData, attributes: 'no soy un array' });
      expect(category.validate()).toBe(false);
      expect(category.getErrors()).toHaveProperty('attributes');
    });
  });

  describe('Métodos de activación/desactivación', () => {
    test('debería activar una categoría desactivada', () => {
      const category = new Category({ ...categoryData, active: false });
      category.activate();
      expect(category.active).toBe(true);
    });

    test('debería desactivar una categoría activa', () => {
      const category = new Category(categoryData);
      category.deactivate();
      expect(category.active).toBe(false);
    });
  });

  describe('Métodos de jerarquía', () => {
    test('debería establecer correctamente una categoría padre', () => {
      const category = new Category();
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      const parentPath = '123e4567-e89b-12d3-a456-426614174000';
      const parentLevel = 1;
      
      category.setParent(parentId, parentPath, parentLevel);
      
      expect(category.parentId).toBe(parentId);
      expect(category.path).toBe(`${parentPath}/${category.id}`);
      expect(category.level).toBe(parentLevel + 1);
    });

    test('debería eliminar correctamente la categoría padre', () => {
      const category = new Category(subcategoryData);
      category.removeParent();
      
      expect(category.parentId).toBeNull();
      expect(category.path).toBe('');
      expect(category.level).toBe(0);
    });

    test('debería identificar correctamente si es una categoría raíz', () => {
      const rootCategory = new Category(categoryData);
      const subCategory = new Category(subcategoryData);
      
      expect(rootCategory.isRoot()).toBe(true);
      expect(subCategory.isRoot()).toBe(false);
    });

    test('debería identificar correctamente si es una subcategoría de otra', () => {
      const subCategory = new Category(subcategoryData);
      
      expect(subCategory.isChildOf(categoryData.id)).toBe(true);
      expect(subCategory.isChildOf('categoría-inexistente')).toBe(false);
    });
  });

  describe('Métodos de atributos', () => {
    test('debería añadir un nuevo atributo', () => {
      const category = new Category(categoryData);
      const newAttribute = { name: 'tamaño', type: 'text', required: false, defaultValue: 'M' };
      
      category.addAttribute(newAttribute);
      
      expect(category.hasAttribute('tamaño')).toBe(true);
      expect(category.getAttribute('tamaño')).toEqual(newAttribute);
    });

    test('debería actualizar un atributo existente', () => {
      const category = new Category(categoryData);
      const updatedAttribute = { name: 'color', type: 'select', required: true, defaultValue: 'Negro', options: ['Negro', 'Blanco', 'Azul'] };
      
      category.addAttribute(updatedAttribute);
      
      expect(category.getAttribute('color')).toEqual(updatedAttribute);
    });

    test('debería lanzar un error al añadir un atributo sin nombre o tipo', () => {
      const category = new Category(categoryData);
      
      expect(() => {
        category.addAttribute({ required: true });
      }).toThrow();
      
      expect(() => {
        category.addAttribute({ name: 'material' });
      }).toThrow();
    });

    test('debería eliminar un atributo existente', () => {
      const category = new Category(categoryData);
      category.removeAttribute('color');
      
      expect(category.hasAttribute('color')).toBe(false);
      expect(category.getAttribute('color')).toBeNull();
    });

    test('no debería modificar los atributos al intentar eliminar uno que no existe', () => {
      const category = new Category(categoryData);
      const initialAttributes = [...category.attributes];
      
      category.removeAttribute('atributo-inexistente');
      
      expect(category.attributes).toEqual(initialAttributes);
    });

    test('debería verificar correctamente si tiene un atributo', () => {
      const category = new Category(categoryData);
      
      expect(category.hasAttribute('color')).toBe(true);
      expect(category.hasAttribute('atributo-inexistente')).toBe(false);
    });

    test('debería obtener correctamente un atributo por su nombre', () => {
      const category = new Category(categoryData);
      const colorAttribute = category.getAttribute('color');
      
      expect(colorAttribute).toEqual(categoryData.attributes[0]);
      expect(category.getAttribute('atributo-inexistente')).toBeNull();
    });

    test('debería establecer correctamente un array de atributos', () => {
      const category = new Category(categoryData);
      const newAttributes = [
        { name: 'material', type: 'text', required: false, defaultValue: '' },
        { name: 'garantía', type: 'number', required: true, defaultValue: 12 }
      ];
      
      category.attributes = newAttributes;
      
      expect(category.attributes).toEqual(newAttributes);
    });

    test('debería lanzar un error al intentar establecer atributos con un valor no array', () => {
      const category = new Category(categoryData);
      
      expect(() => {
        category.attributes = 'No soy un array';
      }).toThrow();
    });
  });

  describe('Getters y Setters', () => {
    test('debería actualizar la fecha de actualización al modificar propiedades', () => {
      const category = new Category(categoryData);
      const initialUpdatedAt = category.updatedAt;
      
      // Esperar un momento para asegurar que la fecha sea diferente
      jest.advanceTimersByTime(1000);
      
      category.name = 'Nuevo Nombre';
      expect(category.updatedAt).not.toBe(initialUpdatedAt);
    });

    test('debería actualizar correctamente todas las propiedades', () => {
      const category = new Category(categoryData);
      
      category.name = 'Nuevo Nombre';
      expect(category.name).toBe('Nuevo Nombre');
      
      category.code = 'NUEVO001';
      expect(category.code).toBe('NUEVO001');
      
      category.description = 'Nueva Descripción';
      expect(category.description).toBe('Nueva Descripción');
      
      category.active = false;
      expect(category.active).toBe(false);
      
      category.imageUrl = 'https://nueva-imagen.com/img.jpg';
      expect(category.imageUrl).toBe('https://nueva-imagen.com/img.jpg');
    });

    test('debería convertir el valor de active a booleano', () => {
      const category = new Category(categoryData);
      
      category.active = 1;
      expect(category.active).toBe(true);
      
      category.active = 0;
      expect(category.active).toBe(false);
      
      category.active = '';
      expect(category.active).toBe(false);
      
      category.active = 'true';
      expect(category.active).toBe(true);
    });
  });

  describe('Serialización', () => {
    test('debería serializar correctamente a JSON', () => {
      const category = new Category(categoryData);
      const json = category.toJSON();
      
      expect(json).toEqual(categoryData);
    });

    test('debería deserializar correctamente desde JSON', () => {
      const category = new Category();
      category.fromJSON(categoryData);
      
      expect(category.id).toBe(categoryData.id);
      expect(category.name).toBe(categoryData.name);
      expect(category.code).toBe(categoryData.code);
      expect(category.description).toBe(categoryData.description);
      expect(category.parentId).toBe(categoryData.parentId);
      expect(category.path).toBe(categoryData.path);
      expect(category.level).toBe(categoryData.level);
      expect(category.active).toBe(categoryData.active);
      expect(category.attributes).toEqual(categoryData.attributes);
      expect(category.imageUrl).toBe(categoryData.imageUrl);
      expect(category.createdAt).toBe(categoryData.createdAt);
      expect(category.updatedAt).toBe(categoryData.updatedAt);
    });
  });
});