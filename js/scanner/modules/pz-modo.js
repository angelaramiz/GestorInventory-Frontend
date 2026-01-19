// Módulo Principal - Modo PZ (FASE 2+)
// Gestiona el flujo completo de inventario por secciones y niveles

import { guardarSeccionEnHistorial, obtenerHistorialSecciones, mostrarHistorialVisual } from './pz-persistencia.js';
import { inicializarDBPZ, guardarSeccionComplotaEnDB, obtenerEstadisticasDB } from '../../db/db-operations-pz.js';
import { inicializarEscaner, iniciarEscaneo, confirmarEscaneo, detenerEscaneo, finalizarEscaneo } from './pz-scanner.js';
import { inicializarDBInventarioTemporal, obtenerResumenEscaneo, guardarProductoEscaneado, obtenerProductosEscaneados, limpiarInventarioTemporal } from './pz-inventario-temporal.js';
import { registrarEventListenersEscanerPZ, actualizarContadorEscaneo } from './pz-scanner-ui.js';
import { generarReporte, mostrarReporte } from './pz-reportes.js';
import { estadoEscaneo } from './pz-scanner.js';

// Estado global del inventario PZ
let estadoPZ = {
    seccionActual: 1,
    nivelActual: 1,
    productoNumero: 1,
    secciones: [], // Array de secciones guardadas
    seccionEnProgreso: {
        seccion: 1,
        niveles: []
    },
    totalProductosIngresados: 0
};

/**
 * Inicializa el modo PZ (inventario por secciones)
 */
export async function iniciarInventarioPZ() {
    console.log('📋 Iniciando Modo PZ - Inventario por Secciones y Niveles');
    
    // FASE 5: Inicializar IndexedDB
    try {
        await inicializarDBPZ();
        console.log('✅ IndexedDB PZ inicializada');
    } catch (error) {
        console.warn('⚠️ Error inicializando IndexedDB:', error);
    }

    // Mostrar modal
    const modal = document.getElementById('modalInventarioPZ');
    if (!modal) {
        console.error('❌ No se encontró el modal modalInventarioPZ');
        return;
    }

    modal.style.display = 'block';

    // Inicializar estado
    reiniciarEstadoPZ();

    // Registrar event listeners
    registrarEventListenersPZ();

    // Actualizar UI
    actualizarPanelControl();
    actualizarTablaPZ();

    console.log('✅ Modo PZ inicializado correctamente');
}

/**
 * Reinicia el estado al valor inicial
 */
function reiniciarEstadoPZ() {
    estadoPZ = {
        seccionActual: 1,
        nivelActual: 1,
        productoNumero: 1,
        secciones: [],
        seccionEnProgreso: {
            seccion: 1,
            niveles: []
        },
        totalProductosIngresados: 0
    };

    // Inicializar primer nivel
    estadoPZ.seccionEnProgreso.niveles.push({
        nivel: 1,
        productos: []
    });

    limpiarInputs();
}

/**
 * Registra todos los event listeners del modo PZ
 */
function registrarEventListenersPZ() {
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnNivelMas1 = document.getElementById('btnNivelMas1');
    const btnSiguienteSeccion = document.getElementById('btnSiguienteSeccion');
    const btnFinalizarConteo = document.getElementById('btnFinalizarConteo');
    const btnCerrarPZ = document.getElementById('cerrarModalPZ');

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', () => guardarProductoVirtual());
    }

    if (btnNivelMas1) {
        btnNivelMas1.addEventListener('click', () => crearNuevoNivel());
    }

    if (btnSiguienteSeccion) {
        btnSiguienteSeccion.addEventListener('click', () => guardarSeccionActual());
    }

    if (btnFinalizarConteo) {
        btnFinalizarConteo.addEventListener('click', () => finalizarConteoPorSecciones());
    }

    if (btnCerrarPZ) {
        btnCerrarPZ.addEventListener('click', () => cerrarModalPZ());
    }

    console.log('✅ Event listeners PZ registrados');
}

/**
 * Guarda un producto virtual en el nivel actual
 */
