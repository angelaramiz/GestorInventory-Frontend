// Operaciones específicas para el registro de entradas
import { agregarRegistroEntrada, cargarEntradasEnTabla, sincronizarEntradasDesdeSupabase, eliminarRegistroEntrada, generarReporteEntradas, inicializarDBEntradas, procesarColaSincronizacionEntradas } from '../db/db-operations.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from '../utils/logs.js';
import { db } from '../db/db-operations.js';
import { buscarPorCodigoParcial } from './product-operations.js';

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
                    const index = objectStore.index("codigo");
                    request = index.get(termino);
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

    // Limpiar campos de entrada específicos
    const camposEntrada = ['cantidadEntrada', 'fechaEntrada', 'comentariosEntrada'];
    camposEntrada.forEach(campoId => {
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
            mostrarAlertaBurbuja("Primero debe buscar y seleccionar un producto", "warning");
            return false;
        }

        // Obtener datos del formulario
        const cantidad = document.getElementById('cantidadEntrada')?.value?.trim();
        const fechaEntrada = document.getElementById('fechaEntrada')?.value;
        const comentarios = document.getElementById('comentariosEntrada')?.value?.trim() || '';

        // Validaciones
        if (!cantidad || isNaN(cantidad) || parseFloat(cantidad) <= 0) {
            mostrarAlertaBurbuja("Ingrese una cantidad válida", "error");
            return false;
        }

        if (!fechaEntrada) {
            mostrarAlertaBurbuja("Seleccione una fecha de entrada", "error");
            return false;
        }

        // Preparar datos de la entrada
        const entradaData = {
            codigo: productoSeleccionadoEntrada.codigo,
            nombre: productoSeleccionadoEntrada.nombre,
            marca: productoSeleccionadoEntrada.marca,
            categoria: productoSeleccionadoEntrada.categoria,
            unidad: productoSeleccionadoEntrada.unidad,
            cantidad: parseFloat(cantidad),
            fecha_entrada: fechaEntrada,
            comentarios: comentarios,
            producto_id: productoSeleccionadoEntrada.id || null
        };

        // Registrar la entrada
        const entradaRegistrada = await agregarRegistroEntrada(entradaData);

        if (entradaRegistrada) {
            mostrarAlertaBurbuja("Entrada registrada correctamente", "success");
            limpiarFormularioEntrada();

            // Recargar tabla de entradas si existe
            await actualizarTablaEntradas();

            return true;
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
        const entradas = await cargarEntradasEnTabla(filtros);
        const tbody = document.getElementById('tablaEntradasBody');

        if (!tbody) {
            console.warn("No se encontró el elemento tablaEntradasBody");
            return;
        }

        tbody.innerHTML = '';

        if (entradas.length === 0) {
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

        // Primero sincronizar desde Supabase a local (obtener cambios remotos)
        console.log("⬇️ Sincronizando desde Supabase a local...");
        await sincronizarEntradasDesdeSupabase();

        // Luego procesar la cola local a Supabase (enviar cambios locales)
        console.log("⬆️ Procesando cola local a Supabase...");
        await procesarColaSincronizacionEntradas();

        // Verificar estado de la cola después de sincronizar
        const colaDespues = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');
        console.log(`📋 Cola de sincronización después: ${colaDespues.length} elementos`);

        await actualizarTablaEntradas();
        mostrarAlertaBurbuja("Entradas sincronizadas correctamente", "success");
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

        await generarReporteEntradas(filtros);
    } catch (error) {
        console.error("Error al generar reporte:", error);
        mostrarAlertaBurbuja("Error al generar reporte", "error");
    }
}

// Función para inicializar la página de registro de entradas
export async function inicializarRegistroEntradas() {
    try {
        // Inicializar base de datos de entradas
        await inicializarDBEntradas();

        // Cargar entradas en la tabla
        await actualizarTablaEntradas();

        // Configurar event listeners
        configurarEventListeners();

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

    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', sincronizarEntradas);
    }

    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', generarReporte);
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
        mostrarAlertaBurbuja(`Ingrese un ${tipoDisplay} para buscar`, "warning");
        return;
    }

    try {
        const tipoBusqueda = tipo === 'codigoCorto' ? 'codigo' : tipo;
        const producto = await buscarProductoParaEntrada(termino, tipoBusqueda);
        mostrarDatosProductoEntrada(producto);
    } catch (error) {
        console.error(`Error al buscar producto por ${tipo}:`, error);
        mostrarAlertaBurbuja("Error al buscar producto", "error");
    }
}
