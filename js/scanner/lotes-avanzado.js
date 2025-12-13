// Funcionalidad de escaneo por lotes avanzado
// Mejora del sistema de lotes con detección automática y agrupación de productos

// Importar configuración de Supabase
import { getSupabase } from '../auth/auth.js';
// Importar función de búsqueda de IndexedDB
import { buscarPorCodigoParcial } from '../core/product-operations.js';
// Importar funciones de sincronización y guardado
import { mostrarMensaje } from '../core/main.js';
import { mostrarAlertaBurbuja } from '../utils/logs.js';

// Variables globales para el escaneo por lotes avanzado
let scannerLotesAvanzado = null;
let productosEscaneados = []; // Array de productos escaneados
let productosAgrupados = []; // Array de productos agrupados por primario
let isEscaneoLotesAvanzadoActivo = false;
let isScannerTransitioning = false; // Bloqueo para evitar transiciones simultáneas
let configuracionEscaneo = {
    confirmarProductosSimilares: false,  // Deshabilitado por defecto
    agruparAutomaticamente: true,
    sonidoConfirmacion: true
};

// Nueva opción: permitir/denegar la búsqueda de relaciones productos_subproductos
// Leer persistencia desde localStorage, si existe
try {
    const storedRelacionar = localStorage.getItem('lotes_relacionarProductos');
    if (storedRelacionar === null) {
        configuracionEscaneo.relacionarProductos = true; // default ON
    } else {
        configuracionEscaneo.relacionarProductos = (storedRelacionar === '1' || storedRelacionar === 'true');
    }
} catch (e) {
    // Si localStorage no está disponible, usar default
    configuracionEscaneo.relacionarProductos = true;
}

// Variables para control de debounce de escaneo
let ultimoCodigoEscaneado = null;
let tiempoUltimoEscaneo = 0;
const TIEMPO_DEBOUNCE = 5000; // 5 segundos - optimizado para escaneo más rápido

// Diccionario para productos subproductos (se cargará desde Supabase)
let diccionarioSubproductos = new Map();

// Precio por kilo temporal para cálculos iniciales (se actualizará con el precio real del usuario)
const precioKiloTemporal = 100.00; // Precio base temporal en pesos

// Mapa para almacenar precios por kilo ingresados por el usuario (PLU -> precio por kilo)
let preciosPorKiloGuardados = new Map();

// Función para generar IDs únicos
function generarIdUnico() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Función para generar lote numérico simple
async function generarLoteNumerico(codigo) {
    try {
        // Obtener instancia de Supabase
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from('inventario')
            .select('lote')
            .eq('codigo', codigo)
            .order('lote', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al buscar lotes existentes:', error);
            return "1"; // Valor por defecto
        }

        if (data && data.length > 0) {
            const ultimoLote = data[0].lote;
            // Extraer número del lote si es numérico, o usar 1 si no
            const numeroLote = parseInt(ultimoLote) || 0;
            return String(numeroLote + 1);
        } else {
            return "1"; // Primer lote
        }
    } catch (error) {
        console.error('Error al generar lote numérico:', error);
        return "1"; // Valor por defecto
    }
}

// Función para inicializar el sistema de lotes avanzado
function inicializarSistemaLotesAvanzado() {
    // Inicializar estado de checkboxes de configuración
    const checkboxConfirmar = document.getElementById('confirmarProductosSimilares');
    const checkboxAgrupar = document.getElementById('agruparAutomaticamente');
    const checkboxSonido = document.getElementById('sonidoConfirmacion');

    if (checkboxConfirmar) {
        checkboxConfirmar.checked = configuracionEscaneo.confirmarProductosSimilares;
    }
    if (checkboxAgrupar) {
        checkboxAgrupar.checked = configuracionEscaneo.agruparAutomaticamente;
    }
    if (checkboxSonido) {
        checkboxSonido.checked = configuracionEscaneo.sonidoConfirmacion;
    }

    // Checkbox para relacionar productos (por defecto true). Reflejar valor persistido y asegurar listener
    const checkboxRelacionar = document.getElementById('relacionarProductos');
    if (checkboxRelacionar) {
        try {
            checkboxRelacionar.checked = !!configuracionEscaneo.relacionarProductos;
        } catch (e) {
            checkboxRelacionar.checked = true;
        }
        // Guardar cambios en localStorage cuando el usuario lo modifique
        checkboxRelacionar.addEventListener('change', function () {
            configuracionEscaneo.relacionarProductos = !!this.checked;
            try {
                localStorage.setItem('lotes_relacionarProductos', this.checked ? '1' : '0');
            } catch (err) {
                console.warn('No se pudo persistir la opción relacionarProductos en localStorage', err);
            }
                    });
    }

    // Event listeners para las pestañas principales
    document.getElementById('tabInventarioManual')?.addEventListener('click', () => {
        cambiarPestanaPrincipal('manual');
    });

    document.getElementById('tabLotesAvanzado')?.addEventListener('click', () => {
        cambiarPestanaPrincipal('avanzado');
    });

    // Event listeners para configuración
    document.getElementById('confirmarProductosSimilares')?.addEventListener('change', function () {
        configuracionEscaneo.confirmarProductosSimilares = this.checked;
            });

    document.getElementById('agruparAutomaticamente')?.addEventListener('change', function () {
        configuracionEscaneo.agruparAutomaticamente = this.checked;
            });

    document.getElementById('sonidoConfirmacion')?.addEventListener('change', function () {
        configuracionEscaneo.sonidoConfirmacion = this.checked;
            });

    // (Ya se registró listener arriba cuando existe el elemento)

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
            // Limpiar variables de debounce al cambiar a escáner
            limpiarDebounce();
            reanudarEscaneoLotesAvanzado();
        }
    } else if (tab === 'listado') {
        // Activar pestaña listado
        tabListado.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabEscaner.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';

        // Mostrar contenido listado
        contenidoListado.style.display = 'block';
        contenidoEscaner.style.display = 'none';

        // SIEMPRE pausar escáner cuando se cambia a listado
        if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
                        pausarEscaneoLotesAvanzado();
        }

        // Limpiar variables de debounce al cambiar a listado
        limpiarDebounce();

        // Actualizar listado
        actualizarListadoProductosAvanzado();
    }
}

