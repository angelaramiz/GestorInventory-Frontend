// tabla-productos.js - Manejo del agregado de productos por tabla

import { db } from '../db/db-operations.js';
import { buscarProducto } from '../core/product-operations.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from '../utils/logs.js';
import { getSupabase } from '../auth/auth.js';
import { sanitizarProducto } from '../utils/sanitizacion.js';

// Variables globales para el manejo de la tabla
let productoPrimario = null;
let subproductos = [];
let contadorFilas = 0;

// Función para convertir guión a 6 ceros
function convertirGuionACeros(valor) {
    return valor.replace(/-/g, '000000');
}

// Función para aplicar la conversión a un input específico
function aplicarConversionCodigoAInput(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorOriginal = e.target.value;
        const valorConvertido = convertirGuionACeros(valorOriginal);
        
        if (valorOriginal !== valorConvertido) {
            const cursorPos = e.target.selectionStart;
            e.target.value = valorConvertido;
            
            const diferencia = valorConvertido.length - valorOriginal.length;
            const nuevaPosicion = Math.min(cursorPos + diferencia, valorConvertido.length);
            e.target.setSelectionRange(nuevaPosicion, nuevaPosicion);
        }
    });

    input.addEventListener('blur', function(e) {
        e.target.value = convertirGuionACeros(e.target.value);
    });
}

// Función de inicialización que será llamada después de que se carguen todos los módulos
function inicializarTablaProductos() {
    console.log('Configurando event listeners para tabla de productos');
    
    // Event listeners para la funcionalidad de tabla
    const agregarFilaBtn = document.getElementById('agregar-fila-btn');
    const limpiarTablaBtn = document.getElementById('limpiar-tabla-btn');
    const guardarTablaBtn = document.getElementById('guardar-tabla-btn');
    const codigoPrimarioInput = document.getElementById('codigo-primario');

    if (agregarFilaBtn) {
        agregarFilaBtn.addEventListener('click', agregarFilaSubproducto);
        console.log('Event listener agregado a agregar-fila-btn');
    }

    if (limpiarTablaBtn) {
        limpiarTablaBtn.addEventListener('click', limpiarTodo);
        console.log('Event listener agregado a limpiar-tabla-btn');
    }

    if (guardarTablaBtn) {
        guardarTablaBtn.addEventListener('click', guardarTablaProductos);
        console.log('Event listener agregado a guardar-tabla-btn');
    }

    // Búsqueda automática cuando el usuario termine de escribir (al quitar el foco)
    if (codigoPrimarioInput) {
        // Aplicar conversión de guión a ceros al código primario
        aplicarConversionCodigoAInput(codigoPrimarioInput);
        
        codigoPrimarioInput.addEventListener('input', function(e) {
            const codigo = e.target.value.trim();
            
            // Si el campo está vacío, limpiar todo inmediatamente
            if (!codigo) {
                limpiarInformacionProductoPrimario();
                return;
            }
        });
        
        // Buscar cuando el usuario quite el foco del input (blur)
        codigoPrimarioInput.addEventListener('blur', function(e) {
            // Aplicar conversión antes de buscar
            const valorConvertido = convertirGuionACeros(e.target.value.trim());
            e.target.value = valorConvertido;
            
            if (valorConvertido && valorConvertido.length >= 2) {
                console.log('Búsqueda automática para código (blur):', valorConvertido);
                buscarProductoPrimarioAutomatico();
            }
        });
        
        // También permitir buscar con Enter para búsqueda inmediata
        codigoPrimarioInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Aplicar conversión antes de buscar
                const valorConvertido = convertirGuionACeros(e.target.value.trim());
                e.target.value = valorConvertido;
                
                if (valorConvertido && valorConvertido.length >= 2) {
                    console.log('Búsqueda inmediata con Enter:', valorConvertido);
                    buscarProductoPrimarioAutomatico();
                }
            }
        });
        
        console.log('Event listeners de búsqueda automática agregados a codigo-primario');
    }
    
    console.log('Inicialización de tabla-productos completada');
}

