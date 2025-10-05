/**
 * ReportService - Servicio para gestión de reportes de inventario
 * 
 * Gestiona la lógica de negocio para reportes:
 * - Carga de datos de inventario
 * - Filtrado por áreas y categorías
 * - Agrupación de productos
 * - Cálculo de estadísticas
 * 
 * @class ReportService
 * @version 4.0.0
 * @since 2025-10-04
 */

import { DatabaseService } from './DatabaseService.js';
import { obtenerAreasPorCategoria } from '../../../js/db-operations.js';

export class ReportService {
    constructor() {
        this.productosInventario = [];
        this.todasLasAreas = [];
        this.databaseService = new DatabaseService();
    }

    /**
     * Inicializa el servicio cargando áreas y productos
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Si falla la inicialización
     */
    async initialize() {
        try {
            await this.loadAreas();
            await this.loadProducts();
        } catch (error) {
            console.error('Error al inicializar ReportService:', error);
            throw new Error('No se pudo inicializar el servicio de reportes');
        }
    }

    /**
     * Carga todas las áreas disponibles
     * @async
     * @returns {Promise<Array>} Array de áreas
     */
    async loadAreas() {
        try {
            const areas = await obtenerAreasPorCategoria();
            if (!areas || areas.length === 0) {
                console.warn('No se encontraron áreas disponibles');
                return [];
            }
            this.todasLasAreas = areas;
            return areas;
        } catch (error) {
            console.error('Error al cargar áreas:', error);
            throw error;
        }
    }

    /**
     * Carga todos los productos del inventario
     * @async
     * @returns {Promise<Array>} Array de productos
     */
    async loadProducts() {
        try {
            const supabase = await this.databaseService.getSupabase();
            const { data, error } = await supabase
                .from('inventario')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            this.productosInventario = data || [];
            return this.productosInventario;
        } catch (error) {
            console.error('Error al cargar productos:', error);
            throw error;
        }
    }

