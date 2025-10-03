/**
 * BatchService - Servicio para gestión avanzada de lotes
 * 
 * Este servicio maneja todas las operaciones relacionadas con:
 * - Productos subproducto (relaciones primario/derivado)
 * - Precios por kilo en IndexedDB
 * - Inventario de lotes en Supabase
 * - Sincronización y backup de datos
 * - Exportación de datos (JSON/CSV/XLSX)
 * 
 * @extends BaseService
 */

import { BaseService } from './BaseService.js';

export class BatchService extends BaseService {
    constructor() {
        super('BatchService');
        this.dbName = 'LotesAvanzadoDB';
        this.dbVersion = 1;
        this.storeName = 'precios_kilo';
    }

    /**
     * Inicializa el servicio y verifica conectividad
     */
    async initialize() {
        try {
            this.log('Inicializando BatchService...');
            
            // Verificar que tenemos acceso a Supabase
            const supabase = await this.getSupabase();
            if (!supabase) {
                this.warn('Supabase no disponible - funcionalidad limitada');
                return false;
            }

            // Verificar conectividad
            const isConnected = await this.verificarConectividad();
            if (isConnected) {
                this.log('✅ BatchService inicializado correctamente');
            } else {
                this.warn('⚠️ BatchService inicializado sin conexión a Supabase');
            }

            return true;
        } catch (error) {
            this.error('Error al inicializar BatchService:', error);
            return false;
        }
    }

    /**
     * Obtiene el cliente de Supabase desde el repositorio
     */
    async getSupabase() {
        try {
            // Intentar obtener desde el repositorio global
            if (window.repositoryManager) {
                const dbRepo = window.repositoryManager.get('database');
                return dbRepo?.supabase || null;
            }

            // Fallback: importar directamente (legacy)
            const { supabase } = await import('../../../js/db-operations.js');
            return supabase;
        } catch (error) {
            this.error('No se pudo obtener Supabase:', error);
            return null;
        }
    }

    // ==========================================
    // FUNCIONES DE PRODUCTOS SUBPRODUCTO
    // ==========================================

