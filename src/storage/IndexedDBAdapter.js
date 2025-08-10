/**
 * IndexedDBAdapter - Abstracción para operaciones con IndexedDB
 * 
 * Proporciona una interfaz uniforme para todas las operaciones
 * con IndexedDB, incluyendo:
 * - Inicialización de bases de datos
 * - Transacciones y operaciones CRUD
 * - Manejo de índices y búsquedas
 * - Migraciones de esquema
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

export class IndexedDBAdapter {
    /**
     * Constructor del adaptador
     * @param {string} dbName - Nombre de la base de datos
     * @param {number} version - Versión de la base de datos
     */
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.stores = new Map();
    }

    /**
     * Inicializar base de datos
     * @param {Object} schema - Esquema de la base de datos
     * @returns {Promise<IDBDatabase>} Instancia de la base de datos
     */
    async initialize(schema) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error(`Error al abrir ${this.dbName}:`, request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log(`Base de datos ${this.dbName} inicializada correctamente`);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.handleUpgrade(schema);
            };
        });
    }

    /**
     * Manejar actualización de esquema
     * @param {Object} schema - Esquema de la base de datos
     */
    handleUpgrade(schema) {
        // Eliminar stores obsoletos
        for (const storeName of this.db.objectStoreNames) {
            if (!schema[storeName]) {
                this.db.deleteObjectStore(storeName);
                console.log(`ObjectStore ${storeName} eliminado`);
            }
        }

        // Crear o actualizar stores
        for (const [storeName, storeConfig] of Object.entries(schema)) {
            if (!this.db.objectStoreNames.contains(storeName)) {
                const store = this.db.createObjectStore(storeName, storeConfig.options);
                
                // Crear índices
                if (storeConfig.indexes) {
                    for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
                        store.createIndex(indexName, indexConfig.keyPath, indexConfig.options);
                    }
                }
                
                console.log(`ObjectStore ${storeName} creado con índices`);
            }
        }
    }

    /**
     * Obtener store para transacciones
     * @param {string} storeName - Nombre del store
     * @param {string} mode - Modo de transacción ('readonly' | 'readwrite')
     * @returns {IDBObjectStore} Store de IndexedDB
     */
    getStore(storeName, mode = 'readonly') {
        if (!this.db) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    /**
     * Operación CREATE - Agregar registro
     * @param {string} storeName - Nombre del store
     * @param {Object} data - Datos a agregar
     * @returns {Promise<any>} Resultado de la operación
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación CREATE/UPDATE - Guardar registro (put)
     * @param {string} storeName - Nombre del store
     * @param {Object} data - Datos a guardar
     * @returns {Promise<any>} Resultado de la operación
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación READ - Obtener registro por clave
     * @param {string} storeName - Nombre del store
     * @param {any} key - Clave del registro
     * @returns {Promise<any>} Registro encontrado
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación READ - Obtener todos los registros
     * @param {string} storeName - Nombre del store
     * @returns {Promise<Array>} Array de registros
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación READ - Buscar registros por índice
     * @param {string} storeName - Nombre del store
     * @param {string} indexName - Nombre del índice
     * @param {any} value - Valor a buscar
     * @returns {Promise<Array>} Array de registros encontrados
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación READ - Buscar con cursor para filtros complejos
     * @param {string} storeName - Nombre del store
     * @param {Function} filterFn - Función de filtro
     * @returns {Promise<Array>} Array de registros filtrados
     */
    async findWithCursor(storeName, filterFn) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const request = store.openCursor();
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (filterFn(cursor.value)) {
                        results.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación UPDATE - Actualizar registro
     * @param {string} storeName - Nombre del store
     * @param {any} key - Clave del registro
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise<any>} Registro actualizado
     */
    async update(storeName, key, updates) {
        return new Promise(async (resolve, reject) => {
            try {
                // Obtener registro actual
                const current = await this.get(storeName, key);
                if (!current) {
                    reject(new Error('Registro no encontrado'));
                    return;
                }

                // Aplicar actualizaciones
                const updated = { ...current, ...updates };
                
                // Guardar registro actualizado
                const result = await this.put(storeName, updated);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Operación DELETE - Eliminar registro
     * @param {string} storeName - Nombre del store
     * @param {any} key - Clave del registro a eliminar
     * @returns {Promise<void>} Resultado de la operación
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Operación DELETE - Limpiar todo el store
     * @param {string} storeName - Nombre del store
     * @returns {Promise<void>} Resultado de la operación
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Eliminar registros por índice
     * @param {string} storeName - Nombre del store
     * @param {string} indexName - Nombre del índice
     * @param {any} value - Valor del índice
     * @returns {Promise<number>} Número de registros eliminados
     */
    async deleteByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const index = store.index(indexName);
            const request = index.openCursor(IDBKeyRange.only(value));
            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Contar registros en un store
     * @param {string} storeName - Nombre del store
     * @returns {Promise<number>} Número de registros
     */
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Ejecutar transacción personalizada
     * @param {Array<string>} storeNames - Nombres de los stores
     * @param {string} mode - Modo de transacción
     * @param {Function} callback - Función a ejecutar en la transacción
     * @returns {Promise<any>} Resultado de la transacción
     */
    async transaction(storeNames, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeNames, mode);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new Error('Transacción abortada'));

            try {
                const stores = storeNames.map(name => transaction.objectStore(name));
                const result = callback(stores, transaction);
                
                // Si el callback devuelve una promesa, manejarla
                if (result instanceof Promise) {
                    result.catch(error => {
                        transaction.abort();
                        reject(error);
                    });
                }
            } catch (error) {
                transaction.abort();
                reject(error);
            }
        });
    }

    /**
     * Cerrar conexión a la base de datos
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log(`Base de datos ${this.dbName} cerrada`);
        }
    }

    /**
     * Verificar si la base de datos está abierta
     * @returns {boolean} true si está abierta
     */
    isOpen() {
        return this.db !== null;
    }

    /**
     * Obtener información sobre la base de datos
     * @returns {Object} Información de la base de datos
     */
    getInfo() {
        if (!this.db) return null;

        return {
            name: this.db.name,
            version: this.db.version,
            objectStoreNames: Array.from(this.db.objectStoreNames)
        };
    }
}
