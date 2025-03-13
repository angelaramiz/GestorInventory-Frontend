import { mostrarMensaje, mostrarResultadoCarga } from './logs.js';
import { sanitizarProducto } from './sanitizacion.js';
import { supabase } from './auth.js'; // Importar el cliente de Supabase

// variables globales
export let db;
export let dbInventario;
// Nombre y versión de la base de datos
const dbName = "ProductosDB";
const dbVersion = 1;
let syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
// 

// Nueva cola de sincronización
export function agregarAColaSincronizacion(data) {
    syncQueue.push(data);
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
    if (navigator.onLine) procesarColaSincronizacion();
}

// Llamar esto cuando se detecte conexión
export async function procesarColaSincronizacion() {
    if (!navigator.onLine) return;

    while (!supabase) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    while (syncQueue.length > 0) {
        const item = syncQueue.shift();
        try {
            const { data, error } = await supabase
                .from('inventario')
                .upsert({ ...item, usuario_id: localStorage.getItem('usuario_id') })
                .select();

            if (error) throw error;

            // Actualizar IndexedDB con el ID permanente de Supabase
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");
            await new Promise((resolve, reject) => {
                const request = objectStore.delete(item.id);
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            });
            await new Promise((resolve, reject) => {
                const request = objectStore.add({ ...item, id: data[0].id, is_temp_id: false });
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            });

            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        } catch (error) {
            console.error('Error al procesar la cola:', error);
            syncQueue.unshift(item); // Reinsertar el elemento si falla
            break;
        }
    }
}

// Escuchar eventos de conexión
window.addEventListener('online', procesarColaSincronizacion);
// Inicialización de la base de datos
export function inicializarDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = event => {
            console.error("Error al abrir la base de datos", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = event => {
            db = event.target.result;
            console.log("Base de datos abierta exitosamente");
            resolve(db);
        };

        request.onupgradeneeded = event => {
            db = event.target.result;
            const objectStore = db.createObjectStore("productos", {
                keyPath: "codigo"
            });
            objectStore.createIndex("codigo", "codigo", { unique: true });
            objectStore.createIndex("nombre", "nombre", { unique: false });
            objectStore.createIndex("categoria", "categoria", { unique: false });
            objectStore.createIndex("marca", "marca", { unique: false });
            objectStore.createIndex("unidad", "unidad", { unique: false });
            console.log("Base de datos creada/actualizada");
        };
    });
}

// Inicialización de la base de datos de inventario
export function inicializarDBInventario() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("InventarioDB", 2); // Incrementamos la versión para forzar la actualización

        request.onerror = event => {
            console.error(
                "Error al abrir la base de datos de inventario",
                event.target.error
            );
            reject(event.target.error);
        };

        request.onsuccess = event => {
            dbInventario = event.target.result;
            console.log("Base de datos de inventario abierta exitosamente");
            resolve(dbInventario);
        };

        request.onupgradeneeded = event => {
            dbInventario = event.target.result;

            // Si existe el almacén anterior, lo eliminamos
            if (dbInventario.objectStoreNames.contains("inventario")) {
                dbInventario.deleteObjectStore("inventario");
            }

            // Crear el nuevo almacén con la estructura actualizada
            const objectStore = dbInventario.createObjectStore("inventario", {
                keyPath: "id" // Cambiamos keyPath a "id" para manejar la combinación código-lote
            });

            // Crear índices
            objectStore.createIndex("id", "id", { unique: true });
            objectStore.createIndex("codigo", "codigo", { unique: false });
            objectStore.createIndex("lote", "lote", { unique: false });
            objectStore.createIndex("nombre", "nombre", { unique: false });
            objectStore.createIndex("categoria", "categoria", { unique: false });
            objectStore.createIndex("marca", "marca", { unique: false });
            objectStore.createIndex("unidad", "unidad", { unique: false });
            objectStore.createIndex("cantidad", "cantidad", { unique: false });
            objectStore.createIndex("caducidad", "caducidad", { unique: false });
            objectStore.createIndex("comentarios", "comentarios", { unique: false });

            // Crear índice compuesto para código y lote
            objectStore.createIndex("codigo_lote", ["codigo", "lote"], { unique: true });

            console.log("Base de datos de inventario creada/actualizada con nuevo esquema");
        };
    });
}

