import { mostrarMensaje, mostrarResultadoCarga, mostrarAlertaBurbuja } from './logs.js';
import { sanitizarProducto } from './sanitizacion.js';
import { getSupabase } from './auth.js'; // Importar la nueva función

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
    // Asegurarse de que el área_id esté presente
    const areaId = localStorage.getItem('area_id');
    if (!areaId) {
        console.error("No se encontró el área_id al intentar agregar a la cola de sincronización");
        mostrarAlertaBurbuja("Error: No se pudo determinar el área para sincronizar", "error");
        return;
    }
    
    // Crear un objeto limpio para Supabase sin el campo areaName
    const dataSupabase = { ...data };
    
    // Si existe areaName, eliminarla porque Supabase no tiene esa columna
    if (dataSupabase.areaName) {
        delete dataSupabase.areaName;
    }
    
    // Asegurarse que tenga area_id
    dataSupabase.area_id = dataSupabase.area_id || areaId;
    
    syncQueue.push(dataSupabase);
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
    if (navigator.onLine) procesarColaSincronizacion();
}

// Llamar esto cuando se detecte conexión
export async function procesarColaSincronizacion() {
    if (!navigator.onLine) return;

    while (syncQueue.length > 0) {
        const item = syncQueue.shift();
        try {
            const supabase = await getSupabase();
            
            // Verificar que el ítem tenga área_id
            if (!item.area_id) {
                const areaId = localStorage.getItem('area_id');
                if (!areaId) {
                    console.error("No se encontró ID de área para el elemento:", item);
                    syncQueue.unshift(item); // Devolver el elemento a la cola
                    mostrarAlertaBurbuja("Error: falta área en producto", "error");
                    break;
                }
                item.area_id = areaId;
            }
            
            // Crear un objeto limpio para enviar a Supabase (sin el campo areaName)
            const datosParaSupabase = { ...item };
            
            // Eliminar el campo areaName si existe
            if (datosParaSupabase.areaName) {
                delete datosParaSupabase.areaName;
            }
            
            // Asegurarse de incluir la información del usuario
            const { data, error } = await supabase
                .from('inventario')
                .upsert({ 
                    ...datosParaSupabase, 
                    usuario_id: localStorage.getItem('usuario_id')
                })
                .select();

            if (error) {
                console.error("Error al sincronizar con Supabase:", error, datosParaSupabase);
                throw error;
            }

            // Actualizar IndexedDB con el ID permanente de Supabase y la información completa
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");
            
            // Eliminar el registro temporal
            await new Promise((resolve, reject) => {
                const request = objectStore.delete(item.id);
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            });
            
            // Agregar el registro actualizado con ID permanente y todos los datos
            // Incluir areaName solo para la base de datos local
            const itemActualizado = { 
                ...item, 
                id: data[0].id, 
                is_temp_id: false,
                area_id: data[0].area_id || item.area_id,
                areaName: localStorage.getItem('ubicacion_almacen') // Mantener este campo solo localmente
            };
            
            await new Promise((resolve, reject) => {
                const request = objectStore.add(itemActualizado);
                request.onsuccess = resolve;
                request.onerror = (e) => {
                    console.error("Error al guardar en IndexedDB:", e.target.error, itemActualizado);
                    reject(e.target.error);
                };
            });

            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        } catch (error) {
            console.error('Error al procesar la cola:', error);
            syncQueue.unshift(item); // Reinsertar el elemento si falla
            mostrarAlertaBurbuja("Error al sincronizar con el servidor", "error");
            break;
        }
    }
    
    if (syncQueue.length === 0) {
        mostrarAlertaBurbuja("Sincronización completada", "success");
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
async function actualizarInventarioDesdeServidor(payload) {
    try {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");

        switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
                await new Promise((resolve) => {
                    const request = objectStore.put(payload.new);
                    request.onsuccess = resolve;
                });
                break;

            case 'DELETE':
                await new Promise((resolve) => {
                    const request = objectStore.delete(payload.old.id);
                    request.onsuccess = resolve;
                });
                break;
        }

        // Actualizar la tabla si estamos en inventario.html
        if (window.location.pathname.includes('inventario.html')) {
            cargarDatosInventarioEnTablaPlantilla();
        }
    } catch (error) {
        console.error("Error actualizando inventario local:", error);
    }
}

// Configurar suscripción a Supabase
export async function inicializarSuscripciones() {
    const supabase = await getSupabase();
    if (!supabase) {
        console.error("Supabase no inicializado");
        return;
    }

    try {
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            throw new Error("Usuario no autenticado");
        }

        const channel = supabase.channel('inventario-real-time')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, payload => {
                actualizarInventarioDesdeServidor(payload);
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log("Suscripción activa");
                if (err) console.error("Error en suscripción:", err);
            });
        return channel;
    } catch (error) {
        console.error("Error en suscripción:", error);
        mostrarAlertaBurbuja("Error en conexión en tiempo real", "error");
    }
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
            csv += `${item.codigo},${item.nombre},${item.categoria},${item.marca},${item.lote},${item.tipoCantidad},${item.cantidad},${item.caducidad},${item.comentarios}\n`;
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
            doc.text(`Cantidad: ${item.cantidad} ${item.tipoCantidad}`, 10, yPos + 10);
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
        const usuarioId = localStorage.getItem('usuario_id');
        const categoriaId = localStorage.getItem('categoria_id');
        if (!usuarioId || !categoriaId) {
            console.warn("No hay usuario o categoría disponible para sincronizar");
            return;
        }
        const response = await fetch('https://gestorinventory-backend-production.up.railway.app/productos/sincronizar', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${localStorage.getItem('supabase.auth.token')}`
            },
            credentials: 'include', // <- Añadir esto para enviar cookies
            body: JSON.stringify({ usuarioId, categoriaId }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const transaction = db.transaction(["productos"], "readwrite");
        const store = transaction.objectStore("productos");

        await Promise.all(data.productos.map(async (producto) => {
            const existing = await new Promise(resolve => {
                const req = store.get(producto.codigo);
                req.onsuccess = () => resolve(req.result);
            });

            if (!existing || JSON.stringify(existing) !== JSON.stringify(producto)) {
                await new Promise(resolve => store.put(producto).onsuccess = resolve);
            }
        }));

        mostrarAlertaBurbuja("Sincronización exitosa", "success");
        
    } catch (error) {
        console.error("Error de sincronización:", error);
        mostrarAlertaBurbuja(`Falló: ${error.message}`, "error");
    }
}

// Call the function after initializing the database if on archivos.html
if (window.location.pathname.includes('main.html') ) {
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
            mostrarAlertaBurbuja("Debes iniciar sesión para sincronizar", "error");
            return false;
        }

        // Obtener el ID del usuario autenticado
        const userId = localStorage.getItem('usuario_id');
        if (!userId) {
            mostrarAlertaBurbuja("No se encontró el ID del usuario", "error");
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
            mostrarAlertaBurbuja("No hay productos para subir", "info");
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
        mostrarAlertaBurbuja("✅ Productos subidos exitosamente", "success");
        return true;

    } catch (error) {
        console.error("Error subiendo productos:", error);
        mostrarAlertaBurbuja(`🚨 Error: ${error.message || "Verifica tu conexión"}`, "error");
        return false;
    }
}
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
            case 'cantidad':
                valorA = parseInt(a.cantidad) || 0;
                valorB = parseInt(b.cantidad) || 0;
                break;
            case 'caducidad':
                valorA = new Date(a.caducidad || '3000-01-01');
                valorB = new Date(b.caducidad || '3000-01-01');
                break;
            default:
                valorA = a[columna] ? a[columna].toString().toLowerCase() : '';
                valorB = b[columna] ? b[columna].toString().toLowerCase() : '';
        }
        
        // Ordenar ascendente o descendente
        if (ascendente) {
            if (valorA < valorB) return -1;
            if (valorA > valorB) return 1;
            return 0;
        } else {
            if (valorA > valorB) return -1;
            if (valorA < valorB) return 1;
            return 0;
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
            const nombreColumna = columnas[index];
            
            // Hacer clic en el encabezado para ordenar
            header.style.cursor = 'pointer';
            header.classList.add('select-none');
            
            // Añadir icono de ordenamiento
            const iconSpan = document.createElement('span');
            iconSpan.className = 'ml-1 text-xs';
            iconSpan.innerHTML = '⇵';
            header.appendChild(iconSpan);
            
            header.addEventListener('click', () => {
                // Si ya estamos ordenando por esta columna, cambiar dirección
                if (ordenColumnaInventario.columna === nombreColumna) {
                    ordenColumnaInventario.ascendente = !ordenColumnaInventario.ascendente;
                } else {
                    // Si es una nueva columna, ordenar ascendente por defecto
                    ordenColumnaInventario.columna = nombreColumna;
                    ordenColumnaInventario.ascendente = true;
                }
                
                // Actualizar iconos en todos los encabezados
                headers.forEach((h, i) => {
                    const icon = h.querySelector('span');
                    if (i < columnas.length && columnas[i] === ordenColumnaInventario.columna) {
                        icon.innerHTML = ordenColumnaInventario.ascendente ? '↑' : '↓';
                    } else {
                        icon.innerHTML = '⇵';
                    }
                });
                
                // Reordenar y mostrar
                ordenarDatosInventario();
                mostrarPaginaInventario();
            });
        }
    });
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
            throw new Error("No se pudo obtener la instancia de Supabase");
        }

        // Get user's category ID for filtering products
        const categoriaId = localStorage.getItem('categoria_id');
        if (!categoriaId) {
            throw new Error("No hay categoría disponible para consultar productos");
        }

        // Query products from Supabase
        const { data: productos, error } = await supabase
            .from('productos')
            .select('*')
            .eq('categoria_id', categoriaId);

        if (error) {
            throw error;
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
                // Guardar productos en variable global para paginación
                productosCompletos = event.target.result;
                
                // Aplicar ordenamiento inicial
                ordenarDatosProductos();
                
                // Mostrar primera página
                mostrarPaginaProductos();
                
                // Crear controles de paginación
                crearControlesPaginacionProductos();
                
                mostrarAlertaBurbuja("Productos cargados desde IndexedDB (modo fallback)", "warning");
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
            if (valorA < valorB) return -1;
            if (valorA > valorB) return 1;
            return 0;
        } else {
            if (valorA > valorB) return -1;
            if (valorA < valorB) return 1;
            return 0;
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
            const nombreColumna = columnas[index];
            
            // Hacer clic en el encabezado para ordenar
            header.style.cursor = 'pointer';
            header.classList.add('select-none');
            
            // Añadir icono de ordenamiento
            const iconSpan = document.createElement('span');
            iconSpan.className = 'ml-1 text-xs';
            iconSpan.innerHTML = '⇵';
            header.appendChild(iconSpan);
            
            header.addEventListener('click', () => {
                // Si ya estamos ordenando por esta columna, cambiar dirección
                if (ordenColumnaProductos.columna === nombreColumna) {
                    ordenColumnaProductos.ascendente = !ordenColumnaProductos.ascendente;
                } else {
                    // Si es una nueva columna, ordenar ascendente por defecto
                    ordenColumnaProductos.columna = nombreColumna;
                    ordenColumnaProductos.ascendente = true;
                }
                
                // Actualizar iconos en todos los encabezados
                headers.forEach((h, i) => {
                    const icon = h.querySelector('span');
                    if (i < columnas.length && columnas[i] === ordenColumnaProductos.columna) {
                        icon.innerHTML = ordenColumnaProductos.ascendente ? '↑' : '↓';
                    } else {
                        icon.innerHTML = '⇵';
                    }
                });
                
                // Reordenar y mostrar
                ordenarDatosProductos();
                mostrarPaginaProductos();
            });
        }
    });
}

// Función para generar una plantilla de inventario en formato CSV
export function generarPlantillaInventario() {
    // Crear encabezados para la plantilla de inventario
    const headers = "Código,Nombre,Categoría,Marca,Lote,Unidad,Cantidad,Fecha de Caducidad,Comentarios\n";
    
    // Crear filas de ejemplo (opcional)
    let filaEjemplo = "123456,Producto de ejemplo,Categoría,Marca,1,Pz,10,2025-12-31,Comentarios de ejemplo\n";
    
    // Combinar encabezados y ejemplo
    const csv = "\uFEFFCódigo,Nombre,Categoría,Marca,Lote,Unidad,Cantidad,Fecha de Caducidad,Comentarios\n" + filaEjemplo;
    
    // Crear el blob y descargar
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
        const nombreArchivo = `plantilla_inventario_${fecha}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", nombreArchivo);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar mensaje de éxito
        mostrarMensaje("Plantilla de inventario generada correctamente", "success");
    } else {
        mostrarMensaje("Tu navegador no soporta la descarga de archivos", "error");
    }
}

