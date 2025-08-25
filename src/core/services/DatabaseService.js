/**
 * DatabaseService - Servicio para operaciones de base de datos
 *
 * Migra la funcionalidad de db-operations.js a la nueva arquitectura:
 * - Inicialización de IndexedDB
 * - Sincronización con Supabase
 * - Gestión de cola de sincronización
 * - Operaciones de backup/restore
 *
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';
import { mostrarMensaje, mostrarResultadoCarga, mostrarAlertaBurbuja } from '../../../js/logs.js';
import { getSupabase } from '../../../js/auth.js';

export class DatabaseService extends BaseService {
  constructor() {
    super('DatabaseService');

    // Configuración de base de datos
    this.dbName = 'ProductosDB';
    this.dbVersion = 1;
    this.dbInventarioName = 'InventarioDB';
    this.dbInventarioVersion = 1;

    // Instancias de bases de datos
    this.db = null;
    this.dbInventario = null;

    // Cola de sincronización
    this.syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');

    // Configuración de suscripciones
    this.subscriptions = new Map();
  }

  /**
     * Inicializar el servicio
     */
  async initialize() {
    try {
      await this.initializeMainDB();
      await this.initializeInventoryDB();
      await this.initializeSubscriptions();

      // Procesar cola de sincronización si hay conexión
      if (navigator.onLine) {
        this.processSyncQueue();
      }

      this.status = 'initialized';
      this.emit('initialized', { service: this.name });

    } catch (error) {
      this.handleError('Error al inicializar DatabaseService', error);
      throw error;
    }
  }

  /**
     * Inicializar base de datos principal de productos
     */
  async initializeMainDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = event => {
        const error = new Error(`Error al abrir la base de datos: ${event.target.error}`);
        this.handleError('Error en inicialización de DB principal', error);
        reject(error);
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        console.log('Base de datos principal abierta exitosamente');
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        this.db = event.target.result;

        // Crear object store para productos
        if (!this.db.objectStoreNames.contains('productos')) {
          const objectStore = this.db.createObjectStore('productos', {
            keyPath: 'codigo'
          });

          // Crear índices
          objectStore.createIndex('codigo', 'codigo', { unique: true });
          objectStore.createIndex('nombre', 'nombre', { unique: false });
          objectStore.createIndex('categoria', 'categoria', { unique: false });
          objectStore.createIndex('marca', 'marca', { unique: false });
          objectStore.createIndex('unidad', 'unidad', { unique: false });
        }

        console.log('Base de datos principal creada/actualizada');
      };
    });
  }

  /**
     * Inicializar base de datos de inventario
     */
  async initializeInventoryDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbInventarioName, this.dbInventarioVersion);

      request.onerror = event => {
        const error = new Error(`Error al abrir DB de inventario: ${event.target.error}`);
        this.handleError('Error en inicialización de DB inventario', error);
        reject(error);
      };

      request.onsuccess = event => {
        this.dbInventario = event.target.result;
        console.log('Base de datos de inventario abierta exitosamente');
        resolve(this.dbInventario);
      };

      request.onupgradeneeded = event => {
        this.dbInventario = event.target.result;

        // Crear object store para inventario
        if (!this.dbInventario.objectStoreNames.contains('inventario')) {
          const objectStore = this.dbInventario.createObjectStore('inventario', {
            keyPath: 'codigo'
          });

          // Crear índices para inventario
          objectStore.createIndex('codigo', 'codigo', { unique: true });
          objectStore.createIndex('cantidad', 'cantidad', { unique: false });
          objectStore.createIndex('fechaActualizacion', 'fechaActualizacion', { unique: false });
        }

        console.log('Base de datos de inventario creada/actualizada');
      };
    });
  }

  /**
     * Agregar item a la cola de sincronización
     */
  addToSyncQueue(data) {
    try {
      // Verificar área_id
      const areaId = localStorage.getItem('area_id');
      if (!areaId) {
        throw new Error('No se encontró el área_id para sincronización');
      }

      // Crear objeto limpio para Supabase
      const dataSupabase = { ...data };

      // Eliminar campos que no existen en Supabase
      if (dataSupabase.areaName) {
        delete dataSupabase.areaName;
      }

      // Asegurar que tenga area_id
      dataSupabase.area_id = dataSupabase.area_id || areaId;

      // Agregar a la cola
      this.syncQueue.push(dataSupabase);
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

      // Procesar inmediatamente si hay conexión
      if (navigator.onLine) {
        this.processSyncQueue();
      }

      this.emit('itemAddedToSyncQueue', { item: dataSupabase });

    } catch (error) {
      this.handleError('Error al agregar a cola de sincronización', error);
      mostrarAlertaBurbuja('Error: No se pudo agregar a la cola de sincronización', 'error');
    }
  }

  /**
     * Procesar cola de sincronización
     */
  async processSyncQueue() {
    if (!navigator.onLine || this.syncQueue.length === 0) {
      return;
    }

    const processedItems = [];

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift();

      try {
        const supabase = await getSupabase();

        // Verificar que el ítem tenga área_id
        if (!item.area_id) {
          console.warn('Item sin area_id, saltando sincronización:', item);
          continue;
        }

        // Sincronizar con Supabase
        const { data, error } = await supabase
          .from('productos')
          .upsert(item);

        if (error) {
          // Si falla, devolver a la cola
          this.syncQueue.unshift(item);
          throw error;
        }

        processedItems.push(item);
        console.log('Item sincronizado:', item.codigo || item.id);

      } catch (error) {
        console.error('Error en sincronización:', error);
        // Reintentar más tarde
        this.syncQueue.unshift(item);
        break;
      }
    }

    // Actualizar localStorage
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

    if (processedItems.length > 0) {
      this.emit('syncQueueProcessed', {
        processedCount: processedItems.length,
        remainingCount: this.syncQueue.length
      });

      mostrarAlertaBurbuja(
        `Sincronización completada: ${processedItems.length} items`,
        'success'
      );
    }
  }

  /**
     * Inicializar suscripciones a cambios en tiempo real
     */
  async initializeSubscriptions() {
    try {
      const supabase = await getSupabase();
      const areaId = localStorage.getItem('area_id');

      if (!areaId) {
        console.warn('No se pudo inicializar suscripciones: área_id no encontrada');
        return;
      }

      // Suscripción a cambios en productos
      const productSubscription = supabase
        .channel('productos_channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'productos',
          filter: `area_id=eq.${areaId}`
        }, (payload) => {
          this.handleProductChange(payload);
        })
        .subscribe();

      // Suscripción a cambios en inventario
      const inventorySubscription = supabase
        .channel('inventario_channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inventario',
          filter: `area_id=eq.${areaId}`
        }, (payload) => {
          this.handleInventoryChange(payload);
        })
        .subscribe();

      this.subscriptions.set('productos', productSubscription);
      this.subscriptions.set('inventario', inventorySubscription);

      console.log('Suscripciones en tiempo real inicializadas');

    } catch (error) {
      this.handleError('Error al inicializar suscripciones', error);
    }
  }

  /**
     * Manejar cambios en productos desde el servidor
     */
  async handleProductChange(payload) {
    try {
      console.log('Cambio en producto detectado:', payload);

      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRecord) {
          await this.updateLocalProduct(newRecord);
          this.emit('productUpdated', { product: newRecord, eventType });
        }
        break;

      case 'DELETE':
        if (oldRecord) {
          await this.deleteLocalProduct(oldRecord.codigo);
          this.emit('productDeleted', { product: oldRecord, eventType });
        }
        break;
      }

    } catch (error) {
      this.handleError('Error al procesar cambio de producto', error);
    }
  }

  /**
     * Manejar cambios en inventario desde el servidor
     */
  async handleInventoryChange(payload) {
    try {
      console.log('Cambio en inventario detectado:', payload);

      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRecord) {
          await this.updateLocalInventory(newRecord);
          this.emit('inventoryUpdated', { inventory: newRecord, eventType });
        }
        break;

      case 'DELETE':
        if (oldRecord) {
          await this.deleteLocalInventory(oldRecord.codigo);
          this.emit('inventoryDeleted', { inventory: oldRecord, eventType });
        }
        break;
      }

    } catch (error) {
      this.handleError('Error al procesar cambio de inventario', error);
    }
  }

  /**
     * Actualizar producto local desde el servidor
     */
  async updateLocalProduct(productData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['productos'], 'readwrite');
      const objectStore = transaction.objectStore('productos');

      const request = objectStore.put(productData);

      request.onsuccess = () => {
        console.log('Producto local actualizado:', productData.codigo);
        resolve(productData);
      };

      request.onerror = () => {
        reject(new Error(`Error al actualizar producto local: ${productData.codigo}`));
      };
    });
  }

  /**
     * Eliminar producto local
     */
  async deleteLocalProduct(codigo) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['productos'], 'readwrite');
      const objectStore = transaction.objectStore('productos');

      const request = objectStore.delete(codigo);

      request.onsuccess = () => {
        console.log('Producto local eliminado:', codigo);
        resolve(codigo);
      };

      request.onerror = () => {
        reject(new Error(`Error al eliminar producto local: ${codigo}`));
      };
    });
  }

  /**
     * Actualizar inventario local desde el servidor
     */
  async updateLocalInventory(inventoryData) {
    return new Promise((resolve, reject) => {
      const transaction = this.dbInventario.transaction(['inventario'], 'readwrite');
      const objectStore = transaction.objectStore('inventario');

      const request = objectStore.put(inventoryData);

      request.onsuccess = () => {
        console.log('Inventario local actualizado:', inventoryData.codigo);
        resolve(inventoryData);
      };

      request.onerror = () => {
        reject(new Error(`Error al actualizar inventario local: ${inventoryData.codigo}`));
      };
    });
  }

  /**
     * Eliminar inventario local
     */
  async deleteLocalInventory(codigo) {
    return new Promise((resolve, reject) => {
      const transaction = this.dbInventario.transaction(['inventario'], 'readwrite');
      const objectStore = transaction.objectStore('inventario');

      const request = objectStore.delete(codigo);

      request.onsuccess = () => {
        console.log('Inventario local eliminado:', codigo);
        resolve(codigo);
      };

      request.onerror = () => {
        reject(new Error(`Error al eliminar inventario local: ${codigo}`));
      };
    });
  }

  /**
     * Resetear base de datos
     */
  async resetDatabase(dbInstance, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log(`Base de datos ${storeName} reseteada exitosamente`);
        mostrarAlertaBurbuja(`Base de datos ${storeName} limpiada`, 'success');
        resolve();
      };

      request.onerror = () => {
        const error = new Error(`Error al resetear base de datos ${storeName}`);
        this.handleError('Error en reset de DB', error);
        reject(error);
      };
    });
  }

  /**
     * Obtener estadísticas de sincronización
     */
  getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      isOnline: navigator.onLine,
      subscriptionsActive: this.subscriptions.size,
      lastSync: localStorage.getItem('lastSyncTime') || null
    };
  }

  /**
     * Cleanup al destruir el servicio
     */
  async destroy() {
    // Cerrar suscripciones
    for (const [name, subscription] of this.subscriptions) {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    }
    this.subscriptions.clear();

    // Cerrar conexiones de base de datos
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (this.dbInventario) {
      this.dbInventario.close();
      this.dbInventario = null;
    }

    await super.destroy();
  }
}

// Crear instancia singleton
export const databaseService = new DatabaseService();

// Backwards compatibility exports
export const db = databaseService.db;
export const dbInventario = databaseService.dbInventario;
export const agregarAColaSincronizacion = (data) => databaseService.addToSyncQueue(data);
export const procesarColaSincronizacion = () => databaseService.processSyncQueue();
export const inicializarDB = () => databaseService.initializeMainDB();
export const inicializarDBInventario = () => databaseService.initializeInventoryDB();
export const inicializarSuscripciones = () => databaseService.initializeSubscriptions();
export const resetearBaseDeDatos = (db, store) => databaseService.resetDatabase(db, store);
