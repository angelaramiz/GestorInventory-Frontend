/**
 * FASE 6: Módulo de Escaneo con HTML5QrCode
 * Gestiona la lógica de escaneo de códigos de barras
 */

import { buscarProductoPorPLU, extraerDatosCodeCODE128 } from './processor.js';
import { guardarProductoEscaneado, obtenerResumenEscaneo } from './pz-inventario-temporal.js';
import { mostrarResultadoEscaneo, mostrarEstadoEscaneo, mostrarModalProductoNoEncontrado } from './pz-scanner-ui.js';
import { getSupabase } from '../../auth/auth.js';

let scanner = null;
export let estadoEscaneo = {
    activo: false,
    productoVirtualActual: null,
    productoFisicoEscaneado: null,
    intentos: 0,
    maxIntentos: 3
};
let handlersRegistrados = false; // Flag para evitar registro duplicado
let codigoYaProcesado = false; // Flag para evitar procesar el mismo código múltiples veces

/**
 * Inicializa el escáner con HTML5QrCode
 * @returns {Promise<boolean>}
 */
export async function inicializarEscaner() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof Html5QrcodeScanner === 'undefined') {
                console.error('❌ HTML5QrCode no cargado');
                reject(new Error('HTML5QrCode no disponible'));
                return;
            }

            const elementoScannerExiste = document.getElementById('qr-scanner');
            if (!elementoScannerExiste) {
                console.error('❌ Elemento #qr-scanner no encontrado');
                reject(new Error('Elemento qr-scanner no encontrado'));
                return;
            }

            // Verificar que el contenedor tiene dimensiones
            const rect = elementoScannerExiste.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                console.error('❌ Contenedor #qr-scanner no tiene dimensiones');
                reject(new Error('Contenedor sin dimensiones'));
                return;
            }

            console.log(`📐 Dimensiones del contenedor: ${rect.width}x${rect.height}`);

            // Calcular qrbox dinámicamente (80% del contenedor, pero máximo 250px)
            const qrboxSize = Math.min(Math.floor(rect.height * 0.8), Math.floor(rect.width * 0.8), 250);
            console.log(`📦 Tamaño qrbox calculado: ${qrboxSize}px`);

            scanner = new Html5QrcodeScanner('qr-scanner', {
                fps: 15,
                qrbox: qrboxSize,
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                disableFlip: false
            });

            console.log('✅ Escáner HTML5QrCode inicializado');
            resolve(true);
        } catch (error) {
            console.error('❌ Error inicializando escáner:', error);
            reject(error);
        }
    });
}

/**
 * Inicia el escaneo
 * @param {Object} productoVirtual - Producto virtual a escanear
 * @param {Object} callbacks - {onConfirmar, onRechazar, onSaltar}
 */
