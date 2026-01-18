// product-inventory.js
// Funciones relacionadas con operaciones de inventario

import { db, dbInventario, agregarAColaSincronizacion } from '../db/db-operations.js';
import { mostrarMensaje } from '../utils/logs.js';
import { getSupabase } from '../auth/auth.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@8.3.2/+esm';

// Función para generar un ID temporal si estás offline
function generarIdTemporal(codigo, lote) {
    return `${codigo}-${lote}-${uuidv4().slice(0, 8)}`; // Ejemplo: "123-1-abc12345"
}

// Función para guardar inventario
export async function guardarInventario() {
    // Verificar sesión antes de continuar
    const { verificarSesionValida } = await import('../auth/auth.js');
    const sesionValida = await verificarSesionValida();

    if (!sesionValida) {
        console.error('Sesión no válida al intentar guardar inventario');
        return;
    }

    const codigo = document.getElementById("codigoProductoInventario")?.value;
    const lote = document.getElementById("loteInventario")?.value || "1";
    const cantidad = document.getElementById("cantidad").value;
    const comentarios = document.getElementById("comentarios").value;
    const fechaCaducidad = document.getElementById("fechaCaducidad").value;
    const unidad = document.getElementById("unidadProducto").value;

    // Validar que cantidad sea un número válido (incluyendo decimales y cero)
    const cantidadNum = parseFloat(cantidad);
    if (isNaN(cantidadNum) || cantidadNum < 0 || !fechaCaducidad) {
        mostrarMensaje("Cantidad debe ser un número válido mayor o igual a 0 y Fecha de Caducidad es obligatoria", "error");
        return;
    }

    // Obtener datos del producto
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

    // Obtener el área_id (llave foránea) desde localStorage o consultarlo si no existe
    let area_id = localStorage.getItem('area_id');
    const ubicacionNombre = localStorage.getItem('ubicacion_almacen');

    if (!area_id) {
        if (!ubicacionNombre) {
            // Si no hay ubicación guardada, intentar obtenerla de Supabase
            try {
                const supabase = await getSupabase();
                if (supabase) {
                    const usuarioId = localStorage.getItem('usuario_id');
                    const categoriaId = localStorage.getItem('categoria_id');

                    const { data: areas, error } = await supabase
                        .from('areas')
                        .select('id, nombre')
                        .eq('categoria_id', categoriaId);

                    if (!error && areas && areas.length > 0) {
                        // Usar la primera área disponible como predeterminada
                        area_id = areas[0].id;
                        localStorage.setItem('area_id', area_id);
                        localStorage.setItem('ubicacion_almacen', areas[0].nombre);
                        console.log(`Área predeterminada guardada: ${areas[0].nombre} (${area_id})`);
                    }
                }
            } catch (error) {
                console.error("Error al obtener área predeterminada:", error);
            }
        } else {
            // Si hay ubicación pero no area_id, intentar buscar el área por nombre
            try {
                const supabase = await getSupabase();
                if (supabase) {
                    const categoriaId = localStorage.getItem('categoria_id');
                    const { data: area, error } = await supabase
                        .from('areas')
                        .select('id')
                        .eq('nombre', ubicacionNombre)
                        .eq('categoria_id', categoriaId)
                        .single();

                    if (!error && area) {
                        area_id = area.id;
                        localStorage.setItem('area_id', area_id);
                        console.log(`Area ID recuperado: ${area_id}`);
                    }
                }
            } catch (error) {
                console.error("Error al recuperar area_id:", error);
            }
        }
    }

    // Asegurarnos que tenemos un area_id (ya sea real o temporal)
    if (!area_id) {
        mostrarMensaje("No se pudo determinar el área para el inventario", "error");
        return; // No podemos continuar sin un area_id
    }

    // Generar ID para el registro de inventario
    let idBase = `${codigo}-${lote}`;
    let idFinal = navigator.onLine ? idBase : generarIdTemporal(codigo, lote);

    // Verificar si el ID ya existe en Supabase y modificar el lote si es necesario
    if (navigator.onLine) {
        let existe = true;
        let nuevoLote = parseInt(lote);

        while (existe) {
            const supabase = await getSupabase();
            const { data, error } = await supabase
                .from('inventario')
                .select('id')
                .eq('id', idFinal);

            if (error) {
                console.error("Error al verificar ID en Supabase:", error);
                break; // Salir del bucle si hay error
            }

            if (!data || data.length === 0) {
                existe = false; // El ID no existe, podemos usarlo
            } else {
                // El ID existe, incrementar el lote
                nuevoLote++;
                idFinal = `${codigo}-${nuevoLote}`;
                console.log(`ID ${idBase} ya existe, intentando con lote ${nuevoLote}: ${idFinal}`);
            }
        }
    }

    // Crear el objeto con los datos del inventario para IndexedDB (incluye areaName)
    const inventarioDataLocal = {
        id: idFinal,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        marca: producto.marca,
        lote: lote,
        unidad: unidad || "Pz",
        cantidad: parseFloat(cantidad),
        caducidad: fechaCaducidad,
        comentarios: comentarios || "N/A",
        last_modified: new Date().toISOString(),
        is_temp_id: !navigator.onLine,
        area_id: area_id, // Usar el ID del área como llave foránea
        areaName: ubicacionNombre // Guardar este campo solo para visualización local
    };

    // Crear objeto para enviar a Supabase (sin el campo areaName)
    const inventarioDataRemoto = {
        id: idFinal,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        marca: producto.marca,
        lote: lote,
        unidad: unidad || "Pz",
        cantidad: parseFloat(cantidad),
        caducidad: fechaCaducidad,
        comentarios: comentarios || "N/A",
        last_modified: new Date().toISOString(),
        is_temp_id: !navigator.onLine,
        area_id: area_id, // Usar el ID del área como llave foránea
        usuario_id: localStorage.getItem('usuario_id') // Siempre incluir el usuario_id
    };

    try {
        // Guardar en IndexedDB
        await new Promise((resolve, reject) => {
            const transaction = dbInventario.transaction(["inventario"], "readwrite");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.put(inventarioDataLocal);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });

        // Guardar en localStorage
        const inventarioLocal = cargarInventarioLocal();
        inventarioLocal.push(inventarioDataLocal);
        guardarInventarioLocal(inventarioLocal);

        // Sincronizar con Supabase
        if (navigator.onLine) {
            const supabase = await getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('inventario')
                    .upsert([inventarioDataRemoto], { onConflict: 'id' });

                if (error) {
                    console.error("Error al guardar en Supabase:", error);
                    mostrarMensaje("Inventario guardado localmente, error al sincronizar con servidor", "warning");
                    // Agregar a cola de sincronización
                    agregarAColaSincronizacion('inventario', 'insert', inventarioDataRemoto);
                } else {
                    console.log("Inventario guardado exitosamente en Supabase");
                    mostrarMensaje("Inventario guardado exitosamente", "success");
                }
            } else {
                mostrarMensaje("Inventario guardado localmente (sin conexión a servidor)", "warning");
                agregarAColaSincronizacion('inventario', 'insert', inventarioDataRemoto);
            }
        } else {
            mostrarMensaje("Inventario guardado localmente (sin conexión)", "warning");
            agregarAColaSincronizacion('inventario', 'insert', inventarioDataRemoto);
        }

        // Actualizar la tabla después de guardar el producto
        const { cargarDatosInventarioEnTablaPlantilla } = await import('../db/db-operations.js');
        cargarDatosInventarioEnTablaPlantilla();
        const { limpiarFormularioInventario } = await import('./product-ui.js');
        limpiarFormularioInventario();
    } catch (error) {
        console.error("Error al guardar el inventario:", error);
        mostrarMensaje("Error al guardar el producto en inventario", "error");
    }
}

