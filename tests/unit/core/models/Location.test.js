/**
 * @fileoverview Pruebas para el modelo Location
 */

import Location from '../../../../src/core/models/Location';

describe('Location Model', () => {
  // Datos de prueba
  const locationData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Almacén Principal',
    code: 'ALM001',
    description: 'Almacén principal de la empresa',
    type: 'warehouse',
    parentId: null,
    path: '',
    level: 0,
    address: 'Calle Industrial 123',
    city: 'Madrid',
    state: 'Madrid',
    country: 'España',
    postalCode: '28001',
    capacity: 1000,
    capacityUnit: 'm3',
    temperature: 22,
    temperatureUnit: 'C',
    humidity: 45,
    active: true,
    attributes: {
      securityLevel: 'alto',
      hasLoadingDock: true,
      numberOfDoors: 4
    },
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  // Datos para una sububicación
  const sublocationData = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Zona A',
    code: 'ZONA-A',
    description: 'Zona A del almacén principal',
    type: 'zone',
    parentId: '123e4567-e89b-12d3-a456-426614174000',
    path: '123e4567-e89b-12d3-a456-426614174000/223e4567-e89b-12d3-a456-426614174001',
    level: 1,
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    capacity: 250,
    capacityUnit: 'm3',
    temperature: null,
    temperatureUnit: 'C',
    humidity: null,
    active: true,
    attributes: {
      productType: 'electrónica',
      maxWeight: 5000
    },
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  describe('Constructor', () => {
    test('debería crear una instancia con los valores por defecto cuando no se proporcionan datos', () => {
      const location = new Location();
      
      expect(location.id).toBeDefined();
      expect(location.name).toBe('');
      expect(location.code).toBe('');
      expect(location.description).toBe('');
      expect(location.type).toBe('warehouse');
      expect(location.parentId).toBeNull();
      expect(location.path).toBe('');
      expect(location.level).toBe(0);
      expect(location.address).toBe('');
      expect(location.city).toBe('');
      expect(location.state).toBe('');
      expect(location.country).toBe('');
      expect(location.postalCode).toBe('');
      expect(location.capacity).toBeNull();
      expect(location.capacityUnit).toBeNull();
      expect(location.temperature).toBeNull();
      expect(location.temperatureUnit).toBe('C');
      expect(location.humidity).toBeNull();
      expect(location.active).toBe(true);
      expect(location.attributes).toEqual({});
      expect(location.createdAt).toBeDefined();
      expect(location.updatedAt).toBeDefined();
    });

    test('debería crear una instancia con los datos proporcionados', () => {
      const location = new Location(locationData);
      
      expect(location.id).toBe(locationData.id);
      expect(location.name).toBe(locationData.name);
      expect(location.code).toBe(locationData.code);
      expect(location.description).toBe(locationData.description);
      expect(location.type).toBe(locationData.type);
      expect(location.parentId).toBe(locationData.parentId);
      expect(location.path).toBe(locationData.path);
      expect(location.level).toBe(locationData.level);
      expect(location.address).toBe(locationData.address);
      expect(location.city).toBe(locationData.city);
      expect(location.state).toBe(locationData.state);
      expect(location.country).toBe(locationData.country);
      expect(location.postalCode).toBe(locationData.postalCode);
      expect(location.capacity).toBe(locationData.capacity);
      expect(location.capacityUnit).toBe(locationData.capacityUnit);
      expect(location.temperature).toBe(locationData.temperature);
      expect(location.temperatureUnit).toBe(locationData.temperatureUnit);
      expect(location.humidity).toBe(locationData.humidity);
      expect(location.active).toBe(locationData.active);
      expect(location.attributes).toEqual(locationData.attributes);
      expect(location.createdAt).toBe(locationData.createdAt);
      expect(location.updatedAt).toBe(locationData.updatedAt);
    });
  });

  describe('Validación', () => {
    test('debería validar correctamente una ubicación con datos válidos', () => {
      const location = new Location(locationData);
      expect(location.validate()).toBe(true);
      expect(location.getErrors()).toEqual({});
    });

    test('debería fallar la validación cuando el nombre está vacío', () => {
      const location = new Location({ ...locationData, name: '' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('name');
    });

    test('debería fallar la validación cuando el código es demasiado largo', () => {
      const location = new Location({ 
        ...locationData, 
        code: 'CODIGO_DEMASIADO_LARGO_PARA_LA_VALIDACION' 
      });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('code');
    });

    test('debería fallar la validación cuando el tipo no es válido', () => {
      const location = new Location({ ...locationData, type: 'tipo_invalido' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('type');
    });

    test('debería fallar la validación cuando el nivel no es un número', () => {
      const location = new Location({ ...locationData, level: 'cero' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('level');
    });

    test('debería fallar la validación cuando el nivel es negativo', () => {
      const location = new Location({ ...locationData, level: -1 });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('level');
    });

    test('debería fallar la validación cuando la capacidad no es válida', () => {
      const location = new Location({ ...locationData, capacity: -10 });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('capacity');
    });

    test('debería fallar la validación cuando hay capacidad pero no unidad de capacidad', () => {
      const location = new Location({ ...locationData, capacity: 100, capacityUnit: null });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('capacityUnit');
    });

    test('debería fallar la validación cuando la temperatura no es un número', () => {
      const location = new Location({ ...locationData, temperature: 'veinte' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('temperature');
    });

    test('debería fallar la validación cuando la unidad de temperatura no es válida', () => {
      const location = new Location({ ...locationData, temperature: 20, temperatureUnit: 'K' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('temperatureUnit');
    });

    test('debería fallar la validación cuando la humedad no es válida', () => {
      const location = new Location({ ...locationData, humidity: 101 });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('humidity');
    });

    test('debería fallar la validación cuando active no es booleano', () => {
      const location = new Location({ ...locationData, active: 'true' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('active');
    });

    test('debería fallar la validación cuando los atributos no son un objeto', () => {
      const location = new Location({ ...locationData, attributes: 'no soy un objeto' });
      expect(location.validate()).toBe(false);
      expect(location.getErrors()).toHaveProperty('attributes');
    });
  });

  describe('Métodos de activación/desactivación', () => {
    test('debería activar una ubicación desactivada', () => {
      const location = new Location({ ...locationData, active: false });
      location.activate();
      expect(location.active).toBe(true);
    });

    test('debería desactivar una ubicación activa', () => {
      const location = new Location(locationData);
      location.deactivate();
      expect(location.active).toBe(false);
    });
  });

  describe('Métodos de jerarquía', () => {
    test('debería establecer correctamente una ubicación padre', () => {
      const location = new Location();
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      const parentPath = '123e4567-e89b-12d3-a456-426614174000';
      const parentLevel = 1;
      
      location.setParent(parentId, parentPath, parentLevel);
      
      expect(location.parentId).toBe(parentId);
      expect(location.path).toBe(`${parentPath}/${location.id}`);
      expect(location.level).toBe(parentLevel + 1);
    });

    test('debería eliminar correctamente la ubicación padre', () => {
      const location = new Location(sublocationData);
      location.removeParent();
      
      expect(location.parentId).toBeNull();
      expect(location.path).toBe('');
      expect(location.level).toBe(0);
    });

    test('debería identificar correctamente si es una ubicación raíz', () => {
      const rootLocation = new Location(locationData);
      const subLocation = new Location(sublocationData);
      
      expect(rootLocation.isRoot()).toBe(true);
      expect(subLocation.isRoot()).toBe(false);
    });

    test('debería identificar correctamente si es una sububicación de otra', () => {
      const subLocation = new Location(sublocationData);
      
      expect(subLocation.isChildOf(locationData.id)).toBe(true);
      expect(subLocation.isChildOf('ubicacion-inexistente')).toBe(false);
    });
  });

  describe('Métodos de atributos', () => {
    test('debería establecer un nuevo atributo', () => {
      const location = new Location(locationData);
      location.setAttribute('color', 'azul');
      
      expect(location.hasAttribute('color')).toBe(true);
      expect(location.getAttribute('color')).toBe('azul');
    });

    test('debería actualizar un atributo existente', () => {
      const location = new Location(locationData);
      location.setAttribute('securityLevel', 'medio');
      
      expect(location.getAttribute('securityLevel')).toBe('medio');
    });

    test('debería lanzar un error al intentar establecer un atributo sin clave', () => {
      const location = new Location(locationData);
      
      expect(() => {
        location.setAttribute('', 'valor');
      }).toThrow();
      
      expect(() => {
        location.setAttribute(null, 'valor');
      }).toThrow();
    });

    test('debería eliminar un atributo existente', () => {
      const location = new Location(locationData);
      location.removeAttribute('securityLevel');
      
      expect(location.hasAttribute('securityLevel')).toBe(false);
      expect(location.getAttribute('securityLevel')).toBeUndefined();
    });

    test('no debería modificar los atributos al intentar eliminar uno que no existe', () => {
      const location = new Location(locationData);
      const initialAttributes = { ...location.attributes };
      
      location.removeAttribute('atributo-inexistente');
      
      expect(location.attributes).toEqual(initialAttributes);
    });

    test('debería verificar correctamente si tiene un atributo', () => {
      const location = new Location(locationData);
      
      expect(location.hasAttribute('securityLevel')).toBe(true);
      expect(location.hasAttribute('atributo-inexistente')).toBe(false);
    });

    test('debería obtener correctamente un atributo por su clave', () => {
      const location = new Location(locationData);
      
      expect(location.getAttribute('securityLevel')).toBe('alto');
      expect(location.getAttribute('atributo-inexistente')).toBeUndefined();
    });

    test('debería establecer correctamente un objeto de atributos', () => {
      const location = new Location(locationData);
      const newAttributes = {
        material: 'concreto',
        iluminación: 'LED'
      };
      
      location.attributes = newAttributes;
      
      expect(location.attributes).toEqual(newAttributes);
    });

    test('debería lanzar un error al intentar establecer atributos con un valor no objeto', () => {
      const location = new Location(locationData);
      
      expect(() => {
        location.attributes = 'No soy un objeto';
      }).toThrow();
      
      expect(() => {
        location.attributes = ['No', 'soy', 'un', 'objeto'];
      }).toThrow();
    });
  });

  describe('Método getFullAddress', () => {
    test('debería devolver la dirección completa correctamente', () => {
      const location = new Location(locationData);
      const expectedAddress = 'Calle Industrial 123, Madrid, Madrid, 28001, España';
      expect(location.getFullAddress()).toBe(expectedAddress);
    });

    test('debería omitir partes vacías de la dirección', () => {
      const location = new Location({
        ...locationData,
        state: '',
        postalCode: ''
      });
      const expectedAddress = 'Calle Industrial 123, Madrid, España';
      expect(location.getFullAddress()).toBe(expectedAddress);
    });

    test('debería devolver una cadena vacía si no hay datos de dirección', () => {
      const location = new Location({
        ...locationData,
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      });
      expect(location.getFullAddress()).toBe('');
    });
  });

  describe('Método getTemperatureIn', () => {
    test('debería devolver la temperatura sin convertir si la unidad es la misma', () => {
      const location = new Location(locationData); // temperatura: 22, unidad: 'C'
      expect(location.getTemperatureIn('C')).toBe(22);
    });

    test('debería convertir correctamente de Celsius a Fahrenheit', () => {
      const location = new Location(locationData); // temperatura: 22, unidad: 'C'
      // Fórmula: (C * 9/5) + 32 = (22 * 9/5) + 32 = 71.6
      expect(location.getTemperatureIn('F')).toBeCloseTo(71.6, 1);
    });

    test('debería convertir correctamente de Fahrenheit a Celsius', () => {
      const location = new Location({
        ...locationData,
        temperature: 68,
        temperatureUnit: 'F'
      });
      // Fórmula: (F - 32) * 5/9 = (68 - 32) * 5/9 = 20
      expect(location.getTemperatureIn('C')).toBeCloseTo(20, 1);
    });

    test('debería devolver null si no hay temperatura', () => {
      const location = new Location({
        ...locationData,
        temperature: null
      });
      expect(location.getTemperatureIn('C')).toBeNull();
      expect(location.getTemperatureIn('F')).toBeNull();
    });

    test('debería lanzar un error si la unidad no es válida', () => {
      const location = new Location(locationData);
      expect(() => {
        location.getTemperatureIn('K');
      }).toThrow();
    });
  });

  describe('Getters y Setters', () => {
    test('debería actualizar la fecha de actualización al modificar propiedades', () => {
      const location = new Location(locationData);
      const initialUpdatedAt = location.updatedAt;
      
      // Esperar un momento para asegurar que la fecha sea diferente
      jest.advanceTimersByTime(1000);
      
      location.name = 'Nuevo Nombre';
      expect(location.updatedAt).not.toBe(initialUpdatedAt);
    });

    test('debería actualizar correctamente todas las propiedades básicas', () => {
      const location = new Location(locationData);
      
      location.name = 'Nuevo Nombre';
      expect(location.name).toBe('Nuevo Nombre');
      
      location.code = 'NUEVO001';
      expect(location.code).toBe('NUEVO001');
      
      location.description = 'Nueva Descripción';
      expect(location.description).toBe('Nueva Descripción');
      
      location.type = 'area';
      expect(location.type).toBe('area');
      
      location.address = 'Nueva Dirección';
      expect(location.address).toBe('Nueva Dirección');
      
      location.city = 'Nueva Ciudad';
      expect(location.city).toBe('Nueva Ciudad');
      
      location.state = 'Nuevo Estado';
      expect(location.state).toBe('Nuevo Estado');
      
      location.country = 'Nuevo País';
      expect(location.country).toBe('Nuevo País');
      
      location.postalCode = '12345';
      expect(location.postalCode).toBe('12345');
      
      location.active = false;
      expect(location.active).toBe(false);
    });

    test('debería manejar correctamente los valores numéricos y nulos', () => {
      const location = new Location(locationData);
      
      location.capacity = 500;
      expect(location.capacity).toBe(500);
      
      location.capacity = null;
      expect(location.capacity).toBeNull();
      
      location.temperature = 25;
      expect(location.temperature).toBe(25);
      
      location.temperature = null;
      expect(location.temperature).toBeNull();
      
      location.humidity = 60;
      expect(location.humidity).toBe(60);
      
      location.humidity = null;
      expect(location.humidity).toBeNull();
    });

    test('debería convertir valores numéricos de string a number', () => {
      const location = new Location(locationData);
      
      location.capacity = '500';
      expect(location.capacity).toBe(500);
      
      location.temperature = '25';
      expect(location.temperature).toBe(25);
    });

    test('debería validar la unidad de temperatura', () => {
      const location = new Location(locationData);
      
      location.temperatureUnit = 'F';
      expect(location.temperatureUnit).toBe('F');
      
      expect(() => {
        location.temperatureUnit = 'K';
      }).toThrow();
    });

    test('debería validar el rango de humedad', () => {
      const location = new Location(locationData);
      
      location.humidity = 0;
      expect(location.humidity).toBe(0);
      
      location.humidity = 100;
      expect(location.humidity).toBe(100);
      
      expect(() => {
        location.humidity = -1;
      }).toThrow();
      
      expect(() => {
        location.humidity = 101;
      }).toThrow();
    });

    test('debería convertir el valor de active a booleano', () => {
      const location = new Location(locationData);
      
      location.active = 1;
      expect(location.active).toBe(true);
      
      location.active = 0;
      expect(location.active).toBe(false);
      
      location.active = '';
      expect(location.active).toBe(false);
      
      location.active = 'true';
      expect(location.active).toBe(true);
    });
  });

  describe('Serialización', () => {
    test('debería serializar correctamente a JSON', () => {
      const location = new Location(locationData);
      const json = location.toJSON();
      
      expect(json).toEqual(locationData);
    });

    test('debería deserializar correctamente desde JSON', () => {
      const location = new Location();
      location.fromJSON(locationData);
      
      expect(location.id).toBe(locationData.id);
      expect(location.name).toBe(locationData.name);
      expect(location.code).toBe(locationData.code);
      expect(location.description).toBe(locationData.description);
      expect(location.type).toBe(locationData.type);
      expect(location.parentId).toBe(locationData.parentId);
      expect(location.path).toBe(locationData.path);
      expect(location.level).toBe(locationData.level);
      expect(location.address).toBe(locationData.address);
      expect(location.city).toBe(locationData.city);
      expect(location.state).toBe(locationData.state);
      expect(location.country).toBe(locationData.country);
      expect(location.postalCode).toBe(locationData.postalCode);
      expect(location.capacity).toBe(locationData.capacity);
      expect(location.capacityUnit).toBe(locationData.capacityUnit);
      expect(location.temperature).toBe(locationData.temperature);
      expect(location.temperatureUnit).toBe(locationData.temperatureUnit);
      expect(location.humidity).toBe(locationData.humidity);
      expect(location.active).toBe(locationData.active);
      expect(location.attributes).toEqual(locationData.attributes);
      expect(location.createdAt).toBe(locationData.createdAt);
      expect(location.updatedAt).toBe(locationData.updatedAt);
    });
  });
});