import { db } from '../db/db-operations.js';
import { mostrarMensaje } from '../utils/logs.js';
import { mostrarResultados, mostrarResultadosInventario, mostrarResultadosEdicion, mostrarFormularioInventario } from './product-ui.js';

// Función para buscar en Supabase como fallback
async function buscarEnSupabase(codigo, nombre, marca) {
    try {
        const { getSupabase } = await import('../auth/auth.js');
        const supabase = await getSupabase();
        
        let query = supabase
            .from('productos')
            .select(`
                codigo,
                nombre,
                marca,
                unidad,
                categoria
            `);

        // Búsqueda por código usando LIKE para flexibilidad
        if (codigo) {
            query = query.like('codigo', '%' + String(codigo) + '%');
        } else if (nombre) {
            query = query.ilike('nombre', '%' + nombre + '%');
        } else if (marca) {
            query = query.ilike('marca', '%' + marca + '%');
        }

        const { data, error } = await query.limit(10);

        if (error) {
            console.warn('[product-search] Error en búsqueda Supabase:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.warn('[product-search] No se pudo conectar a Supabase:', err);
        return [];
    }
}

// Helper: detectar si estamos en la página de registro de entradas
function isRegistroEntradasView() {
    return !!(document.getElementById('codigoProducto') || document.getElementById('registrarEntrada') || document.getElementById('productForm'));
}

// Helper: cuando estamos en registro-entradas, mostrar directamente en el formulario
async function handleResultsForRegistroEntradas(resultados, callback) {
    if (!resultados || resultados.length === 0) {
        // nada que hacer
        if (callback) callback([]);
        return;
    }
    try {
        const module = await import('../core/registro-entradas-operations.js');
        const producto = resultados[0];
        if (module && module.mostrarDatosProductoEntrada) {
            module.mostrarDatosProductoEntrada(producto);
        } else {
            console.warn('[product-search] mostrarDatosProductoEntrada no disponible en registro-entradas-operations');
        }
        if (callback) callback(resultados);
    } catch (err) {
        console.error('[product-search] Error al importar registro-entradas-operations:', err);
        if (callback) callback(resultados);
    }
}

// Función para buscar por coincidencias parciales en diferentes campos
export function buscarPorCodigoParcial(codigoCorto, tipo, callback) {
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();
    request.onsuccess = function (event) {
        const productos = event.target.result || [];
        let resultados = [];

        // Verificar si la búsqueda es numérica (código) o de texto (nombre, etc.)
        const esNumerico = !isNaN(codigoCorto) && codigoCorto.trim() !== '';

        if (esNumerico) {
            // Si es numérico, buscar por códigos que contengan el número
            resultados = productos.filter(producto =>
                producto.codigo && producto.codigo.toString().includes(codigoCorto)
            );
        } else {
            // Si no es numérico, buscar por nombre o marca
            resultados = productos.filter(producto =>
                (producto.nombre && producto.nombre.toLowerCase().includes(codigoCorto.toLowerCase())) ||
                (producto.marca && producto.marca.toLowerCase().includes(codigoCorto.toLowerCase()))
            );
        }

        // Mostrar resultados según el tipo de búsqueda
        if (tipo === "Consulta") {
            if (isRegistroEntradasView()) {
                handleResultsForRegistroEntradas(resultados, callback);
            } else {
                mostrarResultados(resultados);
            }
        } else if (tipo === "Edicion") {
            // Para edición, mostrar la modal directamente del primer resultado encontrado
            if (resultados && resultados.length > 0) {
                window.seleccionarProducto(resultados[0].codigo);
            } else {
                mostrarMensaje("No se encontraron productos con ese código", "warning");
            }
        } else if (tipo === "Inventario") {
            mostrarResultadosInventario(resultados);
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

// Función para buscar producto (consulta)
export function buscarProducto(codigo, formato) {
    // Filtrar si se recibe un evento en lugar de código
    if (codigo && typeof codigo === 'object' && codigo.type) {
        // Se pasó un evento, ignorarlo y leer del DOM
        codigo = undefined;
    }

    // Preferir el `codigo` pasado por argumento si existe; solo leer del DOM si no se proporcionó
    let codigoB = (codigo !== undefined && codigo !== null && String(codigo).trim() !== '')
        ? String(codigo)
        : (document.getElementById("codigoConsulta") ? document.getElementById("codigoConsulta").value : '');
    let tipoFormato = formato || '';
    // Si no se proporcionó tipoFormato, marcar como 'manual' cuando usamos el campo del DOM
    if (!tipoFormato) {
        tipoFormato = 'manual';
    }
    console.log(`codigo: ${codigoB}, tipo de formato: ${tipoFormato}`)
    const nombreEl = document.getElementById("nombreConsulta");
    const categoriaEl = document.getElementById("categoriaConsulta");
    const nombre = nombreEl && nombreEl.value ? nombreEl.value : '';
    const categoria = categoriaEl && categoriaEl.value ? categoriaEl.value : '';

    // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
    if (codigoB.length === 4) {
        console.log(`Código de 4 dígitos detectado: ${codigoB}`);
        mostrarMensaje(`Código de 4 dígitos manual detectado: ${codigoB}`, "success");
        buscarPorCodigoParcial(codigoB, "Consulta");
        return;  // Detener la ejecución aquí para evitar la búsqueda normal
    } else if (tipoFormato === "upc_a") {
        // Para formato UPC-A, buscar directamente por el código completo
        console.log(`Código UPC-A detectado: ${codigoB}`);
        mostrarMensaje(`Código UPC-A detectado, buscando: ${codigoB}`, "success");
        buscarPorCodigoExacto(codigoB, "Consulta");
        return;
    }

    // Búsqueda normal en la base de datos
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    request.onsuccess = async function (event) {
        const productos = event.target.result || [];
        let resultados = [];

        // Filtrar por código exacto si se proporcionó
        if (codigoB) {
            resultados = productos.filter(producto => producto.codigo === codigoB);
        }

        // Si no hay resultados por código, buscar por nombre, marca o categoría
        if (resultados.length === 0) {
            resultados = productos.filter(producto => {
                const coincideNombre = nombre && producto.nombre && producto.nombre.toLowerCase().includes(nombre.toLowerCase());
                const coincideMarca = !nombre && producto.marca && producto.marca.toLowerCase().includes(codigoB.toLowerCase());
                const coincideCategoria = categoria && producto.categoria && producto.categoria.toLowerCase().includes(categoria.toLowerCase());
                return coincideNombre || coincideMarca || coincideCategoria;
            });
        }

        // Si no hay resultados en IndexedDB, buscar en Supabase
        if (resultados.length === 0) {
            console.log('[product-search] Sin resultados en IndexedDB, buscando en Supabase...');
            const resultadosSupabase = await buscarEnSupabase(codigoB, nombre, categoria);
            resultados = resultadosSupabase;
        }

        if (isRegistroEntradasView()) {
            handleResultsForRegistroEntradas(resultados, null);
        } else {
            mostrarResultados(resultados);
        }
    };

    request.onerror = function () {
        mostrarMensaje("Error al buscar en la base de datos", "error");
    };
}

// Función auxiliar para buscar por código exacto (UPC-A)
async function buscarPorCodigoExacto(codigo, tipo) {
    // Primero buscar en IndexedDB
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.getAll();

    return new Promise(async (resolve) => {
        request.onsuccess = async function (event) {
            const productos = event.target.result || [];
            let resultados = productos.filter(p => p.codigo === String(codigo));

            // Si no hay resultados, buscar en Supabase
            if (resultados.length === 0) {
                console.log('[product-search] Código no encontrado en IndexedDB, buscando en Supabase...');
                resultados = await buscarEnSupabase(codigo, '', '');
            }

            // Mostrar resultados según tipo
            if (tipo === "Consulta") {
                if (isRegistroEntradasView()) {
                    handleResultsForRegistroEntradas(resultados, null);
                } else {
                    mostrarResultados(resultados);
                }
            } else if (tipo === "Edicion") {
                mostrarResultadosEdicion(resultados);
            } else if (tipo === "Inventario") {
                mostrarResultadosInventario(resultados);
            }
            
            resolve(resultados);
        };
    });
}

// Función para buscar producto para editar
export function buscarProductoParaEditar(codigo, formato) {
    // Preferir el `codigo` pasado por argumento si existe; solo leer del DOM si no se proporcionó
    let codigoB = (codigo !== undefined && codigo !== null && String(codigo).trim() !== '')
        ? String(codigo)
        : (document.getElementById("codigoEditar") ? document.getElementById("codigoEditar").value : '');
    let tipoFormato = formato || '';
    if (!tipoFormato) {
        tipoFormato = 'manual';
    }

    if (!codigoB) {
        mostrarMensaje("Por favor ingrese un código o PLU", "warning");
        return;
    }

    console.log(`[buscarProductoParaEditar] Buscando: ${codigoB}, tipo: ${tipoFormato}`);

    // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias parciales
    if (codigoB.length === 4) {
        console.log('[buscarProductoParaEditar] Detectado código corto (4 dígitos), buscar parcial');
        buscarPorCodigoParcial(codigoB, "Edicion", (resultados) => {
            if (!resultados || resultados.length === 0) {
                // Si no hay resultados locales, buscar en Supabase
                (async () => {
                    const supabaseResults = await buscarEnSupabase(codigoB, '', '');
                    if (supabaseResults.length > 0) {
                        window.seleccionarProducto(supabaseResults[0].codigo);
                    } else {
                        mostrarMensaje(`No se encontró el producto con código ${codigoB}`, "warning");
                    }
                })();
            }
        });
        return;
    }

    // Búsqueda exacta primero en IndexedDB
    const transaction = db.transaction(["productos"], "readonly");
    const objectStore = transaction.objectStore("productos");
    const request = objectStore.get(codigoB);

    request.onsuccess = async function (event) {
        let producto = event.target.result;

        // Si no está en IndexedDB, buscar en Supabase con LIKE para flexibilidad
        if (!producto) {
            console.log('[buscarProductoParaEditar] No encontrado en IndexedDB, buscando en Supabase...');
            const resultados = await buscarEnSupabase(codigoB, '', '');
            if (resultados.length > 0) {
                producto = resultados[0];
                console.log('[buscarProductoParaEditar] Encontrado en Supabase:', producto.codigo);
            } else {
                // Si todavía no encuentra, buscar por coincidencia parcial en IndexedDB
                console.log('[buscarProductoParaEditar] No encontrado en Supabase, buscando coincidencias parciales...');
                buscarPorCodigoParcial(codigoB, "Edicion", (resultados) => {
                    if (resultados && resultados.length > 0) {
                        window.seleccionarProducto(resultados[0].codigo);
                    } else {
                        mostrarMensaje(`No se encontró el producto con código ${codigoB}`, "warning");
                    }
                });
                return;
            }
        }

        if (producto) {
            console.log('[buscarProductoParaEditar] Mostrando modal para:', producto.codigo);
            // Mostrar el modal con el producto encontrado
            window.seleccionarProducto(producto.codigo);
        } else {
            mostrarMensaje(`No se encontró el producto con código ${codigoB}`, "warning");
        }
    };

    request.onerror = function () {
        console.error('[buscarProductoParaEditar] Error al buscar en IndexedDB:', request.error);
        mostrarMensaje("Error al buscar en la base de datos", "error");
    };
}

// Función para validar código único
export function validarCodigoUnico(codigo) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);

        request.onsuccess = function () {
            const producto = request.result;
            resolve(!producto); // Retorna true si no existe (es único)
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

// Función para buscar producto en inventario
export async function buscarProductoInventario(codigo, formato) {
    let codigoBusqueda = codigo;
    let tipoFormato = formato || '';
    if (!tipoFormato || tipoFormato === '') {
        const codigoEl = document.getElementById("codigo");
        codigoBusqueda = codigoEl ? codigoEl.value : (codigoBusqueda || '');
        tipoFormato = 'manual';
    }

    const datosInvEl = document.getElementById("datosInventario");
    if (datosInvEl && datosInvEl.style) {
        datosInvEl.style.display = "none";
    }

    const nombreEl = document.getElementById("nombreInventario");
    const marcaEl = document.getElementById("marcaInventario");
    const nombre = (nombreEl && nombreEl.value) ? nombreEl.value : '';
    const marca = (marcaEl && marcaEl.value) ? marcaEl.value : '';

    try {
        // Si no hay ningún criterio de búsqueda
        if (!codigoBusqueda && !nombre && !marca) {
            mostrarMensaje("Por favor ingrese al menos un criterio de búsqueda", "warning");
            return;
        }

        // Si el usuario ingresa un código de 4 dígitos, buscar por coincidencias en códigos UPC-A
        if (codigoBusqueda.length === 4) {
            buscarPorCodigoParcial(codigoBusqueda, "Inventario");
            return;
        }

        // Buscar en productos primero
        const productosEncontrados = await buscarEnProductos(codigoBusqueda, nombre, marca);

        if (productosEncontrados.length === 0) {
            mostrarMensaje("No se encontraron productos con los criterios especificados", "warning");
            return;
        }

        if (productosEncontrados.length === 1) {
            // Si solo hay un producto, verificar si ya existe en inventario
            const producto = productosEncontrados[0];
            const inventarioExistente = await buscarEnInventario(producto.codigo, producto.nombre, producto.marca);

            if (inventarioExistente.length > 0) {
                // Mostrar modal para elegir entre modificar existente o crear nuevo lote
                mostrarModalProductoExistente(producto, inventarioExistente);
            } else {
                // Mostrar formulario directamente
                mostrarFormularioInventario(producto);
            }
        } else {
            // Si hay múltiples productos, mostrar lista para seleccionar
            mostrarResultadosInventario(productosEncontrados);
        }
    } catch (error) {
        console.error("Error en la búsqueda:", error);
        mostrarMensaje("Error al buscar el producto", "error");
    }
}

// Función para buscar en la base de datos de productos
function buscarEnProductos(codigo, nombre, marca) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const productos = event.target.result || [];
            let resultados = productos.filter(producto => {
                const coincideCodigo = codigo && producto.codigo && producto.codigo.toString().includes(codigo);
                const coincideNombre = nombre && producto.nombre && producto.nombre.toLowerCase().includes(nombre.toLowerCase());
                const coincideMarca = marca && producto.marca && producto.marca.toLowerCase().includes(marca.toLowerCase());
                return coincideCodigo || coincideNombre || coincideMarca;
            });
            resolve(resultados);
        };

        request.onerror = event => reject(event.target.error);
    });
}

// Función para buscar en la base de datos de inventario
function buscarEnInventario(codigo, nombre, marca) {
    return new Promise(async (resolve, reject) => {
        try {
            const { dbInventario } = await import('../db/db-operations.js');
            const transaction = dbInventario.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.getAll();

            request.onsuccess = event => {
                const inventario = event.target.result || [];
                let resultados = inventario.filter(item => {
                    const coincideCodigo = codigo && item.codigo && item.codigo.toString().includes(codigo);
                    const coincideNombre = nombre && item.nombre && item.nombre.toLowerCase().includes(nombre.toLowerCase());
                    const coincideMarca = marca && item.marca && item.marca.toLowerCase().includes(marca.toLowerCase());
                    return coincideCodigo || coincideNombre || coincideMarca;
                });
                resolve(resultados);
            };

            request.onerror = event => reject(event.target.error);
        } catch (err) {
            reject(err);
        }
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
            habilitarSeleccionOpciones(productosInventario);
        } else if (result.isDenied) {
            mostrarFormularioNuevoLote(productoOriginal, ultimoLote + 1);
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
            reiniciarBusqueda();
        }
    });

    const opciones = document.querySelectorAll('.producto-opcion');
    opciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            const index = opcion.getAttribute('data-index');
            mostrarFormularioModificacion(productosInventario[index]);
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
    document.getElementById("codigoProductoInventario").value = productoOriginal.codigo;
    document.getElementById("nombreProductoInventario").value = productoOriginal.nombre;

    // Mostrar la unidad del producto (corregido)
    const unidadProductoElement = document.getElementById("unidadProducto");
    unidadProductoElement.value = productoOriginal.unidad || "Pz"; // Usar value en lugar de textContent

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