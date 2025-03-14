// Importaciones
import { db, dbInventario, inicializarDB, inicializarDBInventario, cargarCSV, descargarCSV, cargarDatosEnTabla, cargarDatosInventarioEnTablaPlantilla, resetearBaseDeDatos, generarPlantillaInventario, descargarInventarioPDF, descargarInventarioCSV, sincronizarProductosDesdeBackend, subirProductosAlBackend, inicializarSuscripciones, sincronizarInventarioDesdeSupabase, obtenerUbicacionEnUso } from './db-operations.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from './logs.js';
import { agregarProducto, buscarProducto, buscarProductoParaEditar, buscarProductoInventario, guardarCambios, eliminarProducto, guardarInventario, modificarInventario, seleccionarUbicacionAlmacen, iniciarInventario } from './product-operations.js';
import { toggleEscaner, detenerEscaner } from './scanner.js';

// Función de inicialización
async function init() {
    try {
        await inicializarDB();
        await inicializarDBInventario();

        // Sincronizar al cargar la página solo en archivos.html e inventario.html
        const esPaginaArchivos = window.location.pathname.includes('archivos.html');
        const esPaginaInventario = window.location.pathname.includes('inventario.html');

        if (esPaginaArchivos || esPaginaInventario) {
            await inicializarSuscripciones(); // Iniciar suscripciones en tiempo real
            await sincronizarInventarioDesdeSupabase(); // Sincronizar al cargar la página
        }

        // Solo inicializamos el escáner si estamos en una página que lo usa
        if (document.getElementById('scanner-container')) {
            // Inicializar escáner
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
        const botonModificarInventario = document.getElementById("modificarInventario");
        if (botonModificarInventario) {
            botonModificarInventario.addEventListener("click", modificarInventario);
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
        if (esPaginaArchivos) {
            cargarDatosEnTabla();
            cargarDatosInventarioEnTablaPlantilla();

            // Agregar listeners para sincronización manual
            document.getElementById('sync-down-btn').addEventListener('click', sincronizarProductosDesdeBackend);
            document.getElementById('sync-up-btn').addEventListener('click', subirProductosAlBackend);
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

        // Event listeners para los botones de sincronización
        if (esPaginaArchivos) {
            const botonSincronizarBajada = document.getElementById("sync-down-btn");
            if (botonSincronizarBajada) {
                botonSincronizarBajada.addEventListener("click", async () => {
                    mostrarMensaje("Sincronizando productos en bajada...", "info");
                    await sincronizarProductosDesdeBackend();
                });
            }

            const botonSincronizarSubida = document.getElementById("sync-up-btn");
            if (botonSincronizarSubida) {
                botonSincronizarSubida.addEventListener("click", async () => {
                    mostrarMensaje("Sincronizando productos en subida...", "info");
                    await subirProductosAlBackend();
                });
            }
        }

        if (esPaginaInventario) {
            document.getElementById('sync-inventario-down-btn')?.addEventListener('click', sincronizarInventarioDesdeSupabase);
        }

        document.getElementById('sincronizarManual')?.addEventListener('click', async () => {
            mostrarSpinner();
            try {
                await procesarColaSincronizacion();
                mostrarAlertaBurbuja('Sincronización manual completada', 'success');
            } catch (error) {
                mostrarAlertaBurbuja('Error al sincronizar', 'error');
            } finally {
                ocultarSpinner();
            }
        });

        // Solicitar la selección de ubicación al cargar inventario.html
        if (esPaginaInventario) {
            const ubicacion = await seleccionarUbicacionAlmacen();
            if (ubicacion) {
                iniciarInventario(ubicacion);
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

function mostrarSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'spinner';
    spinner.className = 'spinner';
    document.body.appendChild(spinner);
}

function ocultarSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Ejemplo de uso en una operación asíncrona
async function sincronizarDatos() {
    mostrarSpinner();
    try {
        await sincronizarProductosDesdeBackend();
        mostrarMensaje('Sincronización exitosa', 'success');
    } catch (error) {
        mostrarMensaje('Error al sincronizar', 'error');
    } finally {
        ocultarSpinner();
    }
}

function actualizarIndicadorConexion() {
    const indicador = document.getElementById('conexion-indicador');
    if (navigator.onLine) {
        mostrarAlertaBurbuja('🟢 En línea', 'success');
        if (indicador) {
            indicador.textContent = '🟢 En línea';
            indicador.classList.remove('bg-red-500');
            indicador.classList.add('bg-green-500');
        }
    } else {
        mostrarAlertaBurbuja('🔴 Sin conexión', 'error');
        if (indicador) {
            indicador.textContent = '🔴 Sin conexión';
            indicador.classList.remove('bg-green-500');
            indicador.classList.add('bg-red-500');
        }
    }
}

window.addEventListener('online', actualizarIndicadorConexion);
window.addEventListener('offline', actualizarIndicadorConexion);

// Inicializar el indicador al cargar la página
document.addEventListener('DOMContentLoaded', actualizarIndicadorConexion);

// Exportar funciones necesarias
export { mostrarSeccion, resetearBaseDatos, generarHojaInventario };