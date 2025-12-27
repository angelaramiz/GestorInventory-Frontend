// product-ui.js
// Funciones relacionadas con la interfaz de usuario de productos

import { mostrarMensaje } from '../utils/logs.js';

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

    import('./lotes-scanner.js').then(module => {
        console.log('Debug - Módulo lotes-scanner cargado:', module);
        if (module.manejarTipoProducto) {
            module.manejarTipoProducto(producto);
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