// Función para limpiar variables de debounce
function limpiarDebounce() {
    ultimoCodigoEscaneado = null;
    tiempoUltimoEscaneo = 0;
    }

// Función para cargar diccionario de subproductos desde Supabase
async function cargarDiccionarioSubproductos() {
    try {
                // Obtener instancia de Supabase
        const supabase = await getSupabase();

        // Consultar productos_subproducto desde Supabase
        const { data, error } = await supabase
            .from('productos_subproductos')
            .select(`
                id,
                principalproductid,
                subproductid
            `);

        if (error) {
            throw error;
        }

        // Limpiar diccionario existente
        diccionarioSubproductos.clear();

        // Llenar diccionario con datos reales
        if (data && data.length > 0) {
            data.forEach(item => {
                // Mapear subproducto ID a producto primario ID
                diccionarioSubproductos.set(
                    item.subproductid.toString(),
                    item.principalproductid.toString()
                );
                            });

                                } else {
                    }

    } catch (error) {
        console.error('Error al cargar diccionario de subproductos desde Supabase:', error);

        // En caso de error, simplemente limpiar el diccionario
        console.warn('No se pudieron cargar relaciones de subproductos desde el servidor');
        diccionarioSubproductos.clear();

        // Mostrar mensaje de advertencia
        mostrarAlertaBurbuja('⚠️ Diccionario no disponible, funcionando sin relaciones', 'warning');
    }
}

// Función para iniciar el escaneo por lotes avanzado
function iniciarEscaneoLotesAvanzado() {
    // Limpiar arrays de productos
    productosEscaneados = [];
    productosAgrupados = [];

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

    // Por defecto, el escáner está pausado
    isEscaneoLotesAvanzadoActivo = false;

    // Botón de acción on/off
    const btnAccion = document.getElementById('accionEscaneoLotesAvanzado');
    if (btnAccion) {
        btnAccion.addEventListener('click', function () {
            if (isEscaneoLotesAvanzadoActivo) {
                // Llamar a la función correcta que pausa el escáner
                pausarEscaneoLotesAvanzado();
                btnAccion.textContent = 'Activar escáner';
            } else {
                activarEscanerLotesAvanzado();
                btnAccion.textContent = 'Pausar escáner';
            }
        });
        // Estado inicial
        btnAccion.textContent = 'Activar escáner';
    }
}

function activarEscanerLotesAvanzado() {
    if (scannerLotesAvanzado && !isScannerTransitioning) {
        isScannerTransitioning = true;
        // Si el escáner está activo, detenerlo antes de iniciar
        if (isEscaneoLotesAvanzadoActivo) {
            try {
                scannerLotesAvanzado.stop().then(() => {
                    isEscaneoLotesAvanzadoActivo = false;
                    iniciarEscanerLotesAvanzadoHtml5Qrcode();
                }).catch(err => {
                    console.warn("No se pudo detener el escáner antes de iniciar:", err);
                    // Intentar iniciar de todos modos
                    iniciarEscanerLotesAvanzadoHtml5Qrcode();
                });
            } catch (err) {
                // html5-qrcode puede lanzar inmediatamente si no está corriendo
                console.warn('stop() lanzó excepción sincronamente:', err);
                iniciarEscanerLotesAvanzadoHtml5Qrcode();
            }
        } else {
            iniciarEscanerLotesAvanzadoHtml5Qrcode();
        }
    }
}

function iniciarEscanerLotesAvanzadoHtml5Qrcode() {
    scannerLotesAvanzado.start(
        { facingMode: "environment" },
        {
            fps: 10,
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
            }).catch(err => {
        isScannerTransitioning = false;
        console.error("Error al activar escáner de lotes avanzado:", err);
        mostrarMensaje('Error al activar el escáner', 'error');
    });
}


function pausarEscanerLotesAvanzado() {
    if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo && !isScannerTransitioning) {
        isScannerTransitioning = true;
        scannerLotesAvanzado.stop().then(() => {
            isEscaneoLotesAvanzadoActivo = false;
            isScannerTransitioning = false;
                    }).catch(err => {
            isScannerTransitioning = false;
            console.warn("No se pudo detener el escáner al pausar:", err);
        });
    }
}

// Función cuando el escaneo es exitoso
function onEscaneoExitosoLotesAvanzado(decodedText, decodedResult) {
        // Sanitizar el código escaneado
    const codigoLimpio = sanitizarEntrada(decodedText);

    // Implementar debounce - prevenir registro duplicado de códigos
    const tiempoActual = Date.now();
    if (ultimoCodigoEscaneado === codigoLimpio &&
        (tiempoActual - tiempoUltimoEscaneo) < TIEMPO_DEBOUNCE) {
                // Reanudar el escáner sin procesar
        setTimeout(() => {
            reanudarEscannerDespuesDeProcesamiento();
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
                    }).catch(err => {
            console.warn("No se pudo detener el escáner tras escaneo exitoso:", err);
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

        // 3. Verificar si el producto ya fue registrado recientemente con el mismo precio
        if (verificarRegistroReciente(datosExtraidos.plu, datosExtraidos.precioPorcion)) {
            mostrarAnimacionProcesamiento('Producto ya registrado recientemente', 'error');
                        // Pausar escáner para evitar bucle infinito
            if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
                scannerLotesAvanzado.pause(true);
                isEscaneoLotesAvanzadoActivo = false;
            }

            // Reanudar después de un tiempo más largo para evitar bucle
            setTimeout(() => {
                if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
                    reanudarEscannerSinLimpiarDebounce(); // Usar función sin limpiar debounce
                }
                ocultarAnimacionProcesamiento();
            }, 3000); // 3 segundos de pausa para evitar bucle (reducido de 5s)

            return;
        }

        // 4. Verificar si el producto ya fue escaneado previamente o si tenemos precio guardado
        const productoExistente = verificarProductoExistente(datosExtraidos.plu);

        if (productoExistente && productoExistente.nombre) {
            // Producto completo ya fue escaneado anteriormente
                        if (configuracionEscaneo.confirmarProductosSimilares) {
                // Mostrar ventana de confirmación
                                mostrarVentanaConfirmacionProducto(producto, datosExtraidos, productoExistente);
            } else {
                // Procesar directamente con el precio existente
                                procesarProductoExistente(producto, datosExtraidos, productoExistente);
            }
        } else if (productoExistente && productoExistente.precioKilo) {
            // Solo tenemos precio por kilo guardado, procesar directamente
                        // Determinar tipo y producto primario usando el código del producto encontrado
            let infoPrimario = null;
            let tipo = 'primario';

            if (configuracionEscaneo.relacionarProductos) {
                const productoPrimarioId = diccionarioSubproductos.get(producto.codigo);
                if (productoPrimarioId) {
                                        infoPrimario = await buscarProductoPorPLU(productoPrimarioId);
                    tipo = 'subproducto';
                } else {
                                    }
            } else {
                            }

            // Crear objeto producto existente completo
            const productoCompleto = {
                precioKilo: productoExistente.precioKilo,
                tipo: tipo,
                productoPrimario: infoPrimario
            };

            procesarProductoExistente(producto, datosExtraidos, productoCompleto);
        } else {
            // 5. Verificar si es subproducto o producto primario usando el código del producto encontrado
                        // Si la configuración indica saltar relaciones, tratar como primario
            if (!configuracionEscaneo.relacionarProductos) {
                                mostrarModalInformacionProducto(producto, datosExtraidos, null, 'primario');
            } else {
                // Buscar directamente en el diccionario usando el código del producto encontrado
                const productoPrimarioId = diccionarioSubproductos.get(producto.codigo);

                if (productoPrimarioId) {
                    // Es un subproducto
                                        const infoPrimario = await buscarProductoPorPLU(productoPrimarioId);
                    mostrarModalInformacionProducto(producto, datosExtraidos, infoPrimario, 'subproducto');
                } else {
                    // Es un producto primario
                                        mostrarModalInformacionProducto(producto, datosExtraidos, null, 'primario');
                }
            }
        }

    } catch (error) {
        console.error('Error al procesar código:', error);
        mostrarAnimacionProcesamiento('Error al procesar', 'error');
        reanudarEscannerDespuesDeProcesamiento();
    }
}

