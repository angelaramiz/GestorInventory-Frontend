// Importaciones
import { buscarProducto, buscarProductoParaEditar, buscarProductoInventario, buscarPorCodigoParcial } from '../core/product-operations.js';
import { mostrarModalEscaneo, cerrarModalEscaneo, mostrarMensaje } from '../utils/logs.js';
import { sanitizarEntrada } from '../utils/sanitizacion.js';

// Variables globales
let scanner = null;
// Removed unused variable escanerActivo
let audioContext;

// Crear elementos para la superposición visual
const scannerOverlay = document.createElement('div');
scannerOverlay.id = 'scanner-overlay';
scannerOverlay.innerHTML = `
    <div class="scanner-area dark-theme-scanner-area"></div>
    <div class="scanner-line dark-theme-scanner-line"></div>
    <div id="scanner-ready-indicator" class="dark-theme-scanner-indicator"></div>
`;

// Agregar estilos
const style = document.createElement('style');
style.textContent = `
    #scanner-container {
        position: relative;
        width: 100%;
        max-width: 640px;
        margin: 0 auto;
        overflow: hidden;
    }
    #reader {
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 4/3;
    }
    #reader video {
        width: 100% !important;
        height: auto !important;
    }
    #scanner-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    }
    .scanner-area {
        position: absolute;
        top: 20%;
        left: 20%;
        width: 60%;
        height: 60%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    }
    .scanner-line {
        position: absolute;
        left: 20%;
        width: 60%;
        height: 2px;
        background-color: #00ff00;
        animation: scan 2s linear infinite;
    }
    @keyframes scan {
        0% { top: 20%; }
        50% { top: 80%; }
        100% { top: 20%; }
    }
    #scanner-ready-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: red;
        transition: background-color 0.3s ease;
    }
    #cerrarEscaner {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
    }
    /* Ocultar elementos innecesarios de html5-qrcode */
    .html5-qrcode-element {
        display: none !important;
    }
`;

// Función para inicializar el escáner
// En scanner.js, modificar iniciarEscaneo
export function iniciarEscaneo() {
    try {
        // Verificar permisos
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                // Iniciar escáner solo si hay permisos
                const scannerContainer = document.getElementById("scanner-container");
                scannerContainer.style.display = "block";
                // ... (resto del código)
            })
            .catch((err) => {
                mostrarMensaje("Se requiere acceso a la cámara", "error");
                console.error("Error de permisos:", err);
            });
    } catch (error) {
        console.error("Error al iniciar el escáner:", error);
    }
}
// Función para reproducir un tono
function playTone(frequency, duration, type = 'sine') {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window["webkitAudioContext"])();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - 0.01);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// Función para toggle del escáner
// Actualización de toggleEscaner para usar modal
export function toggleEscaner(inputId) {
    if (inputId) {
        mostrarModalEscaneo(inputId);
    }
}

