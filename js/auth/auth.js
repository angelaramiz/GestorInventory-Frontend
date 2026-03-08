import { mostrarAlertaBurbuja } from '../utils/logs.js'; // Importar la nueva función
import { resetearBaseDeDatos, db } from '../db/db-operations.js';
import { getTokenConfig, logTokenEvent } from './token-config.js';
import { BASE_URL } from '../core/configuraciones.js';
import { sessionManager } from './session-manager.js';
import { backendStatusMonitor } from '../utils/backend-status.js';

let supabase = null;
let supabaseInitializing = false; // Flag para evitar inicializaciones múltiples

// Sin configuración de respaldo: las credenciales solo se obtienen del backend.

// Función para obtener createClient de forma segura
function getCreateClientFn() {
    // Supabase se carga vía script tag, está disponible en window.supabase
    if (window.supabase && window.supabase.createClient) {
        return window.supabase.createClient;
    }
    // Fallback si se cargó como módulo
    if (window.createClient) {
        return window.createClient;
    }
    return null;
}

// Función para inicializar Supabase
async function inicializeSupabase() {
    // Si ya está inicializado o en proceso de inicialización, devolver la instancia existente
    if (supabase) {
        return supabase;
    }

    if (supabaseInitializing) {
        // Esperar a que termine la inicialización en curso
        let attempts = 0;
        while (supabaseInitializing && !supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (supabase) return supabase;
        return null;
    }

    supabaseInitializing = true;

    try {
        // Esperar a que Supabase esté disponible globalmente
        let attempts = 0;
        while (!getCreateClientFn() && attempts < 50) {
            console.log('⏳ Esperando a que Supabase se cargue...', attempts);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        const createClientFn = getCreateClientFn();
        if (!createClientFn) {
            throw new Error('createClient no está disponible. Supabase no se cargó correctamente.');
        }

        console.log('✅ createClient disponible');

        let config = null;
        
        // Verificar disponibilidad del backend ANTES de intentar fetch
        console.log('🔍 Verificando disponibilidad del backend...');
        const backendAvailable = await backendStatusMonitor.checkBackendAvailability(2);
        
        // Intentar obtener la configuración del servidor si está disponible
        if (backendAvailable) {
            try {
                console.log('📡 Intentando obtener configuración de Supabase desde el servidor...');
                const response = await fetch(`${BASE_URL}/api/supabase-config`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000) // 5 segundos de timeout
                });

                if (response.ok) {
                    config = await response.json();
                    console.log('✅ Configuración obtenida del servidor');
                } else {
                    throw new Error(`Status: ${response.status}`);
                }
            } catch (fetchError) {
                console.warn('⚠️ No se pudo obtener config del servidor, usando respaldo:', fetchError.message);
            }
        } else {
            console.warn('⚠️ Backend no disponible, no se puede obtener configuración de Supabase');
        }

        // Si no se obtuvo del servidor, no se puede continuar
        if (!config) {
            throw new Error('No se pudo obtener la configuración de Supabase. Verifica tu conexión a internet.');
        }

        // Validar que tenemos URL y KEY
        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error('❌ Configuración incompleta:', {
                hasUrl: !!config.supabaseUrl,
                hasKey: !!config.supabaseKey
            });
            throw new Error('Configuración de Supabase incompleta: URL y KEY requeridas');
        }

        console.log('🔧 Creando cliente Supabase con URL:', config.supabaseUrl?.substring(0, 40) + '...');
        
        // Crear cliente de Supabase
        try {
            supabase = createClientFn(config.supabaseUrl, config.supabaseKey, {
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
            
            // Verificar que el cliente se creó correctamente
            if (!supabase) {
                throw new Error('createClient() devolvió null');
            }
            
            // Verificar que el cliente tiene las propiedades esperadas
            if (!supabase.auth) {
                console.warn('⚠️ Cliente Supabase sin propiedad "auth"');
            }
            
            console.log('✅ Supabase inicializado correctamente');
            console.log('   URL:', config.supabaseUrl?.substring(0, 30) + '...');
            console.log('   Auth disponible:', !!supabase.auth);
            // Exponer el cliente y la función de obtención globalmente para compatibilidad
            try {
                window.supabase = supabase;
            } catch (e) {
                // En entornos donde window no está disponible, ignorar
            }
        } catch (clientError) {
            console.error('❌ Error al crear cliente Supabase:', clientError.message);
            console.error('   Stack:', clientError.stack);
            throw clientError;
        }
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        console.error('   Detalles:', error.message);
        console.error('   Stack:', error.stack);
        supabase = null;
        try {
            // Asegurar que la referencia global se limpie si la inicialización falla
            window.supabase = null;
        } catch (e) {
            // Ignorar si no existe window
        }
        // No lanzar error, solo devolver null para graceful degradation
    } finally {
        supabaseInitializing = false;
    }

    return supabase;
}

// Función para obtener el cliente de Supabase
export async function getSupabase() {
    if (!supabase) {
        try {
            await inicializeSupabase();
        } catch (error) {
            console.error('Error crítico al inicializar Supabase:', error);
            return null;
        }
    }
    return supabase;
}

// Exponer la función getSupabase en window para compatibilidad con módulos antiguos
try {
    window.getSupabase = getSupabase;
} catch (e) {
    // Ignorar si no existe window
}

// Login
document.addEventListener('DOMContentLoaded', async () => {
    // Retrasar la inicialización de Supabase para después de que todo esté listo
    console.log('🚀 Iniciando DOMContentLoaded event listener...');
    
    // Usar setTimeout para retrasar la inicialización
    setTimeout(async () => {
        try {
            const result = await inicializeSupabase();
            if (!result) {
                console.warn('⚠️ Supabase no se inicializó correctamente, continuando sin él');
            }
            // Intento opcional de login biométrico si existe usuario recordado y credencial
            try {
                const rememberedEmail = sessionManager.getRememberedUser() || localStorage.getItem('email');
                if (rememberedEmail) {
                    const hasCred = await sessionManager.hasBiometricCredential(rememberedEmail);
                    if (hasCred) {
                        const doAuto = await Swal.fire({
                            title: 'Inicio con biometría',
                            text: `Se detectó una credencial biométrica para ${rememberedEmail}. ¿Deseas iniciar sesión con biometría?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, usar biometría',
                            cancelButtonText: 'No'
                        });

                        if (doAuto.isConfirmed) {
                            Swal.fire({ title: 'Autenticando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                            const ok = await sessionManager.authenticateWithBiometric(rememberedEmail);
                            Swal.close();
                            if (ok) {
                                // Intentar solicitar sesión al backend por biometric-login (endpoint opcional)
                                try {
                                    const resp = await fetch(`${BASE_URL}/productos/biometric-login`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: rememberedEmail })
                                    });
                                    if (resp.ok) {
                                        const json = await resp.json();
                                        if (json.success && json.user) {
                                            // Reutilizar la función iniciarSesion con tokens si el backend devuelve estructura esperada
                                            const { access_token, refresh_token, user } = json.user;
                                            if (access_token && refresh_token && user) {
                                                localStorage.setItem('supabase.auth.token', access_token);
                                                localStorage.setItem('supabase.auth.refresh', refresh_token);
                                                localStorage.setItem('usuario_id', user.id);
                                                localStorage.setItem('categoria_id', user.categoria_id);
                                                localStorage.setItem('rol', user.rol);
                                                localStorage.setItem('email', rememberedEmail);

                                                sessionManager.saveSession({
                                                    access_token,
                                                    refresh_token,
                                                    usuario_id: user.id,
                                                    categoria_id: user.categoria_id,
                                                    rol: user.rol,
                                                    email: rememberedEmail,
                                                    nombre: user.nombre || 'Usuario'
                                                });

                                                inicializarRenovacionAutomatica();
                                                mostrarAlertaBurbuja('Inicio de sesión por biometría exitoso', 'success');
                                                setTimeout(() => {
                                                    window.location.href = './plantillas/main.html';
                                                }, 500);
                                            }
                                        }
                                    } else {
                                        console.warn('biometric-login no implementado en backend o falló');
                                        mostrarAlertaBurbuja('Autenticación biométrica completada localmente (sin sesión servidor)', 'warning');
                                    }
                                } catch (err) {
                                    console.warn('Error contactando endpoint biometric-login:', err);
                                    mostrarAlertaBurbuja('Autenticación biométrica completada localmente (sin sesión servidor)', 'warning');
                                }
                            } else {
                                mostrarAlertaBurbuja('Autenticación biométrica fallida', 'error');
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Error en intento biométrico automático:', err);
            }
        } catch (error) {
            console.error('Error al inicializar Supabase en carga de página:', error);
        }
    }, 100); // Retrasar 100ms para asegurar que otros scripts se hayan cargado

    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            await iniciarSesion(email, password);
        });
    }

    // Registro
    const formRegistro = document.getElementById('formRegistro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!nombre || !email || !password) {
                mostrarAlertaBurbuja('Todos los campos son obligatorios', 'error');
                return;
            }
            if (password !== confirmPassword) {
                mostrarAlertaBurbuja('Las contraseñas no coinciden', 'error');
                return;
            }

            const response = await fetch(`${BASE_URL}/productos/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            if (data.success) {
                mostrarAlertaBurbuja('Registro exitoso. Redirigiendo...', 'success');
                Swal.fire({
                    title: 'Registro exitoso',
                    html: 'Por favor, verifica tu correo electrónico antes de iniciar sesión. Redirigiendo al inicio de sesión...',
                    icon: 'success',
                    timer: 4000,
                    showConfirmButton: false
                });
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 2000);
            } else {
                mostrarAlertaBurbuja(data.error || 'Error al registrar el usuario', 'error');
            }
        });
    }

    // Recuperación de contraseña
    const formPasswordReset = document.getElementById('formPasswordReset');
    if (formPasswordReset) {
        formPasswordReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;

            if (!email) {
                mostrarAlertaBurbuja('Por favor ingresa tu correo electrónico', 'error');
                return;
            }

            try {
                const response = await fetch(`${BASE_URL}/productos/request-password-reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    mostrarAlertaBurbuja('Se ha enviado un enlace de recuperación a tu correo', 'success');
                    document.getElementById('formPasswordReset').reset();
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 2000);
                } else {
                    mostrarAlertaBurbuja(data.error || 'Error al solicitar recuperación de contraseña', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarAlertaBurbuja('Error de conexión con el servidor', 'error');
            }
        });
    }
});

async function iniciarSesion(email, password) {
    try {
        const response = await fetch(`${BASE_URL}/productos/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            if (response.status === 429) {
                // Bloqueo por demasiados intentos
                let retrySeconds = 60;
                let errorData = {};
                try {
                    errorData = await response.json();
                    if (errorData.retry_after) {
                        retrySeconds = parseInt(errorData.retry_after, 10);
                    }
                } catch (e) {
                    // Si no se puede parsear, usar valor por defecto
                }
                mostrarBloqueoLogin(retrySeconds);
                mostrarAlertaBurbuja('Demasiados intentos. Espera antes de volver a intentar.', 'error');
                return;
            }
            const errorData = await response.json();
            mostrarAlertaBurbuja(errorData.error || 'Error al iniciar sesión', 'error');
            return;
        }

        const data = await response.json();

        if (data.success && data.user) {
            const { access_token, refresh_token, user } = data.user;
            if (access_token && refresh_token && user) {
                localStorage.setItem('supabase.auth.token', access_token);
                localStorage.setItem('supabase.auth.refresh', refresh_token);
                localStorage.setItem('usuario_id', user.id);
                localStorage.setItem('categoria_id', user.categoria_id); // Guardar la categoría
                localStorage.setItem('rol', user.rol); // Guardar el rol del usuario
                localStorage.setItem('email', email); // Guardar email
                localStorage.setItem('nombre', user.nombre || 'Usuario');

                // Guardar sesión en SessionManager para persistencia
                sessionManager.saveSession({
                    access_token,
                    refresh_token,
                    usuario_id: user.id,
                    categoria_id: user.categoria_id,
                    rol: user.rol,
                    email: email,
                    nombre: user.nombre || 'Usuario'
                });

                // Configurar el token en el cliente Supabase (si está disponible)
                if (supabase && supabase.auth) {
                    try {
                        await supabase.auth.setSession({
                            access_token: access_token,
                            refresh_token: refresh_token
                        });
                    } catch (sessionError) {
                        console.warn('No se pudo setear la sesión en Supabase:', sessionError);
                        // Continuar sin error, el token está guardado en localStorage
                    }
                }

                // Inicializar sistema de renovación automática de tokens
                inicializarRenovacionAutomatica();

                mostrarAlertaBurbuja('Inicio de sesión exitoso', 'success');
                setTimeout(() => {
                    window.location.href = './plantillas/main.html';
                    resetearBaseDeDatos(db, "productos"); // Llamar a la función para resetear la base de datos
                }, 500);
            } else {
                mostrarAlertaBurbuja('Datos de usuario incompletos', 'error');
            }
        } else {
            mostrarAlertaBurbuja(data.error || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        console.error('Error completo:', error);
        mostrarAlertaBurbuja('Error de conexión con el servidor', 'error');
    }
}

export function isTokenExpired(token) {
    if (!token) return true;

    try {
        // Verificar el formato del token
        if (!token.includes('.')) {
            console.error("Formato de token inválido");
            return true;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convertir a milisegundos

        // Si faltan menos de 5 minutos para expirar, también lo consideramos expirado
        const bufferTime = 5 * 60 * 1000; // 5 minutos en milisegundos
        const isExpiring = Date.now() > (expirationTime - bufferTime);
        const isExpired = Date.now() > expirationTime;

        if (isExpiring || isExpired) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error al verificar la expiración del token:", error);
        return true; // En caso de error, asumimos que el token está expirado
    }
}

// Función para mostrar mensaje cuando el token está expirado (sin modal de login)
export function mostrarDialogoSesionExpirada() {
    // NO MOSTRAR en páginas públicas
    const currentPath = window.location.pathname;
    const isLoginPage =
        currentPath.endsWith('index.html') ||
        currentPath === '/' ||
        currentPath.endsWith('/') ||
        currentPath.endsWith('register.html') ||
        currentPath.endsWith('confirm-email.html') ||
        currentPath.endsWith('request-password-reset.html') ||
        currentPath.endsWith('reset-password.html');

    if (isLoginPage) {
        console.log('⚠️ Se intentó mostrar diálogo de sesión expirada en página pública, ignorando');
        return false;
    }

    // Mostrar notificación con opción de ir al login
    Swal.fire({
        title: 'Sesión expirada',
        text: 'Tu sesión ha expirado. ¿Quieres ir a la página de inicio de sesión?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir al Login',
        cancelButtonText: 'Seguir sin sesión',
        allowOutsideClick: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = getLoginRedirectPath();
        }
    });

    // Limpiar el token expirado
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refresh');

    // Para mantener compatibilidad con el código que espera un valor booleano
    return false;
}

// Función para verificar automáticamente la expiración del token
export function verificarTokenAutomaticamente() {
    // Determinar si estamos en la página de login o registro
    const currentPath = window.location.pathname;
    const isLoginPage =
        currentPath.endsWith('index.html') ||
        currentPath === '/' ||
        currentPath.endsWith('/') ||
        currentPath.endsWith('register.html') ||
        currentPath.endsWith('confirm-email.html') ||
        currentPath.endsWith('request-password-reset.html') ||
        currentPath.endsWith('reset-password.html');

    // Si estamos en la página de login o registro, no verificamos token
    if (isLoginPage) {
        console.log("En página de login/registro, no se verifica el token");
        return true;
    }

    const token = localStorage.getItem('supabase.auth.token');

    if (!token) {
        // Si no hay token y no estamos en la página de login
        console.log("No hay token de autenticación. Redirigiendo al login...");
        debugRutas(); // Debug info
        mostrarAlertaBurbuja('Sesión no iniciada. Por favor, inicia sesión.', 'warning');
        setTimeout(() => {
            window.location.href = getLoginRedirectPath();
        }, 1500);
        return false;
    }

    if (isTokenExpired(token)) {
        console.log("Token expirado. Mostrando diálogo de inicio de sesión...");
        // IMPORTANTE: mostrarDialogoSesionExpirada() verifica que no sea una página pública
        return mostrarDialogoSesionExpirada();
    }

    return true;
}

// Función auxiliar para obtener la ruta correcta al index.html
function getLoginRedirectPath() {
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;

    // En desarrollo (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Si estamos en una subcarpeta (como plantillas), ir hacia atrás
        if (currentPath.includes('/plantillas/')) {
            return '../index.html';
        }
        // Si estamos en la raíz o en otra ubicación
        return './index.html';
    }

    // En producción
    return '/GestorInventory-Frontend/index.html';
}

// Función de debug para verificar rutas
function debugRutas() {
    console.log('=== DEBUG DE RUTAS ===');
    console.log('window.location.pathname:', window.location.pathname);
    console.log('window.location.hostname:', window.location.hostname);
    console.log('window.location.href:', window.location.href);
    console.log('Ruta de redirección calculada:', getLoginRedirectPath());
    console.log('==================');
}

// Configurar interceptor para verificar el token antes de cada petición a Supabase
export async function configurarInterceptorSupabase() {
    try {
        if (!supabase) {
            const result = await inicializeSupabase();
            if (!result) {
                console.warn('⚠️ No se pudo inicializar Supabase en configurarInterceptorSupabase');
                return;
            }
        }

        // Configurar interceptor para las peticiones a Supabase
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const [url, options = {}] = args;

            // Solo interceptamos las peticiones a Supabase
            if (url.includes('supabase') || (options.headers && options.headers['apikey'])) {
                const token = localStorage.getItem('supabase.auth.token');

                // Verificar si el token está expirado
                if (token && isTokenExpired(token)) {
                    console.log("Token expirado detectado antes de una petición a Supabase");
                    // Solo mostrar alerta una vez por sesión
                    if (!window.tokenExpirationNotified) {
                        mostrarAlertaBurbuja('Tu sesión ha expirado. Algunas funciones pueden no estar disponibles.', 'warning');
                        window.tokenExpirationNotified = true;
                    }

                    // No rechazamos la petición, dejamos que continúe aunque fallará
                    // De esta manera la aplicación sigue funcionando sin interrupciones
                }
            }

            // Continuar con la petición original
            return originalFetch.apply(this, args);
        };
    } catch (error) {
        console.error('Error al configurar interceptor Supabase:', error);
    }
}

export function getToken() {
    const token = localStorage.getItem('supabase.auth.token');

    if (!token) {
        console.warn("No se encontró el token en localStorage.");
        return null;
    }

    try {
        return token; // Ya es una cadena, no es necesario hacer JSON.parse
    } catch (error) {
        console.error("Error al procesar el token de autenticación:", error);
        return null;
    }
}

// Función para configurar rutas dinámicamente según el entorno
function configurarRutasManifest() {
    // Ejecutar inmediatamente o esperar a que el DOM esté listo
    const configureManifest = () => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            const hostname = window.location.hostname;
            const currentPath = window.location.pathname;

            // En desarrollo (localhost)
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Si estamos en una subcarpeta, ajustar la ruta
                if (currentPath.includes('/plantillas/')) {
                    manifestLink.href = '../manifest.json';
                } else {
                    manifestLink.href = './manifest.json';
                }
            } else {
                // En producción
                manifestLink.href = '/GestorInventory-Frontend/manifest.json';
            }

            console.log('Manifest configurado para:', manifestLink.href);
        } else {
            console.warn('No se encontró el elemento link[rel="manifest"]');
        }
    };

    // Si el DOM ya está listo, ejecutar inmediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configureManifest);
    } else {
        configureManifest();
    }
}

// Ejecutar inmediatamente al cargar el script
configurarRutasManifest();

// Variables para manejo de tokens
let tokenCheckInterval = null;
let lastTokenRefresh = null;
const tokenConfig = getTokenConfig();

// Función para verificar y renovar token automáticamente
async function verificarYRenovarToken() {
    try {
        if (!supabase) {
            logTokenEvent('ERROR', { message: 'Supabase no está inicializado' });
            return false;
        }

        const { data: session, error } = await supabase.auth.getSession();
        
        if (error) {
            logTokenEvent('ERROR', { message: 'Error al obtener sesión', error: error.message });
            return false;
        }

        if (!session?.session) {
            logTokenEvent('WARNING', { message: 'No hay sesión activa' });
            return false;
        }

        const token = session.session.access_token;
        const expiresAt = session.session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        // Verificar si el token está próximo a expirar
        const timeUntilExpiry = expiresAt - now;
        const shouldRefresh = timeUntilExpiry < tokenConfig.REFRESH_THRESHOLD;

        logTokenEvent('CHECK', { 
            timeUntilExpiry: Math.floor(timeUntilExpiry / 60), 
            shouldRefresh,
            threshold: Math.floor(tokenConfig.REFRESH_THRESHOLD / 60)
        });

        if (shouldRefresh) {
            logTokenEvent('REFRESH_START', { timeUntilExpiry });
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
                logTokenEvent('REFRESH_ERROR', { error: refreshError.message });
                mostrarAlertaBurbuja('Error al renovar sesión. Por favor, inicia sesión nuevamente.', 'error');
                return false;
            }

            if (refreshData?.session) {
                logTokenEvent('REFRESH_SUCCESS', { 
                    newExpiresAt: refreshData.session.expires_at,
                    oldExpiresAt: expiresAt 
                });
                lastTokenRefresh = Date.now();
                mostrarAlertaBurbuja('Sesión renovada automáticamente', 'success');
                return true;
            }
        }

        return true;
    } catch (error) {
        logTokenEvent('ERROR', { message: 'Error en verificarYRenovarToken', error: error.message });
        return false;
    }
}

// Función para inicializar el sistema de renovación automática
function inicializarRenovacionAutomatica() {
    // Limpiar interval existente si hay uno
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }

    // Configurar verificación periódica
    tokenCheckInterval = setInterval(async () => {
        const success = await verificarYRenovarToken();
        if (!success) {
            logTokenEvent('AUTO_RENEWAL_FAILED');
        }
    }, tokenConfig.CHECK_INTERVAL);

    logTokenEvent('AUTO_RENEWAL_INITIALIZED', { 
        checkInterval: tokenConfig.CHECK_INTERVAL / 1000,
        refreshThreshold: tokenConfig.REFRESH_THRESHOLD 
    });
}

// Función para detener la renovación automática // funcion sin uso actualmente
function detenerRenovacionAutomatica() {
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
        console.log('🛑 Sistema de renovación automática detenido');
    }
}

