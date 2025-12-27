// rep-data.js - Funciones de carga y manejo de datos para reportes

import { obtenerAreasPorCategoria } from '../db/db-operations.js';
import { getSupabase } from '../auth/auth.js';
import { mostrarProductosEnLista, mostrarCargando, handleAreaSpecificSelection } from './rep-ui.js';

let productosInventario = [];
let supabase;
let todasLasAreas = [];

// Cargar áreas disponibles usando la función obtenerAreasPorCategoria
export async function cargarAreas() {
    try {
        mostrarCargando(true);

        const areas = await obtenerAreasPorCategoria();
        if (!areas || areas.length === 0) {
            console.warn('No se encontraron áreas disponibles.');
            return;
        }

        // console.log('Áreas disponibles:', areas);
        todasLasAreas = areas; // Guardar todas las áreas

        const areasContainer = document.getElementById('areasContainer');
        if (areasContainer) {
            // Mantener el checkbox de "Todas las áreas" que ya existe en el HTML
            areas.forEach(area => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'flex items-center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `area-${area.id}`;
                checkbox.value = area.id;
                checkbox.className = 'areaCheckbox mr-2';
                checkbox.disabled = document.getElementById('area-todas').checked; // Desactivado si "Todas" está marcado

                checkbox.addEventListener('change', handleAreaSpecificSelection);

                const label = document.createElement('label');
                label.htmlFor = `area-${area.id}`;
                label.textContent = area.nombre;

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                areasContainer.appendChild(checkboxDiv);
            });
        }
    } catch (error) {
        console.error('Error al cargar áreas:', error);
        Swal.fire('Error', 'No se pudieron cargar las áreas.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Cargar todos los productos del inventario desde Supabase
export async function cargarProductos() {
    try {
        mostrarCargando(true);

        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        productosInventario = data;
        mostrarProductosEnLista(productosInventario, todasLasAreas);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos. Verifica tu conexión a internet.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Filtrar productos por áreas seleccionadas
export async function filtrarProductosPorAreasSeleccionadas() {
    const todasSeleccionadas = document.getElementById('area-todas').checked;

    if (todasSeleccionadas) {
        // Si "Todas las áreas" está seleccionado, mostrar todos los productos
        mostrarProductosEnLista(productosInventario, todasLasAreas);
        return;
    }

    try {
        mostrarCargando(true);

        // Obtener IDs de todas las áreas seleccionadas
        const areasSeleccionadas = Array.from(
            document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)')
        ).map(checkbox => checkbox.value);

        if (areasSeleccionadas.length === 0) {
            // Si no hay áreas seleccionadas, no mostrar productos
            mostrarProductosEnLista([], todasLasAreas);
            Swal.fire('Atención', 'Por favor, selecciona al menos un área para mostrar productos.', 'info');
            return;
        }

        // Filtrar productos por las áreas seleccionadas
        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .in('area_id', areasSeleccionadas) // Usar IN para filtrar por múltiples áreas
            .order('nombre', { ascending: true });

        if (error) throw error;

        mostrarProductosEnLista(data, todasLasAreas);
    } catch (error) {
        console.error('Error al filtrar productos por áreas:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos para las áreas seleccionadas.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Getters para acceder a las variables globales
export function getProductosInventario() {
    return productosInventario;
}

export function getSupabaseInstance() {
    return supabase;
}

export function getTodasLasAreas() {
    return todasLasAreas;
}

export function setSupabaseInstance(instance) {
    supabase = instance;
}