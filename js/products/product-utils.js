// product-utils.js
// Funciones utilitarias relacionadas con productos

import { db, dbInventario } from '../db/db-operations.js';
import { mostrarMensaje } from '../utils/logs.js';
import { getSupabase } from '../auth/auth.js';

// Función para validar datos de producto
export function validarDatosProducto(datos) {
    const errores = [];

    if (!datos.codigo || datos.codigo.trim() === '') {
        errores.push('El código del producto es obligatorio');
    }

    if (!datos.nombre || datos.nombre.trim() === '') {
        errores.push('El nombre del producto es obligatorio');
    }

    if (!datos.categoria || datos.categoria.trim() === '') {
        errores.push('La categoría del producto es obligatoria');
    }

    if (!datos.marca || datos.marca.trim() === '') {
        errores.push('La marca del producto es obligatoria');
    }

    // Validar código único si es un producto nuevo
    if (datos.esNuevo && datos.codigo) {
        // Esta validación se haría de forma asíncrona en la función que la llama
    }

    return errores;
}

// Función para sanitizar datos de producto
export function sanitizarDatosProducto(datos) {
    return {
        codigo: datos.codigo?.trim() || '',
        nombre: datos.nombre?.trim() || '',
        categoria: datos.categoria?.trim() || '',
        marca: datos.marca?.trim() || '',
        descripcion: datos.descripcion?.trim() || '',
        precio: parseFloat(datos.precio) || 0,
        unidad: datos.unidad?.trim() || 'Pz',
        lote: datos.lote?.trim() || '1',
        cantidad: parseFloat(datos.cantidad) || 0,
        caducidad: datos.caducidad || '',
        comentarios: datos.comentarios?.trim() || 'N/A'
    };
}

// Función para formatear fecha
export function formatearFecha(fecha) {
    if (!fecha) return '';

    try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return fecha;
    }
}

// Función para calcular días hasta caducidad
export function calcularDiasHastaCaducidad(fechaCaducidad) {
    if (!fechaCaducidad) return null;

    try {
        const hoy = new Date();
        const caducidad = new Date(fechaCaducidad);
        const diferencia = caducidad.getTime() - hoy.getTime();
        const dias = Math.ceil(diferencia / (1000 * 3600 * 24));

        return dias;
    } catch (error) {
        console.error('Error al calcular días hasta caducidad:', error);
        return null;
    }
}

// Función para obtener productos próximos a caducar
export async function obtenerProductosProximosACaducar(dias = 30) {
    try {
        const productos = await new Promise((resolve) => {
            const transaction = dbInventario.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });

        const proximosACaducar = productos.filter(producto => {
            const diasRestantes = calcularDiasHastaCaducidad(producto.caducidad);
            return diasRestantes !== null && diasRestantes <= dias && diasRestantes >= 0;
        });

        return proximosACaducar.sort((a, b) => {
            const diasA = calcularDiasHastaCaducidad(a.caducidad);
            const diasB = calcularDiasHastaCaducidad(b.caducidad);
            return diasA - diasB;
        });
    } catch (error) {
        console.error('Error al obtener productos próximos a caducar:', error);
        return [];
    }
}

// Función para obtener estadísticas de inventario
export async function obtenerEstadisticasInventario() {
    try {
        const productos = await new Promise((resolve) => {
            const transaction = dbInventario.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });

        const estadisticas = {
            totalProductos: productos.length,
            totalCantidad: productos.reduce((sum, p) => sum + parseFloat(p.cantidad || 0), 0),
            productosUnicos: new Set(productos.map(p => p.codigo)).size,
            productosProximosACaducar: 0,
            productosCaducados: 0,
            valorTotal: productos.reduce((sum, p) => sum + (parseFloat(p.cantidad || 0) * parseFloat(p.precio || 0)), 0)
        };

        // Calcular productos próximos a caducar y caducados
        productos.forEach(producto => {
            const diasRestantes = calcularDiasHastaCaducidad(producto.caducidad);
            if (diasRestantes !== null) {
                if (diasRestantes < 0) {
                    estadisticas.productosCaducados++;
                } else if (diasRestantes <= 30) {
                    estadisticas.productosProximosACaducar++;
                }
            }
        });

        return estadisticas;
    } catch (error) {
        console.error('Error al obtener estadísticas de inventario:', error);
        return {
            totalProductos: 0,
            totalCantidad: 0,
            productosUnicos: 0,
            productosProximosACaducar: 0,
            productosCaducados: 0,
            valorTotal: 0
        };
    }
}

// Función para exportar datos a CSV
export async function exportarInventarioCSV() {
    try {
        const productos = await new Promise((resolve) => {
            const transaction = dbInventario.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });

        if (productos.length === 0) {
            mostrarMensaje("No hay productos para exportar", "warning");
            return;
        }

        // Crear encabezados CSV
        const headers = [
            'Código',
            'Nombre',
            'Categoría',
            'Marca',
            'Lote',
            'Unidad',
            'Cantidad',
            'Fecha Caducidad',
            'Comentarios',
            'Última Modificación'
        ];

        // Crear filas de datos
        const rows = productos.map(producto => [
            producto.codigo,
            producto.nombre,
            producto.categoria,
            producto.marca,
            producto.lote,
            producto.unidad,
            producto.cantidad,
            producto.caducidad,
            producto.comentarios,
            producto.last_modified
        ]);

        // Combinar headers y rows
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field || ''}"`).join(','))
            .join('\n');

        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        mostrarMensaje("Inventario exportado exitosamente", "success");
    } catch (error) {
        console.error('Error al exportar inventario a CSV:', error);
        mostrarMensaje("Error al exportar inventario", "error");
    }
}

// Función para limpiar datos temporales
export function limpiarDatosTemporales() {
    try {
        // Limpiar datos temporales del localStorage relacionados con productos
        const keysToRemove = [
            'producto_temp_codigo',
            'producto_temp_nombre',
            'producto_temp_categoria',
            'producto_temp_marca'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('Datos temporales de productos limpiados');
    } catch (error) {
        console.error('Error al limpiar datos temporales:', error);
    }
}

// Función para validar conexión a Supabase
export async function validarConexionSupabase() {
    try {
        const supabase = await getSupabase();
        if (!supabase) {
            return { conectado: false, mensaje: 'Cliente Supabase no disponible' };
        }

        // Intentar una consulta simple para verificar conexión
        const { error } = await supabase.from('productos').select('count').limit(1).single();

        if (error && error.code !== 'PGRST116') { // PGRST116 es "no rows returned" que es normal
            return { conectado: false, mensaje: `Error de conexión: ${error.message}` };
        }

        return { conectado: true, mensaje: 'Conexión exitosa' };
    } catch (error) {
        return { conectado: false, mensaje: `Error: ${error.message}` };
    }
}