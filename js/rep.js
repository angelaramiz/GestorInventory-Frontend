// Load the jsPDF library
import { getSupabase } from "./auth";
// Usar un Map para almacenar los productos
const inventario = new Map();

async function cargarUbicaciones() {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('areas').select('*');

    if (error) {
        console.error("Error al obtener ubicaciones:", error);
        return;
    }

    const selectUbicacion = document.getElementById("selectUbicacion");
    data.forEach(area => {
        let option = document.createElement("option");
        option.value = area.id;
        option.textContent = area.nombre;
        selectUbicacion.appendChild(option);
    });
}

document.addEventListener("DOMContentLoaded", cargarUbicaciones);

// Función para actualizar la barra de progreso
function actualizarProgressBar(progreso, mensaje) {
    const progressBar = document.getElementById("progress-bar");
    const loadingMessage = document.getElementById("loading-message");
    progressBar.style.width = `${progreso}%`;
    loadingMessage.textContent = mensaje;
}
// Cuando se carga el archivo CSV
document.getElementById('csv-file').addEventListener('change', function (event) {
    const csvFile = event.target.files[0];
    const csvFileName = csvFile.name.split('.').slice(0, -1).join('.'); // Obtiene el nombre sin extensión
    // Guarda el nombre del archivo CSV para usarlo luego
    window.csvFileName = csvFileName;
    // Continúa con el proceso normal de carga
    loadCSV(csvFile);
});
// Función para cargar un archivo CSV
function cargarCSV() {
    const fileInput = document.getElementById("csv-file");
    const file = fileInput.files[0];

    const csvFileName = file.name.split('.').slice(0, -1).join('.'); // Obtiene el nombre sin extensión

    // Guarda el nombre del archivo CSV para usarlo luego
    window.csvFileName = csvFileName;

    if (!file) {
        alert("Por favor, selecciona un archivo CSV.");
        return;
    }

    const reader = new FileReader();
    const modal = document.getElementById("loading-modal");

    // Mostrar la ventana modal
    modal.classList.remove("hidden");

    reader.onload = async function (event) {
        try {
            const csvData = event.target.result;
            const productos = parseCSV(csvData);

            if (productos.length === 0) {
                alert("El archivo CSV está vacío o no contiene datos válidos.");
                modal.classList.add("hidden");
                return;
            }

            // Simular progreso mientras se cargan los productos
            const totalProductos = productos.length;
            let progreso = 0;

            for (let i = 0; i < totalProductos; i++) {
                const producto = productos[i];
                if (!inventario.has(producto.codigo)) {
                    inventario.set(producto.codigo, {
                        nombre: producto.nombre,  // Asegurar que el campo coincide con parseCSV()
                        codigo: producto.codigo,
                        cantidad: producto.cantidad,  // Agregar cantidad
                        fecha_caducidad: producto.fecha_caducidad,  // Agregar fecha de caducidad
                        formato: "EAN13"
                    });
                } else {
                    console.warn(`Producto con código ${producto.codigo} ya existe en el inventario.`);
                }

                // Actualizar la barra de progreso
                progreso = ((i + 1) / totalProductos) * 100;
                actualizarProgressBar(progreso, `Cargando productos (${Math.round(progreso)}%)`);
                await sleep(10); // Simular un pequeño retraso para visualizar el progreso
            }

            // Actualizar la lista de productos en la página
            actualizarListaProductos();

            // Ocultar la ventana modal
            modal.classList.add("hidden");
        } catch (error) {
            console.error("Error al cargar el archivo CSV:", error);
            alert("Ocurrió un error al cargar el archivo CSV. Verifica el formato del archivo.");
            modal.classList.add("hidden");
        }
    };

    reader.onerror = function () {
        alert("Error al leer el archivo CSV.");
        modal.classList.add("hidden");
    };

    reader.readAsText(file);
}

// Función para parsear el contenido del CSV
function parseCSV(csvData) {
    const lines = csvData.split("\n").filter(line => line.trim() !== "");
    const productos = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const [codigo, Nombre, Categoria, Marca, TipoCantidad, Cantidad, FechaCaducidad, Comentarios] =
            line.split(",").map(item => item.trim()); // Usa `,` como separador

        if (codigo && Nombre) {
            productos.push({
                codigo: codigo,
                nombre: Nombre,
                cantidad: Cantidad || "N/A",  // Si el campo está vacío, poner "N/A"
                fecha_caducidad: FechaCaducidad || "N/A"
            });
        }
    }

    return productos;
}

