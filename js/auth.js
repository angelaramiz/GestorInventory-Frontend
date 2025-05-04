import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { mostrarAlertaBurbuja } from './logs.js'; // Importar la nueva función
import { resetearBaseDeDatos, db } from './db-operations.js';

let supabase = null;

// Función para inicializar Supabase
async function inicializeSupabase() {
    if (!supabase) { // ✅ Evita crear más de una instancia
        try {
            const response = await fetch('https://gestorinventory-backend-production.up.railway.app/api/supabase-config');
            if (!response.ok) throw new Error('No se pudo obtener la configuración de Supabase');
            const config = await response.json();
            supabase = createClient(config.supabaseUrl, config.supabaseKey);
            console.log('Supabase inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar Supabase:', error);
            mostrarAlertaBurbuja('Error al inicializar Supabase. Verifica tu conexión.', 'error');
        }
    }
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
    await inicializeSupabase();

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

            const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/registro', {
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
        const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
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

// Función para mostrar el diálogo de inicio de sesión cuando el token está expirado
export function mostrarDialogoSesionExpirada() {
    return Swal.fire({
        title: 'Sesión expirada',
        html: `
            <p>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.</p>
            <form id="formLoginSwal">
                <input type="email" id="emailSwal" class="swal2-input" placeholder="Email" required>
                <input type="password" id="passwordSwal" class="swal2-input" placeholder="Contraseña" required>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Cerrar',
        allowOutsideClick: false,
        preConfirm: () => {
            const email = document.getElementById('emailSwal').value;
            const password = document.getElementById('passwordSwal').value;
            if (!email || !password) {
                Swal.showValidationMessage('Por favor completa todos los campos');
                return false;
            }
            return { email, password };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { email, password } = result.value;
            try {
                const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (data.success && data.user) {
                    const { access_token, refresh_token, user } = data.user;
                    if (access_token && refresh_token && user) {
                        localStorage.setItem('supabase.auth.token', access_token);
                        localStorage.setItem('supabase.auth.refresh', refresh_token);
                        localStorage.setItem('usuario_id', user.id);
                        localStorage.setItem('categoria_id', user.categoria_id);
                        localStorage.setItem('rol', user.rol);

                        // Configurar el token en el cliente Supabase
                        await supabase.auth.setSession({
                            access_token: access_token,
                            refresh_token: refresh_token
                        });

                        mostrarAlertaBurbuja('Sesión renovada exitosamente', 'success');
                        return true;
                    }
                } else {
                    mostrarAlertaBurbuja(data.error || 'Error al iniciar sesión', 'error');
                }
            } catch (error) {
                console.error('Error al renovar la sesión:', error);
                mostrarAlertaBurbuja('Error de conexión con el servidor', 'error');
            }
        } else {
            // Si el usuario cancela, lo redirigimos a la página de login
            window.location.href = '/index.html';
        }
        return false;
    });
}

// Función para verificar automáticamente la expiración del token
export function verificarTokenAutomaticamente() {
    const token = localStorage.getItem('supabase.auth.token');
    
    if (!token) {
        // Si no hay token, redirigir al login solo si no estamos ya en la página de login
        const isLoginPage = window.location.pathname.includes('index.html') || 
                           window.location.pathname === '/' || 
                           window.location.pathname === '/register.html';
        
        if (!isLoginPage) {
            console.log("No hay token de autenticación. Redirigiendo al login...");
            mostrarAlertaBurbuja('Sesión no iniciada. Por favor, inicia sesión.', 'warning');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        }
        return false;
    }
    
    if (isTokenExpired(token)) {
        console.log("Token expirado. Mostrando diálogo de inicio de sesión...");
        return mostrarDialogoSesionExpirada();
    }
    
    return true;
}

// Configurar interceptor para verificar el token antes de cada petición a Supabase
export async function configurarInterceptorSupabase() {
    if (!supabase) await inicializeSupabase();
    
    // Configurar interceptor para las peticiones a Supabase
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options = {}] = args;
        
        // Solo interceptamos las peticiones a Supabase
        if (url.includes('supabase') || (options.headers && options.headers['apikey'])) {
            const token = localStorage.getItem('supabase.auth.token');
            
            // Verificar si el token está expirado
            if (token && isTokenExpired(token)) {
                console.log("Token expirado detectado antes de una petición a Supabase");
                const renovado = await mostrarDialogoSesionExpirada();
                if (!renovado) {
                    // Si no se pudo renovar el token, rechazar la petición
                    return Promise.reject(new Error("Sesión expirada y no renovada"));
                }
                
                // Si se renovó el token, actualizar los headers con el nuevo token
                const newToken = localStorage.getItem('supabase.auth.token');
                if (options.headers && options.headers['Authorization']) {
                    options.headers['Authorization'] = `Bearer ${newToken}`;
                }
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
