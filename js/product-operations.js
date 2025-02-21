// importaciones 
import { db, dbInventario } from './db-operations.js';
import { mostrarMensaje } from './logs.js';
import { cargarDatosEnTabla } from './db-operations.js';
import { sanitizarProducto } from './sanitizacion.js';
import { getToken } from './auth.js';

//  funciones 
export function mostrarResultados(resultados) {
    const resultadoDiv = document.getElementById("resultados");
    resultadoDiv.innerHTML = ""; // Limpiar resultados previos

    if (resultados && resultados.length > 0) {
        resultados.forEach(producto => {
            if (producto) { // Verificar que producto no sea undefined
                const productoDiv = document.createElement("div");
                productoDiv.classList.add(
                    "bg-white",
                    "rounded-lg",
                    "shadow-md",
                    "p-6",
                    "mb-4",
                    "border",
                    "border-gray-200"
                );
                productoDiv.innerHTML = `
                    <h3 class="text-xl font-semibold mb-2">${producto.nombre}</h3>
                    <p><strong>Código/PLU:</strong> ${producto.codigo}</p>
                    <p><strong>Categoría:</strong> ${producto.categoria}</p>
                    <p><strong>Marca:</strong> ${producto.marca}</p>
                `;
                resultadoDiv.appendChild(productoDiv);
            } else {
                mostrarMensaje("Error al buscar en la base de datos", "error");
            }
        });
            }else {
            resultadoDiv.innerHTML =
                '<p class="text-red-500">No se encontraron productos.</p>';
        }
}


