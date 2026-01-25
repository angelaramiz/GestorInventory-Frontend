// product-ui.js
// Funciones relacionadas con la interfaz de usuario de productos

import { mostrarMensaje } from '../utils/logs.js';

// Función global para seleccionar producto (llamada desde onclick en HTML)
window.seleccionarProducto = async function(codigo) {
    console.log(`Producto seleccionado: ${codigo}`);
    
    try {
        // Importar db y buscar el producto
        const { db } = await import('../db/db-operations.js');
        
        // Buscar en IndexedDB
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);
        
        await new Promise((resolve, reject) => {
            request.onsuccess = async () => {
                let producto = request.result;
                
                // Si no está en IndexedDB, buscar en Supabase
                if (!producto) {
                    const { getSupabase } = await import('../auth/auth.js');
                    const supabase = await getSupabase();
                    
                    const { data, error } = await supabase
                        .from('productos')
                        .select('*')
                        .like('codigo', '%' + codigo + '%')
                        .maybeSingle();
                    
                    if (data) producto = data;
                }
                
                if (producto) {
                    mostrarModalProductoSeleccionado(producto);
                } else {
                    mostrarMensaje(`Producto con código ${codigo} no encontrado`, "warning");
                }
                resolve();
            };
            
            request.onerror = () => {
                mostrarMensaje("Error al buscar el producto", "error");
                reject(request.error);
            };
        });
        
        // Limpiar resultados
        const resultadoDiv = document.getElementById("resultados");
        if (resultadoDiv) resultadoDiv.innerHTML = "";
        
    } catch (error) {
        console.error('[product-ui] Error seleccionando producto:', error);
        mostrarMensaje("Error al seleccionar el producto", "error");
    }
};

