// inventory.js
// Funciones relacionadas con inventario

import { dbInventario } from './db-init.js';
import { agregarAColaSincronizacion } from './sync-queue.js';
import { mostrarAlertaBurbuja } from '../utils/logs.js';
import { mostrarMensaje } from '../utils/logs.js';
import { getSupabase } from '../auth/auth.js';

// Variables para el ordenamiento y paginación del inventario
let inventarioCompleto = [];
let paginaActualInventario = 1;
let itemsPorPaginaInventario = 25;
let ordenColumnaInventario = { columna: 'nombre', ascendente: true };

//  Función para cargar datos en la tabla de la página de archivos
export function cargarDatosInventarioEnTablaPlantilla() {
    if (!window.location.pathname.includes('inventario.html')) {
        return;
    }

    const tbody = document.getElementById("estructuraPlantillaBody");
    if (!tbody) {
        console.error("Elemento 'estructuraPlantillaBody' no encontrado.");
        return;
    }

    if (!dbInventario) {
        console.error("Base de datos de inventario no inicializada.");
        return;
    }

    const transaction = dbInventario.transaction(["inventario"], "readonly");
    const objectStore = transaction.objectStore("inventario");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        // Guardar los datos completos
        inventarioCompleto = event.target.result;

        // Aplicar ordenamiento
        ordenarDatosInventario();

        // Mostrar la página actual
        mostrarPaginaInventario();

        // Crear controles de paginación si no existen
        crearControlesPaginacionInventario();
    };

    request.onerror = function (event) {
        console.error(
            "Error al cargar datos de inventario en la tabla:",
            event.target.error
        );
        mostrarMensaje("Error al cargar los datos del inventario", "error");
    };
}

// Función para ordenar los datos de inventario según la columna seleccionada
function ordenarDatosInventario() {
    const { columna, ascendente } = ordenColumnaInventario;

    inventarioCompleto.sort((a, b) => {
        let valorA, valorB;

        // Determinar valores a comparar según el tipo de columna
        switch (columna) {
            case 'codigo':
            case 'nombre':
            case 'categoria':
            case 'marca':
            case 'unidad':
            case 'comentarios':
            case 'areaName':
                valorA = a[columna] ? a[columna].toString().toLowerCase() : '';
                valorB = b[columna] ? b[columna].toString().toLowerCase() : '';
                break;
            case 'cantidad':
                valorA = parseFloat(a[columna]) || 0;
                valorB = parseFloat(b[columna]) || 0;
                break;
            case 'caducidad':
                valorA = new Date(a[columna] || '9999-12-31');
                valorB = new Date(b[columna] || '9999-12-31');
                break;
            default:
                valorA = a[columna] ? a[columna].toString().toLowerCase() : '';
                valorB = b[columna] ? b[columna].toString().toLowerCase() : '';
        }

        // Ordenar ascendente o descendente
        if (ascendente) {
            if (typeof valorA === 'string') {
                return valorA.localeCompare(valorB);
            } else {
                return valorA - valorB;
            }
        } else {
            if (typeof valorA === 'string') {
                return valorB.localeCompare(valorA);
            } else {
                return valorB - valorA;
            }
        }
    });
}

// Función para mostrar la página actual del inventario
function mostrarPaginaInventario() {
    const tbody = document.getElementById("estructuraPlantillaBody");
    if (!tbody) return;

    tbody.innerHTML = ""; // Limpiar tabla

    // Calcular índices para la paginación
    const inicio = (paginaActualInventario - 1) * itemsPorPaginaInventario;
    const fin = Math.min(inicio + itemsPorPaginaInventario, inventarioCompleto.length);

    // Mostrar solo los elementos de la página actual
    for (let i = inicio; i < fin; i++) {
        const item = inventarioCompleto[i];
        const row = tbody.insertRow();

        // Añadir los datos a las celdas
        row.insertCell().textContent = item.codigo;
        row.insertCell().textContent = item.nombre;
        row.insertCell().textContent = item.categoria;
        row.insertCell().textContent = item.marca;
        row.insertCell().textContent = item.unidad;
        row.insertCell().textContent = item.cantidad;
        row.insertCell().textContent = item.caducidad;
        row.insertCell().textContent = item.comentarios;
        row.insertCell().textContent = item.areaName;
    }

    // Actualizar información de la paginación
    actualizarInfoPaginacionInventario();
}