function guardarProductoVirtual() {
    const cantidad = document.getElementById('inputCantidad').value;
    const caducidad = document.getElementById('selectCaducidad').value;
    const nombre = document.getElementById('nombreProductoInventario').value || `Producto ${estadoPZ.productoNumero}`;

    // Validaciones
    if (!cantidad || cantidad <= 0) {
        alert('❌ La cantidad debe ser mayor a 0');
        return;
    }

    if (!caducidad) {
        alert('❌ Debes seleccionar un tipo de caducidad');
        return;
    }

    // Crear producto virtual
    const productoVirtual = {
        numero: estadoPZ.productoNumero,
        nombre: nombre,
        cantidad: parseInt(cantidad),
        unidad: 'pz',
        caducidad: caducidad,
        timestamp: new Date().toISOString()
    };

    // Obtener nivel actual
    const nivelActual = estadoPZ.seccionEnProgreso.niveles.find(
        n => n.nivel === estadoPZ.nivelActual
    );

    if (!nivelActual) {
        console.error('❌ No se encontró el nivel actual');
        return;
    }

    // Guardar producto
    nivelActual.productos.push(productoVirtual);
    estadoPZ.productoNumero++;
    estadoPZ.totalProductosIngresados++;

    console.log(`✅ Producto ${productoVirtual.numero} guardado: ${nombre} | ${cantidad}pz, Caducidad: ${caducidad}`);

    // Limpiar inputs
    limpiarInputs();

    // Actualizar UI
    actualizarPanelControl();
    actualizarTablaPZ();
}

/**
 * Crea un nuevo nivel en la sección actual
 */
function crearNuevoNivel() {
    estadoPZ.nivelActual++;
    estadoPZ.productoNumero = 1;

    // Crear nuevo nivel
    estadoPZ.seccionEnProgreso.niveles.push({
        nivel: estadoPZ.nivelActual,
        productos: []
    });

    console.log(`📈 Nuevo nivel creado: Nivel ${estadoPZ.nivelActual}`);

    // Limpiar inputs
    limpiarInputs();

    // Actualizar UI
    actualizarPanelControl();
    actualizarTablaPZ();
}

/**
 * Guarda la sección actual y prepara para la siguiente
 */
function guardarSeccionActual() {
    // Confirmar antes de cambiar sección
    const confirmacion = confirm(
        `¿Estás seguro de que deseas guardar la Sección ${estadoPZ.seccionActual} y pasar a la Sección ${estadoPZ.seccionActual + 1}?`
    );

    if (!confirmacion) {
        return;
    }

    // Validar que hay al menos 1 producto
    const totalProductos = estadoPZ.seccionEnProgreso.niveles.reduce(
        (sum, nivel) => sum + nivel.productos.length,
        0
    );

    if (totalProductos === 0) {
        alert('❌ Debes ingresar al menos 1 producto antes de cambiar de sección');
        return;
    }

    // Guardar sección
    estadoPZ.secciones.push(JSON.parse(JSON.stringify(estadoPZ.seccionEnProgreso)));

    // FASE 4: Guardar en historial de persistencia
    guardarSeccionEnHistorial(estadoPZ.seccionEnProgreso);

    console.log(`✅ Sección ${estadoPZ.seccionActual} guardada con ${totalProductos} productos`);

    // Crear nueva sección
    estadoPZ.seccionActual++;
    estadoPZ.nivelActual = 1;
    estadoPZ.productoNumero = 1;

    estadoPZ.seccionEnProgreso = {
        seccion: estadoPZ.seccionActual,
        niveles: [
            {
                nivel: 1,
                productos: []
            }
        ]
    };

    // Limpiar inputs
    limpiarInputs();

    // Actualizar UI
    actualizarPanelControl();
    actualizarTablaPZ();

    console.log(`📋 Nueva sección iniciada: Sección ${estadoPZ.seccionActual}`);
}

/**
 * Finaliza el conteo por secciones
 */