export function mostrarResultadosInventario(resultados) {
    const resultadosDiv = document.getElementById("resultadosInventario");
    resultadosDiv.innerHTML = "";

    if (resultados.length === 0) {
        resultadosDiv.innerHTML = "<p>No se encontraron productos.</p>";
        resultadosDiv.style.display = "block";
        document.getElementById("datosInventario").style.display = "none";
        return;
    }

    if (resultados.length === 1) {
        // Si solo hay un resultado, mostrar directamente el formulario de inventario
        mostrarFormularioInventario(resultados[0]);
        return;
    }

    // Mostrar múltiples resultados
    resultados.forEach(producto => {
        const productoDiv = document.createElement("div");
        productoDiv.classList.add("bg-white","rounded-lg","shadow-md","p-6","mb-4","border","border-gray-200");
        productoDiv.innerHTML = `
            <p><strong>Código:</strong> ${producto.codigo}</p>
            <p><strong>Nombre:</strong> ${producto.nombre}</p>
            <p><strong>Marca:</strong> ${producto.marca}</p>
        `;
        productoDiv.addEventListener("click", () => mostrarFormularioInventario(producto));
        resultadosDiv.appendChild(productoDiv);
    });

    resultadosDiv.style.display = "block";
    document.getElementById("datosInventario").style.display = "none";
}
// 
export function mostrarFormularioInventario(producto) {
    document.getElementById("resultadosInventario").style.display = "none";
    document.getElementById("datosInventario").style.display = "block";
    document.getElementById("unidadProducto").value = producto.unidad || "";
    document.getElementById("nombreProductoInventario").value = producto.nombre;
    document.getElementById("codigoProductoInventario").value = producto.codigo;

    // Aquí puedes añadir lógica para cargar datos de inventario existentes si es necesario
}
export function mostrarResultadosEdicion(resultados) {
    const resultadosDiv = document.getElementById("resultados");
    resultadosDiv.id = "resultadosEdicion";
    resultadosDiv.classList = "container mx-auto mt-4 p-4";
    resultadosDiv.innerHTML = '<h3 class="text-xl font-semibold mb-2">Seleccione un producto para editar:</h3>';

    resultados.forEach(producto => {
        const productoDiv = document.createElement("div");
        productoDiv.classList.add("bg-white","rounded-lg","shadow-md","p-6","mb-4","border","border-gray-200");
        productoDiv.innerHTML = `
            <p><strong>Código:</strong> ${producto.codigo}</p>
            <p><strong>Nombre:</strong> ${producto.nombre}</p>
            <p><strong>Marca:</strong> ${producto.marca}</p>
        `;
        productoDiv.addEventListener("click", () => {
            llenarFormularioEdicion(producto);
            document.body.removeChild(resultadosDiv);
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

function llenarFormularioEdicion(producto) {

    document.getElementById("codigoEditar").setAttribute("data-codigo-original", producto.codigo); // Guardar el código original
    document.getElementById("codigoEditado").value = producto.codigo;
    document.getElementById("nombreEditar").value = producto.nombre;
    document.getElementById("categoriaEditar").value = producto.categoria;
    document.getElementById("marcaEditar").value = producto.marca;
    document.getElementById("unidadEditar").value = producto.unidad || "";
    document.getElementById("formularioEdicion").style.display = "block";
}
// 
export function buscarPorCodigoParcial(codigoParcial, callback) {
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const productos = event.target.result || [];

        // Convertir códigos a string para evitar problemas con números
        const resultados = productos.filter(producto => {
            const codigo = producto.codigo;
            return codigo.includes(codigoParcial);
        });

        if (callback) {
            callback(resultados);
        } else {
            mostrarResultados(resultados);
        }
    };

    request.onerror = function () {
        mostrarMensaje("Error al buscar en la base de datos", "error");
    };
}

export async function agregarProducto(evento) {
    evento.preventDefault();

    const codigo = document.getElementById("codigoAgregar").value;
    const nombre = document.getElementById("nombre").value;
    const categoria = document.getElementById("categoria").value;
    const marca = document.getElementById("marca").value;
    const unidad = document.getElementById("unidad").value;

    const producto = { codigo, nombre, categoria, marca, unidad };

    const productosanitizado = sanitizarProducto(producto);
    console.log(productosanitizado);
    if (!productosanitizado) {
        mostrarMensaje("Error: Datos de producto invalido", "error");
        return;
    }

    const transaction = db.transaction(["productos"], "readwrite");
    const objectStore = transaction.objectStore("productos");

    // Verificar si el código ya existe
    const existe = await new Promise(resolve => {
        const req = objectStore.get(codigo);
        req.onsuccess = () => resolve(!!req.result);
    });

    if (existe) {
        mostrarMensaje("El código ya existe", "error");
        return;
    }

    // Aquí asignamos request correctamente
    const request = objectStore.put(productosanitizado);

    request.onerror = event => {
        console.error("Error al agregar producto", event.target.error);
        mostrarMensaje(
            "Error al agregar el producto. Es posible que el código ya exista.",
            "error"
        );
    };

    request.onsuccess = event => {
        console.log("Producto agregado exitosamente");
        mostrarMensaje("Producto agregado exitosamente", "success");
        document.getElementById("formAgregarProducto").reset();
    };
}
// Funciones para consulta de producto
export function buscarProducto() {
    const codigo = document.getElementById("codigoConsulta").value;
    const nombre = document.getElementById("nombreConsulta").value;
    const categoria = document.getElementById("categoriaConsulta").value;

    // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
    if (codigo.length === 4) {
        buscarPorCodigoParcial(codigo);
        return;  // Detener la ejecución aquí para evitar la búsqueda normal
    }

    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");

    if (codigo) {
        const request = objectStore.get(codigo);
        request.onsuccess = event => {
            const result = event.target.result;
            if (Array.isArray(result)) {
                mostrarResultados(result);
            } else {
                mostrarResultados([result]);
            }
        };
        request.onerror = () => {
            mostrarMensaje("Error al buscar en la base de datos", "error");
        };
    } else {
        const request = objectStore.getAll();
        request.onsuccess = event => {
            let resultados = event.target.result.filter(
                producto =>
                    (!nombre ||
                        producto.nombre.toLowerCase().includes(nombre.toLowerCase())) &&
                    (!categoria ||
                        producto.categoria.toLowerCase().includes(categoria.toLowerCase()))
            );
            mostrarResultados(resultados);
        };
        request.onerror = () => {
            mostrarMensaje("Error al buscar en la base de datos", "error");
        };
    }
}

export function buscarProductoParaEditar() {
    const codigo = document.getElementById("codigoEditar").value;

    if (codigo.length === 4) {
        buscarPorCodigoParcial(codigo, (resultados) => {
            if (resultados.length === 1) {
                llenarFormularioEdicion(resultados[0]);
            } else if (resultados.length > 1) {
                mostrarResultadosEdicion(resultados);
            } else {
                mostrarMensaje("No se encontraron productos con ese código parcial", "error");
            }
        });
        return;
    }

    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.get(codigo);

    request.onsuccess = event => {
        if (event.target.result) {
            llenarFormularioEdicion(event.target.result);
        } else {
            mostrarMensaje("Producto no encontrado", "error");
        }
    };
}
// Funciones para validar código único
export function validarCodigoUnico(codigo) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);

        request.onsuccess = function () {
            resolve(!request.result); // Resolve true si el código no existe
        };

        request.onerror = function () {
            reject("Error al validar el código.");
        };
    });
}
// Funciones para editar producto
export async function guardarCambios() {
    try {
        const codigoAntiguo = document.getElementById("codigoEditar").getAttribute("data-codigo-original"); // Código original guardado
        const codigoNuevo = document.getElementById("codigoEditado").value; // Nuevo código ingresado por el usuario
        const nombre = document.getElementById("nombreEditar").value;
        const categoria = document.getElementById("categoriaEditar").value;
        const marca = document.getElementById("marcaEditar").value;
        const unidad = document.getElementById("unidadEditar").value || "";
        // Sanitizar y validar el producto
        const productoSanitizado = sanitizarProducto({
            codigo: codigoNuevo,
            nombre: nombre,
            categoria: categoria,
            marca: marca,
            unidad: unidad
        });

        if (!productoSanitizado) {
            mostrarMensaje("Error: Datos de producto inválidos.", "error");
            return;
        }

        // Iniciar transacción
        const transaction = db.transaction(["productos"], "readwrite");
        const objectStore = transaction.objectStore("productos");

        // Actualizar el producto
        const updateRequest = objectStore.put(productoSanitizado);
        updateRequest.onsuccess = function () {
            mostrarMensaje(`Producto actualizado correctamente.\n `, "success");
            document.getElementById("formularioEdicion").style.display = "none";

            // Verificar si estamos en la página correcta antes de cargar la tabla
            if (document.getElementById("databaseBody")) {
                cargarDatosEnTabla(); // Actualizar la tabla solo si existe databaseBody
            }
        };

        updateRequest.onerror = function () {
            mostrarMensaje("Error al actualizar el producto.", "error");
        };
    } catch (error) {
        console.error("Error al editar el producto:", error);
        mostrarMensaje("Error inesperado al editar el producto.", "error");
    }
}
// Funciones para eliminar producto
export function eliminarProducto() {
    const codigo = document.getElementById("codigoEditado").value;
    const transaction = db.transaction(["productos"], "readwrite");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.delete(codigo);

    request.onsuccess = () => {
        mostrarMensaje("Producto eliminado correctamente", "success");
        document.getElementById("formularioEdicion").style.display = "none";
        cargarDatosEnTabla();
    };

    request.onerror = () => {
        mostrarMensaje("Error al eliminar el producto", "error");
    };
}
// Actualizar la función limpiarFormularioInventario
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

