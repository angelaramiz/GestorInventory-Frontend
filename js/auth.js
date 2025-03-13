import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { mostrarMensaje } from './logs.js';

let supabase = null;

// Función para inicializar Supabase
async function inicializarSupabase() {
    try {
        const response = await fetch('https://gestorinventory-backend-production.up.railway.app/api/supabase-config');
        if (!response.ok) {
            throw new Error('No se pudo obtener la configuración de Supabase');
        }
        const config = await response.json();

        const SUPABASE_URL = config.supabaseUrl;
        const SUPABASE_KEY = config.supabaseKey;
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Verificar que Supabase se inicializó correctamente
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.warn('No hay sesión activa al inicializar Supabase:', error);
        } else {
            // mostrarMensaje('Conexión a Supabase establecida', 'info');
        }
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        mostrarMensaje('Error al conectar con el servidor', 'error');
    }
}

// Login
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase al cargar la página
    await inicializarSupabase();

    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('supabase.auth.token', data.user.access_token);
                localStorage.setItem('supabase.auth.refresh', data.user.refresh_token);
                localStorage.setItem('usuario_id', data.user.user.id);

                // Configurar el token en el cliente Supabase
                await supabase.auth.setSession({
                    access_token: data.user.access_token,
                    refresh_token: data.user.refresh_token
                });

                mostrarMensaje('Inicio de sesión exitoso', 'success');
                setTimeout(() => {
                    window.location.href = './plantillas/main.html';
                }, 500);
            } else {
                mostrarMensaje(data.error, 'error');
            }
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
                mostrarMensaje('Todos los campos son obligatorios', 'error');
                return;
            }
            if (password !== confirmPassword) {
                mostrarMensaje('Las contraseñas no coinciden', 'error');
                return;
            }

            const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            if (data.success) {
                mostrarMensaje('Registro exitoso. Redirigiendo...', 'success');
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
                mostrarMensaje(data.error || 'Error al registrar el usuario', 'error');
            }
        });
    }
});

function isTokenExpired(token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convertir a milisegundos
    if (Date.now() > expirationTime) {
        // Mostrar ventana dinámica de inicio de sesión
        Swal.fire({
            title: 'Sesión expirada',
            html: `
                <p>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.</p>
                <form id="formLoginSwal">
                    <input type="email" id="emailSwal" class="swal2-input" placeholder="Email" required>
                    <input type="password" id="passwordSwal" class="swal2-input" placeholder="Contraseña" required>
                </form>
            `,
            showCancelButton: false,
            confirmButtonText: 'Iniciar sesión',
            preConfirm: () => {
                const email = document.getElementById('emailSwal').value;
                const password = document.getElementById('passwordSwal').value;
                return { email, password };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { email, password } = result.value;
                const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(data.user));
                    localStorage.setItem('usuario_id', data.user.id);
                    mostrarMensaje('Inicio de sesión exitoso', 'success');
                    window.location.reload(); // Recargar la página para aplicar el nuevo token
                } else {
                    mostrarMensaje(data.error, 'error');
                }
            }
        });
        return true;
    }
    return false;
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

// Exportar Supabase
export { supabase };
