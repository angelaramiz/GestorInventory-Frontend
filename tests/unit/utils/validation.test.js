// tests/unit/utils/validation.test.js
import { validateProduct, validateInventory, validateBarcode } from '@utils/validation';

describe('Utilidades de Validación', () => {
  describe('validateProduct', () => {
    test('debe validar un producto correcto', () => {
      // Arrange
      const producto = {
        codigo: '1234567890123',
        nombre: 'Producto Test',
        marca: 'Marca Test',
        categoria: 'Categoria Test',
        precio: 100,
        unidad: 'Unidad'
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.errors).toHaveLength(0);
    });
    
    test('debe rechazar un producto sin código', () => {
      // Arrange
      const producto = {
        nombre: 'Producto Test',
        precio: 100
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El código es obligatorio');
    });

    test('debe rechazar un producto sin nombre', () => {
      // Arrange
      const producto = {
        codigo: '1234567890123',
        precio: 100
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El nombre es obligatorio');
    });

    test('debe rechazar un producto con precio negativo', () => {
      // Arrange
      const producto = {
        codigo: '1234567890123',
        nombre: 'Producto Test',
        precio: -10
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El precio debe ser mayor a 0');
    });

    test('debe rechazar un código de barras inválido', () => {
      // Arrange
      const producto = {
        codigo: '123', // Muy corto
        nombre: 'Producto Test',
        precio: 100
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El código debe tener al menos 8 caracteres');
    });

    test('debe aceptar múltiples errores', () => {
      // Arrange
      const producto = {
        precio: -10
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors.length).toBeGreaterThan(1);
      expect(resultado.errors).toContain('El código es obligatorio');
      expect(resultado.errors).toContain('El nombre es obligatorio');
      expect(resultado.errors).toContain('El precio debe ser mayor a 0');
    });
  });

  describe('validateInventory', () => {
    test('debe validar un inventario correcto', () => {
      // Arrange
      const inventario = {
        producto_id: 'uuid-test',
        cantidad: 10,
        precio_unitario: 100,
        lote: 'LOTE001',
        ubicacion: 'A1-B2-C3'
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.errors).toHaveLength(0);
    });

    test('debe rechazar inventario sin producto_id', () => {
      // Arrange
      const inventario = {
        cantidad: 10,
        precio_unitario: 100
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El ID del producto es obligatorio');
    });

    test('debe rechazar cantidad negativa', () => {
      // Arrange
      const inventario = {
        producto_id: 'uuid-test',
        cantidad: -5,
        precio_unitario: 100
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('La cantidad debe ser mayor o igual a 0');
    });

    test('debe rechazar precio unitario negativo', () => {
      // Arrange
      const inventario = {
        producto_id: 'uuid-test',
        cantidad: 10,
        precio_unitario: -50
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El precio unitario debe ser mayor a 0');
    });

    test('debe validar fecha de vencimiento en formato correcto', () => {
      // Arrange
      const inventario = {
        producto_id: 'uuid-test',
        cantidad: 10,
        precio_unitario: 100,
        fecha_vencimiento: '2024-12-31'
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.errors).toHaveLength(0);
    });

    test('debe rechazar fecha de vencimiento en formato incorrecto', () => {
      // Arrange
      const inventario = {
        producto_id: 'uuid-test',
        cantidad: 10,
        precio_unitario: 100,
        fecha_vencimiento: '31/12/2024' // Formato incorrecto
      };
      
      // Act
      const resultado = validateInventory(inventario);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('La fecha de vencimiento debe estar en formato YYYY-MM-DD');
    });
  });

  describe('validateBarcode', () => {
    test('debe validar códigos EAN-13', () => {
      // Arrange
      const codigo = '1234567890123';
      
      // Act
      const resultado = validateBarcode(codigo);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.type).toBe('EAN-13');
    });

    test('debe validar códigos EAN-8', () => {
      // Arrange
      const codigo = '12345678';
      
      // Act
      const resultado = validateBarcode(codigo);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.type).toBe('EAN-8');
    });

    test('debe validar códigos CODE-128', () => {
      // Arrange
      const codigo = 'ABC123DEF456';
      
      // Act
      const resultado = validateBarcode(codigo);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(resultado.type).toBe('CODE-128');
    });

    test('debe rechazar códigos muy cortos', () => {
      // Arrange
      const codigo = '123';
      
      // Act
      const resultado = validateBarcode(codigo);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El código debe tener al menos 8 caracteres');
    });

    test('debe rechazar códigos con caracteres especiales no permitidos', () => {
      // Arrange
      const codigo = '123456@#$%';
      
      // Act
      const resultado = validateBarcode(codigo);
      
      // Assert
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toContain('El código contiene caracteres no válidos');
    });

    test('debe rechazar códigos nulos o undefined', () => {
      // Act & Assert
      expect(validateBarcode(null).isValid).toBe(false);
      expect(validateBarcode(undefined).isValid).toBe(false);
      expect(validateBarcode('').isValid).toBe(false);
    });
  });

  describe('Casos edge', () => {
    test('debe manejar objetos nulos', () => {
      // Act & Assert
      expect(validateProduct(null).isValid).toBe(false);
      expect(validateInventory(null).isValid).toBe(false);
    });

    test('debe manejar objetos vacíos', () => {
      // Act & Assert
      expect(validateProduct({}).isValid).toBe(false);
      expect(validateInventory({}).isValid).toBe(false);
    });

    test('debe manejar valores undefined', () => {
      // Act & Assert
      expect(validateProduct(undefined).isValid).toBe(false);
      expect(validateInventory(undefined).isValid).toBe(false);
    });

    test('debe ignorar propiedades adicionales en productos', () => {
      // Arrange
      const producto = {
        codigo: '1234567890123',
        nombre: 'Producto Test',
        precio: 100,
        propiedadExtra: 'valor extra'
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(true);
    });

    test('debe convertir números como string a números', () => {
      // Arrange
      const producto = {
        codigo: '1234567890123',
        nombre: 'Producto Test',
        precio: '100' // String que representa número
      };
      
      // Act
      const resultado = validateProduct(producto);
      
      // Assert
      expect(resultado.isValid).toBe(true);
      expect(typeof resultado.sanitized.precio).toBe('number');
      expect(resultado.sanitized.precio).toBe(100);
    });
  });
});