export function iniciarEscaneo(productoVirtual, callbacks = {}) {
    if (!scanner) {
        console.error('❌ Escáner no inicializado');
        return;
    }

    // Detener scanner anterior si está activo
    if (estadoEscaneo.activo) {
        try {
            scanner.clear();
            console.log('🧹 Scanner anterior limpiado');
        } catch (error) {
            console.warn('Advertencia limpiando scanner anterior:', error);
        }
    }

    estadoEscaneo.activo = true;
    estadoEscaneo.productoVirtualActual = productoVirtual;
    estadoEscaneo.intentos = 0;
    handlersRegistrados = false; // Reset para nuevo producto
    codigoYaProcesado = false; // Reset para nuevo producto

    console.log(`🔍 Iniciando escaneo para: ${productoVirtual.nombre || 'Producto Virtual'} (Sección ${productoVirtual.seccion}, ${productoVirtual.cantidad}${productoVirtual.unidad})`);

    scanner.render(
        async (decodedText, decodedResult) => {
            // ⏹️ PARCHE: Si el código ya fue procesado, ignorar
            if (codigoYaProcesado) {
                console.log('⏸️ Código ya fue procesado, ignorando detección duplicada');
                return;
            }

            console.log(`📱 Código detectado: ${decodedText}`);
            codigoYaProcesado = true; // Marcar como procesado
            
            // ⏹️ PARCHE: Detener scanner inmediatamente después de detectar
            try {
                scanner.clear();
                console.log('🧹 Scanner detenido inmediatamente después de detectar código');
            } catch (error) {
                console.warn('Advertencia deteniendo scanner:', error);
            }

            try {
                // Extraer PLU del código CODE128
                let pluABuscar = decodedText;
                
                // Si es un código CODE128 (empieza con 02), extraer el PLU
                if (decodedText.startsWith('02') && decodedText.length > 14) {
                    const datosExtraidos = extraerDatosCodeCODE128(decodedText);
                    if (datosExtraidos) {
                        pluABuscar = datosExtraidos.plu;
                        console.log(`📦 PLU extraído del CODE128: ${pluABuscar}`);
                    }
                } else {
                    // Si no es CODE128, asumir que decodedText es el PLU o código directo
                    console.log(`📦 Usando código directamente: ${pluABuscar}`);
                }

                // Buscar producto en Supabase
                const producto = await buscarProductoPorPLU(pluABuscar);

                if (producto) {
                    estadoEscaneo.productoFisicoEscaneado = producto;
                    console.log(`✅ Producto encontrado: ${producto.nombre} (${producto.codigo})`);

                    // Mostrar resultado en UI
                    mostrarResultadoEscaneo({
                        nombre: producto.nombre,
                        codigo: producto.codigo || decodedText,
                        marca: producto.marca || 'Sin marca',
                        categoria: producto.categoria || 'Sin categoría'
                    });

                    // Registrar handlers para botones (solo si aún no están registrados)
                    if (!handlersRegistrados) {
                        registrarHandlersConfirmacion(callbacks);
                        handlersRegistrados = true;
                    }
                } else {
                    // Producto no encontrado - Mostrar modal con opciones
                    codigoYaProcesado = false;
                    console.warn(`❌ Producto no encontrado: ${decodedText}`);
                    
                    mostrarModalProductoNoEncontrado(decodedText, {
                        onReintentar: () => {
                            console.log('🔄 Reiniciando escaneo para:', decodedText);
                            limpiarResultadoEscaneo();
                            reanudarEscaneo();
                        },
                        onRegistrar: async (nuevoProducto) => {
                            console.log('➕ Registrando nuevo producto:', nuevoProducto);
                            await registrarProductoYReescanear(nuevoProducto, decodedText, callbacks);
                        },
                        onSaltar: () => {
                            console.log('⏭️ Saltando producto:', decodedText);
                            saltarProductoActual(callbacks);
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error en escaneo:', error);
                mostrarEstadoEscaneo('Error en escaneo: ' + error.message, 'error');
            }
        },
        (error) => {
            // Error de escaneo (generalmente ignorado)
            console.debug('Info escaneo:', error);
        }
    );
}

/**
 * Detiene el escaneo
 */
export function detenerEscaneo() {
    if (scanner) {
        try {
            scanner.clear();
            estadoEscaneo.activo = false;
            console.log('✅ Escaneo detenido');
        } catch (error) {
            console.warn('Advertencia al detener escáner:', error);
        }
    }
}

/**
 * Confirma el producto escaneado y lo guarda
 * @param {Object} productoFisico - Producto físico escaneado
 * @returns {Promise<number>} ID guardado en BD
 */
export async function confirmarEscaneo(productoFisico) {
    if (!estadoEscaneo.productoVirtualActual) {
        throw new Error('No hay producto virtual seleccionado');
    }

    const datosEscaneo = {
        virtual_id: estadoEscaneo.productoVirtualActual.id || 0,
        codigo_producto: productoFisico.codigo || 'N/A',
        nombre: productoFisico.nombre,
        cantidad: estadoEscaneo.productoVirtualActual.cantidad,
        caducidad: estadoEscaneo.productoVirtualActual.caducidad,
        seccion: productoFisico.seccion || 1,
        nivel: productoFisico.nivel || 1
    };

    try {
        const id = await guardarProductoEscaneado(datosEscaneo);
        console.log(`✅ Producto confirmado y guardado (ID: ${id})`);
        
        // Actualizar estado
        estadoEscaneo.productoVirtualActual = null;
        estadoEscaneo.productoFisicoEscaneado = null;

        return id;
    } catch (error) {
        console.error('❌ Error confirmando escaneo:', error);
        throw error;
    }
}

/**
 * Rechaza el producto escaneado y permite reintentar
 */
export function rechazarEscaneo() {
    estadoEscaneo.productoFisicoEscaneado = null;
    estadoEscaneo.intentos = 0;

    console.log('❌ Escaneo rechazado. Reiniciando...');

    // Reiniciar escáner
    if (estadoEscaneo.productoVirtualActual) {
        iniciarEscaneo(estadoEscaneo.productoVirtualActual);
    }
}

/**
 * Registra handlers para los botones de confirmación de escaneo
 */
function registrarHandlersConfirmacion(callbacks) {
    let btnConfirmar = document.getElementById('btnConfirmarEscanerPZ');
    let btnReintentar = document.getElementById('btnReintentoEscanerPZ');
    let btnSaltar = document.getElementById('btnSaltarProductoPZ');

    // Limpiar listeners anteriores clonando CON contenido (cloneNode(true))
    if (btnConfirmar) {
        const nuevoConfirmar = btnConfirmar.cloneNode(true); // true = clonar con contenido e hijos
        btnConfirmar.parentNode.replaceChild(nuevoConfirmar, btnConfirmar);
        btnConfirmar = nuevoConfirmar; // Actualizar referencia
        
        btnConfirmar.addEventListener('click', async () => {
            console.log('🖱️ Usuario hizo clic en Confirmar Escaneo');
            if (callbacks.onConfirmar) {
                console.log('🔄 Ejecutando callback onConfirmar...');
                try {
                    await callbacks.onConfirmar();
                    console.log('✅ Callback onConfirmar completado');
                } catch (error) {
                    console.error('❌ Error en callback onConfirmar:', error);
                }
            }
        });
    }

    if (btnReintentar) {
        const nuevoReintentar = btnReintentar.cloneNode(true); // true = clonar con contenido e hijos
        btnReintentar.parentNode.replaceChild(nuevoReintentar, btnReintentar);
        btnReintentar = nuevoReintentar; // Actualizar referencia
        
        btnReintentar.addEventListener('click', () => {
            console.log('🖱️ Usuario hizo clic en Reintentar');
            estadoEscaneo.intentos = 0; // Reset intentos
            iniciarEscaneo(estadoEscaneo.productoVirtualActual, callbacks);
            if (callbacks && callbacks.onReintentar) {
                callbacks.onReintentar();
            }
        });
    }

    if (btnSaltar) {
        const nuevoSaltar = btnSaltar.cloneNode(true); // true = clonar con contenido e hijos
        btnSaltar.parentNode.replaceChild(nuevoSaltar, btnSaltar);
        btnSaltar = nuevoSaltar; // Actualizar referencia
        
        btnSaltar.addEventListener('click', () => {
            console.log('🖱️ Usuario hizo clic en Saltar');
            if (callbacks && callbacks.onSaltar) {
                callbacks.onSaltar();
            }
        });
    }
}

/**
 * Obtiene el estado actual del escaneo
 * @returns {Object}
 */
export function obtenerEstadoEscaneo() {
    return {
        ...estadoEscaneo,
        resumen: {
            productoVirtualActual: estadoEscaneo.productoVirtualActual?.numero,
            tieneProductoFisico: estadoEscaneo.productoFisicoEscaneado !== null,
            intentosRestantes: Math.max(0, estadoEscaneo.maxIntentos - estadoEscaneo.intentos)
        }
    };
}

/**
 * Finaliza el escaneo y obtiene resumen
 * @returns {Promise<Object>}
 */
export async function finalizarEscaneo() {
    detenerEscaneo();
    
    try {
        const resumen = await obtenerResumenEscaneo();
        console.log('📊 Escaneo finalizado:', resumen);
        return resumen;
    } catch (error) {
        console.error('❌ Error finalizando escaneo:', error);
        throw error;
    }
}

/**
 * Limpia la tarjeta de resultado del escaneo
 */
export function limpiarResultadoEscaneo() {
    const tarjeta = document.getElementById('tarjetaProductoEscaneado');
    if (tarjeta) {
        tarjeta.style.display = 'none';
    }
}

/**
 * Reanuda el escaneo
 */
export function reanudarEscaneo() {
    if (scanner && estadoEscaneo.activo) {
        console.log('▶️ Reanudando escaneo...');
        codigoYaProcesado = false;
    }
}

/**
 * Registra un nuevo producto en Supabase y reintenta el escaneo
 * @param {Object} nuevoProducto - {codigo, nombre, marca, categoria, unidad}
 * @param {string} codigoEscaneado - Código que se intentó escanear
 * @param {Object} callbacks - Callbacks del escaneo
 */
async function registrarProductoYReescanear(nuevoProducto, codigoEscaneado, callbacks) {
    try {
        console.log('💾 Registrando producto en Supabase:', nuevoProducto);
        mostrarEstadoEscaneo('⏳ Guardando producto...', 'info');
        
        // Obtener cliente Supabase
        const supabase = await getSupabase();
        
        // Insertar en tabla productos
        const { data, error } = await supabase
            .from('productos')
            .insert([{
                codigo: nuevoProducto.codigo,
                nombre: nuevoProducto.nombre,
                marca: nuevoProducto.marca || '',
                categoria: nuevoProducto.categoria || '',
                unidad: nuevoProducto.unidad || 'Pz'
            }]);
        
        if (error) {
            console.error('❌ Error guardando producto:', error);
            mostrarEstadoEscaneo('❌ Error al guardar: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Producto guardado:', data);
        mostrarEstadoEscaneo('✅ Producto guardado. Reiniciando escaneo...', 'exito');
        
        // Esperar un bit y reintentar
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        limpiarResultadoEscaneo();
        reanudarEscaneo();
        
    } catch (error) {
        console.error('❌ Error en registrarProductoYReescanear:', error);
        mostrarEstadoEscaneo('❌ Error: ' + error.message, 'error');
    }
}

/**
 * Marca el producto actual como saltado y avanza al siguiente
 * @param {Object} callbacks - Callbacks del escaneo
 */
async function saltarProductoActual(callbacks) {
    try {
        console.log('⏭️ Saltando producto actual');
        mostrarEstadoEscaneo('⏭️ Producto marcado como pendiente', 'advertencia');
        
        // Marcar como pendiente_revision
        estadoEscaneo.productoPendiente = {
            virtualId: estadoEscaneo.productoVirtualActual?.id,
            estado: 'pendiente_revision',
            timestamp: new Date().toISOString()
        };
        
        console.log('📌 Producto pendiente guardado:', estadoEscaneo.productoPendiente);
        
        // Limpiar resultado
        limpiarResultadoEscaneo();
        
        // Avanzar al siguiente producto
        if (callbacks?.onSaltar) {
            callbacks.onSaltar();
        }
        
    } catch (error) {
        console.error('❌ Error saltando producto:', error);
        mostrarEstadoEscaneo('❌ Error: ' + error.message, 'error');
    }
}