async function finalizarConteoPorSecciones() {
    // Validar que hay al menos una sección completada o en progreso
    const seccionesCompletadas = estadoPZ.secciones.length;
    const totalProductosActual = estadoPZ.seccionEnProgreso.niveles.reduce(
        (sum, nivel) => sum + nivel.productos.length,
        0
    );

    if (seccionesCompletadas === 0 && totalProductosActual === 0) {
        alert('❌ Debes ingresar al menos 1 producto antes de finalizar');
        return;
    }

    // Guardar última sección en progreso si tiene productos
    if (totalProductosActual > 0) {
        estadoPZ.secciones.push(JSON.parse(JSON.stringify(estadoPZ.seccionEnProgreso)));
        // FASE 4: Guardar en historial de persistencia
        guardarSeccionEnHistorial(estadoPZ.seccionEnProgreso);
        console.log(`✅ Última sección (${estadoPZ.seccionActual}) guardada`);
    }

    console.log(`✅ Conteo por secciones finalizado - Total: ${estadoPZ.secciones.length} secciones`);
    console.log('📊 Historial completo:', obtenerHistorialSecciones());
    console.log(mostrarHistorialVisual());

    // FASE 5: Guardar todas las secciones en IndexedDB
    try {
        console.log('💾 Guardando secciones en IndexedDB...');
        for (const seccion of estadoPZ.secciones) {
            const resultado = await guardarSeccionComplotaEnDB(seccion);
            console.log(`✅ Sección ${seccion.seccion} guardada en BD (ID: ${resultado.seccionId})`);
        }

        // Mostrar estadísticas
        const stats = await obtenerEstadisticasDB();
        console.log('📊 Estadísticas de BD:', stats);
    } catch (error) {
        console.error('❌ Error guardando en IndexedDB:', error);
    }

    // Cerrar modal
    cerrarModalPZ();

    // Mostrar opciones siguientes (FASE 6+)
    mostrarOpcionesPostConteo();
}

/**
 * FASE 6: Inicia el proceso de escaneo de productos
 */
async function iniciarEscanerPZ() {
    console.log('🔍 FASE 6: Iniciando escaneo de productos');
    
    // Verificar que hay productos para escanear
    if (!estadoPZ.secciones || estadoPZ.secciones.length === 0) {
        alert('❌ No hay secciones registradas para escanear');
        return;
    }

    // PRE-INICIALIZAR IndexedDB para inventario temporal ANTES de usar
    try {
        console.log('🔄 Pre-inicializando IndexedDB del inventario temporal...');
        await inicializarDBInventarioTemporal();
        console.log('✅ IndexedDB del inventario temporal pre-inicializada');
        
        // LIMPIAR inventario temporal antes de empezar nuevo escaneo
        console.log('🧹 Limpiando inventario temporal de escaneos anteriores...');
        await limpiarInventarioTemporal();
        console.log('✅ Inventario temporal limpiado');
    } catch (error) {
        console.error('❌ Error pre-inicializando IndexedDB:', error);
        alert('Error inicializando base de datos: ' + error.message);
        return;
    }

    // Obtener todos los productos virtuales para escanear
    const productosVirtuales = [];
    let idProductoVirtual = 1; // Contador para asignar IDs
    
    estadoPZ.secciones.forEach(seccion => {
        if (seccion.niveles && Array.isArray(seccion.niveles)) {
            seccion.niveles.forEach(nivel => {
                if (nivel.productos && Array.isArray(nivel.productos)) {
                    nivel.productos.forEach(producto => {
                        productosVirtuales.push({
                            id: idProductoVirtual++, // ✅ Asignar ID único
                            ...producto,
                            seccion: seccion.seccion,
                            nivel: nivel.nivel
                        });
                    });
                }
            });
        }
    });

    console.log(`📦 Productos virtuales a escanear: ${productosVirtuales.length}`);

    // Inicializar modal de escaneo
    const modalEscaner = document.getElementById('modalEscanerPZ');
    if (!modalEscaner) {
        console.error('❌ No se encontró el modal modalEscanerPZ');
        return;
    }

    // Mostrar modal
    modalEscaner.style.display = 'block';

    // Registrar event listeners para los botones del escáner
    const callbacksUI = {
        onConfirmar: () => {
            console.log('✅ Usuario confirmó escaneo');
            // Esto se manejará dentro del flujo de escaneo
        },
        onReintentar: () => {
            console.log('🔄 Usuario reintentó escaneo');
            // El escáner se mantiene activo
        },
        onSaltar: () => {
            console.log('⏭️ Usuario saltó producto');
            // Saltar al siguiente
        },
        onCancelar: () => {
            console.log('❌ Usuario canceló escaneo');
            // Cerrar flujo
        }
    };

    registrarEventListenersEscanerPZ(callbacksUI);

    // Inicializar escáner
    try {
        await inicializarEscaner('qr-scanner');
        console.log('✅ Escáner inicializado');
        
        // Iniciar escaneo del primer producto
        if (productosVirtuales.length > 0) {
            iniciarEscaneoProducto(productosVirtuales, 0);
        }
    } catch (error) {
        console.error('❌ Error inicializando escáner:', error);
        alert('Error al iniciar el escáner: ' + error.message);
    }
}