// Función para actualizar la lista de productos en la página
function actualizarListaProductos() {
    const lista = document.getElementById("lista-productos");
    lista.innerHTML = ""; // Limpiar la lista

    // Iterar sobre el Map para mostrar los productos
    inventario.forEach((producto) => {
        const li = document.createElement("li");
        li.textContent = `${producto.nombre} - ${producto.codigo}`;
        lista.appendChild(li);
    });
}

// Función para generar el PDF
async function generarPDF() {
    const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const pdfName = `${window.csvFileName}_${currentDate}.pdf`;

    if (inventario.size === 0) {
        alert("No hay productos agregados para generar el PDF.");
        return;
    }

    const modal = document.getElementById("loading-modal");
    modal.classList.remove("hidden");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yOffset = 20; // Posición vertical inicial
    const xOffsetLeft = 20;  // Columna izquierda
    const xOffsetRight = 110; // Columna derecha
    let columna = 0; // 0 = Izquierda, 1 = Derecha
    let productosPorPagina = 0; // Contador de productos en la página

    const productosArray = Array.from(inventario.values());

    for (let i = 0; i < productosArray.length; i += 2) { // Iterar en pares
        const producto1 = productosArray[i];
        const producto2 = productosArray[i + 1]; // Puede ser undefined en la última iteración si es impar

        // Imprimir primer producto en la izquierda
        doc.text(`Producto: ${producto1.nombre}`, xOffsetLeft, yOffset);
        doc.text(`Cantidad: ${producto1.cantidad}`, xOffsetLeft, yOffset + 10);
        doc.setTextColor('red');
        doc.text(`Fecha de Caducidad: ${producto1.fecha_caducidad}`, xOffsetLeft, yOffset + 20);
        doc.setTextColor('black');

        // Código de barras para el primer producto
        const canvas1 = document.createElement("canvas");
        JsBarcode(canvas1, producto1.codigo || "0000000000000", {
            format: producto1.formato,
            displayValue: true,
            fontSize: 12,
            height: 30
        });
        doc.addImage(canvas1.toDataURL("image/png"), "PNG", xOffsetLeft, yOffset + 30, 80, 20);

        // Imprimir segundo producto en la derecha (si existe)
        if (producto2) {
            doc.text(`Producto: ${producto2.nombre}`, xOffsetRight, yOffset);
            doc.text(`Cantidad: ${producto2.cantidad}`, xOffsetRight, yOffset + 10);
            doc.setTextColor('red');
            doc.text(`Fecha de Caducidad: ${producto2.fecha_caducidad}`, xOffsetRight, yOffset + 20);
            doc.setTextColor('black');

            // Código de barras para el segundo producto
            const canvas2 = document.createElement("canvas");
            JsBarcode(canvas2, producto2.codigo || "0000000000000", {
                format: producto2.formato,
                displayValue: true,
                fontSize: 12,
                height: 30
            });
            doc.addImage(canvas2.toDataURL("image/png"), "PNG", xOffsetRight, yOffset + 30, 80, 20);
        }

        yOffset += 60; // Avanzar a la siguiente fila
        productosPorPagina += 2;

        // Si se alcanzan 8 productos, crear una nueva página
        if (productosPorPagina >= 8) {
            doc.addPage();
            yOffset = 20; // Reiniciar posición vertical
            productosPorPagina = 0; // Reiniciar contador
        }
    }

    doc.save(pdfName);
    modal.classList.add("hidden");
}

// Función para verificar que todas las dependencias estén cargadas
function verificarDependencias() {
    const modal = document.getElementById("loading-modal");

    // Verificar que JsBarcode y jsPDF estén disponibles
    if (typeof JsBarcode !== "undefined" && typeof window.jspdf !== "undefined") {
        // Ocultar la ventana modal
        modal.classList.add("hidden");
    } else {
        // Intentar nuevamente después de 500 ms
        setTimeout(verificarDependencias, 500);
    }
}

// Función para simular un retraso
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Iniciar la verificación de dependencias cuando se cargue la página
window.onload = () => {
    verificarDependencias();
};

// Función para cargar el inventario desde IndexedDB
async function cargarInventarioLocal() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("InventarioDB", 2);

        request.onerror = (event) => {
            console.error("Error al abrir la base de datos de inventario", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const getAllRequest = objectStore.getAll();

            getAllRequest.onsuccess = (event) => {
                resolve(event.target.result);
            };

            getAllRequest.onerror = (event) => {
                console.error("Error al obtener los datos del inventario", event.target.error);
                reject(event.target.error);
            };
        };
    });
}

