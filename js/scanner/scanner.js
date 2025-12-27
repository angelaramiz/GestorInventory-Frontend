// Importaciones
import { buscarProducto, buscarProductoParaEditar, buscarProductoInventario, buscarPorCodigoParcial } from '../products/product-operations.js';
import { mostrarModalEscaneo, cerrarModalEscaneo, mostrarMensaje } from '../utils/logs.js';
import { sanitizarEntrada } from '../utils/sanitizacion.js';

// Variables globales
let scanner = null;
let scannerReaderId = null;
// Removed unused variable escanerActivo
let audioContext;
// Bandera para evitar inicializaciones simultáneas
let scannerLaunching = false;
// Evitar procesar múltiples detecciones simultáneas
let scanProcessing = false;

// Helper: detectar si estamos en la página de registro de entradas
function isRegistroEntradasView() {
    return !!(document.getElementById('codigoProducto') || document.getElementById('registrarEntrada') || document.getElementById('productForm'));
}

// Mapear inputId a botón de búsqueda correspondiente (si existe en la UI)
const SEARCH_BUTTON_MAP = {
    'busquedaCodigo': 'buscarPorCodigo',
    'busquedaNombre': 'buscarPorNombre',
    'busquedaMarca': 'buscarPorMarca',
    'busquedaCodigoCorto': 'buscarPorCodigoCorto',
    'codigoConsulta': 'buscarPorCodigo',
    'codigo': 'buscarPorCodigo',
    'busquedaCodigo': 'buscarPorCodigo'
};

async function triggerSearchButtonForInput(inputId) {
    try {
        const mapped = SEARCH_BUTTON_MAP[inputId];
        if (mapped) {
            const btn = document.getElementById(mapped);
            if (btn) {
                // click de forma asíncrona para respetar cualquier handler
                setTimeout(() => btn.click(), 20);
                return true;
            }
        }

        // Fallback: buscar un botón cercano en el DOM al input
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            const container = inputEl.closest('div') || inputEl.parentElement;
            if (container) {
                const localBtn = container.querySelector('button');
                if (localBtn) {
                    setTimeout(() => localBtn.click(), 20);
                    return true;
                }
            }
        }

        return false;
    } catch (err) {
        console.warn('[scanner] triggerSearchButtonForInput error', err);
        return false;
    }
}

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
        min-width: 300px !important;
        min-height: 225px !important;
    }
    #reader video {
        width: 100% !important;
        height: auto !important;
    }
    /* Modal reader específico */
    #reader-modal {
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 4/3;
        min-width: 300px !important;
        min-height: 225px !important;
    }
    #reader-modal video {
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

