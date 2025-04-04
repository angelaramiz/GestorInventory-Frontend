// importaciones 
import { db, dbInventario, agregarAColaSincronizacion } from './db-operations.js';
import { mostrarMensaje } from './logs.js';
import { cargarDatosEnTabla, obtenerUbicacionEnUso, sincronizarInventarioDesdeSupabase, cargarDatosInventarioEnTablaPlantilla } from './db-operations.js';
import { sanitizarProducto, sanitizarEntrada } from './sanitizacion.js';
import { supabase } from './auth.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@8.3.2/+esm'; // Usar UUID para IDs únicos
import { mostrarUbicacionActual } from './main.js';
// Función para generar un ID temporal si estás offline
function generarIdTemporal(codigo, lote) {
    return `${codigo}-${lote}-${uuidv4().slice(0, 8)}`; // Ejemplo: "123-1-abc12345"
}

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
    } else {
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
        return; // Detener la ejecución aquí para evitar la lista de resultados
    }

    // Mostrar múltiples resultados
    resultados.forEach(producto => {
        const productoDiv = document.createElement("div");
        productoDiv.classList.add("bg-white", "rounded-lg", "shadow-md", "p-6", "mb-4", "border", "border-gray-200");
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
        productoDiv.classList.add("bg-white", "rounded-lg", "shadow-md", "p-6", "mb-4", "border", "border-gray-200");
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
export function buscarPorCodigoParcial(codigoParcial, Tipo, callback) {
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const productos = event.target.result || [];

        // Convertir códigos a string para evitar problemas con números
        const resultados = productos.filter(producto => {
            const code = String(producto.codigo); // Asegurarse de que el código sea una cadena de texto
            return code.includes(codigoParcial);
        });

        if (Tipo == "Consulta") {
            mostrarResultados(resultados);
        } else if (Tipo == "inventario") {
            if (resultados.length === 0) {
                if (codigoParcial.length === 4) {
                    mostrarMensaje("No se encontraron productos con ese código de 4 dígitos\n ingresa un código largo o agrega el producto", "error");
                    Swal.fire({
                        title: 'Agregar Nuevo Producto',
                        text: "¿Deseas agregar un nuevo producto con el código completo?",
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Agregar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            agregarNuevoProductoDesdeInventario(codigoParcial, true); // Permitir modificar el código
                        }
                    });
                } else {
                    agregarNuevoProductoDesdeInventario(codigoParcial); // Agregar nuevo producto
                }
            } else {
                mostrarResultadosInventario(resultados);
            }
        } else {
            mostrarResultadosEdicion(resultados);
        }

        // Llamar al callback si está definido
        if (callback) {
            callback(resultados);
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

    request.onsuccess = async () => {
        console.log("Producto agregado exitosamente");
        mostrarMensaje("Producto agregado exitosamente", "success");
        document.getElementById("formAgregarProducto").reset();

        // Obtener la categoría del usuario
        const categoriaId = localStorage.getItem('categoria_id');

        // Subir el producto a Supabase
        if (navigator.onLine) {
            const { error } = await supabase
                .from('productos')
                .insert({ ...productosanitizado, categoria_id: categoriaId, usuario_id: localStorage.getItem('usuario_id') });
            if (error) {
                console.error("Error al sincronizar con Supabase:", error);
                mostrarMensaje("Error al sincronizar con Supabase", "error");
            } else {
                mostrarMensaje("Producto sincronizado exitosamente con Supabase", "success");
            }
        } else {
            mostrarMensaje("Producto guardado localmente. Se sincronizará cuando haya conexión.", "info");
        }
    };
}
// Funciones para consulta de producto
export function buscarProducto() {
    const codigo = document.getElementById("codigoConsulta").value.toString();
    const nombre = document.getElementById("nombreConsulta").value;
    const categoria = document.getElementById("categoriaConsulta").value;

    // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
    if (codigo.length === 4) {
        buscarPorCodigoParcial(codigo, "Consulta");
        return;  // Detener la ejecución aquí para evitar la búsqueda normal
    } else if (codigo.length === 12 || codigo.length >= 14) {
        const codigoSanitizado = sanitizarEntrada(codigo);
        mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
        console.log('codigo:', codigoSanitizado)
        const codigoCorto = codigoSanitizado.replace(/^0+/, '');

        // Expresión regular para capturar los 4 dígitos después del primer "2"
        const regex = /2(\d{4})/;
        const match = codigoCorto.match(regex);

        if (match) {
            const codigoParcial = match[1]; // Extraer los 4 dígitos capturados
            mostrarMensaje(`Código parcial extraído: ${codigoParcial}`, "info");
            buscarPorCodigoParcial(codigoParcial, "Consulta");
        } else {
            mostrarMensaje("No se encontraron 4 dígitos después del primer '2'.", "warning");
        }
        return; // Detener la ejecución aquí para evitar la búsqueda normal
    } else {
        const codigoSanitizado = sanitizarEntrada(codigo);
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const codigoM = codigoSanitizado.replace(/^0+/, '');
        if (codigoM) {
            const request = objectStore.get(codigoM);
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
}

export function buscarProductoParaEditar() {
    const codigo = document.getElementById("codigoEditar").value;

    if (codigo.length === 4) {
        buscarPorCodigoParcial(codigo, "Consulta");
        return;
    } else if (codigo.length === 12 || codigo.length >= 14) {
        const codigoSanitizado = sanitizarEntrada(codigo);
        mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
        console.log('codigo:', codigoSanitizado)
        const codigoCorto = codigoSanitizado.replace(/^0+/, '');

        // Expresión regular para capturar los 4 dígitos después del primer "2"
        const regex = /2(\d{4})/;
        const match = codigoCorto.match(regex);

        if (match) {
            const codigoParcial = match[1]; // Extraer los 4 dígitos capturados
            mostrarMensaje(`Código parcial extraído: ${codigoParcial}`, "info");
            buscarPorCodigoParcial(codigoParcial);
        } else {
            mostrarMensaje("No se encontraron 4 dígitos después del primer '2'.", "warning");
        }
        return; // Detener la ejecución aquí para evitar la búsqueda normal
    } else {
        const codigoSanitizado = sanitizarEntrada(codigo);
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const codigoM = codigoSanitizado.replace(/^0+/, '');
        const request = objectStore.get(codigoM);

        request.onsuccess = event => {
            if (event.target.result) {
                llenarFormularioEdicion(event.target.result);
            } else {
                mostrarMensaje("Producto no encontrado", "error");
            }
        };
    }
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

        // Subir los cambios a Supabase
        const { error } = await supabase
            .from('productos')
            .update({
                codigo: codigoNuevo,
                nombre: nombre,
                categoria: categoria,
                marca: marca,
                unidad: unidad
            })
            .eq('codigo', codigoAntiguo);

        if (error) {
            console.error("Error al actualizar el producto en Supabase:", error);
            mostrarMensaje("Error al actualizar el producto en Supabase.", "error");
            return;
        }

        mostrarMensaje(`Producto actualizado correctamente en Supabase.`, "success");
        document.getElementById("formularioEdicion").style.display = "none";

        // Verificar si estamos en la página correcta antes de cargar la tabla
        if (document.getElementById("databaseBody")) {
            cargarDatosEnTabla(); // Actualizar la tabla solo si existe databaseBody
        }
    } catch (error) {
        console.error("Error al editar el producto:", error);
        mostrarMensaje("Error inesperado al editar el producto.", "error");
    }
}
// Funciones para eliminar producto
export async function eliminarProducto() {
    const codigo = document.getElementById("codigoEditado").value;
    
    // Confirmar con el usuario antes de eliminar
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a eliminar el producto con código: ${codigo}. Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!confirmacion.isConfirmed) {
        return; // Si el usuario cancela, detener la operación
    }
    
    try {
        // Eliminar de IndexedDB
        const transaction = db.transaction(["productos"], "readwrite");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.delete(codigo);
        
        request.onsuccess = async () => {
            // Si hay conexión, eliminar también de Supabase
            if (navigator.onLine) {
                const { error } = await supabase
                    .from('productos')
                    .delete()
                    .eq('codigo', codigo);
                
                if (error) {
                    console.error("Error al eliminar producto de Supabase:", error);
                    mostrarMensaje("Producto eliminado localmente pero hubo un error al sincronizar con Supabase", "warning");
                } else {
                    mostrarMensaje("Producto eliminado correctamente de la base de datos local y Supabase", "success");
                }
            } else {
                mostrarMensaje("Producto eliminado localmente. Se sincronizará cuando haya conexión.", "info");
                // Aquí podrías agregar la eliminación a una cola de sincronización
            }
            
            document.getElementById("formularioEdicion").style.display = "none";
            cargarDatosEnTabla();
        };
        
        request.onerror = () => {
            mostrarMensaje("Error al eliminar el producto de la base de datos local", "error");
        };
    } catch (error) {
        console.error("Error en el proceso de eliminación:", error);
        mostrarMensaje("Ocurrió un error durante el proceso de eliminación", "error");
    }
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
// Mapeo de nombres de ubicaciones a sus IDs
//remmplazar por consulta dinamica a la base de dts
const ubicaciones = {
    'cámara fría': '10000000-0000-0000-0000-000000000001',
    'congelador interior': '10000000-0000-0000-0000-000000000002',
    'bunker': '10000000-0000-0000-0000-000000000003',
    'rishin': '10000000-0000-0000-0000-000000000004',
    'piso': '10000000-0000-0000-0000-000000000005'
};

// Función para guardar productos en la base de datos para inventariar
export async function guardarInventario() {
    const codigo = document.getElementById("codigoProductoInventario")?.value;
    const lote = document.getElementById("loteInventario")?.value || "1";
    const cantidad = document.getElementById("cantidad").value;
    const comentarios = document.getElementById("comentarios").value;
    const fechaCaducidad = document.getElementById("fechaCaducidad").value;
    const unidad = document.getElementById("unidadProducto").value;

    if (!cantidad || !fechaCaducidad) {
        mostrarMensaje("Cantidad y Fecha de Caducidad son obligatorios", "error");
        return;
    }

    const producto = await new Promise((resolve) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);
        request.onsuccess = () => resolve(request.result);
    });

    if (!producto) {
        mostrarMensaje("Producto no encontrado", "error");
        return;
    }

    // Obtener la ID de la ubicación actual desde Supabase
    const ubicacionNombre = localStorage.getItem('ubicacion_almacen');
    let ubicacionId;
    
    // Consultar la ID de ubicación directamente desde Supabase
    if (navigator.onLine) {
        const { data, error } = await supabase
            .from('areas')
            .select('id')
            .ilike('nombre', ubicacionNombre)
            .single();
            
        if (error || !data) {
            console.error("Error al obtener la ID de ubicación:", error);
            mostrarMensaje("Error al obtener la ID de ubicación. Usando ID temporal.", "warning");
            ubicacionId = `temp-${ubicacionNombre}-${Date.now()}`;
        } else {
            ubicacionId = data.id;
        }
    } else {
        // Si está offline, usar un ID temporal para la ubicación
        mostrarMensaje("Sin conexión, usando ID temporal para la ubicación", "info");
        ubicacionId = `temp-${ubicacionNombre}-${Date.now()}`;
    }

    let idBase = `${codigo}-${lote}`;
    let idFinal = navigator.onLine ? idBase : generarIdTemporal(codigo, lote);

    // Verificar si el ID ya existe en Supabase y modificar el lote si es necesario
    if (navigator.onLine) {
        let existe = true;
        let nuevoLote = parseInt(lote);

        while (existe) {
            const { data, error } = await supabase
                .from('inventario')
                .select('id')
                .eq('id', idFinal);

            if (error) {
                console.error("Error al verificar ID en Supabase:", error);
                mostrarMensaje("Error al verificar ID en Supabase", "error");
                return;
            }

            if (data.length === 0) {
                existe = false;
            } else {
                nuevoLote++;
                idBase = `${codigo}-${nuevoLote}`;
                idFinal = navigator.onLine ? idBase : generarIdTemporal(codigo, nuevoLote);
            }
        }
    }

    const inventarioData = {
        id: idFinal,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        marca: producto.marca,
        lote: idBase.split('-')[1],
        unidad: unidad || "Pz",
        cantidad: parseInt(cantidad),
        caducidad: fechaCaducidad,
        comentarios: comentarios || "N/A",
        last_modified: new Date().toISOString(),
        is_temp_id: !navigator.onLine,
        area_id: ubicacionId
    };

    // Guardar en IndexedDB
    await new Promise((resolve) => {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.add(inventarioData);
        request.onsuccess = () => resolve();
    });

    // Guardar en localStorage
    const inventarioLocal = cargarInventarioLocal();
    inventarioLocal.push(inventarioData);
    guardarInventarioLocal(inventarioLocal);

    // Sincronizar con Supabase
    if (navigator.onLine) {
        const { error } = await supabase
            .from('inventario')
            .insert({ ...inventarioData, usuario_id: localStorage.getItem('usuario_id') });
        if (error) {
            console.error("Error al sincronizar con Supabase:", error);
            mostrarMensaje("Error al sincronizar con Supabase", "error");
        } else {
            mostrarMensaje("Producto guardado y sincronizado exitosamente", "success");
        }
    } else {
        mostrarMensaje("Producto guardado localmente. Se sincronizará cuando hay conexión.", "info");
    }

    // Actualizar la tabla después de guardar el producto
    cargarDatosInventarioEnTablaPlantilla();
    limpiarFormularioInventario();
}

export async function modificarInventario() {
    const codigo = document.getElementById("codigoProductoInventario")?.value;
    const lote = document.getElementById("loteInventario")?.value || "1";
    const cantidad = document.getElementById("cantidad").value;
    const comentarios = document.getElementById("comentarios").value;
    const fechaCaducidad = document.getElementById("fechaCaducidad").value;
    const unidad = document.getElementById("unidadProducto").value;

    if (!cantidad || !fechaCaducidad) {
        mostrarMensaje("Cantidad y Fecha de Caducidad son obligatorios", "error");
        return;
    }

    const producto = await new Promise((resolve) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);
        request.onsuccess = () => resolve(request.result);
    });

    if (!producto) {
        mostrarMensaje("Producto no encontrado", "error");
        return;
    }

    const idBase = `${codigo}-${lote}`;
    const idFinal = navigator.onLine ? idBase : generarIdTemporal(codigo, lote);

    const inventarioData = {
        id: idFinal,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        marca: producto.marca,
        lote: lote,
        unidad: unidad || "Pz",
        cantidad: parseInt(cantidad),
        caducidad: fechaCaducidad,
        comentarios: comentarios || "N/A",
        last_modified: new Date().toISOString(),
        is_temp_id: !navigator.onLine,
    };

    // Actualizar en IndexedDB
    await new Promise((resolve) => {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.put(inventarioData);
        request.onsuccess = () => resolve();
    });

    // Sincronizar con Supabase
    if (navigator.onLine) {
        const { error } = await supabase
            .from('inventario')
            .upsert({ ...inventarioData, usuario_id: localStorage.getItem('usuario_id') });
        if (error) {
            agregarAColaSincronizacion(inventarioData);
            mostrarMensaje("Actualizado localmente, sincronizará cuando haya conexión", "warning");
        } else {
            mostrarMensaje("Inventario modificado y sincronizado", "success");
        }
    } else {
        agregarAColaSincronizacion(inventarioData);
        mostrarMensaje("Actualizado localmente, sincronizará cuando haya conexión", "warning");
    }

    limpiarFormularioInventario();
}

