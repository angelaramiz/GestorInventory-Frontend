/**
 * EntryManagementService - Servicio para gestión de entradas de inventario
 * 
 * Gestiona la lógica de negocio para registro de entradas:
 * - Búsqueda de productos
 * - Registro de entradas
 * - Actualización de inventario
 * - Validación de datos
 * 
 * @class EntryManagementService
 * @version 4.0.0
 * @since 2025-10-04
 */

import { DatabaseService } from './DatabaseService.js';
import { 
    agregarRegistroEntrada, 
    cargarEntradasEnTabla, 
    sincronizarEntradasDesdeSupabase, 
    eliminarRegistroEntrada, 
    inicializarDBEntradas 
} from '../../../js/db-operations.js';

export class EntryManagementService {
    constructor() {
        this.productoSeleccionado = null;
        this.databaseService = new DatabaseService();
    }

    /**
     * Inicializa el servicio de entradas
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await inicializarDBEntradas();
            console.log('✅ EntryManagementService inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar EntryManagementService:', error);
            throw error;
        }
    }

    /**
     * Busca un producto por código, nombre o marca
     * @async
     * @param {string} termino - Término de búsqueda
     * @param {string} tipoBusqueda - Tipo: 'codigo', 'nombre', 'marca'
     * @returns {Promise<Object|null>} Producto encontrado o null
     */
    async searchProduct(termino, tipoBusqueda = 'codigo') {
        try {
            const db = await this.databaseService.getDB();
            
            if (!db) {
                throw new Error("Base de datos no inicializada");
            }

            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");

            return new Promise((resolve, reject) => {
                let request;

                switch (tipoBusqueda) {
                    case 'codigo':
                        const index = objectStore.index("codigo");
                        request = index.get(termino);
                        break;
                    case 'nombre':
                        const indexNombre = objectStore.index("nombre");
                        request = indexNombre.getAll();
                        break;
                    case 'marca':
                        const indexMarca = objectStore.index("marca");
                        request = indexMarca.getAll();
                        break;
                    default:
                        reject(new Error("Tipo de búsqueda no válido"));
                        return;
                }

                request.onsuccess = (event) => {
                    let resultado = event.target.result;

                    if (tipoBusqueda === 'nombre' || tipoBusqueda === 'marca') {
                        // Filtrar resultados para búsquedas por nombre o marca
                        resultado = resultado.filter(producto => {
                            const campo = tipoBusqueda === 'nombre' ? producto.nombre : producto.marca;
                            return campo && campo.toLowerCase().includes(termino.toLowerCase());
                        });

                        // Devolver el primer resultado encontrado o null
                        resultado = resultado.length > 0 ? resultado[0] : null;
                    }

                    resolve(resultado);
                };

                request.onerror = (event) => {
                    console.error(`Error al buscar producto por ${tipoBusqueda}:`, event.target.error);
                    reject(event.target.error);
                };
            });

        } catch (error) {
            console.error("Error en searchProduct:", error);
            throw error;
        }
    }

    /**
     * Selecciona un producto para entrada
     * @param {Object} producto - Producto a seleccionar
     */
    selectProduct(producto) {
        this.productoSeleccionado = producto;
    }

    /**
     * Limpia la selección de producto
     */
    clearSelection() {
        this.productoSeleccionado = null;
    }

    /**
     * Obtiene el producto actualmente seleccionado
     * @returns {Object|null}
     */
    getSelectedProduct() {
        return this.productoSeleccionado;
    }

    /**
     * Valida los datos de una entrada
     * @param {Object} entryData - Datos de la entrada
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateEntry(entryData) {
        const errors = [];

        if (!this.productoSeleccionado) {
            errors.push("No hay producto seleccionado");
        }

        if (!entryData.cantidad || isNaN(entryData.cantidad) || parseFloat(entryData.cantidad) <= 0) {
            errors.push("Cantidad inválida");
        }

        if (!entryData.fecha_entrada) {
            errors.push("Fecha de entrada requerida");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Registra una nueva entrada de producto
     * @async
     * @param {Object} entryData - Datos de la entrada
     * @returns {Promise<Object|null>} Entrada registrada o null
     */
    async registerEntry(entryData) {
        try {
            if (!this.productoSeleccionado) {
                throw new Error("No hay producto seleccionado");
            }

            // Validar datos
            const validation = this.validateEntry(entryData);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            // Preparar datos completos de la entrada
            const entradaCompleta = {
                codigo: this.productoSeleccionado.codigo,
                nombre: this.productoSeleccionado.nombre,
                marca: this.productoSeleccionado.marca,
                categoria: this.productoSeleccionado.categoria,
                unidad: this.productoSeleccionado.unidad,
                cantidad: parseFloat(entryData.cantidad),
                fecha_entrada: entryData.fecha_entrada,
                comentarios: entryData.comentarios || '',
                producto_id: this.productoSeleccionado.id || null
            };

            // Registrar la entrada
            const entradaRegistrada = await agregarRegistroEntrada(entradaCompleta);

            if (entradaRegistrada) {
                this.clearSelection();
                return entradaRegistrada;
            }

            return null;

        } catch (error) {
            console.error("Error al registrar entrada:", error);
            throw error;
        }
    }

    /**
     * Carga todas las entradas con filtros opcionales
     * @async
     * @param {Object} filtros - Filtros a aplicar
     * @returns {Promise<Array>} Array de entradas
     */
    async loadEntries(filtros = {}) {
        try {
            const entradas = await cargarEntradasEnTabla(filtros);
            return entradas || [];
        } catch (error) {
            console.error("Error al cargar entradas:", error);
            throw error;
        }
    }

    /**
     * Elimina una entrada por su ID
     * @async
     * @param {number} entradaId - ID de la entrada
     * @returns {Promise<boolean>}
     */
    async deleteEntry(entradaId) {
        try {
            await eliminarRegistroEntrada(entradaId);
            return true;
        } catch (error) {
            console.error("Error al eliminar entrada:", error);
            throw error;
        }
    }

    /**
     * Sincroniza entradas desde Supabase
     * @async
     * @returns {Promise<void>}
     */
    async syncEntries() {
        try {
            await sincronizarEntradasDesdeSupabase();
        } catch (error) {
            console.error("Error al sincronizar entradas:", error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de entradas
     * @async
     * @param {Object} filtros - Filtros opcionales
     * @returns {Promise<Object>} Estadísticas
     */
    async getStatistics(filtros = {}) {
        try {
            const entradas = await this.loadEntries(filtros);
            
            const stats = {
                total: entradas.length,
                totalCantidad: entradas.reduce((sum, e) => sum + (parseFloat(e.cantidad) || 0), 0),
                porCategoria: {},
                porMarca: {},
                ultimaSemana: 0
            };

            const unaSemanaAtras = new Date();
            unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);

            entradas.forEach(entrada => {
                // Por categoría
                const cat = entrada.categoria || 'Sin categoría';
                stats.porCategoria[cat] = (stats.porCategoria[cat] || 0) + 1;

                // Por marca
                const marca = entrada.marca || 'Sin marca';
                stats.porMarca[marca] = (stats.porMarca[marca] || 0) + 1;

                // Última semana
                if (entrada.fecha_entrada && new Date(entrada.fecha_entrada) >= unaSemanaAtras) {
                    stats.ultimaSemana++;
                }
            });

            return stats;

        } catch (error) {
            console.error("Error al obtener estadísticas:", error);
            throw error;
        }
    }
}

// Exportar instancia singleton
export const entryManagementService = new EntryManagementService();

// Exportación por defecto
export default EntryManagementService;
