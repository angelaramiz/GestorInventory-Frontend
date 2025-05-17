// Importaciones
import { db, dbInventario, inicializarDB, inicializarDBInventario, cargarCSV, descargarCSV, cargarDatosEnTabla, cargarDatosInventarioEnTablaPlantilla, resetearBaseDeDatos, generarPlantillaInventario, descargarInventarioPDF, descargarInventarioCSV, sincronizarProductosDesdeBackend, subirProductosAlBackend, inicializarSuscripciones, sincronizarInventarioDesdeSupabase, obtenerUbicacionEnUso, procesarColaSincronizacion, guardarAreaIdPersistente, obtenerAreaId } from './db-operations.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from './logs.js';
import { agregarProducto, buscarProducto, buscarProductoParaEditar, buscarProductoInventario, guardarCambios, eliminarProducto, guardarInventario, modificarInventario, seleccionarUbicacionAlmacen, iniciarInventario, verificarYSeleccionarUbicacion } from './product-operations.js';
import { toggleEscaner, detenerEscaner } from './scanner.js';
import { isTokenExpired, mostrarDialogoSesionExpirada, verificarTokenAutomaticamente, configurarInterceptorSupabase } from './auth.js';

// Variable para almacenar el ID del intervalo de verificación de token
let tokenCheckInterval;

// Función para gestionar el menú lateral
function inicializarMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuRoutes = document.getElementById('menuRoutes');

    // Definir las rutas disponibles
    const routes = [
        { name: 'Consulta de Producto', path: './consulta.html', id: 'consulta' },
        { name: 'Editar Producto', path: './editar.html', id: 'editar' },
        { name: 'Inventario', path: './inventario.html', id: 'inventario' },
        { name: 'Reporte para Inventario', path: './report.html', id: 'reporte' },
        { name: 'Agregar Productos', path: './agregar.html', id: 'agregar' },
        { name: 'Administración de Archivos', path: './archivos.html', id: 'archivos' }
    ];

    // Obtener el rol del usuario
    const rol = localStorage.getItem('rol');
    
    // Filtrar las rutas según el rol
    const rutasRestringidas = {
        Operador: ['editar', 'reporte', 'agregar', 'archivos'], // IDs restringidos para operadores
        Administrador: [], // No hay restricciones para administradores
        Supervisor: ['reporte', 'archivos', 'editar'], // IDs restringidos para supervisores
    };
    
    const rutasBloqueadas = rutasRestringidas[rol] || [];
    
    // Generar las rutas dinámicamente, excluyendo las restringidas
    if (menuRoutes) {
        menuRoutes.innerHTML = ''; // Clear existing menu items first
        routes.forEach(route => {
            if (!rutasBloqueadas.includes(route.id)) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${route.path}" id="${route.id}Link" class="text-blue-500 hover:underline">${route.name}</a>`;
                menuRoutes.appendChild(li);
            }
        });
    }

    // Mostrar el menú
    menuToggle?.addEventListener('click', () => {
        sideMenu.classList.remove('-translate-x-full');
    });

    // Ocultar el menú
    closeMenu?.addEventListener('click', () => {
        sideMenu.classList.add('-translate-x-full');
    });
}

// Función para mostrar la ubicación actual
export async function mostrarUbicacionActual() {
    const ubicacion = await obtenerUbicacionEnUso();
    const ubicacionElement = document.getElementById('ubicacionActual');
    if (ubicacionElement) {
        ubicacionElement.innerText = ubicacion || 'No seleccionada';
    }
}

// Función para cambiar la ubicación manualmente
async function cambiarUbicacion() {
    const resultado = await seleccionarUbicacionAlmacen();
    if (resultado && resultado.id) {
        const nuevaUbicacion = resultado.nombre;
        const nuevaAreaId = resultado.id;
        console.log(`Cambiando a ubicación: ${nuevaUbicacion} (ID: ${nuevaAreaId})`);
        
        // Usar la nueva función de persistencia para guardar el ID del área
        const guardadoExitoso = guardarAreaIdPersistente(nuevaAreaId, nuevaUbicacion);
        if (!guardadoExitoso) {
            console.error("Error al guardar el ID del área de manera persistente");
            mostrarAlertaBurbuja("Error al cambiar de ubicación", "error");
            return;
        }
        
        // Iniciar inventario con la nueva ubicación
        iniciarInventario(nuevaUbicacion);
        sessionStorage.setItem("ubicacion_seleccionada", "true");
        
        // Actualizar la interfaz
        await mostrarUbicacionActual();
        
        // Verificar que el area_id aún exista antes de sincronizar
        const areaIdActual = obtenerAreaId();
        if (areaIdActual !== nuevaAreaId) {
            console.error(`Error de consistencia: area_id actual (${areaIdActual}) no coincide con el esperado (${nuevaAreaId})`);
        }
        
        // Sincronizar pasando explícitamente el ID del área seleccionada
        await sincronizarInventarioDesdeSupabase(nuevaUbicacion, nuevaAreaId);
    }
}

// Función para verificar la autenticación del usuario
async function verificarAutenticacion() {
    const token = localStorage.getItem('supabase.auth.token');
    
    // Si no hay token o está expirado, mostrar el diálogo de inicio de sesión
    if (!token || isTokenExpired(token)) {
        // Esta función ya redirige al usuario si cancela
        return await mostrarDialogoSesionExpirada();
    }
    
    return true;
}