// Función helper para limpiar completamente el scanner anterior
async function cleanupScanner() {
    console.log('[scanner] cleanupScanner called', { scannerReaderId, time: new Date().toISOString() });
    if (!scanner) return;

    try {
        // Verificar si el scanner está corriendo antes de intentar detenerlo
        // Nota: Html5Qrcode no tiene getState(), así que intentamos detener y manejamos el error
        await scanner.stop();
    } catch (e) {
        // Ignorar errores si el scanner ya estaba detenido
        if (!e.message || (!e.message.includes('not running') && !e.message.includes('not paused'))) {
            console.warn('Error al detener scanner en cleanup:', e);
        }
    }

    // Limpiar el video element de manera segura (usar readerId actual si está definido)
    try {
        const readerIdToUse = scannerReaderId || 'reader';
        const videoElement = document.querySelector(`#${readerIdToUse} video`);
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => {
                track.stop();
            });
            videoElement.srcObject = null;
        }
        // Limpiar HTML interno del contenedor reader para evitar videos residuales
        const readerEl = document.getElementById(readerIdToUse);
        if (readerEl) readerEl.innerHTML = '';
    } catch (e) {
        console.warn('Error al limpiar video element:', e);
    }

    // Limpiar la instancia del scanner
    try {
        if (scanner.clear) scanner.clear();
    } catch (e) {
        console.warn('Error al limpiar scanner instance:', e);
    }

    scanner = null;
    scannerReaderId = null;

    // Quitar marcas de contenedores activos si existen
    try {
        document.querySelectorAll('[data-scanner-active]').forEach(el => el.removeAttribute('data-scanner-active'));
    } catch (e) {
        // ignorar
    }

    // Pequeño delay para asegurar que todo esté limpio
    await new Promise(resolve => setTimeout(resolve, 100));

    // Restaurar pageReader si fue ocultado por iniciarEscaneoConContainer
    try {
        const pageReader = document.getElementById('reader');
        if (pageReader && pageReader.dataset && pageReader.dataset._hiddenByScannerContainer) {
            pageReader.style.display = pageReader.dataset._prevDisplay || '';
            delete pageReader.dataset._hiddenByScannerContainer;
            delete pageReader.dataset._prevDisplay;
        }
    } catch (e) {
        // ignorar
    }
}

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
// Actualización de toggleEscaner para usar modal o container fijo
export async function toggleEscaner(inputId, containerId = null) {
    console.log('[scanner] toggleEscaner called', { inputId, containerId, time: new Date().toISOString(), stack: (new Error()).stack.split('\n').slice(1,4).join('\n') });

    if (scannerLaunching) {
        console.warn('[scanner] toggleEscaner ignored: scanner is launching', { inputId, containerId });
        return;
    }

    scannerLaunching = true;
    try {
        // Verificar si ya hay un scanner activo
        if (scanner) {
            console.warn('[scanner] Ya hay un scanner activo, deteniendo el anterior primero', { scannerReaderId });
            try { await detenerEscaner(); } catch (e) { console.warn('Error al detener scanner previo:', e); }
        }

        if (containerId) {
            // Usar container fijo
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'flex';
                await iniciarEscaneoConContainer(inputId, containerId);
            }
        } else {
            // Usar modal
            if (inputId) {
                console.log('[scanner] opening modal scanner', { inputId, time: new Date().toISOString() });
                await mostrarModalEscaneo(inputId);
            }
        }
    } finally {
        // Evitar desbloquear inmediatamente si el scanner quedó activo; dejar un pequeño margen
        setTimeout(() => { scannerLaunching = false; }, 300);
    }
}