// Función para buscar inventario en nueva base de datos
export async function buscarProductoInventario() {
    document.getElementById("datosInventario").style.display = "none";
    const codigo = document.getElementById("codigo").value;
    const nombre = document.getElementById("nombreInventario").value;
    const marca = document.getElementById("marcaInventario").value;

    try {
        // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
        if (codigo.length === 4) { // Código PLU
            buscarPorCodigoParcial(codigo, "inventario", async (resultados) => {
                if (resultados.length > 0) {
                    const inventarioResultados = await buscarEnInventario(resultados[0].codigo);
                    console.log('si hay productos existentes')
                    if (inventarioResultados.length > 0) {
                        // Si existe en inventario, mostrar modal con opciones
                        mostrarModalProductoExistente(resultados[0], inventarioResultados);
                    } else {
                        // Si no existe en inventario, mostrar formulario para agregar producto
                        mostrarFormularioInventario(resultados[0]);
                    }
                } else {
                    mostrarMensaje("No se encontraron productos con ese código de 4 dígitos\n ingresa un código largo o agrega el producto", "error");
                }
            });
            return;  // Detener la ejecución aquí para evitar la búsqueda normal
        } else if (codigo.length === 12) { // Código UPC-A
            
            const codigoSanitizado = sanitizarEntrada(codigo);
            mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
            const codigoCorto = codigoSanitizado.replace(/^0+/, '');

            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.getAll();

            request.onsuccess = async (event) => {
                const productos = event.target.result || [];
                const resultados = productos.filter(producto => producto.codigo === codigoCorto);

                if (resultados.length > 0) {
                    const inventarioResultados = await buscarEnInventario(resultados[0].codigo);

                    if (inventarioResultados.length > 0) {
                        // Si existe en inventario, mostrar modal con opciones
                        mostrarModalProductoExistente(resultados[0], inventarioResultados);
                    } else {
                        // Si no existe en inventario, mostrar formulario para agregar producto
                        mostrarFormularioInventario(resultados[0]);
                    }
                } else {
                    // Si no se encuentra el producto, preguntar si desea agregarlo
                    Swal.fire({
                        title: 'Producto no encontrado',
                        text: '¿Deseas agregar este producto al inventario?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Agregar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            agregarNuevoProductoDesdeInventario(codigoCorto, true); // Permitir modificar el código
                        }
                    });
                }
            };

            request.onerror = () => {
                mostrarMensaje("Error al buscar en la base de datos", "error");
            };

            return; // Detener la ejecución aquí para evitar la búsqueda normal

        } else if (codigo.length >= 14) { // Codigo code128
            const codigoSanitizado = sanitizarEntrada(codigo);
            mostrarMensaje(`Código escaneado: ${codigoSanitizado}`, "info");
            console.log('codigo:', codigoSanitizado)
            const codigoCorto = codigoSanitizado.replace(/^0+/, '');

            // Expresión regular para capturar los 4 dígitos después del primer "2"
            const regex = /2(\d{4})/;
            const match = codigoCorto.match(regex);

            if (match) {
                const codigoParcial = match[1]; // Extraer los 4 dígitos capturados
                mostrarMensaje(`Código parcial extraído: ${codigoParcial}`, "info");
                buscarPorCodigoParcial(codigoParcial, "inventario", async (resultados) => {
                    if (resultados.length > 0) {
                        const inventarioResultados = await buscarEnInventario(resultados[0].codigo);

                        if (inventarioResultados.length > 0) {
                            // Si existe en inventario, mostrar modal con opciones
                            mostrarModalProductoExistente(resultados[0], inventarioResultados);
                        } else {
                            // Si no existe en inventario, mostrar formulario para agregar producto
                            mostrarFormularioInventario(resultados[0]);
                        }
                    } else {
                        mostrarMensaje("No se encontraron productos con ese código de 4 dígitos\n ingresa un código largo o agrega el producto", "error");
                    }
                });
            }
            return; // Detener la ejecución aquí para evitar la búsqueda normal
        } else if (codigo.length === 13) { // Código EAN-13
            // Primero buscar en la base de datos de productos
            const productosResultados = await buscarEnProductos(codigo, nombre, marca);

            if (productosResultados.length === 0) {
                Swal.fire({
                    title: 'Producto no encontrado',
                    text: '¿Deseas agregar este producto al inventario?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Agregar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        agregarNuevoProductoDesdeInventario(codigo, true); // Permitir modificar el código
                    }
                });
                return;
            }

            // Si encontramos productos, buscar en inventario
            const inventarioResultados = await buscarEnInventario(codigo, nombre, marca);

            if (inventarioResultados.length > 0) {
                // Si existe en inventario, mostrar modal con opciones
                mostrarModalProductoExistente(productosResultados[0], inventarioResultados);
            } else {
                // Si no existe en inventario, mostrar formulario para agregar producto
                mostrarFormularioInventario(productosResultados[0]);
            }
        } else if (nombre || marca) { // Busqueda por nombre o marca
            const transaction = db.transaction(["productos"], "readonly");
            const objectStore = transaction.objectStore("productos");
            const request = objectStore.getAll();

            request.onsuccess = event => {
                const productos = event.target.result;
                const resultados = productos.filter(producto =>
                    producto.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
                    (marca && producto.marca.toLowerCase().includes(marca.toLowerCase()))
                );
                if (resultados.length > 0) {
                    mostrarResultados(resultados);
                } else {
                    mostrarMensaje("No se encontraron productos con ese nombre o marca.", "error");
                }
            };

            request.onerror = () => {
                mostrarMensaje("Error al buscar en la base de datos", "error");
            };
        } else {
            mostrarMensaje("Código inválido.\n vuelve a buscar/ escanear", "error");
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

    const productosHTML = productosInventario.map((prod, index) => `
        <div class="border p-2 mb-2 producto-opcion" data-index="${index}">
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
            // Habilitar selección de opciones existentes
            habilitarSeleccionOpciones(productosInventario);
        } else if (result.isDenied) {
            // Crear nuevo lote
            mostrarFormularioNuevoLote(productoOriginal, ultimoLote + 1);
        } else {
            // Buscar otro producto
            reiniciarBusqueda();
        }
    });
}

function habilitarSeleccionOpciones(productosInventario) {
    const productosHTML = productosInventario.map((prod, index) => `
        <div class="border p-2 mb-2 producto-opcion cursor-pointer hover:bg-gray-200" data-index="${index}">
            <p><strong>Lote:</strong> ${prod.lote || 'N/A'}</p>
            <p><strong>Cantidad:</strong> ${prod.cantidad} - ${prod.unidad}</p>
            <p><strong>Fecha de Caducidad:</strong> ${prod.caducidad}</p>
        </div>
    `).join('');

    Swal.fire({
        title: 'Selecciona una opción',
        html: `
            <div class="mb-4">
                <h3 class="text-lg font-bold">Detalles del producto:</h3>
                <h3 class="text-lg font-bold mt-4">Lotes existentes:</h3>
                ${productosHTML}
            </div>
        `,
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
            // Si se cancela, volver a mostrar el modal original
            mostrarModalProductoExistente(productosInventario[0], productosInventario);
        }
    });

    const opciones = document.querySelectorAll('.producto-opcion');
    opciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            const index = opcion.getAttribute('data-index');
            mostrarFormularioModificacion(productosInventario[index]);
            Swal.close(); // Cerrar el modal después de seleccionar una opción
        });
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
    document.getElementById("botonguardar").style.display = "none";
    document.getElementById("botonmodificar").style.display = "block";


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

// Función para solicitar al usuario la selección de ubicación
export async function seleccionarUbicacionAlmacen() {
    const { value: ubicacion } = await Swal.fire({
        title: 'Seleccione la ubicación de almacén',
        input: 'select',
        inputOptions: {
            'cámara fría': 'Cámara Fría',
            'congelador interior': 'Congelador de Carnes Interior',
            'bunker': 'Congelador de Piso "Bunker"',
            'rishin': 'Congelador de Piso "Rishin"',
            'piso': 'Piso'
        },
        inputPlaceholder: 'Seleccione una opción',
        showCancelButton: true
    });
    await sincronizarInventarioDesdeSupabase(ubicacion);
    return ubicacion; // Puede ser undefined si se cancela
}


// Función para agregar un nuevo producto desde el inventario
export async function agregarNuevoProductoDesdeInventario(codigo, permitirModificarCodigo = false) {
    const { value: formValues } = await Swal.fire({
        title: 'Agregar Nuevo Producto',
        html: `
            <input id="swal-input1" class="swal2-input" placeholder="Nombre del Producto">
            <input id="swal-input2" class="swal2-input" placeholder="Categoría">
            <input id="swal-input3" class="swal2-input" placeholder="Marca">
            <input id="swal-input4" class="swal2-input" placeholder="Unidad">
            ${permitirModificarCodigo ? `<input id="swal-input5" class="swal2-input" placeholder="Código" value="${codigo}">` : ''}
        `,
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value,
                document.getElementById('swal-input3').value,
                document.getElementById('swal-input4').value,
                permitirModificarCodigo ? document.getElementById('swal-input5').value : codigo
            ];
        }
    });

    if (formValues) {
        const [nombre, categoria, marca, unidad, codigoFinal] = formValues;
        const producto = { codigo: codigoFinal, nombre, categoria, marca, unidad };

        const productosanitizado = sanitizarProducto(producto);
        if (!productosanitizado) {
            mostrarMensaje("Error: Datos de producto inválidos", "error");
            return;
        }

        const transaction = db.transaction(["productos"], "readwrite");
        const objectStore = transaction.objectStore("productos");

        // Verificar si el código ya existe
        const existe = await new Promise(resolve => {
            const req = objectStore.get(codigoFinal);
            req.onsuccess = () => resolve(!!req.result);
        });

        if (existe) {
            mostrarMensaje("El código ya existe", "error");
            return;
        }

        const request = objectStore.put(productosanitizado);

        request.onerror = event => {
            console.error("Error al agregar producto", event.target.error);
            mostrarMensaje("Error al agregar el producto. Es posible que el código ya exista.", "error");
        };

        request.onsuccess = async () => {
            console.log("Producto agregado exitosamente a IndexedDB");
            mostrarMensaje("Producto agregado exitosamente a IndexedDB", "success");

            // Obtener la categoría y usuario del almacenamiento local
            const categoriaId = localStorage.getItem('categoria_id');
            const usuarioId = localStorage.getItem('usuario_id');

            // Subir el producto a Supabase
            if (navigator.onLine) {
                const { error } = await supabase
                    .from('productos')
                    .insert({ ...productosanitizado, categoria_id: categoriaId, usuario_id: usuarioId });
                if (error) {
                    console.error("Error al sincronizar con Supabase:", error);
                    mostrarMensaje("Error al sincronizar con Supabase", "error");
                } else {
                    mostrarMensaje("Producto sincronizado exitosamente con Supabase", "success");
                }
            } else {
                mostrarMensaje("Producto guardado localmente. Se sincronizará cuando haya conexión.", "info");
            }
        };
    }
}

export async function verificarYSeleccionarUbicacion() {
    const ubicacionGuardada = await obtenerUbicacionEnUso();

    if (!ubicacionGuardada) {
        const { value: ubicacionSeleccionada } = await Swal.fire({
            title: 'Selecciona una ubicación',
            input: 'select',
            inputOptions: {
                'Rishin': 'Rishin',
                'Bunker': 'Bunker',
                'Congelador de Carnes Interior': 'Congelador de Carnes Interior',
                'Cámara Fría': 'Cámara Fría',
                'Piso': 'Piso'
            },
            inputPlaceholder: 'Selecciona una ubicación',
            showCancelButton: false,
            inputValidator: (value) => {
                if (!value) return 'Debes seleccionar una ubicación';
            }
        });

        localStorage.setItem('ubicacion_almacen', ubicacionSeleccionada);
        sessionStorage.setItem("ubicacion_seleccionada", "true");
        mostrarUbicacionActual();
    }
}

// Función de ejemplo para iniciar inventario con la ubicación dada
export function iniciarInventario(ubicacion) {
    // Almacena la ubicación seleccionada en una variable o en el estado de la aplicación
    localStorage.setItem('ubicacion_almacen', ubicacion);
    // Continúa con la carga de inventario filtrando según la ubicación
    console.log("Iniciando inventario para la ubicación:", ubicacion);
    // Aquí puedes hacer la consulta a Supabase filtrando por 'ubicacion_almacen'
}

// Función para guardar el inventario en el almacenamiento local
function guardarInventarioLocal(inventario) {
    localStorage.setItem('inventario', JSON.stringify(inventario));
}

// Función para cargar el inventario desde el almacenamiento local
function cargarInventarioLocal() {
    const inventario = localStorage.getItem('inventario');
    return inventario ? JSON.parse(inventario) : [];
}