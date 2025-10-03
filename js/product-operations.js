/**
 * ⚠️ ARCHIVO DEPRECADO - Usar servicios modernos de productos
 * 
 * Este archivo se mantiene únicamente por compatibilidad hacia atrás.
 * Todo el código nuevo debe usar los servicios modernos de productos.
 * 
 * MIGRACIÓN COMPLETA EN FASE 2:
 * - Servicio: ProductOperationsService (CRUD productos)
 * - Servicio: ProductUIService (interfaz de usuario)
 * - Servicio: InventoryOperationsService (operaciones de inventario)
 * - Servicio: ProductPrintService (impresión y etiquetas)
 * - Bridge: product-operations-bridge.js (535 líneas)
 * - Documentado en: docs/PHASE_2_SUMMARY.md
 * 
 * FASE 3 - NIVEL 4: Wrapper para compatibilidad
 * 
 * USO MODERNO:
 * import { productOperationsService } from '../src/core/services/ProductOperationsService.js';
 * import { inventoryOperationsService } from '../src/core/services/InventoryOperationsService.js';
 * 
 * @deprecated v3.0.0 - Usar servicios modernos de productos
 * @see src/core/services/ProductOperationsService.js
 * @see src/core/services/ProductUIService.js
 * @see src/core/services/InventoryOperationsService.js
 * @see src/core/services/ProductPrintService.js
 * @see js/product-operations-bridge.js
 */

console.warn('⚠️ product-operations.js está DEPRECADO. Usar servicios modernos de productos para nuevo código.');

// Re-exportar todas las funciones desde el bridge
export {
    // Operaciones CRUD de productos
    agregarProducto,
    buscarProducto,
    buscarProductoParaEditar,
    validarCodigoUnico,
    guardarCambios,
    eliminarProducto,
    buscarPorCodigoParcial,
    
    // Operaciones de inventario
    guardarInventario,
    modificarInventario,
    buscarProductoInventario,
    seleccionarUbicacionAlmacen,
    verificarYSeleccionarUbicacion,
    iniciarInventario,
    agregarNuevoProductoDesdeInventario,
    
    // UI y visualización
    mostrarResultados,
    mostrarResultadosInventario,
    mostrarResultadosEdicion,
    mostrarFormularioInventario,
    limpiarFormularioInventario,
    mostrarDetallesProductoConBarcode,
    llenarFormularioEdicion,
    
    // Códigos de barras e impresión
    generarCodigoBarras,
    imprimirEtiquetaProducto,
    crearPDFEtiquetas,
    configurarImpresion,
    
    // Utilidades
    generarIdTemporal,
    actualizarEnIndexedDB,
    
    // Búsquedas especializadas
    buscarEnProductos,
    buscarEnInventario,
    
    // Almacenamiento local
    guardarInventarioLocal,
    cargarInventarioLocal,
    
    // Inicialización
    inicializarTodosLosServiciosProductos,
    autoInicializar
} from './product-operations-bridge.js';