// Intentar inicializar cuando se cargue el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTablaProductos);
} else {
    // El DOM ya está cargado
    inicializarTablaProductos();
}

function mostrarInformacionProductoPrimario(producto, esExistente) {
    const campos = ['nombre', 'categoria', 'marca', 'unidad'];
    
    campos.forEach(campo => {
        const input = document.getElementById(`primario-${campo}`);
        if (input) {
            input.value = producto[campo] || '';
            
            if (esExistente) {
                // Producto existente - campos de solo lectura
                input.readOnly = true;
                input.classList.add('campo-readonly', 'producto-existente');
                input.classList.remove('producto-nuevo');
                // Agregar indicador visual
                if (!input.parentElement.querySelector('.estado-producto')) {
                    const indicador = document.createElement('span');
                    indicador.className = 'estado-producto estado-existente';
                    indicador.textContent = '✓ Existente';
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(indicador);
                }
            } else {
                // Producto nuevo - campos editables
                input.readOnly = false;
                input.classList.remove('campo-readonly', 'producto-existente');
                input.classList.add('producto-nuevo');
                input.required = true;
                // Agregar indicador visual
                if (!input.parentElement.querySelector('.estado-producto')) {
                    const indicador = document.createElement('span');
                    indicador.className = 'estado-producto estado-nuevo';
                    indicador.textContent = '+ Nuevo';
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(indicador);
                }
            }
        }
    });
}

function agregarFilaSubproducto() {
    if (!productoPrimario) {
        mostrarAlertaBurbuja('Primero debe buscar un producto primario', 'warning');
        return;
    }

    contadorFilas++;
    const container = document.getElementById('subproductos-container');
    
    const filaDiv = document.createElement('div');
    filaDiv.className = 'subproducto-row';
    filaDiv.id = `subproducto-${contadorFilas}`;
    
    filaDiv.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-gray-700">Subproducto ${contadorFilas}</h4>
            <button type="button" class="eliminar-fila-btn text-red-500 hover:text-red-700 font-bold" data-fila="${contadorFilas}">
                ✕ Eliminar
            </button>
        </div>
        
        <div class="mb-3">
            <label class="block text-gray-700 text-sm font-bold mb-2">
                Código del Subproducto:
            </label>
            <input
                id="subproducto-codigo-${contadorFilas}"
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                type="text" placeholder="Código del subproducto" required>
        </div>
        
        <div class="info-subproducto-${contadorFilas} grid grid-cols-1 md:grid-cols-2 gap-4" style="display: none;">
            <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
                <input id="subproducto-nombre-${contadorFilas}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
            </div>
            <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Categoría:</label>
                <input id="subproducto-categoria-${contadorFilas}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
            </div>
            <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Marca/Proveedor:</label>
                <input id="subproducto-marca-${contadorFilas}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
            </div>
            <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Unidad:</label>
                <input id="subproducto-unidad-${contadorFilas}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" required>
            </div>
        </div>
    `;
    
    container.appendChild(filaDiv);
    
    // Agregar event listeners a los nuevos elementos
    const eliminarBtn = filaDiv.querySelector('.eliminar-fila-btn');
    const codigoInput = filaDiv.querySelector(`#subproducto-codigo-${contadorFilas}`);
    
    eliminarBtn.addEventListener('click', () => eliminarFilaSubproducto(contadorFilas));
    
    // Aplicar conversión de guión a ceros para este campo de código
    aplicarConversionCodigoAInput(codigoInput);
    
    // Búsqueda automática para subproductos cuando quite el foco
    codigoInput.addEventListener('input', function(e) {
        const codigo = e.target.value.trim();
        const numeroFila = contadorFilas;
        
        // Si el campo está vacío, limpiar información inmediatamente
        if (!codigo) {
            limpiarInformacionSubproducto(numeroFila);
            return;
        }
    });
    
    // Buscar cuando el usuario quite el foco del input (blur)
    codigoInput.addEventListener('blur', function(e) {
        // Aplicar conversión antes de buscar
        const valorConvertido = convertirGuionACeros(e.target.value.trim());
        e.target.value = valorConvertido;
        const numeroFila = contadorFilas;
        
        if (valorConvertido && valorConvertido.length >= 2) {
            console.log(`Búsqueda automática subproducto ${numeroFila} (blur):`, valorConvertido);
            buscarSubproductoAutomatico(numeroFila);
        }
    });
    
    // Permitir buscar con Enter para búsqueda inmediata
    codigoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Aplicar conversión antes de buscar
            const valorConvertido = convertirGuionACeros(e.target.value.trim());
            e.target.value = valorConvertido;
            const numeroFila = contadorFilas;
            
            if (valorConvertido && valorConvertido.length >= 2) {
                console.log(`Búsqueda inmediata subproducto ${numeroFila} (Enter):`, valorConvertido);
                buscarSubproductoAutomatico(numeroFila);
            }
        }
    });
    
    // Mostrar botón guardar si no está visible
    document.getElementById('guardar-tabla-btn').style.display = 'block';
}

