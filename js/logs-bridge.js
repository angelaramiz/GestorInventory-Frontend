/**
 * BRIDGE: logs.js → NotificationService
 * 
 * Proporciona compatibilidad hacia atrás para código legacy que importa logs.js
 * 
 * ESTRATEGIA: Re-exportación con adaptación
 * - Mantiene nombres de funciones originales
 * - Adapta llamadas al nuevo NotificationService
 * - Incluye funciones de escáner (requieren scanner.js legacy)
 * 
 * @deprecated Usar NotificationService directamente
 */

import notificationService from '../src/core/services/NotificationService.js';

console.warn('⚠️ logs-bridge.js - Usar NotificationService para nuevo código');

// Importar funciones de scanner legacy (si aún existen)
let iniciarEscaneoConModal, detenerEscaner;
try {
    const scannerModule = await import('./scanner.js');
    iniciarEscaneoConModal = scannerModule.iniciarEscaneoConModal;
    detenerEscaner = scannerModule.detenerEscaner;
} catch (error) {
    console.warn('⚠️ No se pudo importar funciones de scanner.js:', error.message);
}

/**
 * Muestra un mensaje modal
 * @param {string} mensaje - Texto del mensaje
 * @param {string} tipo - Tipo de alerta
 * @param {Object} opciones - Opciones adicionales
 */
export function mostrarMensaje(mensaje, tipo, opciones = {}) {
    return notificationService.mostrarMensaje(mensaje, tipo, opciones);
}

/**
 * Muestra resultado de carga con progreso
 * @param {number} successCount - Operaciones exitosas
 * @param {number} errorCount - Operaciones fallidas
 */
export function mostrarResultadoCarga(successCount, errorCount) {
    // Importar cargarDatosEnTabla si existe (compatibilidad legacy)
    return notificationService.mostrarResultadoCarga(successCount, errorCount, async () => {
        try {
            const dbOps = await import('./db-operations.js');
            if (dbOps.cargarDatosEnTabla) {
                await dbOps.cargarDatosEnTabla();
            }
        } catch (error) {
            console.warn('⚠️ No se pudo cargar datos en tabla:', error.message);
        }
    });
}

/**
 * Muestra alerta tipo burbuja/toast
 * @param {string} mensaje - Texto del mensaje
 * @param {string} tipo - Tipo de alerta
 */
export function mostrarAlertaBurbuja(mensaje, tipo) {
    return notificationService.mostrarAlertaBurbuja(mensaje, tipo);
}

/**
 * Muestra modal de escáner con cámara
 * @param {string} inputId - ID del input destino
 */
export function mostrarModalEscaneo(inputId) {
    // Versión adaptada que usa las funciones legacy de scanner.js
    const modalHtml = `
        <div id="scanner-modal" class="scanner-modal">
            <div class="scanner-modal-content">
                <span class="scanner-close-btn">&times;</span>
                <h2>Escanear Código</h2>
                <div id="scanner-container-modal">
                    <div id="reader"></div>
                </div>
                <div class="scanner-loader">Cargando cámara...</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('scanner-modal');
    const closeButton = document.querySelector('.scanner-close-btn');
    const loader = document.querySelector('.scanner-loader');

    // Animación de entrada
    setTimeout(() => modal.classList.add('scanner-modal-show'), 10);

    // Iniciar escáner después de la animación
    setTimeout(() => {
        if (iniciarEscaneoConModal) {
            iniciarEscaneoConModal(inputId);
        }
        loader.style.display = 'none';
        
        const scannerContainer = document.getElementById('scanner-container-modal');
        if (scannerContainer) {
            scannerContainer.style.display = 'block';
            scannerContainer.offsetHeight; // Trigger reflow
        }
    }, 500);

    // Cerrar modal
    closeButton.onclick = () => cerrarModalEscaneo(modal);
    window.onclick = event => {
        if (event.target === modal) {
            cerrarModalEscaneo(modal);
        }
    };
}

/**
 * Cierra el modal de escáner
 * @param {HTMLElement} modal - Elemento del modal
 */
export function cerrarModalEscaneo(modal) {
    if (!modal) {
        modal = document.getElementById('scanner-modal');
    }

    if (modal) {
        modal.classList.remove('scanner-modal-show');
        setTimeout(() => {
            if (detenerEscaner) {
                detenerEscaner();
            }
            modal.remove();
        }, 300);
    }
}

// Exponer servicios adicionales del NotificationService (útiles para nuevo código)
export const notificationServiceInstance = notificationService;

// Exportar funciones adicionales no presentes en logs.js original
export const mostrarToast = (mensaje, tipo, duration) => 
    notificationService.mostrarToast(mensaje, tipo, duration);

export const confirmar = (mensaje, titulo) => 
    notificationService.confirmar(mensaje, titulo);

export const solicitarTexto = (titulo, placeholder) => 
    notificationService.solicitarTexto(titulo, placeholder);

export const mostrarLoading = (mensaje) => 
    notificationService.mostrarLoading(mensaje);

export const cerrarLoading = () => 
    notificationService.cerrarLoading();
