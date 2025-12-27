// product-crud.js
// Funciones CRUD para productos (Crear, Leer, Actualizar, Eliminar)

import { db } from '../db/db-operations.js';
import { mostrarMensaje } from '../utils/logs.js';
import { sanitizarProducto } from '../utils/sanitizacion.js';
import { getSupabase } from '../auth/auth.js';
import { BASE_URL } from '../core/configuraciones.js';

// Función para agregar producto
export async function agregarProducto(evento) {
    evento.preventDefault();

    const codigo = document.getElementById("codigoAgregar").value;
    const nombre = document.getElementById("nombre").value;
    const categoria = document.getElementById("categoria").value;
    const marca = document.getElementById("marca").value;
    const unidad = document.getElementById("unidad").value;
    const productoPrimario = document.getElementById("producto-primario")?.value || null;

    const producto = { codigo, nombre, categoria, marca, unidad };

    const productosanitizado = sanitizarProducto(producto);
    console.log(productosanitizado);
    if (!productosanitizado) {
        mostrarMensaje("Error: Datos de producto invalido", "error");
        return;
    }

    const transaction = db.transaction(["productos"], "readwrite");
    const objectStore = transaction.objectStore("productos");

    // Verificar si el código ya existe (usar el código sanitizado para evitar discrepancias)
    const codigoBuscado = productosanitizado.codigo;
    const existe = await new Promise(resolve => {
        const req = objectStore.get(codigoBuscado);
        req.onsuccess = () => {
            resolve(!!req.result);
        };
    });

    if (existe) {
        mostrarMensaje("El código ya existe", "error");
        return;
    }

    // Verificar si el producto primario existe (si se proporcionó)
    if (productoPrimario && productoPrimario.trim() !== '') {
        const productoPrimarioExiste = await new Promise(resolve => {
            const req = objectStore.get(productoPrimario);
            req.onsuccess = () => {
                resolve(!!req.result);
            };
        });

        if (!productoPrimarioExiste) {
            mostrarMensaje("El producto primario especificado no existe", "error");
            return;
        }
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
            try {
                const supabase = await getSupabase();
                if (supabase) {
                    const { error } = await supabase
                        .from('productos')
                        .insert([{
                            codigo: productosanitizado.codigo,
                            nombre: productosanitizado.nombre,
                            categoria: productosanitizado.categoria,
                            marca: productosanitizado.marca,
                            unidad: productosanitizado.unidad,
                            categoria_id: categoriaId,
                            usuario_id: localStorage.getItem('usuario_id')
                        }]);

                    if (error) {
                        console.error("Error al subir producto a Supabase:", error);
                        mostrarMensaje("Producto guardado localmente, pero error al sincronizar con servidor", "warning");
                    } else {
                        console.log("Producto subido exitosamente a Supabase");
                        mostrarMensaje("Producto agregado y sincronizado exitosamente", "success");
                    }
                }
            } catch (error) {
                console.error("Error al conectar con Supabase:", error);
                mostrarMensaje("Producto guardado localmente", "warning");
            }
        } else {
            mostrarMensaje("Producto guardado localmente (sin conexión)", "warning");
        }
    };
}

// Función para guardar cambios (editar producto)
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
            mostrarMensaje("Error: Datos de producto inválidos", "error");
            return;
        }

        // Subir los cambios a Supabase
        const supabase = await getSupabase();
        if (supabase) {
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
                console.error("Error al actualizar producto en Supabase:", error);
                mostrarMensaje("Error al actualizar en servidor", "error");
                return;
            }

            mostrarMensaje(`Producto actualizado correctamente en Supabase.`, "success");
            document.getElementById("formularioEdicion").style.display = "none";

            // Verificar si estamos en la página correcta antes de cargar la tabla
            if (document.getElementById("databaseBody")) {
                // Recargar la tabla de productos
                const { cargarDatosEnTabla } = await import('../db/db-operations.js');
                cargarDatosEnTabla();
            }
        } else {
            mostrarMensaje("Error de conexión con el servidor", "error");
        }
    } catch (error) {
        console.error("Error al editar el producto:", error);
        mostrarMensaje("Error inesperado al editar el producto.", "error");
    }
}

// Función para eliminar producto
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
            console.log("Producto eliminado de IndexedDB");

            // Eliminar de Supabase
            const supabase = await getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('productos')
                    .delete()
                    .eq('codigo', codigo);

                if (error) {
                    console.error("Error al eliminar producto de Supabase:", error);
                    mostrarMensaje("Producto eliminado localmente, pero error al sincronizar con servidor", "warning");
                } else {
                    console.log("Producto eliminado exitosamente de Supabase");
                    mostrarMensaje("Producto eliminado exitosamente", "success");
                }
            } else {
                mostrarMensaje("Producto eliminado localmente", "warning");
            }

            document.getElementById("formularioEdicion").style.display = "none";

            // Verificar si estamos en la página correcta antes de cargar la tabla
            if (document.getElementById("databaseBody")) {
                const { cargarDatosEnTabla } = await import('../db/db-operations.js');
                cargarDatosEnTabla();
            }
        };

        request.onerror = () => {
            console.error("Error al eliminar producto de IndexedDB");
            mostrarMensaje("Error al eliminar el producto", "error");
        };
    } catch (error) {
        console.error("Error en el proceso de eliminación:", error);
        mostrarMensaje("Ocurrió un error durante el proceso de eliminación", "error");
    }
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
            req.onsuccess = () => {
                resolve(!!req.result);
            };
        });

        if (existe) {
            mostrarMensaje("El código ya existe", "error");
            return;
        }

        const request = objectStore.put(productosanitizado);

        request.onerror = event => {
            console.error("Error al agregar producto desde inventario", event.target.error);
            mostrarMensaje("Error al agregar el producto", "error");
        };

        request.onsuccess = async () => {
            console.log("Producto agregado exitosamente desde inventario");
            mostrarMensaje("Producto agregado exitosamente", "success");

            // Subir a Supabase si hay conexión
            if (navigator.onLine) {
                try {
                    const supabase = await getSupabase();
                    if (supabase) {
                        const categoriaId = localStorage.getItem('categoria_id');
                        const { error } = await supabase
                            .from('productos')
                            .insert([{
                                codigo: productosanitizado.codigo,
                                nombre: productosanitizado.nombre,
                                categoria: productosanitizado.categoria,
                                marca: productosanitizado.marca,
                                unidad: productosanitizado.unidad,
                                categoria_id: categoriaId,
                                usuario_id: localStorage.getItem('usuario_id')
                            }]);

                        if (error) {
                            console.error("Error al subir producto a Supabase:", error);
                        } else {
                            console.log("Producto subido exitosamente a Supabase");
                        }
                    }
                } catch (error) {
                    console.error("Error al conectar con Supabase:", error);
                }
            }
        };
    }
}