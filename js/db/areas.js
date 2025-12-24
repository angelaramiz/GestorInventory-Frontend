// areas.js
// Funciones relacionadas con áreas

import { getSupabase } from '../auth/auth.js';
import { mostrarAlertaBurbuja } from '../utils/logs.js';

// Función para obtener la ubicación de almacén actualmente en uso
export async function obtenerUbicacionEnUso() {
    // Primero intentar obtener la ubicación desde localStorage
    const ubicacionAlmacen = localStorage.getItem('ubicacion_almacen');

    if (ubicacionAlmacen) {
        return ubicacionAlmacen;
    }

    // Si no hay ubicación en localStorage, intentar obtenerla de Supabase
    try {
        const areaId = localStorage.getItem('area_id');
        if (!areaId) {
            console.error("No se encontró area_id para obtener ubicación");
            return null;
        }

        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no disponible para obtener ubicación");
            return null;
        }

        // Buscar el área por ID
        const { data, error } = await supabase
            .from('areas')
            .select('nombre')
            .eq('id', areaId)
            .single();

        if (error) {
            console.error("Error al consultar área:", error);
            return null;
        }

        if (data) {
            // Guardar en localStorage para futuras consultas
            localStorage.setItem('ubicacion_almacen', data.nombre);
            return data.nombre;
        }

        return null;
    } catch (error) {
        console.error("Error al obtener ubicación:", error);
        return null;
    }
}

/**
 * Función para obtener las áreas disponibles según la categoría del usuario
 * Esta función carga y almacena las áreas para uso en la aplicación
 */
export async function obtenerAreasPorCategoria() {
    try {
        // Primero intentar usar áreas almacenadas localmente si existen
        const areasGuardadas = localStorage.getItem('areas_disponibles');
        if (areasGuardadas) {
            const areas = JSON.parse(areasGuardadas);
            console.log("Usando áreas guardadas localmente:", areas.length);
            return areas;
        }

        // Si no hay áreas guardadas, intentar obtenerlas de Supabase
        console.log("Intentando obtener áreas desde Supabase...");

        // Obtener instancia de Supabase
        const supabase = await getSupabase();
        if (!supabase) {
            console.error("Supabase no inicializado");
            mostrarAlertaBurbuja("Error de conexión con el servidor", "error");
            return [];
        }

        // Obtener categoría del usuario
        const categoriaId = localStorage.getItem('categoria_id');
        if (!categoriaId) {
            console.error("Categoría del usuario no encontrada");
            mostrarAlertaBurbuja("Categoría no encontrada", "error");
            return [];
        }

        // Consultar áreas filtradas por categoría
        const { data: areas, error } = await supabase
            .from('areas')
            .select('*')
            .eq('categoria_id', categoriaId);

        if (error) {
            console.error("Error al obtener áreas:", error);
            mostrarAlertaBurbuja("Error al cargar áreas desde servidor", "error");
            return [];
        }

        if (!areas || areas.length === 0) {
            console.warn("No se encontraron áreas para la categoría");
            mostrarAlertaBurbuja("No hay áreas disponibles para tu categoría", "warning");
            return [];
        }

        // Almacenar las áreas en localStorage para uso futuro
        localStorage.setItem('areas_disponibles', JSON.stringify(areas));
        console.log("Áreas cargadas correctamente desde Supabase:", areas.length);
        return areas;
    } catch (error) {
        console.error("Error al obtener áreas:", error);
        mostrarAlertaBurbuja("Error al cargar áreas", "error");
        // Retornar array vacío cuando hay errores
        return [];
    }
}



// Función para guardar el ID del área de manera persistente
export function guardarAreaIdPersistente(areaId, nombreArea) {
    if (!areaId) {
        console.error("Error: Intentando guardar un area_id vacío o nulo");
        return false;
    }

    try {
        console.log(`Guardando area_id: ${areaId} (${nombreArea || 'sin nombre'}) de manera persistente`);

        // Guardar en localStorage
        localStorage.setItem('area_id', areaId);

        // Guardar también en sessionStorage como respaldo
        sessionStorage.setItem('area_id', areaId);

        // Si hay un nombre de área, también guardarlo
        if (nombreArea) {
            localStorage.setItem('ubicacion_almacen', nombreArea);
        }

        // Verificar que se guardó correctamente
        const verificacion = localStorage.getItem('area_id');
        if (verificacion !== areaId) {
            console.error("Error: No se pudo verificar el guardado del area_id");
            return false;
        }

        console.log("area_id guardado correctamente en localStorage y sessionStorage");
        return true;
    } catch (error) {
        console.error("Error al guardar area_id:", error);
        return false;
    }
}

// Función para recuperar el ID del área de forma segura
export function obtenerAreaId() {
    // Intentar obtener del localStorage primero
    let areaId = localStorage.getItem('area_id');

    // Si no está en localStorage, intentar recuperarlo de sessionStorage
    if (!areaId) {
        areaId = sessionStorage.getItem('area_id');

        // Si se encontró en sessionStorage pero no en localStorage, restaurarlo en localStorage
        if (areaId) {
            localStorage.setItem('area_id', areaId);
            console.log("area_id restaurado desde sessionStorage a localStorage");
        } else {
            console.warn("No se encontró area_id en localStorage ni sessionStorage");
            return null;
        }
    }

    return areaId;
}