// Módulo de utilidades para lotes-avanzado.js

// Función para generar IDs únicos
export function generarIdUnico() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Función para sanitizar entrada
export function sanitizarEntrada(entrada) {
    if (typeof entrada !== 'string') {
        return '';
    }
    return entrada.trim();
}

// Función para reproducir sonido de confirmación
export function reproducirSonidoConfirmacion() {
    try {
        // Crear un contexto de audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frecuencia en Hz
        oscillator.type = 'sine'; // Tipo de onda

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volumen
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3); // Duración
    } catch (error) {
        console.warn('No se pudo reproducir el sonido de confirmación:', error);
    }
}

// Función para mostrar animación de procesamiento
export function mostrarAnimacionProcesamiento(mensaje, tipo) {
    const reader = document.getElementById('reader-lotes-avanzado');
    let overlay = document.getElementById('processingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.className = 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        reader.appendChild(overlay);
    }

    let iconHTML = '';
    let colorClass = '';

    switch (tipo) {
        case 'processing':
            iconHTML = '⏳';
            colorClass = 'bg-blue-500';
            break;
        case 'success':
            iconHTML = '✅';
            colorClass = 'bg-green-500';
            break;
        case 'error':
            iconHTML = '❌';
            colorClass = 'bg-red-500';
            break;
        default:
            iconHTML = 'ℹ️';
            colorClass = 'bg-gray-500';
    }

    overlay.innerHTML = `
        <div class="${colorClass} text-white p-4 rounded-lg flex items-center space-x-3">
            ${iconHTML}
            <span class="font-semibold">${mensaje}</span>
        </div>
    `;

    overlay.style.display = 'flex';
}

// Función para ocultar animación de procesamiento
export function ocultarAnimacionProcesamiento() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Funciones auxiliares para evitar dependencias circulares
export function mostrarMensaje(mensaje, tipo) {
    console.log(`${tipo}: ${mensaje}`);
}

export function mostrarAlertaBurbuja(mensaje, tipo) {
    console.log(`Alerta ${tipo}: ${mensaje}`);
}