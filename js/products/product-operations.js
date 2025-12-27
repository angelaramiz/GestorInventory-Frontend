// Re-export hub para todas las operaciones de productos
// Este archivo centraliza todas las exportaciones de los módulos de productos

// UI functions
export { mostrarResultados, mostrarResultadosInventario, mostrarFormularioInventario, mostrarResultadosEdicion, limpiarFormularioInventario } from './product-ui.js';

// Search functions
export { buscarPorCodigoParcial, buscarProducto, buscarProductoParaEditar, validarCodigoUnico, buscarProductoInventario } from './product-search.js';

// CRUD functions
export { agregarProducto, guardarCambios, eliminarProducto, agregarNuevoProductoDesdeInventario } from './product-crud.js';

// Inventory functions
export {
    guardarInventario,
    modificarInventario,
    seleccionarUbicacionAlmacen,
    verificarYSeleccionarUbicacion,
    iniciarInventario
} from './product-inventory.js';

// Barcode functions
export {
    generarCodigoBarras,
    generarPDFCodigosBarras,
    generarPDFInventario,
    imprimirCodigosBarras
} from './product-barcode.js';

// Utility functions
export { obtenerEstadisticasInventario, exportarInventarioCSV } from './product-utils.js';