// Crear controles de paginación para el inventario
function crearControlesPaginacionInventario() {
    // Verificar si ya existe el contenedor de paginación
    let paginacion = document.getElementById('paginacionInventario');
    if (!paginacion) {
        // Obtener el contenedor de la tabla
        const tablaContainer = document.getElementById('estructura-plantilla').parentElement;

        // Crear el contenedor de la paginación
        paginacion = document.createElement('div');
        paginacion.id = 'paginacionInventario';
        paginacion.className = 'flex justify-between items-center mt-4 px-4 py-2 bg-white rounded shadow';

        // Crear el contenedor de información
        const infoPaginacion = document.createElement('div');
        infoPaginacion.id = 'infoPaginacionInventario';
        infoPaginacion.className = 'text-sm text-gray-600';

        // Crear controles de navegación
        const controles = document.createElement('div');
        controles.className = 'flex space-x-2';

        // Botón anterior
        const btnAnterior = document.createElement('button');
        btnAnterior.textContent = 'Anterior';
        btnAnterior.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
        btnAnterior.onclick = () => cambiarPaginaInventario(paginaActualInventario - 1);

        // Botón siguiente
        const btnSiguiente = document.createElement('button');
        btnSiguiente.textContent = 'Siguiente';
        btnSiguiente.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
        btnSiguiente.onclick = () => cambiarPaginaInventario(paginaActualInventario + 1);

        // Añadir elementos al DOM
        controles.appendChild(btnAnterior);
        controles.appendChild(btnSiguiente);
        paginacion.appendChild(infoPaginacion);
        paginacion.appendChild(controles);

        // Añadir después de la tabla
        tablaContainer.after(paginacion);

        // Añadir funcionalidad de ordenamiento a los encabezados de columna
        agregarOrdenamientoAColumnas();
    }

    actualizarInfoPaginacionInventario();
}

// Función para cambiar la página actual del inventario
function cambiarPaginaInventario(nuevaPagina) {
    const totalPaginas = Math.ceil(inventarioCompleto.length / itemsPorPaginaInventario);

    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActualInventario = nuevaPagina;
        mostrarPaginaInventario();
    }
}

// Actualizar información de paginación del inventario
function actualizarInfoPaginacionInventario() {
    const infoPaginacion = document.getElementById('infoPaginacionInventario');
    if (!infoPaginacion) return;

    const totalPaginas = Math.ceil(inventarioCompleto.length / itemsPorPaginaInventario);
    const inicio = (paginaActualInventario - 1) * itemsPorPaginaInventario + 1;
    const fin = Math.min(inicio + itemsPorPaginaInventario - 1, inventarioCompleto.length);

    infoPaginacion.textContent = `Mostrando ${inicio}-${fin} de ${inventarioCompleto.length} productos (Página ${paginaActualInventario} de ${totalPaginas})`;

    // Habilitar/deshabilitar botones según sea necesario
    const btnAnterior = infoPaginacion.nextElementSibling.firstChild;
    const btnSiguiente = infoPaginacion.nextElementSibling.lastChild;

    btnAnterior.disabled = paginaActualInventario <= 1;
    btnSiguiente.disabled = paginaActualInventario >= totalPaginas;

    btnAnterior.classList.toggle('opacity-50', paginaActualInventario <= 1);
    btnSiguiente.classList.toggle('opacity-50', paginaActualInventario >= totalPaginas);
}

// Agregar funcionalidad de ordenamiento a las columnas de la tabla de inventario
function agregarOrdenamientoAColumnas() {
    const headerRow = document.querySelector('#estructura-plantilla thead tr');
    if (!headerRow) return;

    const headers = headerRow.querySelectorAll('th');
    const columnas = ['codigo', 'nombre', 'categoria', 'marca', 'unidad', 'cantidad', 'caducidad', 'comentarios', 'areaName'];

    headers.forEach((header, index) => {
        if (index < columnas.length) {
            const columna = columnas[index];
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                if (ordenColumnaInventario.columna === columna) {
                    ordenColumnaInventario.ascendente = !ordenColumnaInventario.ascendente;
                } else {
                    ordenColumnaInventario.columna = columna;
                    ordenColumnaInventario.ascendente = true;
                }
                ordenarDatosInventario();
                mostrarPaginaInventario();
            });

            // Añadir indicador visual de ordenamiento
            header.innerHTML += ` <span id="sort-${columna}">↕</span>`;
        }
    });
}

