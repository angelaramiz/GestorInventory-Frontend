/**
 * lotes-database-bridge.js
 * 
 * Bridge que conecta el código legacy con el nuevo BatchService.
 * Este archivo es parte de la arquitectura moderna y debe usarse
 * en lugar de lotes-database.js (deprecado).
 * 
 * ARQUITECTURA:
 * Legacy (lotes-database.js) → Bridge → BatchService (src/core/services/)
 */

import { batchService } from '../src/core/services/BatchService.js';

// Inicializar el servicio automáticamente
console.log('🔄 Inicializando BatchService desde bridge...');
batchService.initialize().catch(error => {
    console.error('❌ Error al inicializar BatchService:', error);
});

// ==========================================
// EXPORTAR TODAS LAS FUNCIONES DEL SERVICIO
// ==========================================

/**
 * Obtiene productos subproducto desde Supabase
 */
export async function obtenerProductosSubproducto() {
    return await batchService.obtenerProductosSubproducto();
}

/**
 * Busca producto por código/PLU
 */
export async function buscarProductoPorCodigo(codigo) {
    return await batchService.buscarProductoPorCodigo(codigo);
}

/**
 * Guarda precio por kilo en IndexedDB local
 */
export async function guardarPrecioKiloLocal(plu, precioKilo, productoInfo) {
    return await batchService.guardarPrecioKiloLocal(plu, precioKilo, productoInfo);
}

/**
 * Obtiene precio por kilo desde IndexedDB local
 */
export async function obtenerPrecioKiloLocal(plu) {
    return await batchService.obtenerPrecioKiloLocal(plu);
}

/**
 * Guarda lote de inventario en Supabase
 */
export async function guardarLoteInventario(loteData) {
    return await batchService.guardarLoteInventario(loteData);
}

/**
 * Obtiene producto primario relacionado con un subproducto
 */
export async function obtenerProductoPrimario(subproductoId) {
    return await batchService.obtenerProductoPrimario(subproductoId);
}

/**
 * Sincroniza datos de lotes con Supabase
 */
export async function sincronizarDatosLotes() {
    return await batchService.sincronizarDatosLotes();
}

/**
 * Limpia datos locales antiguos de IndexedDB
 */
export async function limpiarDatosLocalesAntiguos(diasAntiguedad = 30) {
    return await batchService.limpiarDatosLocalesAntiguos(diasAntiguedad);
}

/**
 * Verifica conectividad con Supabase
 */
export async function verificarConectividad() {
    return await batchService.verificarConectividad();
}

/**
 * Obtiene estadísticas de lotes
 */
export async function obtenerEstadisticasLotes() {
    return await batchService.obtenerEstadisticasLotes();
}

/**
 * Exporta datos de lotes en el formato especificado
 */
export async function exportarDatosLotes(formato = 'json') {
    return await batchService.exportarDatosLotes(formato);
}

/**
 * Crea backup de lotes en localStorage
 */
export async function crearBackupLotes() {
    return await batchService.crearBackupLotes();
}

/**
 * Restaura backup de lotes desde localStorage
 */
export async function restaurarBackupLotes(timestamp) {
    return await batchService.restaurarBackupLotes(timestamp);
}

/**
 * Limpia backups antiguos de localStorage
 */
export async function limpiarBackupsAntiguos(diasAntiguedad = 7) {
    return await batchService.limpiarBackupsAntiguos(diasAntiguedad);
}

// ==========================================
// EXPORTAR SERVICIO (para uso avanzado)
// ==========================================

/**
 * Exporta la instancia del servicio para uso directo
 * @example
 * import { service } from './lotes-database-bridge.js';
 * await service.initialize();
 */
export const service = batchService;

console.log('✅ lotes-database-bridge.js cargado - 14 funciones disponibles');
