/**
 * ⚠️ ARCHIVO DEPRECADO - Usar AuthenticationService y SessionService
 * 
 * Este archivo se mantiene únicamente por compatibilidad hacia atrás.
 * Todo el código nuevo debe usar los servicios modernos directamente.
 * 
 * MIGRACIÓN COMPLETA EN FASE 2:
 * - Servicio: AuthenticationService
 * - Servicio: SessionService
 * - Bridge: auth-bridge.js
 * - Documentado en: docs/PHASE_2_SUMMARY.md
 * 
 * FASE 3: Wrapper para compatibilidad
 * 
 * USO MODERNO:
 * ```javascript
 * // En lugar de:
 * import { getSupabase, verificarSesionValida } from './auth.js';
 * 
 * // Usar:
 * import authService from '../src/core/services/AuthenticationService.js';
 * const supabase = await authService.getSupabase();
 * ```
 * 
 * @deprecated v3.0.0 - Usar AuthenticationService y SessionService
 */

// Re-exportar todas las funciones desde el bridge
export {
    // Cliente Supabase
    supabase,
    getSupabase,
    
    // Gestión de tokens
    isTokenExpired,
    getToken,
    
    // Sesión
    verificarSesionValida,
    verificarTokenAutomaticamente,
    
    // Configuración
    configurarInterceptorSupabase,
    inicializarSistemaPagina,
    
    // Limpieza y redirección
    limpiarSesion,
    getLoginRedirectPath,
    redirectToLogin,
    isLoginPage,
    
    // Debug
    debugRutas,
    
    // Servicio
    service
} from './auth-bridge.js';