// funcion para guardar productos en la base de datos para inventariar
// Actualizar la función guardarInventario para manejar lote
export async function guardarInventario() {
    const codigo = document.getElementById("codigoProductoInventario")?.value;
    const lote = document.getElementById("loteInventario")?.value || "1";
    const cantidad = document.getElementById("cantidad").value;
    const comentarios = document.getElementById("comentarios").value;
    const fechaCaducidad = document.getElementById("fechaCaducidad").value;
    const unidad = document.getElementById("unidadProducto").value;

    try {
        // Validación básica
        if (!cantidad || !fechaCaducidad) {
            mostrarMensaje("Cantidad y Fecha de Caducidad son Obligatorios", "error");
            return;
        }

        // Obtener datos del producto
        const producto = await new Promise((resolve, reject) => {
            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.get(codigo);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                mostrarMensaje("Error al obtener el producto", "error");
                reject("Error en IndexedDB");
            };
        });

        if (!producto) {
            mostrarMensaje("Producto no encontrado en la base de datos", "error");
            return;
        }

        // Construir objeto de inventario
        const inventarioData = {
            id: `${codigo}-${lote}`,
            codigo: producto.codigo,
            nombre: producto.nombre,
            categoria: producto.categoria,
            marca: producto.marca,
            lote: lote,
            unidad: unidad || "Pz",
            cantidad: parseInt(cantidad),
            caducidad: String(fechaCaducidad),
            comentarios: comentarios || "N/A"
        };
        console.log(inventarioData);

        // Guardar en IndexedDB
        await new Promise((resolve, reject) => {
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.put(inventarioData);

            request.onsuccess = () => resolve();
            request.onerror = (e) => {
                mostrarMensaje("Error al guardar localmente", "error");
                reject(e.target.error);
            };
        });

        // Sincronizar con Supabase
        const token = localStorage.getItem('supabase.auth.token');      
        const supabaseResponse = await fetch(
            'https://gestorinventory-backend-production.up.railway.app/productos/inventario',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Asegurar que se usa correctamente
                },
                body: JSON.stringify({
                    ...inventarioData,
                    usuario_id: localStorage.getItem('usuario_id')
                })
            }
        );

        if (!supabaseResponse.ok) {
            if (supabaseResponse.status === 401) {
                mostrarVentanaDinamica("La sesión ha expirado. Por favor, inicia sesión nuevamente.");
            } else {
                const errorData = await supabaseResponse.json();
                mostrarMensaje(
                    `Error de sincronización: ${errorData.error || "Contacta al soporte técnico"}`,
                    "warning",
                    { timer: 3000 }
                );
            }
            return;
        }

        // Éxito completo
        mostrarMensaje(
            "Inventario guardado y sincronizado correctamente ✓",
            "success",
            { timer: 2000, showConfirmButton: false }
        );
        limpiarFormularioInventario();

    } catch (error) {
        console.error('Error en guardarInventario:', error);

        // Manejo específico de errores de sincronización
        if (error.message.includes("servidor") || error.message.includes("sincronización")) {
            mostrarMensaje(
                "Datos guardados localmente. Se sincronizarán cuando recuperes conexión",
                "warning",
                { timer: 4000 }
            );
        }

        // Mantener datos locales si es error de servidor
        if (!error.message.includes("IndexedDB")) return;

        // Revertir IndexedDB solo si el error fue local
        try {
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");
            await objectStore.delete(`${codigo}-${lote}`);
        } catch (dbError) {
            mostrarMensaje(
                "Error crítico: Contacta al soporte técnico",
                "error",
                { timer: 5000 }
            );
        }
    }
}