// Detener el escáner
export function detenerEscaner() {
    // Si existe una instancia de scanner, detenerla correctamente
    if (scanner) {
        scanner.stop().then(() => {
            // Liberar el stream de la cámara manualmente
            try {
                const videoElement = document.querySelector("#reader video");
                if (videoElement && videoElement.srcObject) {
                    videoElement.srcObject.getTracks().forEach(track => track.stop());
                    videoElement.srcObject = null;
                }
            } catch (e) {
                console.warn('No se pudo acceder al elemento video para detener pistas:', e);
            }
            try {
                scanner.clear();
            } catch (e) {
                console.warn('Error al limpiar instancia de scanner:', e);
            }
            scanner = null;
                    }).catch((err) => {
            console.error("Error al detener el escáner:", err);
            mostrarMensaje("Error al detener la cámara", "error");
            // Intentar forzar la detención de la cámara aunque scanner.stop falle
            try {
                const videoElement = document.querySelector("#reader video");
                if (videoElement && videoElement.srcObject) {
                    videoElement.srcObject.getTracks().forEach(track => track.stop());
                    videoElement.srcObject = null;
                }
            } catch (e) {
                console.warn('Forzado: no se pudo detener las pistas de video:', e);
            }
            try {
                if (scanner && typeof scanner.clear === 'function') scanner.clear();
            } catch (e) {}
            scanner = null;
        });
        return;
    }

    // Si no hay instancia de scanner, intentar detener cualquier stream activo por el elemento video
    try {
        const videoElement = document.querySelector("#reader video");
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
                    }
    } catch (e) {
        console.warn('No se encontró video activo para detener:', e);
    }
}
// Nueva función para iniciar el escáner dentro del modal
export async function iniciarEscaneoConModal(inputId) {
    try {
        const scannerContainer = document.getElementById("scanner-container-modal");
        if (!scannerContainer) return;
        // Si ya hay una instancia activa, detenerla primero para evitar múltiples streams
        if (scanner) {
            try {
                await scanner.stop();
            } catch (e) {
                console.warn('Error al detener instancia previa de scanner antes de crear nueva:', e);
            }
            try {
                const videoElementPrev = document.querySelector("#reader video");
                if (videoElementPrev && videoElementPrev.srcObject) {
                    videoElementPrev.srcObject.getTracks().forEach(track => track.stop());
                    videoElementPrev.srcObject = null;
                }
            } catch (e) {
                console.warn('No se pudo forzar parada de pistas del video previo:', e);
            }
            try { scanner.clear(); } catch (e) {}
            scanner = null;
        }

        // Asegurar que el contenedor reader esté limpio antes de crear la nueva instancia
        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';

        scanner = new Html5Qrcode("reader");
        scanner.start(
            { facingMode: "environment" },
            {
                fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0
            },
            (decodedText, decodedResult) => {
                // 1. Procesar el código primero
                manejarCodigoEscaneado(decodedText, decodedResult, (codigoProcesado) => {
                    // 2. Reproducir sonido de confirmación
                    playTone(440, 0.2);
                    
                    // 3. Actualizar el input con el código procesado
                    document.getElementById(inputId).value = codigoProcesado;
                    const formatoCodigo = decodedResult.result.format.formatName.toLowerCase();
                    // 4. Mostrar mensaje de éxito
                    mostrarMensaje(`Código detectado: ${codigoProcesado}`, "success", { timer: 1000 });
                    
                    // 5. Cerrar modal y detener escáner
                    cerrarModalEscaneo(document.getElementById('scanner-modal'));
                    detenerEscaner();
                    
                    // 6. Ejecutar búsqueda con el código procesado DESPUÉS de detener el escáner
                    setTimeout(() => {
                        if (inputId === "codigoConsulta") {
                            buscarProducto(codigoProcesado, formatoCodigo);
                        } else if (inputId === "codigoEditar") {
                            buscarProductoParaEditar(codigoProcesado, formatoCodigo);
                        } else if (inputId === "codigo") {
                            buscarProductoInventario(codigoProcesado, formatoCodigo);
                        }
                    }, 100); // Pequeño delay para asegurar que el escáner se detuvo completamente
                });
            },
            (error) => mostrarMensaje("Error al iniciar el escáner. Verifica los permisos de la cámara.", "error")
        );
    } catch (error) {
        console.error("Error en iniciarEscaneoConModal:", error);
    }
}
// Función para manejar el código escaneado
export function manejarCodigoEscaneado(codigo, formato, callback) {
    let codigoSanitizado = sanitizarEntrada(codigo);
    mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
        if (formato.result.format.formatName.toLowerCase() === "code_128") {
        // Eliminar ceros iniciales
        let codigoLimpio = codigoSanitizado.replace(/^0+/, '');
        
        // Expresión regular para capturar los 4 dígitos después del primer "2"
        const regex = /2(\d{4})/;
        const match = codigoLimpio.match(regex);
        
        if (match) {
            const codigoExtraido = match[1]; // Extraer los 4 dígitos capturados
            mostrarMensaje(`Código parcial extraído: ${codigoExtraido}`, "info");
            
            // Ejecutar callback con el código procesado
            if (callback && typeof callback === 'function') {
                callback(codigoExtraido);
            }
            return codigoExtraido;
        } else {
            mostrarMensaje("No se encontraron 4 dígitos después del primer '2'.", "warning");
            if (callback && typeof callback === 'function') {
                callback(codigoSanitizado); // Devolver el código original si no hay match
            }
            return codigoSanitizado;
        }
    } else {
        // Para otros formatos, devolver el código sanitizado
        if (callback && typeof callback === 'function') {
            callback(codigoSanitizado);
        }
        return codigoSanitizado;
    }
}



