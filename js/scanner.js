// Importaciones
import { buscarProducto, buscarProductoParaEditar, buscarProductoInventario,buscarPorCodigoParcial } from './product-operations.js';
import { mostrarModalEscaneo, cerrarModalEscaneo, mostrarMensaje } from './logs.js';
import {sanitizarEntrada} from './sanitizacion.js';

// Variables globales
let scanner = null;
let escanerActivo = false;
let audioContext;

// Crear elementos para la superposición visual
const scannerOverlay = document.createElement('div');
scannerOverlay.id = 'scanner-overlay';
scannerOverlay.innerHTML = `
    <div class="scanner-area"></div>
    <div class="scanner-line"></div>
    <div id="scanner-ready-indicator"></div>
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
export function iniciarEscaneo(inputId) {
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
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    mostrarModalEscaneo(inputId);
}

// Detener el escáner
export function detenerEscaner() {
    if (scanner) {
        scanner.stop().then(() => {
            // Liberar el stream de la cámara manualmente
            const videoElement = document.querySelector("#reader video");
            if (videoElement && videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            }
            scanner.clear();
            scanner = null;
            console.log("Escáner y cámara detenidos correctamente");
        }).catch((err) => {
            console.error("Error al detener el escáner:", err);
            mostrarMensaje("Error al detener la cámara", "error");
        });
    }
}
// Nueva función para iniciar el escáner dentro del modal
export function iniciarEscaneoConModal(inputId) {
    try {
        const scannerContainer = document.getElementById("scanner-container-modal");
        if (!scannerContainer) return;

        scanner = new Html5Qrcode("reader");
        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 },aspectRatio: 1.0 // Mantener relación 1:1 
            },
            (decodedText,decodedResult) => {
                //playTone(1000,50);
                manejarCodigoEscaneado(decodedText, decodedResult); // Llamar con decodedResult
                document.getElementById(inputId).value = decodedText;
                mostrarMensaje(`Código detectado: ${decodedText}`, "exito", { timer: 1000 });
                cerrarModalEscaneo(document.getElementById('scanner-modal'));
                detenerEscaner()

                if (inputId === "codigoConsulta") {
                    buscarProducto();
                } else if (inputId === "codigoEditar") {
                    buscarProductoParaEditar();
                } else if (inputId === "codigo") {
                    buscarProductoInventario();
                }
                
            },
            (error) => console.log("Error de escaneo:", error)
        ).catch((err) => {
            console.error("Error al iniciar el escáner:", err);
            mostrarMensaje("Error al iniciar el escáner. Verifica los permisos de la cámara.", "error");
        });
    } catch (error) {
        console.error("Error en iniciarEscaneoConModal:", error);
    }
}
// Función para manejar el código escaneado
export function manejarCodigoEscaneado(codigo, formato) {
    const codigoSanitizado = sanitizarEntrada(codigo);
    mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");

    if (formato.result.format.formatName.toLowerCase() === "code_128") {
        // Eliminar ceros iniciales
        codigo = codigoSanitizado.replace(/^0+/, '');

        // Expresión regular para capturar los 4 dígitos después del primer "2"
        const regex = /2(\d{4})/;
        const match = codigo.match(regex);

        if (match) {
            const codigoParcial = match[1]; // Extraer los 4 dígitos capturados
            mostrarMensaje(`Código parcial extraído: ${codigoParcial}`, "info");
            buscarPorCodigoParcial(codigoParcial);
        } else {
            mostrarMensaje("No se encontraron 4 dígitos después del primer '2'.", "warning");
        }
    } 
    if (formato.result.format.formatName.toLowerCase() === "upc_a") {
        codigo = codigoSanitizado.replace(/^0+/, '');
        return 
    }
}