export function descargarInventarioCSV() {
    const transaction = dbInventario.transaction(["inventario"], "readonly");
    const objectStore = transaction.objectStore("inventario");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const inventario = event.target.result;
        let csv =
            "Código,Nombre,Categoría,Marca,Lote,Tipo de Cantidad,Cantidad,Fecha de Caducidad,Comentarios\n";
        inventario.forEach(item => {
            csv += `"${item.codigo}","${item.nombre}","${item.categoria}","${item.marca}","${item.lote || ''}","${item.tipoCantidad || ''}","${item.cantidad}","${item.caducidad}","${item.comentarios || ''}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const fechaActual = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
            const nombreArchivo = `inventario_${fechaActual}.csv`;

            link.setAttribute("href", url);
            link.setAttribute("download", nombreArchivo);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            mostrarMensaje("Archivo CSV de inventario descargado correctamente", "success");
        } else {
            mostrarMensaje("Tu navegador no soporta la descarga de archivos", "error");
        }
    };
}

export function descargarInventarioPDF() {
    Swal.fire({
        title: 'Opciones de Generación de PDF',
        html: `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Ordenar por:</label>
                <select id="swal-orden" class="swal2-input">
                    <option value="caducidad">Fecha de caducidad (próximos a caducar primero)</option>
                    <option value="nombre">Nombre del producto</option>
                    <option value="categoria">Categoría</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Filtrar por caducidad:</label>
                <select id="swal-filtro-caducidad" class="swal2-input">
                    <option value="todos">Mostrar todos</option>
                    <option value="proximos">Próximos a caducar (30 días)</option>
                    <option value="mes">Por mes específico</option>
                </select>
            </div>
            <div id="mes-especifico" style="display: none;">
                <label class="block text-sm font-medium text-gray-700">Seleccionar mes:</label>
                <input type="month" id="swal-mes" class="swal2-input" value="${new Date().toISOString().slice(0, 7)}">
            </div>
        `,
        didOpen: () => {
            const filtroSelect = document.getElementById('swal-filtro-caducidad');
            const mesDiv = document.getElementById('mes-especifico');

            filtroSelect.addEventListener('change', (e) => {
                if (e.target.value === 'mes') {
                    mesDiv.style.display = 'block';
                } else {
                    mesDiv.style.display = 'none';
                }
            });
        },
        showCancelButton: true,
        confirmButtonText: 'Generar PDF',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => {
            return {
                orden: document.getElementById('swal-orden').value,
                filtroCaducidad: document.getElementById('swal-filtro-caducidad').value,
                mesEspecifico: document.getElementById('swal-mes').value
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            generarPDFConOpciones(result.value);
        }
    });
}

function generarPDFConOpciones(opciones) {
    const transaction = dbInventario.transaction(["inventario"], "readonly");
    const objectStore = transaction.objectStore("inventario");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        let inventario = event.target.result;

        // Aplicar filtros según las opciones seleccionadas
        inventario = filtrarInventario(inventario, opciones);

        // Ordenar según la opción seleccionada
        inventario = ordenarInventario(inventario, opciones.orden);

        // Generar el PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurar el título y la fecha del reporte
        doc.setFontSize(16);
        doc.text("Reporte de Inventario", 10, 10);
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 10, 20);

        // Agregar información del filtro aplicado
        let filtroTexto = "Filtro aplicado: ";
        switch (opciones.filtroCaducidad) {
            case 'proximos':
                filtroTexto += "Productos próximos a caducar (30 días)";
                break;
            case 'mes':
                filtroTexto += `Productos que caducan en ${opciones.mesEspecifico}`;
                break;
            default:
                filtroTexto += "Todos los productos";
        }
        doc.text(filtroTexto, 10, 30);

        // Agregar los productos al PDF
        let yPos = 40;
        inventario.forEach(item => {
            if (yPos > 270) { // Nueva página si es necesario
                doc.addPage();
                yPos = 10;
            }
            doc.setFontSize(8);
            doc.text(`${item.nombre} - ${item.categoria} - Cant: ${item.cantidad} - Cad: ${item.caducidad}`, 10, yPos);
            yPos += 5;
        });

        // Obtener la fecha actual para el nombre del archivo
        const fechaActual = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
        const nombreArchivo = `reporte de inventario de ${fechaActual}.pdf`;

        // Guardar el archivo PDF con el nombre ajustado
        doc.save(nombreArchivo);
    };

    request.onerror = function (error) {
        console.error("Error al obtener los datos del inventario:", error);
        Swal.fire({
            title: "Error",
            text: "No se pudo generar el PDF",
            icon: "error",
            timer: 2000,
            showConfirmButton: false
        });
    };
}

function filtrarInventario(inventario, opciones) {
    return inventario.filter(item => {
        const caducidad = new Date(item.caducidad);
        const hoy = new Date();

        switch (opciones.filtroCaducidad) {
            case 'proximos':
                const treintaDias = new Date();
                treintaDias.setDate(hoy.getDate() + 30);
                return caducidad <= treintaDias;
            case 'mes':
                const mesSeleccionado = new Date(opciones.mesEspecifico);
                const siguienteMes = new Date(mesSeleccionado);
                siguienteMes.setMonth(siguienteMes.getMonth() + 1);
                return caducidad >= mesSeleccionado && caducidad < siguienteMes;
            default:
                return true;
        }
    });
}

function ordenarInventario(inventario, orden) {
    return inventario.sort((a, b) => {
        switch (orden) {
            case 'caducidad':
                return new Date(a.caducidad) - new Date(b.caducidad);
            case 'nombre':
                return a.nombre.localeCompare(b.nombre);
            case 'categoria':
                return a.categoria.localeCompare(b.categoria);
            default:
                return 0;
        }
    });
}

// Función para sincronizar inventario desde Supabase
export async function sincronizarInventarioDesdeSupabase(ubicacionNombre = null, forzarAreaId = null) {
    try {
        mostrarAlertaBurbuja("Sincronizando inventario...", "info");
        console.log("Iniciando sincronización de inventario desde Supabase");

        // Obtener instancia de Supabase
        const supabase = await getSupabase();
        if (!supabase) {
            mostrarAlertaBurbuja("Error de conexión con Supabase", "error");
            return 0;
        }

        // Obtener el ID del área actual (usar el forzado si existe, de lo contrario usar el de localStorage)
        const areaId = forzarAreaId || localStorage.getItem('area_id');
        if (!areaId) {
            mostrarAlertaBurbuja("Área no especificada para sincronización", "error");
            return 0;
        }

        // Guardar nombre de ubicación si se proporciona
        if (ubicacionNombre) {
            localStorage.setItem('ubicacion_almacen', ubicacionNombre);
        }

        // IMPORTANTE: Consultar SOLO los productos que pertenecen a esta área específica
        console.log(`Consultando inventario específico del área ID: ${areaId}`);
        const { data: inventario, error } = await supabase
            .from('inventario')
            .select('*')
            .eq('area_id', areaId);

        if (error) {
            console.error("Error al consultar inventario:", error);
            mostrarAlertaBurbuja("Error al consultar inventario desde servidor", "error");
            return 0;
        }

        console.log(`Encontrados ${inventario ? inventario.length : 0} elementos en Supabase para área ID ${areaId}`);

        // Actualizar la base de datos local (primero borrar todo)
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");

        // Primero limpiar TODA la base de datos local
        await new Promise((resolve, reject) => {
            const clearRequest = objectStore.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });

        // Si no hay elementos para mostrar, actualizar la tabla y terminar
        if (!inventario || inventario.length === 0) {
            if (window.location.pathname.includes('inventario.html')) {
                cargarDatosInventarioEnTablaPlantilla();
            }
            mostrarAlertaBurbuja("No hay elementos en el inventario para esta área", "info");
            return 0;
        }

        // Añadir los productos del inventario con el nombre del área
        const nombreArea = localStorage.getItem('ubicacion_almacen') || ubicacionNombre || "Área desconocida";
        console.log(`Agregando ${inventario.length} elementos a la base de datos local con ubicación: ${nombreArea}`);

        let contadorExito = 0;
        let errores = [];

        // Agregar cada ítem a IndexedDB con manejo de errores mejorado
        // IMPORTANTE: Solo agregamos los que coinciden con el área seleccionada
        for (const item of inventario) {
            try {
                const itemConArea = {
                    ...item,
                    areaName: nombreArea
                };

                await new Promise((resolve, reject) => {
                    const addRequest = objectStore.add(itemConArea);
                    addRequest.onsuccess = () => {
                        contadorExito++;
                        resolve();
                    };
                    addRequest.onerror = (event) => {
                        errores.push(`Error agregando ${item.nombre}: ${event.target.error}`);
                        reject(event.target.error);
                    };
                });
            } catch (error) {
                console.error("Error procesando ítem:", item, error);
                errores.push(`Error procesando ${item.nombre}: ${error.message}`);
            }
        }

        console.log(`Sincronización completada - Agregados ${contadorExito} de ${inventario.length} elementos. Errores: ${errores.length}`);

        // Actualizar la visualización si estamos en la página de inventario
        if (window.location.pathname.includes('inventario.html')) {
            cargarDatosInventarioEnTablaPlantilla();
        }

        if (errores.length > 0) {
            console.warn("Errores durante la sincronización:", errores);
            mostrarAlertaBurbuja(`Sincronización completada con ${errores.length} errores`, "warning");
        } else {
            mostrarAlertaBurbuja("Sincronización de inventario completada", "success");
        }

        return contadorExito;
    } catch (error) {
        console.error("Error al sincronizar inventario:", error);
        mostrarAlertaBurbuja("Error al sincronizar inventario: " + error.message, "error");
        return 0;
    }
}