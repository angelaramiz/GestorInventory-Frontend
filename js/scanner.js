/**
 * @deprecated Este archivo ha sido deprecado en favor de scanner-bridge.js
 * 
 * MIGRACIÓN FASE 3:
 * - Fecha: 3 de octubre de 2025
 * - Todas las funciones de escáner ahora viven en scanner-bridge.js
 * - Este archivo solo re-exporta las funciones del bridge para compatibilidad
 * 
 * ACTUALIZACIÓN RECOMENDADA:
 * En lugar de:
 *   import { iniciarEscaneo } from './scanner.js';
 * 
 * Usar:
 *   import { iniciarEscaneo } from './scanner-bridge.js';
 * 
 * Este archivo será eliminado en una versión futura.
 */

console.warn('⚠️ scanner.js está deprecado. Usa scanner-bridge.js en su lugar.');

// Re-exportar todas las funciones desde scanner-bridge para compatibilidad
export {
    initScanner,
    iniciarEscaneo,
    toggleEscaner,
    detenerEscaner,
    iniciarEscaneoConModal,
    manejarCodigoEscaneado,
    playTone,
    configurarEscaner,
    obtenerConfiguracionEscaner,
    obtenerEstadoEscaner,
    isEscanerActivo,
    cerrarModalEscaner,
    inicializarConPermisos,
    escanearParaInput
} from './scanner-bridge.js';

// Log de migración para debugging
if (localStorage.getItem('debug') === 'true') {
    console.log('📦 scanner.js - Redirigiendo todas las llamadas a scanner-bridge.js');
}