// Detener el escáner
export async function detenerEscaner() {
    if (!scanner) return;

    // Marcar que estamos deteniendo intencionalmente para ignorar errores de abort
    scanner._deteniendo = true;

    try {
        await scanner.stop();
    } catch (err) {
        // Solo loggear errores reales, no si ya estaba detenido
        if (!err.message || (!err.message.includes('not running') && !err.message.includes('not paused'))) {
            console.error("Error al detener el escáner:", err);
            mostrarMensaje("Error al detener la cámara", "error");
        }
    }

    // Limpiar recursos
    try {
        const videoElement = scannerReaderId ? document.querySelector(`#${scannerReaderId} video`) : document.querySelector("#reader video");
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
    console.log("Escáner y cámara detenidos correctamente");
}
// Nueva función para iniciar el escáner dentro del modal
export async function iniciarEscaneoConModal(inputId) {
        console.log('[scanner] iniciarEscaneoConModal called', { inputId, time: new Date().toISOString(), stack: (new Error()).stack.split('\n').slice(1,4).join('\n') });
        const scannerContainer = document.getElementById("scanner-container-modal");
        if (!scannerContainer) return;
        // Si ya hay una instancia activa, detenerla primero para evitar múltiples streams
        await cleanupScanner();

        // Asegurar que el contenedor reader-modal esté limpio antes de crear la nueva instancia
        const readerEl = document.getElementById('reader-modal');
        if (readerEl) readerEl.innerHTML = '';

        // Usar un reader específico para la modal para evitar colisiones con #reader en la página
        scannerReaderId = 'reader-modal';
        scanner = new Html5Qrcode(scannerReaderId);
        console.log('[scanner] Html5Qrcode instance created (modal)', { scannerReaderId });
        scanner.start(
            { facingMode: "environment" },
            {
                fps: 5, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0
            },
            (decodedText, decodedResult) => {
                if (scanProcessing) return;
                scanProcessing = true;

                // Procesar en IIFE async para poder await detenerEscaner antes de manipular el DOM
                (async () => {
                    try {
                        manejarCodigoEscaneado(decodedText, decodedResult, async (codigoProcesado) => {
                            try {
                                // Reproducir tono
                                playTone(440, 0.2);

                                // Detener escáner inmediatamente para evitar dobles callbacks
                                try { await detenerEscaner(); } catch (e) { console.warn('Error al detener escáner tras detección:', e); }

                                const formatoCodigo = decodedResult.result.format.formatName.toLowerCase();

                                // Actualizar input si existe, sino loggear
                                const inputEl = document.getElementById(inputId);
                                if (inputEl) {
                                    inputEl.value = codigoProcesado;
                                } else {
                                    console.warn('[scanner] input not found for id', inputId, '– proceeding to search without setting input');
                                }

                                // Mostrar mensaje de éxito
                                mostrarMensaje(`Código detectado: ${codigoProcesado}`, "success", { timer: 1000 });

                                // Cerrar modal
                                try { cerrarModalEscaneo(document.getElementById('scanner-modal')); } catch (e) {}

                                    // Intentar disparar el botón de búsqueda asociado (si existe)
                                    const buttonTriggered = await triggerSearchButtonForInput(inputId);
                                    if (buttonTriggered) {
                                        console.log('[scanner] búsqueda disparada vía botón para', inputId);
                                    } else {
                                        // Si no hay botón, usar comportamiento por inputId
                                        if (isRegistroEntradasView()) {
                                            try {
                                                const reg = await import('../core/registro-entradas-operations.js');
                                                if (reg && reg.buscarProductoParaEntrada) {
                                                    const producto = await reg.buscarProductoParaEntrada(codigoProcesado, 'codigo');
                                                    if (reg.mostrarDatosProductoEntrada) reg.mostrarDatosProductoEntrada(producto);
                                                    else buscarProducto(codigoProcesado, formatoCodigo);
                                                } else {
                                                    buscarProducto(codigoProcesado, formatoCodigo);
                                                }
                                            } catch (err) {
                                                console.error('[scanner] Error al invocar búsqueda de registro-entradas:', err);
                                                buscarProducto(codigoProcesado, formatoCodigo);
                                            }
                                        } else {
                                            if (inputId === "codigoConsulta") {
                                                buscarProducto(codigoProcesado, formatoCodigo);
                                            } else if (inputId === "codigoEditar") {
                                                buscarProductoParaEditar(codigoProcesado, formatoCodigo);
                                            } else if (inputId === "codigo") {
                                                buscarProductoInventario(codigoProcesado, formatoCodigo);
                                            } else if (inputId === "busquedaCodigo") {
                                                buscarProducto(codigoProcesado, formatoCodigo);
                                            }
                                        }
                                    }
                            } finally {
                                scanProcessing = false;
                            }
                        });
                    } catch (err) {
                        console.error('Error processing decoded result:', err);
                        scanProcessing = false;
                    }
                })();
            },
            (error) => {
                // Ignorar errores de abort cuando se está deteniendo intencionalmente
                if (scanner && scanner._deteniendo && error && error.message && error.message.includes('abort')) {
                    return;
                }
                // Solo loggear errores reales, no "no se encontró código" que es normal
                if (error && typeof error === 'string' && !error.includes('No MultiFormat Readers were able to detect')) {
                    console.log("Error de escaneo:", error);
                }
                // Si es un error relacionado con el canvas, dar información más específica
                if (error && error.message && error.message.includes('getImageData')) {
                    console.warn("Error del canvas detectado. El contenedor del escáner podría no tener dimensiones válidas.");
                    // Ejecutar diagnóstico automáticamente
                    diagnosticarEscaner(containerId);
                }
            }
        )
        .catch((err) => {
            console.error("Error al iniciar el escáner:", err);
            mostrarMensaje("Error al iniciar el escáner. Verifica los permisos de la cámara.", "error");
        });
}

// Nueva función para iniciar el escáner en un container fijo
export async function iniciarEscaneoConContainer(inputId, containerId) {
        console.log('[scanner] iniciarEscaneoConContainer called', { inputId, containerId, time: new Date().toISOString(), stack: (new Error()).stack.split('\n').slice(1,6).join('\n') });
        const scannerContainer = document.getElementById(containerId);
        if (!scannerContainer) return;
        // Si ya hay una instancia activa, detenerla primero para evitar múltiples streams
        await cleanupScanner();

        // Evitar doble inicialización en el mismo container
        if (scannerContainer.dataset && scannerContainer.dataset.scannerActive) {
            console.warn('[scanner] El contenedor ya tiene un escáner activo, evitando doble renderizado', { containerId });
            console.log((new Error()).stack.split('\n').slice(1,6).join('\n'));
            return;
        }

        // Asegurar que el contenedor reader (en página) esté limpio antes de crear la nueva instancia
        // Manejar reader: reutilizar `#reader` global si está visible, sino crear uno local
        const pageReader = document.getElementById('reader');
        const pageReaderVisible = pageReader && window.getComputedStyle(pageReader).display !== 'none' && pageReader.offsetParent !== null && pageReader.getBoundingClientRect().width > 0 && pageReader.getBoundingClientRect().height > 0;

        let localReaderId;
        let readerEl;

        if (pageReaderVisible) {
            // Reutilizar el reader existente en la página para evitar duplicados
            readerEl = pageReader;
            localReaderId = 'reader';
            // Asegurar que esté mostrado
            readerEl.style.setProperty('display', 'block', 'important');
        } else {
            // Crear un reader específico para este container
            localReaderId = `reader-${containerId}`;
            readerEl = scannerContainer.querySelector(`#${localReaderId}`);
            if (!readerEl) {
                readerEl = document.createElement('div');
                readerEl.id = localReaderId;
                readerEl.style.display = 'block';
                readerEl.style.setProperty('display', 'block', 'important');
                readerEl.style.minWidth = '300px';
                readerEl.style.minHeight = '225px';
                readerEl.className = 'w-full mb-6 rounded-lg overflow-hidden';
                scannerContainer.appendChild(readerEl);

                // Si existe un pageReader global, ocultarlo para evitar duplicados
                if (pageReader) {
                    try {
                        pageReader.dataset._prevDisplay = pageReader.style.display || '';
                        pageReader.style.display = 'none';
                        pageReader.dataset._hiddenByScannerContainer = '1';
                    } catch (e) {
                        console.warn('[scanner] no se pudo ocultar pageReader:', e);
                    }
                }
            } else {
                readerEl.innerHTML = '';
                readerEl.style.display = 'block';
                readerEl.style.setProperty('display', 'block', 'important');
            }
        }

        // Forzar reflow y esperar a que el contenedor tenga dimensiones válidas
        // Esperar hasta que el contenedor sea visible y tenga dimensiones válidas
        await (async function waitForValidDimensions(el, timeout = 1000) {
            const start = performance.now();
            return new Promise(resolve => {
                function step() {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
                    if (visible) return resolve(true);
                    if (performance.now() - start > timeout) return resolve(false);
                    requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            });
        })(readerEl, 1000);

        // Marcar contenedor como activo para evitar re-renders
        try { scannerContainer.setAttribute('data-scanner-active', '1'); } catch (e) {}

        // Guardar el id del reader actual para las operaciones de limpieza
        scannerReaderId = localReaderId;
        scanner = new Html5Qrcode(scannerReaderId);
        console.log('[scanner] Html5Qrcode instance created (container)', { scannerReaderId, containerId });

        // Verificar que el reader tenga dimensiones antes de iniciar; si no, intentar fallback
        let readerRect = readerEl.getBoundingClientRect();
        if (readerRect.width === 0 || readerRect.height === 0) {
            console.warn('Reader inicial sin dimensiones válidas, intentando fallback usando el contenedor');
            const containerRect = scannerContainer.getBoundingClientRect();
            if (containerRect.width > 0 && containerRect.height > 0) {
                // Forzar tamaño explícito en el reader para que Html5Qrcode pueda inicializar
                readerEl.style.width = containerRect.width + 'px';
                readerEl.style.height = containerRect.height + 'px';
                // Recalc
                readerRect = readerEl.getBoundingClientRect();
            }
        }

        if (readerRect.width === 0 || readerRect.height === 0) {
            // Ejecutar diagnóstico y mostrar mensaje amigable en vez de lanzar excepción
            console.warn('[scanner] No se pudieron obtener dimensiones válidas para el reader después de intentar fallback', { containerId, readerRect });
            diagnosticarEscaner(containerId);
            mostrarMensaje('Error: el contenedor del escáner no está visible o tiene tamaño 0. Cierra y vuelve a abrir el escáner.', 'error');
            // Limpiar marca de activo y salir sin lanzar error para no romper el flujo
            try { scannerContainer.removeAttribute('data-scanner-active'); } catch (e) {}
            return;
        }

        scanner.start(
            { facingMode: "environment" },
            { fps: 5, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText, decodedResult) => {
                if (scanProcessing) return;
                scanProcessing = true;

                (async () => {
                    try {
                        manejarCodigoEscaneado(decodedText, decodedResult, async (codigoProcesado) => {
                            try {
                                playTone(440, 0.2);
                                try { await detenerEscaner(); } catch (e) { console.warn('Error al detener escáner tras detección:', e); }

                                const formatoCodigo = decodedResult.result.format.formatName.toLowerCase();

                                const inputEl = document.getElementById(inputId);
                                if (inputEl) inputEl.value = codigoProcesado;

                                mostrarMensaje(`Código detectado: ${codigoProcesado}`, "success", { timer: 1000 });
                                scannerContainer.style.display = 'none';

                                // Intentar disparar el botón de búsqueda asociado (si existe)
                                const buttonTriggered = await triggerSearchButtonForInput(inputId);
                                if (buttonTriggered) {
                                    console.log('[scanner] búsqueda disparada vía botón para', inputId);
                                } else {
                                    // Fallback: comportamiento por inputId o por vista
                                    if (isRegistroEntradasView()) {
                                        try {
                                            const reg = await import('../core/registro-entradas-operations.js');
                                            if (reg && reg.buscarProductoParaEntrada) {
                                                const producto = await reg.buscarProductoParaEntrada(codigoProcesado, 'codigo');
                                                if (reg.mostrarDatosProductoEntrada) reg.mostrarDatosProductoEntrada(producto);
                                                else buscarProducto(codigoProcesado, formatoCodigo);
                                            } else {
                                                buscarProducto(codigoProcesado, formatoCodigo);
                                            }
                                        } catch (err) {
                                            console.error('[scanner] Error al invocar búsqueda de registro-entradas:', err);
                                            buscarProducto(codigoProcesado, formatoCodigo);
                                        }
                                    } else {
                                        if (inputId === "codigoConsulta") {
                                            buscarProducto(codigoProcesado, formatoCodigo);
                                        } else if (inputId === "codigoEditar") {
                                            buscarProductoParaEditar(codigoProcesado, formatoCodigo);
                                        } else if (inputId === "codigo") {
                                            buscarProductoInventario(codigoProcesado, formatoCodigo);
                                        } else if (inputId === "busquedaCodigo") {
                                            buscarProducto(codigoProcesado, formatoCodigo);
                                        }
                                    }
                                }
                            } finally {
                                scanProcessing = false;
                            }
                        });
                    } catch (err) {
                        console.error('Error processing decoded result (container):', err);
                        scanProcessing = false;
                    }
                })();
            },
            (error) => {
                if (scanner && scanner._deteniendo && error && error.message && error.message.includes('abort')) return;
                if (error && typeof error === 'string' && !error.includes('No MultiFormat Readers were able to detect')) {
                    console.log("Error de escaneo:", error);
                }
                if (error && error.message && error.message.includes('getImageData')) {
                    console.warn("Error del canvas detectado. El contenedor del escáner podría no tener dimensiones válidas.");
                    diagnosticarEscaner(containerId);
                }
            }
        ).catch((err) => {
            console.error("Error al iniciar el escáner:", err);
            mostrarMensaje("Error al iniciar el escáner. Verifica los permisos de la cámara.", "error");
        });

    if (typeof readerEl !== 'undefined' && readerEl) {
        const readerRect = readerEl.getBoundingClientRect();
        console.log('Reader dimensions:', {
            width: readerRect.width,
            height: readerRect.height,
            display: window.getComputedStyle(readerEl).display,
            visibility: window.getComputedStyle(readerEl).visibility
        });

        // Verificar si hay canvas
        const canvas = readerEl.querySelector('canvas');
        if (canvas) {
            console.log('Canvas dimensions:', {
                width: canvas.width,
                height: canvas.height,
                clientWidth: canvas.clientWidth,
                clientHeight: canvas.clientHeight
            });
        } else {
            console.log('No canvas found in reader');
        }
    }

    console.log('Scanner instance:', !!scanner);
    console.log('================================');
}
export function manejarCodigoEscaneado(codigo, formato, callback) {
    let codigoSanitizado = sanitizarEntrada(codigo);
    mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
    console.log(`Código escaneado: ${codigoSanitizado}, Formato: ${formato.result.format.formatName}`);
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