// Función para mostrar modal del producto seleccionado
function mostrarModalProductoSeleccionado(producto) {
    const html = `
        <div class="flex flex-col gap-4 max-w-md mx-auto dark-modal">
            <!-- Tarjeta del Producto -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 rounded-lg shadow-lg p-6 border-2 border-blue-300 dark:border-blue-600 dark-modal-section">
                <!-- Código de Barras -->
                <div class="bg-white dark:bg-slate-600 rounded-md p-4 mb-4 text-center border border-gray-300 dark:border-slate-500">
                    <svg id="barcode-${producto.codigo}" style="max-width: 100%;"></svg>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-2 font-mono dark-modal-text">${producto.codigo}</p>
                </div>
                
                <!-- Información del Producto -->
                <div class="space-y-3">
                    <div>
                        <label class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase dark-modal-label">Nombre</label>
                        <p class="text-lg font-bold text-gray-800 dark:text-gray-100 dark-modal-title">${producto.nombre}</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase dark-modal-label">Código</label>
                            <p class="text-sm text-gray-700 dark:text-gray-300 font-mono dark-modal-text">${producto.codigo}</p>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase dark-modal-label">Unidad</label>
                            <p class="text-sm text-gray-700 dark:text-gray-300 dark-modal-text">${producto.unidad || 'Pz'}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase dark-modal-label">Marca</label>
                            <p class="text-sm text-gray-700 dark:text-gray-300 dark-modal-text">${producto.marca || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase dark-modal-label">Categoría</label>
                            <p class="text-sm text-gray-700 dark:text-gray-300 dark-modal-text">${producto.categoria || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Detectar si está en tema oscuro
    const htmlElement = document.documentElement;
    const isDarkMode = htmlElement.classList.contains('dark') || document.body.classList.contains('dark');

    Swal.fire({
        title: '📦 Producto Seleccionado',
        html: html,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        width: '500px',
        background: isDarkMode ? '#1e293b' : '#ffffff',
        color: isDarkMode ? '#f1f5f9' : '#000000',
        customClass: {
            popup: isDarkMode ? 'swal-dark-popup' : '',
            title: isDarkMode ? 'swal-dark-title' : '',
            htmlContainer: isDarkMode ? 'swal-dark-html' : '',
            confirmButton: isDarkMode ? 'swal-dark-confirm' : '',
            cancelButton: isDarkMode ? 'swal-dark-cancel' : '',
            actions: isDarkMode ? 'swal-dark-actions' : ''
        },
        didOpen: () => {
            // Generar código de barras después de que se abre la modal
            setTimeout(() => {
                generarCodigoBarras(producto.codigo);
            }, 100);

            if (isDarkMode) {
                // Aplicar estilos inline fuertes para tema oscuro
                const popup = Swal.getPopup();
                if (popup) {
                    popup.style.backgroundColor = '#1e293b !important';
                    popup.style.color = '#f1f5f9 !important';
                    popup.style.borderRadius = '12px';
                }
                
                const title = Swal.getTitle();
                if (title) {
                    title.style.color = '#f1f5f9 !important';
                }
                
                const content = Swal.getHtmlContainer();
                if (content) {
                    content.style.color = '#f1f5f9 !important';
                }
                
                const buttons = popup.querySelectorAll('button');
                buttons.forEach(button => {
                    if (button.classList.contains('swal2-confirm')) {
                        button.style.backgroundColor = '#2563eb !important';
                        button.style.color = '#ffffff !important';
                    } else if (button.classList.contains('swal2-cancel')) {
                        button.style.backgroundColor = '#4b5563 !important';
                        button.style.color = '#ffffff !important';
                    }
                });
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Rellenar el código en el campo correspondiente según la página
            const codigoConsultaEl = document.getElementById("codigoConsulta");
            const codigoEditarEl = document.getElementById("codigoEditar");
            const codigoInventarioEl = document.getElementById("codigo");
            
            if (codigoConsultaEl) {
                codigoConsultaEl.value = producto.codigo;
            } else if (codigoEditarEl) {
                codigoEditarEl.value = producto.codigo;
                // Guardar el código original para poder actualizar después
                codigoEditarEl.setAttribute("data-codigo-original", producto.codigo);
                // En la página de editar, rellenar todos los campos del formulario
                document.getElementById("codigoEditado").value = producto.codigo;
                document.getElementById("nombreEditar").value = producto.nombre;
                document.getElementById("categoriaEditar").value = producto.categoria;
                document.getElementById("marcaEditar").value = producto.marca;
                document.getElementById("unidadEditar").value = producto.unidad || "";
                document.getElementById("formularioEdicion").style.display = "block";
            } else if (codigoInventarioEl) {
                codigoInventarioEl.value = producto.codigo;
            }
            
            mostrarMensaje(`✅ Producto confirmado: ${producto.nombre}`, "success");
        }
    });
}

// Función para generar código de barras
function generarCodigoBarras(codigo) {
    try {
        if (typeof JsBarcode !== 'undefined') {
            JsBarcode(`#barcode-${codigo}`, codigo, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: false,
                margin: 5
            });
        } else {
            console.warn('[product-ui] JsBarcode no disponible');
        }
    } catch (error) {
        console.error('[product-ui] Error generando código de barras:', error);
    }
}

// Función para mostrar resultados de búsqueda
export function mostrarResultados(resultados) {
    const resultadoDiv = document.getElementById("resultados");
    if (!resultadoDiv) {
        console.warn('[product-ui] mostrarResultados: contenedor "resultados" no encontrado');
        mostrarMensaje('Contenedor de resultados no disponible en esta vista', 'warning');
        return;
    }
    resultadoDiv.innerHTML = ""; // Limpiar resultados previos

    if (resultados && resultados.length > 0) {
        resultados.forEach(producto => {
            const productoDiv = document.createElement("div");
            productoDiv.classList.add("bg-white", "rounded-lg", "shadow-md", "p-6", "mb-4", "border", "border-gray-200", "dark-theme-card");

            productoDiv.innerHTML = `
                <h3 class="text-lg font-semibold mb-2 dark-theme-card-title">${producto.nombre}</h3>
                <div class="grid grid-cols-2 gap-2">
                    <p class="dark-theme-card-text"><strong>Código:</strong> ${producto.codigo}</p>
                    <p class="dark-theme-card-text"><strong>Categoría:</strong> ${producto.categoria || 'N/A'}</p>
                    <p class="dark-theme-card-text"><strong>Marca:</strong> ${producto.marca || 'N/A'}</p>
                    <p class="dark-theme-card-text"><strong>Unidad:</strong> ${producto.unidad || 'Pz'}</p>
                </div>
                <button class="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors" onclick="seleccionarProducto('${producto.codigo}')">
                    Seleccionar
                </button>
            `;

            resultadoDiv.appendChild(productoDiv);
        });
    } else {
        resultadoDiv.innerHTML =
            '<p class="text-red-500 dark-theme-alert-error">No se encontraron productos.</p>';
    }
}