function eliminarFilaSubproducto(numeroFila) {
    const fila = document.getElementById(`subproducto-${numeroFila}`);
    if (fila) {
        // Remover indicadores de estado si existen
        const indicadores = fila.querySelectorAll('.estado-existente-fila, .estado-nuevo-fila');
        indicadores.forEach(indicador => indicador.remove());
        
        fila.remove();
        
        // Remover de la lista de subproductos
        subproductos = subproductos.filter(sub => sub.numeroFila !== numeroFila);
        
        // Si no hay más filas, ocultar botón guardar
        const container = document.getElementById('subproductos-container');
        if (container.children.length === 0) {
            document.getElementById('guardar-tabla-btn').style.display = 'none';
        }
        
        mostrarAlertaBurbuja(`Subproducto ${numeroFila} eliminado`, 'info');
    }
}

function mostrarInformacionSubproducto(numeroFila, producto, esExistente) {
    const campos = ['nombre', 'categoria', 'marca', 'unidad'];
    
    campos.forEach(campo => {
        const input = document.getElementById(`subproducto-${campo}-${numeroFila}`);
        if (input) {
            input.value = producto[campo] || '';
            
            if (esExistente) {
                input.readOnly = true;
                input.classList.add('campo-readonly', 'producto-existente');
                input.classList.remove('producto-nuevo');
                // Agregar indicador al container de la fila
                const filaContainer = document.getElementById(`subproducto-${numeroFila}`);
                if (filaContainer && !filaContainer.querySelector('.estado-existente-fila')) {
                    const indicador = document.createElement('div');
                    indicador.className = 'estado-existente-fila bg-green-100 text-green-800 px-2 py-1 rounded text-xs absolute top-2 right-10';
                    indicador.textContent = '✓ Producto Existente';
                    filaContainer.style.position = 'relative';
                    filaContainer.appendChild(indicador);
                }
            } else {
                input.readOnly = false;
                input.classList.remove('campo-readonly', 'producto-existente');
                input.classList.add('producto-nuevo');
                input.required = true;
                // Agregar indicador al container de la fila
                const filaContainer = document.getElementById(`subproducto-${numeroFila}`);
                if (filaContainer && !filaContainer.querySelector('.estado-nuevo-fila')) {
                    const indicador = document.createElement('div');
                    indicador.className = 'estado-nuevo-fila bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs absolute top-2 right-10';
                    indicador.textContent = '+ Producto Nuevo';
                    filaContainer.style.position = 'relative';
                    filaContainer.appendChild(indicador);
                }
            }
        }
    });
}

function limpiarTodo() {
    // Confirmar antes de limpiar
    if (confirm('¿Está seguro de que desea limpiar todos los datos?')) {
        // Limpiar código primario
        document.getElementById('codigo-primario').value = '';
        
        // Limpiar información del producto primario
        limpiarInformacionProductoPrimario();
        
        mostrarAlertaBurbuja('Tabla limpiada correctamente', 'success');
    }
}

