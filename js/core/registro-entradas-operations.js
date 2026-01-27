// Operaciones específicas para el registro de entradas
import { agregarRegistroEntrada, cargarEntradasEnTabla, sincronizarEntradasDesdeSupabase, eliminarRegistroEntrada, generarReporteEntradas, inicializarDBEntradas, procesarColaSincronizacionEntradas } from '../db/db-operations.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from '../utils/logs.js';
import { db } from '../db/db-operations.js';
import { buscarPorCodigoParcial } from '../products/product-operations.js';
import { sincronizarProductosLocalesHaciaSupabase } from '../db/sync-bidirectional.js';

// Variable para almacenar el producto seleccionado
let productoSeleccionadoEntrada = null;

// Función para buscar producto por código, nombre o marca
export async function buscarProductoParaEntrada(termino, tipoBusqueda = 'codigo') {
    try {
        if (!db) {
            throw new Error("Base de datos no inicializada");
        }

        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");

        return new Promise((resolve, reject) => {
            // Manejar búsqueda por código corto (4 dígitos)
            if (tipoBusqueda === 'codigo' && termino.length === 4) {
                buscarPorCodigoParcial(termino, "RegistroEntradas", (resultados) => {
                    const producto = resultados.length > 0 ? resultados[0] : null;
                    resolve(producto);
                });
                return;
            }

            let request;

            switch (tipoBusqueda) {
                case 'codigo':
                    // Para código usamos get() directamente ya que es el keyPath
                    request = objectStore.get(termino);
                    break;
                case 'nombre':
                    const indexNombre = objectStore.index("nombre");
                    request = indexNombre.getAll();
                    break;
                case 'marca':
                    const indexMarca = objectStore.index("marca");
                    request = indexMarca.getAll();
                    break;
                default:
                    reject(new Error("Tipo de búsqueda no válido"));
                    return;
            }

            request.onsuccess = function (event) {
                let resultado = event.target.result;

                if (tipoBusqueda === 'nombre' || tipoBusqueda === 'marca') {
                    // Filtrar resultados para búsquedas por nombre o marca
                    resultado = resultado.filter(producto => {
                        const campo = tipoBusqueda === 'nombre' ? producto.nombre : producto.marca;
                        return campo && campo.toLowerCase().includes(termino.toLowerCase());
                    });

                    // Devolver el primer resultado encontrado o null
                    resultado = resultado.length > 0 ? resultado[0] : null;
                }

                resolve(resultado);
            };

            request.onerror = function (event) {
                console.error(`Error al buscar producto por ${tipoBusqueda}:`, event.target.error);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error("Error en buscarProductoParaEntrada:", error);
        throw error;
    }
}

// Función para actualizar el inventario cuando se registra una entrada
// Función de diagnóstico para verificar entradas registradas
window.diagnosticarEntradas = async function(codigoProducto = null) {
    console.log("🔍 === DIAGNÓSTICO DE ENTRADAS ===");

    try {
        // Verificar base de datos de entradas
        const { dbEntradas } = await import('../db/db-operations.js');
        console.log("📊 Base de datos de entradas:", dbEntradas ? "✅ Disponible" : "❌ No disponible");

        if (!dbEntradas) return;

        // Contar total de registros de entradas
        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");

        const totalEntradas = await new Promise((resolve) => {
            const request = objectStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
        console.log("📈 Total de entradas registradas:", totalEntradas);

        // Si se especifica un código, buscar entradas para ese código
        if (codigoProducto) {
            console.log(`🔍 Buscando entradas para código: ${codigoProducto}`);
            const entradasProducto = await new Promise((resolve) => {
                const request = objectStore.getAll();
                request.onsuccess = () => {
                    const entradas = request.result || [];
                    return resolve(entradas.filter(e => e.codigo === codigoProducto));
                };
                request.onerror = () => resolve([]);
            });

            console.log(`📋 Entradas encontradas para ${codigoProducto}:`, entradasProducto);

            const cantidadTotalEntrada = entradasProducto.reduce((suma, entrada) => suma + (entrada.cantidad || 0), 0);
            console.log(`📊 Cantidad total de entrada para ${codigoProducto}: ${cantidadTotalEntrada}`);
        } else {
            // Mostrar algunas entradas de ejemplo
            const algunasEntradas = await new Promise((resolve) => {
                const request = objectStore.getAll();
                request.onsuccess = () => resolve((request.result || []).slice(0, 5));
                request.onerror = () => resolve([]);
            });
            console.log("📋 Primeras 5 entradas registradas:", algunasEntradas);
        }

    } catch (error) {
        console.error("❌ Error en diagnóstico de entradas:", error);
    }

    console.log("🔍 === FIN DIAGNÓSTICO ENTRADAS ===");
};

// Función para obtener el stock actual del producto desde el historial de entradas
async function obtenerStockActual(codigoProducto) {
    try {
        console.log(`🔍 Buscando cantidad total de entradas para producto: ${codigoProducto}`);
        const { dbEntradas } = await import('../db/db-operations.js');
        if (!dbEntradas) {
            console.warn("❌ Base de datos de entradas no disponible");
            return 0;
        }

        console.log("✅ Base de datos de entradas disponible");
        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");

        return new Promise((resolve) => {
            const request = objectStore.getAll();
            request.onsuccess = () => {
                const entradas = request.result || [];
                console.log(`📊 Total de entradas en la base de datos:`, entradas.length);
                
                // Filtrar entradas del mismo código
                const entradasProducto = entradas.filter(e => e.codigo === codigoProducto);
                console.log(`📋 Entradas encontradas para ${codigoProducto}:`, entradasProducto.length);
                
                // Sumar cantidades
                const totalStock = entradasProducto.reduce((suma, entrada) => suma + (entrada.cantidad || 0), 0);
                console.log(`📈 Cantidad total registrada para ${codigoProducto}: ${totalStock}`);
                resolve(totalStock);
            };
            request.onerror = (error) => {
                console.error(`❌ Error al obtener entradas:`, error);
                resolve(0);
            };
        });
    } catch (error) {
        console.warn("❌ Error al obtener stock actual:", error);
        return 0;
    }
}

// Función para mostrar los datos del producto encontrado
export function mostrarDatosProductoEntrada(producto) {
    if (!producto) {
        limpiarFormularioEntrada();
        mostrarAlertaBurbuja("Producto no encontrado", "warning");
        return;
    }

    productoSeleccionadoEntrada = producto;

    // Llenar los campos del formulario
    const campos = [
        { id: 'codigoProducto', valor: producto.codigo || '' },
        { id: 'nombreProducto', valor: producto.nombre || '' },
        { id: 'marcaProducto', valor: producto.marca || '' },
        { id: 'categoriaProducto', valor: producto.categoria || '' },
        { id: 'unidadProducto', valor: producto.unidad || '' }
    ];

    campos.forEach(campo => {
        const elemento = document.getElementById(campo.id);
        if (elemento) {
            elemento.value = campo.valor;
        }
    });

    // Limpiar campos de entrada específicos pero mantener lote si existe
    const camposEntrada = ['cantidadEntrada', 'fechaEntrada', 'comentariosEntrada'];
    camposEntrada.forEach(campoId => {
        const elemento = document.getElementById(campoId);
        if (elemento) {
            elemento.value = '';
        }
    });

    // Limpiar lote
    const loteInput = document.getElementById('loteEntrada');
    if (loteInput) {
        loteInput.value = '';
    }

    // Establecer fecha actual por defecto
    const fechaEntrada = document.getElementById('fechaEntrada');
    if (fechaEntrada) {
        fechaEntrada.value = new Date().toISOString().split('T')[0];
    }

    // Mostrar stock actual
    const stockActualDiv = document.getElementById('stockActual');
    if (stockActualDiv) {
        stockActualDiv.innerHTML = '<span class="text-gray-400">Cargando...</span>';
        obtenerStockActual(producto.codigo).then(stock => {
            if (stockActualDiv) {
                // Establecer el atributo data-stock y llamar a updateStockDisplay()
                stockActualDiv.setAttribute('data-stock', Math.round(stock));
                
                // Llamar a la función updateStockDisplay si existe en el contexto global
                if (typeof window.updateStockDisplay === 'function') {
                    window.updateStockDisplay();
                } else {
                    // Fallback si updateStockDisplay no está disponible
                    stockActualDiv.textContent = stock.toFixed(2);
                    stockActualDiv.className = stock > 0 ? 'text-2xl font-bold text-blue-600' : 'text-2xl font-bold text-red-600';
                }
            }
        });
    }

    // Enfocar en el campo de cantidad
    const cantidadInput = document.getElementById('cantidadEntrada');
    if (cantidadInput) {
        cantidadInput.focus();
    }

    mostrarAlertaBurbuja(`Producto encontrado: ${producto.nombre}`, "success");
}

// Función para limpiar el formulario de entrada
export function limpiarFormularioEntrada() {
    productoSeleccionadoEntrada = null;

    const campos = [
        'codigoProducto', 'nombreProducto', 'marcaProducto',
        'categoriaProducto', 'unidadProducto', 'cantidadEntrada',
        'fechaEntrada', 'comentariosEntrada'
    ];

    campos.forEach(campoId => {
        const elemento = document.getElementById(campoId);
        if (elemento) {
            elemento.value = '';
        }
    });

    // Establecer fecha actual por defecto
    const fechaEntrada = document.getElementById('fechaEntrada');
    if (fechaEntrada) {
        fechaEntrada.value = new Date().toISOString().split('T')[0];
    }
}

// Función para registrar una nueva entrada
export async function registrarEntrada() {
    try {
        if (!productoSeleccionadoEntrada) {
            mostrarAlertaBurbuja("Primero debe buscar y seleccionar un producto usando los campos de búsqueda (código, nombre o marca)", "warning");
            return false;
        }

        // Validar que el usuario esté autenticado
        const usuarioId = localStorage.getItem('usuario_id');
        if (!usuarioId) {
            mostrarAlertaBurbuja("Error: Usuario no autenticado. Por favor inicie sesión nuevamente", "error");
            return false;
        }

        // Obtener datos del formulario
        const cantidad = document.getElementById('cantidadEntrada')?.value?.trim();
        const fechaEntrada = document.getElementById('fechaEntrada')?.value;
        const lote = document.getElementById('loteEntrada')?.value?.trim() || '';
        const comentarios = document.getElementById('comentariosEntrada')?.value?.trim() || '';

        // Validaciones
        if (!cantidad || isNaN(cantidad) || parseFloat(cantidad) <= 0) {
            mostrarAlertaBurbuja("Ingrese una cantidad válida (mayor a 0)", "error");
            return false;
        }

        // Validar que la cantidad no sea excesivamente pequeña
        const cantidadNumerica = parseFloat(cantidad);
        if (cantidadNumerica > 999999) {
            mostrarAlertaBurbuja("La cantidad excede el límite permitido (máximo 999.999)", "error");
            return false;
        }

        if (!fechaEntrada) {
            mostrarAlertaBurbuja("Seleccione una fecha de entrada", "error");
            return false;
        }

        // Validar que la fecha no sea futura
        const fechaSeleccionada = new Date(fechaEntrada);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaSeleccionada > hoy) {
            mostrarAlertaBurbuja("La fecha de entrada no puede ser posterior a hoy", "warning");
            return false;
        }

        // Preparar datos de la entrada
        const entradaData = {
            codigo: productoSeleccionadoEntrada.codigo,
            nombre: productoSeleccionadoEntrada.nombre,
            marca: productoSeleccionadoEntrada.marca,
            categoria: productoSeleccionadoEntrada.categoria,
            unidad: productoSeleccionadoEntrada.unidad,
            cantidad: cantidadNumerica,
            fecha_entrada: fechaEntrada,
            lote: lote,
            comentarios: comentarios,
            producto_id: productoSeleccionadoEntrada.id || null,
            usuario_id: usuarioId
        };

        // Registrar la entrada
        const entradaRegistrada = await agregarRegistroEntrada(entradaData);

        if (entradaRegistrada) {
            console.log(`✅ Entrada registrada con ID: ${entradaRegistrada}`);
            mostrarAlertaBurbuja("Entrada registrada correctamente", "success");
            limpiarFormularioEntrada();

            // NOTE: No actualizamos la tabla 'inventario' porque es un sistema separado
            // El "stock actual" mostrado durante el registro de entradas viene del historial
            // de entradas (registro_entradas), no del inventario
            
            // Recargar tabla de entradas si existe
            await actualizarTablaEntradas();

            return true;
        } else {
            console.warn(`⚠️ No se registró la entrada correctamente`);
        }

    } catch (error) {
        console.error("Error al registrar entrada:", error);
        mostrarAlertaBurbuja("Error al registrar la entrada", "error");
        return false;
    }
}

// Función para actualizar la tabla de entradas
export async function actualizarTablaEntradas(filtros = {}) {
    try {
        // Si no se pasan filtros específicos (solo filtros vacíos o undefined), filtrar por fecha del día actual
        const tieneFiltrosEspecificos = Object.keys(filtros).some(key =>
            filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== ''
        );

        if (!tieneFiltrosEspecificos) {
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            filtros.fechaDesde = fechaHoy;
            filtros.fechaHasta = fechaHoy;
        }

        console.log("Actualizando tabla de entradas con filtros:", filtros);
        const entradas = await cargarEntradasEnTabla(filtros) || [];
        console.log("Entradas cargadas:", entradas);

        const tbody = document.getElementById('tablaEntradasBody');

        if (!tbody) {
            console.warn("No se encontró el elemento tablaEntradasBody");
            return;
        }

        tbody.innerHTML = '';

        if (!Array.isArray(entradas) || entradas.length === 0) {
            tbody.innerHTML = `
                <tr class="dark-theme-bg">
                    <td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500 dark-theme-text-secondary">
                        No hay entradas registradas
                    </td>
                </tr>
            `;
            return;
        }

        entradas.forEach((entrada, index) => {
            const fila = document.createElement('tr');
            fila.className = index % 2 === 0 ? 'bg-white dark-theme-bg' : 'bg-gray-50 dark-theme-bg-secondary';

            fila.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark-theme-text">
                    ${entrada.codigo || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.nombre || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.marca || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.categoria || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.unidad || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.cantidad || 0}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.fecha_entrada ? new Date(entrada.fecha_entrada).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.comentarios || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="eliminarEntrada(${entrada.id})" 
                            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                        Eliminar
                    </button>
                </td>
            `;

            tbody.appendChild(fila);
        });

        // Actualizar contador de entradas
        const contadorElement = document.getElementById('contadorEntradas');
        if (contadorElement) {
            contadorElement.textContent = `Total: ${entradas.length} entradas`;
        }

    } catch (error) {
        console.error("Error al actualizar tabla de entradas:", error);
        mostrarAlertaBurbuja("Error al cargar entradas", "error");
    }
}

// Función para eliminar una entrada (disponible globalmente)
window.eliminarEntrada = async function (entradaId) {
    if (!confirm('¿Está seguro de que desea eliminar esta entrada?')) {
        return;
    }

    try {
        await eliminarRegistroEntrada(entradaId);
        mostrarAlertaBurbuja("Entrada eliminada correctamente", "success");
        await actualizarTablaEntradas();
    } catch (error) {
        console.error("Error al eliminar entrada:", error);
        mostrarAlertaBurbuja("Error al eliminar entrada", "error");
    }
};

// Función para filtrar entradas
export async function filtrarEntradas() {
    const filtros = {
        codigo: document.getElementById('filtroCodigo')?.value?.trim() || '',
        nombre: document.getElementById('filtroNombre')?.value?.trim() || '',
        marca: document.getElementById('filtroMarca')?.value?.trim() || ''
    };

    await actualizarTablaEntradas(filtros);
}

// Función para limpiar filtros
export function limpiarFiltros() {
    const filtros = ['filtroCodigo', 'filtroNombre', 'filtroMarca'];
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.value = '';
        }
    });

    actualizarTablaEntradas();
}

// Función para sincronizar entradas
export async function sincronizarEntradas() {
    try {
        mostrarAlertaBurbuja("Sincronizando entradas...", "info");
        console.log("🔄 Iniciando sincronización bidireccional de entradas");

        // Verificar estado de la cola antes de sincronizar
        const colaActual = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');
        console.log(`📋 Cola de sincronización antes: ${colaActual.length} elementos`);

        // Primero procesar la cola local a Supabase (enviar cambios locales)
        console.log("⬆️ Procesando cola local a Supabase...");
        await procesarColaSincronizacionEntradas();

        // Luego sincronizar desde Supabase a local (obtener cambios remotos)
        console.log("⬇️ Sincronizando desde Supabase a local...");
        await sincronizarEntradasDesdeSupabase();

        // Sincronizar productos locales que se hayan agregado
        console.log("📦 Sincronizando productos locales...");
        await sincronizarProductosLocalesHaciaSupabase();

        // Verificar estado de la cola después de sincronizar
        const colaDespues = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');
        console.log(`📋 Cola de sincronización después: ${colaDespues.length} elementos`);

        await actualizarTablaEntradas();
        mostrarAlertaBurbuja("Entradas y productos sincronizados correctamente", "success");
        console.log("✅ Sincronización bidireccional completada");
    } catch (error) {
        console.error("❌ Error al sincronizar entradas:", error);
        mostrarAlertaBurbuja("Error al sincronizar entradas", "error");
    }
}

// Función para generar reporte
export async function generarReporte() {
    try {
        const filtros = {
            codigo: document.getElementById('filtroCodigo')?.value?.trim() || '',
            nombre: document.getElementById('filtroNombre')?.value?.trim() || '',
            marca: document.getElementById('filtroMarca')?.value?.trim() || ''
        };

        await generarReporteEntradas(filtros, 'csv');
    } catch (error) {
        console.error("Error al generar reporte:", error);
        mostrarAlertaBurbuja("Error al generar reporte", "error");
    }
}

// Función para generar reporte en PDF
export async function generarReportePDF() {
    try {
        const filtros = {
            codigo: document.getElementById('filtroCodigo')?.value?.trim() || '',
            nombre: document.getElementById('filtroNombre')?.value?.trim() || '',
            marca: document.getElementById('filtroMarca')?.value?.trim() || ''
        };

        await generarReporteEntradas(filtros, 'pdf');
    } catch (error) {
        console.error("Error al generar reporte PDF:", error);
        mostrarAlertaBurbuja("Error al generar reporte PDF", "error");
    }
}

// Función para inicializar la página de registro de entradas
export async function inicializarRegistroEntradas() {
    try {
        console.log("Iniciando inicialización de registro de entradas...");

        // Inicializar base de datos de entradas
        await inicializarDBEntradas();

        // Verificar que la base de datos esté disponible
        const { dbEntradas } = await import('../db/db-operations.js');
        if (!dbEntradas) {
            console.warn("dbEntradas no está disponible inmediatamente, esperando...");
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log("Base de datos inicializada, cargando entradas...");

        // Cargar entradas en la tabla
        await actualizarTablaEntradas();

        // Configurar event listeners
        configurarEventListeners();

        // Exponer funciones de diagnóstico globalmente
        window.diagnosticarInventario = diagnosticarInventario;
        window.diagnosticarEntradas = diagnosticarEntradas;
        console.log("✅ Funciones de diagnóstico disponibles:");
        console.log("   diagnosticarInventario(codigoProducto)");
        console.log("   diagnosticarEntradas(codigoProducto)");

        console.log("Página de registro de entradas inicializada correctamente");

    } catch (error) {
        console.error("Error al inicializar registro de entradas:", error);
        mostrarAlertaBurbuja("Error al inicializar la página", "error");
    }
}

// Función para configurar todos los event listeners
function configurarEventListeners() {
    // Botones de búsqueda
    const btnBuscarCodigo = document.getElementById('buscarPorCodigo');
    const btnBuscarNombre = document.getElementById('buscarPorNombre');
    const btnBuscarMarca = document.getElementById('buscarPorMarca');
    const btnBuscarCodigoCorto = document.getElementById('buscarPorCodigoCorto');

    if (btnBuscarCodigo) {
        btnBuscarCodigo.addEventListener('click', () => buscarProducto('codigo'));
    }

    if (btnBuscarNombre) {
        btnBuscarNombre.addEventListener('click', () => buscarProducto('nombre'));
    }

    if (btnBuscarMarca) {
        btnBuscarMarca.addEventListener('click', () => buscarProducto('marca'));
    }

    if (btnBuscarCodigoCorto) {
        btnBuscarCodigoCorto.addEventListener('click', () => buscarProducto('codigoCorto'));
    }

    // Botón registrar entrada
    const btnRegistrarEntrada = document.getElementById('registrarEntrada');
    if (btnRegistrarEntrada) {
        btnRegistrarEntrada.addEventListener('click', registrarEntrada);
    }

    // Botón limpiar formulario
    const btnLimpiarFormulario = document.getElementById('limpiarFormulario');
    if (btnLimpiarFormulario) {
        btnLimpiarFormulario.addEventListener('click', limpiarFormularioEntrada);
    }

    // Botones de filtros
    const btnFiltrar = document.getElementById('filtrarEntradas');
    const btnLimpiarFiltros = document.getElementById('limpiarFiltros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', filtrarEntradas);
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }

    // Botones de sincronización y reporte
    const btnSincronizar = document.getElementById('sincronizarEntradas');
    const btnGenerarReporte = document.getElementById('generarReporte');
    const btnGenerarReportePDF = document.getElementById('generarReportePDF');

    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', sincronizarEntradas);
    }

    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', generarReporte);
    }

    if (btnGenerarReportePDF) {
        btnGenerarReportePDF.addEventListener('click', generarReportePDF);
    }

    // Enter en campos de búsqueda
    const camposBusqueda = ['busquedaCodigo', 'busquedaNombre', 'busquedaMarca'];
    camposBusqueda.forEach((campoId, index) => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const tipos = ['codigo', 'nombre', 'marca'];
                    buscarProducto(tipos[index]);
                }
            });
        }
    });

    // Enter en campo de cantidad
    const cantidadEntrada = document.getElementById('cantidadEntrada');
    if (cantidadEntrada) {
        cantidadEntrada.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                registrarEntrada();
            }
        });
    }
}

// Función auxiliar para buscar producto
async function buscarProducto(tipo) {
    const terminos = {
        codigo: document.getElementById('busquedaCodigo')?.value?.trim(),
        nombre: document.getElementById('busquedaNombre')?.value?.trim(),
        marca: document.getElementById('busquedaMarca')?.value?.trim(),
        codigoCorto: document.getElementById('busquedaCodigoCorto')?.value?.trim()
    };

    const termino = terminos[tipo];
    if (!termino) {
        const tipoDisplay = tipo === 'codigoCorto' ? 'código corto' : tipo;
        mostrarAlertaBurbuja(`⚠️ Por favor ingrese un ${tipoDisplay} para buscar`, "warning");
        return;
    }

    try {
        console.log(`🔍 Buscando producto por ${tipo}:`, termino);
        const tipoBusqueda = tipo === 'codigoCorto' ? 'codigo' : tipo;
        const producto = await buscarProductoParaEntrada(termino, tipoBusqueda);
        
        if (producto) {
            mostrarDatosProductoEntrada(producto);
        } else {
            mostrarAlertaBurbuja(`❌ No se encontró producto con ese ${tipo}. Verifique el dato ingresado.`, "warning");
        }
    } catch (error) {
        console.error(`❌ Error al buscar producto por ${tipo}:`, error);
        mostrarAlertaBurbuja(`Error en la búsqueda: ${error.message || 'error desconocido'}`, "error");
    }
}

// ============================================================
// FUNCIONES DE DIAGNÓSTICO
// ============================================================

async function diagnosticarInventario(codigoProducto = null) {
    console.log("🔍 === DIAGNÓSTICO DE INVENTARIO ===");

    try {
        // Verificar base de datos de inventario
        const { dbInventario } = await import('../db/db-operations.js');
        console.log("📊 Base de datos de inventario:", dbInventario ? "✅ Disponible" : "❌ No disponible");

        if (!dbInventario) return;

        // Verificar área_id
        const areaId = localStorage.getItem('area_id');
        console.log("🏢 Área ID:", areaId || "❌ No configurado");

        // Contar total de registros en inventario
        const transaction = dbInventario.transaction(["inventario"], "readonly");
        const objectStore = transaction.objectStore("inventario");

        const totalRegistros = await new Promise((resolve) => {
            const request = objectStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
        console.log("📈 Total de registros en inventario:", totalRegistros);

        // Si se especifica un código, buscar registros para ese código
        if (codigoProducto) {
            console.log(`🔍 Buscando registros para código: ${codigoProducto}`);
            const index = objectStore.index("codigo");
            const registrosProducto = await new Promise((resolve) => {
                const request = index.getAll(codigoProducto);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });

            console.log(`📋 Registros encontrados para ${codigoProducto}:`, registrosProducto);

            const stockTotal = registrosProducto.reduce((suma, item) => suma + (item.cantidad || 0), 0);
            console.log(`📊 Stock total calculado para ${codigoProducto}: ${stockTotal}`);
        } else {
            // Mostrar algunos registros de ejemplo
            const algunosRegistros = await new Promise((resolve) => {
                const request = objectStore.getAll();
                request.onsuccess = () => resolve((request.result || []).slice(0, 5));
                request.onerror = () => resolve([]);
            });
            console.log("📋 Primeros 5 registros de inventario:", algunosRegistros);
        }

    } catch (error) {
        console.error("❌ Error en diagnóstico:", error);
    }

    console.log("🔍 === FIN DIAGNÓSTICO ===");
}

async function diagnosticarEntradas(codigoProducto = null) {
    console.log("🔍 === DIAGNÓSTICO DE ENTRADAS ===");

    try {
        // Verificar base de datos de entradas
        const { dbEntradas } = await import('../db/db-operations.js');
        console.log("📊 Base de datos de entradas:", dbEntradas ? "✅ Disponible" : "❌ No disponible");

        if (!dbEntradas) return;

        // Contar total de registros de entradas
        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");

        const totalEntradas = await new Promise((resolve) => {
            const request = objectStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
        console.log("📈 Total de entradas registradas:", totalEntradas);

        // Si se especifica un código, buscar entradas para ese código
        if (codigoProducto) {
            console.log(`🔍 Buscando entradas para código: ${codigoProducto}`);
            const entradasProducto = await new Promise((resolve) => {
                const request = objectStore.getAll();
                request.onsuccess = () => {
                    const entradas = request.result || [];
                    return resolve(entradas.filter(e => e.codigo === codigoProducto));
                };
                request.onerror = () => resolve([]);
            });

            console.log(`📋 Entradas encontradas para ${codigoProducto}:`, entradasProducto);

            const cantidadTotalEntrada = entradasProducto.reduce((suma, entrada) => suma + (entrada.cantidad || 0), 0);
            console.log(`📊 Cantidad total de entrada para ${codigoProducto}: ${cantidadTotalEntrada}`);
        } else {
            // Mostrar algunas entradas de ejemplo
            const algunasEntradas = await new Promise((resolve) => {
                const request = objectStore.getAll();
                request.onsuccess = () => resolve((request.result || []).slice(0, 5));
                request.onerror = () => resolve([]);
            });
            console.log("📋 Primeras 5 entradas registradas:", algunasEntradas);
        }

    } catch (error) {
        console.error("❌ Error en diagnóstico de entradas:", error);
    }

    console.log("🔍 === FIN DIAGNÓSTICO ENTRADAS ===");
}