function mostrarVentanaDinamica(mensaje) {
    Swal.fire({
        title: 'Sesión Expirada',
        text: mensaje,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '../index.html'; // Redirigir al inicio de sesión
        }
    });
}

function agregarNuevoProductoDesdeInventario(codigo) {
    Swal.fire({
        title: 'Agregar Nuevo Producto',
        html:
            '<input id="swal-codigo" class="swal2-input" placeholder="Código" value="' + codigo + '" readonly>' +
            '<input id="swal-nombre" class="swal2-input" placeholder="Nombre">' +
            '<input id="swal-categoria" class="swal2-input" placeholder="Categorí­a">' +
            '<input id="swal-marca" class="swal2-input" placeholder="Marca">'+
            '<input id="swal-Tunidad" class="swal2-input" placeholder="Tipo-Unidad">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                codigo: document.getElementById('swal-codigo').value,
                nombre: document.getElementById('swal-nombre').value,
                categoria: document.getElementById('swal-categoria').value,
                marca: document.getElementById('swal-marca').value,
                unidad: document.getElementById('swal-Tunidad').value
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const nuevoProducto = result.value;
            agregarProductoABaseDeDatos(nuevoProducto);
        }
    });
}

export function agregarProductoABaseDeDatos(producto) {
    const transaction = db.transaction(["productos"], "readwrite");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.add(producto);

    request.onsuccess = event => {
        console.log("Producto agregado exitosamente");
        Swal.fire({
            title: "Éxito",
            text: "Producto agregado exitosamente",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            // Continuar con la logica del inventario
            mostrarFormularioInventario(producto);
        });
    };

    request.onerror = event => {
        console.error("Error al agregar producto", event.target.error);
        Swal.fire({
            title: "Error",
            text: "Error al agregar el producto. Es posible que el código ya exista.",
            icon: "error",
            timer: 2000,
            showConfirmButton: false
        });
    };
}
// Función para buscar inventario en nueva base de datos
export async function buscarProductoInventario() {
    const codigo = document.getElementById("codigo").value;
    const nombre = document.getElementById("nombreInventario").value;
    const marca = document.getElementById("marcaInventario").value;

    try {
        // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
        if (codigo.length === 4) {
            buscarPorCodigoParcial(codigo, (resultados) => {
                if (resultados.length === 0) {
                    agregarNuevoProductoDesdeInventario(codigo);
                } else {
                    mostrarResultadosInventario(resultados);
                }
            });
            return;  // Detener la ejecución aquí para evitar la búsqueda normal
        }

        // Primero buscar en la base de datos de productos
        const productosResultados = await buscarEnProductos(codigo, nombre, marca);

        if (productosResultados.length === 0) {
            // Si no se encuentra el producto, preguntar si desea agregarlo
            agregarNuevoProductoDesdeInventario(codigo);
            return;
        }

        // Si encontramos productos, buscar en inventario
        const inventarioResultados = await buscarEnInventario(codigo, nombre, marca);

        if (inventarioResultados.length > 0) {
            // Si existe en inventario, mostrar modal con opciones
            mostrarModalProductoExistente(productosResultados[0], inventarioResultados);
        } else {
            // Si no existe en inventario, mostrar resultados normales
            mostrarResultadosInventario(productosResultados);
        }
    } catch (error) {
        console.error("Error en la búsqueda:", error);
        Swal.fire({
            title: "Error",
            text: "Error al buscar el producto",
            icon: "error",
            timer: 2000
        });
    }
}