async function guardarTablaProductos() {
    try {
        // Validar que haya producto primario
        if (!productoPrimario) {
            mostrarAlertaBurbuja('Debe especificar un producto primario', 'error');
            return;
        }

        // Recopilar datos del producto primario
        const datosPrimario = recopilarDatosProductoPrimario();
        if (!datosPrimario) return;

        // Recopilar datos de subproductos
        const datosSubproductos = recopilarDatosSubproductos();
        if (!datosSubproductos || datosSubproductos.length === 0) {
            mostrarAlertaBurbuja('Debe agregar al menos un subproducto', 'error');
            return;
        }

        // Mostrar confirmación
        const confirmacion = await mostrarConfirmacionTabla(datosPrimario, datosSubproductos);
        if (!confirmacion) return;

        // Guardar productos
        await procesarGuardadoTabla(datosPrimario, datosSubproductos);

    } catch (error) {
        console.error('Error al guardar tabla de productos:', error);
        mostrarAlertaBurbuja('Error al guardar la tabla de productos', 'error');
    }
}

function recopilarDatosProductoPrimario() {
    const datos = {
        codigo: productoPrimario.codigo,
        nombre: document.getElementById('primario-nombre').value.trim(),
        categoria: document.getElementById('primario-categoria').value.trim(),
        marca: document.getElementById('primario-marca').value.trim(),
        unidad: document.getElementById('primario-unidad').value.trim(),
        esNuevo: productoPrimario.esNuevo
    };

    // Validar campos requeridos
    if (!datos.nombre || !datos.categoria || !datos.marca || !datos.unidad) {
        mostrarAlertaBurbuja('Complete todos los campos del producto primario', 'error');
        return null;
    }

    return datos;
}

function recopilarDatosSubproductos() {
    const datos = [];
    
    for (const subproducto of subproductos) {
        const numeroFila = subproducto.numeroFila;
        
        const datosSubproducto = {
            codigo: subproducto.codigo,
            nombre: document.getElementById(`subproducto-nombre-${numeroFila}`).value.trim(),
            categoria: document.getElementById(`subproducto-categoria-${numeroFila}`).value.trim(),
            marca: document.getElementById(`subproducto-marca-${numeroFila}`).value.trim(),
            unidad: document.getElementById(`subproducto-unidad-${numeroFila}`).value.trim(),
            esNuevo: subproducto.esNuevo
        };

        // Validar campos requeridos
        if (!datosSubproducto.nombre || !datosSubproducto.categoria || !datosSubproducto.marca || !datosSubproducto.unidad) {
            mostrarAlertaBurbuja(`Complete todos los campos del subproducto ${numeroFila}`, 'error');
            return null;
        }

        datos.push(datosSubproducto);
    }
    
    return datos;
}

async function mostrarConfirmacionTabla(primario, subproductos) {
    let mensaje = `<div class="text-left">
        <h3 class="font-bold text-lg mb-3">Confirmar Guardado de Tabla</h3>
        
        <div class="mb-4 p-3 bg-blue-50 rounded">
            <h4 class="font-semibold text-blue-800">Producto Primario:</h4>
            <p><strong>Código:</strong> ${primario.codigo}</p>
            <p><strong>Nombre:</strong> ${primario.nombre}</p>
            <p><strong>Estado:</strong> ${primario.esNuevo ? '🆕 Nuevo' : '✅ Existente'}</p>
        </div>
        
        <div class="mb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Subproductos (${subproductos.length}):</h4>`;
    
    subproductos.forEach((sub, index) => {
        mensaje += `
            <div class="p-2 bg-gray-50 rounded mb-2">
                <p><strong>${index + 1}. ${sub.codigo}</strong> - ${sub.nombre}</p>
                <p class="text-sm text-gray-600">Estado: ${sub.esNuevo ? '🆕 Nuevo' : '✅ Existente'}</p>
            </div>`;
    });
    
    mensaje += `</div>
        <p class="text-sm text-gray-600">¿Desea continuar con el guardado?</p>
    </div>`;

    const result = await Swal.fire({
        title: 'Confirmar Guardado',
        html: mensaje,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
    });

    return result.isConfirmed;
}