// Función para verificar si la sesión es válida antes de operaciones críticas
export async function verificarSesionValida() {
    try {
        if (!supabase) {
            const result = await inicializeSupabase();
            if (!result) {
                console.warn('No se pudo inicializar Supabase');
                return false;
            }
        }

        if (!supabase.auth) {
            console.error('Supabase.auth no disponible');
            return false;
        }

        const { data: session, error } = await supabase.auth.getSession();
        
        if (error || !session?.session) {
            console.warn('Sesión no válida, redirigiendo al login');
            mostrarAlertaBurbuja('Sesión expirada. Redirigiendo al login...', 'warning');
            
            // Redirigir al login después de un breve delay
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            
            return false;
        }

        // Si la sesión está próxima a expirar, renovarla
        const expiresAt = session.session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 300) { // Menos de 5 minutos
            const renewed = await verificarYRenovarToken();
            return renewed;
        }

        return true;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        return false;
    }
}

// Función para inicializar el sistema de renovación en páginas del sistema
export async function inicializarSistemaPagina() {
    try {
        // Verificar si estamos en una página pública (sin autenticación requerida)
        const currentPath = window.location.pathname;
        
        // Páginas públicas que no requieren autenticación
        const publicPages = [
            'index.html',
            'register.html',
            'request-password-reset.html',
            'reset-password.html',
            'confirm-email.html',
            '/'
        ];
        
        // Verificar si la ruta actual coincide con alguna página pública
        const isPublicPage = publicPages.some(page => {
            if (page === '/') {
                return currentPath === '/' || currentPath.endsWith('/GestorInventory-Frontend/');
            }
            return currentPath.includes(page);
        });

        if (isPublicPage) {
            console.log('🔓 Página pública detectada, no requiere autenticación:', currentPath);
            return;
        }

        console.log('🔒 Página protegida detectada, verificando autenticación:', currentPath);

        // Verificar si hay una sesión válida
        if (!supabase) {
            await inicializeSupabase();
        }

        const { data: session, error } = await supabase.auth.getSession();
        
        if (error || !session?.session) {
            console.warn('❌ No hay sesión válida, redirigiendo al login');
            window.location.href = getLoginRedirectPath();
            return;
        }

        // Inicializar sistema de renovación automática
        inicializarRenovacionAutomatica();
        console.log('✅ Sistema de renovación automática inicializado para la página');

        // Verificar inmediatamente el estado del token
        await verificarYRenovarToken();

    } catch (error) {
        console.error('Error al inicializar sistema de página:', error);
    }
}

