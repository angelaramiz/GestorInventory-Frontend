// Módulo core para funciones compartidas entre scanner y ui

import { productosEscaneados, configuracionEscaneo, preciosPorKiloGuardados } from './config.js';
import { mostrarAnimacionProcesamiento, ocultarAnimacionProcesamiento, reproducirSonidoConfirmacion, mostrarMensaje, mostrarAlertaBurbuja, generarIdUnico } from './utils.js';
import { buscarProductoPorPLU, verificarProductoExistente, verificarRegistroReciente, extraerDatosCodeCODE128, diccionarioSubproductos } from './processor.js';

// Función para procesar el código escaneado en modo avanzado
export async function procesarCodigoEscaneadoLotesAvanzado(codigo, resultado) {
    try {
        // Mostrar animación de procesamiento
        mostrarAnimacionProcesamiento('Procesando código...', 'processing');

        // 1. Extraer datos del código CODE128
        const datosExtraidos = extraerDatosCodeCODE128(codigo);

        if (!datosExtraidos) {
            mostrarAnimacionProcesamiento('Código inválido', 'error');
            reanudarEscannerDespuesDeProcesamiento();
            return;
        }

        // 2. Buscar producto por PLU
        const producto = await buscarProductoPorPLU(datosExtraidos.plu);

        if (!producto) {
            mostrarAnimacionProcesamiento('Producto no encontrado', 'error');
            reanudarEscannerDespuesDeProcesamiento();
            return;
        }

        // 3. Verificar si el producto ya fue registrado recientemente con el mismo precio
        if (verificarRegistroReciente(datosExtraidos.plu, datosExtraidos.precioPorcion)) {
            mostrarAnimacionProcesamiento('Producto registrado recientemente', 'warning');
            reanudarEscannerDespuesDeProcesamiento();
            return;
        }

        // 4. Verificar si el producto ya fue escaneado previamente o si tenemos precio guardado
        const productoExistente = verificarProductoExistente(datosExtraidos.plu);

        if (productoExistente && productoExistente.nombre) {
            // Producto ya escaneado con nombre, mostrar ventana de confirmación si está habilitado
            if (configuracionEscaneo.confirmarProductosSimilares) {
                mostrarVentanaConfirmacionProducto(producto, datosExtraidos, productoExistente);
            } else {
                procesarProductoExistente(producto, datosExtraidos, productoExistente);
            }
        } else {
            // Producto nuevo o solo precio guardado, buscar relación con producto primario
            let productoPrimario = null;

            if (configuracionEscaneo.relacionarProductos && diccionarioSubproductos.has(producto.codigo)) {
                // Es un subproducto, buscar el primario
                const primariosIds = diccionarioSubproductos.get(producto.codigo);
                if (primariosIds && primariosIds.length > 0) {
                    // Tomar el primer primario (puede haber múltiples)
                    const primarioId = primariosIds[0];
                    productoPrimario = await buscarProductoPorPLU(primarioId);
                }
            }

            // Mostrar modal de información del producto
            mostrarModalInformacionProducto(producto, datosExtraidos, productoPrimario, productoPrimario ? 'subproducto' : 'primario');
        }

    } catch (error) {
        console.error('Error al procesar código:', error);
        mostrarAnimacionProcesamiento('Error al procesar', 'error');
        reanudarEscannerDespuesDeProcesamiento();
    }
}

