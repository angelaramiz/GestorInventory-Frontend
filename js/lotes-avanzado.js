// Funcionalidad de escaneo por lotes avanzado
// Mejora del sistema de lotes con detección automática y agrupación de productos

// Variables globales para el escaneo por lotes avanzado
let scannerLotesAvanzado = null;
let productosEscaneados = []; // Array de productos escaneados
let productosAgrupados = []; // Array de productos agrupados por primario
let isEscaneoLotesAvanzadoActivo = false;
let configuracionEscaneo = {
    confirmarProductosSimilares: true,
    agruparAutomaticamente: true,
    sonidoConfirmacion: true
};

// Diccionario para productos subproductos (se cargará desde Supabase)
let diccionarioSubproductos = new Map();

// Función para inicializar el sistema de lotes avanzado
function inicializarSistemaLotesAvanzado() {
    // Event listeners para las pestañas principales
    document.getElementById('tabInventarioManual')?.addEventListener('click', () => {
        cambiarPestanaPrincipal('manual');
    });
    
    document.getElementById('tabLotesAvanzado')?.addEventListener('click', () => {
        cambiarPestanaPrincipal('avanzado');
    });

    // Event listeners para configuración
    document.getElementById('confirmarProductosSimilares')?.addEventListener('change', function() {
        configuracionEscaneo.confirmarProductosSimilares = this.checked;
    });

    document.getElementById('agruparAutomaticamente')?.addEventListener('change', function() {
        configuracionEscaneo.agruparAutomaticamente = this.checked;
    });

    document.getElementById('sonidoConfirmacion')?.addEventListener('change', function() {
        configuracionEscaneo.sonidoConfirmacion = this.checked;
    });

    // Event listener para iniciar escaneo por lotes avanzado
    document.getElementById('iniciarEscaneoLotesAvanzado')?.addEventListener('click', iniciarEscaneoLotesAvanzado);

    // Event listeners para el modal de escaneo
    document.getElementById('cerrarModalLotesAvanzado')?.addEventListener('click', cerrarModalLotesAvanzado);
    document.getElementById('pausarEscaneoLotesAvanzado')?.addEventListener('click', pausarEscaneoLotesAvanzado);
    document.getElementById('finalizarEscaneoLotesAvanzado')?.addEventListener('click', finalizarEscaneoLotesAvanzado);

    // Event listeners para las pestañas del modal
    document.getElementById('tabEscanerAvanzado')?.addEventListener('click', () => {
        cambiarTabModalAvanzado('escaner');
    });
    
    document.getElementById('tabListadoAvanzado')?.addEventListener('click', () => {
        cambiarTabModalAvanzado('listado');
    });

    // Event listeners para el modal de información de producto
    document.getElementById('cerrarModalInfoProducto')?.addEventListener('click', cerrarModalInfoProducto);
    document.getElementById('cancelarInfoProducto')?.addEventListener('click', cerrarModalInfoProducto);
    document.getElementById('guardarInfoProducto')?.addEventListener('click', guardarInfoProducto);

    // Event listener para guardar inventario
    document.getElementById('guardarInventarioLotesAvanzado')?.addEventListener('click', guardarInventarioLotesAvanzado);

    // Cargar diccionario de subproductos al inicializar
    cargarDiccionarioSubproductos();
}

// Función para cambiar entre pestañas principales
function cambiarPestanaPrincipal(tipo) {
    const tabManual = document.getElementById('tabInventarioManual');
    const tabAvanzado = document.getElementById('tabLotesAvanzado');
    const contenidoManual = document.getElementById('contenidoInventarioManual');
    const contenidoAvanzado = document.getElementById('contenidoLotesAvanzado');

    if (tipo === 'manual') {
        // Activar pestaña manual
        tabManual.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500 font-semibold';
        tabAvanzado.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300 font-semibold';
        
        // Mostrar contenido manual
        contenidoManual.style.display = 'block';
        contenidoAvanzado.style.display = 'none';
    } else if (tipo === 'avanzado') {
        // Activar pestaña avanzado
        tabAvanzado.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500 font-semibold';
        tabManual.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300 font-semibold';
        
        // Mostrar contenido avanzado
        contenidoAvanzado.style.display = 'block';
        contenidoManual.style.display = 'none';
    }
}