/**
 * Inicia el escaneo de un producto específico
 */
function iniciarEscaneoProducto(productosVirtuales, indice) {
    if (indice >= productosVirtuales.length) {
        console.log('✅ Escaneo completado - todos los productos procesados');
        finalizarEscaneoCompleto();
        return;
    }

    const productoActual = productosVirtuales[indice];
    console.log(`📍 Escaneo #${indice + 1}/${productosVirtuales.length}: ${productoActual.nombre}`);

    // Actualizar UI con producto actual
    actualizarPanelEscaneo(productoActual, indice, productosVirtuales.length);

    // Configurar callbacks para este producto
    const callbacks = {
        onConfirmar: async () => {
            console.log(`✅ Producto ${indice + 1} confirmado - Guardando en BD...`);
            console.log('📦 Producto virtual actual:', productoActual);
            // Guardar producto escaneado en inventario temporal
            try {
                console.log('💾 Iniciando guardarProductoEscaneadoPZ...');
                console.log('💾 Producto físico escaneado actual');
                const id = await guardarProductoEscaneadoPZ(productoActual);
                console.log(`💾 Producto guardado en BD (ID: ${id})`);
                
                console.log('📊 Obteniendo resumen de escaneo...');
                // Actualizar contador en UI
                const resumen = await obtenerResumenEscaneo();
                console.log('📊 Resumen obtenido:', resumen);
                
                actualizarContadorEscaneo(resumen.totalEscaneados, productosVirtuales.length, resumen.confirmados);
                console.log(`📊 Resumen actualizado:`, resumen);
            } catch (error) {
                console.error('❌ Error guardando producto:', error);
                console.error('❌ Stack trace:', error.stack);
            }
            // Avanzar al siguiente
            console.log(`➡️ Avanzando a producto ${indice + 2}/${productosVirtuales.length}`);
            iniciarEscaneoProducto(productosVirtuales, indice + 1);
        },
        onRechazar: () => {
            console.log(`❌ Producto ${indice + 1} rechazado - reintentando`);
            // Reintentar escaneo del mismo producto
            reintentoEscaneo();
        },
        onSaltar: () => {
            console.log(`⏭️ Producto ${indice + 1} saltado`);
            // Guardar como "no encontrado"
            guardarProductoNoEncontradoPZ(productoActual);
            // Avanzar al siguiente
            iniciarEscaneoProducto(productosVirtuales, indice + 1);
        }
    };

    // Iniciar escaneo
    iniciarEscaneo(productoActual, callbacks);
}

/**
 * Actualiza el panel de escaneo con el producto actual
 */