async function procesarGuardadoTabla(primario, subproductos) {
    try {
        // Mostrar progress
        Swal.fire({
            title: 'Guardando...',
            text: 'Procesando productos y relaciones',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 1. Guardar producto primario si es nuevo
        if (primario.esNuevo) {
            await guardarProducto(primario);
        }

        // 2. Guardar subproductos nuevos
        for (const subproducto of subproductos) {
            if (subproducto.esNuevo) {
                await guardarProducto(subproducto);
            }
        }

        // 3. Crear relaciones en productos_subproductos
        await crearRelacionesProductos(primario.codigo, subproductos.map(s => s.codigo));

        // 4. Sincronizar con Supabase
        await sincronizarConSupabase();

        Swal.fire({
            title: '¡Éxito!',
            text: 'Tabla de productos guardada correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

        // Limpiar formulario después del éxito
        limpiarTodo();

    } catch (error) {
        console.error('Error en el proceso de guardado:', error);
        Swal.fire({
            title: 'Error',
            text: 'Hubo un problema al guardar la tabla de productos',
            icon: 'error'
        });
    }
}

async function guardarProducto(producto) {
    return new Promise(async (resolve, reject) => {
        try {
            // Sanitizar producto
            const productoSanitizado = sanitizarProducto(producto);
            if (!productoSanitizado) {
                reject(new Error('Datos de producto inválidos'));
                return;
            }

            const transaction = db.transaction(["productos"], "readwrite");
            const objectStore = transaction.objectStore("productos");

            // Verificar si el código ya existe
            const existe = await new Promise(resolveCheck => {
                const req = objectStore.get(producto.codigo);
                req.onsuccess = () => resolveCheck(!!req.result);
                req.onerror = () => resolveCheck(false);
            });

            if (existe) {
                reject(new Error(`El producto con código ${producto.codigo} ya existe`));
                return;
            }

            // Agregar producto a IndexedDB
            const request = objectStore.put(productoSanitizado);

            request.onerror = event => {
                reject(new Error(`Error al agregar producto ${producto.codigo}: ${event.target.error}`));
            };

            request.onsuccess = async () => {
                try {
                    // Subir a Supabase si hay conexión
                    if (navigator.onLine) {
                        const categoriaId = localStorage.getItem('categoria_id');
                        const supabase = await getSupabase();
                        
                        const { error } = await supabase
                            .from('productos')
                            .insert({ 
                                ...productoSanitizado, 
                                categoria_id: categoriaId, 
                                usuario_id: localStorage.getItem('usuario_id') 
                            });
                        
                        if (error) {
                            console.error("Error al sincronizar con Supabase:", error);
                            // No rechazar aquí, el producto ya se guardó localmente
                        }
                    }
                    
                    resolve(true);
                } catch (supabaseError) {
                    console.error("Error en Supabase:", supabaseError);
                    resolve(true); // El producto se guardó localmente
                }
            };

        } catch (error) {
            reject(error);
        }
    });
}

async function crearRelacionesProductos(codigoPrimario, codigosSubproductos) {
    try {
        const supabase = await getSupabase();
        
        // Preparar datos para la tabla productos_subproductos
        const relaciones = codigosSubproductos.map(codigoSub => ({
            principalproductid: codigoPrimario,
            subproductid: codigoSub
        }));

        // Insertar en Supabase
        const { data, error } = await supabase
            .from('productos_subproductos')
            .insert(relaciones)
            .select();

        if (error) {
            console.error('Error al crear relaciones en Supabase:', error);
            throw error;
        }

        console.log('Relaciones creadas exitosamente:', data);
        
        // También guardar en IndexedDB local si es necesario
        // (implementar según tu estructura de base de datos local)
        
    } catch (error) {
        console.error('Error al crear relaciones productos-subproductos:', error);
        throw error;
    }
}

async function sincronizarConSupabase() {
    try {
        // Importar funciones de sincronización si existen
        const { sincronizarProductosDesdeBackend } = await import('./db-operations.js');
        
        if (sincronizarProductosDesdeBackend) {
            await sincronizarProductosDesdeBackend();
        }
        
    } catch (error) {
        console.warn('No se pudo sincronizar automáticamente con Supabase:', error);
    }
}

// Función auxiliar para buscar producto en IndexedDB
async function buscarProductoEnDB(codigo) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Base de datos no inicializada'));
            return;
        }

        const transaction = db.transaction(["productos"], "readonly");
        const objectStore = transaction.objectStore("productos");
        const index = objectStore.index("codigo");
        const request = index.get(codigo);

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject(new Error('Error al buscar en la base de datos'));
        };
    });
}