// Función para cambiar pestañas en el modal avanzado
function cambiarTabModalAvanzado(tab) {
    const tabEscaner = document.getElementById('tabEscanerAvanzado');
    const tabListado = document.getElementById('tabListadoAvanzado');
    const contenidoEscaner = document.getElementById('contenidoEscanerAvanzado');
    const contenidoListado = document.getElementById('contenidoListadoAvanzado');

    if (tab === 'escaner') {
        // Activar pestaña escáner
        tabEscaner.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabListado.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar contenido escáner
        contenidoEscaner.style.display = 'block';
        contenidoListado.style.display = 'none';
        
        // Reanudar escáner si estaba pausado
        if (!isEscaneoLotesAvanzadoActivo && scannerLotesAvanzado) {
            reanudarEscaneoLotesAvanzado();
        }
    } else if (tab === 'listado') {
        // Activar pestaña listado
        tabListado.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabEscaner.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';
        
        // Mostrar contenido listado
        contenidoListado.style.display = 'block';
        contenidoEscaner.style.display = 'none';
        
        // Pausar escáner cuando se cambia a listado
        if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
            pausarEscaneoLotesAvanzado();
        }
        
        // Actualizar listado
        actualizarListadoProductosAvanzado();
    }
}

// Función para cargar diccionario de subproductos desde Supabase
async function cargarDiccionarioSubproductos() {
    try {
        console.log('Cargando diccionario de subproductos...');
        
        // Aquí deberías implementar la conexión a Supabase
        // Por ahora, simularemos con datos de ejemplo
        const datosEjemplo = [
            { id: 1, primarioProductID: '1001', subProductoID: '2630' },
            { id: 2, primarioProductID: '1002', subProductoID: '2631' },
            { id: 3, primarioProductID: '1003', subProductoID: '2632' }
        ];
        
        // Limpiar diccionario existente
        diccionarioSubproductos.clear();
        
        // Llenar diccionario
        datosEjemplo.forEach(item => {
            diccionarioSubproductos.set(item.subProductoID, item.primarioProductID);
        });
        
        console.log(`Diccionario cargado con ${diccionarioSubproductos.size} relaciones`);
        
    } catch (error) {
        console.error('Error al cargar diccionario de subproductos:', error);
        mostrarMensaje('Error al cargar diccionario de productos', 'error');
    }
}

// Función para iniciar el escaneo por lotes avanzado
function iniciarEscaneoLotesAvanzado() {
    // Limpiar arrays de productos
    productosEscaneados = [];
    productosAgrupados = [];
    
    // Mostrar modal
    document.getElementById('modalEscaneoLotesAvanzado').style.display = 'block';
    
    // Activar la pestaña del escáner por defecto
    cambiarTabModalAvanzado('escaner');
    
    // Inicializar el escáner
    setTimeout(() => {
        inicializarEscanerLotesAvanzado();
    }, 500);
}

// Función para inicializar el escáner de lotes avanzado
function inicializarEscanerLotesAvanzado() {
    if (typeof Html5Qrcode === 'undefined') {
        mostrarMensaje('Error: Librería de escaneo no disponible', 'error');
        return;
    }

    scannerLotesAvanzado = new Html5Qrcode("reader-lotes-avanzado");
    
    const config = {
        fps: 10,
        qrbox: { width: 300, height: 200 },
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    scannerLotesAvanzado.start(
        { facingMode: "environment" },
        config,
        onEscaneoExitosoLotesAvanzado,
        onErrorEscaneoLotesAvanzado
    ).then(() => {
        isEscaneoLotesAvanzadoActivo = true;
        console.log("Escáner de lotes avanzado iniciado correctamente");
    }).catch(err => {
        console.error("Error al iniciar escáner de lotes avanzado:", err);
        mostrarMensaje('Error al iniciar el escáner', 'error');
    });
}

// Función cuando el escaneo es exitoso
function onEscaneoExitosoLotesAvanzado(decodedText, decodedResult) {
    console.log(`Código escaneado en lotes avanzado: ${decodedText}`);
    
    // Sanitizar el código escaneado
    const codigoLimpio = sanitizarEntrada(decodedText);
    
    // Pausar el escáner temporalmente
    if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
        scannerLotesAvanzado.pause(true);
        isEscaneoLotesAvanzadoActivo = false;
    }
    
    // Procesar el código escaneado
    procesarCodigoEscaneadoLotesAvanzado(codigoLimpio, decodedResult);
}