function actualizarPanelEscaneo(producto, indice, total) {
    // Actualizar información del producto virtual
    const scanProductoNumero = document.getElementById('scanProductoNumero');
    const scanProductoCantidad = document.getElementById('scanProductoCantidad');
    const scanProductoCaducidad = document.getElementById('scanProductoCaducidad');
    const scanProgreso = document.getElementById('scanProgreso');

    if (scanProductoNumero) scanProductoNumero.textContent = indice + 1;
    if (scanProductoCantidad) scanProductoCantidad.textContent = `${producto.cantidad} ${producto.unidad}`;
    if (scanProductoCaducidad) scanProductoCaducidad.textContent = producto.caducidad || 'S/E';
    if (scanProgreso) scanProgreso.textContent = `${indice + 1}/${total}`;

    // Limpiar resultado anterior
    const tarjetaProductoEscaneado = document.getElementById('tarjetaProductoEscaneado');
    if (tarjetaProductoEscaneado) {
        tarjetaProductoEscaneado.style.display = 'none';
    }

    // Enfoque en input de escaneo (si existe)
    const inputEscaneo = document.querySelector('.input-escaneo');
    if (inputEscaneo) {
        inputEscaneo.focus();
    }
}

/**
 * Guarda un producto escaneado en el inventario temporal
 */
async function guardarProductoEscaneadoPZ(productoVirtual) {
    console.log('💾 Guardando producto escaneado en BD...');
    try {
        // Obtener el producto escaneado del estado del scanner
        const productoFisico = estadoEscaneo.productoFisicoEscaneado;
        console.log('✅ Producto físico escaneado:', productoFisico);
        
        if (!productoFisico) {
            throw new Error('No hay producto físico escaneado');
        }

        const datosEscaneo = {
            virtual_id: productoVirtual.id || 0,
            codigo_producto: productoFisico.codigo || 'N/A',
            nombre: productoFisico.nombre,
            cantidad: productoVirtual.cantidad,
            caducidad: productoVirtual.caducidad,
            seccion: productoVirtual.seccion || 1,
            nivel: productoVirtual.nivel || 1
        };
        
        console.log('📦 Datos para guardar:', datosEscaneo);
        const id = await guardarProductoEscaneado(datosEscaneo);
        console.log(`💾 Producto escaneado guardado (ID: ${id}): ${productoFisico.nombre}`);
        return id;
    } catch (error) {
        console.error('❌ Error guardando producto escaneado:', error);
        throw error;
    }
}

/**
 * Guarda un producto como "no encontrado"
 */
async function guardarProductoNoEncontradoPZ(producto) {
    try {
        console.log(`⚠️ Producto no encontrado: ${producto.nombre}`);
        // await guardarProductoNoEncontrado(producto);
    } catch (error) {
        console.error('Error guardando estado de producto:', error);
    }
}

/**
 * Reintento de escaneo
 */
function reintentoEscaneo() {
    console.log('🔄 Reintentando escaneo...');
    // El escáner se mantiene activo automáticamente
}

/**
 * Finaliza el proceso de escaneo completo
 */
async function finalizarEscaneoCompleto() {
    console.log('✅ FASE 6 completada - Escaneo finalizado');
    
    try {
        // Detener escáner
        await detenerEscaneo();

        // Obtener resumen de escaneo
        const resumen = await obtenerResumenEscaneo();
        console.log('📊 Resumen de escaneo:', resumen);

        // Cerrar modal de escaneo
        const modalEscaner = document.getElementById('modalEscanerPZ');
        if (modalEscaner) {
            modalEscaner.style.display = 'none';
        }

        // FASE 7: Generar reporte automáticamente
        console.log('📊 FASE 7: Generando reporte...');
        
        // Obtener todos los productos virtuales con sus IDs
        const productosVirtuales = recolectarProductosVirtuales();
        
        // Obtener productos escaneados
        const productosEscaneados = await obtenerProductosEscaneados();
        
        // Generar reporte
        const reporte = generarReporte(productosVirtuales, productosEscaneados);
        
        // Mostrar reporte (PASANDO LOS DATOS NECESARIOS PARA LOS BOTONES)
        mostrarReporte(reporte, productosVirtuales, productosEscaneados);
        
        console.log('✅ FASE 7 completada - Reporte generado');
    } catch (error) {
        console.error('Error finalizando escaneo:', error);
        alert('Error al finalizar escaneo: ' + error.message);
    }
}

/**
 * Recolecta todos los productos virtuales ingresados
 */
