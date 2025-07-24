import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { mostrarAlertaBurbuja } from './logs.js'; // Importar la nueva función
import { resetearBaseDeDatos, db } from './db-operations.js';
import { getTokenConfig, logTokenEvent } from './token-config.js';

let supabase = null;
let supabaseInitializing = false; // Flag para evitar inicializaciones múltiples

// Configuración de respaldo para cuando no se pueda conectar al servidor
const SUPABASE_CONFIG_BACKUP = {
    supabaseUrl: 'https://mkzyehqtvaopsfjrcgvq.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renplaHF0dmFvcHNmanJjZ3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODMyMzE0NjQsImV4cCI6MTk5ODgwNzQ2NH0.Sa8HFh2901UiRwuCrY6dNonSs6iml5GxCACGHxILPas'
};

// Función para inicializar Supabase
async function inicializeSupabase() {
    // Si ya está inicializado o en proceso de inicialización, devolver la instancia existente
    if (supabase) {
        return supabase;
    }

    if (supabaseInitializing) {
        // Esperar a que termine la inicialización en curso
        while (supabaseInitializing && !supabase) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return supabase;
    }

    supabaseInitializing = true;

    try {
        // Intentar obtener la configuración del servidor
        const response = await fetch('https://gestorinventory-backend.fly.dev/api/supabase-config', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // Reducir el tiempo de espera para una respuesta más rápida si hay problemas
            signal: AbortSignal.timeout(5000) // 5 segundos de timeout
        });

        if (!response.ok) throw new Error('No se pudo obtener la configuración de Supabase');

        const config = await response.json();

        // Evitar múltiples instancias usando la misma key de almacenamiento
        supabase = createClient(config.supabaseUrl, config.supabaseKey, {
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
        console.log('✅ Supabase inicializado correctamente con configuración del servidor');
    } catch (error) {
        console.error('❌ Error al obtener configuración del servidor:', error);
        mostrarAlertaBurbuja('Usando configuración local de respaldo para Supabase', 'warning');

        // Usar configuración de respaldo
        try {
            supabase = createClient(SUPABASE_CONFIG_BACKUP.supabaseUrl, SUPABASE_CONFIG_BACKUP.supabaseKey, {
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
            });
            console.log('✅ Supabase inicializado con configuración de respaldo');
        } catch (backupError) {
            console.error('❌ Error al inicializar Supabase con configuración de respaldo:', backupError);
            mostrarAlertaBurbuja('Error crítico al inicializar Supabase', 'error');
            throw new Error('No se pudo inicializar Supabase');
        }
    } finally {
        supabaseInitializing = false;
    }

    return supabase;
}

// Función para obtener el cliente de Supabase
export async function getSupabase() {
    if (!supabase) {
        await inicializeSupabase();
    }
    return supabase;
}

// Exportar el cliente Supabase directamente
export { supabase };

// Login
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase al cargar la página
    try {
        await inicializeSupabase();
    } catch (error) {
        console.error('Error al inicializar Supabase en carga de página:', error);
    }

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

            const response = await fetch('https://gestorinventory-backend.fly.dev/productos/registro', {
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
});

async function iniciarSesion(email, password) {
    try {
        const response = await fetch('https://gestorinventory-backend.fly.dev/productos/login', {
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

                // Configurar el token en el cliente Supabase
                await supabase.auth.setSession({
                    access_token: access_token,
                    refresh_token: refresh_token
                });

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
    if (!supabase) await inicializeSupabase();

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

// Función para detener la renovación automática
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
            await inicializeSupabase();
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
        // Verificar si no estamos en la página de login/registro
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('index.html') || 
                           currentPath.includes('register.html') || 
                           currentPath === '/' ||
                           currentPath.endsWith('/GestorInventory-Frontend/');

        if (isLoginPage) {
            console.log('En página de login/registro, no inicializar renovación automática');
            return;
        }

        // Verificar si hay una sesión válida
        if (!supabase) {
            await inicializeSupabase();
        }

        const { data: session, error } = await supabase.auth.getSession();
        
        if (error || !session?.session) {
            console.warn('No hay sesión válida, redirigiendo al login');
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSistemaPagina);
} else {
    // Si el DOM ya está cargado, ejecutar inmediatamente
    inicializarSistemaPagina();
}
