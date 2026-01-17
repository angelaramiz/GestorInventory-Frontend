import { getSupabase } from './auth.js';
import { validatePasswordWithConfirmation } from '../utils/password-validator.js';

// Script para la página templates/reset-password.html
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = await getSupabase();
    if (!supabase) {
        Swal.fire('Error', 'Servicio de autenticación no disponible', 'error');
        return;
    }

    const url = new URL(window.location.href);
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');
    const type = url.searchParams.get('type'); // suele ser 'recovery'

    // Si la URL contiene tokens de recuperación, establecer la sesión para permitir actualizar la contraseña
    if (access_token) {
        try {
            await supabase.auth.setSession({ access_token, refresh_token });
        } catch (e) {
            console.warn('No se pudo setear sesión desde URL:', e);
        }
    }

    const form = document.getElementById('formSetNewPassword');
    const info = document.getElementById('resetInfo');

    if (!form) {
        console.error('formSetNewPassword no encontrado en la página');
        return;
    }

    // Si no hay token en la URL, indicar al usuario que solicite otro email
    if (!access_token && type !== 'recovery') {
        info.innerText = 'El enlace de restablecimiento no contiene token válido. Solicita un nuevo enlace desde la página de recuperación.';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('newPassword').value;
        const pw2 = document.getElementById('confirmPassword').value;

        // Validar contraseña usando utilidad centralizada
        const validation = validatePasswordWithConfirmation(pw, pw2);
        if (!validation.isValid) {
            Swal.fire('Error', validation.error, 'error');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) {
                console.error('Error updating password:', error);
                Swal.fire('Error', error.message || 'No se pudo actualizar la contraseña', 'error');
                return;
            }

            Swal.fire({
                title: 'Contraseña actualizada',
                text: 'Tu contraseña se actualizó correctamente. Serás redirigido al login.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
            });

            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1800);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Error al actualizar la contraseña', 'error');
        }
    });
});
