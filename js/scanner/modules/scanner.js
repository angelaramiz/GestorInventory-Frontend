// Módulo de scanner para lotes-avanzado.js

import * as config from './config.js';
import { mostrarAnimacionProcesamiento, ocultarAnimacionProcesamiento, reproducirSonidoConfirmacion, mostrarMensaje } from './utils.js';
import { procesarCodigoEscaneadoLotesAvanzado } from './core.js';
import { cambiarTabModalAvanzado } from './init.js';
import { setScannerLotesAvanzado, setIsEscaneoLotesAvanzadoActivo, setIsScannerTransitioning, setUltimoCodigoEscaneado, setTiempoUltimoEscaneo } from './config.js';

// Función para iniciar el escaneo por lotes avanzado
export function iniciarEscaneoLotesAvanzado() {
    // Limpiar arrays de productos
    config.productosEscaneados.length = 0;

    // Limpiar variables de debounce
    config.limpiarDebounce();

    // Mostrar modal
    document.getElementById('modalEscaneoLotesAvanzado').style.display = 'block';

    // Activar la pestaña del escáner por defecto
    cambiarTabModalAvanzado('escaner');

    // Inicializar el escáner
    setTimeout(() => {
        inicializarEscanerLotesAvanzado();
    }, 300); // Reducido de 500ms a 300ms para inicio más rápido
}

