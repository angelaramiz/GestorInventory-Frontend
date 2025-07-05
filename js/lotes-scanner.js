// Funcionalidad de escaneo por lotes para productos tipo Kg
import { mostrarMensaje } from './logs.js';
import { sanitizarEntrada } from './sanitizacion.js';

// Variables globales para el escaneo por lotes
let scannerLotes = null;
let codigosEscaneados = [];
let productoActualLotes = null;
let precioKiloActual = 0;
let isEscaneoLotesActivo = false;

// Función para inicializar el sistema de lotes
export function inicializarSistemaLotes() {
    // Event listeners para las pestañas principales
    document.getElementById('tabInventario')?.addEventListener('click', () => {
        cambiarTabPrincipal('inventario');
    });
    
    document.getElementById('tabLotes')?.addEventListener('click', () => {
        cambiarTabPrincipal('lotes');
    });

    // Event listener para el precio por kilo
    document.getElementById('precioKilo')?.addEventListener('input', function() {
        const precio = parseFloat(this.value) || 0;
        const btnIniciar = document.getElementById('iniciarEscaneoLotes');
        if (precio > 0) {
            btnIniciar.disabled = false;
            btnIniciar.classList.remove('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
            btnIniciar.classList.add('hover:bg-green-600');
        } else {
            btnIniciar.disabled = true;
            btnIniciar.classList.add('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
            btnIniciar.classList.remove('hover:bg-green-600');
        }
    });

    // Event listener para iniciar escaneo por lotes
    document.getElementById('iniciarEscaneoLotes')?.addEventListener('click', iniciarEscaneoLotes);

    // Event listeners para el modal
    document.getElementById('cerrarModalLotes')?.addEventListener('click', cerrarModalLotes);
    document.getElementById('finalizarEscaneoLotes')?.addEventListener('click', finalizarEscaneoLotes);
    document.getElementById('pararEscaneoLotes')?.addEventListener('click', pausarEscaneoLotes);

    // Event listeners para las pestañas del modal
    document.getElementById('tabEscaner')?.addEventListener('click', () => {
        cambiarTabModal('escaner');
    });
    
    document.getElementById('tabListado')?.addEventListener('click', () => {
        cambiarTabModal('listado');
    });
}

// Función para cambiar entre pestañas principales
function cambiarTabPrincipal(tab) {
    const tabInventario = document.getElementById('tabInventario');
    const tabLotes = document.getElementById('tabLotes');
    const formularioNormal = document.getElementById('formularioInventarioNormal');
    const formularioLotes = document.getElementById('formularioLotes');

    if (tab === 'inventario') {
        // Activar pestaña inventario
        tabInventario.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabLotes.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar formulario normal
        formularioNormal.style.display = 'block';
        formularioLotes.style.display = 'none';
    } else if (tab === 'lotes') {
        // Activar pestaña lotes
        tabLotes.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabInventario.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar formulario lotes
        formularioNormal.style.display = 'none';
        formularioLotes.style.display = 'block';
        
        // Llenar información del producto en el formulario de lotes
        llenarInformacionProductoLotes();
    }
}

// Función para llenar la información del producto en la sección de lotes
function llenarInformacionProductoLotes() {
    if (!productoActualLotes) {
        // Si no hay producto establecido, usar los valores del formulario
        const codigo = document.getElementById('codigoProductoInventario').value;
        const nombre = document.getElementById('nombreProductoInventario').value;
        const unidad = document.getElementById('unidadProducto').value;
        
        productoActualLotes = {
            codigo: codigo,
            nombre: nombre,
            unidad: unidad,
            categoria: 'Perecedero', // Valor por defecto
            marca: 'Marca genérica' // Valor por defecto
        };
    }
    
    document.getElementById('codigoProductoLotes').textContent = productoActualLotes.codigo;
    document.getElementById('nombreProductoLotes').textContent = productoActualLotes.nombre;
    document.getElementById('unidadProductoLotes').textContent = productoActualLotes.unidad;
    document.getElementById('categoriaProductoLotes').textContent = productoActualLotes.categoria || 'No especificada';
    document.getElementById('marcaProductoLotes').textContent = productoActualLotes.marca || 'No especificada';
}

// Función para establecer el producto actual desde el exterior
export function establecerProductoActual(producto) {
    productoActualLotes = {
        codigo: producto.codigo,
        nombre: producto.nombre,
        unidad: producto.unidad,
        categoria: producto.categoria || 'No especificada',
        marca: producto.marca || 'No especificada'
    };
    
    // Si ya se está mostrando el formulario de lotes, actualizar la información
    const formularioLotes = document.getElementById('formularioLotes');
    if (formularioLotes && formularioLotes.style.display !== 'none') {
        llenarInformacionProductoLotes();
    }
}

// Función para mostrar/ocultar pestañas según el tipo de producto
export function manejarTipoProducto(unidad) {
    const tabsContainer = document.getElementById('tabsContainer');
    
    if (unidad && unidad.toLowerCase().includes('kg')) {
        // Producto tipo Kg - mostrar pestañas
        tabsContainer.style.display = 'block';
        // Por defecto mostrar la pestaña de inventario normal
        cambiarTabPrincipal('inventario');
    } else {
        // Producto normal - ocultar pestañas y mostrar solo formulario normal
        tabsContainer.style.display = 'none';
        document.getElementById('formularioInventarioNormal').style.display = 'block';
        document.getElementById('formularioLotes').style.display = 'none';
    }
}

// Función para iniciar el escaneo por lotes
function iniciarEscaneoLotes() {
    const precio = parseFloat(document.getElementById('precioKilo').value);
    
    if (!precio || precio <= 0) {
        mostrarMensaje('Debe ingresar un precio válido por kilogramo', 'error');
        return;
    }
    
    precioKiloActual = precio;
    codigosEscaneados = [];
    
    // Mostrar modal
    document.getElementById('modalEscaneoLotes').style.display = 'block';
    
    // Activar la pestaña del escáner por defecto
    cambiarTabModal('escaner');
    
    // Inicializar el escáner
    setTimeout(() => {
        inicializarEscanerLotes();
    }, 500);
}

// Función para cambiar pestañas en el modal
function cambiarTabModal(tab) {
    const tabEscaner = document.getElementById('tabEscaner');
    const tabListado = document.getElementById('tabListado');
    const contenidoEscaner = document.getElementById('contenidoEscaner');
    const contenidoListado = document.getElementById('contenidoListado');

    if (tab === 'escaner') {
        // Activar pestaña escáner
        tabEscaner.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabListado.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar contenido escáner
        contenidoEscaner.style.display = 'block';
        contenidoListado.style.display = 'none';
        
        // Reanudar escáner si estaba pausado
        if (!isEscaneoLotesActivo && scannerLotes) {
            reanudarEscaneoLotes();
        }
    } else if (tab === 'listado') {
        // Activar pestaña listado
        tabListado.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabEscaner.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar contenido listado
        contenidoEscaner.style.display = 'none';
        contenidoListado.style.display = 'block';
        
        // Pausar escáner
        if (isEscaneoLotesActivo) {
            pausarEscaneoLotes();
        }
        
        // Actualizar listado
        actualizarListadoCodigos();
    }
}

// Función para inicializar el escáner de lotes
function inicializarEscanerLotes() {
    if (typeof Html5Qrcode === 'undefined') {
        mostrarMensaje('Error: Librería de escaneo no disponible', 'error');
        return;
    }

    scannerLotes = new Html5Qrcode("reader-lotes");
    
    const config = {
        fps: 10,
        qrbox: { width: 300, height: 200 },
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    scannerLotes.start(
        { facingMode: "environment" },
        config,
        onEscaneoExitosoLotes,
        onErrorEscaneoLotes
    ).then(() => {
        isEscaneoLotesActivo = true;
        console.log("Escáner de lotes iniciado correctamente");
    }).catch(err => {
        console.error("Error al iniciar escáner de lotes:", err);
        mostrarMensaje('Error al iniciar el escáner', 'error');
    });
}

// Función cuando el escaneo es exitoso
function onEscaneoExitosoLotes(decodedText, decodedResult) {
    console.log(`Código escaneado en lotes: ${decodedText}`);
    
    // Sanitizar el código escaneado
    const codigoLimpio = sanitizarEntrada(decodedText);
    
    // Validar y procesar el código
    procesarCodigoEscaneadoLotes(codigoLimpio, decodedResult);
}

// Función para manejar errores del escáner
function onErrorEscaneoLotes(error) {
    // No mostrar errores continuos del escáner para evitar spam
    // console.warn("Error de escáner de lotes:", error);
}

// Función para procesar el código escaneado
function procesarCodigoEscaneadoLotes(codigo, resultado) {
    // Validar que el código sea del tipo CODE128 (típico para pesos)
    let formato = 'desconocido';
    if (resultado && resultado.result && resultado.result.format) {
        formato = resultado.result.format.formatName || 'desconocido';
    }
    
    console.log(`Formato detectado: ${formato}`);
    
    // Pausar el escáner temporalmente para evitar múltiples lecturas
    if (scannerLotes && isEscaneoLotesActivo) {
        scannerLotes.pause(true);
        isEscaneoLotesActivo = false;
    }
    
    // Mostrar animación de validación
    mostrarAnimacionValidacion('loading');
    
    // Simular tiempo de validación (puedes ajustar según necesidades)
    setTimeout(() => {
        validarYProcesarCodigo(codigo, resultado);
    }, 1500);
}

// Función para validar y procesar el código con animaciones
function validarYProcesarCodigo(codigo, resultado) {
    // Para códigos CODE128, intentar extraer datos según nuevo formato: 2PLUppppppX
    const datosExtraidos = extraerDatosCodeCODE128(codigo);
    
    if (!datosExtraidos) {
        mostrarAnimacionValidacion('error', 'Código no válido', 'Formato esperado: 2PLUppppppX');
        reanudarEscannerDespuesDeValidacion();
        return;
    }
    
    // Validar que el PLU coincida con el producto actual
    if (!validarPLUProducto(datosExtraidos.plu)) {
        const pluProducto = extraerPLUProductoActual();
        mostrarAnimacionValidacion('error', 'PLU no coincide', `Producto actual: ${pluProducto} | Escaneado: ${datosExtraidos.plu}`);
        reanudarEscannerDespuesDeValidacion();
        return;
    }
    
    // Validación exitosa - mostrar animación de éxito
    mostrarAnimacionValidacion('success', 'Código válido', `${datosExtraidos.peso.toFixed(3)}kg - $${datosExtraidos.precioPorcion.toFixed(2)}`);
    
    // Crear objeto del código escaneado
    const codigoEscaneadoObj = {
        id: Date.now() + Math.random(), // ID único
        codigoCompleto: codigo,
        plu: datosExtraidos.plu,
        peso: datosExtraidos.peso,
        precioPorcion: datosExtraidos.precioPorcion,
        precioKilo: precioKiloActual,
        timestamp: new Date().toISOString()
    };
    
    // Agregar a la lista después de un breve delay
    setTimeout(() => {
        codigosEscaneados.push(codigoEscaneadoObj);
        
        // Actualizar contador en la pestaña
        document.getElementById('contadorCodigos').textContent = codigosEscaneados.length;
        
        // Actualizar totales
        actualizarTotales();
        
        // Mostrar mensaje de éxito
        mostrarMensaje(`Código agregado: ${datosExtraidos.peso.toFixed(3)}kg - $${datosExtraidos.precioPorcion.toFixed(2)}`, 'success');
        
        // Sonido de confirmación (si está disponible)
        reproducirSonidoConfirmacion();
        
        // Animar la adición del código a la tabla si estamos en la pestaña de listado
        if (document.getElementById('contenidoListado').style.display !== 'none') {
            actualizarListadoCodigos();
            const filas = document.querySelectorAll('#listadoCodigosEscaneados tr');
            if (filas.length > 0) {
                const ultimaFila = filas[filas.length - 1];
                ultimaFila.classList.add('code-added-animation');
            }
        }
        
        // Reanudar escáner después de un breve delay
        reanudarEscannerDespuesDeValidacion();
    }, 1000);
}

// Función para extraer datos de código CODE128 (formato real de balanza)
function extraerDatosCodeCODE128(codigo) {
    console.log(`\n=== ANÁLISIS DE CÓDIGO CODE128 ===`);
    console.log(`Código completo: ${codigo} (longitud: ${codigo.length})`);
    
    // Eliminar cualquier prefijo de ceros si existe
    const codigoLimpio = codigo.replace(/^0+/, '');
    console.log(`Código sin ceros iniciales: ${codigoLimpio}`);
    
    // Análisis del formato real observado: 022630000287341 (15 dígitos)
    // Formato parece ser: 0[prefijo]PLU[peso en gramos][dígito control]
    // 022630000287341 = 0 + 2263 (PLU) + 00002873 (peso en gramos) + 4 (control) + 1 (extra?)
    
    let plu, pesoGramos, digitoControl;
    
    // Intentar múltiples patrones de extracción basados en longitudes observadas
    if (codigo.length === 15 && codigo.startsWith('02')) {
        // Formato báscula real: 022630000287341
        // Estructura: 02(tipo) + 2630(PLU) + 00028734(precio en centavos) + 1(control)
        // El precio viene en centavos, no el peso
        
        plu = codigo.substring(2, 6);              // Posiciones 2-5: PLU (2630)
        const precioStr = codigo.substring(6, 14); // Posiciones 6-13: precio en centavos (00028734)
        const precioCentavos = parseInt(precioStr); // 28734 centavos = 287.34 pesos
        digitoControl = codigo.substring(14, 15);  // Posición 14: dígito control
        
        // Convertir centavos a pesos
        const precioPorcion = precioCentavos / 100;
        
        // Calcular peso basado en el precio y el precio por kilo
        const pesoCalculado = precioPorcion / precioKiloActual;
        
        console.log(`Patrón báscula 15 dígitos detectado (PRECIO):
            - Prefijo: ${codigo.substring(0, 2)}
            - PLU: ${plu}
            - Precio string: ${precioStr}
            - Precio en centavos: ${precioCentavos}
            - Precio porción: $${precioPorcion.toFixed(2)}
            - Precio por kilo: $${precioKiloActual.toFixed(2)}
            - Peso calculado: ${pesoCalculado.toFixed(3)}kg
            - Dígito control: ${digitoControl}`);
            
        // Validación básica
        if (pesoCalculado <= 0 || pesoCalculado > 50) {
            console.log(`Peso calculado fuera de rango: ${pesoCalculado}kg`);
            return null;
        }
        
        return {
            plu: plu,
            peso: pesoCalculado,
            precioPorcion: precioPorcion,
            digitoControl: digitoControl
        };
            
    } else if (codigo.length === 13 && codigo.startsWith('2')) {
        // Formato alternativo: 2 + 4 dígitos PLU + 7 dígitos peso + 1 dígito control
        plu = codigo.substring(1, 5);
        const pesoStr = codigo.substring(5, 12);
        pesoGramos = parseInt(pesoStr);
        digitoControl = codigo.substring(12, 13);
        
        console.log(`Patrón 13 dígitos detectado:
            - PLU: ${plu}
            - Peso en gramos: ${pesoGramos}
            - Dígito control: ${digitoControl}`);
            
    } else if (codigo.length >= 9 && codigoLimpio.startsWith('2')) {
        // Formato original: 2 + 4 dígitos PLU + precio variable + 2 centavos + 1 control
        const match = codigoLimpio.match(/^2(\d{4})(\d+)(\d{2})(\d)$/);
        
        if (match) {
            plu = match[1];
            const pesos = parseInt(match[2]);
            const centavos = parseInt(match[3]);
            digitoControl = match[4];
            
            // En este caso, calcular desde precio
            const precioPorcion = pesos + (centavos / 100);
            const pesoCalculado = precioPorcion / precioKiloActual;
            
            console.log(`Patrón precio detectado:
                - PLU: ${plu}
                - Precio porción: $${precioPorcion.toFixed(2)}
                - Peso calculado: ${pesoCalculado.toFixed(3)}kg`);
                
            if (pesoCalculado <= 0 || pesoCalculado > 50) {
                console.log(`Peso calculado fuera de rango: ${pesoCalculado}kg`);
                return null;
            }
            
            return {
                plu: plu,
                peso: pesoCalculado,
                precioPorcion: precioPorcion,
                digitoControl: digitoControl
            };
        }
    } else {
        console.log('Formato de código no reconocido');
        console.log(`Longitud: ${codigo.length}, Inicio: ${codigo.substring(0, 2)}`);
        return null;
    }
    
    console.log('No se pudo extraer datos del código');
    return null;
}

// Función para validar que el PLU coincida con el producto actual
function validarPLUProducto(plu) {
    const pluProducto = extraerPLUProductoActual();
    console.log(`Validando PLU: ${plu} contra producto: ${pluProducto}`);
    return pluProducto === plu;
}

// Función para extraer PLU del producto actual (tanto CODE128 como UPC-A)
function extraerPLUProductoActual() {
    if (!productoActualLotes || !productoActualLotes.codigo) {
        console.log('No hay producto actual definido');
        return null;
    }
    
    const codigoProducto = productoActualLotes.codigo.toString();
    console.log(`Código del producto actual: ${codigoProducto}`);
    
    // Si el código empieza con 2 (CODE128 para peso), extraer los siguientes 4 dígitos
    if (codigoProducto.startsWith('2') && codigoProducto.length >= 5) {
        const plu = codigoProducto.substring(1, 5);
        console.log(`PLU extraído de CODE128: ${plu}`);
        return plu;
    }
    
    // Si es UPC-A (12 dígitos), extraer los 4 dígitos después del primer 2
    if (codigoProducto.length === 12 && codigoProducto.startsWith('2')) {
        const plu = codigoProducto.substring(1, 5);
        console.log(`PLU extraído de UPC-A: ${plu}`);
        return plu;
    }
    
    // Si el código tiene exactamente 4 dígitos, usar como PLU directamente
    if (codigoProducto.length === 4) {
        console.log(`PLU directo: ${codigoProducto}`);
        return codigoProducto;
    }
    
    // Si el código es más largo, extraer los últimos 4 dígitos como fallback
    if (codigoProducto.length > 4) {
        const plu = codigoProducto.slice(-4);
        console.log(`PLU extraído (últimos 4 dígitos): ${plu}`);
        return plu;
    }
    
    console.log(`No se pudo extraer PLU del código: ${codigoProducto}`);
    return codigoProducto; // Retornar el código original como último recurso
}

// Función para actualizar totales
function actualizarTotales() {
    const totalCodigos = codigosEscaneados.length;
    const pesoTotal = codigosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const precioTotalGeneral = codigosEscaneados.reduce((sum, item) => sum + item.precioPorcion, 0);
    
    document.getElementById('totalCodigos').textContent = totalCodigos;
    document.getElementById('pesoTotal').textContent = pesoTotal.toFixed(3);
    document.getElementById('precioTotalGeneral').textContent = precioTotalGeneral.toFixed(2);
    
    // Habilitar botón finalizar si hay códigos
    const btnFinalizar = document.getElementById('finalizarEscaneoLotes');
    if (totalCodigos > 0) {
        btnFinalizar.disabled = false;
        btnFinalizar.classList.remove('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
    } else {
        btnFinalizar.disabled = true;
        btnFinalizar.classList.add('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
    }
}

// Función para actualizar el listado de códigos
function actualizarListadoCodigos() {
    const tbody = document.getElementById('listadoCodigosEscaneados');
    tbody.innerHTML = '';
    
    codigosEscaneados.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="py-2 px-4">${index + 1}</td>
            <td class="py-2 px-4 font-mono text-sm">${item.codigoCompleto}</td>
            <td class="py-2 px-4">${item.plu}</td>
            <td class="py-2 px-4">${item.peso.toFixed(3)}</td>
            <td class="py-2 px-4">$${item.precioPorcion.toFixed(2)}</td>
            <td class="py-2 px-4">
                <button onclick="eliminarCodigoEscaneado(${item.id})" 
                        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">
                    Eliminar
                </button>
            </td>
        `;
    });
}

// Función para eliminar un código escaneado
window.eliminarCodigoEscaneado = function(id) {
    codigosEscaneados = codigosEscaneados.filter(item => item.id !== id);
    actualizarListadoCodigos();
    actualizarTotales();
    document.getElementById('contadorCodigos').textContent = codigosEscaneados.length;
    mostrarMensaje('Código eliminado', 'info');
};

// Función para pausar el escaneo
function pausarEscaneoLotes() {
    if (scannerLotes && isEscaneoLotesActivo) {
        scannerLotes.pause(true);
        isEscaneoLotesActivo = false;
        document.getElementById('pararEscaneoLotes').textContent = 'Reanudar Escáner';
        document.getElementById('pararEscaneoLotes').className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded';
    }
}

// Función para reanudar el escaneo
function reanudarEscaneoLotes() {
    if (scannerLotes && !isEscaneoLotesActivo) {
        scannerLotes.resume();
        isEscaneoLotesActivo = true;
        document.getElementById('pararEscaneoLotes').textContent = 'Pausar Escáner';
        document.getElementById('pararEscaneoLotes').className = 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded';
    }
}

// Función para cerrar el modal
function cerrarModalLotes() {
    if (scannerLotes) {
        scannerLotes.stop().then(() => {
            scannerLotes = null;
            isEscaneoLotesActivo = false;
        }).catch(err => {
            console.error("Error al detener escáner:", err);
        });
    }
    
    // Limpiar animaciones de validación
    ocultarAnimacionValidacion();
    
    // Limpiar clases del reader
    const reader = document.getElementById('reader-lotes');
    if (reader) {
        reader.className = reader.className.replace(/\b(validating|success|error)\b/g, '');
    }
    
    document.getElementById('modalEscaneoLotes').style.display = 'none';
    
    // Reset de datos
    codigosEscaneados = [];
    precioKiloActual = 0;
    document.getElementById('precioKilo').value = '';
    document.getElementById('iniciarEscaneoLotes').disabled = true;
    
    // Remover el overlay de validación si existe
    const overlay = document.getElementById('validationOverlay');
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

// Función para finalizar el escaneo por lotes
function finalizarEscaneoLotes() {
    if (codigosEscaneados.length === 0) {
        mostrarMensaje('No hay códigos escaneados para procesar', 'error');
        return;
    }
    
    // Calcular totales finales
    const pesoTotal = codigosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const precioTotalFinal = codigosEscaneados.reduce((sum, item) => sum + item.precioPorcion, 0);
    
    // Mostrar resumen
    const resumen = `
        Resumen del escaneo por lotes:
        • Total de códigos: ${codigosEscaneados.length}
        • Peso total: ${pesoTotal.toFixed(3)} Kg
        • Valor total de las porciones: $${precioTotalFinal.toFixed(2)}
        • Precio por kilo configurado: $${precioKiloActual.toFixed(2)}
    `;
    
    // Aquí deberías integrar con el sistema de inventario
    // Por ahora, mostrar un mensaje de confirmación
    if (confirm(resumen + '\n\n¿Confirmar el registro en el inventario?')) {
        // Mostrar animación de transferencia de datos
        mostrarAnimacionTransferenciaDatos();
        
        // Procesar y guardar en el inventario después de un delay
        setTimeout(() => {
            procesarLotesEnInventario();
            cerrarModalLotesConAnimacion();
            mostrarMensaje('Lotes registrados exitosamente en el inventario', 'success');
        }, 1500);
    }
}

// Función para procesar los lotes en el inventario
function procesarLotesEnInventario() {
    // Aquí se debería integrar con el sistema existente de inventario
    // Por ejemplo, crear múltiples entradas de inventario o una entrada consolidada
    
    const pesoTotal = codigosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const valorTotal = codigosEscaneados.reduce((sum, item) => sum + item.precioPorcion, 0);
    
    // Cambiar a la pestaña normal antes de llenar los datos
    cambiarTabPrincipal('inventario');
    
    // Llenar el formulario normal con los datos consolidados
    const campoCantidad = document.getElementById('cantidad');
    if (campoCantidad) {
        campoCantidad.value = pesoTotal.toFixed(3);
        
        // Agregar efecto visual al campo que se está llenando
        campoCantidad.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
        campoCantidad.style.border = '2px solid #10b981';
        campoCantidad.style.transition = 'all 0.3s ease';
        
        // Remover efecto visual después de un tiempo
        setTimeout(() => {
            campoCantidad.style.background = '';
            campoCantidad.style.border = '';
        }, 3000);
    }
    
    // Agregar información detallada de lotes en comentarios
    const detallesLotes = codigosEscaneados.map((item, index) => 
        `Lote ${index + 1}: ${item.peso.toFixed(3)}kg - $${item.precioPorcion.toFixed(2)} (PLU: ${item.plu})`
    ).join('; ');
    
    const comentariosLotes = `Escaneo por lotes - ${codigosEscaneados.length} códigos - Valor total: $${valorTotal.toFixed(2)} - Precio/Kg: $${precioKiloActual.toFixed(2)} - Detalles: ${detallesLotes}`;
    
    const campoComentarios = document.getElementById('comentarios');
    if (campoComentarios) {
        campoComentarios.value = comentariosLotes;
        
        // Efecto visual para los comentarios también
        campoComentarios.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
        campoComentarios.style.border = '2px solid #f59e0b';
        campoComentarios.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            campoComentarios.style.background = '';
            campoComentarios.style.border = '';
        }, 3000);
    }
    
    console.log(`Peso total transferido al inventario: ${pesoTotal.toFixed(3)} kg`);
    console.log(`Comentarios agregados con ${codigosEscaneados.length} lotes`);
}

// Función para reproducir sonido de confirmación
function reproducirSonidoConfirmacion() {
    // Crear un sonido simple usando Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frecuencia del beep
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('No se puede reproducir sonido:', error);
    }
}

// Función para mostrar animaciones de validación
function mostrarAnimacionValidacion(tipo, titulo = '', mensaje = '') {
    const reader = document.getElementById('reader-lotes');
    const overlay = document.getElementById('validationOverlay') || crearOverlayValidacion();
    
    // Limpiar clases anteriores del reader
    reader.className = reader.className.replace(/\b(validating|success|error)\b/g, '');
    
    // Agregar clase correspondiente al reader
    reader.classList.add(tipo);
    
    // Mostrar overlay
    overlay.style.display = 'flex';
    
    // Crear contenido según el tipo
    let contenido = '';
    
    switch (tipo) {
        case 'loading':
            contenido = `
                <div class="validation-message validation-loading">
                    <div class="validation-spinner"></div>
                    <h3>Validando código</h3>
                    <p>Verificando PLU del producto...</p>
                    <div class="validation-progress"></div>
                </div>
            `;
            break;
            
        case 'success':
            contenido = `
                <div class="validation-message validation-success">
                    <div class="validation-icon"></div>
                    <h3>${titulo || 'Código válido'}</h3>
                    <p>${mensaje || 'PLU coincide con el producto actual'}</p>
                </div>
            `;
            break;
            
        case 'error':
            contenido = `
                <div class="validation-message validation-error">
                    <div class="validation-icon"></div>
                    <h3>${titulo || 'Código no válido'}</h3>
                    <p>${mensaje || 'PLU no coincide con el producto actual'}</p>
                </div>
            `;
            break;
    }
    
    overlay.innerHTML = contenido;
    
    // Ocultar overlay después de un tiempo (solo para success y error)
    if (tipo !== 'loading') {
        setTimeout(() => {
            ocultarAnimacionValidacion();
        }, 2000);
    }
}

// Función para crear el overlay de validación si no existe
function crearOverlayValidacion() {
    const reader = document.getElementById('reader-lotes');
    const overlay = document.createElement('div');
    overlay.id = 'validationOverlay';
    overlay.className = 'validation-overlay';
    overlay.style.display = 'none';
    
    // Insertar overlay como siguiente hermano del reader
    reader.parentNode.insertBefore(overlay, reader.nextSibling);
    
    return overlay;
}

// Función para ocultar animación de validación
function ocultarAnimacionValidacion() {
    const overlay = document.getElementById('validationOverlay');
    const reader = document.getElementById('reader-lotes');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    if (reader) {
        reader.className = reader.className.replace(/\b(validating|success|error)\b/g, '');
    }
}

// Función para reanudar el escáner después de la validación
function reanudarEscannerDespuesDeValidacion() {
    setTimeout(() => {
        if (scannerLotes && !isEscaneoLotesActivo) {
            // Solo reanudar si estamos en la pestaña del escáner
            const contenidoEscaner = document.getElementById('contenidoEscaner');
            if (contenidoEscaner && contenidoEscaner.style.display !== 'none') {
                scannerLotes.resume();
                isEscaneoLotesActivo = true;
                console.log('Escáner reanudado después de validación');
            }
        }
        ocultarAnimacionValidacion();
    }, 1000);
}

// Función para mostrar animación de transferencia de datos
function mostrarAnimacionTransferenciaDatos() {
    const animacion = document.createElement('div');
    animacion.className = 'data-transfer-animation';
    animacion.innerHTML = `
        <div class="transfer-icon"></div>
        <h3 style="margin: 0 0 0.5rem; font-size: 1.2rem; font-weight: 600;">Transfiriendo datos</h3>
        <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Procesando lotes al inventario...</p>
    `;
    
    document.body.appendChild(animacion);
    
    // Remover la animación después de que termine
    setTimeout(() => {
        if (animacion.parentNode) {
            animacion.parentNode.removeChild(animacion);
        }
    }, 1500);
}

// Función para cerrar el modal con animación
function cerrarModalLotesConAnimacion() {
    const modal = document.getElementById('modalEscaneoLotes');
    const modalContent = modal.querySelector('.scan-modal-enhanced') || modal.querySelector('.scanner-content');
    
    if (modalContent) {
        modalContent.classList.add('modal-closing');
    }
    
    setTimeout(() => {
        cerrarModalLotes();
    }, 300);
}

// Función de prueba para validar la nueva lógica de extracción (TEMPORAL - para testing)
export function probarExtraccionPrecio() {
    console.log("=== PRUEBA DE EXTRACCIÓN DE CÓDIGOS ===");
    
    // Simular precio por kilo para las pruebas
    precioKiloActual = 200; // $200 por kilo
    
    const codigosPrueba = [
        // Códigos formato precio
        "2123405005099", // PLU: 1234, Pesos: 5005, Centavos: 09, Control: 9 -> $5005.09
        "2567812345678", // PLU: 5678, Pesos: 123456, Centavos: 67, Control: 8 -> $123456.67
        "2999900000001", // PLU: 9999, Pesos: 0, Centavos: 00, Control: 1 -> $0.00
        "2111100050099", // PLU: 1111, Pesos: 000500, Centavos: 09, Control: 9 -> $500.09
        
        // Código real de báscula (contiene precio, no peso)
        "022630000287341" // PLU: 2630, Precio: 287.34 pesos -> peso calculado según precio/kilo
    ];
    
    codigosPrueba.forEach((codigo, index) => {
        console.log(`\n--- Prueba ${index + 1}: ${codigo} ---`);
        const resultado = extraerDatosCodeCODE128(codigo);
        if (resultado) {
            console.log(`✅ Éxito: PLU=${resultado.plu}, Precio=$${resultado.precioPorcion.toFixed(2)}, Peso=${resultado.peso.toFixed(3)}kg`);
        } else {
            console.log(`❌ Error al procesar el código`);
        }
    });
    
    console.log("=== FIN DE PRUEBAS ===");
}

// Las funciones ya están exportadas individualmente arriba en el archivo
// No es necesario exportarlas nuevamente aquí