// Función para manejar errores del escáner
function onErrorEscaneoLotesAvanzado(error) {
    // No mostrar errores continuos del escáner
    // console.warn("Error de escáner de lotes avanzado:", error);
}

// Función para procesar el código escaneado en modo avanzado
async function procesarCodigoEscaneadoLotesAvanzado(codigo, resultado) {
    try {
        // Mostrar animación de procesamiento
        mostrarAnimacionProcesamiento('Procesando código...', 'processing');
        
        // 1. Extraer datos del código CODE128
        const datosExtraidos = extraerDatosCodeCODE128(codigo);
        
        if (!datosExtraidos) {
            mostrarAnimacionProcesamiento('Código no válido', 'error');
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
        
        // 3. Verificar si el producto ya fue escaneado previamente
        const productoExistente = verificarProductoExistente(datosExtraidos.plu);
        
        if (productoExistente) {
            if (configuracionEscaneo.confirmarProductosSimilares) {
                // Mostrar ventana de confirmación
                mostrarVentanaConfirmacionProducto(producto, datosExtraidos, productoExistente);
            } else {
                // Procesar directamente con el precio existente
                procesarProductoExistente(producto, datosExtraidos, productoExistente);
            }
        } else {
            // 4. Verificar si es subproducto o producto primario
            const productoPrimario = diccionarioSubproductos.get(datosExtraidos.plu);
            
            if (productoPrimario) {
                // Es un subproducto
                const infoPrimario = await buscarProductoPorPLU(productoPrimario);
                mostrarModalInformacionProducto(producto, datosExtraidos, infoPrimario, 'subproducto');
            } else {
                // Es un producto primario
                mostrarModalInformacionProducto(producto, datosExtraidos, null, 'primario');
            }
        }
        
    } catch (error) {
        console.error('Error al procesar código:', error);
        mostrarAnimacionProcesamiento('Error al procesar', 'error');
        reanudarEscannerDespuesDeProcesamiento();
    }
}

// Función para buscar producto por PLU
async function buscarProductoPorPLU(plu) {
    try {
        // Aquí deberías implementar la búsqueda en tu base de datos
        // Por ahora, simularemos con datos de ejemplo
        const productosEjemplo = [
            { codigo: '2630', nombre: 'Manzana Roja', marca: 'Frutas del Valle', unidad: 'Kg', categoria: 'Frutas' },
            { codigo: '2631', nombre: 'Plátano', marca: 'Tropical', unidad: 'Kg', categoria: 'Frutas' },
            { codigo: '2632', nombre: 'Naranja', marca: 'Cítricos SA', unidad: 'Kg', categoria: 'Frutas' }
        ];
        
        return productosEjemplo.find(p => p.codigo === plu);
        
    } catch (error) {
        console.error('Error al buscar producto por PLU:', error);
        return null;
    }
}

// Función para verificar si un producto ya fue escaneado
function verificarProductoExistente(plu) {
    return productosEscaneados.find(p => p.plu === plu);
}

// Función para mostrar el modal de información del producto
function mostrarModalInformacionProducto(producto, datosExtraidos, productoPrimario, tipo) {
    const modal = document.getElementById('modalInfoProducto');
    const contenido = document.getElementById('contenidoInfoProducto');
    
    let htmlContenido = '';
    
    if (tipo === 'subproducto' && productoPrimario) {
        htmlContenido = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Información del Subproducto -->
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="text-lg font-bold mb-3 text-blue-800">📦 Subproducto Escaneado</h4>
                    <div class="space-y-2">
                        <div><strong>Código:</strong> ${producto.codigo}</div>
                        <div><strong>Nombre:</strong> ${producto.nombre}</div>
                        <div><strong>Marca:</strong> ${producto.marca}</div>
                        <div><strong>Unidad:</strong> ${producto.unidad}</div>
                        <div><strong>Categoría:</strong> ${producto.categoria}</div>
                    </div>
                </div>
                
                <!-- Información del Producto Primario -->
                <div class="bg-green-50 p-4 rounded-lg">
                    <h4 class="text-lg font-bold mb-3 text-green-800">🏷️ Producto Primario</h4>
                    <div class="space-y-2">
                        <div><strong>Código:</strong> ${productoPrimario.codigo}</div>
                        <div><strong>Nombre:</strong> ${productoPrimario.nombre}</div>
                        <div><strong>Marca:</strong> ${productoPrimario.marca}</div>
                        <div><strong>Unidad:</strong> ${productoPrimario.unidad}</div>
                        <div><strong>Categoría:</strong> ${productoPrimario.categoria}</div>
                    </div>
                </div>
            </div>
            
            <!-- Datos del código escaneado -->
            <div class="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 class="text-lg font-bold mb-3 text-gray-800">🔍 Datos del Código Escaneado</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div><strong>PLU:</strong> ${datosExtraidos.plu}</div>
                    <div><strong>Precio Porción:</strong> $${datosExtraidos.precioPorcion.toFixed(2)}</div>
                    <div><strong>Peso Calculado:</strong> ${datosExtraidos.peso.toFixed(3)} kg</div>
                </div>
            </div>
        `;
    } else {
        htmlContenido = `
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="text-lg font-bold mb-3 text-blue-800">📦 Producto Primario</h4>
                <div class="space-y-2">
                    <div><strong>Código:</strong> ${producto.codigo}</div>
                    <div><strong>Nombre:</strong> ${producto.nombre}</div>
                    <div><strong>Marca:</strong> ${producto.marca}</div>
                    <div><strong>Unidad:</strong> ${producto.unidad}</div>
                    <div><strong>Categoría:</strong> ${producto.categoria}</div>
                </div>
            </div>
            
            <!-- Datos del código escaneado -->
            <div class="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 class="text-lg font-bold mb-3 text-gray-800">🔍 Datos del Código Escaneado</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div><strong>PLU:</strong> ${datosExtraidos.plu}</div>
                    <div><strong>Precio Porción:</strong> $${datosExtraidos.precioPorcion.toFixed(2)}</div>
                    <div><strong>Peso Calculado:</strong> ${datosExtraidos.peso.toFixed(3)} kg</div>
                </div>
            </div>
        `;
    }
    
    // Agregar campo para precio por kilo
    htmlContenido += `
        <div class="mt-4">
            <label for="precioKiloProducto" class="block text-sm font-medium text-gray-700 mb-2">
                Precio por Kilo ($):
            </label>
            <input type="number" id="precioKiloProducto" step="0.01" min="0" 
                   class="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
    document.getElementById('precioKiloProducto').addEventListener('input', function() {
        const btnGuardar = document.getElementById('guardarInfoProducto');
        btnGuardar.disabled = !this.value || parseFloat(this.value) <= 0;
    });
    
    modal.style.display = 'block';
}

// Función para guardar información del producto
function guardarInfoProducto() {
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
    
    // Recalcular peso con el precio por kilo ingresado
    const pesoCalculado = datosExtraidos.precioPorcion / precioKilo;
    
    // Crear objeto del producto escaneado
    const productoEscaneado = {
        id: Date.now() + Math.random(),
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
    
    // Reproducir sonido de confirmación
    if (configuracionEscaneo.sonidoConfirmacion) {
        reproducirSonidoConfirmacion();
    }
    
    // Mostrar mensaje de éxito
    mostrarMensaje(`Producto agregado: ${producto.nombre} - ${pesoCalculado.toFixed(3)}kg`, 'success');
    
    // Cerrar modal
    cerrarModalInfoProducto();
    
    // Reanudar escáner
    reanudarEscannerDespuesDeProcesamiento();
}

// Función para cerrar el modal de información del producto
function cerrarModalInfoProducto() {
    document.getElementById('modalInfoProducto').style.display = 'none';
}

// Función para procesar producto existente
function procesarProductoExistente(producto, datosExtraidos, productoExistente) {
    // Usar el precio por kilo ya almacenado
    const pesoCalculado = datosExtraidos.precioPorcion / productoExistente.precioKilo;
    
    // Crear objeto del producto escaneado
    const productoEscaneado = {
        id: Date.now() + Math.random(),
        plu: datosExtraidos.plu,
        codigo: producto.codigo,
        nombre: producto.nombre,
        marca: producto.marca,
        unidad: producto.unidad,
        categoria: producto.categoria,
        peso: pesoCalculado,
        precioPorcion: datosExtraidos.precioPorcion,
        precioKilo: productoExistente.precioKilo,
        tipo: productoExistente.tipo,
        productoPrimario: productoExistente.productoPrimario,
        timestamp: new Date().toISOString()
    };
    
    // Agregar a la lista
    productosEscaneados.push(productoEscaneado);
    
    // Actualizar contadores
    actualizarContadoresAvanzado();
    
    // Reproducir sonido
    if (configuracionEscaneo.sonidoConfirmacion) {
        reproducirSonidoConfirmacion();
    }
    
    // Mostrar mensaje
    mostrarMensaje(`Producto agregado: ${producto.nombre} - ${pesoCalculado.toFixed(3)}kg`, 'success');
    
    // Reanudar escáner
    reanudarEscannerDespuesDeProcesamiento();
}

// Función para actualizar contadores
function actualizarContadoresAvanzado() {
    const totalProductos = productosEscaneados.length;
    const pesoTotal = productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = new Set(productosEscaneados.map(p => p.productoPrimario?.codigo || p.codigo)).size;
    
    document.getElementById('contadorProductosAvanzado').textContent = totalProductos;
    document.getElementById('totalProductosAvanzado').textContent = totalProductos;
    document.getElementById('pesoTotalAvanzado').textContent = pesoTotal.toFixed(3);
    document.getElementById('totalProductosPrimarios').textContent = productosPrimarios;
    
    // Habilitar botón finalizar si hay productos
    const btnFinalizar = document.getElementById('finalizarEscaneoLotesAvanzado');
    if (totalProductos > 0) {
        btnFinalizar.disabled = false;
    } else {
        btnFinalizar.disabled = true;
    }
}

// Función para actualizar el listado de productos escaneados
function actualizarListadoProductosAvanzado() {
    const tbody = document.getElementById('listadoProductosAvanzado');
    tbody.innerHTML = '';
    
    productosEscaneados.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="py-2 px-4">${index + 1}</td>
            <td class="py-2 px-4 font-mono text-sm">${item.codigo}</td>
            <td class="py-2 px-4">${item.plu}</td>
            <td class="py-2 px-4">${item.nombre}</td>
            <td class="py-2 px-4">${item.peso.toFixed(3)}</td>
            <td class="py-2 px-4">$${item.precioKilo.toFixed(2)}</td>
            <td class="py-2 px-4">$${item.precioPorcion.toFixed(2)}</td>
            <td class="py-2 px-4">
                <span class="px-2 py-1 text-xs rounded ${item.tipo === 'primario' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${item.tipo === 'primario' ? 'Primario' : 'Subproducto'}
                </span>
            </td>
            <td class="py-2 px-4">
                <button onclick="eliminarProductoEscaneado('${item.id}')" 
                        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">
                    Eliminar
                </button>
            </td>
        `;
    });
}

// Función para eliminar un producto escaneado
window.eliminarProductoEscaneado = function(id) {
    productosEscaneados = productosEscaneados.filter(item => item.id !== id);
    actualizarListadoProductosAvanzado();
    actualizarContadoresAvanzado();
    mostrarMensaje('Producto eliminado', 'info');
};

// Función para pausar el escaneo
function pausarEscaneoLotesAvanzado() {
    if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
        scannerLotesAvanzado.pause(true);
        isEscaneoLotesAvanzadoActivo = false;
        document.getElementById('pausarEscaneoLotesAvanzado').textContent = 'Reanudar Escáner';
        document.getElementById('pausarEscaneoLotesAvanzado').className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded';
    }
}

// Función para reanudar el escaneo
function reanudarEscaneoLotesAvanzado() {
    if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
        scannerLotesAvanzado.resume();
        isEscaneoLotesAvanzadoActivo = true;
        document.getElementById('pausarEscaneoLotesAvanzado').textContent = 'Pausar Escáner';
        document.getElementById('pausarEscaneoLotesAvanzado').className = 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded';
    }
}

// Función para reanudar el escáner después del procesamiento
function reanudarEscannerDespuesDeProcesamiento() {
    setTimeout(() => {
        if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
            reanudarEscaneoLotesAvanzado();
        }
        ocultarAnimacionProcesamiento();
    }, 2000);
}

// Función para finalizar el escaneo por lotes avanzado
function finalizarEscaneoLotesAvanzado() {
    if (productosEscaneados.length === 0) {
        mostrarMensaje('No hay productos escaneados para procesar', 'error');
        return;
    }
    
    // Agrupar productos por producto primario
    agruparProductosPorPrimario();
    
    // Mostrar confirmación
    const totalProductos = productosEscaneados.length;
    const pesoTotal = productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = productosAgrupados.length;
    
    const mensaje = `
        Resumen del escaneo por lotes avanzado:
        • Total de productos escaneados: ${totalProductos}
        • Peso total: ${pesoTotal.toFixed(3)} Kg
        • Productos primarios: ${productosPrimarios}
        
        ¿Confirmar el procesamiento?
    `;
    
    if (confirm(mensaje)) {
        // Cerrar modal y mostrar resultados
        cerrarModalLotesAvanzado();
        mostrarResultadosLotesAvanzado();
    }
}

// Función para agrupar productos por producto primario
function agruparProductosPorPrimario() {
    productosAgrupados = [];
    const grupos = new Map();
    
    productosEscaneados.forEach(producto => {
        const codigoPrimario = producto.productoPrimario?.codigo || producto.codigo;
        
        if (!grupos.has(codigoPrimario)) {
            grupos.set(codigoPrimario, {
                productoPrimario: producto.productoPrimario || producto,
                subproductos: [],
                pesoTotal: 0
            });
        }
        
        const grupo = grupos.get(codigoPrimario);
        grupo.subproductos.push(producto);
        grupo.pesoTotal += producto.peso;
    });
    
    productosAgrupados = Array.from(grupos.values());
}

// Función para mostrar resultados de lotes avanzado
function mostrarResultadosLotesAvanzado() {
    const contenedor = document.getElementById('contenedorProductosPrimarios');
    const resultados = document.getElementById('resultadosLotesAvanzado');
    
    contenedor.innerHTML = '';
    
    productosAgrupados.forEach((grupo, index) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer';
        tarjeta.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800">${grupo.productoPrimario.nombre}</h4>
                    <p class="text-sm text-gray-600">Código: ${grupo.productoPrimario.codigo}</p>
                    <p class="text-sm text-gray-600">Marca: ${grupo.productoPrimario.marca}</p>
                    <p class="text-lg font-bold text-green-600 mt-2">Peso Total: ${grupo.pesoTotal.toFixed(3)} Kg</p>
                </div>
                <div class="text-right">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${grupo.subproductos.length} productos
                    </span>
                </div>
            </div>
        `;
        
        tarjeta.addEventListener('click', () => {
            mostrarDetalleProductoPrimario(grupo);
        });
        
        contenedor.appendChild(tarjeta);
    });
    
    // Mostrar sección de resultados
    resultados.classList.remove('hidden');
    
    // Habilitar botón guardar
    document.getElementById('guardarInventarioLotesAvanzado').disabled = false;
}

// Función para mostrar detalle del producto primario
function mostrarDetalleProductoPrimario(grupo) {
    let detalleHTML = `
        <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 class="text-lg font-bold text-blue-800 mb-2">Producto Primario</h3>
            <p><strong>Código:</strong> ${grupo.productoPrimario.codigo}</p>
            <p><strong>Nombre:</strong> ${grupo.productoPrimario.nombre}</p>
            <p><strong>Marca:</strong> ${grupo.productoPrimario.marca}</p>
            <p><strong>Peso Total:</strong> ${grupo.pesoTotal.toFixed(3)} Kg</p>
        </div>
        
        <div class="bg-white border rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 border-b">
                <h4 class="font-semibold text-gray-800">Subproductos Escaneados</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Peso</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio/Kg</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio Porción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    `;
    
    grupo.subproductos.forEach(sub => {
        detalleHTML += `
            <tr>
                <td class="px-4 py-2 text-sm font-mono">${sub.codigo}</td>
                <td class="px-4 py-2 text-sm">${sub.nombre}</td>
                <td class="px-4 py-2 text-sm">${sub.peso.toFixed(3)} Kg</td>
                <td class="px-4 py-2 text-sm">$${sub.precioKilo.toFixed(2)}</td>
                <td class="px-4 py-2 text-sm">$${sub.precioPorcion.toFixed(2)}</td>
            </tr>
        `;
    });
    
    detalleHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Mostrar en modal usando SweetAlert
    Swal.fire({
        title: 'Detalle del Producto',
        html: detalleHTML,
        width: '80%',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            popup: 'swal-wide'
        }
    });
}

