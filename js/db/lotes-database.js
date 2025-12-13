// Funciones específicas para el manejo de datos de lotes avanzado en Supabase

// Importar configuración de Supabase
import { getSupabase } from '../auth/auth.js';

// Función para obtener productos subproducto desde Supabase
export async function obtenerProductosSubproducto() {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('productos_subproducto')
            .select('*');
        
        if (error) {
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Error al obtener productos subproducto:', error);
        throw error;
    }
}

// Función para buscar producto por código/PLU
export async function buscarProductoPorCodigo(codigo) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .eq('codigo', codigo)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 es "no rows returned"
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error al buscar producto por código:', error);
        return null;
    }
}

// Función para guardar información de precio por kilo en IndexedDB
export async function guardarPrecioKiloLocal(plu, precioKilo, productoInfo) {
    try {
        // Abrir conexión a IndexedDB
        const request = indexedDB.open('LotesAvanzadoDB', 1);
        
        return new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['precios_kilo'], 'readwrite');
                const store = transaction.objectStore('precios_kilo');
                
                const registro = {
                    plu: plu,
                    precioKilo: precioKilo,
                    productoInfo: productoInfo,
                    timestamp: new Date().toISOString()
                };
                
                const addRequest = store.put(registro);
                
                addRequest.onsuccess = () => {
                    console.log('Precio por kilo guardado localmente:', registro);
                    resolve(registro);
                };
                
                addRequest.onerror = () => reject(addRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('precios_kilo')) {
                    const store = db.createObjectStore('precios_kilo', { keyPath: 'plu' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    } catch (error) {
        console.error('Error al guardar precio por kilo local:', error);
        throw error;
    }
}

// Función para obtener precio por kilo desde IndexedDB
export async function obtenerPrecioKiloLocal(plu) {
    try {
        const request = indexedDB.open('LotesAvanzadoDB', 1);
        
        return new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['precios_kilo'], 'readonly');
                const store = transaction.objectStore('precios_kilo');
                
                const getRequest = store.get(plu);
                
                getRequest.onsuccess = () => {
                    resolve(getRequest.result);
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('precios_kilo')) {
                    const store = db.createObjectStore('precios_kilo', { keyPath: 'plu' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    } catch (error) {
        console.error('Error al obtener precio por kilo local:', error);
        return null;
    }
}

// Función para guardar lote de inventario en Supabase
export async function guardarLoteInventario(loteData) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('inventario')
            .insert(loteData);
        
        if (error) {
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error al guardar lote de inventario:', error);
        throw error;
    }
}

// Función para obtener productos primarios relacionados
export async function obtenerProductoPrimario(subproductoId) {
    try {
        const supabase = await getSupabase();
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
        console.error('Error al obtener producto primario:', error);
        return null;
    }
}

// Función para sincronizar datos de lotes con Supabase
export async function sincronizarDatosLotes() {
    try {
        // Obtener productos subproducto
        const subproductos = await obtenerProductosSubproducto();
        
        // Crear diccionario para uso local
        const diccionario = new Map();
        subproductos.forEach(item => {
            diccionario.set(item.subProductoID, item.primarioProductID);
        });
        
        console.log(`Diccionario de lotes sincronizado: ${diccionario.size} relaciones`);
        return diccionario;
        
    } catch (error) {
        console.error('Error al sincronizar datos de lotes:', error);
        throw error;
    }
}

// Función para limpiar datos locales antiguos
export async function limpiarDatosLocalesAntiguos(diasAntiguedad = 30) {
    try {
        const request = indexedDB.open('LotesAvanzadoDB', 1);
        
        return new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['precios_kilo'], 'readwrite');
                const store = transaction.objectStore('precios_kilo');
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
                        console.log(`Limpieza completada: ${eliminados} registros eliminados`);
                        resolve(eliminados);
                    }
                };
                
                request.onerror = () => reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error al limpiar datos locales antiguos:', error);
        throw error;
    }
}

// Función para verificar conectividad con Supabase
export async function verificarConectividad() {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('productos')
            .select('count')
            .limit(1);
        
        return !error;
    } catch (error) {
        console.error('Error de conectividad:', error);
        return false;
    }
}

// Función para obtener estadísticas de lotes
export async function obtenerEstadisticasLotes() {
    try {
        const supabase = await getSupabase();
        const [productosCount, subproductosCount, inventarioCount] = await Promise.all([
            supabase.from('productos').select('id', { count: 'exact' }),
            supabase.from('productos_subproducto').select('id', { count: 'exact' }),
            supabase.from('inventario').select('id', { count: 'exact' })
        ]);
        
        return {
            totalProductos: productosCount.count || 0,
            totalSubproductos: subproductosCount.count || 0,
            totalInventario: inventarioCount.count || 0
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            totalProductos: 0,
            totalSubproductos: 0,
            totalInventario: 0
        };
    }
}

// Función para exportar datos de lotes
export async function exportarDatosLotes(formato = 'json') {
    try {
        const supabase = await getSupabase();
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
        
        switch (formato) {
            case 'csv':
                return convertirACSV(data);
            case 'xlsx':
                return convertirAXLSX(data);
            default:
                return data;
        }
    } catch (error) {
        console.error('Error al exportar datos:', error);
        throw error;
    }
}

// Función auxiliar para convertir a CSV
function convertirACSV(data) {
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

// Función auxiliar para convertir a XLSX (requiere biblioteca externa)
function convertirAXLSX(data) {
    // Aquí implementarías la conversión a XLSX usando una biblioteca como xlsx
    console.log('Conversión a XLSX no implementada aún');
    return data;
}

// Función para backup automático
export async function crearBackupLotes() {
    try {
        const timestamp = new Date().toISOString();
        const datos = await exportarDatosLotes();
        
        // Guardar en localStorage como backup temporal
        localStorage.setItem(`backup_lotes_${timestamp}`, JSON.stringify(datos));
        
        console.log('Backup de lotes creado:', timestamp);
        return timestamp;
    } catch (error) {
        console.error('Error al crear backup:', error);
        throw error;
    }
}

// Función para restaurar desde backup
export async function restaurarBackupLotes(timestamp) {
    try {
        const backupData = localStorage.getItem(`backup_lotes_${timestamp}`);
        
        if (!backupData) {
            throw new Error('Backup no encontrado');
        }
        
        const datos = JSON.parse(backupData);
        console.log('Backup restaurado:', datos);
        
        return datos;
    } catch (error) {
        console.error('Error al restaurar backup:', error);
        throw error;
    }
}

// Función para limpiar backups antiguos
export async function limpiarBackupsAntiguos(diasAntiguedad = 7) {
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
        
        console.log(`Backups limpiados: ${eliminados} archivos eliminados`);
        return eliminados;
    } catch (error) {
        console.error('Error al limpiar backups antiguos:', error);
        throw error;
    }
}
