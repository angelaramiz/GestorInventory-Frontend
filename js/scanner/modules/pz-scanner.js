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

            // Calcular qrbox de forma conservadora y CUADRADA
            // En móvil: más pequeño para caber en pantalla
            // En desktop: más grande pero proporcional
            const isMobile = window.innerWidth < 768;
            let qrboxSize;
            
            if (isMobile) {
                // Móvil: usar el 40% de la altura (350px) = ~140px
                qrboxSize = Math.floor(rect.height * 0.40);
                qrboxSize = Math.max(Math.min(qrboxSize, 150), 100); // Entre 100-150px
            } else {
                // Desktop: usar el 35% de la altura (500-600px típico en div) = ~175px
                qrboxSize = Math.floor(rect.height * 0.35);
                qrboxSize = Math.max(Math.min(qrboxSize, 200), 150); // Entre 150-200px
            }
            
            console.log(`📦 Tamaño qrbox (cuadrado): ${qrboxSize}px (móvil: ${isMobile}, contenedor: ${rect.height}px alto, ${rect.width}px ancho)`);

            scanner = new Html5QrcodeScanner('qr-scanner', {
                fps: 15,
                qrbox: qrboxSize,
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                disableFlip: false
            });

            console.log('✅ Escáner HTML5QrCode inicializado');
            
            // Aplicar estilos forzados al video después de inicializar
            aplicarEstilosaVideoScanner();
            
            resolve(true);
        } catch (error) {
            console.error('❌ Error inicializando escáner:', error);
            reject(error);
        }
    });
}

/**
 * Aplica estilos forzados al video del scanner para que ocupe 100% del espacio
 */
function aplicarEstilosaVideoScanner() {
    setTimeout(() => {
        const container = document.getElementById('qr-scanner');
        if (!container) return;
        
        // Asegurar estilos del contenedor
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.height = '350px';
        container.style.overflow = 'hidden';
        container.style.padding = '0';
        container.style.margin = '0';
        container.style.boxSizing = 'border-box';
        
        // Ocultar el contenedor header de HTML5QrCode (text-align: left; margin: 0px)
        const headerContainer = container.querySelector('div[style*="text-align: left"]');
        if (headerContainer) {
            headerContainer.style.display = 'none';
            console.log('✅ Contenedor header ocultado');
        }
        
        // Región de escaneo
        const scanRegion = container.querySelector('#qr-scanner__scan_region');
        if (scanRegion) {
            scanRegion.style.width = '100%';
            scanRegion.style.height = '100%';
            scanRegion.style.display = 'block';
            scanRegion.style.overflow = 'hidden';
            scanRegion.style.padding = '0';
            scanRegion.style.margin = '0';
            scanRegion.style.position = 'relative';
            scanRegion.style.minHeight = '100%';
        }
        
        // Video
        const video = container.querySelector('video');
        if (video) {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.maxWidth = '100%';
            video.style.maxHeight = '100%';
            video.style.display = 'block';
            video.style.objectFit = 'cover';
            video.style.objectPosition = 'center';
            video.style.margin = '0';
            video.style.padding = '0';
            video.style.border = 'none';
            console.log('✅ Estilos aplicados al video');
        }
        
        // Canvas
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'none';
        }
        
        // Mostrar y asegurar que el QR box visual (esquinas blancas) esté visible
        const shadedRegion = container.querySelector('#qr-shaded-region');
        if (shadedRegion) {
            shadedRegion.style.display = 'block';
            shadedRegion.style.position = 'absolute';
            shadedRegion.style.inset = '0';
            shadedRegion.style.visibility = 'visible';
            console.log('✅ Área visual de escaneo visible');
        }
        
        // Ocultar TODOS los controles (EXCEPTO qr-shaded-region y sus hijos)
        const controls = container.querySelectorAll('button, input[type="range"], input[type="file"], select, span:not(.html5-qrcode-element)');
        controls.forEach(ctrl => {
            ctrl.style.display = 'none';
        });
        
        // Ocultar divs posicionados absolutamente EXCEPTO qr-shaded-region
        const allDivs = container.querySelectorAll('div[style*="position: absolute"]');
        allDivs.forEach(el => {
            if (el.id !== 'qr-shaded-region') {
                el.style.display = 'none';
            }
        });
        
        // Ocultar dashboard
        const dashboard = container.querySelector('#qr-scanner__dashboard');
        if (dashboard) dashboard.style.display = 'none';
        
        // Ocultar header message
        const headerMsg = container.querySelector('#qr-scanner__header_message');
        if (headerMsg) headerMsg.style.display = 'none';
        
        console.log('✅ Todos los estilos aplicados - Área visual visible');
    }, 200);
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
            // Usar stop() primero si está disponible
            if (scanner.getState && scanner.getState() > 0) {
                scanner.stop().then(() => {
                    try {
                        scanner.clear();
                        console.log('✅ Escaneo detenido correctamente');
                    } catch (e) {
                        console.warn('Advertencia al limpiar escáner:', e);
                    }
                }).catch(err => {
                    console.warn('Error al parar escáner:', err);
                });
            } else {
                scanner.clear();
                console.log('✅ Escaneo detenido');
            }
            estadoEscaneo.activo = false;
        } catch (error) {
            console.warn('Advertencia al detener escáner:', error);
            estadoEscaneo.activo = false;
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
