/**
 * AuthService - Servicio de autenticación y gestión de sesiones
 * 
 * Responsabilidades:
 * - Inicialización de Supabase
 * - Login/Logout/Registro de usuarios
 * - Gestión de tokens (verificación, renovación automática)
 * - Control de sesiones (validación, expiración)
 * - Redirecciones y rutas del sistema
 * - Interceptores de peticiones HTTP
 * 
 * @extends BaseService
 */

import { BaseService } from './BaseService.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export class AuthService extends BaseService {
    constructor() {
        super('AuthService');
        
        // Estado interno
        this.supabase = null;
        this.supabaseInitializing = false;
        this.tokenCheckInterval = null;
        this.lastTokenRefresh = null;
        
        // Configuración de respaldo
        this.SUPABASE_CONFIG_BACKUP = {
            supabaseUrl: 'https://mkzyehqtvaopsfjrcgvq.supabase.co',
            supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renplaHF0dmFvcHNmanJjZ3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODMyMzE0NjQsImV4cCI6MTk5ODgwNzQ2NH0.Sa8HFh2901UiRwuCrY6dNonSs6iml5GxCACGHxILPas'
        };

        // Configuración de tokens
        this.tokenConfig = {
            CHECK_INTERVAL: 60000, // 1 minuto
            REFRESH_THRESHOLD: 300, // 5 minutos antes de expirar
            EXPIRY_BUFFER: 5 * 60 * 1000 // 5 minutos en ms
        };
    }

    /**
     * Inicializa el servicio de autenticación
     */
    async initialize() {
        try {
            this.log('Inicializando AuthService...');
            await this.initializeSupabase();
            await this.configurarRutasManifest();
            this.log('✅ AuthService inicializado correctamente');
            return true;
        } catch (error) {
            this.error('Error al inicializar AuthService:', error);
            return false;
        }
    }

    // ==========================================
    // INICIALIZACIÓN DE SUPABASE
    // ==========================================

    /**
     * Inicializa el cliente de Supabase
     */
    async initializeSupabase() {
        // Si ya está inicializado, devolver instancia existente
        if (this.supabase) {
            return this.supabase;
        }

        // Evitar inicializaciones múltiples
        if (this.supabaseInitializing) {
            while (this.supabaseInitializing && !this.supabase) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.supabase;
        }

        this.supabaseInitializing = true;

        try {
            // Intentar obtener configuración del servidor
            const response = await fetch('https://gestorinventory-backend.fly.dev/api/supabase-config', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 segundos de timeout
            });

            if (!response.ok) {
                throw new Error('No se pudo obtener la configuración de Supabase');
            }

            const config = await response.json();

            this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
                auth: {
                    storageKey: 'gestor-inventory-auth-session',
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false,
                    flowType: 'pkce'
                },
                global: {
                    headers: {
                        'X-Client-Info': 'gestor-inventory@1.0.0'
                    }
                }
            });

            this.log('✅ Supabase inicializado con configuración del servidor');
        } catch (error) {
            this.warn('Error al obtener configuración del servidor:', error);
            
            // Usar configuración de respaldo
            try {
                this.supabase = createClient(
                    this.SUPABASE_CONFIG_BACKUP.supabaseUrl, 
                    this.SUPABASE_CONFIG_BACKUP.supabaseKey, 
                    {
                        auth: {
                            storageKey: 'gestor-inventory-auth-session',
                            autoRefreshToken: true,
                            persistSession: true,
                            detectSessionInUrl: false,
                            flowType: 'pkce'
                        },
                        global: {
                            headers: {
                                'X-Client-Info': 'gestor-inventory-backup@1.0.0'
                            }
                        }
                    }
                );
                this.log('✅ Supabase inicializado con configuración de respaldo');
            } catch (backupError) {
                this.error('Error crítico al inicializar Supabase:', backupError);
                throw new Error('No se pudo inicializar Supabase');
            }
        } finally {
            this.supabaseInitializing = false;
        }

        return this.supabase;
    }

    /**
     * Obtiene el cliente de Supabase (inicializa si es necesario)
     */
    async getSupabase() {
        if (!this.supabase) {
            await this.initializeSupabase();
        }
        return this.supabase;
    }

    // ==========================================
    // GESTIÓN DE TOKENS
    // ==========================================

    /**
     * Verifica si un token JWT está expirado
     * @param {string} token - Token JWT
     * @returns {boolean} True si está expirado
     */
    isTokenExpired(token) {
        if (!token) return true;

        try {
            if (!token.includes('.')) {
                this.error("Formato de token inválido");
                return true;
            }

            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Convertir a milisegundos
            const bufferTime = this.tokenConfig.EXPIRY_BUFFER;
            const isExpiring = Date.now() > (expirationTime - bufferTime);
            const isExpired = Date.now() > expirationTime;

            return isExpiring || isExpired;
        } catch (error) {
            this.error("Error al verificar la expiración del token:", error);
            return true;
        }
    }

    /**
     * Obtiene el token del localStorage
     * @returns {string|null} Token o null
     */
    getToken() {
        const token = localStorage.getItem('supabase.auth.token');
        
        if (!token) {
            this.warn("No se encontró el token en localStorage.");
            return null;
        }

        return token;
    }

    /**
     * Verifica y renueva el token automáticamente si es necesario
     */
    async verificarYRenovarToken() {
        try {
            if (!this.supabase) {
                this.error('Supabase no está inicializado');
                return false;
            }

            const { data: session, error } = await this.supabase.auth.getSession();
            
            if (error) {
                this.error('Error al obtener sesión:', error.message);
                return false;
            }

            if (!session?.session) {
                this.warn('No hay sesión activa');
                return false;
            }

            const token = session.session.access_token;
            const expiresAt = session.session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt - now;
            const shouldRefresh = timeUntilExpiry < this.tokenConfig.REFRESH_THRESHOLD;

            this.log(`Token expira en ${Math.floor(timeUntilExpiry / 60)} minutos`);

            if (shouldRefresh) {
                this.log('Renovando token...');
                const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();
                
                if (refreshError) {
                    this.error('Error al renovar sesión:', refreshError.message);
                    return false;
                }

                if (refreshData?.session) {
                    this.log('✅ Token renovado exitosamente');
                    this.lastTokenRefresh = Date.now();
                    return true;
                }
            }

            return true;
        } catch (error) {
            this.error('Error en verificarYRenovarToken:', error);
            return false;
        }
    }

    /**
     * Inicializa el sistema de renovación automática de tokens
     */
    inicializarRenovacionAutomatica() {
        // Limpiar interval existente
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }

        // Configurar verificación periódica
        this.tokenCheckInterval = setInterval(async () => {
            const success = await this.verificarYRenovarToken();
            if (!success) {
                this.warn('Fallo en renovación automática');
            }
        }, this.tokenConfig.CHECK_INTERVAL);

        this.log('✅ Sistema de renovación automática inicializado');
    }

    /**
     * Detiene el sistema de renovación automática
     */
    detenerRenovacionAutomatica() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            this.log('🛑 Sistema de renovación automática detenido');
        }
    }

    // ==========================================
    // GESTIÓN DE SESIONES
    // ==========================================

    /**
     * Verifica si la sesión actual es válida
     * @returns {Promise<boolean>}
     */
    async verificarSesionValida() {
        try {
            if (!this.supabase) {
                await this.initializeSupabase();
            }

            const { data: session, error } = await this.supabase.auth.getSession();
            
            if (error || !session?.session) {
                this.warn('Sesión no válida');
                return false;
            }

            // Si la sesión está próxima a expirar, renovarla
            const expiresAt = session.session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt - now;

            if (timeUntilExpiry < 300) { // Menos de 5 minutos
                const renewed = await this.verificarYRenovarToken();
                return renewed;
            }

            return true;
        } catch (error) {
            this.error('Error al verificar sesión:', error);
            return false;
        }
    }

    /**
     * Verifica el token automáticamente y redirige si es necesario
     * @returns {boolean} True si el token es válido
     */
    verificarTokenAutomaticamente() {
        const currentPath = window.location.pathname;
        const isLoginPage = this.isLoginPage(currentPath);

        // Si estamos en la página de login, no verificar token
        if (isLoginPage) {
            this.log("En página de login/registro, no se verifica el token");
            return true;
        }

        const token = this.getToken();

        if (!token) {
            this.log("No hay token de autenticación. Redirigiendo al login...");
            this.redirectToLogin();
            return false;
        }

        if (this.isTokenExpired(token)) {
            this.log("Token expirado. Mostrando diálogo...");
            return false;
        }

        return true;
    }

    /**
     * Limpia los datos de sesión
     */
    limpiarSesion() {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refresh');
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('categoria_id');
        localStorage.removeItem('rol');
        this.log('Sesión limpiada');
    }

    // ==========================================
    // RUTAS Y NAVEGACIÓN
    // ==========================================

    /**
     * Verifica si la ruta actual es una página de login/registro
     * @param {string} path - Ruta actual
     * @returns {boolean}
     */
    isLoginPage(path) {
        return path.endsWith('index.html') ||
               path === '/' ||
               path.endsWith('/') ||
               path.endsWith('register.html') ||
               path.endsWith('confirm-email.html') ||
               path.endsWith('request-password-reset.html') ||
               path.endsWith('reset-password.html');
    }

    /**
     * Calcula la ruta correcta al login
     * @returns {string} Ruta al login
     */
    getLoginRedirectPath() {
        const currentPath = window.location.pathname;
        const hostname = window.location.hostname;

        // En desarrollo (localhost)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (currentPath.includes('/plantillas/')) {
                return '../index.html';
            }
            return './index.html';
        }

        // En producción
        return '/GestorInventory-Frontend/index.html';
    }

    /**
     * Redirige al login con un delay opcional
     * @param {number} delay - Delay en milisegundos
     */
    redirectToLogin(delay = 1500) {
        setTimeout(() => {
            window.location.href = this.getLoginRedirectPath();
        }, delay);
    }

    /**
     * Configura las rutas del manifest dinámicamente
     */
    async configurarRutasManifest() {
        const configureManifest = () => {
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {
                const hostname = window.location.hostname;
                const currentPath = window.location.pathname;

                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    if (currentPath.includes('/plantillas/')) {
                        manifestLink.href = '../manifest.json';
                    } else {
                        manifestLink.href = './manifest.json';
                    }
                } else {
                    manifestLink.href = '/GestorInventory-Frontend/manifest.json';
                }

                this.log('Manifest configurado para:', manifestLink.href);
            } else {
                this.warn('No se encontró el elemento link[rel="manifest"]');
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', configureManifest);
        } else {
            configureManifest();
        }
    }

    /**
     * Debug de información de rutas
     */
    debugRutas() {
        this.log('=== DEBUG DE RUTAS ===');
        this.log('pathname:', window.location.pathname);
        this.log('hostname:', window.location.hostname);
        this.log('href:', window.location.href);
        this.log('Ruta de login:', this.getLoginRedirectPath());
        this.log('======================');
    }

    // ==========================================
    // INTERCEPTORES
    // ==========================================

    /**
     * Configura interceptor para verificar tokens en peticiones a Supabase
     */
    async configurarInterceptorSupabase() {
        if (!this.supabase) {
            await this.initializeSupabase();
        }

        const originalFetch = window.fetch;
        const self = this;

        window.fetch = async function(...args) {
            const [url, options = {}] = args;

            // Solo interceptar peticiones a Supabase
            if (url.includes('supabase') || (options.headers && options.headers['apikey'])) {
                const token = localStorage.getItem('supabase.auth.token');

                if (token && self.isTokenExpired(token)) {
                    self.log("Token expirado detectado antes de petición a Supabase");
                    
                    // Notificar solo una vez por sesión
                    if (!window.tokenExpirationNotified) {
                        window.tokenExpirationNotified = true;
                    }
                }
            }

            return originalFetch.apply(this, args);
        };

        this.log('✅ Interceptor de Supabase configurado');
    }

    // ==========================================
    // INICIALIZACIÓN DE SISTEMA
    // ==========================================

    /**
     * Inicializa el sistema de autenticación para una página
     */
    async inicializarSistemaPagina() {
        try {
            const currentPath = window.location.pathname;
            const isLoginPage = this.isLoginPage(currentPath);

            if (isLoginPage) {
                this.log('En página de login/registro, no inicializar renovación automática');
                return;
            }

            if (!this.supabase) {
                await this.initializeSupabase();
            }

            const { data: session, error } = await this.supabase.auth.getSession();
            
            if (error || !session?.session) {
                this.warn('No hay sesión válida, redirigiendo al login');
                this.redirectToLogin(0);
                return;
            }

            // Inicializar sistema de renovación automática
            this.inicializarRenovacionAutomatica();
            this.log('✅ Sistema de página inicializado');

            // Verificar inmediatamente el estado del token
            await this.verificarYRenovarToken();

        } catch (error) {
            this.error('Error al inicializar sistema de página:', error);
        }
    }
}

// Crear instancia singleton
export const authService = new AuthService();

// Auto-inicializar cuando se carga el DOM
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            authService.inicializarSistemaPagina().catch(error => {
                console.error('Error en inicialización automática de AuthService:', error);
            });
        });
    } else {
        authService.inicializarSistemaPagina().catch(error => {
            console.error('Error en inicialización automática de AuthService:', error);
        });
    }
}