// Función para inicializar el escáner de lotes avanzado
export function inicializarEscanerLotesAvanzado() {
    if (typeof Html5Qrcode === 'undefined') {
        mostrarMensaje('Error: Librería de escaneo no disponible', 'error');
        return;
    }

    setScannerLotesAvanzado(new Html5Qrcode("reader-lotes-avanzado"));

    const configScanner = {
        fps: 5,
        qrbox: { width: 300, height: 200 },
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    // Por defecto, el escáner está pausado
    setIsEscaneoLotesAvanzadoActivo(false);

    // Botón de acción on/off
    const btnAccion = document.getElementById('accionEscaneoLotesAvanzado');
    if (btnAccion) {
        btnAccion.addEventListener('click', function () {
            if (config.isEscaneoLotesAvanzadoActivo) {
                pausarEscanerLotesAvanzado();
            } else {
                activarEscanerLotesAvanzado();
            }
        });
        // Estado inicial
        btnAccion.textContent = 'Activar escáner';
    }
}

export function activarEscanerLotesAvanzado() {
    if (config.scannerLotesAvanzado && !config.isScannerTransitioning) {
        setIsScannerTransitioning(true);
        // Si el escáner está activo, detenerlo antes de iniciar
        if (config.isEscaneoLotesAvanzadoActivo) {
            config.scannerLotesAvanzado.stop().then(() => {
                iniciarEscanerLotesAvanzadoHtml5Qrcode();
            }).catch(err => {
                setIsScannerTransitioning(false);
                console.error("Error al detener escáner:", err);
            });
        } else {
            iniciarEscanerLotesAvanzadoHtml5Qrcode();
        }
    }
}

function iniciarEscanerLotesAvanzadoHtml5Qrcode() {
    config.scannerLotesAvanzado.start(
        { facingMode: "environment" },
        {
            fps: 5,
            qrbox: { width: 300, height: 200 },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        },
        onEscaneoExitosoLotesAvanzado,
        onErrorEscaneoLotesAvanzado
    ).then(() => {
        setIsEscaneoLotesAvanzadoActivo(true);
        setIsScannerTransitioning(false);
        console.log("Escáner de lotes avanzado ACTIVADO");
    }).catch(err => {
        setIsScannerTransitioning(false);
        console.error("Error al activar escáner de lotes avanzado:", err);
        mostrarMensaje('Error al activar el escáner', 'error');
    });
}

export function pausarEscanerLotesAvanzado() {
    if (config.scannerLotesAvanzado && config.isEscaneoLotesAvanzadoActivo && !config.isScannerTransitioning) {
        setIsScannerTransitioning(true);
        config.scannerLotesAvanzado.stop().then(() => {
            setIsEscaneoLotesAvanzadoActivo(false);
            setIsScannerTransitioning(false);
            console.log("Escáner de lotes avanzado PAUSADO");
            const btnAccion = document.getElementById('accionEscaneoLotesAvanzado');
            if (btnAccion) btnAccion.textContent = 'Activar escáner';
        }).catch(err => {
            setIsScannerTransitioning(false);
            console.error("Error al pausar escáner de lotes avanzado:", err);
        });
    }
}

// Función cuando el escaneo es exitoso
function onEscaneoExitosoLotesAvanzado(decodedText, decodedResult) {
    console.log(`Código escaneado en lotes avanzado: ${decodedText}`);

    // Sanitizar el código escaneado
    const codigoLimpio = decodedText.trim();

    // Implementar debounce - prevenir registro duplicado de códigos
    const tiempoActual = Date.now();
    if (config.ultimoCodigoEscaneado === codigoLimpio &&
        (tiempoActual - config.tiempoUltimoEscaneo) < config.TIEMPO_DEBOUNCE) {
        console.log(`Código ${codigoLimpio} ignorado por debounce (${tiempoActual - config.tiempoUltimoEscaneo}ms desde el último escaneo)`);

        // Reanudar el escáner sin procesar
        setTimeout(() => {
            if (config.scannerLotesAvanzado && config.isEscaneoLotesAvanzadoActivo) {
                config.scannerLotesAvanzado.resume();
            }
        }, 300); // Reducido de 500ms a 300ms para mayor rapidez
        return;
    }

    // Actualizar variables de debounce
    setUltimoCodigoEscaneado(codigoLimpio);
    setTiempoUltimoEscaneo(tiempoActual);

    // Detener el escáner completamente al detectar código para evitar errores de UI
    if (config.scannerLotesAvanzado && config.isEscaneoLotesAvanzadoActivo) {
        config.scannerLotesAvanzado.stop().then(() => {
            setIsEscaneoLotesAvanzadoActivo(false);
            console.log("Escáner detenido para procesamiento");
        }).catch(err => {
            console.error("Error al detener escáner:", err);
        });
    }

    // Procesar el código escaneado
    procesarCodigoEscaneadoLotesAvanzado(codigoLimpio, decodedResult);
}

// Función para manejar errores del escáner
function onErrorEscaneoLotesAvanzado(error) {
    // No mostrar errores continuos del escáner
    // console.warn("Error de escáner de lotes avanzado:", error);
}

// Función para pausar el escaneo
export function pausarEscaneoLotesAvanzado() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    try {
        if (config.scannerLotesAvanzado && config.isEscaneoLotesAvanzadoActivo) {
            config.scannerLotesAvanzado.stop().then(() => {
                setIsEscaneoLotesAvanzadoActivo(false);
                console.log("Escáner pausado desde botón");
                if (btn) btn.textContent = 'Reanudar escaneo';
            }).catch(err => {
                console.error("Error al pausar escáner:", err);
            });
        } else if (config.scannerLotesAvanzado && !config.isEscaneoLotesAvanzadoActivo) {
            reanudarEscaneoLotesAvanzado();
        }
    } catch (err) {
        console.error("Error en pausarEscaneoLotesAvanzado:", err);
    }
}

// Función para reanudar el escaneo
export function reanudarEscaneoLotesAvanzado() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (config.scannerLotesAvanzado && !config.isEscaneoLotesAvanzadoActivo) {
        activarEscanerLotesAvanzado();
        if (btn) btn.textContent = 'Pausar escaneo';
    }
}

// Función para reanudar el escáner sin limpiar debounce (para evitar bucles)
export function reanudarEscannerSinLimpiarDebounce() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (config.scannerLotesAvanzado && !config.isEscaneoLotesAvanzadoActivo) {
        activarEscanerLotesAvanzado();
        if (btn) btn.textContent = 'Pausar escaneo';
    }
}

// Función para reanudar el escáner después del procesamiento
export function reanudarEscannerDespuesDeProcesamiento() {
    setTimeout(() => {
        if (config.scannerLotesAvanzado && !config.isEscaneoLotesAvanzadoActivo) {
            activarEscanerLotesAvanzado();
        }
    }, 800); // Reducido de 2000ms a 800ms para mayor rapidez
}