// Función para generar el reporte de inventario
async function generarReporteInventario() {
    const ubicacionSeleccionada = document.getElementById('ubicacion-select').value;
    const inventario = await cargarInventarioLocal();

    if (inventario.length === 0) {
        alert("No hay productos agregados para generar el reporte.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yOffset = 20;

    if (ubicacionSeleccionada === 'toda') {
        const ubicaciones = ['piso', 'camara fria', 'congelador interior', 'bunker', 'rishin'];
        ubicaciones.forEach(ubicacion => {
            doc.setFontSize(16);
            doc.text(`Ubicación de Inventario: ${ubicacion}`, 10, yOffset);
            yOffset += 10;
            agregarProductosPorUbicacion(doc, inventario, ubicacion, yOffset);
            yOffset += 20;
        });
    } else {
        doc.setFontSize(16);
        doc.text(`Ubicación de Inventario: ${ubicacionSeleccionada}`, 10, yOffset);
        yOffset += 10;
        agregarProductosPorUbicacion(doc, inventario, ubicacionSeleccionada, yOffset);
    }

    doc.save(`reporte_inventario_${ubicacionSeleccionada}.pdf`);
}

// Función para agregar productos por ubicación al PDF
function agregarProductosPorUbicacion(doc, inventario, ubicacion, yOffset) {
    const productosPorUbicacion = inventario.filter(item => item.area_id === ubicacion);
    const productosAgrupados = agruparProductosPorCodigo(productosPorUbicacion);

    productosAgrupados.forEach(producto => {
        doc.setFontSize(12);
        doc.text(`Código: ${producto.codigo}`, 10, yOffset);
        doc.text(`Nombre: ${producto.nombre}`, 10, yOffset + 10);
        doc.text(`Marca: ${producto.marca}`, 10, yOffset + 20);
        doc.text(`Tipo Unidad: ${producto.unidad}`, 10, yOffset + 30);
        doc.text(`Cantidad: ${producto.cantidad}`, 10, yOffset + 40);
        doc.text(`Fecha de Caducidad: ${producto.fecha_caducidad}`, 10, yOffset + 50);
        doc.text(`Comentarios: ${producto.comentarios}`, 10, yOffset + 60);
        yOffset += 70;
    });
}

// Función para agrupar productos por código
function agruparProductosPorCodigo(productos) {
    const productosAgrupados = new Map();

    productos.forEach(producto => {
        if (productosAgrupados.has(producto.codigo)) {
            const productoExistente = productosAgrupados.get(producto.codigo);
            productoExistente.cantidad += producto.cantidad;
            productoExistente.comentarios += `, Lote: ${producto.lote}, Cantidad: ${producto.cantidad}, Fecha de Caducidad: ${producto.caducidad}`;
        } else {
            productosAgrupados.set(producto.codigo, {
                ...producto,
                comentarios: `Lote: ${producto.lote}, Cantidad: ${producto.cantidad}, Fecha de Caducidad: ${producto.caducidad}`
            });
        }
    });

    return Array.from(productosAgrupados.values());
}

async function obtenerInventario(ubicacionId) {
    const supabase = await getSupabase();
    let query = supabase.from('inventario').select('*');

    if (ubicacionId !== "todas") {
        query = query.eq('area_id', ubicacionId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error al obtener inventario:", error);
        return [];
    }
    
    return data;
}

async function generarReportePDF(datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text("Reporte de Inventario", 10, 10);
    doc.setFontSize(10);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 10, 15);

    datos.forEach((producto) => {
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Generar código de barras
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, producto.codigo, { format: "EAN13", displayValue: true });

        doc.text(`Código: ${producto.codigo}`, 10, y);
        doc.text(`Nombre: ${producto.nombre}`, 10, y + 5);
        doc.text(`Marca: ${producto.marca}`, 10, y + 10);
        doc.text(`Unidad: ${producto.tipoUnidad} (${producto.unidad})`, 10, y + 15);
        doc.text(`Fecha de Caducidad: ${producto.fechaDeCadocidad}`, 10, y + 20);
        if (producto.comentarios) {
            doc.text(`Comentarios: ${producto.comentarios}`, 10, y + 25);
        }

        // Insertar código de barras en PDF
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, "PNG", 150, y, 40, 20);
        
        y += 40;
    });

    doc.save("Reporte_Inventario.pdf");
}

document.getElementById("btnGenerarPDF").addEventListener("click", async () => {
    const ubicacionId = document.getElementById("selectUbicacion").value;
    const inventario = await obtenerInventario(ubicacionId);
    generarReportePDF(inventario);
});