// Función para buscar en la base de datos de productos
function buscarEnProductos(codigo, nombre, marca) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const productos = event.target.result;
            const resultados = productos.filter(producto =>
                (codigo && producto.codigo === codigo) ||
                (nombre && producto.nombre.toLowerCase().includes(nombre.toLowerCase())) ||
                (marca && producto.marca.toLowerCase().includes(marca.toLowerCase()))
            );
            resolve(resultados);
        };

        request.onerror = event => reject(event.target.error);
    });
}

// Función para buscar en la base de datos de inventario
function buscarEnInventario(codigo, nombre, marca) {
    return new Promise((resolve, reject) => {
        const transaction = dbInventario.transaction(["inventario"], "readonly");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const inventario = event.target.result;
            const resultados = inventario.filter(item =>
                (codigo && item.codigo === codigo) ||
                (nombre && item.nombre.toLowerCase().includes(nombre.toLowerCase())) ||
                (marca && item.marca.toLowerCase().includes(marca.toLowerCase()))
            );
            resolve(resultados);
        };

        request.onerror = event => reject(event.target.error);
    });
}

// Función para mostrar modal cuando se encuentra un producto existente
function mostrarModalProductoExistente(productoOriginal, productosInventario) {
    const ultimoLote = obtenerUltimoLote(productosInventario);

    const productosHTML = productosInventario.map(prod => `
        <div class="border p-2 mb-2">
            <p><strong>Lote:</strong> ${prod.lote || 'N/A'}</p>
            <p><strong>Cantidad:</strong> ${prod.cantidad} - ${productoOriginal.unidad}</p>
            <p><strong>Fecha de Caducidad:</strong> ${prod.caducidad}</p>
        </div>
    `).join('');

    Swal.fire({
        title: 'Producto encontrado en inventario',
        html: `
            <div class="mb-4">
                <h3 class="text-lg font-bold">Detalles del producto:</h3>
                <p><strong>Código:</strong> ${productoOriginal.codigo}</p>
                <p><strong>Nombre:</strong> ${productoOriginal.nombre}</p>
                <p><strong>Marca:</strong> ${productoOriginal.marca}</p>
                <h3 class="text-lg font-bold mt-4">Lotes existentes:</h3>
                ${productosHTML}
            </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Modificar existente',
        denyButtonText: 'Nuevo lote',
        cancelButtonText: 'Buscar otro'
    }).then((result) => {
        if (result.isConfirmed) {
            // Modificar producto existente
            mostrarFormularioModificacion(productosInventario[0]);
        } else if (result.isDenied) {
            // Crear nuevo lote
            mostrarFormularioNuevoLote(productoOriginal, ultimoLote + 1);
        } else {
            // Buscar otro producto
            reiniciarBusqueda();
        }
    });
}

// Función para obtener el último número de lote
function obtenerUltimoLote(productosInventario) {
    return productosInventario.reduce((max, prod) => {
        const lote = parseInt(prod.lote) || 0;
        return lote > max ? lote : max;
    }, 0);
}

// Función para mostrar formulario de nuevo lote
function mostrarFormularioNuevoLote(productoOriginal, nuevoLote) {
    document.getElementById("datosInventario").style.display = "block";

    // Mantener los datos del producto original
    document.getElementById("codigo").value = productoOriginal.codigo;
    document.getElementById("nombreProductoInventario").value = productoOriginal.nombre;

    // Mostrar la unidad del producto
    const unidadProductoElement = document.getElementById("unidadProducto");
    unidadProductoElement.textContent = productoOriginal.unidad || "Pz"; // Valor por defecto si no hay unidad

    // Limpiar campos de inventario
    document.getElementById("cantidad").value = "";
    document.getElementById("fechaCaducidad").value = "";
    document.getElementById("comentarios").value = "";

    // Agregar número de lote
    const loteInput = document.createElement("input");
    loteInput.type = "hidden";
    loteInput.id = "loteInventario";
    loteInput.value = nuevoLote;

    // Remover lote anterior si existe
    const loteAnterior = document.getElementById("loteInventario");
    if (loteAnterior) {
        loteAnterior.remove();
    }

    document.getElementById("datosInventario").appendChild(loteInput);

    // Mostrar el número de lote al usuario
    Swal.fire({
        title: 'Nuevo Lote',
        text: `Creando lote #${nuevoLote}`,
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });
}