// Función para buscar producto por PLU
// Función para buscar producto por PLU usando IndexedDB primero, luego Supabase
async function buscarProductoPorPLU(plu) {
    try {
                // Primero buscar en IndexedDB usando buscarPorCodigoParcial
        const resultadoIndexedDB = await new Promise((resolve, reject) => {
            buscarPorCodigoParcial(plu, "Lotes", (resultados) => {
                if (resultados && resultados.length > 0) {
                    // Buscar coincidencia exacta con el PLU
                    const productoExacto = resultados.find(p => String(p.codigo) === plu);
                    if (productoExacto) {
                        resolve(productoExacto);
                        return;
                    }

                    // Si no hay coincidencia exacta, buscar con código completo
                    const codigoCompleto = plu.padStart(12, '0');
                    const productoCompleto = resultados.find(p => String(p.codigo) === codigoCompleto);
                    if (productoCompleto) {
                        resolve(productoCompleto);
                        return;
                    }

                    // Si no se encuentra, devolver el primer resultado
                    resolve(resultados[0]);
                } else {
                    resolve(null);
                }
            });
        });

        if (resultadoIndexedDB) {
                        return {
                codigo: resultadoIndexedDB.codigo,
                nombre: resultadoIndexedDB.nombre,
                marca: resultadoIndexedDB.marca || 'Sin marca',
                unidad: resultadoIndexedDB.unidad,
                categoria: resultadoIndexedDB.categoria || 'Sin categoría'
            };
        }

        // Si no se encuentra en IndexedDB, buscar en Supabase
                // Obtener instancia de Supabase
        const supabase = await getSupabase();

        // Primero intentar buscar con el PLU tal como viene (4 dígitos)
        let { data, error } = await supabase
            .from('productos')
            .select(`
                codigo,
                nombre,
                marca,
                unidad,
                categoria:categorias(nombre)
            `)
            .eq('codigo', plu)
            .single();

        // Si no se encuentra, intentar con código completo de 12 dígitos (rellenando con ceros)
        if (error && error.code === 'PGRST116') {
                        const codigoCompleto = plu.padStart(12, '0');
                        ({ data, error } = await supabase
                .from('productos')
                .select(`
                    codigo,
                    nombre,
                    marca,
                    unidad,
                    categoria:categorias(nombre)
                `)
                .eq('codigo', codigoCompleto)
                .single());
        }

        if (error) {
            if (error.code === 'PGRST116') {
                // No se encontró el producto
                                return null;
            }
            throw error;
        }

        if (data) {
            // Formatear los datos del producto
            const producto = {
                codigo: data.codigo,
                nombre: data.nombre,
                marca: data.marca || 'Sin marca',
                unidad: data.unidad,
                categoria: data.categoria?.nombre || 'Sin categoría'
            };

                        return producto;
        }

        return null;

    } catch (error) {
        console.error('Error al buscar producto por PLU:', error);

        // En caso de error de conexión, retornar null
        console.warn('No se pudo conectar con el servidor para buscar el producto');
        return null;
    }
}

// Función para verificar si un producto ya fue escaneado
function verificarProductoExistente(plu) {
    const productoExistente = productosEscaneados.find(p => p.plu === plu);

    if (productoExistente) {
                return productoExistente;
    }

    // Si no fue escaneado, verificar si tenemos precio por kilo guardado
    const precioKiloGuardado = preciosPorKiloGuardados.get(plu);
    if (precioKiloGuardado) {
                return { plu: plu, precioKilo: precioKiloGuardado };
    }

    return null;
}

