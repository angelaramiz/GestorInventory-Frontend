// Funcionalidad de escaneo por lotes avanzado
// Mejora del sistema de lotes con detección automática y agrupación de productos

// Importar módulos
import { inicializarSistemaLotesAvanzado, cambiarPestanaPrincipal } from './modules/init.js';
import { cargarDiccionarioSubproductos } from './modules/processor.js';
import { guardarInventarioLotesAvanzado } from './modules/storage.js';

// Función para actualizar tabla automáticamente después de guardar
export async function actualizarTablaInventarioAutomaticamente() {
    try {
        console.log('Actualizando tabla de inventario...');

        // Importar y ejecutar sincronización desde Supabase con la ruta correcta
        const { sincronizarInventarioDesdeSupabase } = await import('../db/db-operations.js');
        await sincronizarInventarioDesdeSupabase();

        console.log('Tabla de inventario actualizada exitosamente');
    } catch (e) {
        console.warn('No se pudo actualizar la tabla automáticamente:', e);
    }
}

// Exportar funciones principales para uso externo
export {
    inicializarSistemaLotesAvanzado,
    cambiarPestanaPrincipal,
    cargarDiccionarioSubproductos,
    guardarInventarioLotesAvanzado,
    actualizarTablaInventarioAutomaticamente
};