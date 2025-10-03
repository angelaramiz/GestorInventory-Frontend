/**
 * ⚠️ DEPRECADO - NO USAR ESTE ARCHIVO
 * 
 * Este archivo está deprecado y se mantiene solo por compatibilidad.
 * 
 * USA EN SU LUGAR:
 * - import { ... } from './lotes-database-bridge.js'
 * 
 * RAZONES DE DEPRECACIÓN:
 * 1. Código duplicado con BatchService
 * 2. No sigue la arquitectura moderna
 * 3. Mezcla lógica de negocio con acceso a datos
 * 4. Difícil de mantener y testear
 * 
 * MIGRACIÓN:
 * Todas las funciones ahora están disponibles en lotes-database-bridge.js
 * que usa el BatchService moderno (src/core/services/BatchService.js)
 * 
 * @deprecated Usar lotes-database-bridge.js
 */

// Mostrar warning en consola
console.warn('⚠️ lotes-database.js está deprecado. Usa lotes-database-bridge.js en su lugar.');

// Re-exportar todas las funciones desde el bridge
export {
    obtenerProductosSubproducto,
    buscarProductoPorCodigo,
    guardarPrecioKiloLocal,
    obtenerPrecioKiloLocal,
    guardarLoteInventario,
    obtenerProductoPrimario,
    sincronizarDatosLotes,
    limpiarDatosLocalesAntiguos,
    verificarConectividad,
    obtenerEstadisticasLotes,
    exportarDatosLotes,
    crearBackupLotes,
    restaurarBackupLotes,
    limpiarBackupsAntiguos,
    service
} from './lotes-database-bridge.js';