// Función para iniciar la verificación periódica del token
function iniciarVerificacionToken() {
    // Primero verificamos inmediatamente al cargar la página
    if (verificarTokenAutomaticamente()) {
        console.log("Token válido al iniciar la aplicación");
    }
    
    // Configurar verificación periódica cada 5 minutos
    tokenCheckInterval = setInterval(() => {
        if (!verificarTokenAutomaticamente()) {
            // Si devuelve falso, el token está expirado o no existe
            console.log("Sesión expirada detectada en verificación periódica");
            // La función verificarTokenAutomaticamente ya muestra el diálogo si es necesario
        }
    }, 5 * 60 * 1000); // Verificar cada 5 minutos
    
    // También monitorear eventos de actividad del usuario para verificar el token
    document.addEventListener('click', () => {
        // Solo verificar si han pasado al menos 1 minuto desde la última verificación
        if (!window.lastTokenCheck || (Date.now() - window.lastTokenCheck) > 60000) {
            window.lastTokenCheck = Date.now();
            verificarTokenAutomaticamente();
        }
    });
}

// Función para ocultar rutas según el rol
function ocultarRutasPorRol(rol) {
    const rutasRestringidas = {
        Operador: ['editar', 'reporte', 'agregar', 'archivos'], // IDs de los divs restringidos para operadores
        Administrador: [], // No hay restricciones para administradores
        Supervisor: [ 'reporte', 'archivos', 'editar'], // IDs de los divs restringidos para supervisores
    };

    const rutasBloqueadas = rutasRestringidas[rol] || [];

    rutasBloqueadas.forEach(id => {
        const div = document.getElementById(id);
        const link = document.getElementById(`${id}Link`);
        if (div) {
            div.style.display = 'none'; // Ocultar el div
        }
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Restringir la redirección
                mostrarMensaje('Acceso denegado', 'error');
            });
        }
    });
}

// Función de inicialización
async function init() {
    try {
        // Configurar el interceptor para las peticiones a Supabase
        await configurarInterceptorSupabase();
        
        // Iniciar verificación periódica del token
        iniciarVerificacionToken();
        
        await inicializarDB();
        await inicializarDBInventario();

        // Obtener el rol del usuario
        const rol = localStorage.getItem('rol');

        // Ocultar rutas según el rol
        ocultarRutasPorRol(rol);
        
        // Inicializar el menú lateral
        inicializarMenu();

        // Inicializar suscripciones en tiempo real para ambas páginas
        const esPaginaInventario = window.location.pathname.includes('inventario.html');
        
        if (esPaginaInventario ) {
            // Obtener áreas por categoría al inicializar solo en la página de inventario
            const { obtenerAreasPorCategoria } = await import('./db-operations.js');
            await obtenerAreasPorCategoria();

            await inicializarSuscripciones();
        }
        
        // Funcionalidad específica para main.html
        // Funcionalidad específica para inventario.html
        if (esPaginaInventario) {
            await verificarYSeleccionarUbicacion();
            mostrarUbicacionActual();
            await sincronizarInventarioDesdeSupabase(); // Sincronizar solo en inventario.html
            
            // Agregar event listener para cambiar ubicación
            const cambiarUbicacionBtn = document.getElementById('cambiarUbicacion');
            if (cambiarUbicacionBtn) {
            cambiarUbicacionBtn.addEventListener('click', cambiarUbicacion);
            }
            
            cargarDatosInventarioEnTablaPlantilla();
            
            // Agregar listeners para sincronización manual
            document.getElementById('sync-inventario-down-btn')?.addEventListener('click', sincronizarInventarioDesdeSupabase);
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

        // Event listener para el botón de sincronización en bajada
        const botonSyncDown = document.getElementById("sync-down-btn");
        if (botonSyncDown) {
            botonSyncDown.addEventListener("click", async () => {
                mostrarSpinner();
                try {
                    await sincronizarProductosDesdeBackend();
                    mostrarAlertaBurbuja('Sincronización en bajada completada', 'success');
                } catch (error) {
                    mostrarAlertaBurbuja('Error al sincronizar en bajada', 'error');
                } finally {
                    ocultarSpinner();
                }
            });
        }

        // Agregar navegación a reportes
        const irAReportesBtn = document.getElementById('irAReportes');
        if (irAReportesBtn) {
            irAReportesBtn.addEventListener('click', () => {
                window.location.href = 'plantillas/report.html';
            });
        }

    } catch (error) {
        console.error("Error en inicialización:", error);
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

// Función para mostrar el indicador de conexión
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

// Conexión WebSocket
let ws;

function conectarWebSocket() {
    ws = new WebSocket('wss://gestorinventory-backend-production.up.railway.app');

    ws.onopen = () => {
        console.log('Conexión WebSocket establecida');
        mostrarAlertaBurbuja('Conexión en tiempo real activa', 'success');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data); // ✅ Solo intenta parsear si es JSON
            //console.log("Mensaje recibido:", data);
        } catch (error) {
            //console.log("Mensaje recibido (no JSON):", event.data);
        }
    };

    ws.onclose = () => {
        console.log('Conexión WebSocket cerrada');
        mostrarAlertaBurbuja('Conexión en tiempo real perdida', 'error');
        // Intentar reconectar después de 5 segundos
        setTimeout(conectarWebSocket, 5000);
    };
}

// Conectar al WebSocket al cargar la página
document.addEventListener('DOMContentLoaded', conectarWebSocket);

// Limpiar el intervalo cuando se descarga la página para evitar memory leaks
window.addEventListener('beforeunload', () => {
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }
});

// Exportar funciones necesarias
export { mostrarSeccion, resetearBaseDatos, generarHojaInventario };