// Función para modificar inventario
export async function modificarInventario() {
    // Verificar sesión antes de continuar
    const { verificarSesionValida } = await import('../auth/auth.js');
    const sesionValida = await verificarSesionValida();

    if (!sesionValida) {
        console.error('Sesión no válida al intentar modificar inventario');
        return;
    }

    const codigo = document.getElementById("codigoProductoInventario")?.value;
    const lote = document.getElementById("loteInventario")?.value || "1"; // Lote es parte del ID compuesto
    const cantidad = document.getElementById("cantidad").value;
    const comentarios = document.getElementById("comentarios").value;
    const fechaCaducidad = document.getElementById("fechaCaducidad").value;
    const unidad = document.getElementById("unidadProducto").value;

    if (!cantidad || !fechaCaducidad) {
        mostrarMensaje("Cantidad y Fecha de Caducidad son obligatorios", "error");
        return;
    }

    const productoInfoBase = await new Promise((resolve) => {
        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const request = objectStore.get(codigo);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });

    if (!productoInfoBase) {
        mostrarMensaje("Información base del producto no encontrada.", "error");
        return;
    }

    const idInventario = `${codigo}-${lote}`;

    console.log(`🔍 Debug - Buscando inventario:`, {
        codigo,
        lote,
        idInventario,
        timestamp: new Date().toISOString()
    });

    let registroInventarioActual = await new Promise((resolve) => {
        const transaction = dbInventario.transaction(["inventario"], "readonly");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.get(idInventario);
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            resolve(null);
        };
    });

    if (!registroInventarioActual) {
        console.error(`🔍 Debug - No se encontró registro con ID: ${idInventario}`);

        // Intentar buscar todos los registros para debug
        const todosLosRegistros = await new Promise((resolve) => {
            const transaction = dbInventario.transaction(["inventario"], "readonly");
            const objectStore = transaction.objectStore("inventario");
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });

        console.log(`🔍 Debug - Registros existentes en inventario:`,
            todosLosRegistros.map(r => ({ id: r.id, codigo: r.codigo, lote: r.lote }))
        );

        mostrarMensaje(`No se encontró el registro de inventario con ID ${idInventario} para modificar.`, "error");
        return;
    }

    const area_id_actual = registroInventarioActual.area_id;
    const areaName_actual = registroInventarioActual.areaName || localStorage.getItem('ubicacion_almacen') || 'Desconocida';

    const datosParaActualizarRemoto = {
        id: idInventario,
        codigo: productoInfoBase.codigo,
        nombre: productoInfoBase.nombre,
        categoria: productoInfoBase.categoria,
        marca: productoInfoBase.marca,
        lote: lote,
        unidad: unidad || productoInfoBase.unidad || "Pz",
        cantidad: parseFloat(cantidad),
        caducidad: fechaCaducidad,
        comentarios: comentarios || "N/A",
        last_modified: new Date().toISOString(),
        is_temp_id: false,
        area_id: area_id_actual,
        usuario_id: localStorage.getItem('usuario_id')
    };

    try {
        // Actualizar en IndexedDB
        await actualizarEnIndexedDB(datosParaActualizarRemoto);

        if (navigator.onLine) {
            const supabase = await getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('inventario')
                    .upsert([datosParaActualizarRemoto], { onConflict: 'id' });

                if (error) {
                    console.error("Error al actualizar inventario en Supabase:", error);
                    mostrarMensaje("Error al sincronizar cambios con servidor", "warning");
                    agregarAColaSincronizacion('inventario', 'update', datosParaActualizarRemoto);
                } else {
                    console.log("Inventario actualizado exitosamente en Supabase");
                    mostrarMensaje("Inventario modificado exitosamente", "success");
                }
            } else {
                mostrarMensaje("Inventario modificado localmente (sin conexión a servidor)", "warning");
                agregarAColaSincronizacion('inventario', 'update', datosParaActualizarRemoto);
            }
        } else {
            mostrarMensaje("Inventario modificado localmente (sin conexión)", "warning");
            agregarAColaSincronizacion('inventario', 'update', datosParaActualizarRemoto);
        }
    } catch (error) {
        console.error("Error general al modificar el inventario:", error);
        try {
            // Intentar rollback en IndexedDB si es necesario
            console.log("Intentando restaurar datos anteriores en IndexedDB...");
            await actualizarEnIndexedDB(registroInventarioActual);
        } catch (dbError) {
            console.error("Error al hacer rollback en IndexedDB:", dbError);
        }
    } finally {
        const { limpiarFormularioInventario } = await import('./product-ui.js');
        limpiarFormularioInventario();
        if (typeof cargarDatosInventarioEnTablaPlantilla === "function") {
            const { cargarDatosInventarioEnTablaPlantilla } = await import('../db/db-operations.js');
            cargarDatosInventarioEnTablaPlantilla();
        } else {
            console.warn("cargarDatosInventarioEnTablaPlantilla no está disponible");
        }
    }
}