// Función para verificar si un producto con el mismo precio ya fue registrado recientemente
function verificarRegistroReciente(plu, precioPorcion) {
    const ahora = Date.now();
    const TIEMPO_REGISTRO_RECIENTE = 5000; // 5 segundos - tiempo más largo para evitar bucle

    const registroReciente = productosEscaneados.find(p =>
        p.plu === plu &&
        p.precioPorcion === precioPorcion &&
        (ahora - new Date(p.timestamp).getTime()) < TIEMPO_REGISTRO_RECIENTE
    );

    if (registroReciente) {
                return true;
    }

    return false;
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

    // Guardar precio por kilo temporalmente para futuros escaneos del mismo PLU
    preciosPorKiloGuardados.set(datosExtraidos.plu, precioKilo);
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
function cerrarModalInfoProducto() {
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
                // Reanudar escáner sin agregar
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

// Función para actualizar contadores
function actualizarContadoresAvanzado() {
    const totalProductos = productosEscaneados.length;
    const pesoTotal = productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = new Set(productosEscaneados.map(p => p.productoPrimario?.codigo || p.codigo)).size;

    const contadorEl = document.getElementById('contadorProductosAvanzado');
    const totalProductosEl = document.getElementById('totalProductosAvanzado');
    const pesoTotalEl = document.getElementById('pesoTotalAvanzado');
    const totalPrimariosEl = document.getElementById('totalProductosPrimarios');

    if (contadorEl) contadorEl.textContent = totalProductos;
    if (totalProductosEl) totalProductosEl.textContent = totalProductos;
    if (pesoTotalEl) pesoTotalEl.textContent = pesoTotal.toFixed(3);
    if (totalPrimariosEl) totalPrimariosEl.textContent = productosPrimarios;

    // Habilitar botón finalizar si hay productos
    const btnFinalizar = document.getElementById('finalizarEscaneoLotesAvanzado');
    if (btnFinalizar) {
        btnFinalizar.disabled = !(totalProductos > 0);
    }
}

// Función para actualizar el listado de productos escaneados
function actualizarListadoProductosAvanzado() {
    const tbody = document.getElementById('listadoProductosAvanzado');
    tbody.innerHTML = '';

    productosEscaneados.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="py-2 px-4 dark-table-cell">${index + 1}</td>
            <td class="py-2 px-4 font-mono text-sm dark-table-cell">${item.codigo}</td>
            <td class="py-2 px-4 dark-table-cell">${item.plu}</td>
            <td class="py-2 px-4 dark-table-cell">${item.nombre}</td>
            <td class="py-2 px-4 dark-table-cell">${item.peso.toFixed(3)}</td>
            <td class="py-2 px-4 dark-table-cell">$${item.precioKilo.toFixed(2)}</td>
            <td class="py-2 px-4 dark-table-cell">$${item.precioPorcion.toFixed(2)}</td>
            <td class="py-2 px-4">
                <span class="px-2 py-1 text-xs rounded dark-badge ${item.tipo === 'primario' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${item.tipo === 'primario' ? 'Primario' : 'Subproducto'}
                </span>
            </td>
            <td class="py-2 px-4">
                <button onclick="editarProductoEscaneado('${item.id}')" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm mr-1"
                        title="Editar">
                    ✏️
                </button>
                <button onclick="eliminarProductoEscaneado('${item.id}')" 
                        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        title="Eliminar">
                    🗑️
                </button>
            </td>
        `;
    });
}

// Función para eliminar un producto escaneado
window.eliminarProductoEscaneado = function (id) {
            // Encontrar el índice del producto a eliminar
    const index = productosEscaneados.findIndex(item => item.id === id);

    if (index !== -1) {
        // Eliminar del array
        productosEscaneados.splice(index, 1);

                // Actualizar el listado inmediatamente
        actualizarListadoProductosAvanzado();

        // Actualizar contadores
        actualizarContadoresAvanzado();

        // Mostrar mensaje de confirmación
        mostrarAlertaBurbuja('🗑️ Producto eliminado', 'success');
    } else {
        console.error('No se encontró el producto con ID:', id);
        mostrarAlertaBurbuja('❌ Error al eliminar producto', 'error');
    }
};

// Función para editar un producto escaneado
window.editarProductoEscaneado = function (id) {
        // Encontrar el producto
    const producto = productosEscaneados.find(item => item.id === id);
    
    if (!producto) {
        console.error('No se encontró el producto con ID:', id);
        mostrarAlertaBurbuja('❌ Error al encontrar producto', 'error');
        return;
    }
    
    // Abrir modal de edición
    abrirModalEdicionProducto(producto);
};

// Función para abrir el modal de edición de producto
function abrirModalEdicionProducto(producto) {
    const modal = document.getElementById('modalEdicionProductoLote');
    if (!modal) {
        console.error('No se encontró el modal de edición');
        return;
    }
    
    // Rellenar los campos del modal con los datos actuales
    document.getElementById('editProductoId').value = producto.id;
    document.getElementById('editProductoNombre').textContent = producto.nombre;
    document.getElementById('editProductoCodigo').textContent = producto.codigo;
    document.getElementById('editProductoPLU').textContent = producto.plu;
    document.getElementById('editPrecioKilo').value = producto.precioKilo.toFixed(2);
    document.getElementById('editPeso').value = producto.peso.toFixed(3);
    document.getElementById('editPrecioPorcion').value = producto.precioPorcion.toFixed(2);
    
    // Guardar el precio de porción ORIGINAL (sin redondeo) en un atributo data para cálculos precisos
    document.getElementById('editPrecioPorcion').setAttribute('data-precio-original', producto.precioPorcion);
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Calcular precio al cambiar peso
    document.getElementById('editPeso').addEventListener('input', calcularPrecioPorcionDesdeEdit);
    
    // Calcular peso al cambiar precio por kilo
    document.getElementById('editPrecioKilo').addEventListener('input', calcularPesoDesdeEdit);
}

// Función para calcular precio de porción cuando se cambia el peso
function calcularPrecioPorcionDesdeEdit() {
    const precioKilo = parseFloat(document.getElementById('editPrecioKilo').value) || 0;
    const peso = parseFloat(document.getElementById('editPeso').value) || 0;
    const precioPorcion = precioKilo * peso;
    
    // Actualizar tanto el valor visual como el valor original guardado
    const inputPrecioPorcion = document.getElementById('editPrecioPorcion');
    inputPrecioPorcion.value = precioPorcion.toFixed(2);
    inputPrecioPorcion.setAttribute('data-precio-original', precioPorcion);
}

// Función para calcular peso cuando se cambia el precio por kilo (recalcula con precio original)
function calcularPesoDesdeEdit() {
    const precioKilo = parseFloat(document.getElementById('editPrecioKilo').value) || 0;
    
    // Usar el precio de porción ORIGINAL (sin redondeo) para cálculo preciso
    const inputPrecioPorcion = document.getElementById('editPrecioPorcion');
    const precioOriginal = parseFloat(inputPrecioPorcion.getAttribute('data-precio-original')) || 0;
    
    if (precioKilo > 0 && precioOriginal > 0) {
        const pesoCalculado = precioOriginal / precioKilo;
        // Truncar a 3 decimales (recortar sin redondear): multiplicar por 1000, truncar, dividir por 1000
        const pesoTruncado = Math.floor(pesoCalculado * 1000) / 1000;
        document.getElementById('editPeso').value = pesoTruncado.toFixed(3);
    }
}

// Función para guardar los cambios del producto editado
window.guardarEdicionProducto = function () {
    const productoId = document.getElementById('editProductoId').value;
    const nuevoPrecioKilo = parseFloat(document.getElementById('editPrecioKilo').value);
    const nuevoPeso = parseFloat(document.getElementById('editPeso').value);
    const nuevoPrecioPorcion = parseFloat(document.getElementById('editPrecioPorcion').value);
    
    // Validaciones
    if (isNaN(nuevoPrecioKilo) || nuevoPrecioKilo <= 0) {
        mostrarAlertaBurbuja('❌ El precio por kilo debe ser mayor a 0', 'error');
        return;
    }
    
    if (isNaN(nuevoPeso) || nuevoPeso <= 0) {
        mostrarAlertaBurbuja('❌ El peso debe ser mayor a 0', 'error');
        return;
    }
    
    if (isNaN(nuevoPrecioPorcion) || nuevoPrecioPorcion <= 0) {
        mostrarAlertaBurbuja('❌ El precio de porción debe ser mayor a 0', 'error');
        return;
    }
    
    // Encontrar y actualizar el producto
    const producto = productosEscaneados.find(item => item.id === productoId);
    
    if (producto) {
        // Actualizar los valores con redondeo apropiado
        producto.precioKilo = Math.round(nuevoPrecioKilo * 100) / 100; // Redondear a 2 decimales
        producto.peso = Math.round(nuevoPeso * 1000) / 1000; // Redondear a 3 decimales
        producto.precioPorcion = Math.round(nuevoPrecioPorcion * 100) / 100; // Redondear a 2 decimales
        
                // Actualizar la tabla
        actualizarListadoProductosAvanzado();
        
        // Actualizar contadores
        actualizarContadoresAvanzado();
        
        // Cerrar el modal
        cerrarModalEdicionProducto();
        
        // Mostrar mensaje de éxito
        mostrarAlertaBurbuja('✅ Producto actualizado correctamente', 'success');
    } else {
        console.error('No se encontró el producto con ID:', productoId);
        mostrarAlertaBurbuja('❌ Error al actualizar producto', 'error');
    }
};

// Función para cerrar el modal de edición
window.cerrarModalEdicionProducto = function () {
    const modal = document.getElementById('modalEdicionProductoLote');
    if (modal) {
        modal.style.display = 'none';
        
        // Limpiar listeners
        document.getElementById('editPeso').removeEventListener('input', calcularPrecioPorcionDesdeEdit);
        document.getElementById('editPrecioKilo').removeEventListener('input', calcularPesoDesdeEdit);
    }

};

// Función para pausar el escaneo
function pausarEscaneoLotesAvanzado() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    try {
        if (scannerLotesAvanzado && isEscaneoLotesAvanzadoActivo) {
            try {
                // Intentar pausar primero
                scannerLotesAvanzado.pause(true);
            } catch (pauseErr) {
                // Si pause falla (librería puede no soportarlo), intentar stop como fallback
                console.warn('pause() falló, intentando stop() como fallback:', pauseErr);
                try {
                    scannerLotesAvanzado.stop();
                } catch (stopErr) {
                    console.warn('stop() también falló al pausar:', stopErr);
                }
            }

            isEscaneoLotesAvanzadoActivo = false;

            // Actualizar estado del botón si existe
            if (btn) {
                btn.textContent = 'Reanudar Escáner';
                btn.className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded';
            }

            // Limpiar variables de debounce al pausar
            limpiarDebounce();

                    } else {
                    }
    } catch (err) {
        console.warn('Error al pausar el escáner:', err);
        if (btn) {
            btn.textContent = 'Reanudar Escáner';
        }
    }
}

// Función para reanudar el escaneo
function reanudarEscaneoLotesAvanzado() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
        try {
            // Intentar resume(); si falla, intentar iniciar el escáner de nuevo
            if (typeof scannerLotesAvanzado.resume === 'function') {
                scannerLotesAvanzado.resume();
            } else {
                throw new Error('resume() no disponible');
            }
            isEscaneoLotesAvanzadoActivo = true;

            // Actualizar estado del botón si existe
            if (btn) {
                btn.textContent = 'Pausar Escáner';
                btn.className = 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded';
            }

            // Limpiar variables de debounce al reanudar
            limpiarDebounce();

                    } catch (err) {
            console.warn('No se pudo resumir el escáner con resume():', err, 'Intentando iniciar el escáner...');
            // Intentar iniciar el escáner si resume no funciona
            try {
                iniciarEscanerLotesAvanzadoHtml5Qrcode();
                // iniciarEscanerLotesAvanzadoHtml5Qrcode marcará isEscaneoLotesAvanzadoActivo en su flujo
            } catch (startErr) {
                console.error('Error al iniciar el escáner como fallback:', startErr);
            }
        }
    }
}

// Función para reanudar el escáner sin limpiar debounce (para evitar bucles)
function reanudarEscannerSinLimpiarDebounce() {
    const btn = document.getElementById('pausarEscaneoLotesAvanzado');
    if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
        try {
            if (typeof scannerLotesAvanzado.resume === 'function') {
                scannerLotesAvanzado.resume();
            } else {
                throw new Error('resume() no disponible');
            }
            isEscaneoLotesAvanzadoActivo = true;

            // Actualizar estado del botón si existe
            if (btn) {
                btn.textContent = 'Pausar Escáner';
                btn.className = 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded';
            }

            // NO limpiar debounce para mantener el control
                    } catch (err) {
            console.warn('resume() falló en reanudarEscannerSinLimpiarDebounce():', err, 'Intentando iniciar...');
            try {
                iniciarEscanerLotesAvanzadoHtml5Qrcode();
            } catch (startErr) {
                console.error('Error al iniciar escáner como fallback:', startErr);
            }
        }
    }
}

// Función para reanudar el escáner después del procesamiento
function reanudarEscannerDespuesDeProcesamiento() {
    setTimeout(() => {
        if (scannerLotesAvanzado && !isEscaneoLotesAvanzadoActivo) {
            reanudarEscaneoLotesAvanzado();
        }
        ocultarAnimacionProcesamiento();
    }, 800); // Reducido de 2000ms a 800ms para mayor rapidez
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

    // Deshabilitar el botón de iniciar escaneo por lotes avanzado
    const btnIniciar = document.getElementById('iniciarEscaneoLotesAvanzado');
    if (btnIniciar) {
        btnIniciar.disabled = true;
        btnIniciar.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Hacer scroll automático al botón de guardar inventario
    setTimeout(() => {
        const btnGuardar = document.getElementById('guardarInventarioLotesAvanzado');
        if (btnGuardar) {
            btnGuardar.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        tarjeta.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark-card';
        tarjeta.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 dark-card-title">${grupo.productoPrimario.nombre}</h4>
                    <p class="text-sm text-gray-600 dark-card-text">Código: ${grupo.productoPrimario.codigo}</p>
                    <p class="text-sm text-gray-600 dark-card-text">Marca: ${grupo.productoPrimario.marca}</p>
                    <p class="text-lg font-bold text-green-600 mt-2 dark-card-highlight">Peso Total: ${grupo.pesoTotal.toFixed(3)} Kg</p>
                </div>
                <div class="text-right">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark-badge">
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
        <div class="bg-blue-50 p-4 rounded-lg mb-4 dark-modal-section">
            <h3 class="text-lg font-bold text-blue-800 mb-2 dark-modal-title">Producto Primario</h3>
            <p class="dark-modal-text"><strong>Código:</strong> ${grupo.productoPrimario.codigo}</p>
            <p class="dark-modal-text"><strong>Nombre:</strong> ${grupo.productoPrimario.nombre}</p>
            <p class="dark-modal-text"><strong>Marca:</strong> ${grupo.productoPrimario.marca}</p>
            <p class="dark-modal-text"><strong>Peso Total:</strong> ${grupo.pesoTotal.toFixed(3)} Kg</p>
        </div>
        
        <div class="bg-white border rounded-lg overflow-hidden dark-modal-table">
            <div class="bg-gray-50 px-4 py-2 border-b dark-modal-header">
                <h4 class="font-semibold text-gray-800 dark-modal-title">Subproductos Escaneados</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 dark-modal-header">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Código</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Nombre</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Peso</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Precio/Kg</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Precio Porción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    `;

    grupo.subproductos.forEach(sub => {
        detalleHTML += `
            <tr class="dark-modal-row">
                <td class="px-4 py-2 text-sm font-mono dark-modal-text">${sub.codigo}</td>
                <td class="px-4 py-2 text-sm dark-modal-text">${sub.nombre}</td>
                <td class="px-4 py-2 text-sm dark-modal-text">${sub.peso.toFixed(3)} Kg</td>
                <td class="px-4 py-2 text-sm dark-modal-text">$${sub.precioKilo.toFixed(2)}</td>
                <td class="px-4 py-2 text-sm dark-modal-text">$${sub.precioPorcion.toFixed(2)}</td>
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

// Función para generar comentarios detallados del inventario
function generarComentariosDetallados(grupo, ubicacionNombre, fechaEscaneo) {
    // Calcular totales
    let totalProductos = grupo.subproductos.length;
    let totalPeso = grupo.pesoTotal;
    let totalValor = grupo.subproductos.reduce((sum, prod) => sum + prod.precioPorcion, 0);
    let precioPromedioKg = totalValor / totalPeso;

    // Generar detalles de cada producto escaneado
    let detalles = grupo.subproductos.map((producto, index) => {
        return `Lote ${index + 1}: ${producto.peso.toFixed(3)}kg - $${producto.precioPorcion.toFixed(2)} (PLU: ${producto.plu})`;
    }).join('; ');

    // Formato conciso y directo
    const comentarios = `Escaneo por lotes - ${totalProductos} códigos - Valor total: $${totalValor.toFixed(2)} - Precio/Kg: $${precioPromedioKg.toFixed(2)} - Detalles: ${detalles}`;

    return comentarios;
}

// Función para guardar inventario de lotes avanzado
async function guardarInventarioLotesAvanzado() {
    try {
        // Verificar que hay productos para guardar
        if (!productosAgrupados || productosAgrupados.length === 0) {
            mostrarMensaje('No hay productos para guardar', 'error');
            return;
        }

        // Verificar sesión y obtener datos del usuario
        const { verificarSesionValida } = await import('./auth.js');
        const sesionValida = await verificarSesionValida();

        if (!sesionValida) {
            mostrarMensaje('Sesión no válida. Por favor, inicie sesión nuevamente', 'error');
            return;
        }

        // Obtener área_id y ubicación
        let area_id = localStorage.getItem('area_id');
        const ubicacionNombre = localStorage.getItem('ubicacion_almacen');
        const usuario_id = localStorage.getItem('usuario_id');

        if (!area_id || !ubicacionNombre) {
            mostrarMensaje('No hay ubicación seleccionada. Por favor, seleccione una ubicación primero', 'error');
            return;
        }

        if (!usuario_id) {
            mostrarMensaje('No se encontró información del usuario', 'error');
            return;
        }

        // Mostrar loading
        const loading = Swal.fire({
            title: 'Guardando inventario...',
            html: `
                <div class="text-center">
                    <p>Guardando ${productosAgrupados.length} productos en Supabase...</p>
                    <div class="mt-2">
                        <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150">
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </div>
                    </div>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Obtener instancia de Supabase
        const supabase = await getSupabase();
        let productosGuardados = 0;
        let errores = [];

        // Procesar cada grupo de productos
        for (const [index, grupo] of productosAgrupados.entries()) {
            try {
                // Actualizar loading con progreso
                loading.update({
                    html: `
                        <div class="text-center">
                            <p>Guardando producto ${index + 1} de ${productosAgrupados.length}...</p>
                            <p class="text-sm text-gray-600 mt-2">${grupo.productoPrimario.nombre}</p>
                            <div class="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                                <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style="width: ${((index + 1) / productosAgrupados.length) * 100}%"></div>
                            </div>
                        </div>
                    `
                });

                // Generar ID único para el registro de inventario
                // Usar lote numérico simple en lugar de timestamp
                const loteNumerico = await generarLoteNumerico(grupo.productoPrimario.codigo);
                // Agregar timestamp para garantizar unicidad en procesamiento simultáneo
                const timestampUnico = Date.now().toString().slice(-6); // Últimos 6 dígitos
                const idInventario = `${grupo.productoPrimario.codigo}-${loteNumerico}-${timestampUnico}`;

                // Calcular fecha de caducidad: 15 días desde hoy
                const fechaActual = new Date();
                const fechaCaducidad = new Date(fechaActual.getTime() + 15 * 24 * 60 * 60 * 1000);
                const fechaCaducidadStr = fechaCaducidad.toISOString().split('T')[0];

                // Crear comentarios detallados
                const comentarios = generarComentariosDetallados(grupo, ubicacionNombre, fechaActual);

                // Crear entrada de inventario para Supabase
                const inventarioData = {
                    id: idInventario,
                    codigo: grupo.productoPrimario.codigo,
                    nombre: grupo.productoPrimario.nombre,
                    marca: grupo.productoPrimario.marca,
                    categoria: grupo.productoPrimario.categoria,
                    lote: loteNumerico,
                    unidad: grupo.productoPrimario.unidad || 'Kg',
                    // Redondear pesoTotal a 3 decimales antes de guardar
                    cantidad: Math.round(parseFloat(grupo.pesoTotal || 0) * 1000) / 1000,
                    caducidad: fechaCaducidadStr,
                    comentarios: comentarios,
                    last_modified: new Date().toISOString(),
                    is_temp_id: false,
                    area_id: area_id,
                    usuario_id: usuario_id
                };

                                // PASO 1: Guardar en Supabase
                const { data: supabaseData, error: supabaseError } = await supabase
                    .from('inventario')
                    .insert([inventarioData])
                    .select();

                if (supabaseError) {
                    console.error('Error al guardar en Supabase:', supabaseError);
                    errores.push(`Error en ${grupo.productoPrimario.nombre}: ${supabaseError.message}`);
                    continue;
                }

                                // PASO 2: Sincronizar con IndexedDB
                const inventarioDataLocal = {
                    ...inventarioData,
                    areaName: ubicacionNombre // Agregar nombre del área para visualización local
                };

                // Guardar en IndexedDB usando la función mejorada con reintentos
                try {
                    await guardarEnIndexedDBConReintento(inventarioDataLocal, 3);
                } catch (indexedDBError) {
                    console.error('Error en IndexedDB (no crítico) después de reintentos:', {
                        error: indexedDBError,
                        errorName: indexedDBError.name || 'Unknown',
                        errorMessage: indexedDBError.message || 'Unknown error',
                        productId: inventarioDataLocal.id
                    });
                    // No marcamos como error crítico ya que Supabase ya se guardó exitosamente
                }

                // PASO 3: Actualizar localStorage si existe
                try {
                    const inventarioLocal = JSON.parse(localStorage.getItem('inventario') || '[]');
                    inventarioLocal.push(inventarioDataLocal);
                    localStorage.setItem('inventario', JSON.stringify(inventarioLocal));
                } catch (e) {
                    console.warn('No se pudo actualizar localStorage:', e);
                }

                productosGuardados++;
                            } catch (error) {
                console.error('Error al procesar grupo:', error);
                errores.push(`Error en ${grupo.productoPrimario.nombre}: ${error.message}`);
            }
        }

        // Cerrar loading
        Swal.close();

        // Mostrar resultados
        if (productosGuardados > 0) {
            // PASO 4: Actualizar tabla de inventario si existe
            try {
                                // Importar y ejecutar sincronización desde Supabase
                const { sincronizarInventarioDesdeSupabase } = await import('./db-operations.js');
                await sincronizarInventarioDesdeSupabase();

                            } catch (e) {
                console.warn('No se pudo actualizar la tabla automáticamente:', e);
            }

            if (errores.length > 0) {
                Swal.fire({
                    title: '⚠️ Guardado parcial',
                    html: `
                        <div class="text-left">
                            <p><strong>✅ Productos guardados:</strong> ${productosGuardados}</p>
                            <p><strong>❌ Errores:</strong> ${errores.length}</p>
                            <div class="mt-4 p-3 bg-red-50 rounded-lg">
                                <p class="text-sm font-medium text-red-800">Errores encontrados:</p>
                                <ul class="text-sm text-red-700 mt-2">
                                    ${errores.map(error => `<li>• ${error}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `,
                    icon: 'warning',
                    confirmButtonText: 'Continuar'
                });
            } else {
                Swal.fire({
                    title: '¡Éxito!',
                    html: `
                        <div class="text-center">
                            <p>Se guardaron <strong>${productosGuardados}</strong> productos correctamente</p>
                            <p class="text-sm text-gray-600 mt-2">
                                ✅ Guardado en Supabase<br>
                                ✅ Sincronizado con IndexedDB<br>
                                ✅ Tabla actualizada automáticamente
                            </p>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Continuar'
                });
            }
        } else {
            Swal.fire({
                title: '❌ Error',
                html: `
                    <div class="text-left">
                        <p>No se pudo guardar ningún producto</p>
                        <div class="mt-4 p-3 bg-red-50 rounded-lg">
                            <p class="text-sm font-medium text-red-800">Errores:</p>
                            <ul class="text-sm text-red-700 mt-2">
                                ${errores.map(error => `<li>• ${error}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `,
                icon: 'error',
                confirmButtonText: 'Reintentar'
            });
            return;
        }

        // Limpiar datos después del guardado exitoso
        productosEscaneados = [];
        productosAgrupados = [];
        preciosPorKiloGuardados.clear();

        // Actualizar contadores
        actualizarContadoresAvanzado();

        // Ocultar resultados
        document.getElementById('resultadosLotesAvanzado').classList.add('hidden');

        // Volver a pestaña manual
        cambiarPestanaPrincipal('manual');

        mostrarAlertaBurbuja(`💾 Inventario guardado: ${productosGuardados} productos`, 'success');

        // Habilitar el botón de iniciar escaneo por lotes avanzado después de guardar
        const btnIniciar = document.getElementById('iniciarEscaneoLotesAvanzado');
        if (btnIniciar) {
            btnIniciar.disabled = false;
            btnIniciar.classList.remove('opacity-50', 'cursor-not-allowed');
        }

    } catch (error) {
        console.error('Error general al guardar inventario:', error);
        Swal.fire({
            title: 'Error',
            text: `Error al guardar inventario: ${error.message}`,
            icon: 'error',
            confirmButtonText: 'Cerrar'
        });
    }
}

// Función para cerrar el modal de lotes avanzado
function cerrarModalLotesAvanzado() {
    (async () => {
        if (scannerLotesAvanzado) {
            try {
                // Intentar detener de forma segura
                await scannerLotesAvanzado.stop();
            } catch (err) {
                console.warn('stop() falló al cerrar modal (puede que ya estuviera detenido):', err);
            }

            try {
                // Intentar limpiar la instancia
                if (typeof scannerLotesAvanzado.clear === 'function') {
                    await scannerLotesAvanzado.clear();
                }
            } catch (clearErr) {
                console.warn('clear() falló al cerrar modal:', clearErr);
            }

            // Además, detener manualmente cualquier track de video residual en el contenedor
            try {
                const reader = document.getElementById('reader-lotes-avanzado');
                if (reader) {
                    const video = reader.querySelector('video');
                    if (video && video.srcObject) {
                        const tracks = video.srcObject.getTracks();
                        tracks.forEach(t => {
                            try { t.stop(); } catch (e) { /* ignore */ }
                        });
                    }
                    // Vaciar el contenedor
                    reader.innerHTML = '';
                }
            } catch (trackErr) {
                console.warn('Error al limpiar tracks de video:', trackErr);
            }

            // Finalmente, nullificar la referencia
            scannerLotesAvanzado = null;
            isEscaneoLotesAvanzadoActivo = false;
        }

        const modal = document.getElementById('modalEscaneoLotesAvanzado');
        if (modal) modal.style.display = 'none';

        // Limpiar animaciones
        ocultarAnimacionProcesamiento();
    })();
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

// F// Función para extraer datos CODE128 usando regex
function extraerDatosCodeCODE128(codigo) {
        // Sanitizar entrada
    codigo = sanitizarEntrada(codigo);
    codigo = codigo.replace(/^0+/, ''); // Eliminar ceros a la izquierda

    // Regex para extraer datos: ^2(\d{4})(\d{6})(\d{2})(\d+)$
    // Grupos: 1=PLU(4 dígitos), 2=pesos(6 dígitos), 3=centavos(2 dígitos), 4=control(variable)
    const regexExtraccion = /^2(\d{4})(\d{6})(\d{2})(\d+)$/;
    const match = codigo.match(regexExtraccion);

    if (!match) {
                        return null;
    }

    const plu = match[1];                    // PLU de 4 dígitos
    const pesosStr = match[2];               // Pesos de 6 dígitos
    const centavosStr = match[3];            // Centavos de 2 dígitos
    const digitoControl = match[4];          // Dígito de control (variable)

                    // Convertir pesos y centavos a números
    const pesos = parseInt(pesosStr, 10);
    const centavos = parseInt(centavosStr, 10);
            // Calcular precio por porción: pesos + centavos/100
    const precioPorcion = pesos + (centavos / 100);
        // Calcular peso temporal para mostrar en el modal (se recalculará con precio real)
    const pesoTemporal = precioPorcion / precioKiloTemporal;

        return {
        plu: plu,
        precioPorcion: precioPorcion,
        pesoTemporal: pesoTemporal,
        centavos: centavos,
        digitoControl: digitoControl
    };
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
            }
}

// Función para sanitizar entrada
function sanitizarEntrada(entrada) {
    if (typeof entrada !== 'string') {
        entrada = String(entrada);
    }
    return entrada.trim();
}

// Función auxiliar para guardar en IndexedDB con manejo de errores mejorado
async function guardarEnIndexedDBConReintento(inventarioData, maxReintentos = 3) {
    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            await new Promise((resolve, reject) => {
                const request = indexedDB.open("InventarioDB", 3);
                request.onsuccess = function (event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['inventario'], 'readwrite');
                    const objectStore = transaction.objectStore('inventario');

                    // Usar put en lugar de add para permitir actualizaciones/reemplazos
                    const putRequest = objectStore.put(inventarioData);
                    putRequest.onsuccess = () => {
                                                resolve();
                    };
                    putRequest.onerror = (e) => {
                        console.error(`Error al guardar en IndexedDB (intento ${intento}):`, {
                            error: e,
                            errorCode: e.target?.error?.name || 'Unknown',
                            errorMessage: e.target?.error?.message || 'Unknown error',
                            productId: inventarioData.id
                        });
                        reject(e);
                    };
                };
                request.onerror = (e) => {
                    console.error(`Error al abrir IndexedDB (intento ${intento}):`, {
                        error: e,
                        errorCode: e.target?.error?.name || 'Unknown',
                        errorMessage: e.target?.error?.message || 'Unknown error'
                    });
                    reject(e);
                };
                request.onupgradeneeded = function (event) {
                    const db = event.target.result;
                    // Crear el object store si no existe
                    if (!db.objectStoreNames.contains('inventario')) {
                        const objectStore = db.createObjectStore('inventario', {
                            keyPath: 'id'
                        });
                        objectStore.createIndex('id', 'id', { unique: true });
                        objectStore.createIndex('codigo', 'codigo', { unique: false });
                        objectStore.createIndex('lote', 'lote', { unique: false });
                        objectStore.createIndex('nombre', 'nombre', { unique: false });
                        objectStore.createIndex('categoria', 'categoria', { unique: false });
                        objectStore.createIndex('marca', 'marca', { unique: false });
                        objectStore.createIndex('unidad', 'unidad', { unique: false });
                        objectStore.createIndex('cantidad', 'cantidad', { unique: false });
                        objectStore.createIndex('caducidad', 'caducidad', { unique: false });
                        objectStore.createIndex('comentarios', 'comentarios', { unique: false });
                        // Crear índice compuesto para código y lote (no único para permitir actualizaciones)
                        objectStore.createIndex('codigo_lote', ['codigo', 'lote'], { unique: false });
                    }
                };
            });
            return; // Éxito, salir del bucle
        } catch (error) {
            console.warn(`Intento ${intento} fallido para IndexedDB:`, error);
            if (intento === maxReintentos) {
                throw error; // Re-lanzar el error en el último intento
            }
            // Esperar un poco antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 100 * intento));
        }
    }
}



// Exportar funciones principales
export {
    inicializarSistemaLotesAvanzado,
    cambiarPestanaPrincipal,
    cargarDiccionarioSubproductos
};