// Exportar funciones si se necesitan en otros módulos
export {
    inicializarTablaProductos,
    buscarProductoPrimarioAutomatico,
    agregarFilaSubproducto,
    guardarTablaProductos,
    limpiarInformacionProductoPrimario,
    limpiarInformacionSubproducto
};

// Auto-inicializar
console.log('Cargando tabla-productos.js...');

async function buscarProductoPrimarioAutomatico() {
    const inputCodigo = document.getElementById('codigo-primario');
    const codigoPrimario = convertirGuionACeros(inputCodigo.value.trim());
    
    // Actualizar el input con el valor convertido
    inputCodigo.value = codigoPrimario;
    
    if (!codigoPrimario) {
        return;
    }

    try {
        // Buscar en IndexedDB
        const resultado = await buscarProductoEnDB(codigoPrimario);
        const infoContainer = document.getElementById('info-producto-primario');
        
        if (resultado) {
            // Producto encontrado - mostrar información
            productoPrimario = resultado;
            mostrarInformacionProductoPrimario(resultado, true);
            mostrarAlertaBurbuja('✓ Producto encontrado automáticamente', 'success');
            
            // Habilitar funciones de subproductos
            infoContainer.style.display = 'block';
            document.getElementById('agregar-fila-btn').style.display = 'block';
            
            // Agregar primera fila de subproducto automáticamente si no hay ninguna
            if (subproductos.length === 0) {
                setTimeout(() => {
                    agregarFilaSubproducto();
                }, 300);
            }
        } else {
            // Producto no encontrado - habilitar campos para nuevo producto
            productoPrimario = { codigo: codigoPrimario, esNuevo: true };
            mostrarInformacionProductoPrimario(productoPrimario, false);
            
            // Mostrar campos y habilitar funciones
            infoContainer.style.display = 'block';
            document.getElementById('agregar-fila-btn').style.display = 'block';
            
            // Enfocar el primer campo para facilitar el ingreso
            setTimeout(() => {
                const nombreInput = document.getElementById('primario-nombre');
                if (nombreInput && !nombreInput.readOnly) {
                    nombreInput.focus();
                }
            }, 100);
        }

    } catch (error) {
        console.error('Error en búsqueda automática:', error);
    }
}

function limpiarInformacionProductoPrimario() {
    // Limpiar variable global
    productoPrimario = null;
    
    // Ocultar información del producto primario
    const infoContainer = document.getElementById('info-producto-primario');
    if (infoContainer) {
        infoContainer.style.display = 'none';
        
        // Limpiar campos
        const campos = ['nombre', 'categoria', 'marca', 'unidad'];
        campos.forEach(campo => {
            const input = document.getElementById(`primario-${campo}`);
            if (input) {
                input.value = '';
                input.readOnly = false;
                input.classList.remove('campo-readonly', 'producto-existente', 'producto-nuevo');
                input.required = false;
            }
        });
        
        // Remover indicadores de estado
        const indicadores = infoContainer.querySelectorAll('.estado-producto');
        indicadores.forEach(indicador => indicador.remove());
    }
    
    // Limpiar subproductos
    subproductos = [];
    contadorFilas = 0;
    const subproductosContainer = document.getElementById('subproductos-container');
    if (subproductosContainer) {
        subproductosContainer.innerHTML = '';
    }
    
    // Ocultar botones
    const agregarBtn = document.getElementById('agregar-fila-btn');
    const guardarBtn = document.getElementById('guardar-tabla-btn');
    
    if (agregarBtn) agregarBtn.style.display = 'none';
    if (guardarBtn) guardarBtn.style.display = 'none';
}