// Función para finalizar el escaneo por lotes avanzado
export function finalizarEscaneoLotesAvanzado() {
    if (config.productosEscaneados.length === 0) {
        mostrarMensaje('No hay productos escaneados para finalizar', 'warning');
        return;
    }

    // Agrupar productos por producto primario
    agruparProductosPorPrimario();

    // Mostrar confirmación
    const totalProductos = config.productosEscaneados.length;
    const pesoTotal = config.productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = config.productosAgrupados.length;

    // Deshabilitar el botón de iniciar escaneo por lotes avanzado
    const btnIniciar = document.getElementById('iniciarEscaneoLotesAvanzado');
    if (btnIniciar) {
        btnIniciar.disabled = true;
    }

    // Hacer scroll automático al botón de guardar inventario
    setTimeout(() => {
        const btnGuardar = document.getElementById('guardarInventarioLotesAvanzado');
        if (btnGuardar) {
            btnGuardar.scrollIntoView({ behavior: 'smooth' });
        }
    }, 400);

    const mensaje = `
        Resumen del escaneo por lotes avanzado:
        • Total de productos escaneados: ${totalProductos}
        • Peso total: ${pesoTotal.toFixed(3)} Kg
        • Productos primarios: ${productosPrimarios}
        
        ¿Confirmar el procesamiento?
    `;

    if (confirm(mensaje)) {
        mostrarResultadosLotesAvanzado();
    } else {
        // Rehabilitar botón si se cancela
        if (btnIniciar) {
            btnIniciar.disabled = false;
        }
    }
}

// Función para agrupar productos por producto primario
function agruparProductosPorPrimario() {
    config.productosAgrupados.length = 0;
    const grupos = new Map();

    config.productosEscaneados.forEach(producto => {
        const clavePrimaria = producto.productoPrimario?.codigo || producto.codigo;
        if (!grupos.has(clavePrimaria)) {
            grupos.set(clavePrimaria, {
                productoPrimario: producto.productoPrimario || producto,
                subproductos: [],
                pesoTotal: 0
            });
        }
        const grupo = grupos.get(clavePrimaria);
        grupo.subproductos.push(producto);
        grupo.pesoTotal += producto.peso;
    });

    config.productosAgrupados.push(...Array.from(grupos.values()));
}

// Función para mostrar resultados de lotes avanzado
function mostrarResultadosLotesAvanzado() {
    const contenedor = document.getElementById('contenedorProductosPrimarios');
    const resultados = document.getElementById('resultadosLotesAvanzado');

    contenedor.innerHTML = '';

    productosAgrupados.forEach((grupo, index) => {
        const divGrupo = document.createElement('div');
        divGrupo.className = 'bg-white p-4 rounded-lg shadow mb-4';
        divGrupo.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-bold text-blue-800">Producto ${index + 1}: ${grupo.productoPrimario.nombre}</h3>
                <button onclick="mostrarDetalleProductoPrimario(${index})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    Ver detalle
                </button>
            </div>
            <p class="text-gray-600">Peso total: ${grupo.pesoTotal.toFixed(3)} Kg</p>
            <p class="text-gray-600">Subproductos: ${grupo.subproductos.length}</p>
        `;
        contenedor.appendChild(divGrupo);
    });

    // Mostrar sección de resultados
    resultados.classList.remove('hidden');

    // Habilitar botón guardar
    document.getElementById('guardarInventarioLotesAvanzado').disabled = false;
}

// Función para cerrar el modal de lotes avanzado
export async function cerrarModalLotesAvanzado() {
    (async () => {
        try {
            // Detener el escáner si está activo
            if (config.scannerLotesAvanzado && config.isEscaneoLotesAvanzadoActivo) {
                await config.scannerLotesAvanzado.stop();
                setIsEscaneoLotesAvanzadoActivo(false);
                console.log("Escáner detenido al cerrar modal");
            }

            // Limpiar arrays
            config.productosEscaneados.length = 0;

            // Limpiar variables de debounce
            config.limpiarDebounce();

            // Ocultar modal
            document.getElementById('modalEscaneoLotesAvanzado').style.display = 'none';

            // Rehabilitar botón de iniciar escaneo
            const btnIniciar = document.getElementById('iniciarEscaneoLotesAvanzado');
            if (btnIniciar) {
                btnIniciar.disabled = false;
            }

            // Limpiar contadores
            actualizarContadoresAvanzado();

            // Ocultar resultados
            const resultados = document.getElementById('resultadosLotesAvanzado');
            if (resultados) {
                resultados.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error al cerrar modal de lotes avanzado:', error);
        }
    })();
}