// Función para obtener la ubicación de almacén actualmente en uso
export async function obtenerUbicacionEnUso() {
    // Primero intentar obtener la ubicación desde localStorage
    const ubicacionAlmacen = localStorage.getItem('ubicacion_almacen');
    
    if (ubicacionAlmacen) {
        return ubicacionAlmacen;
    }
    
    // Si no hay ubicación en localStorage, intentar obtenerla de Supabase
    try {
        const areaId = localStorage.getItem('area_id');
        if (!areaId) {
            return null; // No se ha seleccionado un área
        }
        
        const supabase = await getSupabase();
        if (!supabase) {
            throw new Error("No se pudo obtener la instancia de Supabase");
        }
        
        // Buscar el área por ID
        const { data, error } = await supabase
            .from('areas')
            .select('nombre')
            .eq('id', areaId)
            .single();
            
        if (error) {
            throw error;
        }
        
        if (data) {
            // Guardar en localStorage para futuras consultas
            localStorage.setItem('ubicacion_almacen', data.nombre);
            return data.nombre;
        }
        
        return null;
    } catch (error) {
        console.error("Error al obtener ubicación:", error);
        return null;
    }
}

// Función para sincronizar inventario desde Supabase
export async function sincronizarInventarioDesdeSupabase(ubicacionNombre = null, forzarAreaId = null) {
    try {
        mostrarAlertaBurbuja("Sincronizando inventario...", "info");
        console.log("Iniciando sincronización de inventario desde Supabase");
        
        // Obtener instancia de Supabase
        const supabase = await getSupabase();
        if (!supabase) {
            throw new Error("No se pudo obtener la instancia de Supabase");
        }
        
        // Obtener el ID del área actual (usar el forzado si existe, de lo contrario usar el de localStorage)
        const areaId = forzarAreaId || localStorage.getItem('area_id');
        if (!areaId) {
            console.error("Error al obtener area_id:", { 
                forzarAreaId, 
                localStorage_area_id: localStorage.getItem('area_id'),
                ubicacionNombre
            });
            throw new Error("No hay área seleccionada para sincronizar");
        }
        
        // Guardar nombre de ubicación si se proporciona
        if (ubicacionNombre) {
            localStorage.setItem('ubicacion_almacen', ubicacionNombre);
            console.log(`Cambio de ubicación a: ${ubicacionNombre} (ID: ${areaId})`);
            
            // Si forzamos un area_id, asegurarse de que también se guarde en localStorage
            if (forzarAreaId) {
                localStorage.setItem('area_id', forzarAreaId);
                console.log(`Guardado forzado de area_id en localStorage: ${forzarAreaId}`);
            }
        }
        
        // IMPORTANTE: Consultar SOLO los productos que pertenecen a esta área específica
        console.log(`Consultando inventario específico del área ID: ${areaId}`);
        const { data: inventario, error } = await supabase
            .from('inventario')
            .select('*')
            .eq('area_id', areaId);
            
        if (error) {
            console.error("Error en la consulta a Supabase:", error);
            throw error;
        }
        
        console.log(`Encontrados ${inventario ? inventario.length : 0} elementos en Supabase para área ID ${areaId}`);
        
        // Actualizar la base de datos local (primero borrar todo)
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");
        
        // Primero limpiar TODA la base de datos local
        await new Promise((resolve, reject) => {
            const clearRequest = objectStore.clear();
            clearRequest.onsuccess = () => {
                console.log("Base de datos local limpiada correctamente");
                resolve();
            };
            clearRequest.onerror = (e) => {
                console.error("Error al limpiar la base de datos local:", e.target.error);
                reject(e.target.error);
            };
        });
        
        // Si no hay elementos para mostrar, actualizar la tabla y terminar
        if (!inventario || inventario.length === 0) {
            mostrarAlertaBurbuja("No hay productos en esta ubicación", "info");
            
            // Actualizar la visualización con la tabla vacía
            if (window.location.pathname.includes('inventario.html')) {
                cargarDatosInventarioEnTablaPlantilla();
            }
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
            // Verificación de seguridad para asegurar que el ítem pertenece a esta área
            if (item.area_id && item.area_id.toString() === areaId.toString()) {
                try {
                    // Añadir el nombre del área a cada ítem (solo localmente)
                    const itemConArea = { 
                        ...item, 
                        areaName: nombreArea 
                    };
                    
                    await new Promise((resolve, reject) => {
                        const request = objectStore.add(itemConArea);
                        request.onsuccess = () => {
                            contadorExito++;
                            resolve();
                        };
                        request.onerror = (e) => {
                            console.error(`Error al agregar ítem con ID ${item.id}:`, e.target.error);
                            errores.push({ id: item.id, error: e.target.error });
                            // Resolvemos igualmente para continuar con el siguiente ítem
                            resolve();
                        };
                    });
                } catch (error) {
                    console.error(`Error al procesar ítem con ID ${item.id}:`, error);
                    errores.push({ id: item.id, error });
                }
            } else {
                console.warn(`Producto con ID ${item.id} ignorado: no pertenece al área ${areaId}`);
            }
        }
        
        console.log(`Sincronización completada - Agregados ${contadorExito} de ${inventario.length} elementos. Errores: ${errores.length}`);
        
        // Actualizar la visualización si estamos en la página de inventario
        if (window.location.pathname.includes('inventario.html')) {
            cargarDatosInventarioEnTablaPlantilla();
        }
        
        if (errores.length > 0) {
            mostrarAlertaBurbuja(`Sincronización parcial: ${contadorExito} de ${inventario.length} elementos`, "warning");
        } else {
            mostrarAlertaBurbuja(`Inventario sincronizado: ${contadorExito} elementos`, "success");
        }
        
        return contadorExito;
    } catch (error) {
        console.error("Error al sincronizar inventario:", error);
        mostrarAlertaBurbuja("Error al sincronizar inventario: " + error.message, "error");
        return 0;
    }
}

