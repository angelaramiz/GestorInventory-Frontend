// products.js
// Funciones relacionadas con productos

import { db, inicializarDB } from './db-init.js';
import { getSupabase } from '../auth/auth.js';
import { mostrarAlertaBurbuja, mostrarMensaje } from '../utils/logs.js';
import { BASE_URL } from '../core/configuraciones.js';

// En js/db-operations.js
// Versión corregida:
export async function sincronizarProductosDesdeBackend() {
    try {
        const usuarioId = localStorage.getItem('usuario_id');
        const categoriaId = localStorage.getItem('categoria_id');
        if (!usuarioId || !categoriaId) {
            console.error("Usuario o categoría no identificados");
            return;
        }
        const response = await fetch(`${BASE_URL}/productos/sincronizar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${localStorage.getItem('supabase.auth.token')}`
            },
            credentials: 'include',
            body: JSON.stringify({ usuarioId, categoriaId }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const transaction = db.transaction(["productos"], "readwrite");
        const store = transaction.objectStore("productos");

        await Promise.all(data.productos.map(async (producto) => {
            await new Promise((resolve, reject) => {
                const request = store.put(producto);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }));

        mostrarAlertaBurbuja("Sincronización exitosa", "success");

    } catch (error) {
        console.error("Error de sincronización:", error);
        mostrarAlertaBurbuja(`Falló: ${error.message}`, "error");
    }
}

// Call the function after initializing the database if on archivos.html
if (window.location.pathname.includes('main.html')) {
    inicializarDB().then(() => {
        sincronizarProductosDesdeBackend();
    });
}

if (window.location.pathname.includes('archivos.html')) {
    cargarDatosEnTabla(); // Llamar a cargarDatosEnTabla después de la sincronización
}

// Llamar a sincronizarDatos cuando se cargue la página
export async function subirProductosAlBackend() {
    try {
        // Verificar autenticación
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            throw new Error("Usuario no autenticado");
        }

        // Obtener el ID del usuario autenticado
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            throw new Error("ID de usuario no encontrado");
        }

        // Obtener todos los productos de IndexedDB
        const productos = await new Promise((resolve, reject) => {
            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Verificar si hay productos para subir
        if (!productos || productos.length === 0) {
            mostrarAlertaBurbuja("No hay productos para subir", "info");
            return false;
        }

        // Enviar productos al backend
        const response = await fetch(`${BASE_URL}/productos/actualizar-usuario-productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                productos: productos,
            })
        });

        // Manejar errores HTTP
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Mostrar resultado al usuario
        mostrarAlertaBurbuja("✅ Productos subidos exitosamente", "success");
        return true;

    } catch (error) {
        console.error("Error subiendo productos:", error);
        mostrarAlertaBurbuja(`🚨 Error: ${error.message || "Verifica tu conexión"}`, "error");
        return false;
    }
}

// Variables para el ordenamiento y paginación de productos
let productosCompletos = [];
let paginaActualProductos = 1;
let itemsPorPaginaProductos = 25;
let ordenColumnaProductos = { columna: 'nombre', ascendente: true };

// Función para cargar datos en la tabla de la página de archivos
export async function cargarDatosEnTabla() {
    const tbody = document.getElementById("databaseBody");
    if (!tbody) {
        console.error("Elemento 'databaseBody' no encontrado.");
        return;
    }

    try {
        // Get Supabase instance
        const supabase = await getSupabase();
        if (!supabase) {
            mostrarAlertaBurbuja("Error de conexión con Supabase", "error");
            return;
        }

        // Get user's category ID for filtering products
        const categoriaId = localStorage.getItem('categoria_id');
        if (!categoriaId) {
            mostrarAlertaBurbuja("Categoría no encontrada", "error");
            return;
        }

        // Query products from Supabase
        const { data: productos, error } = await supabase
            .from('productos')
            .select('*')
            .eq('categoria_id', categoriaId);

        if (error) {
            console.error("Error al cargar productos desde Supabase:", error);
            mostrarMensaje("Error al cargar datos desde Supabase", "error");

            // Fallback to IndexedDB if Supabase fails
            if (db) {
                const transaction = db.transaction(["productos"], "readonly");
                const objectStore = transaction.objectStore("productos");
                const request = objectStore.getAll();

                request.onsuccess = function (event) {
                    productosCompletos = event.target.result;
                    ordenarDatosProductos();
                    mostrarPaginaProductos();
                    crearControlesPaginacionProductos();
                    agregarOrdenamientoAColumnasProductos();
                };

                request.onerror = function (event) {
                    console.error("Error al cargar datos desde IndexedDB:", event.target.error);
                    mostrarMensaje("Error al cargar los datos", "error");
                };
            }
            return;
        }

        // Guardar todos los productos en variable global para paginación y ordenamiento
        productosCompletos = productos;

        // Aplicar ordenamiento inicial
        ordenarDatosProductos();

        // Mostrar la primera página
        mostrarPaginaProductos();

        // Crear controles de paginación
        crearControlesPaginacionProductos();

        mostrarAlertaBurbuja("Productos cargados desde Supabase", "success");
    } catch (error) {
        console.error("Error al cargar datos desde Supabase:", error);
        mostrarMensaje("Error al cargar datos desde Supabase", "error");

        // Fallback to IndexedDB if Supabase fails
        if (db) {
            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.getAll();

            request.onsuccess = function (event) {
                productosCompletos = event.target.result;
                ordenarDatosProductos();
                mostrarPaginaProductos();
                crearControlesPaginacionProductos();
                agregarOrdenamientoAColumnasProductos();
            };

            request.onerror = function (event) {
                console.error("Error al cargar datos desde IndexedDB:", event.target.error);
                mostrarMensaje("Error al cargar los datos", "error");
            };
        }
    }
}

// Función para ordenar los datos de productos según la columna seleccionada
function ordenarDatosProductos() {
    const { columna, ascendente } = ordenColumnaProductos;

    productosCompletos.sort((a, b) => {
        let valorA = a[columna] ? a[columna].toString().toLowerCase() : '';
        let valorB = b[columna] ? b[columna].toString().toLowerCase() : '';

        // Ordenar ascendente o descendente
        if (ascendente) {
            return valorA.localeCompare(valorB);
        } else {
            return valorB.localeCompare(valorA);
        }
    });
}

// Función para mostrar la página actual de productos
function mostrarPaginaProductos() {
    const tbody = document.getElementById("databaseBody");
    if (!tbody) return;

    tbody.innerHTML = ""; // Limpiar tabla

    // Calcular índices para la paginación
    const inicio = (paginaActualProductos - 1) * itemsPorPaginaProductos;
    const fin = Math.min(inicio + itemsPorPaginaProductos, productosCompletos.length);

    // Mostrar solo los elementos de la página actual
    for (let i = inicio; i < fin; i++) {
        const producto = productosCompletos[i];
        const row = tbody.insertRow();

        // Añadir los datos a las celdas
        row.insertCell().textContent = producto.codigo;
        row.insertCell().textContent = producto.nombre;
        row.insertCell().textContent = producto.categoria;
        row.insertCell().textContent = producto.marca;
        row.insertCell().textContent = producto.unidad;
    }

    // Actualizar información de la paginación
    actualizarInfoPaginacionProductos();
}

// Crear controles de paginación para productos
function crearControlesPaginacionProductos() {
    // Verificar si ya existe el contenedor de paginación
    let paginacion = document.getElementById('paginacionProductos');
    if (!paginacion) {
        // Obtener el contenedor de la tabla
        const tablaContainer = document.querySelector('#databaseBody').closest('table').parentElement;

        // Crear el contenedor de la paginación
        paginacion = document.createElement('div');
        paginacion.id = 'paginacionProductos';
        paginacion.className = 'flex justify-between items-center mt-4 px-4 py-2 bg-white rounded shadow';

        // Crear el contenedor de información
        const infoPaginacion = document.createElement('div');
        infoPaginacion.id = 'infoPaginacionProductos';
        infoPaginacion.className = 'text-sm text-gray-600';

        // Crear controles de navegación
        const controles = document.createElement('div');
        controles.className = 'flex space-x-2';

        // Botón anterior
        const btnAnterior = document.createElement('button');
        btnAnterior.textContent = 'Anterior';
        btnAnterior.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
        btnAnterior.onclick = () => cambiarPaginaProductos(paginaActualProductos - 1);

        // Botón siguiente
        const btnSiguiente = document.createElement('button');
        btnSiguiente.textContent = 'Siguiente';
        btnSiguiente.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
        btnSiguiente.onclick = () => cambiarPaginaProductos(paginaActualProductos + 1);

        // Añadir elementos al DOM
        controles.appendChild(btnAnterior);
        controles.appendChild(btnSiguiente);
        paginacion.appendChild(infoPaginacion);
        paginacion.appendChild(controles);

        // Añadir después de la tabla
        tablaContainer.after(paginacion);

        // Añadir funcionalidad de ordenamiento a los encabezados de columna
        agregarOrdenamientoAColumnasProductos();
    }

    actualizarInfoPaginacionProductos();
}

// Función para cambiar la página actual de productos
function cambiarPaginaProductos(nuevaPagina) {
    const totalPaginas = Math.ceil(productosCompletos.length / itemsPorPaginaProductos);

    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActualProductos = nuevaPagina;
        mostrarPaginaProductos();
    }
}

// Actualizar información de paginación de productos
function actualizarInfoPaginacionProductos() {
    const infoPaginacion = document.getElementById('infoPaginacionProductos');
    if (!infoPaginacion) return;

    const totalPaginas = Math.ceil(productosCompletos.length / itemsPorPaginaProductos);
    const inicio = (paginaActualProductos - 1) * itemsPorPaginaProductos + 1;
    const fin = Math.min(inicio + itemsPorPaginaProductos - 1, productosCompletos.length);

    infoPaginacion.textContent = `Mostrando ${inicio}-${fin} de ${productosCompletos.length} productos (Página ${paginaActualProductos} de ${totalPaginas})`;

    // Habilitar/deshabilitar botones según sea necesario
    const btnAnterior = infoPaginacion.nextElementSibling.firstChild;
    const btnSiguiente = infoPaginacion.nextElementSibling.lastChild;

    btnAnterior.disabled = paginaActualProductos <= 1;
    btnSiguiente.disabled = paginaActualProductos >= totalPaginas;

    btnAnterior.classList.toggle('opacity-50', paginaActualProductos <= 1);
    btnSiguiente.classList.toggle('opacity-50', paginaActualProductos >= totalPaginas);
}

// Agregar funcionalidad de ordenamiento a las columnas de la tabla de productos
function agregarOrdenamientoAColumnasProductos() {
    const tabla = document.querySelector('#databaseBody').closest('table');
    if (!tabla) return;

    const headerRow = tabla.querySelector('thead tr');
    if (!headerRow) return;

    const headers = headerRow.querySelectorAll('th');
    const columnas = ['codigo', 'nombre', 'categoria', 'marca', 'unidad'];

    headers.forEach((header, index) => {
        if (index < columnas.length) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const columna = columnas[index];
                if (ordenColumnaProductos.columna === columna) {
                    ordenColumnaProductos.ascendente = !ordenColumnaProductos.ascendente;
                } else {
                    ordenColumnaProductos.columna = columna;
                    ordenColumnaProductos.ascendente = true;
                }
                ordenarDatosProductos();
                mostrarPaginaProductos();
            });

            // Añadir indicador visual de ordenamiento
            header.innerHTML += ` <span id="sort-${columna}">↕</span>`;
        }
    });
}

// funcion para cargar  datos de la base de datos
export function cargarCSV(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) { // Usar async aquí
        const csv = e.target.result;
        const lines = csv.split("\n");
        const headers = lines[0].split(",").map(header => header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")); // Validar contra: ["codigo", "nombre", "categoria", "marca", "unidad"]

        // Validación del CSV
        if (
            headers.length !== 5 ||
            !headers.includes("codigo") ||
            !headers.includes("nombre") ||
            !headers.includes("categoria") ||
            !headers.includes("marca") ||
            !headers.includes("unidad")
        ) {
            mostrarMensaje("El archivo CSV no tiene el formato correcto. Debe contener las columnas: código, nombre, categoría, marca, unidad", "error");
            return;
        }

        // Iniciar transacción
        const transaction = db.transaction(["productos"], "readwrite");
        const objectStore = transaction.objectStore("productos");

        let successCount = 0;
        let errorCount = 0;

        // Convertir a un array de promesas
        const operaciones = [];

        // Recorrer cada línea (omite la cabecera)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Saltar líneas vacías

            const values = line.split(",").map(value => value.trim());
            if (values.length !== 5) {
                console.warn(`Línea ${i + 1} tiene ${values.length} valores, se esperaba 5`);
                errorCount++;
                continue;
            }

            const producto = {
                codigo: values[0],
                nombre: values[1],
                categoria: values[2],
                marca: values[3],
                unidad: values[4],
                last_modified: new Date().toISOString()
            };

            // Crear una promesa para cada operación
            const promesa = new Promise((resolve, reject) => {
                const request = objectStore.put(producto);
                request.onsuccess = function () {
                    successCount++;
                    resolve();
                };
                request.onerror = function (event) {
                    console.error("Error al agregar producto:", event.target.error);
                    errorCount++;
                    reject(event.target.error);
                };
            });

            operaciones.push(promesa);
        }

        try {
            await Promise.all(operaciones);
            mostrarMensaje(`CSV cargado exitosamente. ${successCount} productos agregados, ${errorCount} errores.`, successCount > 0 ? "success" : "warning");
        } catch (error) {
            console.error("Error procesando el CSV:", error);
            mostrarMensaje("Error al procesar el archivo CSV", "error");
        }
    };

    reader.onerror = function () {
        mostrarMensaje("Error al leer el archivo CSV", "error");
    };

    reader.readAsText(file);
}

// Modificar la función descargarCSV para que retorne una promesa
export function descargarCSV() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const productos = event.target.result;
            let csv = "Código,Nombre,Categoría,Marca,Unidad\n";
            productos.forEach(producto => {
                csv += `"${producto.codigo}","${producto.nombre}","${producto.categoria}","${producto.marca}","${producto.unidad}"\n`;
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
                const nombreArchivo = `productos_${fecha}.csv`;

                link.setAttribute("href", url);
                link.setAttribute("download", nombreArchivo);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                mostrarMensaje("Archivo CSV descargado correctamente", "success");
                resolve();
            } else {
                mostrarMensaje("Tu navegador no soporta la descarga de archivos", "error");
                reject(new Error("Descarga no soportada"));
            }
        };

        request.onerror = error => {
            console.error("Error al obtener los productos:", error);
            mostrarMensaje("Error al descargar el CSV", "error");
            reject(error);
        };
    });
}