// Función para actualizar IndexedDB desde eventos en tiempo real
async function actualizarInventarioDesdeServidor(evento, payload) {
    const transaction = dbInventario.transaction(["inventario"], "readwrite");
    const objectStore = transaction.objectStore("inventario");

    if (evento === 'INSERT' || evento === 'UPDATE') {
        const data = payload.new;
        const request = objectStore.get(data.id);

        request.onsuccess = async () => {
            const localRecord = request.result;
            if (!localRecord || new Date(localRecord.last_modified) < new Date(data.last_modified)) {
                await objectStore.put({ ...data, last_modified: new Date().toISOString() });
                mostrarMensaje(`Inventario actualizado: ${data.nombre} (Lote ${data.lote})`, 'success');
                cargarDatosInventarioEnTablaPlantilla(); // Refrescar tabla si está en archivos.html
            }
        }
    } else if (evento === 'DELETE') {
        const data = payload.old;
        await objectStore.delete(data.id);
        mostrarMensaje(`Inventario eliminado: ${data.nombre} (Lote ${data.lote})`, 'info');
        cargarDatosInventarioEnTablaPlantilla();
    }
}

// Configurar suscripción a Supabase
export async function inicializarSuscripciones() {
    // Esperar a que supabase esté inicializado
    while (!supabase) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100ms y reintenta
    }

    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        console.warn('No hay usuario autenticado, suscripciones no iniciadas.');
        return;
    }

    supabase
        .channel('inventario-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'inventario', 
                filter: `usuario_id=eq.${userId}` 
            }, 
            (payload) => {
                actualizarInventarioDesdeServidor(payload.eventType, payload);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                mostrarMensaje('Conectado a actualizaciones en tiempo real', 'info');
            } else if (status === 'CLOSED') {
                mostrarMensaje('Desconectado de actualizaciones en tiempo real', 'warning');
            }
        });
}