// Agregar funciones para búsqueda automática y limpieza de información de subproductos
async function buscarSubproductoAutomatico(numeroFila) {
    const codigoInput = document.getElementById(`subproducto-codigo-${numeroFila}`);
    const codigo = convertirGuionACeros(codigoInput.value.trim());
    
    // Actualizar el input con el valor convertido
    codigoInput.value = codigo;
    
    if (!codigo) {
        return;
    }

    try {
        // Mostrar indicador sutil en el botón
        const buscarBtn = document.querySelector(`.buscar-subproducto-btn[data-fila="${numeroFila}"]`);
        if (buscarBtn) {
            const originalText = buscarBtn.textContent;
            buscarBtn.textContent = '🔍';
            buscarBtn.disabled = true;
            
            // Restaurar después de un tiempo
            setTimeout(() => {
                if (buscarBtn.textContent === '🔍') {
                    buscarBtn.textContent = originalText;
                    buscarBtn.disabled = false;
                }
            }, 2000);
        }

        const resultado = await buscarProductoEnDB(codigo);
        const infoContainer = document.querySelector(`.info-subproducto-${numeroFila}`);
        
        let subproducto = {
            numeroFila: numeroFila,
            codigo: codigo
        };

        if (resultado) {
            // Producto encontrado
            subproducto = { ...subproducto, ...resultado, esNuevo: false };
            mostrarInformacionSubproducto(numeroFila, resultado, true);
            
            // Indicador visual sutil
            codigoInput.classList.add('pulse-success');
            setTimeout(() => codigoInput.classList.remove('pulse-success'), 1000);
        } else {
            // Producto no encontrado
            subproducto.esNuevo = true;
            mostrarInformacionSubproducto(numeroFila, { codigo }, false);
            
            // Enfocar el primer campo editable
            setTimeout(() => {
                const nombreInput = document.getElementById(`subproducto-nombre-${numeroFila}`);
                if (nombreInput && !nombreInput.readOnly) {
                    nombreInput.focus();
                }
            }, 100);
            
            // Indicador visual sutil
            codigoInput.classList.add('pulse-warning');
            setTimeout(() => codigoInput.classList.remove('pulse-warning'), 1000);
        }

        // Actualizar en la lista de subproductos
        const indiceExistente = subproductos.findIndex(sub => sub.numeroFila === numeroFila);
        if (indiceExistente >= 0) {
            subproductos[indiceExistente] = subproducto;
        } else {
            subproductos.push(subproducto);
        }

        infoContainer.style.display = 'block';

        // Restaurar botón
        if (buscarBtn) {
            buscarBtn.textContent = 'Buscar';
            buscarBtn.disabled = false;
        }

    } catch (error) {
        console.error('Error en búsqueda automática de subproducto:', error);
        
        // Restaurar botón en caso de error
        const buscarBtn = document.querySelector(`.buscar-subproducto-btn[data-fila="${numeroFila}"]`);
        if (buscarBtn) {
            buscarBtn.textContent = 'Buscar';
            buscarBtn.disabled = false;
        }
    }
}

function limpiarInformacionSubproducto(numeroFila) {
    // Remover de la lista de subproductos
    subproductos = subproductos.filter(sub => sub.numeroFila !== numeroFila);
    
    // Ocultar información del subproducto
    const infoContainer = document.querySelector(`.info-subproducto-${numeroFila}`);
    if (infoContainer) {
        infoContainer.style.display = 'none';
        
        // Limpiar campos
        const campos = ['nombre', 'categoria', 'marca', 'unidad'];
        campos.forEach(campo => {
            const input = document.getElementById(`subproducto-${campo}-${numeroFila}`);
            if (input) {
                input.value = '';
                input.readOnly = false;
                input.classList.remove('campo-readonly', 'producto-existente', 'producto-nuevo');
                input.required = false;
            }
        });
        
        // Remover indicadores de estado de la fila
        const filaContainer = document.getElementById(`subproducto-${numeroFila}`);
        if (filaContainer) {
            const indicadores = filaContainer.querySelectorAll('.estado-existente-fila, .estado-nuevo-fila');
            indicadores.forEach(indicador => indicador.remove());
        }
    }
}
