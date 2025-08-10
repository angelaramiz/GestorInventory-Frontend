/**
 * @fileoverview Tests para la clase BaseModel
 */

import BaseModel from '../../../../src/core/models/BaseModel';

describe('BaseModel', () => {
  let model;

  beforeEach(() => {
    // Mock para crypto.randomUUID
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue('test-uuid')
    };
    
    model = new BaseModel();
  });

  describe('constructor', () => {
    test('debe inicializar con datos vacíos por defecto', () => {
      expect(model._data).toEqual({});
      expect(model._errors).toEqual({});
      expect(model._originalData).toEqual({});
    });

    test('debe inicializar con datos proporcionados', () => {
      const testData = { name: 'Test', value: 123 };
      model = new BaseModel(testData);
      
      expect(model._data).toEqual(testData);
      expect(model._errors).toEqual({});
      expect(model._originalData).toEqual(testData);
    });
  });

  describe('validate', () => {
    test('debe retornar true por defecto', () => {
      expect(model.validate()).toBe(true);
      expect(model._errors).toEqual({});
    });
  });

  describe('isValid', () => {
    test('debe llamar a validate y retornar su resultado', () => {
      const validateSpy = jest.spyOn(model, 'validate');
      validateSpy.mockReturnValue(true);
      
      expect(model.isValid()).toBe(true);
      expect(validateSpy).toHaveBeenCalled();
      
      validateSpy.mockRestore();
    });
  });

  describe('getErrors', () => {
    test('debe retornar el objeto de errores', () => {
      model._errors = { name: 'Error en nombre' };
      expect(model.getErrors()).toEqual({ name: 'Error en nombre' });
    });
  });

  describe('hasError', () => {
    test('debe retornar true si la propiedad tiene error', () => {
      model._errors = { name: 'Error en nombre' };
      expect(model.hasError('name')).toBe(true);
    });

    test('debe retornar false si la propiedad no tiene error', () => {
      model._errors = { name: 'Error en nombre' };
      expect(model.hasError('value')).toBe(false);
    });
  });

  describe('getError', () => {
    test('debe retornar el mensaje de error para una propiedad', () => {
      model._errors = { name: 'Error en nombre' };
      expect(model.getError('name')).toBe('Error en nombre');
    });

    test('debe retornar null si la propiedad no tiene error', () => {
      model._errors = { name: 'Error en nombre' };
      expect(model.getError('value')).toBeNull();
    });
  });

  describe('toJSON', () => {
    test('debe retornar una copia de los datos internos', () => {
      model._data = { name: 'Test', value: 123 };
      const json = model.toJSON();
      
      expect(json).toEqual({ name: 'Test', value: 123 });
      expect(json).not.toBe(model._data); // Verifica que sea una copia
    });
  });

  describe('fromJSON', () => {
    test('debe cargar datos desde un objeto JSON', () => {
      const testData = { name: 'Test', value: 123 };
      model.fromJSON(testData);
      
      expect(model._data).toEqual(testData);
    });

    test('debe manejar valores nulos o no objetos', () => {
      model._data = { existing: 'data' };
      
      model.fromJSON(null);
      expect(model._data).toEqual({ existing: 'data' });
      
      model.fromJSON('not an object');
      expect(model._data).toEqual({ existing: 'data' });
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(model.fromJSON({})).toBe(model);
    });
  });

  describe('isDirty', () => {
    test('debe retornar false si no hay cambios', () => {
      const testData = { name: 'Test', value: 123 };
      model = new BaseModel(testData);
      
      expect(model.isDirty()).toBe(false);
    });

    test('debe retornar true si hay cambios en los datos', () => {
      const testData = { name: 'Test', value: 123 };
      model = new BaseModel(testData);
      model._data.name = 'Modified';
      
      expect(model.isDirty()).toBe(true);
    });

    test('debe detectar cambios en propiedades anidadas', () => {
      const testData = { user: { name: 'Test', age: 30 } };
      model = new BaseModel(testData);
      model._data.user.age = 31;
      
      expect(model.isDirty()).toBe(true);
    });

    test('debe detectar propiedades añadidas', () => {
      model = new BaseModel({ name: 'Test' });
      model._data.value = 123;
      
      expect(model.isDirty()).toBe(true);
    });

    test('debe detectar propiedades eliminadas', () => {
      model = new BaseModel({ name: 'Test', value: 123 });
      delete model._data.value;
      
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('reset', () => {
    test('debe restablecer los datos a su estado original', () => {
      const testData = { name: 'Test', value: 123 };
      model = new BaseModel(testData);
      model._data.name = 'Modified';
      model._errors = { name: 'Error' };
      
      model.reset();
      
      expect(model._data).toEqual(testData);
      expect(model._errors).toEqual({});
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(model.reset()).toBe(model);
    });
  });

  describe('commit', () => {
    test('debe actualizar los datos originales con los datos actuales', () => {
      model = new BaseModel({ name: 'Original' });
      model._data.name = 'Modified';
      model._data.value = 123;
      
      model.commit();
      
      expect(model._originalData).toEqual({ name: 'Modified', value: 123 });
      expect(model.isDirty()).toBe(false);
    });

    test('debe retornar la instancia para encadenamiento', () => {
      expect(model.commit()).toBe(model);
    });
  });

  describe('generateId', () => {
    test('debe generar un ID único usando crypto.randomUUID', () => {
      const id = BaseModel.generateId();
      
      expect(id).toBe('test-uuid');
      expect(global.crypto.randomUUID).toHaveBeenCalled();
    });
  });
});