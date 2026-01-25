// Módulo Principal - Modo PZ (FASE 2+)
// Gestiona el flujo completo de inventario por secciones y niveles

import { guardarSeccionEnHistorial, obtenerHistorialSecciones, mostrarHistorialVisual } from './pz-persistencia.js';
import { inicializarDBPZ, guardarSeccionComplotaEnDB, obtenerEstadisticasDB, obtenerTodasLasSecciones, obtenerProductosPorSeccion, limpiarBaseDatosPZ } from '../../db/db-operations-pz.js';
import { inicializarEscaner, iniciarEscaneo, confirmarEscaneo, detenerEscaneo, finalizarEscaneo, estadoEscaneo } from './pz-scanner.js';
import { inicializarDBInventarioTemporal, obtenerResumenEscaneo, guardarProductoEscaneado, obtenerProductosEscaneados, limpiarInventarioTemporal } from './pz-inventario-temporal.js';
import { registrarEventListenersEscanerPZ, actualizarContadorEscaneo } from './pz-scanner-ui.js';
import { generarReporte, mostrarReporte } from './pz-reportes.js';
import { validarCantidad, validarAlmenoUnProducto, validarConexionSupabase, validarEscanerDisponible, mostrarConfirmacion, mostrarAlerta, validarFlujoCompleto, loggerPZ } from './pz-validaciones.js';

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
        
        // 🧹 Limpiar base de datos anterior para nueva sesión
        console.log('🧹 Limpiando base de datos de sesión anterior...');
        await limpiarBaseDatosPZ();
        console.log('✅ Base de datos limpiada - Nueva sesión iniciada');
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

    loggerPZ.agregar('DEBUG', `Guardando producto: ${nombre}, cantidad: ${cantidad}`, { productoNumero: estadoPZ.productoNumero });

    // FASE 10: Validaciones mejoradas
    const valCantidad = validarCantidad(cantidad);
    if (!valCantidad.valido) {
        mostrarAlerta(valCantidad.mensaje, 'error', 3000);
        loggerPZ.agregar('WARN', 'Cantidad inválida', { cantidad, mensaje: valCantidad.mensaje });
        return;
    }

    if (!caducidad) {
        mostrarAlerta('❌ Debes seleccionar un tipo de caducidad', 'error', 3000);
        loggerPZ.agregar('WARN', 'Caducidad no seleccionada');
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
    loggerPZ.agregar('DEBUG', 'Finalizando conteo por secciones');
    
    // Validar que hay al menos una sección completada o en progreso
    const seccionesCompletadas = estadoPZ.secciones.length;
    const totalProductosActual = estadoPZ.seccionEnProgreso.niveles.reduce(
        (sum, nivel) => sum + nivel.productos.length,
        0
    );
    
    const totalProductos = estadoPZ.totalProductosIngresados;

    // FASE 10: Validar al menos 1 producto
    const valProductos = validarAlmenoUnProducto(totalProductos);
    if (!valProductos.valido) {
        mostrarAlerta(valProductos.mensaje, 'error', 3000);
        loggerPZ.agregar('ERROR', 'Validación de productos fallida', { totalProductos });
        return;
    }
    
    // Mostrar confirmación si tiene pocos productos
    if (valProductos.advertencia) {
        const confirma = await mostrarConfirmacion(
            valProductos.mensaje,
            `Total de productos: ${totalProductos}`
        );
        if (!confirma) {
            loggerPZ.agregar('INFO', 'Finalizacion cancelada por usuario');
            return;
        }
    }

    // Guardar última sección en progreso si tiene productos
    if (totalProductosActual > 0) {
        estadoPZ.secciones.push(JSON.parse(JSON.stringify(estadoPZ.seccionEnProgreso)));
        guardarSeccionEnHistorial(estadoPZ.seccionEnProgreso);
        console.log(`✅ Última sección (${estadoPZ.seccionActual}) guardada`);
        loggerPZ.agregar('INFO', `Última sección guardada: ${estadoPZ.seccionActual}`, { productos: totalProductosActual });
    }

    console.log(`✅ Conteo por secciones finalizado - Total: ${estadoPZ.secciones.length} secciones`);
    loggerPZ.agregar('INFO', 'Conteo finalizado', { 
        seccionesCompletadas, 
        totalProductos,
        timestamp: new Date().toISOString()
    });

    // FASE 5: Guardar todas las secciones en IndexedDB
    try {
        console.log('💾 Guardando secciones en IndexedDB...');
        for (const seccion of estadoPZ.secciones) {
            const resultado = await guardarSeccionComplotaEnDB(seccion);
            console.log(`✅ Sección ${seccion.seccion} guardada en BD (ID: ${resultado.seccionId})`);
            loggerPZ.agregar('DEBUG', `Sección guardada en IndexedDB`, { seccion: seccion.seccion, id: resultado.seccionId });
        }

        const stats = await obtenerEstadisticasDB();
        console.log('📊 Estadísticas de BD:', stats);
        loggerPZ.agregar('INFO', 'Estadísticas de BD', stats);
    } catch (error) {
        console.error('❌ Error guardando en IndexedDB:', error);
        loggerPZ.agregar('ERROR', 'Error guardando en IndexedDB', { error: error.message });
    }

    cerrarModalPZ();
    mostrarOpcionesPostConteo();
}