/**
 * Función para obtener las áreas disponibles según la categoría del usuario
 * Esta función carga y almacena las áreas para uso en la aplicación
 */
export async function obtenerAreasPorCategoria() {
    try {
        // Obtener instancia de Supabase
        const supabase = await getSupabase();
        if (!supabase) {
            throw new Error("No se pudo obtener la instancia de Supabase");
        }
        
        // Obtener categoría del usuario
        const categoriaId = localStorage.getItem('categoria_id');
        if (!categoriaId) {
            mostrarAlertaBurbuja("No hay categoría seleccionada", "warning");
            return [];
        }
        
        // Consultar áreas filtradas por categoría
        const { data: areas, error } = await supabase
            .from('areas')
            .select('*')
            .eq('categoria_id', categoriaId);
            
        if (error) {
            throw error;
        }
        
        if (!areas || areas.length === 0) {
            mostrarAlertaBurbuja("No hay áreas disponibles para esta categoría", "info");
            return [];
        }
        
        // Almacenar las áreas en localStorage para uso futuro
        localStorage.setItem('areas_disponibles', JSON.stringify(areas));
        
        console.log("Áreas cargadas correctamente:", areas.length);
        return areas;
    } catch (error) {
        console.error("Error al obtener áreas:", error);
        mostrarAlertaBurbuja("Error al cargar las áreas", "error");
        return [];
    }
}