function recolectarProductosVirtuales() {
    const productos = [];
    let id = 1;
    
    estadoPZ.secciones.forEach((seccion, seccionIdx) => {
        seccion.niveles.forEach((nivel, nivelIdx) => {
            nivel.productos.forEach((producto) => {
                productos.push({
                    id: id++,
                    ...producto,
                    seccion: seccion.seccion,
                    nivel: nivel.nivel
                });
            });
        });
    });
    
    return productos;
}

// Función obtenerProductosEscaneados importada desde pz-inventario-temporal.js

/**
``` * Muestra opciones después de finalizar el conteo
 */
function mostrarOpcionesPostConteo() {
    const opciones = confirm(
        `✅ Conteo finalizado con ${estadoPZ.secciones.length} secciones\n\n¿Qué deseas hacer?\n\nAceptar: Comenzar a escanear\nCancelar: Contar otra área`
    );

    if (opciones) {
        console.log('🔍 Usuario seleccionó: Comenzar a escanear');
        // FASE 6: Iniciar flujo de escaneo
        iniciarEscanerPZ();
    } else {
        console.log('📍 Usuario seleccionó: Contar otra área');

        // FASE 8: Seleccionar otra área
        // import('./pz-areas.js').then(m => m.seleccionarOtraArea());
    }
}

/**
 * Actualiza el panel de control con los datos actuales
 */
function actualizarPanelControl() {
    document.getElementById('tituloSeccionNivel').textContent = 
        `Sección ${estadoPZ.seccionActual} - Nivel ${estadoPZ.nivelActual}`;
    
    document.getElementById('indicadorSeccion').textContent = estadoPZ.seccionActual;
    document.getElementById('indicadorNivel').textContent = estadoPZ.nivelActual;
    document.getElementById('indicadorProducto').textContent = estadoPZ.productoNumero;
    document.getElementById('indicadorTotal').textContent = estadoPZ.totalProductosIngresados;

    // Actualizar label
    document.getElementById('labelProducto').textContent = 
        `Introduce la cantidad del Producto ${estadoPZ.productoNumero}`;

    console.log(`🔄 Panel de control actualizado - S:${estadoPZ.seccionActual}, N:${estadoPZ.nivelActual}, P:${estadoPZ.productoNumero}`);
}

/**
 * Actualiza la tabla/hoja de cálculo con los productos ingresados
 */
function actualizarTablaPZ() {
    const tabla = document.getElementById('tablaPZ');
    tabla.innerHTML = '';

    let numeroFila = 1;

    estadoPZ.seccionEnProgreso.niveles.forEach((nivel, indexNivel) => {
        nivel.productos.forEach((producto) => {
            const fila = document.createElement('tr');
            fila.className = indexNivel % 2 === 0 ? 'bg-white dark-table-row' : 'bg-gray-50 dark-table-row-alt';
            
            const caducidadLabel = producto.caducidad === 'este_mes' 
                ? '🔴 Este Mes' 
                : '🟡 Después';

            fila.innerHTML = `
                <td class="border border-gray-300 p-2 text-sm font-bold">${numeroFila}</td>
                <td class="border border-gray-300 p-2 text-sm">${producto.nombre || `Producto ${producto.numero}`} (Nivel ${nivel.nivel})</td>
                <td class="border border-gray-300 p-2 text-sm text-center font-semibold">${producto.cantidad} ${producto.unidad || 'pz'}</td>
                <td class="border border-gray-300 p-2 text-sm text-center">${caducidadLabel}</td>
            `;

            tabla.appendChild(fila);
            numeroFila++;
        });
    });

    console.log(`🔄 Tabla actualizada - ${numeroFila - 1} productos mostrados`);
}

/**
 * Limpia los inputs de entrada
 */
function limpiarInputs() {
    document.getElementById('inputCantidad').value = '';
    document.getElementById('selectCaducidad').value = '';
    document.getElementById('nombreProductoInventario').value = '';
    document.getElementById('inputCantidad').focus();

    console.log('🧹 Inputs limpiados');
}

/**
 * Cierra el modal del modo PZ
 */
function cerrarModalPZ() {
    const modal = document.getElementById('modalInventarioPZ');
    modal.style.display = 'none';

    console.log('❌ Modal PZ cerrado');
}