/**
 * FASE 6: Inicia el proceso de escaneo de productos
 */
async function iniciarEscanerPZ() {
    console.log('🔍 FASE 6: Iniciando escaneo de productos');
    loggerPZ.agregar('INFO', 'Iniciando escaneo de productos');
    
    // FASE 10: Validación completa antes de escanear
    const totalProductos = estadoPZ.totalProductosIngresados;
    console.log(`🔍 FASE 10: Validando flujo completo (${totalProductos} productos)...`);
    
    const validacion = await validarFlujoCompleto(totalProductos);
    
    if (!validacion.valido) {
        console.error('❌ Validación fallida:', validacion.errores);
        loggerPZ.agregar('ERROR', 'Validación de escaneo fallida', validacion);
        
        // Mostrar errores al usuario
        const mensajeErrores = validacion.errores.join('\n\n');
        mostrarAlerta(`Errores encontrados:\n\n${mensajeErrores}`, 'error', 5000);
        
        // Modal detallado con opciones
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 25px; max-width: 500px; box-shadow: 0 4px 30px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 15px 0; color: #ef4444; font-size: 20px;">⛔ No se puede iniciar escaneo</h3>
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px; max-height: 250px; overflow-y: auto;">
                    ${validacion.errores.map(e => `<div style="margin: 8px 0; color: #991b1b; font-size: 14px; line-height: 1.5;">${e}</div>`).join('')}
                </div>
                ${validacion.advertencias.length > 0 ? `
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">⚠️ Advertencias:</h4>
                        ${validacion.advertencias.map(a => `<div style="margin: 5px 0; color: #b45309; font-size: 13px;">${a}</div>`).join('')}
                    </div>
                ` : ''}
                <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ✅ Entendido
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        return;
    }
    
    // Mostrar advertencias si las hay
    if (validacion.advertencias.length > 0) {
        const detalles = validacion.advertencias.join('\n\n');
        mostrarAlerta(`⚠️ ${detalles}`, 'warning', 4000);
        loggerPZ.agregar('WARN', 'Advertencias de validación', validacion.advertencias);
    }
    
    loggerPZ.agregar('INFO', 'Validación completada exitosamente', { 
        productosValidados: totalProductos,
        avisos: validacion.advertencias.length 
    });
    
    // FASE 8.3: Si hay múltiples áreas, permitir seleccionar cuál escanear
    let areaAEscanear = null;
    try {
        const { seleccionarAreaParaEscaneo } = await import('./pz-seleccionar-area-escaneo.js');
        areaAEscanear = await seleccionarAreaParaEscaneo();
        loggerPZ.agregar('DEBUG', 'Área seleccionada para escaneo', { areaId: areaAEscanear });
    } catch (error) {
        console.warn('⚠️ No se pudo seleccionar área, continuando con todas:', error.message);
        loggerPZ.agregar('WARN', 'Selección de área no disponible, usando todas');
        areaAEscanear = null; // Escanear todas las áreas
    }
    
    // Verificar que hay productos para escanear
    if (!estadoPZ.secciones || estadoPZ.secciones.length === 0) {
        mostrarAlerta('❌ No hay secciones registradas para escanear', 'error', 3000);
        loggerPZ.agregar('ERROR', 'No hay secciones para escanear');
        return;
    }

    // PRE-INICIALIZAR IndexedDB para inventario temporal ANTES de usar
    try {
        console.log('🔄 Pre-inicializando IndexedDB del inventario temporal...');
        await inicializarDBInventarioTemporal();
        console.log('✅ IndexedDB del inventario temporal pre-inicializada');
        loggerPZ.agregar('DEBUG', 'IndexedDB inicializada');
        
        // LIMPIAR inventario temporal antes de empezar nuevo escaneo
        console.log('🧹 Limpiando inventario temporal de escaneos anteriores...');
        await limpiarInventarioTemporal();
        console.log('✅ Inventario temporal limpiado');
        loggerPZ.agregar('DEBUG', 'Inventario temporal limpiado');
    } catch (error) {
        console.error('❌ Error pre-inicializando IndexedDB:', error);
        mostrarAlerta(`Error inicializando base de datos: ${error.message}`, 'error', 4000);
        loggerPZ.agregar('ERROR', 'Error inicializando IndexedDB', { error: error.message });
        return;
    }

    // Obtener todos los productos virtuales para escanear
    // IMPORTANTE: Cargar desde IndexedDB para obtener productos de TODAS las áreas (o solo la seleccionada)
    let productosVirtuales = [];
    
    try {
        // Cargar todas las secciones guardadas en IndexedDB (de TODAS las áreas)
        const seccionesGuardadas = await obtenerTodasLasSecciones();
        
        console.log(`📊 Secciones recuperadas de IndexedDB: ${seccionesGuardadas.length}`);
        console.log(`🎯 Área para escanear: ${areaAEscanear || 'TODAS'}`);
        console.log('🔍 Primera sección para debuggear:', seccionesGuardadas[0]);
        
        // Para cada sección, obtener sus productos
        for (const seccion of seccionesGuardadas) {
            // FASE 8.3: Filtrar por área si fue seleccionada
            const seccionArea = seccion.area_id || 'sin-area'; // Por defecto 'sin-area' si no está definido
            
            if (areaAEscanear && seccionArea !== areaAEscanear) {
                console.log(`⏭️ Saltando sección ${seccion.seccion_numero} (área ${seccionArea} no coincide con ${areaAEscanear})`);
                continue; // Saltar esta sección (no es del área seleccionada)
            }
            
            // Obtener todos los productos de esta sección
            try {
                const productosSeccion = await obtenerProductosPorSeccion(seccion.id);
                
                console.log(`📦 Sección ${seccion.seccion_numero}: ${productosSeccion.length} productos encontrados`);
                
                productosSeccion.forEach(producto => {
                    // Generar ID único consistente: seccion-nivel-nombre
                    const id = `${seccion.seccion_numero}_${producto.nivel || 1}_${producto.nombre || 'producto'}`.toLowerCase().replace(/\s+/g, '_');
                    
                    productosVirtuales.push({
                        id: id,
                        ...producto,
                        // Generar nombre si no existe
                        nombre: producto.nombre || `Producto Sección ${seccion.seccion_numero}`,
                        // Usar unidad por defecto si no existe
                        unidad: producto.unidad || 'pz',
                        seccion: seccion.seccion_numero,
                        area_id: seccionArea
                    });
                });
            } catch (err) {
                console.warn(`⚠️ Error obteniendo productos de sección ${seccion.seccion_numero}:`, err);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error cargando desde IndexedDB, usando estadoPZ:', error.message);
        // FALLBACK: Usar estadoPZ si hay error
        estadoPZ.secciones.forEach(seccion => {
            if (seccion.niveles && Array.isArray(seccion.niveles)) {
                seccion.niveles.forEach(nivel => {
                    if (nivel.productos && Array.isArray(nivel.productos)) {
                        nivel.productos.forEach(producto => {
                            // Generar ID único consistente: seccion-nivel-nombre
                            const id = `${seccion.seccion}_${nivel.nivel}_${producto.nombre || 'producto'}`.toLowerCase().replace(/\s+/g, '_');
                            
                            productosVirtuales.push({
                                id: id,
                                ...producto,
                                seccion: seccion.seccion,
                                nivel: nivel.nivel
                            });
                        });
                    }
                });
            }
        });
    }

    console.log(`📦 Productos virtuales a escanear: ${productosVirtuales.length}`);
    
    // DEBUG: Mostrar productos cargados
    if (productosVirtuales.length === 0) {
        console.warn('⚠️ No hay productos virtuales para escanear');
        mostrarAlerta('No hay productos virtuales para escanear. Debe agregar productos primero.', 'warning', 3000);
        loggerPZ.agregar('WARN', 'No hay productos virtuales para escanear');
        return;
    }
    
    // Mostrar listado de productos a escanear en consola
    console.table(productosVirtuales);

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
        console.log('📷 Intentando inicializar escáner QR...');
        await inicializarEscaner('qr-scanner');
        console.log('✅ Escáner inicializado correctamente');
        loggerPZ.agregar('INFO', 'Escáner QR inicializado', { elementId: 'qr-scanner' });
        
        // Iniciar escaneo del primer producto
        if (productosVirtuales.length > 0) {
            console.log(`🎬 Iniciando escaneo del primer producto (${productosVirtuales.length} productos en total)`);
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
    console.log(`🔄 Actualizando panel de escaneo: Producto #${indice + 1}/${total}`, producto);
    
    // Buscar elementos del panel
    const scanProductoNumero = document.getElementById('scanProductoNumero');
    const scanProductoCantidad = document.getElementById('scanProductoCantidad');
    const scanProductoCaducidad = document.getElementById('scanProductoCaducidad');
    const scanProgreso = document.getElementById('scanProgreso');

    console.log('🔍 Elementos encontrados:', {
        scanProductoNumero: !!scanProductoNumero,
        scanProductoCantidad: !!scanProductoCantidad,
        scanProductoCaducidad: !!scanProductoCaducidad,
        scanProgreso: !!scanProgreso
    });

    // Actualizar directamente sin reintentos si encontramos los elementos
    if (scanProductoNumero) {
        scanProductoNumero.textContent = String(indice + 1);
        scanProductoNumero.style.color = '#1e3a8a';
    }
    if (scanProductoCantidad) {
        scanProductoCantidad.textContent = `${producto.cantidad} ${producto.unidad}`;
        scanProductoCantidad.style.color = '#1e3a8a';
    }
    if (scanProductoCaducidad) {
        scanProductoCaducidad.textContent = producto.caducidad || 'S/E';
        scanProductoCaducidad.style.color = '#1e3a8a';
    }
    if (scanProgreso) {
        scanProgreso.textContent = `${indice + 1}/${total}`;
        scanProgreso.style.color = '#1e3a8a';
    }

    // Si falta alguno, reintentar una sola vez después de 50ms
    if (!scanProductoNumero || !scanProductoCantidad || !scanProductoCaducidad || !scanProgreso) {
        console.warn('⚠️ Faltaron elementos, reintentando en 50ms...');
        setTimeout(() => {
            const elementos = {
                scanProductoNumero: document.getElementById('scanProductoNumero'),
                scanProductoCantidad: document.getElementById('scanProductoCantidad'),
                scanProductoCaducidad: document.getElementById('scanProductoCaducidad'),
                scanProgreso: document.getElementById('scanProgreso')
            };
            
            if (elementos.scanProductoNumero) elementos.scanProductoNumero.textContent = String(indice + 1);
            if (elementos.scanProductoCantidad) elementos.scanProductoCantidad.textContent = `${producto.cantidad} ${producto.unidad}`;
            if (elementos.scanProductoCaducidad) elementos.scanProductoCaducidad.textContent = producto.caducidad || 'S/E';
            if (elementos.scanProgreso) elementos.scanProgreso.textContent = `${indice + 1}/${total}`;
            
            console.log('✅ Panel actualizado en reintento');
        }, 50);
    } else {
        console.log('✅ Panel actualizado exitosamente');
    }

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

        // IMPORTANTE: Pasar TODOS los datos del producto escaneado (marca, categoría, unidad, etc.)
        const datosEscaneo = {
            // ID del producto virtual (para relacionar)
            virtual_id: productoVirtual.id || 0,
            
            // Datos del producto escaneado (del código de barras)
            codigo_producto: productoFisico.codigo || 'N/A',
            nombre: productoFisico.nombre,
            marca: productoFisico.marca || '',
            categoria: productoFisico.categoria || '',
            unidad: productoFisico.unidad || 'unidad',
            
            // Datos del conteo manual (FASE 3)
            cantidad: productoVirtual.cantidad,
            caducidad: productoVirtual.caducidad,
            
            // Ubicación/Sección del producto
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
        
        // Obtener todos los productos virtuales con sus IDs reales desde IndexedDB
        const productosVirtuales = await recolectarProductosVirtuales();
        
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
 * Recolecta todos los productos virtuales ingresados DESDE INDEXEDDB
 * Retorna los productos con sus IDs reales de IndexedDB (autoincrement)
 * IMPORTANTE: Esto asegura que los virtual_id coincidan entre escaneos y reportes
 */
async function recolectarProductosVirtuales() {
    const productos = [];
    
    try {
        // Cargar todas las secciones guardadas en IndexedDB
        const seccionesGuardadas = await obtenerTodasLasSecciones();
        
        // Para cada sección, obtener sus productos
        for (const seccion of seccionesGuardadas) {
            try {
                const productosSeccion = await obtenerProductosPorSeccion(seccion.id);
                
                productosSeccion.forEach(producto => {
                    productos.push({
                        id: producto.id,  // ID REAL de IndexedDB (autoincrement)
                        ...producto,
                        seccion: seccion.seccion_numero,
                        nivel: producto.nivel
                    });
                });
            } catch (err) {
                console.warn(`⚠️ Error obteniendo productos de sección ${seccion.seccion_numero}:`, err);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error recolectando productos virtuales desde IndexedDB:', error.message);
        // FALLBACK: Si hay error, intentar desde estadoPZ (compatibilidad)
        console.warn('⚠️ Usando fallback a estadoPZ...');
        
        estadoPZ.secciones.forEach((seccion) => {
            seccion.niveles.forEach((nivel) => {
                nivel.productos.forEach((producto) => {
                    productos.push({
                        id: `${seccion.seccion}_${nivel.nivel}_${producto.nombre}`.toLowerCase().replace(/\s+/g, '_'),
                        ...producto,
                        seccion: seccion.seccion,
                        nivel: nivel.nivel
                    });
                });
            });
        });
    }
    
    return productos;
}

// Función obtenerProductosEscaneados importada desde pz-inventario-temporal.js

/**
 * Muestra opciones después de finalizar el conteo
 */
function mostrarOpcionesPostConteo() {
    const modalHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h2 style="margin: 0 0 15px 0; color: #111; font-size: 22px;">✅ Conteo Finalizado</h2>
                <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">
                    Se han registrado <strong>${estadoPZ.secciones.length} secciones</strong> con todos sus productos.
                </p>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px;">
                    <div style="margin-bottom: 8px;"><strong>📊 Resumen:</strong></div>
                    <div>✅ Secciones: ${estadoPZ.secciones.length}</div>
                    <div>📦 Total niveles: ${estadoPZ.secciones.reduce((sum, s) => sum + s.niveles.length, 0)}</div>
                    <div>🏷️ Total productos: ${estadoPZ.totalProductosIngresados}</div>
                </div>
                <p style="color: #666; font-size: 14px; margin-bottom: 20px;">¿Qué deseas hacer?</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnOtraArea" style="padding: 10px 20px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; color: #374151;">
                        📍 Contar Otra Área
                    </button>
                    <button id="btnComenzarEscaneo" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        ✅ Comenzar a Escanear
                    </button>
                </div>
            </div>
        </div>
    `;

    const contenedor = document.createElement('div');
    contenedor.id = 'modalOpcionesPostConteo';
    contenedor.innerHTML = modalHTML;
    document.body.appendChild(contenedor);

    // Event listeners
    const btnComenzarEscaneo = contenedor.querySelector('#btnComenzarEscaneo');
    const btnOtraArea = contenedor.querySelector('#btnOtraArea');

    if (btnComenzarEscaneo) {
        btnComenzarEscaneo.addEventListener('click', () => {
            console.log('🔍 Usuario seleccionó: Comenzar a escanear');
            contenedor.remove();
            iniciarEscanerPZ();
        });
    }

    if (btnOtraArea) {
        btnOtraArea.addEventListener('click', async () => {
            console.log('📍 Usuario seleccionó: Contar otra área');
            contenedor.remove();
            // FASE 8: Seleccionar otra área
            const { seleccionarOtraArea } = await import('./pz-areas.js');
            seleccionarOtraArea();
        });
    }
}

/**
 * Reinicializa el modo PZ para contar otra área
 * @param {string} areaId - ID del área seleccionada
 * @param {string} areaNombre - Nombre del área
 */
export async function reinicializarModoConteoNuevaArea(areaId, areaNombre) {
    console.log(`🔄 FASE 8: Reinicializando Modo PZ para nueva área: ${areaNombre}`);

    // Mostrar confirmación
    const confirmacion = await new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                    <h2 style="margin: 0 0 15px 0; color: #111;">📍 Confirmar Nueva Área</h2>
                    <p style="color: #666; margin-bottom: 20px;">
                        Se iniciará un nuevo conteo para el área:<br>
                        <strong>${areaNombre}</strong>
                    </p>
                    <p style="color: #d97706; font-size: 14px; margin-bottom: 20px;">
                        ⚠️ Los datos anteriores se mantendrán en la base de datos.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove(); window.pz_confirmarNuevaArea(false);" style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove(); window.pz_confirmarNuevaArea(true);" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ✅ Confirmar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        window.pz_confirmarNuevaArea = (confirm) => {
            resolve(confirm);
        };
    });

    if (!confirmacion) {
        console.log('❌ Nuevo conteo cancelado');
        mostrarOpcionesPostConteo();
        return;
    }

    // Reinicializar estado
    reiniciarEstadoPZ();

    // Mostrar modal nuevamente
    const modal = document.getElementById('modalInventarioPZ');
    if (modal) {
        modal.style.display = 'block';
    }

    // Actualizar UI
    actualizarPanelControl();
    actualizarTablaPZ();

    console.log(`✅ Modo PZ reinicializado para área: ${areaNombre}`);
}

/**
 * Actualiza el panel de control
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
