import { obtenerAreasPorCategoria } from '../db/db-operations.js';
import { getSupabase } from '../auth/auth.js';
import { cargarAreas, cargarProductos, filtrarProductosPorAreasSeleccionadas, getProductosInventario, getSupabaseInstance, getTodasLasAreas, setSupabaseInstance } from './rep-data.js';
import { toggleTodasLasAreas, mostrarOpcionesReporte } from './rep-ui.js';
import { generarReportePDF } from './rep-pdf.js';

// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar Supabase
        const supabase = await getSupabase();
        if (!supabase) {
            throw new Error('Supabase no está inicializado');
        }
        setSupabaseInstance(supabase);

        // Cargar áreas y productos
        await cargarAreas();
        await cargarProductos();

        // Event listeners
        document.getElementById('area-todas').addEventListener('change', toggleTodasLasAreas);
        document.getElementById('aplicarFiltroBtn').addEventListener('click', filtrarProductosPorAreasSeleccionadas);
        document.getElementById('generarReporteBtn').addEventListener('click', async () => {
            const result = await mostrarOpcionesReporte();
            if (result) {
                await generarReportePDF(result, getProductosInventario(), getTodasLasAreas(), getSupabaseInstance());
            }
        });
    } catch (error) {
        console.error('Error al inicializar la página:', error);
        Swal.fire('Error', 'Ocurrió un error al inicializar la página.', 'error');
    }
});