// Función para reiniciar la búsqueda
function reiniciarBusqueda() {
    document.getElementById("codigo").value = "";
    document.getElementById("nombreInventario").value = "";
    document.getElementById("marcaInventario").value = "";
    document.getElementById("datosInventario").style.display = "none";
}


// Función para mostrar formulario de modificación de inventario
function mostrarFormularioModificacion(productoInventario) {
    document.getElementById("datosInventario").style.display = "block";

    // Establecer los valores del formulario con los datos del producto existente
    document.getElementById("codigoProductoInventario").value = productoInventario.codigo;
    document.getElementById("nombreProductoInventario").value = productoInventario.nombre;
    document.getElementById("unidadProducto").value = productoInventario.unidad || "Pz";
    document.getElementById("cantidad").value = productoInventario.cantidad || "";
    document.getElementById("fechaCaducidad").value = productoInventario.caducidad || "";
    document.getElementById("comentarios").value = productoInventario.comentarios || "";

    // Agregar lote como input oculto
    const loteInput = document.createElement("input");
    loteInput.type = "hidden";
    loteInput.id = "loteInventario";
    loteInput.value = productoInventario.lote || "1";

    // Remover lote anterior si existe
    const loteAnterior = document.getElementById("loteInventario");
    if (loteAnterior) {
        loteAnterior.remove();
    }

    document.getElementById("datosInventario").appendChild(loteInput);

    // Mostrar mensaje de modificación
    Swal.fire({
        title: 'Modificar Inventario',
        text: `Modificando inventario de lote #${productoInventario.lote}`,
        icon: 'info',
        timer: 1000,
        showConfirmButton: false
    });
}
// Función para actualizar el inventario por código
export function actualizarInventarioPorCodigo(codigoAntiguo, codigoNuevo) {
    return new Promise((resolve, reject) => {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");
        const index = objectStore.index("codigo");

        const getRequest = index.getAll(codigoAntiguo);
        getRequest.onsuccess = function () {
            const registros = getRequest.result;
            registros.forEach(registro => {
                registro.codigo = codigoNuevo; // Actualizar el código
                objectStore.put(registro); // Guardar el registro actualizado
            });

            resolve();
        };

        getRequest.onerror = function () {
            reject("Error al actualizar el inventario.");
        };
    });
}
