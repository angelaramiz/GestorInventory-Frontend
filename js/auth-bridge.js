/**
 * auth-bridge.js
 * 
 * Bridge que conecta con el nuevo AuthService.
 * Este archivo NO depreca auth.js todavía, simplemente ofrece
 * una alternativa moderna para nuevos desarrollos.
 * 
 * ESTADO: COEXISTENCIA
 * - auth.js sigue funcionando (legacy)
 * - auth-bridge.js disponible para nuevo código
 * - Migración gradual en futuras fases
 * 
 * USO:
 * import { getSupabase, isTokenExpired } from './auth-bridge.js';
 */

import { authService } from '../src/core/services/AuthService.js';

// Inicializar el servicio automáticamente
console.log('🔄 Inicializando AuthService desde bridge...');
authService.initialize().catch(error => {
    console.error('❌ Error al inicializar AuthService:', error);
});

// ==========================================
// EXPORTAR FUNCIONES DEL SERVICIO
// ==========================================

/**
 * Obtiene el cliente de Supabase
 */
export async function getSupabase() {
    return await authService.getSupabase();
}

/**
 * Verifica si un token está expirado
 */
export function isTokenExpired(token) {
    return authService.isTokenExpired(token);
}

/**
 * Obtiene el token del localStorage
 */
export function getToken() {
    return authService.getToken();
}

/**
 * Verifica la validez de la sesión actual
 */
export async function verificarSesionValida() {
    return await authService.verificarSesionValida();
}

/**
 * Verifica el token automáticamente
 */
export function verificarTokenAutomaticamente() {
    return authService.verificarTokenAutomaticamente();
}

/**
 * Configura el interceptor de Supabase
 */
export async function configurarInterceptorSupabase() {
    return await authService.configurarInterceptorSupabase();
}

/**
 * Inicializa el sistema de la página
 */
export async function inicializarSistemaPagina() {
    return await authService.inicializarSistemaPagina();
}

/**
 * Limpia la sesión actual
 */
export function limpiarSesion() {
    return authService.limpiarSesion();
}

/**
 * Obtiene la ruta de redirección al login
 */
export function getLoginRedirectPath() {
    return authService.getLoginRedirectPath();
}

/**
 * Redirige al login
 */
export function redirectToLogin(delay = 1500) {
    return authService.redirectToLogin(delay);
}

/**
 * Verifica si estamos en una página de login
 */
export function isLoginPage(path) {
    return authService.isLoginPage(path || window.location.pathname);
}

/**
 * Debug de rutas
 */
export function debugRutas() {
    return authService.debugRutas();
}

// ==========================================
// EXPORTAR INSTANCIA DEL SERVICIO
// ==========================================

/**
 * Exporta la instancia del servicio para uso avanzado
 * @example
 * import { service } from './auth-bridge.js';
 * await service.initialize();
 */
export const service = authService;

/**
 * Re-exportar el cliente de Supabase directamente
 * (para compatibilidad con código que importa: import { supabase } from './auth.js')
 */
export const supabase = await authService.getSupabase().catch(() => null);

console.log('✅ auth-bridge.js cargado - AuthService disponible');
