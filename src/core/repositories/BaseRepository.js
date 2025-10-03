/**
 * BaseRepository - Clase base abstracta para todos los repositorios
 * 
 * Proporciona funcionalidad común para acceso a datos:
 * - Gestión de conexiones IndexedDB y Supabase
 * - Operaciones CRUD base
 * - Sistema de sincronización
 * - Manejo de errores
 * - Cache y optimizaciones
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

// Dynamic imports para evitar dependencias circulares
// getSupabase y mostrarAlertaBurbuja se importarán cuando se necesiten

export class BaseRepository {
    /**
     * Constructor del repositorio base
     * @param {string} tableName - Nombre de la tabla en Supabase
     * @param {string} localStoreName - Nombre del store en IndexedDB
     */
    constructor(tableName, localStoreName) {
        if (new.target === BaseRepository) {
            throw new Error("BaseRepository es una clase abstracta y no puede ser instanciada directamente");
        }
        
        this.tableName = tableName;
        this.localStoreName = localStoreName;
        this.db = null;
        this.supabase = null;
        this.syncQueue = JSON.parse(localStorage.getItem(`syncQueue_${this.localStoreName}`) || '[]');
    }

    /**
     * Inicializar conexión a IndexedDB
     * @abstract
     */
    async initializeDatabase() {
        throw new Error("initializeDatabase() debe ser implementado por la clase hija");
    }

    /**
     * Obtener cliente de Supabase
     * @returns {Promise<Object>} Cliente de Supabase
     */
    async getSupabaseClient() {
        if (!this.supabase) {
            const { getSupabase } = await import('../../../js/auth.js');
            this.supabase = await getSupabase();
        }
        return this.supabase;
    }

    /**
     * Operación CREATE - Crear nuevo registro
     * @param {Object} data - Datos a crear
     * @returns {Promise<Object>} Registro creado
     */
    async create(data) {
        try {
            // Validar datos
            this.validateData(data);
            
            // Intentar crear en Supabase primero
            if (navigator.onLine) {
                const supabase = await this.getSupabaseClient();
                const { data: created, error } = await supabase
                    .from(this.tableName)
                    .insert(data)
                    .select()
                    .single();

                if (error) throw error;

                // Guardar en IndexedDB con ID permanente
                await this.saveToIndexedDB({ ...created, is_temp_id: false });
                return created;
            } else {
                // Crear offline con ID temporal
                const tempData = {
                    ...data,
                    id: this.generateTempId(),
                    is_temp_id: true
                };
                
                await this.saveToIndexedDB(tempData);
                this.addToSyncQueue({ type: 'create', payload: data });
                return tempData;
            }
        } catch (error) {
            console.error(`Error creating in ${this.tableName}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Operación READ - Obtener registros
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Array de registros
     */
    async findAll(filters = {}) {
        try {
            // Primero intentar desde IndexedDB (cache local)
            const localData = await this.getFromIndexedDB(filters);
            
            // Si estamos online, sincronizar con Supabase
            if (navigator.onLine) {
                await this.syncFromSupabase(filters);
                // Obtener datos actualizados después de sincronización
                return await this.getFromIndexedDB(filters);
            }
            
            return localData;
        } catch (error) {
            console.error(`Error finding all in ${this.tableName}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Operación READ - Obtener registro por ID
     * @param {string} id - ID del registro
     * @returns {Promise<Object|null>} Registro encontrado o null
     */
    async findById(id) {
        try {
            // Buscar primero en IndexedDB
            const localData = await this.getFromIndexedDBById(id);
            
            if (localData) {
                return localData;
            }

            // Si no está local y estamos online, buscar en Supabase
            if (navigator.onLine) {
                const supabase = await this.getSupabaseClient();
                const { data, error } = await supabase
                    .from(this.tableName)
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                
                if (data) {
                    await this.saveToIndexedDB({ ...data, is_temp_id: false });
                    return data;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error finding by ID in ${this.tableName}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Operación UPDATE - Actualizar registro
     * @param {string} id - ID del registro
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Registro actualizado
     */
    async update(id, data) {
        try {
            this.validateData(data);

            if (navigator.onLine) {
                const supabase = await this.getSupabaseClient();
                const { data: updated, error } = await supabase
                    .from(this.tableName)
                    .update(data)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;

                await this.updateInIndexedDB(id, { ...updated, is_temp_id: false });
                return updated;
            } else {
                // Actualizar offline
                await this.updateInIndexedDB(id, data);
                this.addToSyncQueue({ type: 'update', payload: { id, ...data } });
                return { id, ...data };
            }
        } catch (error) {
            console.error(`Error updating in ${this.tableName}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Operación DELETE - Eliminar registro
     * @param {string} id - ID del registro a eliminar
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async delete(id) {
        try {
            if (navigator.onLine) {
                const supabase = await this.getSupabaseClient();
                const { error } = await supabase
                    .from(this.tableName)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                this.addToSyncQueue({ type: 'delete', payload: { id } });
            }

            await this.deleteFromIndexedDB(id);
            return true;
        } catch (error) {
            console.error(`Error deleting from ${this.tableName}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Sincronizar con Supabase
     * @param {Object} filters - Filtros para sincronización
     */
    async syncFromSupabase(filters = {}) {
        try {
            const supabase = await this.getSupabaseClient();
            const query = supabase.from(this.tableName).select('*');
            
            // Aplicar filtros específicos del repositorio
            this.applyFilters(query, filters);
            
            const { data, error } = await query;
            if (error) throw error;

            // Limpiar datos locales del área/filtros específicos
            await this.clearLocalData(filters);
            
            // Insertar datos sincronizados
            for (const item of data || []) {
                await this.saveToIndexedDB({ ...item, is_temp_id: false });
            }

            console.log(`${data?.length || 0} registros sincronizados desde ${this.tableName}`);
        } catch (error) {
            console.error(`Error syncing from Supabase ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Procesar cola de sincronización
     */
    async processSyncQueue() {
        if (!navigator.onLine || this.syncQueue.length === 0) return;

        while (this.syncQueue.length > 0) {
            const item = this.syncQueue.shift();
            try {
                await this.processSyncItem(item);
            } catch (error) {
                console.error(`Error processing sync item:`, error);
                // Reinsertar el item si falla
                this.syncQueue.unshift(item);
                break;
            }
        }

        this.saveSyncQueue();
    }

    /**
     * Procesar un item de la cola de sincronización
     * @param {Object} item - Item a sincronizar
     */
    async processSyncItem(item) {
        const supabase = await this.getSupabaseClient();
        
        switch (item.type) {
            case 'create':
                const { data: created, error: createError } = await supabase
                    .from(this.tableName)
                    .insert(item.payload)
                    .select()
                    .single();
                
                if (createError) throw createError;
                
                // Actualizar IndexedDB con ID real
                await this.replaceInIndexedDB(item.payload.id, created);
                break;

            case 'update':
                const { data: updated, error: updateError } = await supabase
                    .from(this.tableName)
                    .update(item.payload)
                    .eq('id', item.payload.id)
                    .select()
                    .single();
                
                if (updateError) throw updateError;
                
                await this.updateInIndexedDB(item.payload.id, updated);
                break;

            case 'delete':
                const { error: deleteError } = await supabase
                    .from(this.tableName)
                    .delete()
                    .eq('id', item.payload.id);
                
                if (deleteError) throw deleteError;
                break;
        }
    }

    // ========================================
    // MÉTODOS ABSTRACTOS (deben implementarse)
    // ========================================

    /**
     * Aplicar filtros específicos a la query
     * @abstract
     * @param {Object} query - Query de Supabase
     * @param {Object} filters - Filtros a aplicar
     */
    applyFilters(query, filters) {
        // Implementar en clase hija
    }

    /**
     * Validar datos antes de operaciones
     * @abstract
     * @param {Object} data - Datos a validar
     */
    validateData(data) {
        // Implementar en clase hija
    }

    // ========================================
    // MÉTODOS DE INDEXEDDB (deben implementarse)
    // ========================================

    async saveToIndexedDB(data) {
        throw new Error("saveToIndexedDB() debe ser implementado por la clase hija");
    }

    async getFromIndexedDB(filters) {
        throw new Error("getFromIndexedDB() debe ser implementado por la clase hija");
    }

    async getFromIndexedDBById(id) {
        throw new Error("getFromIndexedDBById() debe ser implementado por la clase hija");
    }

    async updateInIndexedDB(id, data) {
        throw new Error("updateInIndexedDB() debe ser implementado por la clase hija");
    }

    async deleteFromIndexedDB(id) {
        throw new Error("deleteFromIndexedDB() debe ser implementado por la clase hija");
    }

    async clearLocalData(filters) {
        throw new Error("clearLocalData() debe ser implementado por la clase hija");
    }

    async replaceInIndexedDB(tempId, realData) {
        throw new Error("replaceInIndexedDB() debe ser implementado por la clase hija");
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    /**
     * Generar ID temporal
     * @returns {string} ID temporal único
     */
    generateTempId() {
        return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Agregar item a cola de sincronización
     * @param {Object} item - Item a agregar
     */
    addToSyncQueue(item) {
        this.syncQueue.push(item);
        this.saveSyncQueue();
        
        // Procesar cola si estamos online
        if (navigator.onLine) {
            this.processSyncQueue();
        }
    }

    /**
     * Guardar cola de sincronización en localStorage
     */
    saveSyncQueue() {
        localStorage.setItem(`syncQueue_${this.localStoreName}`, JSON.stringify(this.syncQueue));
    }

    /**
     * Obtener ID del área actual
     * @returns {string|null} ID del área
     */
    getCurrentAreaId() {
        return localStorage.getItem('area_id');
    }

    /**
     * Obtener ID del usuario actual
     * @returns {string|null} ID del usuario
     */
    getCurrentUserId() {
        return localStorage.getItem('usuario_id');
    }

    /**
     * Manejar errores de manera consistente
     * @param {Error} error - Error a manejar
     * @returns {Error} Error procesado
     */
    handleError(error) {
        if (error.code === 'PGRST301') {
            // Error de autenticación
            if (window.Swal) {
                window.Swal.fire({
                    icon: 'error',
                    text: "Sesión expirada. Por favor, inicie sesión nuevamente.",
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        } else if (error.code === 'PGRST116') {
            // No se encontró registro
            return error; // No mostrar alerta para este caso
        } else {
            if (window.Swal) {
                window.Swal.fire({
                    icon: 'error',
                    text: `Error en ${this.tableName}: ${error.message}`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        }
        
        return error;
    }
}
