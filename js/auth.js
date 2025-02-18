import { mostrarMensaje } from './logs.js';

document.addEventListener('DOMContentLoaded', () => {
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
            console.log(`Respuesta del backend:`, data); // <-- Muestra en consola qué devuelve

            if (data.success) {
                // Guardar token JWT
                localStorage.setItem('supabase.auth.token', data.user.access_token); // ✅ Guarda solo el token
                localStorage.setItem('supabase.auth.refresh', data.user.refresh_token); // ✅ Guarda el token de refresco
                localStorage.setItem('usuario_id', data.user.user.id); // ✅ Guarda el ID del usuario

                mostrarMensaje('Inicio de sesión exitoso', 'exito');
                // console.log('datos obtenidos', data.user.user.id);
                setTimeout(() => {
                    window.location.href = './plantillas/main.html'; // Redirigir al login después del registro
                }, 1000);
            } else {
                mostrarMensaje(data.error, 'error');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const formRegistro = document.getElementById('formRegistro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Obtener los valores del formulario
            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            // Validar que no haya campos vacíos
            if (!nombre || !email || !password) {
                mostrarMensaje('Todos los campos son obligatorios', 'error');
                return;
            }
            // Validar que las contraseñas coincidan
            if (password !== confirmPassword) {
                mostrarMensaje('Las contraseñas no coinciden', 'error');
                return;
            }
            console.log({ nombre, email, password });
            // Enviar los datos al backend
            const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            // Mostrar mensaje de éxito o error
            if (data.success) {
                mostrarMensaje('Registro exitoso. Redirigiendo...', 'exito');
                setTimeout(() => {
                    window.location.href = './index.html'; // Redirigir al login después del registro
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
                    mostrarMensaje('Inicio de sesión exitoso', 'exito');
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
