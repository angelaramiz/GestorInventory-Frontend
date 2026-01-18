// Módulo de scanner para lotes-avanzado.js

import { scannerLotesAvanzado, productosEscaneados, isEscaneoLotesAvanzadoActivo, isScannerTransitioning, ultimoCodigoEscaneado, tiempoUltimoEscaneo, TIEMPO_DEBOUNCE, limpiarDebounce, configuracionEscaneo } from './config.js';
import { mostrarAnimacionProcesamiento, ocultarAnimacionProcesamiento, reproducirSonidoConfirmacion, mostrarMensaje } from './utils.js';
import { procesarCodigoEscaneadoLotesAvanzado } from './core.js';

// Función para iniciar el escaneo por lotes avanzado
export function iniciarEscaneoLotesAvanzado() {
    // Limpiar arrays de productos
    productosEscaneados.length = 0;

    // Limpiar variables de debounce
    limpiarDebounce();

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

    scannerLotesAvanzado = new Html5Qrcode("reader-lotes-avanzado");

    const config = {
        fps: 5,
        qrbox: { width: 300, height: 200 },
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    // Por defecto, el escáner está pausado
    isEscaneoLotesAvanzadoActivo = false;

    // Botón de acción on/off
    const btnAccion = document.getElementById('accionEscaneoLotesAvanzado');
    if (btnAccion) {
        btnAccion.addEventListener('click', function () {
            if (isEscaneoLotesAvanzadoActivo) {
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
    if (scannerLotesAvanzado && !isScannerTransitioning) {
        isScannerTransitioning = true;
        // Si el escáner está activo, detenerlo antes de iniciar
        if (isEscaneoLotesAvanzadoActivo) {
            scannerLotesAvanzado.stop().then(() => {
                iniciarEscanerLotesAvanzadoHtml5Qrcode();
            }).catch(err => {
                isScannerTransitioning = false;
                console.error("Error al detener escáner:", err);
            });
        } else {
            iniciarEscanerLotesAvanzadoHtml5Qrcode();
        }
    }
}

function iniciarEscanerLotesAvanzadoHtml5Qrcode() {
    scannerLotesAvanzado.start(
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
        isEscaneoLotesAvanzadoActivo = true;
        isScannerTransitioning = false;
        console.log("Escáner de lotes avanzado ACTIVADO");
    }).catch(err => {
        isScannerTransitioning = false;
        console.error("Error al activar escáner de lotes avanzado:", err);
        mostrarMensaje('Error al activar el escáner', 'error');
    });
}

export function pausarEscanerLotesAvanzado() {
    if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo && !isScannerTransitioning) {
        isScannerTransitioning = true;
        scannerLotesAvanzado.stop().then(() => {
            isEscaneoLotesAvanzadoActivo = false;
            isScannerTransitioning = false;
            console.log("Escáner de lotes avanzado PAUSADO");
            const btnAccion = document.getElementById('accionEscaneoLotesAvanzado');
            if (btnAccion) btnAccion.textContent = 'Activar escáner';
        }).catch(err => {
            isScannerTransitioning = false;
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
    if (ultimoCodigoEscaneado === codigoLimpio &&
        (tiempoActual - tiempoUltimoEscaneo) < TIEMPO_DEBOUNCE) {
        console.log(`Código ${codigoLimpio} ignorado por debounce (${tiempoActual - tiempoUltimoEscaneo}ms desde el último escaneo)`);

        // Reanudar el escáner sin procesar
        setTimeout(() => {
            if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
                scannerLotesAvanzado.resume();
            }
        }, 300); // Reducido de 500ms a 300ms para mayor rapidez
        return;
    }

    // Actualizar variables de debounce
    ultimoCodigoEscaneado = codigoLimpio;
    tiempoUltimoEscaneo = tiempoActual;

    // Detener el escáner completamente al detectar código para evitar errores de UI
    if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
        scannerLotesAvanzado.stop().then(() => {
            isEscaneoLotesAvanzadoActivo = false;
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
        if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
            scannerLotesAvanzado.stop().then(() => {
                isEscaneoLotesAvanzadoActivo = false;
                console.log("Escáner pausado desde botón");
                btn.textContent = 'Reanudar escaneo';
            }).catch(err => {
                console.error("Error al pausar escáner:", err);
            });
        } else if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
            reanudarEscaneoLotesAvanzado();
        }
    } catch (err) {
        console.error("Error en pausarEscaneoLotesAvanzado:", err);
    }
}

// Función para reanudar el escaneo
export function reanudarEscaneoLotesAvanzado() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
        activarEscanerLotesAvanzado();
        if (btn) btn.textContent = 'Pausar escaneo';
    }
}

// Función para reanudar el escáner sin limpiar debounce (para evitar bucles)
export function reanudarEscannerSinLimpiarDebounce() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
        activarEscanerLotesAvanzado();
        if (btn) btn.textContent = 'Pausar escaneo';
    }
}

// Función para reanudar el escáner después del procesamiento
export function reanudarEscannerDespuesDeProcesamiento() {
    setTimeout(() => {
        if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
            activarEscanerLotesAvanzado();
        }
    }, 800); // Reducido de 2000ms a 800ms para mayor rapidez
}

// Función para finalizar el escaneo por lotes avanzado
export function finalizarEscaneoLotesAvanzado() {
    if (productosEscaneados.length === 0) {
        mostrarMensaje('No hay productos escaneados para finalizar', 'warning');
        return;
    }

    // Agrupar productos por producto primario
    agruparProductosPorPrimario();

    // Mostrar confirmación
    const totalProductos = productosEscaneados.length;
    const pesoTotal = productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = productosAgrupados.length;

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
    productosAgrupados.length = 0;
    const grupos = new Map();

    productosEscaneados.forEach(producto => {
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

    productosAgrupados.push(...Array.from(grupos.values()));
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
            if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
                await scannerLotesAvanzado.stop();
                isEscaneoLotesAvanzadoActivo = false;
                console.log("Escáner detenido al cerrar modal");
            }

            // Limpiar arrays
            productosEscaneados.length = 0;

            // Limpiar variables de debounce
            limpiarDebounce();

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