// Función auxiliar para actualizar en IndexedDB
async function actualizarEnIndexedDB(data) {
    return new Promise((resolve, reject) => {
        const transaction = dbInventario.transaction(["inventario"], "readwrite");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
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

// Función para seleccionar ubicación de almacén
export async function seleccionarUbicacionAlmacen(forzarNuevaSeleccion = true) {
    return new Promise(async (resolve) => {
        try {
            // Si no se fuerza nueva selección y hay una ubicación guardada, devolverla
            if (!forzarNuevaSeleccion) {
                const ubicacionGuardada = localStorage.getItem('ubicacion_actual');
                if (ubicacionGuardada) {
                    resolve(JSON.parse(ubicacionGuardada));
                    return;
                }
            }

            // Obtener las áreas disponibles
            const { obtenerAreasPorCategoria } = await import('../db/db-operations.js');
            const areas = await obtenerAreasPorCategoria();

            if (!areas || areas.length === 0) {
                mostrarMensaje("No hay áreas disponibles para tu categoría", "error");
                resolve(null);
                return;
            }

            // Crear modal para seleccionar área
            const modal = document.createElement('div');
            modal.id = 'modal-seleccionar-area';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <h2 class="text-2xl font-bold mb-4 text-gray-800">Seleccionar Área de Trabajo</h2>
                    <p class="text-gray-600 mb-4">Por favor, selecciona el área donde trabajarás hoy:</p>
                    <div id="areas-list" class="space-y-2 mb-6 max-h-96 overflow-y-auto">
                        ${areas.map(area => `
                            <button class="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition area-btn" data-area-id="${area.id}" data-area-name="${area.nombre || area.name}">
                                <span class="font-semibold text-gray-800">${area.nombre || area.name}</span>
                                ${area.descripcion || area.description ? `<p class="text-sm text-gray-600 mt-1">${area.descripcion || area.description}</p>` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <button id="cerrar-modal-area" class="w-full py-2 px-4 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">
                        Cancelar
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
            console.log('Modal de selección de área creado y añadido al DOM');

            // Event listeners para botones de área
            const botonesArea = modal.querySelectorAll('.area-btn');
            console.log('Botones de área encontrados:', botonesArea.length);
            
            botonesArea.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    const areaId = btn.getAttribute('data-area-id');
                    const areaName = btn.getAttribute('data-area-name');
                    
                    console.log(`Área seleccionada: ${areaName} (ID: ${areaId})`);
                    
                    // Guardar en localStorage
                    localStorage.setItem('area_id', areaId);
                    localStorage.setItem('ubicacion_almacen', areaName);
                    const ubicacion = { id: areaId, nombre: areaName };
                    localStorage.setItem('ubicacion_actual', JSON.stringify(ubicacion));
                    
                    // Eliminar modal
                    modal.remove();
                    
                    // Resolver con la ubicación seleccionada
                    resolve(ubicacion);
                });
            });

            // Event listener para cerrar modal
            const cerrarBtn = modal.querySelector('#cerrar-modal-area');
            if (cerrarBtn) {
                cerrarBtn.addEventListener('click', () => {
                    console.log('Cancelando selección de área');
                    modal.remove();
                    resolve(null);
                });
            }

            // Cerrar modal si se hace clic fuera
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('Cerrando modal al hacer clic fuera');
                    modal.remove();
                    resolve(null);
                }
            });

        } catch (error) {
            console.error("Error al seleccionar ubicación:", error);
            mostrarMensaje("Error al cargar las áreas disponibles", "error");
            resolve(null);
        }
    });
}

// Función para verificar y seleccionar ubicación
export async function verificarYSeleccionarUbicacion() {
    const ubicacionActual = localStorage.getItem('ubicacion_actual');

    if (!ubicacionActual) {
        // Si no hay ubicación seleccionada, intentar seleccionar una (sin forzar si no existe aún)
        const ubicacion = await seleccionarUbicacionAlmacen(true);
        if (ubicacion) {
            localStorage.setItem('ubicacion_actual', JSON.stringify(ubicacion));
            mostrarMensaje(`Ubicación seleccionada: ${ubicacion.nombre}`, "success");
        } else {
            mostrarMensaje("Debe seleccionar una ubicación de almacén para continuar", "warning");
        }
    }
}

// Función para iniciar inventario
export async function iniciarInventario(ubicacion) {
    try {
        // Verificar que haya una ubicación válida
        if (!ubicacion) {
            mostrarMensaje("Debe seleccionar una ubicación de almacén", "error");
            return;
        }

        // Limpiar inventario anterior si existe
        localStorage.removeItem('inventario');

        // Inicializar nuevo inventario
        const inventario = {
            ubicacion: ubicacion,
            fechaInicio: new Date().toISOString(),
            productos: [],
            estado: 'activo'
        };

        localStorage.setItem('inventario', JSON.stringify(inventario));

        mostrarMensaje(`Inventario iniciado en: ${ubicacion}`, "success");

        // Aquí se podría agregar lógica adicional como:
        // - Sincronizar con Supabase
        // - Inicializar contadores
        // - Preparar interfaz de usuario

    } catch (error) {
        console.error('Error al iniciar inventario:', error);
        mostrarMensaje("Error al iniciar el inventario", "error");
    }
}