// Event listener para inicializar el sistema cuando se carga el DOM
// Función de logout mejorada
export async function cerrarSesion(rememberUser = true) {
    try {
        // Limpiar sesión del SessionManager
        sessionManager.logout(rememberUser);

        mostrarAlertaBurbuja('Sesión cerrada correctamente', 'success');
        
        // Redirigir al login después de 1 segundo
        setTimeout(() => {
            window.location.href = './index.html';
        }, 1000);

        return true;
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        mostrarAlertaBurbuja('Error al cerrar sesión', 'error');
        return false;
    }
}

// Auto-login si hay sesión válida
function verificarYAutoLogin() {
    // Solo ejecutar en la página de login
    const currentPath = window.location.pathname;
    const isLoginPage = 
        currentPath.endsWith('index.html') || 
        currentPath === '/' || 
        currentPath.endsWith('/');

    if (!isLoginPage) return;

    // Limpiar localStorage de tokens expirados al abrir login
    const token = localStorage.getItem('supabase.auth.token');
    if (token && isTokenExpired(token)) {
        console.warn('⚠️ Token expirado encontrado, limpiando...');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refresh');
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('categoria_id');
        localStorage.removeItem('rol');
        localStorage.removeItem('email');
        localStorage.removeItem('nombre');
        sessionManager.logout(false);
        return;
    }

    // Verificar si hay sesión válida guardada
    if (sessionManager.hasValidSession()) {
        const session = sessionManager.getSession();
        sessionManager.restoreSession(session);
        
        mostrarAlertaBurbuja('Sesión activa detectada', 'success');
        setTimeout(() => {
            window.location.href = './plantillas/main.html';
        }, 500);
    }
}

