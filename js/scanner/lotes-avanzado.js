// VERSIÓN: 2026-01-18 12:00:00 - Fix: Switch tabs para lotes avanzado
// Funcionalidad de escaneo por lotes avanzado
// Mejora del sistema de lotes con detección automática y agrupación de productos

// Importar módulos
import { inicializarSistemaLotesAvanzado, cambiarPestanaPrincipal } from './modules/init.js';
import { cargarDiccionarioSubproductos } from './modules/processor.js';
import { guardarInventarioLotesAvanzado } from './modules/storage.js';

// Inicializar sistema de lotes avanzado cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded - Inicializando sistema de lotes avanzado');
        inicializarSistemaLotesAvanzado();
    });
} else {
    console.log('DOM already loaded - Inicializando sistema de lotes avanzado');
    inicializarSistemaLotesAvanzado();
}

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