// Función para mostrar resultados de inventario
export function mostrarResultadosInventario(resultados) {
    const resultadosDiv = document.getElementById("resultadosInventario");
    if (!resultadosDiv) {
        console.warn('[product-ui] mostrarResultadosInventario: contenedor "resultadosInventario" no encontrado');
        mostrarMensaje('Contenedor de resultados de inventario no disponible en esta vista', 'warning');
        return;
    }
    resultadosDiv.innerHTML = "";

    if (resultados.length === 0) {
        resultadosDiv.innerHTML = "<p class='text-red-500 dark-theme-alert-error'>No se encontraron productos.</p>";
        resultadosDiv.style.display = "block";
        document.getElementById("datosInventario").style.display = "none";
        return;
    }

    if (resultados.length === 1) {
        // Si solo hay un resultado, mostrar directamente el formulario de inventario
        mostrarFormularioInventario(resultados[0]);
        return; // Detener la ejecución aquí para evitar la lista de resultados
    }

    // Si hay múltiples resultados, mostrar una lista para seleccionar
    const titulo = document.createElement("h3");
    titulo.classList.add("text-xl", "font-semibold", "mb-4");
    titulo.textContent = "Seleccione un producto para inventariar:";
    resultadosDiv.appendChild(titulo);

    // Mostrar múltiples resultados con diseño mejorado
    resultados.forEach(producto => {
        const productoDiv = document.createElement("div");
        productoDiv.classList.add(
            "bg-white",
            "rounded-lg",
            "shadow-md",
            "p-6",
            "mb-4",
            "border",
            "border-gray-200",
            "cursor-pointer",
            "hover:bg-gray-100",
            "transition-colors"
        );
        productoDiv.innerHTML = `
            <h4 class="text-lg font-semibold mb-2 dark-theme-card-title">${producto.nombre}</h4>
            <div class="grid grid-cols-2 gap-2">
                <p class="dark-theme-card-text"><strong>Código:</strong> ${producto.codigo}</p>
                <p class="dark-theme-card-text"><strong>Categoría:</strong> ${producto.categoria || 'N/A'}</p>
                <p class="dark-theme-card-text"><strong>Marca:</strong> ${producto.marca || 'N/A'}</p>
                <p class="dark-theme-card-text"><strong>Unidad:</strong> ${producto.unidad || 'Pz'}</p>
            </div>
        `;
        productoDiv.addEventListener("click", () => mostrarFormularioInventario(producto));
        resultadosDiv.appendChild(productoDiv);
    });

    // Agregar botón para buscar un producto diferente
    const btnNuevaBusqueda = document.createElement("button");
    btnNuevaBusqueda.classList.add(
        "mt-4",
        "py-2",
        "px-4",
        "bg-gray-300",
        "text-gray-800",
        "rounded",
        "hover:bg-gray-400",
        "transition-colors"
    );
    btnNuevaBusqueda.textContent = "Nueva búsqueda";
    btnNuevaBusqueda.addEventListener("click", () => {
        document.getElementById("codigo").value = "";
        document.getElementById("nombreInventario").value = "";
        document.getElementById("marcaInventario").value = "";
        resultadosDiv.style.display = "none";
    });
    resultadosDiv.appendChild(btnNuevaBusqueda);

    resultadosDiv.style.display = "block";
    const datosInventario = document.getElementById("datosInventario");
    if (datosInventario) datosInventario.style.display = "none";
}

