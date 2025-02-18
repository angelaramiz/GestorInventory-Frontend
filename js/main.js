// Importaciones
import { db, dbInventario, inicializarDB, inicializarDBInventario, cargarCSV, descargarCSV, cargarDatosEnTabla, cargarDatosInventarioEnTablaPlantilla, resetearBaseDeDatos, generarPlantillaInventario, descargarInventarioPDF, descargarInventarioCSV,sincronizarProductosDesdeBackend } from './db-operations.js';
import { mostrarMensaje } from './logs.js';
import { agregarProducto, buscarProducto, buscarProductoParaEditar, buscarProductoInventario, guardarCambios, eliminarProducto, guardarInventario } from './product-operations.js';
import { toggleEscaner, detenerEscaner } from './scanner.js';

// Función de inicialización
async function init() {
    try {
        await inicializarDB();
        await inicializarDBInventario();

        // Solo inicializamos el escáner si estamos en una página que lo usa
        if (document.getElementById('scanner-container')) {

        }

        // Event listeners para los formularios
        const formAgregar = document.getElementById("formAgregarProducto");
        if (formAgregar) {
            formAgregar.addEventListener("submit", agregarProducto);
        }

        // Event listeners para los botones de escaneo
        const botonesEscanear = document.querySelectorAll('[id^="escanearBtn"]');
        botonesEscanear.forEach(boton => {
            boton.addEventListener("click", function () {
                const inputId = this.id.replace('escanearBtn', '');
                const targetInputId = `codigo${inputId}`;
                console.log('Iniciando escaneo para:', targetInputId); // Debug
                toggleEscaner(targetInputId);
            });
        });

        // Event listeners para los botones de búsqueda
        const botonBuscarConsulta = document.getElementById("buscarConsulta");
        if (botonBuscarConsulta) {
            botonBuscarConsulta.addEventListener("click", buscarProducto);
        }

        const botonBuscarEditar = document.getElementById("buscarEditar");
        if (botonBuscarEditar) {
            botonBuscarEditar.addEventListener("click", buscarProductoParaEditar);
        }

        // Event listeners para los botones de edición
        const botonGuardarCambios = document.getElementById("guardarCambios");
        if (botonGuardarCambios) {
            botonGuardarCambios.addEventListener("click", guardarCambios);
        }

        const botonEliminarProducto = document.getElementById("eliminarProducto");
        if (botonEliminarProducto) {
            botonEliminarProducto.addEventListener("click", eliminarProducto);
        }

        // Event listener para guardar inventario
        const botonGuardarInventario = document.getElementById("guardarInventario");
        if (botonGuardarInventario) {
            botonGuardarInventario.addEventListener("click", guardarInventario);
        }

        // Event listeners para la gestión de archivos
        const inputCSV = document.getElementById("csvFile");
        if (inputCSV) {
            inputCSV.addEventListener("change", cargarCSV);
        }

        const botonDescargarCSV = document.getElementById("descargarCSV");
        if (botonDescargarCSV) {
            botonDescargarCSV.addEventListener("click", descargarCSV);
        }

        const botonGenerarPlantilla = document.getElementById("generarPlantilla");
        if (botonGenerarPlantilla) {
            botonGenerarPlantilla.addEventListener("click", generarPlantillaInventario);
        }

        // Cargar datos en la tabla si estamos en la página de archivos
        if (window.location.pathname.includes('archivos.html')) {
            cargarDatosEnTabla();
            cargarDatosInventarioEnTablaPlantilla();
        }

        const botonResetearBaseDatos = document.getElementById("resetearBaseDatos");
        if (botonResetearBaseDatos) {
            botonResetearBaseDatos.addEventListener("click", resetearBaseDatos);
        }

        const botonGenerarHojaInventario = document.getElementById("generarHojaInventario");
        if (botonGenerarHojaInventario) {
            botonGenerarHojaInventario.addEventListener("click", generarHojaInventario);
        }

        // Event listener para el botón de cerrar escáner
        const cerrarEscanerBtn = document.getElementById('cerrarEscaner');
        if (cerrarEscanerBtn) {
            cerrarEscanerBtn.addEventListener('click', () => {
                console.log('Cerrando escáner'); // Debug
                detenerEscaner();
            });
        }

        const botonBuscarInventario = document.getElementById("buscarInventario");
        if (botonBuscarInventario) {
            botonBuscarInventario.addEventListener("click", buscarProductoInventario);
        }
        // Event listener para el botón de sincronizar
        const esPaginaArchivos = window.location.href.includes('archivos.html'); // ✅

        if (esPaginaArchivos) {
            const botonSincronizar = document.getElementById("sync-btn");
            if (botonSincronizar) {
            botonSincronizar.addEventListener("click", async () => {
                mostrarMensaje("Sincronizando productos...", "info");
                await sincronizarProductosDesdeBackend();
            });
            }
        }
    } catch (error) {
        console.error("Error initializing the application:", error);
        mostrarMensaje("Error al inicializar la aplicación. Por favor, recargue la página.", "error");
    }
}

// Event listener principal
document.addEventListener('DOMContentLoaded', init);

// Funciones auxiliares
function mostrarSeccion(seccion) {
    document.querySelectorAll(".seccion").forEach(div => (div.style.display = "none"));
    document.getElementById(seccion).style.display = "block";
    if (seccion === "archivos") {
        cargarDatosEnTabla();
    }
}

function resetearBaseDatos() {
    Swal.fire({
        title: "¿Qué base de datos deseas resetear?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Productos",
        cancelButtonText: "Inventario",
        showCloseButton: true
    }).then(result => {
        if (result.isConfirmed) {
            confirmarReseteo("productos");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            confirmarReseteo("inventario");
        }
    });
}

function confirmarReseteo(tipo) {
    Swal.fire({
        title: `¿Deseas descargar una copia de la base de datos de ${tipo} antes de resetear?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, descargar y resetear",
        cancelButtonText: "No, solo resetear"
    }).then(result => {
        if (result.isConfirmed) {
            descargarYResetear(tipo);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            resetearSinDescargar(tipo);
        }
    });
}

function descargarYResetear(tipo) {
    if (tipo === "productos") {
        descargarCSV().then(() => resetearBaseDeDatos(db, "productos"));
    } else {
        descargarInventarioCSV().then(() => resetearBaseDeDatos(dbInventario, "inventario"));
    }
}

function resetearSinDescargar(tipo) {
    if (tipo === "productos") {
        resetearBaseDeDatos(db, "productos");
    } else {
        resetearBaseDeDatos(dbInventario, "inventario");
    }
}

function generarHojaInventario() {
    Swal.fire({
        title: "Generar Hoja de Inventario",
        text: "Selecciona el formato de descarga:",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "CSV",
        cancelButtonText: "PDF"
    }).then(result => {
        if (result.isConfirmed) {
            descargarInventarioCSV();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            descargarInventarioPDF();
        }
    });
}

// Exportar funciones necesarias
export { mostrarSeccion, resetearBaseDatos, generarHojaInventario };