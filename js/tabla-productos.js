/**
 * ⚠️ DEPRECADO - NO USAR ESTE ARCHIVO
 * 
 * Este archivo está deprecado y se mantiene solo por compatibilidad.
 * 
 * USA EN SU LUGAR:
 * - import { ... } from './tabla-productos-bridge.js'
 * 
 * RAZONES DE DEPRECACIÓN:
 * 1. Código duplicado con ProductTableService y ProductTableUIService
 * 2. No sigue la arquitectura moderna
 * 3. Mezcla lógica de negocio con UI
 * 4. Difícil de mantener y testear
 * 5. Importa logs.js (deprecado)
 * 
 * MIGRACIÓN:
 * Todas las funciones ahora están disponibles en tabla-productos-bridge.js
 * que usa ProductTableService y ProductTableUIService modernos.
 * 
 * SERVICIOS MODERNOS:
 * - ProductTableService: Lógica de negocio
 * - ProductTableUIService: Gestión de UI
 * 
 * @deprecated Usar tabla-productos-bridge.js
 */

// Mostrar warning en consola
console.warn('⚠️ tabla-productos.js está deprecado. Usa tabla-productos-bridge.js en su lugar.');

// Re-exportar todas las funciones desde el bridge
export {
    // Funciones principales
    inicializarTablaProductos,
    agregarFilaSubproducto,
    guardarTablaProductos,
    limpiarTodo,
    eliminarFilaSubproducto,
    
    // Funciones de búsqueda
    buscarProductoPrimarioAutomatico,
    buscarSubproductoAutomatico,
    
    // Funciones de información
    mostrarInformacionProductoPrimario,
    mostrarInformacionSubproducto,
    limpiarInformacionProductoPrimario,
    limpiarInformacionSubproducto,
    
    // Funciones de recopilación
    recopilarDatosProductoPrimario,
    recopilarDatosSubproductos,
    
    // Funciones de guardado
    procesarGuardadoTabla,
    guardarProducto,
    crearRelacionesProductos,
    
    // Funciones de confirmación
    mostrarConfirmacionTabla,
    
    // Utilidades
    convertirGuionACeros,
    aplicarConversionCodigoAInput,
    
    // Variables (para compatibilidad)
    productoPrimario,
    subproductos,
    contadorFilas
} from './tabla-productos-bridge.js';