/**
 * NOTA PARA DESARROLLADORES:
 * 
 * Este archivo es un thin wrapper que re-exporta funciones del bridge.
 * El bridge (product-operations-bridge.js) delega a 4 servicios modernos especializados.
 * 
 * ARQUITECTURA:
 * product-operations.js (wrapper deprecado, 120 líneas)
 *     ↓
 * product-operations-bridge.js (adaptador, 535 líneas)
 *     ↓
 * ProductOperationsService    - CRUD de productos
 * ProductUIService            - Interfaz de usuario
 * InventoryOperationsService  - Operaciones de inventario
 * ProductPrintService         - Impresión y etiquetas
 * 
 * FUNCIONES DISPONIBLES (33+):
 * 
 * CRUD de Productos:
 * - agregarProducto(productData, evento) - Agregar nuevo producto
 * - buscarProducto(codigo, formato) - Buscar producto por código
 * - buscarProductoParaEditar(codigo, formato) - Buscar para edición
 * - validarCodigoUnico(codigo) - Validar código único
 * - guardarCambios(productData) - Guardar cambios de producto
 * - eliminarProducto(codigo) - Eliminar producto
 * - buscarPorCodigoParcial(codigoCorto, tipo, callback) - Búsqueda parcial
 * 
 * Inventario:
 * - guardarInventario(inventoryData) - Guardar registro de inventario
 * - modificarInventario(codigo, cantidad, observaciones) - Modificar inventario
 * - buscarProductoInventario(codigo, formato) - Buscar en inventario
 * - seleccionarUbicacionAlmacen() - Seleccionar ubicación
 * - verificarYSeleccionarUbicacion() - Verificar y seleccionar ubicación
 * - iniciarInventario(ubicacion) - Iniciar proceso de inventario
 * - agregarNuevoProductoDesdeInventario(codigo, permitirModificar) - Agregar desde inventario
 * 
 * UI y Visualización:
 * - mostrarResultados(resultados) - Mostrar resultados de búsqueda
 * - mostrarResultadosInventario(resultados) - Mostrar resultados de inventario
 * - mostrarResultadosEdicion(resultados) - Mostrar resultados de edición
 * - mostrarFormularioInventario(producto) - Mostrar formulario
 * - limpiarFormularioInventario() - Limpiar formulario
 * - mostrarDetallesProductoConBarcode(producto) - Mostrar detalles con barcode
 * - llenarFormularioEdicion(producto) - Llenar formulario de edición
 * 
 * Códigos de Barras:
 * - generarCodigoBarras(codigo, canvasId, options) - Generar código de barras
 * - imprimirEtiquetaProducto(producto, options) - Imprimir etiqueta individual
 * - crearPDFEtiquetas(productos, options) - Crear PDF con múltiples etiquetas
 * - configurarImpresion(config) - Configurar opciones de impresión
 * 
 * Utilidades:
 * - generarIdTemporal(codigo, lote) - Generar ID temporal
 * - actualizarEnIndexedDB(data) - Actualizar en IndexedDB
 * - buscarEnProductos(codigo, nombre, marca) - Búsqueda en productos
 * - buscarEnInventario(codigo, nombre, marca) - Búsqueda en inventario
 * - guardarInventarioLocal(inventario) - Guardar en localStorage
 * - cargarInventarioLocal() - Cargar desde localStorage
 * 
 * Inicialización:
 * - inicializarTodosLosServiciosProductos() - Inicializar todos los servicios
 * - autoInicializar() - Auto-inicializar si es necesario
 * 
 * MIGRACIÓN RECOMENDADA:
 * En lugar de usar este wrapper, importa directamente los servicios:
 * 
 * ```javascript
 * import { productOperationsService } from '../src/core/services/ProductOperationsService.js';
 * import { inventoryOperationsService } from '../src/core/services/InventoryOperationsService.js';
 * import { productPrintService } from '../src/core/services/ProductPrintService.js';
 * 
 * // Inicializar
 * await productOperationsService.initialize();
 * 
 * // CRUD de productos
 * await productOperationsService.addProduct(productData);
 * const product = await productOperationsService.findByCode(codigo);
 * await productOperationsService.updateProduct(productData);
 * await productOperationsService.deleteProduct(codigo);
 * 
 * // Inventario
 * await inventoryOperationsService.saveInventory(inventoryData);
 * await inventoryOperationsService.modifyInventory(codigo, cantidad);
 * 
 * // Impresión
 * await productPrintService.printLabel(producto);
 * await productPrintService.createPDFLabels(productos);
 * ```
 * 
 * VENTAJAS DE LOS SERVICIOS MODERNOS:
 * - Separación de responsabilidades clara
 * - Mejor manejo de errores
 * - Testing más fácil
 * - Código más mantenible
 * - Performance optimizado
 * - API consistente
 */