// Función para guardar inventario de lotes avanzado
async function guardarInventarioLotesAvanzado() {
    try {
        // Mostrar loading
        const loading = Swal.fire({
            title: 'Guardando inventario...',
            text: 'Por favor espere mientras se procesa la información',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Procesar cada grupo de productos
        for (const grupo of productosAgrupados) {
            // Crear entrada de inventario para el producto primario
            const entradaInventario = {
                codigo: grupo.productoPrimario.codigo,
                nombre: grupo.productoPrimario.nombre,
                marca: grupo.productoPrimario.marca,
                unidad: grupo.productoPrimario.unidad,
                categoria: grupo.productoPrimario.categoria,
                cantidad: grupo.pesoTotal,
                fechaCaducidad: new Date().toISOString().split('T')[0], // Fecha actual por defecto
                comentarios: `Lotes avanzado - ${grupo.subproductos.length} productos escaneados - Detalle: ${grupo.subproductos.map(s => `${s.peso.toFixed(3)}kg ($${s.precioPorcion.toFixed(2)})`).join(', ')}`,
                ubicacion: document.getElementById('ubicacionActual')?.textContent || 'Sin ubicación',
                timestamp: new Date().toISOString()
            };
            
            // Aquí deberías guardar en tu base de datos
            console.log('Guardando entrada de inventario:', entradaInventario);
            
            // Simular guardado
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Cerrar loading
        Swal.close();
        
        // Mostrar éxito
        Swal.fire({
            title: '¡Éxito!',
            text: `Se guardaron ${productosAgrupados.length} productos en el inventario`,
            icon: 'success',
            confirmButtonText: 'Continuar'
        }).then(() => {
            // Limpiar datos
            productosEscaneados = [];
            productosAgrupados = [];
            
            // Ocultar resultados
            document.getElementById('resultadosLotesAvanzado').classList.add('hidden');
            
            // Actualizar tabla de inventario
            // Aquí deberías llamar a tu función de actualización de tabla
            
            // Volver a pestaña manual
            cambiarPestanaPrincipal('manual');
        });
        
    } catch (error) {
        console.error('Error al guardar inventario:', error);
        Swal.fire({
            title: 'Error',
            text: 'Hubo un error al guardar el inventario',
            icon: 'error'
        });
    }
}

// Función para cerrar el modal de lotes avanzado
function cerrarModalLotesAvanzado() {
    if (scannerLotesAvanzado) {
        scannerLotesAvanzado.stop().then(() => {
            scannerLotesAvanzado = null;
            isEscaneoLotesAvanzadoActivo = false;
        }).catch(err => {
            console.error('Error al detener scanner:', err);
        });
    }
    
    document.getElementById('modalEscaneoLotesAvanzado').style.display = 'none';
    
    // Limpiar animaciones
    ocultarAnimacionProcesamiento();
}

// Función para mostrar animación de procesamiento
function mostrarAnimacionProcesamiento(mensaje, tipo) {
    const reader = document.getElementById('reader-lotes-avanzado');
    let overlay = document.getElementById('processingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.className = 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10';
        reader.style.position = 'relative';
        reader.appendChild(overlay);
    }
    
    let iconHTML = '';
    let colorClass = '';
    
    switch (tipo) {
        case 'processing':
            iconHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>';
            colorClass = 'bg-blue-500';
            break;
        case 'success':
            iconHTML = '<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            colorClass = 'bg-green-500';
            break;
        case 'error':
            iconHTML = '<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            colorClass = 'bg-red-500';
            break;
    }
    
    overlay.innerHTML = `
        <div class="${colorClass} text-white p-4 rounded-lg flex items-center space-x-3">
            ${iconHTML}
            <span class="font-semibold">${mensaje}</span>
        </div>
    `;
    
    overlay.style.display = 'flex';
}

// Función para ocultar animación de procesamiento
function ocultarAnimacionProcesamiento() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Función para extraer datos CODE128 (implementación local)
function extraerDatosCodeCODE128(codigo) {
    console.log(`Extrayendo datos de código: ${codigo}`);
    
    // Eliminar cualquier prefijo de ceros si existe
    const codigoLimpio = codigo.replace(/^0+/, '');
    
    if (codigo.length === 15 && codigo.startsWith('02')) {
        // Formato báscula real: 022630000287341
        // Estructura: 02(tipo) + 2630(PLU) + 00028734(precio en centavos) + 1(control)
        
        const plu = codigo.substring(2, 6);              // Posiciones 2-5: PLU (2630)
        const precioStr = codigo.substring(6, 14);       // Posiciones 6-13: precio en centavos
        const precioCentavos = parseInt(precioStr);      // Convertir a número
        const digitoControl = codigo.substring(14, 15);  // Posición 14: dígito control
        
        // Convertir centavos a pesos
        const precioPorcion = precioCentavos / 100;
        
        // Para el cálculo del peso, usar un precio por kilo temporal
        // En la implementación real, este valor vendrá del usuario
        const precioKiloTemporal = 200; // $200 por kilo
        const pesoCalculado = precioPorcion / precioKiloTemporal;
        
        console.log(`Datos extraídos - PLU: ${plu}, Precio: $${precioPorcion.toFixed(2)}, Peso: ${pesoCalculado.toFixed(3)}kg`);
        
        return {
            plu: plu,
            peso: pesoCalculado,
            precioPorcion: precioPorcion,
            digitoControl: digitoControl
        };
    }
    
    console.log('Formato de código no reconocido');
    return null;
}

// Función para reproducir sonido de confirmación
function reproducirSonidoConfirmacion() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('No se puede reproducir sonido:', error);
    }
}

// Función para sanitizar entrada
function sanitizarEntrada(entrada) {
    if (typeof entrada !== 'string') {
        entrada = String(entrada);
    }
    return entrada.trim();
}

// Función para mostrar mensaje
function mostrarMensaje(mensaje, tipo) {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    // Usar SweetAlert si está disponible
    if (typeof Swal !== 'undefined') {
        let icon = 'info';
        if (tipo === 'error') icon = 'error';
        if (tipo === 'success') icon = 'success';
        if (tipo === 'warning') icon = 'warning';
        
        Swal.fire({
            title: mensaje,
            icon: icon,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }
    
    // Fallback: mostrar en el elemento mensaje si existe
    const elementoMensaje = document.getElementById('mensaje');
    if (elementoMensaje) {
        elementoMensaje.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
        setTimeout(() => {
            elementoMensaje.innerHTML = '';
        }, 3000);
    }
}

// Exportar funciones principales
export {
    inicializarSistemaLotesAvanzado,
    cambiarPestanaPrincipal,
    cargarDiccionarioSubproductos
};