// Función para guardar el ID del área de manera persistente
export function guardarAreaIdPersistente(areaId, nombreArea) {
    if (!areaId) {
        console.error("Error: Intentando guardar un area_id vacío o nulo");
        return false;
    }
    
    try {
        console.log(`Guardando area_id: ${areaId} (${nombreArea || 'sin nombre'}) de manera persistente`);
        
        // Guardar en localStorage
        localStorage.setItem('area_id', areaId);
        
        // Guardar también en sessionStorage como respaldo
        sessionStorage.setItem('area_id', areaId);
        
        // Si hay un nombre de área, también guardarlo
        if (nombreArea) {
            localStorage.setItem('ubicacion_almacen', nombreArea);
            sessionStorage.setItem('ubicacion_almacen', nombreArea);
        }
        
        // Verificar que se guardó correctamente
        const verificacion = localStorage.getItem('area_id');
        if (verificacion !== areaId) {
            console.error(`Error de verificación: area_id guardado (${verificacion}) no coincide con el proporcionado (${areaId})`);
            return false;
        }
        
        console.log("area_id guardado correctamente en localStorage y sessionStorage");
        return true;
    } catch (error) {
        console.error("Error al guardar area_id:", error);
        return false;
    }
}

// Función para recuperar el ID del área de forma segura
export function obtenerAreaId() {
    // Intentar obtener del localStorage primero
    let areaId = localStorage.getItem('area_id');
    
    // Si no está en localStorage, intentar recuperarlo de sessionStorage
    if (!areaId) {
        areaId = sessionStorage.getItem('area_id');
        
        // Si se encontró en sessionStorage pero no en localStorage, restaurarlo en localStorage
        if (areaId) {
            console.log(`Restaurando area_id (${areaId}) desde sessionStorage a localStorage`);
            localStorage.setItem('area_id', areaId);
        } else {
            console.warn("No se encontró area_id en localStorage ni sessionStorage");
        }
    }
    
    return areaId;
}

