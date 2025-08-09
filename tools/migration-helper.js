// tools/migration-helper.js
// Herramienta para asistir en la migración de archivos a la nueva arquitectura

const fs = require('fs');
const path = require('path');

class MigrationHelper {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.migrationPlan = {
            completed: [],
            pending: [],
            errors: []
        };
    }

    // Crear estructura de directorios para la nueva arquitectura
    async createNewStructure() {
        console.log('🏗️  Creando nueva estructura de directorios...\n');
        
        const directories = [
            'src',
            'src/api',
            'src/core',
            'src/core/models',
            'src/core/repositories',
            'src/core/services',
            'src/core/events',
            'src/ui',
            'src/ui/components',
            'src/ui/pages',
            'src/ui/layouts',
            'src/utils',
            'src/storage',
            'src/config',
            'src/types',
            'tests',
            'tests/unit',
            'tests/unit/core',
            'tests/unit/core/models',
            'tests/unit/core/services',
            'tests/unit/core/repositories',
            'tests/unit/utils',
            'tests/unit/ui',
            'tests/unit/ui/components',
            'tests/integration',
            'tests/integration/storage',
            'tests/integration/api',
            'tests/integration/workflows',
            'tests/e2e',
            'tests/mocks',
            'tests/fixtures',
            'tools'
        ];

        for (const dir of directories) {
            const fullPath = path.join(this.projectPath, dir);
            try {
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    console.log(`✅ Creado: ${dir}`);
                } else {
                    console.log(`⏭️  Ya existe: ${dir}`);
                }
            } catch (error) {
                console.error(`❌ Error creando ${dir}:`, error.message);
                this.migrationPlan.errors.push(`Error creando ${dir}: ${error.message}`);
            }
        }
    }

    // Generar plantillas de archivos base
    async generateBaseFiles() {
        console.log('\n📄 Generando archivos base...\n');
        
        const baseFiles = [
            {
                path: 'src/core/models/base-model.js',
                content: this.getBaseModelTemplate()
            },
            {
                path: 'src/core/repositories/base-repository.js',
                content: this.getBaseRepositoryTemplate()
            },
            {
                path: 'src/core/services/base-service.js',
                content: this.getBaseServiceTemplate()
            },
            {
                path: 'src/core/events/event-emitter.js',
                content: this.getEventEmitterTemplate()
            },
            {
                path: 'src/utils/logger.js',
                content: this.getLoggerTemplate()
            },
            {
                path: 'src/utils/validation.js',
                content: this.getValidationTemplate()
            },
            {
                path: 'src/config/app-config.js',
                content: this.getAppConfigTemplate()
            },
            {
                path: 'tests/mocks/api-mocks.js',
                content: this.getApiMocksTemplate()
            }
        ];

        for (const file of baseFiles) {
            try {
                const fullPath = path.join(this.projectPath, file.path);
                if (!fs.existsSync(fullPath)) {
                    fs.writeFileSync(fullPath, file.content);
                    console.log(`✅ Generado: ${file.path}`);
                    this.migrationPlan.completed.push(file.path);
                } else {
                    console.log(`⏭️  Ya existe: ${file.path}`);
                }
            } catch (error) {
                console.error(`❌ Error generando ${file.path}:`, error.message);
                this.migrationPlan.errors.push(`Error generando ${file.path}: ${error.message}`);
            }
        }
    }

    // Analizar archivos existentes y sugerir migración
    async analyzeMigrationCandidates() {
        console.log('\n🔍 Analizando archivos para migración...\n');
        
        const jsDir = path.join(this.projectPath, 'js');
        if (!fs.existsSync(jsDir)) {
            console.log('❌ Directorio js/ no encontrado');
            return;
        }

        const files = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
        
        const migrationMap = {
            'auth.js': 'src/api/auth-api.js',
            'db-operations.js': ['src/storage/indexed-db.js', 'src/core/repositories/'],
            'product-operations.js': 'src/core/services/product-service.js',
            'scanner.js': 'src/ui/components/scanner.js',
            'logs.js': 'src/utils/logger.js',
            'configuraciones.js': 'src/config/app-config.js',
            'sanitizacion.js': 'src/utils/validation.js',
            'theme-manager.js': 'src/ui/components/theme-manager.js',
            'main.js': 'src/ui/pages/main-page.js'
        };

        console.log('Sugerencias de migración:');
        console.log('========================');
        
        files.forEach(file => {
            const suggestion = migrationMap[file];
            if (suggestion) {
                if (Array.isArray(suggestion)) {
                    console.log(`📁 ${file} → ${suggestion.join(', ')} (dividir)`);
                } else {
                    console.log(`📄 ${file} → ${suggestion}`);
                }
                this.migrationPlan.pending.push({ from: file, to: suggestion });
            } else {
                console.log(`❓ ${file} → Requiere análisis manual`);
            }
        });
    }

    // Generar reporte de migración
    generateMigrationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                completed: this.migrationPlan.completed.length,
                pending: this.migrationPlan.pending.length,
                errors: this.migrationPlan.errors.length
            },
            details: this.migrationPlan
        };

        const reportPath = path.join(this.projectPath, 'tools', 'migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 RESUMEN DE MIGRACIÓN');
        console.log('=====================');
        console.log(`✅ Completados: ${report.summary.completed}`);
        console.log(`⏳ Pendientes: ${report.summary.pending}`);
        console.log(`❌ Errores: ${report.summary.errors}`);
        console.log(`\n📄 Reporte guardado en: tools/migration-report.json`);
    }

    // Templates para archivos base
    getBaseModelTemplate() {
        return `// src/core/models/base-model.js
/**
 * Clase base para todos los modelos del dominio
 * Proporciona funcionalidad común como validación, serialización y timestamps
 */
export class BaseModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    
    // Aplicar datos específicos del modelo
    this.applyData(data);
  }

  /**
   * Generar ID único para el modelo
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Aplicar datos específicos del modelo (debe ser implementado por subclases)
   */
  applyData(data) {
    // Implementar en subclases
  }

  /**
   * Validar el modelo (debe ser implementado por subclases)
   */
  validate() {
    return { isValid: true, errors: [] };
  }

  /**
   * Serializar el modelo para persistencia
   */
  toJSON() {
    return {
      id: this.id,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Actualizar timestamp de modificación
   */
  touch() {
    this.updated_at = new Date().toISOString();
  }
}
`;
    }

    getBaseRepositoryTemplate() {
        return `// src/core/repositories/base-repository.js
/**
 * Repositorio base que maneja operaciones CRUD comunes
 * Implementa patrón Repository con soporte para almacenamiento local y remoto
 */
export class BaseRepository {
  constructor(localStorage, remoteStorage) {
    this.localStorage = localStorage;
    this.remoteStorage = remoteStorage;
    this.syncQueue = [];
  }

  /**
   * Buscar entidad por ID
   */
  async findById(id) {
    // Buscar primero en almacenamiento local
    let entity = await this.localStorage.get(id);
    
    // Si no existe localmente y hay conexión, buscar remotamente
    if (!entity && navigator.onLine && this.remoteStorage) {
      entity = await this.remoteStorage.findById(id);
      if (entity) {
        await this.localStorage.set(id, entity);
      }
    }
    
    return entity;
  }

  /**
   * Buscar todas las entidades
   */
  async findAll(options = {}) {
    try {
      if (navigator.onLine && this.remoteStorage) {
        const entities = await this.remoteStorage.findAll(options);
        // Sincronizar con almacenamiento local
        await this.syncToLocal(entities);
        return entities;
      } else {
        return await this.localStorage.getAll(options);
      }
    } catch (error) {
      // Fallback a almacenamiento local en caso de error
      return await this.localStorage.getAll(options);
    }
  }

  /**
   * Guardar entidad
   */
  async save(entity) {
    // Validar entidad
    const validation = entity.validate ? entity.validate() : { isValid: true };
    if (!validation.isValid) {
      throw new Error(\`Entidad inválida: \${validation.errors.join(', ')}\`);
    }

    // Actualizar timestamp
    if (entity.touch) {
      entity.touch();
    }

    // Guardar localmente
    await this.localStorage.set(entity.id, entity);
    
    // Intentar guardar remotamente
    if (navigator.onLine && this.remoteStorage) {
      try {
        await this.remoteStorage.save(entity);
      } catch (error) {
        // Agregar a cola de sincronización si falla
        this.addToSyncQueue('save', entity);
      }
    } else {
      this.addToSyncQueue('save', entity);
    }
    
    return entity;
  }

  /**
   * Eliminar entidad
   */
  async delete(id) {
    await this.localStorage.delete(id);
    
    if (navigator.onLine && this.remoteStorage) {
      try {
        await this.remoteStorage.delete(id);
      } catch (error) {
        this.addToSyncQueue('delete', { id });
      }
    } else {
      this.addToSyncQueue('delete', { id });
    }
  }

  /**
   * Agregar operación a cola de sincronización
   */
  addToSyncQueue(operation, data) {
    this.syncQueue.push({
      operation,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Procesar cola de sincronización
   */
  async processSyncQueue() {
    if (!navigator.onLine || !this.remoteStorage) {
      return;
    }

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'save':
            await this.remoteStorage.save(item.data);
            break;
          case 'delete':
            await this.remoteStorage.delete(item.data.id);
            break;
        }
      } catch (error) {
        // Volver a agregar a la cola si falla
        this.syncQueue.push(item);
      }
    }
  }

  /**
   * Sincronizar entidades con almacenamiento local
   */
  async syncToLocal(entities) {
    for (const entity of entities) {
      await this.localStorage.set(entity.id, entity);
    }
  }
}
`;
    }

    getBaseServiceTemplate() {
        return `// src/core/services/base-service.js
/**
 * Servicio base que proporciona funcionalidad común
 * Maneja lógica de negocio, validaciones y emisión de eventos
 */
export class BaseService {
  constructor(repository, validator, eventEmitter) {
    this.repository = repository;
    this.validator = validator;
    this.events = eventEmitter;
  }

  /**
   * Validar datos usando el validador
   */
  validate(data) {
    if (!this.validator) {
      return { isValid: true, errors: [] };
    }
    return this.validator.validate(data);
  }

  /**
   * Emitir evento si hay un emisor configurado
   */
  emit(event, data) {
    if (this.events) {
      this.events.emit(event, data);
    }
  }

  /**
   * Manejar errores de manera consistente
   */
  handleError(error, context = '') {
    const errorMessage = \`Error en \${context}: \${error.message}\`;
    console.error(errorMessage, error);
    
    this.emit('error', {
      message: errorMessage,
      error,
      context
    });
    
    throw error;
  }

  /**
   * Ejecutar operación con manejo de errores
   */
  async executeWithErrorHandling(operation, context) {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
    }
  }
}
`;
    }

    getEventEmitterTemplate() {
        return `// src/core/events/event-emitter.js
/**
 * Sistema de eventos simple para comunicación entre componentes
 * Implementa patrón Observer
 */
export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Suscribirse a un evento
   */
  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    
    // Retornar función para desuscribirse
    return () => this.off(event, listener);
  }

  /**
   * Suscribirse a un evento una sola vez
   */
  once(event, listener) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      listener(...args);
    });
    return unsubscribe;
  }

  /**
   * Emitir evento
   */
  emit(event, ...args) {
    if (this.events.has(event)) {
      const listeners = this.events.get(event);
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(\`Error en listener para evento '\${event}':\`, error);
        }
      });
    }
  }

  /**
   * Desuscribirse de un evento
   */
  off(event, listener) {
    if (this.events.has(event)) {
      const listeners = this.events.get(event);
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Eliminar todos los listeners de un evento
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Obtener número de listeners para un evento
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
}
`;
    }

    getLoggerTemplate() {
        return `// src/utils/logger.js
/**
 * Sistema de logging centralizado
 * Maneja diferentes niveles de log y puede enviar a múltiples destinos
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enableConsole = options.enableConsole !== false;
    this.enableStorage = options.enableStorage || false;
    this.maxStorageEntries = options.maxStorageEntries || 1000;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Log de error
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  /**
   * Log de advertencia
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Log de información
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Log de debug
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Método principal de logging
   */
  log(level, message, data = null) {
    if (this.levels[level] > this.levels[this.level]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.enableConsole) {
      this.logToConsole(logEntry);
    }

    if (this.enableStorage) {
      this.logToStorage(logEntry);
    }
  }

  /**
   * Log a consola
   */
  logToConsole(entry) {
    const style = this.getConsoleStyle(entry.level);
    const prefix = \`[\${entry.timestamp}] [\${entry.level.toUpperCase()}]\`;
    
    if (entry.data) {
      console.log(\`%c\${prefix} \${entry.message}\`, style, entry.data);
    } else {
      console.log(\`%c\${prefix} \${entry.message}\`, style);
    }
  }

  /**
   * Log a almacenamiento local
   */
  logToStorage(entry) {
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      
      // Mantener solo las últimas N entradas
      if (logs.length > this.maxStorageEntries) {
        logs.splice(0, logs.length - this.maxStorageEntries);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Error guardando log en storage:', error);
    }
  }

  /**
   * Obtener estilos para consola
   */
  getConsoleStyle(level) {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #0088ff;',
      debug: 'color: #888888;'
    };
    return styles[level] || '';
  }

  /**
   * Obtener logs del almacenamiento
   */
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch (error) {
      console.error('Error leyendo logs del storage:', error);
      return [];
    }
  }

  /**
   * Limpiar logs
   */
  clearLogs() {
    localStorage.removeItem('app_logs');
  }
}

// Instancia global del logger
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableStorage: true
});

export default Logger;
`;
    }

    getValidationTemplate() {
        return `// src/utils/validation.js
/**
 * Utilidades de validación para diferentes tipos de datos
 */

/**
 * Validar producto
 */
export function validateProduct(product) {
  const errors = [];
  const sanitized = {};

  if (!product || typeof product !== 'object') {
    return { isValid: false, errors: ['Producto debe ser un objeto válido'], sanitized: null };
  }

  // Código
  if (!product.codigo || typeof product.codigo !== 'string' || product.codigo.trim().length < 8) {
    errors.push('El código es obligatorio y debe tener al menos 8 caracteres');
  } else {
    sanitized.codigo = product.codigo.trim();
  }

  // Nombre
  if (!product.nombre || typeof product.nombre !== 'string' || product.nombre.trim().length === 0) {
    errors.push('El nombre es obligatorio');
  } else {
    sanitized.nombre = product.nombre.trim();
  }

  // Precio
  const precio = parseFloat(product.precio);
  if (isNaN(precio) || precio <= 0) {
    errors.push('El precio debe ser mayor a 0');
  } else {
    sanitized.precio = precio;
  }

  // Campos opcionales
  if (product.marca) sanitized.marca = product.marca.trim();
  if (product.categoria) sanitized.categoria = product.categoria.trim();
  if (product.unidad) sanitized.unidad = product.unidad.trim();
  if (product.descripcion) sanitized.descripcion = product.descripcion.trim();

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validar inventario
 */
export function validateInventory(inventory) {
  const errors = [];
  const sanitized = {};

  if (!inventory || typeof inventory !== 'object') {
    return { isValid: false, errors: ['Inventario debe ser un objeto válido'], sanitized: null };
  }

  // Producto ID
  if (!inventory.producto_id) {
    errors.push('El ID del producto es obligatorio');
  } else {
    sanitized.producto_id = inventory.producto_id;
  }

  // Cantidad
  const cantidad = parseFloat(inventory.cantidad);
  if (isNaN(cantidad) || cantidad < 0) {
    errors.push('La cantidad debe ser mayor o igual a 0');
  } else {
    sanitized.cantidad = cantidad;
  }

  // Precio unitario
  const precioUnitario = parseFloat(inventory.precio_unitario);
  if (isNaN(precioUnitario) || precioUnitario <= 0) {
    errors.push('El precio unitario debe ser mayor a 0');
  } else {
    sanitized.precio_unitario = precioUnitario;
  }

  // Fecha de vencimiento (opcional)
  if (inventory.fecha_vencimiento) {
    const fechaRegex = /^\\d{4}-\\d{2}-\\d{2}$/;
    if (!fechaRegex.test(inventory.fecha_vencimiento)) {
      errors.push('La fecha de vencimiento debe estar en formato YYYY-MM-DD');
    } else {
      sanitized.fecha_vencimiento = inventory.fecha_vencimiento;
    }
  }

  // Campos opcionales
  if (inventory.lote) sanitized.lote = inventory.lote.trim();
  if (inventory.ubicacion) sanitized.ubicacion = inventory.ubicacion.trim();
  if (inventory.notas) sanitized.notas = inventory.notas.trim();

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validar código de barras
 */
export function validateBarcode(barcode) {
  const errors = [];

  if (!barcode || typeof barcode !== 'string') {
    return { isValid: false, errors: ['Código de barras requerido'], type: null };
  }

  const cleanBarcode = barcode.trim();

  if (cleanBarcode.length < 8) {
    errors.push('El código debe tener al menos 8 caracteres');
  }

  // Verificar caracteres válidos
  const validChars = /^[A-Za-z0-9-_]+$/;
  if (!validChars.test(cleanBarcode)) {
    errors.push('El código contiene caracteres no válidos');
  }

  // Determinar tipo de código
  let type = null;
  if (errors.length === 0) {
    if (/^\\d{13}$/.test(cleanBarcode)) {
      type = 'EAN-13';
    } else if (/^\\d{8}$/.test(cleanBarcode)) {
      type = 'EAN-8';
    } else {
      type = 'CODE-128';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    type,
    sanitized: cleanBarcode
  };
}

/**
 * Validar email
 */
export function validateEmail(email) {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar teléfono
 */
export function validatePhone(phone) {
  const phoneRegex = /^[\\d\\s\\-\\+\\(\\)]+$/;
  return phone && phoneRegex.test(phone) && phone.replace(/\\D/g, '').length >= 10;
}

/**
 * Sanitizar string
 */
export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

/**
 * Validar rango de fechas
 */
export function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Fechas inválidas' };
  }
  
  if (start > end) {
    return { isValid: false, error: 'La fecha de inicio debe ser anterior a la fecha de fin' };
  }
  
  return { isValid: true };
}
`;
    }

    getAppConfigTemplate() {
        return `// src/config/app-config.js
/**
 * Configuración principal de la aplicación
 * Centraliza todas las configuraciones y constantes
 */

// Configuración de entorno
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

// Configuración de la aplicación
export const APP_CONFIG = {
  name: 'GestorInventory',
  version: '2.0.0',
  defaultLanguage: 'es',
  theme: {
    default: 'light',
    available: ['light', 'dark']
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },
  cache: {
    defaultTTL: 300000, // 5 minutos
    maxSize: 100 // número máximo de elementos en caché
  }
};

// Configuración de base de datos
export const DB_CONFIG = {
  name: 'GestorInventoryDB',
  version: 2,
  stores: {
    products: 'productos',
    inventory: 'inventario',
    users: 'usuarios',
    batches: 'lotes',
    settings: 'configuraciones'
  }
};

// Configuración de API
export const API_CONFIG = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  endpoints: {
    products: '/productos',
    inventory: '/inventario',
    auth: '/auth',
    users: '/usuarios'
  }
};

// Configuración de validación
export const VALIDATION_CONFIG = {
  barcode: {
    minLength: 8,
    maxLength: 128,
    patterns: {
      ean13: /^\\d{13}$/,
      ean8: /^\\d{8}$/,
      code128: /^[A-Za-z0-9\\-_]+$/
    }
  },
  product: {
    name: {
      minLength: 1,
      maxLength: 255
    },
    price: {
      min: 0.01,
      max: 999999.99
    }
  }
};

// Mensajes de la aplicación
export const MESSAGES = {
  success: {
    productSaved: 'Producto guardado exitosamente',
    inventoryUpdated: 'Inventario actualizado correctamente',
    syncCompleted: 'Sincronización completada'
  },
  error: {
    productNotFound: 'Producto no encontrado',
    connectionFailed: 'Error de conexión',
    validationFailed: 'Error de validación',
    unauthorized: 'No autorizado'
  },
  confirm: {
    deleteProduct: '¿Estás seguro de eliminar este producto?',
    clearInventory: '¿Deseas limpiar todo el inventario?'
  }
};

// Configuración de logging
export const LOG_CONFIG = {
  level: ENV.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableConsole: true,
  enableStorage: true,
  maxStorageEntries: 1000
};

// Exportar configuración unificada
export default {
  ENV,
  APP_CONFIG,
  DB_CONFIG,
  API_CONFIG,
  VALIDATION_CONFIG,
  MESSAGES,
  LOG_CONFIG
};
`;
    }

    getApiMocksTemplate() {
        return `// tests/mocks/api-mocks.js
/**
 * Mocks para APIs y servicios externos
 */

// Mock de productos
export const mockProducts = [
  {
    id: '1',
    codigo: '1234567890123',
    nombre: 'Producto Test 1',
    marca: 'Marca Test',
    categoria: 'Categoria Test',
    precio: 100,
    unidad: 'Unidad',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    codigo: '2345678901234',
    nombre: 'Producto Test 2',
    marca: 'Marca Test',
    categoria: 'Categoria Test',
    precio: 200,
    unidad: 'Kg',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Mock de inventario
export const mockInventory = [
  {
    id: '1',
    producto_id: '1',
    cantidad: 10,
    precio_unitario: 100,
    lote: 'LOTE001',
    fecha_vencimiento: '2024-12-31',
    ubicacion: 'A1-B2-C3',
    created_at: '2024-01-01T00:00:00Z'
  }
];

// Mock de Supabase client
export const createMockSupabaseClient = () => ({
  from: jest.fn((table) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ 
        data: table === 'productos' ? mockProducts : mockInventory, 
        error: null 
      })),
      order: jest.fn(() => Promise.resolve({ 
        data: table === 'productos' ? mockProducts : mockInventory, 
        error: null 
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  })),
  auth: {
    signInWithPassword: jest.fn(() => Promise.resolve({ user: null, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ user: null, error: null }))
  }
});

// Mock de IndexedDB
export const createMockIndexedDB = () => ({
  open: jest.fn(() => Promise.resolve({
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          get: jest.fn(() => ({ onsuccess: null })),
          put: jest.fn(() => ({ onsuccess: null })),
          delete: jest.fn(() => ({ onsuccess: null })),
          getAll: jest.fn(() => ({ onsuccess: null }))
        }))
      }))
    }
  }))
});

// Mock de localStorage
export const createMockLocalStorage = () => {
  const store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
    length: 0,
    key: jest.fn()
  };
};
`;
    }

    // Ejecutar migración completa
    async run() {
        console.log('🚀 Iniciando asistente de migración...\n');
        
        await this.createNewStructure();
        await this.generateBaseFiles();
        await this.analyzeMigrationCandidates();
        this.generateMigrationReport();
        
        console.log('\n✅ Migración completada. Revisa el reporte para próximos pasos.');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const projectPath = process.argv[2] || __dirname.replace('\\tools', '');
    const migrationHelper = new MigrationHelper(projectPath);
    migrationHelper.run().catch(console.error);
}

module.exports = MigrationHelper;