export function resetearBaseDeDatos(database, storeName) {
    const transaction = database.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.clear();

    request.onsuccess = function (event) {
        console.log(`Base de datos de ${storeName} limpiada correctamente`);
        mostrarMensaje(
            `Base de datos de ${storeName} reseteada correctamente`,
            "success"
        );
        if (storeName === "productos") {
            cargarDatosEnTabla();
        } else {
            cargarDatosInventarioEnTablaPlantilla();
        }
    };

    request.onerror = function (event) {
        console.error(
            `Error al limpiar la base de datos de ${storeName}:`,
            event.target.error
        );
        mostrarMensaje(
            `Error al resetear la base de datos de ${storeName}`,
            "error"
        );
    };
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
            mostrarMensaje(
                "El formato del archivo CSV no es correcto. Por favor, use la plantilla proporcionada.",
                "error"
            );
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
            if (lines[i].trim() === "") continue; // Omitir líneas vacías
            const values = lines[i].split(",").map(value => value.trim()); // Limpiar espacios
            const producto = {
                codigo: values[0].trim(),
                nombre: values[1].trim(),
                categoria: values[2].trim(),
                marca: values[3].trim(),
                unidad: values[4].trim()
            };

            // Sanitizar y validar el producto
            const productoSanitizado = sanitizarProducto(producto);
            if (!productoSanitizado) {
                console.error("Producto no válido:", producto);
                errorCount++;
                continue;
            }

            // Agregar la operación de inserción como una promesa
            operaciones.push(
                new Promise((resolve, reject) => {
                    const request = objectStore.put(productoSanitizado);
                    request.onsuccess = () => {
                        successCount++;
                        resolve();
                    };
                    request.onerror = () => {
                        errorCount++;
                        reject();
                    };
                })
            );
        }

        try {
            // Esperar a que todas las operaciones se completen
            await Promise.all(operaciones);

            // Mostrar el resultado de la carga
            mostrarResultadoCarga(successCount, errorCount);

            // Actualizar la tabla después de que todas las operaciones hayan finalizado
            cargarDatosEnTabla();
        } catch (error) {
            console.error("Error en la transacción:", error);
            mostrarMensaje("Error al cargar los datos en la base de datos", "error");
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
            let csv = "\uFEFFCódigo,Nombre,Categoría,Marca,Unidad\n"; // Agregar BOM al inicio del CSV
            productos.forEach(producto => {
                csv += `${producto.codigo},${producto.nombre},${producto.categoria},${producto.marca},${producto.unidad}\n`;
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
                const nombreArchivo = `productos de ${fecha}.csv`;
                link.setAttribute("href", url);
                link.setAttribute("download", nombreArchivo);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                resolve();
            } else {
                reject(new Error("El navegador no soporta la descarga de archivos"));
            }
        };

        request.onerror = error => {
            reject(error);
        };
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
            csv += `${item.codigo},${item.nombre},${item.categoria},${item.marca},${item.lote},${item.tipoQuantidad},${item.cantidad},${item.caducidad},${item.comentarios}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
            const nombreArchivo = `reporte de inventario de ${fecha}.csv`;
            link.setAttribute("href", url);
            link.setAttribute("download", nombreArchivo);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                mesDiv.style.display = e.target.value === 'mes' ? 'block' : 'none';
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
                const fecha = new Date(opciones.mesEspecifico);
                filtroTexto += `Mes específico: ${fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
                break;
            default:
                filtroTexto += "Todos los productos";
        }
        doc.text(filtroTexto, 10, 30);

        // Agregar los productos al PDF
        let yPos = 40;
        inventario.forEach(item => {
            // Verificar si hay espacio suficiente en la página actual
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.text(`Código: ${item.codigo}`, 10, yPos);
            doc.text(`Nombre: ${item.nombre}`, 10, yPos + 5);
            doc.text(`Cantidad: ${item.cantidad} ${item.tipoQuantidad}`, 10, yPos + 10);
            doc.text(`Marca: ${item.marca}`, 10, yPos + 15);
            doc.text(`Fecha de Caducidad: ${item.caducidad}`, 10, yPos + 20);
            doc.setFontSize(10);
            doc.text(`Comentarios: ${item.comentarios || 'N/A'}`, 10, yPos + 25);

            yPos += 35;
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
                treintaDias.setDate(treintaDias.getDate() + 30);
                return caducidad <= treintaDias && caducidad >= hoy;

            case 'mes':
                const mesSeleccionado = new Date(opciones.mesEspecifico);
                return caducidad.getMonth() === mesSeleccionado.getMonth() &&
                    caducidad.getFullYear() === mesSeleccionado.getFullYear();

            default:
                return true; // Mostrar todos
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

// En js/db-operations.js
// Versión corregida:
export async function sincronizarProductosDesdeBackend() {
    try {
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            mostrarMensaje("Debes iniciar sesión para sincronizar", "error");
            return;
        }

        const response = await fetch("https://gestorinventory-backend-production.up.railway.app/productos/sincronizar", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        // Manejar errores HTTP (ej: 401, 404, 500)
        if (response.status === 401) {
            mostrarMensaje("Sesión expirada", "error");
            localStorage.clear();
            window.location.href = "../index.html";
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Verificar que data.productos sea un array
        if (!Array.isArray(data.productos)) {
            throw new Error("La respuesta del servidor no contiene un array de productos");
        }
        
        // Actualizar IndexedDB
        const transaction = db.transaction(["productos"], "readwrite");
        const store = transaction.objectStore("productos");

        // Verificar si cada producto ya existe antes de agregarlo o actualizarlo
        for (const producto of data.productos) {
            const request = store.get(producto.codigo); // Buscar el producto por su código
            request.onsuccess = (e) => {
                const productoExistente = e.target.result;
                if (!productoExistente) {
                    // Si el producto no existe, lo agregamos
                    store.add(producto);
                } else {
                    // Si el producto existe, lo actualizamos solo si es necesario
                    if (JSON.stringify(productoExistente) !== JSON.stringify(producto)) {
                        store.put(producto);
                    }
                }
            };
            request.onerror = (e) => {
                console.error("Error al buscar producto:", e.target.error);
            };
        }

        mostrarMensaje("Sincronización exitosa 🎉", "success");

        // Llamar a cargarDatosEnTabla para actualizar la tabla en la interfaz
        cargarDatosEnTabla();

        return true;

    } catch (error) {
        console.error("Error de sincronización:", error);
        mostrarMensaje(`Falló la sincronización: ${error.message}`, "error");
        return false;
    }
}

// Llamar a sincronizarDatos cuando se cargue la página
export async function subirProductosAlBackend() {
    try {
        // Verificar autenticación
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            mostrarMensaje("Debes iniciar sesión para sincronizar", "error");
            return false;
        }

        // Obtener el ID del usuario autenticado
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            mostrarMensaje("No se encontró el ID del usuario", "error");
            return false;
        }

        // Obtener todos los productos de IndexedDB
        const productos = await new Promise((resolve, reject) => {
            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Error al obtener productos locales");
        });

        // Verificar si hay productos para subir
        if (!productos || productos.length === 0) {
            mostrarMensaje("No hay productos para subir", "info");
            return false;
        }

        // Enviar productos al backend
        const response = await fetch("https://gestorinventory-backend-production.up.railway.app/productos/actualizar-usuario-productos", {
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
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Mostrar resultado al usuario
        mostrarMensaje("✅ Productos subidos exitosamente", "success");
        return true;

    } catch (error) {
        console.error("Error subiendo productos:", error);
        mostrarMensaje(`🚨 Error: ${error.message || "Verifica tu conexión"}`, "error");
        return false;
    }
}
//  Función para cargar  datos en la tabla de la página de archivos
export function cargarDatosInventarioEnTablaPlantilla() {
    const transaction = dbInventario.transaction(["inventario"], "readonly");
    const objectStore = transaction.objectStore("inventario");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const inventario = event.target.result;
        const tbody = document.querySelector("#estructura-plantilla tbody");
        tbody.innerHTML = ""; // Limpiar la tabla antes de cargar nuevos datos

        inventario.forEach(function (item) {
            const row = tbody.insertRow();
            row.insertCell().textContent = item.codigo;
            row.insertCell().textContent = item.nombre;
            row.insertCell().textContent = item.categoria;
            row.insertCell().textContent = item.marca;
            row.insertCell().textContent = item.unidad;
            row.insertCell().textContent = item.cantidad;
            row.insertCell().textContent = item.caducidad;
            row.insertCell().textContent = item.comentarios;
        });
    };

    request.onerror = function (event) {
        console.error(
            "Error al cargar datos de inventario en la tabla:",
            event.target.error
        );
        mostrarMensaje("Error al cargar los datos del inventario", "error");
    };
}

// Función para generar plantilla de inventario
export function generarPlantillaInventario() {
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const productos = event.target.result;
        let csv =
            "Código,Nombre,Lote,Tipo de Cantidad,Cantidad,Fecha de Caducidad,Comentarios\n";
        productos.forEach(producto => {
            const { inventario = {} } = producto;
            csv += `${producto.codigo},${producto.nombre},1,${inventario.tipo || ""},${inventario.cantidad || ""},${inventario.caducidad || ""},${inventario.comentarios || ""}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "plantilla_inventario_completa.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
}

// Función para cargar datos en la tabla de la página de archivos
export function cargarDatosEnTabla() {
    const tbody = document.getElementById("databaseBody");
    if (!tbody) {
        console.log("Elemento 'databaseBody' no encontrado.");
        return;
    }

    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const productos = event.target.result;
        tbody.innerHTML = ""; // Limpiar tabla

        productos.forEach(function (producto) {
            const row = tbody.insertRow();
            row.insertCell().textContent = producto.codigo;
            row.insertCell().textContent = producto.nombre;
            row.insertCell().textContent = producto.categoria;
            row.insertCell().textContent = producto.marca;
            row.insertCell().textContent = producto.unidad;
        });
    };

    request.onerror = function (event) {
        mostrarMensaje("Error al cargar datos en la tabla:", event.target.error);
    };
}

import { supabase } from './auth.js'; // Cliente de Supabase
import { mostrarMensaje } from './logs.js'; // Para notificaciones
import { cargarDatosInventarioEnTablaPlantilla } from './db-operations.js'; // Para actualizar la UI

export async function sincronizarInventarioDesdeSupabase() {
    try {
        // Verificar autenticación del usuario
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            mostrarMensaje("Debes iniciar sesión para sincronizar", "error");
            return;
        }

        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            mostrarMensaje("Sesión no válida, inicia sesión nuevamente", "error");
            return;
        }

        // Obtener datos de inventario desde Supabase
        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .eq('usuario_id', userId);

        if (error) {
            throw new Error(`Error al obtener inventario: ${error.message}`);
        }

        if (!data || data.length === 0) {
            mostrarMensaje("No hay datos de inventario en Supabase", "info");
            return;
        }

        // Actualizar IndexedDB
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");

        // Limpiar datos existentes en IndexedDB
        await new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });

        // Insertar los datos de Supabase en IndexedDB
        for (const item of data) {
            await new Promise((resolve, reject) => {
                const request = objectStore.put(item); // 'put' actualiza o inserta
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            });
        }

        mostrarMensaje("Inventario sincronizado exitosamente desde Supabase", "success");
        cargarDatosInventarioEnTablaPlantilla(); // Refrescar la tabla en la interfaz
    } catch (error) {
        console.error("Error al sincronizar inventario:", error);
        mostrarMensaje(`Error al sincronizar inventario: ${error.message}`, "error");
    }
}

