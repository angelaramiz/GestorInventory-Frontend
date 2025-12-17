// UI helper para registro/autenticación biométrica
import { sessionManager } from './session-manager.js';

function createButton(text, id) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'ml-3 bg-white text-green-600 px-3 py-1 rounded-md border border-green-600 hover:bg-green-50';
    btn.textContent = text;
    return btn;
}

async function handleRegister() {
    const email = localStorage.getItem('email') || sessionManager.getRememberedUser();
    if (!email) {
        Swal.fire('Usuario no encontrado', 'Inicia sesión para poder registrar una credencial biométrica.', 'warning');
        return;
    }

    const confirmed = await Swal.fire({
        title: 'Registrar credencial biométrica',
        text: `Registrar una credencial biométrica para ${email}. ¿Deseas continuar?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Registrar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmed.isConfirmed) return;

    Swal.fire({ title: 'Registrando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const ok = await sessionManager.registerBiometric(email);
    Swal.close();

    if (ok) {
        Swal.fire('Registrado', 'Credencial biométrica registrada correctamente.', 'success');
    } else {
        Swal.fire('Error', 'No se pudo registrar la credencial biométrica.', 'error');
    }
}

async function handleRemove() {
    const email = localStorage.getItem('email') || sessionManager.getRememberedUser();
    if (!email) {
        Swal.fire('Usuario no encontrado', 'Inicia sesión para eliminar la credencial biométrica.', 'warning');
        return;
    }

    const confirmed = await Swal.fire({
        title: 'Eliminar credencial biométrica',
        text: `¿Deseas eliminar la credencial biométrica para ${email}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmed.isConfirmed) return;

    const ok = sessionManager.removeBiometricCredential(email);
    if (ok) {
        Swal.fire('Eliminado', 'Credencial eliminada correctamente.', 'success');
    } else {
        Swal.fire('Error', 'No se pudo eliminar la credencial.', 'error');
    }
}

export function initBiometricUI() {
    document.addEventListener('DOMContentLoaded', () => {
        const header = document.querySelector('header');
        if (!header) return;
        // Mostrar aviso si WebAuthn no está disponible o el contexto no es seguro
        if (!sessionManager.isBiometricAvailable() || !sessionManager.isSecureForWebAuthn()) {
            const notice = document.createElement('div');
            notice.className = 'ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm';
            notice.textContent = 'Biometría no disponible: requiere navegador compatible y contexto seguro (HTTPS o localhost).';
            header.appendChild(notice);
            return;
        }

        const container = document.createElement('div');
        container.id = 'biometricControls';
        container.className = 'flex items-center';

        const regBtn = createButton('Registrar Biometría', 'registerBiometricBtn');
        const delBtn = createButton('Eliminar Biometría', 'removeBiometricBtn');

        regBtn.addEventListener('click', handleRegister);
        delBtn.addEventListener('click', handleRemove);

        container.appendChild(regBtn);
        container.appendChild(delBtn);

        // Insertar al final del header
        header.appendChild(container);
    });
}

// Inicializar automáticamente si se importa como módulo
initBiometricUI();