// Función para mostrar formulario de inventario
export function mostrarFormularioInventario(producto) {
    document.getElementById("resultadosInventario").style.display = "none";
    document.getElementById("datosInventario").style.display = "block";
    document.getElementById("unidadProducto").value = producto.unidad || "";
    document.getElementById("nombreProductoInventario").value = producto.nombre;
    document.getElementById("codigoProductoInventario").value = producto.codigo;

    // Verificar si es un producto tipo Kg y manejar las pestañas
    const unidad = producto.unidad || "";
    console.log('Debug - Producto mostrado:', {
        nombre: producto.nombre,
        codigo: producto.codigo,
        unidad: unidad,
        esTipoKg: unidad.toLowerCase().includes('kg')
    });

    import('../scanner/lotes-scanner.js').then(module => {
        console.log('Debug - Módulo lotes-scanner cargado:', module);
        if (module.manejarTipoProducto) {
            const unidad = producto.unidad || '';
            module.manejarTipoProducto(unidad);
        } else {
            console.warn('Debug - manejarTipoProducto no encontrado en lotes-scanner');
        }
        // Pasar los datos completos del producto al sistema de lotes
        if (module.establecerProductoActual) {
            module.establecerProductoActual(producto);
        } else {
            console.warn('Debug - establecerProductoActual no encontrado en lotes-scanner');
        }
    }).catch(error => {
        console.error('Debug - Error al cargar el módulo de lotes-scanner:', error);
    });

    // Aquí puedes añadir lógica para cargar datos de inventario existentes si es necesario
}

// Función para mostrar resultados de edición
export function mostrarResultadosEdicion(resultados) {
    const resultadosDiv = document.getElementById("resultados");
    if (!resultadosDiv) {
        console.warn('[product-ui] mostrarResultadosEdicion: contenedor "resultados" no encontrado');
        mostrarMensaje('Contenedor de resultados no disponible para edición en esta vista', 'warning');
        return;
    }
    resultadosDiv.id = "resultadosEdicion";
    resultadosDiv.classList = "container mx-auto mt-4 p-4";
    resultadosDiv.innerHTML = '<h3 class="text-xl font-semibold mb-2 dark-theme-title">Seleccione un producto para editar:</h3>';

    resultados.forEach(producto => {
        const productoDiv = document.createElement("div");
        productoDiv.classList.add("bg-white", "rounded-lg", "shadow-md", "p-6", "mb-4", "border", "border-gray-200", "dark-theme-card");
        productoDiv.innerHTML = `
            <p class="dark-theme-card-text"><strong>Código:</strong> ${producto.codigo}</p>
            <p class="dark-theme-card-text"><strong>Nombre:</strong> ${producto.nombre}</p>
            <p class="dark-theme-card-text"><strong>Marca:</strong> ${producto.marca}</p>
        `;
        productoDiv.addEventListener("click", () => {
            llenarFormularioEdicion(producto);
        });
        resultadosDiv.appendChild(productoDiv);
    });

    // Si ya hay una lista de resultados en el DOM, eliminarla antes de agregar una nueva
    const existente = document.getElementById("resultadosEdicion");
    if (existente) {
        existente.remove();
    }

    document.body.appendChild(resultadosDiv);
}

// Función para llenar formulario de edición
function llenarFormularioEdicion(producto) {
    document.getElementById("codigoEditar").setAttribute("data-codigo-original", producto.codigo); // Guardar el código original
    document.getElementById("codigoEditado").value = producto.codigo;
    document.getElementById("nombreEditar").value = producto.nombre;
    document.getElementById("categoriaEditar").value = producto.categoria;
    document.getElementById("marcaEditar").value = producto.marca;
    document.getElementById("unidadEditar").value = producto.unidad || "";
    document.getElementById("formularioEdicion").style.display = "block";
}

// Función para limpiar formulario de inventario
export function limpiarFormularioInventario() {
    if (document.getElementById("unidadProducto")) {
        document.getElementById("unidadProducto").value = "";
    }
    if (document.getElementById("codigo")) {
        document.getElementById("codigo").value = "";
    }
    if (document.getElementById("nombreInventario")) {
        document.getElementById("nombreInventario").value = "";
    }
    if (document.getElementById("cantidadTipo")) {
        document.getElementById("cantidadTipo").value = "";
    }
    if (document.getElementById("cantidad")) {
        document.getElementById("cantidad").value = "";
    }
    if (document.getElementById("fechaCaducidad")) {
        document.getElementById("fechaCaducidad").value = "";
    }
    if (document.getElementById("comentarios")) {
        document.getElementById("comentarios").value = "";
    }
    if (document.getElementById("datosInventario")) {
        document.getElementById("datosInventario").style.display = "none";
    }
}