// Ejecutar verificación de auto-login cuando se cargue la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        verificarYAutoLogin();
        // Solo inicializar sistema de página si NO estamos en una página pública
        const currentPath = window.location.pathname;
        const isLoginPage = 
            currentPath.endsWith('index.html') || 
            currentPath === '/' || 
            currentPath.endsWith('/') ||
            currentPath.endsWith('register.html') ||
            currentPath.endsWith('confirm-email.html') ||
            currentPath.endsWith('request-password-reset.html') ||
            currentPath.endsWith('reset-password.html');
        
        if (!isLoginPage) {
            inicializarSistemaPagina();
        }
    });
} else {
    // Si el DOM ya está cargado, ejecutar inmediatamente
    verificarYAutoLogin();
    // Solo inicializar sistema de página si NO estamos en una página pública
    const currentPath = window.location.pathname;
    const isLoginPage = 
        currentPath.endsWith('index.html') || 
        currentPath === '/' || 
        currentPath.endsWith('/') ||
        currentPath.endsWith('register.html') ||
        currentPath.endsWith('confirm-email.html') ||
        currentPath.endsWith('request-password-reset.html') ||
        currentPath.endsWith('reset-password.html');
    
    if (!isLoginPage) {
        inicializarSistemaPagina();
    }
}