// Función para mostrar el modal de información del producto
function mostrarModalInformacionProducto(producto, datosExtraidos, productoPrimario, tipo) {
    // Ocultar animación de procesamiento
    ocultarAnimacionProcesamiento();

    const modal = document.getElementById('modalInfoProducto');
    const contenido = document.getElementById('contenidoInfoProducto');

    let htmlContenido = '';

    if (tipo === 'subproducto' && productoPrimario) {
        htmlContenido = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Información del Subproducto -->
                <div class="bg-blue-50 p-4 rounded-lg dark-modal-section">
                    <h4 class="text-lg font-bold mb-3 text-blue-800 dark-modal-title">📦 Subproducto Escaneado</h4>
                    <div class="space-y-2">
                        <div class="dark-modal-text"><strong>Código:</strong> ${producto.codigo}</div>
                        <div class="dark-modal-text"><strong>Nombre:</strong> ${producto.nombre}</div>
                        <div class="dark-modal-text"><strong>Marca:</strong> ${producto.marca}</div>
                        <div class="dark-modal-text"><strong>Unidad:</strong> ${producto.unidad}</div>
                        <div class="dark-modal-text"><strong>Categoría:</strong> ${producto.categoria}</div>
                    </div>
                </div>

                <!-- Información del Producto Primario -->
                <div class="bg-green-50 p-4 rounded-lg dark-modal-section">
                    <h4 class="text-lg font-bold mb-3 text-green-800 dark-modal-title">🏷️ Producto Primario</h4>
                    <div class="space-y-2">
                        <div class="dark-modal-text"><strong>Código:</strong> ${productoPrimario.codigo}</div>
                        <div class="dark-modal-text"><strong>Nombre:</strong> ${productoPrimario.nombre}</div>
                        <div class="dark-modal-text"><strong>Marca:</strong> ${productoPrimario.marca}</div>
                        <div class="dark-modal-text"><strong>Unidad:</strong> ${productoPrimario.unidad}</div>
                        <div class="dark-modal-text"><strong>Categoría:</strong> ${productoPrimario.categoria}</div>
                    </div>
                </div>
            </div>

            <!-- Datos del código escaneado -->
            <div class="mt-4 bg-gray-50 p-4 rounded-lg dark-modal-section">
                <h4 class="text-lg font-bold mb-3 text-gray-800 dark-modal-title">🔍 Datos del Código Escaneado</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div class="dark-modal-text"><strong>PLU:</strong> ${datosExtraidos.plu}</div>
                    <div class="dark-modal-text"><strong>Precio Porción:</strong> $${datosExtraidos.precioPorcion.toFixed(2)}</div>
                    <div class="dark-modal-text"><strong>Peso Estimado:</strong> ${datosExtraidos.pesoTemporal.toFixed(3)} kg</div>
                </div>
                <div class="mt-2 text-sm text-gray-600 dark-modal-text">
                    <em>* El peso se recalculará con el precio por kilo que ingrese</em>
                </div>
            </div>
        `;
    } else {
        htmlContenido = `
            <div class="bg-blue-50 p-4 rounded-lg dark-modal-section">
                <h4 class="text-lg font-bold mb-3 text-blue-800 dark-modal-title">📦 Producto Primario</h4>
                <div class="space-y-2">
                    <div class="dark-modal-text"><strong>Código:</strong> ${producto.codigo}</div>
                    <div class="dark-modal-text"><strong>Nombre:</strong> ${producto.nombre}</div>
                    <div class="dark-modal-text"><strong>Marca:</strong> ${producto.marca}</div>
                    <div class="dark-modal-text"><strong>Unidad:</strong> ${producto.unidad}</div>
                    <div class="dark-modal-text"><strong>Categoría:</strong> ${producto.categoria}</div>
                </div>
            </div>

            <!-- Datos del código escaneado -->
            <div class="mt-4 bg-gray-50 p-4 rounded-lg dark-modal-section">
                <h4 class="text-lg font-bold mb-3 text-gray-800 dark-modal-title">🔍 Datos del Código Escaneado</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div class="dark-modal-text"><strong>PLU:</strong> ${datosExtraidos.plu}</div>
                    <div class="dark-modal-text"><strong>Precio Porción:</strong> $${datosExtraidos.precioPorcion.toFixed(2)}</div>
                    <div class="dark-modal-text"><strong>Peso Estimado:</strong> ${datosExtraidos.pesoTemporal.toFixed(3)} kg</div>
                </div>
                <div class="mt-2 text-sm text-gray-600 dark-modal-text">
                    <em>* El peso se recalculará con el precio por kilo que ingrese</em>
                </div>
            </div>
        `;
    }

    // Agregar campo para precio por kilo
    htmlContenido += `
        <div class="mt-4">
            <label for="precioKiloProducto" class="block text-sm font-medium text-gray-700 mb-2 dark-modal-label">
                Precio por Kilo ($):
            </label>
            <input type="number" id="precioKiloProducto" step="0.01" min="0"
                   class="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark-modal-input"
                   placeholder="Ingrese el precio por kilogramo">
        </div>
    `;

    contenido.innerHTML = htmlContenido;

    // Almacenar datos para usar en guardar
    modal.dataset.producto = JSON.stringify(producto);
    modal.dataset.datosExtraidos = JSON.stringify(datosExtraidos);
    modal.dataset.productoPrimario = JSON.stringify(productoPrimario);
    modal.dataset.tipo = tipo;

    // Event listener para habilitar botón cuando se ingrese precio
    document.getElementById('precioKiloProducto').addEventListener('input', function () {
        const btnGuardar = document.getElementById('guardarInfoProducto');
        btnGuardar.disabled = !this.value || parseFloat(this.value) <= 0;
    });

    modal.style.display = 'block';
}

// Función para guardar información del producto
export function guardarInfoProducto() {
    const modal = document.getElementById('modalInfoProducto');
    const precioKilo = parseFloat(document.getElementById('precioKiloProducto').value);

    if (!precioKilo || precioKilo <= 0) {
        mostrarMensaje('Debe ingresar un precio válido por kilogramo', 'error');
        return;
    }

    const producto = JSON.parse(modal.dataset.producto);
    const datosExtraidos = JSON.parse(modal.dataset.datosExtraidos);
    const productoPrimario = JSON.parse(modal.dataset.productoPrimario);
    const tipo = modal.dataset.tipo;

    // Guardar precio por kilo temporalmente para futuros escaneos del mismo PLU
    preciosPorKiloGuardados.set(datosExtraidos.plu, precioKilo);
    console.log(`Precio por kilo guardado para PLU ${datosExtraidos.plu}: $${precioKilo.toFixed(2)}`);

    // Recalcular peso con el precio por kilo ingresado
    const pesoCalculadoRaw = datosExtraidos.precioPorcion / precioKilo;
    // Truncar a 3 decimales (recortar sin redondear)
    const pesoCalculado = Math.floor(pesoCalculadoRaw * 1000) / 1000;

    // Crear objeto del producto escaneado
    const productoEscaneado = {
        id: generarIdUnico(),
        plu: datosExtraidos.plu,
        codigo: producto.codigo,
        nombre: producto.nombre,
        marca: producto.marca,
        unidad: producto.unidad,
        categoria: producto.categoria,
        peso: pesoCalculado,
        precioPorcion: datosExtraidos.precioPorcion,
        precioKilo: precioKilo,
        tipo: tipo,
        productoPrimario: productoPrimario,
        timestamp: new Date().toISOString()
    };

    // Agregar a la lista de productos escaneados
    productosEscaneados.push(productoEscaneado);

    // Actualizar contadores
    actualizarContadoresAvanzado();

    // Actualizar listado inmediatamente
    actualizarListadoProductosAvanzado();

    // Reproducir sonido de confirmación
    if (configuracionEscaneo.sonidoConfirmacion) {
        reproducirSonidoConfirmacion();
    }

    // Mostrar notificación de éxito con burbuja (no bloquea el proceso)
    mostrarAlertaBurbuja(`✅ ${producto.nombre} - ${pesoCalculado.toFixed(3)}kg`, 'success');

    // Cerrar modal
    cerrarModalInfoProducto();

    // Limpiar variables de debounce después de procesar exitosamente
    limpiarDebounce();

    // Reanudar escáner
    reanudarEscannerDespuesDeProcesamiento();
}

// Función para cerrar el modal de información del producto
export function cerrarModalInfoProducto() {
    document.getElementById('modalInfoProducto').style.display = 'none';
}

// Función para procesar producto existente
function procesarProductoExistente(producto, datosExtraidos, productoExistente) {
    // Usar el precio por kilo ya almacenado (puede venir de producto escaneado o precio guardado)
    const precioKilo = productoExistente.precioKilo;
    const pesoCalculadoRaw = datosExtraidos.precioPorcion / precioKilo;
    // Truncar a 3 decimales (recortar sin redondear)
    const pesoCalculado = Math.floor(pesoCalculadoRaw * 1000) / 1000;

    // Crear objeto del producto escaneado
    const productoEscaneado = {
        id: generarIdUnico(),
        plu: datosExtraidos.plu,
        codigo: producto.codigo,
        nombre: producto.nombre,
        marca: producto.marca,
        unidad: producto.unidad,
        categoria: producto.categoria,
        peso: pesoCalculado,
        precioPorcion: datosExtraidos.precioPorcion,
        precioKilo: precioKilo,
        tipo: productoExistente.tipo || 'primario', // Usar tipo existente o primario por defecto
        productoPrimario: productoExistente.productoPrimario || null,
        timestamp: new Date().toISOString()
    };

    // Agregar a la lista
    productosEscaneados.push(productoEscaneado);

    // Actualizar contadores
    actualizarContadoresAvanzado();

    // Actualizar listado inmediatamente
    actualizarListadoProductosAvanzado();

    // Reproducir sonido
    if (configuracionEscaneo.sonidoConfirmacion) {
        reproducirSonidoConfirmacion();
    }

    // Mostrar notificación con burbuja (no bloquea el proceso)
    mostrarAlertaBurbuja(`✅ ${producto.nombre} - ${pesoCalculado.toFixed(3)}kg`, 'success');

    // Limpiar variables de debounce después de procesar exitosamente
    limpiarDebounce();

    // Reanudar escáner
    reanudarEscannerDespuesDeProcesamiento();
}

// Función para mostrar ventana de confirmación para productos similares
function mostrarVentanaConfirmacionProducto(producto, datosExtraidos, productoExistente) {
    // Ocultar animación de procesamiento
    ocultarAnimacionProcesamiento();

    // Usar SweetAlert2 para mostrar la confirmación
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '🤔 Producto ya escaneado',
            html: `
                <div class="text-left">
                    <p><strong>Producto:</strong> ${producto.nombre}</p>
                    <p><strong>PLU:</strong> ${datosExtraidos.plu}</p>
                    <p><strong>Nuevo peso:</strong> ${(datosExtraidos.precioPorcion / productoExistente.precioKilo).toFixed(3)} kg</p>
                    <p><strong>Precio por kilo anterior:</strong> $${productoExistente.precioKilo.toFixed(2)}</p>
                    <p><strong>Nuevo precio porción:</strong> $${datosExtraidos.precioPorcion.toFixed(2)}</p>
                    <br>
                    <p>¿Desea agregar este producto con los datos anteriores?</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, agregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                procesarProductoExistente(producto, datosExtraidos, productoExistente);
            } else {
                reanudarEscannerDespuesDeProcesamiento();
            }
        });
    } else {
        // Fallback si SweetAlert2 no está disponible
        const confirmacion = confirm(
            `Producto ya escaneado: ${producto.nombre}\n` +
            `PLU: ${datosExtraidos.plu}\n` +
            `Nuevo peso: ${(datosExtraidos.precioPorcion / productoExistente.precioKilo).toFixed(3)} kg\n` +
            `¿Desea agregarlo con los datos anteriores?`
        );

        if (confirmacion) {
            procesarProductoExistente(producto, datosExtraidos, productoExistente);
        } else {
            reanudarEscannerDespuesDeProcesamiento();
        }
    }
}

// Importar funciones necesarias
import { actualizarContadoresAvanzado, actualizarListadoProductosAvanzado } from './ui.js';
import { limpiarDebounce } from './config.js';
import { reanudarEscannerDespuesDeProcesamiento } from './scanner.js';