    /**
     * Filtra productos por áreas seleccionadas
     * @async
     * @param {Array<string>} areaIds - IDs de las áreas a filtrar
     * @param {boolean} todasSeleccionadas - Si se deben incluir todas las áreas
     * @returns {Promise<Array>} Productos filtrados
     */
    async filterProductsByAreas(areaIds, todasSeleccionadas = false) {
        try {
            if (todasSeleccionadas) {
                return this.productosInventario;
            }

            if (!areaIds || areaIds.length === 0) {
                return [];
            }

            const supabase = await this.databaseService.getSupabase();
            const { data, error } = await supabase
                .from('inventario')
                .select('*')
                .in('area_id', areaIds)
                .order('nombre', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error al filtrar productos por áreas:', error);
            throw error;
        }
    }

    /**
     * Fusiona productos idénticos (mismo código) en un solo registro
     * @param {Array} productos - Array de productos a fusionar
     * @returns {Array} Productos fusionados
     */
    mergeProductsByCode(productos) {
        const productosFusionados = [];
        const mapaProductos = new Map();

        productos.forEach(producto => {
            const codigo = producto.codigo || 'sincodigo';

            if (mapaProductos.has(codigo)) {
                const productoExistente = mapaProductos.get(codigo);

                // Sumar cantidades
                const cantidadOriginal = parseFloat(productoExistente.cantidad) || 0;
                const cantidadNueva = parseFloat(producto.cantidad) || 0;
                productoExistente.cantidad = (cantidadOriginal + cantidadNueva).toString();

                // Acumular información de lotes
                let comentarioLote = `Lote: ${producto.lote || 'Sin especificar'}, Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
                if (producto.caducidad) {
                    comentarioLote += `, Caducidad: ${new Date(producto.caducidad).toLocaleDateString('es-ES')}`;
                }

                const area = this.todasLasAreas.find(a => a.id === producto.area_id);
                if (area) {
                    comentarioLote += `, Área: ${area.nombre}`;
                }

                if (producto.comentarios && producto.comentarios !== 'N/A') {
                    comentarioLote += `, Notas: ${producto.comentarios}`;
                }

                // Inicializar comentarios fusionados si es la primera fusión
                if (!productoExistente.comentariosFusionados) {
                    const comentarioOriginal = `Lote: ${productoExistente.lote || 'Sin especificar'}, Cantidad: ${cantidadOriginal} ${productoExistente.unidad || 'unidades'}`;
                    let comentarioOriginalCompleto = comentarioOriginal;
                    
                    if (productoExistente.caducidad) {
                        comentarioOriginalCompleto += `, Caducidad: ${new Date(productoExistente.caducidad).toLocaleDateString('es-ES')}`;
                    }

                    const areaOriginal = this.todasLasAreas.find(a => a.id === productoExistente.area_id);
                    if (areaOriginal) {
                        comentarioOriginalCompleto += `, Área: ${areaOriginal.nombre}`;
                    }

                    productoExistente.comentariosFusionados = [comentarioOriginalCompleto];

                    if (productoExistente.comentarios && productoExistente.comentarios !== 'N/A') {
                        productoExistente.comentariosFusionados[0] += `, Notas: ${productoExistente.comentarios}`;
                    }
                }

                productoExistente.comentariosFusionados.push(comentarioLote);

                // Guardar lotes individuales
                if (!productoExistente.lotesFusionados) {
                    productoExistente.lotesFusionados = [{
                        lote: productoExistente.lote || '1',
                        cantidad: cantidadOriginal,
                        caducidad: productoExistente.caducidad,
                        area_id: productoExistente.area_id,
                        comentarios: productoExistente.comentarios
                    }];
                }

                productoExistente.lotesFusionados.push({
                    lote: producto.lote || '1',
                    cantidad: cantidadNueva,
                    caducidad: producto.caducidad,
                    area_id: producto.area_id,
                    comentarios: producto.comentarios
                });

                productoExistente.comentarios = `Producto fusionado con múltiples lotes:\n- ${productoExistente.comentariosFusionados.join('\n- ')}`;

                // Conservar la fecha de caducidad más próxima
                if (producto.caducidad && productoExistente.caducidad) {
                    const fechaExistente = new Date(productoExistente.caducidad);
                    const fechaNueva = new Date(producto.caducidad);
                    if (fechaNueva < fechaExistente) {
                        productoExistente.caducidad = producto.caducidad;
                    }
                } else if (producto.caducidad) {
                    productoExistente.caducidad = producto.caducidad;
                }
            } else {
                // Producto nuevo
                const productoCopia = { ...producto };
                productoCopia.comentariosFusionados = [];
                productoCopia.lotesFusionados = [{
                    lote: producto.lote || '1',
                    cantidad: parseFloat(producto.cantidad) || 0,
                    caducidad: producto.caducidad,
                    area_id: producto.area_id,
                    comentarios: producto.comentarios
                }];
                mapaProductos.set(codigo, productoCopia);
            }
        });

        mapaProductos.forEach(producto => {
            productosFusionados.push(producto);
        });

        console.log(`Se fusionaron ${productos.length} productos en ${productosFusionados.length} elementos únicos`);
        return productosFusionados;
    }

    /**
     * Agrupa productos por área
     * @param {Array} productos - Array de productos
     * @returns {Object} Productos agrupados por área_id
     */
    groupProductsByArea(productos) {
        const productosPorArea = {};
        
        productos.forEach(producto => {
            if (!productosPorArea[producto.area_id]) {
                productosPorArea[producto.area_id] = [];
            }
            productosPorArea[producto.area_id].push(producto);
        });

        // Ordenar productos por fecha de caducidad
        Object.keys(productosPorArea).forEach(areaId => {
            productosPorArea[areaId].sort((a, b) => {
                if (!a.caducidad) return 1;
                if (!b.caducidad) return -1;
                return new Date(a.caducidad) - new Date(b.caducidad);
            });
        });

        return productosPorArea;
    }

    /**
     * Categoriza productos por estado de caducidad
     * @param {Array} productos - Array de productos
     * @returns {Object} Productos categorizados
     */
    categorizeProductsByExpiry(productos) {
        const ahora = new Date();
        const fechaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const unaSemanaDesdeHoy = new Date(fechaActual);
        unaSemanaDesdeHoy.setDate(fechaActual.getDate() + 7);

        const finDelMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
        const finDelSiguienteMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 2, 0);

        const categorias = {
            vencidos: [],
            proximosSemana: [],
            mismoMes: [],
            siguienteMes: [],
            otros: []
        };

        productos.forEach(producto => {
            if (!producto.caducidad) {
                categorias.otros.push(producto);
                return;
            }

            const fechaCaducidad = new Date(producto.caducidad);

            if (fechaCaducidad < fechaActual) {
                categorias.vencidos.push(producto);
            } else if (fechaCaducidad <= finDelMesActual) {
                if (fechaCaducidad <= unaSemanaDesdeHoy) {
                    categorias.proximosSemana.push(producto);
                } else {
                    categorias.mismoMes.push(producto);
                }
            } else if (fechaCaducidad <= finDelSiguienteMes) {
                categorias.siguienteMes.push(producto);
            } else {
                categorias.otros.push(producto);
            }
        });

        return categorias;
    }

    /**
     * Obtiene todas las áreas cargadas
     * @returns {Array} Array de áreas
     */
    getAreas() {
        return this.todasLasAreas;
    }

    /**
     * Obtiene todos los productos cargados
     * @returns {Array} Array de productos
     */
    getProducts() {
        return this.productosInventario;
    }
}

// Exportar instancia singleton
export const reportService = new ReportService();

// Exportación por defecto
export default ReportService;
