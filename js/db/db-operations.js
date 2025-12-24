// db-operations.js
// Archivo principal que importa y re-exporta todas las funciones de los módulos

// Importar desde módulos
export { db, dbInventario, dbEntradas, inicializarDB, inicializarDBInventario, inicializarDBEntradas } from './db-init.js';
export { agregarAColaSincronizacion, procesarColaSincronizacion } from './sync-queue.js';
export { sincronizarBidireccional, sincronizarDesdeSupabase, sincronizarProductosLocalesHaciaSupabase, inicializarSuscripciones } from './sync-bidirectional.js';
export { sincronizarProductosDesdeBackend, subirProductosAlBackend, cargarDatosEnTabla, cargarCSV, descargarCSV } from './products.js';
export { cargarDatosInventarioEnTablaPlantilla, descargarInventarioCSV, descargarInventarioPDF, sincronizarInventarioDesdeSupabase } from './inventory.js';
export { obtenerUbicacionEnUso, obtenerAreasPorCategoria, guardarAreaIdPersistente, obtenerAreaId } from './areas.js';
export { agregarAColaSincronizacionEntradas, procesarColaSincronizacionEntradas, sincronizarEntradasDesdeSupabase, agregarRegistroEntrada, cargarEntradasEnTabla, eliminarRegistroEntrada, generarReporteEntradas } from './entries.js';
export { resetearBaseDeDatos, generarPlantillaInventario } from './utils.js';