    /**
     * Obtiene todos los productos subproducto desde Supabase
     * @returns {Promise<Array>} Lista de productos subproducto
     */
    async obtenerProductosSubproducto() {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const { data, error } = await supabase
                .from('productos_subproducto')
                .select('*');
            
            if (error) {
                throw error;
            }
            
            this.log(`Obtenidos ${data?.length || 0} productos subproducto`);
            return data || [];
        } catch (error) {
            this.error('Error al obtener productos subproducto:', error);
            throw error;
        }
    }

    /**
     * Busca un producto por código/PLU
     * @param {string} codigo - Código del producto
     * @returns {Promise<Object|null>} Producto encontrado o null
     */
    async buscarProductoPorCodigo(codigo) {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('codigo', codigo)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            if (data) {
                this.log(`Producto encontrado: ${codigo}`);
            } else {
                this.warn(`Producto no encontrado: ${codigo}`);
            }
            
            return data;
        } catch (error) {
            this.error('Error al buscar producto por código:', error);
            return null;
        }
    }

    /**
     * Obtiene el producto primario relacionado con un subproducto
     * @param {number} subproductoId - ID del subproducto
     * @returns {Promise<Object|null>} Producto primario o null
     */
    async obtenerProductoPrimario(subproductoId) {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const { data, error } = await supabase
                .from('productos_subproducto')
                .select(`
                    primarioProductID,
                    productos:primarioProductID (
                        codigo,
                        nombre,
                        marca,
                        unidad,
                        categoria
                    )
                `)
                .eq('subProductoID', subproductoId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return data?.productos || null;
        } catch (error) {
            this.error('Error al obtener producto primario:', error);
            return null;
        }
    }

    // ==========================================
    // FUNCIONES DE INDEXEDDB (PRECIOS)
    // ==========================================

    /**
     * Abre una conexión a IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => resolve(event.target.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'plu' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    this.log('IndexedDB store creado: ' + this.storeName);
                }
            };
        });
    }

    /**
     * Guarda precio por kilo en IndexedDB
     * @param {string} plu - PLU del producto
     * @param {number} precioKilo - Precio por kilo
     * @param {Object} productoInfo - Información del producto
     * @returns {Promise<Object>} Registro guardado
     */
    async guardarPrecioKiloLocal(plu, precioKilo, productoInfo) {
        try {
            const db = await this.openDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                const registro = {
                    plu: plu,
                    precioKilo: precioKilo,
                    productoInfo: productoInfo,
                    timestamp: new Date().toISOString()
                };
                
                const addRequest = store.put(registro);
                
                addRequest.onsuccess = () => {
                    this.log(`Precio por kilo guardado: ${plu} = $${precioKilo}/kg`);
                    db.close();
                    resolve(registro);
                };
                
                addRequest.onerror = () => {
                    db.close();
                    reject(addRequest.error);
                };
            });
        } catch (error) {
            this.error('Error al guardar precio por kilo local:', error);
            throw error;
        }
    }

    /**
     * Obtiene precio por kilo desde IndexedDB
     * @param {string} plu - PLU del producto
     * @returns {Promise<Object|null>} Registro de precio o null
     */
    async obtenerPrecioKiloLocal(plu) {
        try {
            const db = await this.openDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                
                const getRequest = store.get(plu);
                
                getRequest.onsuccess = () => {
                    db.close();
                    const result = getRequest.result;
                    if (result) {
                        this.log(`Precio por kilo encontrado: ${plu}`);
                    }
                    resolve(result);
                };
                
                getRequest.onerror = () => {
                    db.close();
                    reject(getRequest.error);
                };
            });
        } catch (error) {
            this.error('Error al obtener precio por kilo local:', error);
            return null;
        }
    }

    /**
     * Limpia datos locales antiguos de IndexedDB
     * @param {number} diasAntiguedad - Días de antigüedad para eliminar
     * @returns {Promise<number>} Cantidad de registros eliminados
     */
    async limpiarDatosLocalesAntiguos(diasAntiguedad = 30) {
        try {
            const db = await this.openDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('timestamp');
                
                const fechaLimite = new Date();
                fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
                
                const range = IDBKeyRange.upperBound(fechaLimite.toISOString());
                const request = index.openCursor(range);
                
                let eliminados = 0;
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        eliminados++;
                        cursor.continue();
                    } else {
                        db.close();
                        this.log(`Limpieza completada: ${eliminados} registros eliminados`);
                        resolve(eliminados);
                    }
                };
                
                request.onerror = () => {
                    db.close();
                    reject(request.error);
                };
            });
        } catch (error) {
            this.error('Error al limpiar datos locales antiguos:', error);
            throw error;
        }
    }

    // ==========================================
    // FUNCIONES DE INVENTARIO
    // ==========================================

    /**
     * Guarda un lote de inventario en Supabase
     * @param {Object} loteData - Datos del lote
     * @returns {Promise<Object>} Lote guardado
     */
    async guardarLoteInventario(loteData) {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const { data, error } = await supabase
                .from('inventario')
                .insert(loteData);
            
            if (error) {
                throw error;
            }
            
            this.log('Lote de inventario guardado');
            return data;
        } catch (error) {
            this.error('Error al guardar lote de inventario:', error);
            throw error;
        }
    }

    // ==========================================
    // FUNCIONES DE SINCRONIZACIÓN
    // ==========================================

    /**
     * Sincroniza datos de lotes con Supabase
     * @returns {Promise<Map>} Diccionario de relaciones subproducto->primario
     */
    async sincronizarDatosLotes() {
        try {
            const subproductos = await this.obtenerProductosSubproducto();
            
            const diccionario = new Map();
            subproductos.forEach(item => {
                diccionario.set(item.subProductoID, item.primarioProductID);
            });
            
            this.log(`Diccionario de lotes sincronizado: ${diccionario.size} relaciones`);
            return diccionario;
            
        } catch (error) {
            this.error('Error al sincronizar datos de lotes:', error);
            throw error;
        }
    }

    /**
     * Verifica conectividad con Supabase
     * @returns {Promise<boolean>} True si hay conexión
     */
    async verificarConectividad() {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                return false;
            }

            const { data, error } = await supabase
                .from('productos')
                .select('count')
                .limit(1);
            
            return !error;
        } catch (error) {
            this.warn('Error de conectividad:', error);
            return false;
        }
    }

    // ==========================================
    // FUNCIONES DE ESTADÍSTICAS
    // ==========================================

    /**
     * Obtiene estadísticas de lotes
     * @returns {Promise<Object>} Estadísticas
     */
    async obtenerEstadisticasLotes() {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const [productosCount, subproductosCount, inventarioCount] = await Promise.all([
                supabase.from('productos').select('id', { count: 'exact' }),
                supabase.from('productos_subproducto').select('id', { count: 'exact' }),
                supabase.from('inventario').select('id', { count: 'exact' })
            ]);
            
            const stats = {
                totalProductos: productosCount.count || 0,
                totalSubproductos: subproductosCount.count || 0,
                totalInventario: inventarioCount.count || 0
            };

            this.log('Estadísticas obtenidas:', stats);
            return stats;
        } catch (error) {
            this.error('Error al obtener estadísticas:', error);
            return {
                totalProductos: 0,
                totalSubproductos: 0,
                totalInventario: 0
            };
        }
    }

    // ==========================================
    // FUNCIONES DE EXPORTACIÓN
    // ==========================================

    /**
     * Exporta datos de lotes
     * @param {string} formato - 'json', 'csv' o 'xlsx'
     * @returns {Promise<*>} Datos exportados
     */
    async exportarDatosLotes(formato = 'json') {
        try {
            const supabase = await this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase no disponible');
            }

            const { data, error } = await supabase
                .from('inventario')
                .select(`
                    *,
                    productos (
                        codigo,
                        nombre,
                        marca,
                        categoria
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw error;
            }
            
            this.log(`Exportando ${data?.length || 0} registros en formato ${formato}`);

            switch (formato) {
                case 'csv':
                    return this._convertirACSV(data);
                case 'xlsx':
                    return this._convertirAXLSX(data);
                default:
                    return data;
            }
        } catch (error) {
            this.error('Error al exportar datos:', error);
            throw error;
        }
    }

    /**
     * Convierte datos a formato CSV
     * @private
     */
    _convertirACSV(data) {
        const headers = ['Código', 'Nombre', 'Marca', 'Cantidad', 'Unidad', 'Fecha', 'Ubicación'];
        const rows = data.map(item => [
            item.productos?.codigo || '',
            item.productos?.nombre || '',
            item.productos?.marca || '',
            item.cantidad || '',
            item.productos?.unidad || '',
            new Date(item.created_at).toLocaleDateString(),
            item.ubicacion || ''
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Convierte datos a formato XLSX (requiere biblioteca externa)
     * @private
     */
    _convertirAXLSX(data) {
        this.warn('Conversión a XLSX no implementada aún');
        return data;
    }

    // ==========================================
    // FUNCIONES DE BACKUP
    // ==========================================

    /**
     * Crea un backup de lotes en localStorage
     * @returns {Promise<string>} Timestamp del backup
     */
    async crearBackupLotes() {
        try {
            const timestamp = new Date().toISOString();
            const datos = await this.exportarDatosLotes();
            
            localStorage.setItem(`backup_lotes_${timestamp}`, JSON.stringify(datos));
            
            this.log('Backup de lotes creado:', timestamp);
            return timestamp;
        } catch (error) {
            this.error('Error al crear backup:', error);
            throw error;
        }
    }

    /**
     * Restaura un backup de lotes desde localStorage
     * @param {string} timestamp - Timestamp del backup
     * @returns {Promise<Array>} Datos restaurados
     */
    async restaurarBackupLotes(timestamp) {
        try {
            const backupData = localStorage.getItem(`backup_lotes_${timestamp}`);
            
            if (!backupData) {
                throw new Error('Backup no encontrado');
            }
            
            const datos = JSON.parse(backupData);
            this.log(`Backup restaurado: ${datos.length} registros`);
            
            return datos;
        } catch (error) {
            this.error('Error al restaurar backup:', error);
            throw error;
        }
    }

    /**
     * Limpia backups antiguos de localStorage
     * @param {number} diasAntiguedad - Días de antigüedad
     * @returns {Promise<number>} Cantidad de backups eliminados
     */
    async limpiarBackupsAntiguos(diasAntiguedad = 7) {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => key.startsWith('backup_lotes_'));
            
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
            
            let eliminados = 0;
            
            backupKeys.forEach(key => {
                const timestamp = key.replace('backup_lotes_', '');
                const fechaBackup = new Date(timestamp);
                
                if (fechaBackup < fechaLimite) {
                    localStorage.removeItem(key);
                    eliminados++;
                }
            });
            
            this.log(`Backups limpiados: ${eliminados} archivos eliminados`);
            return eliminados;
        } catch (error) {
            this.error('Error al limpiar backups antiguos:', error);
            throw error;
        }
    }
}

// Crear instancia singleton
export const batchService = new BatchService();
