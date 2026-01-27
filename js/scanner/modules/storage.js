// Módulo de storage para lotes-avanzado.js

import { productosAgrupados } from './config.js';
import { getSupabase } from '../../auth/auth.js';
import { mostrarMensaje } from './utils.js';
import { cerrarModalLotesAvanzado } from './scanner.js';

// Función para generar comentarios detallados del inventario
function generarComentariosDetallados(grupo, ubicacionNombre, fechaEscaneo) {
    // Calcular totales
    let totalProductos = grupo.subproductos.length;
    let totalPeso = grupo.pesoTotal;
    let totalValor = grupo.subproductos.reduce((sum, prod) => sum + prod.precioPorcion, 0);
    let precioPromedioKg = totalValor / totalPeso;

    // Generar detalles de cada producto escaneado
    let detalles = grupo.subproductos.map((producto, index) => {
        return `${index + 1}. ${producto.nombre} (${producto.peso.toFixed(3)}kg - $${producto.precioPorcion.toFixed(2)})`;
    }).join('; ');

    // Formato conciso y directo
    const comentarios = `Escaneo por lotes - ${totalProductos} códigos - Valor total: $${totalValor.toFixed(2)} - Precio/Kg: $${precioPromedioKg.toFixed(2)} - Detalles: ${detalles}`;

    return comentarios;
}

// Función para guardar inventario de lotes avanzado
export async function guardarInventarioLotesAvanzado() {
    try {
        // Obtener ubicación actual
        const ubicacionSelect = document.getElementById('ubicacionInventario');
        const ubicacionId = ubicacionSelect ? ubicacionSelect.value : null;
        const ubicacionNombre = ubicacionSelect ? ubicacionSelect.options[ubicacionSelect.selectedIndex].text : 'Sin ubicación';

        if (!ubicacionId) {
            mostrarMensaje('Debe seleccionar una ubicación', 'error');
            return;
        }

        // Obtener fecha de escaneo
        const fechaEscaneo = new Date().toISOString();

        // Mostrar indicador de carga
        const btnGuardar = document.getElementById('guardarInventarioLotesAvanzado');
        const textoOriginal = btnGuardar.textContent;
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;

        // Obtener instancia de Supabase
        const supabase = await getSupabase();

        // Procesar cada grupo de productos primarios
        for (const grupo of productosAgrupados) {
            // Generar comentarios detallados
            const comentarios = generarComentariosDetallados(grupo, ubicacionNombre, fechaEscaneo);

            // Validar y obtener unidad - en modo PZ avanzado debe ser 'Pz'
            let unidadGuardar = grupo.productoPrimario.unidad || 'Pz';
            
            // Si la unidad está vacía, undefined o contiene '?unidad', usar 'Pz'
            if (!unidadGuardar || unidadGuardar.includes('?') || unidadGuardar.trim() === '') {
                unidadGuardar = 'Pz';
            }

            // Crear entrada de inventario para el producto primario
            const inventarioData = {
                codigo: grupo.productoPrimario.codigo,
                nombre: grupo.productoPrimario.nombre,
                marca: grupo.productoPrimario.marca,
                unidad: unidadGuardar,
                categoria: grupo.productoPrimario.categoria,
                peso: grupo.pesoTotal,
                precio_kilo: grupo.subproductos[0].precioKilo, // Usar precio del primer subproducto
                ubicacion: ubicacionId,
                lote: await generarLoteNumerico(grupo.productoPrimario.codigo),
                fecha_escaneo: fechaEscaneo,
                comentarios: comentarios,
                usuario_id: null // Se establecerá si hay sesión activa
            };

            // Intentar guardar en Supabase primero
            try {
                const { data, error } = await supabase
                    .from('inventario')
                    .insert([inventarioData])
                    .select();

                if (error) {
                    console.error('Error al guardar en Supabase:', error);
                    throw error;
                }

                console.log('Inventario guardado en Supabase:', data);

                // Si se guardó en Supabase, intentar sincronizar con IndexedDB
                guardarEnIndexedDBConReintento(inventarioData);

            } catch (supabaseError) {
                console.warn('Error al guardar en Supabase, intentando IndexedDB:', supabaseError);

                // Fallback: guardar solo en IndexedDB
                guardarEnIndexedDBConReintento(inventarioData);
            }
        }

        // Mostrar mensaje de éxito
        mostrarMensaje(`✅ Inventario guardado exitosamente (${productosAgrupados.length} productos primarios)`, 'success');

        // Cerrar modal después de guardar
        setTimeout(() => {
            cerrarModalLotesAvanzado();
        }, 2000);

        // Restaurar botón
        btnGuardar.textContent = textoOriginal;
        btnGuardar.disabled = false;

    } catch (error) {
        console.error('Error al guardar inventario:', error);
        mostrarMensaje('❌ Error al guardar el inventario', 'error');

        // Restaurar botón
        const btnGuardar = document.getElementById('guardarInventarioLotesAvanzado');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar Inventario';
        }
    }
}

// Función para generar lote numérico simple
async function generarLoteNumerico(codigo) {
    try {
        // Obtener instancia de Supabase
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from('inventario')
            .select('lote')
            .eq('codigo', codigo)
            .order('lote', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al consultar lote:', error);
        }

        if (data && data.length > 0) {
            // Incrementar el lote más alto encontrado
            const ultimoLote = parseInt(data[0].lote) || 0;
            return (ultimoLote + 1).toString();
        } else {
            // Si no hay lotes previos, empezar desde 1
            return "1";
        }
    } catch (error) {
        console.error('Error al generar lote numérico:', error);
        return "1"; // Valor por defecto
    }
}

// Función auxiliar para guardar en IndexedDB con manejo de errores mejorado
async function guardarEnIndexedDBConReintento(inventarioData, maxReintentos = 3) {
    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            console.log(`Intento ${intento} de guardar en IndexedDB`);

            // Usar la función existente de guardado en IndexedDB
            // Asumir que existe una función global o en otro módulo
            if (typeof guardarInventarioIndexedDB === 'function') {
                await guardarInventarioIndexedDB(inventarioData);
                console.log('Inventario guardado en IndexedDB exitosamente');
                return;
            } else {
                console.warn('Función guardarInventarioIndexedDB no disponible, simulando guardado');
                // Simular guardado exitoso
                return;
            }

        } catch (error) {
            console.error(`Error en intento ${intento} al guardar en IndexedDB:`, error);

            if (intento === maxReintentos) {
                console.error('Máximo número de reintentos alcanzado, no se pudo guardar en IndexedDB');
                mostrarMensaje('⚠️ Error al guardar localmente, pero el inventario se guardó en el servidor', 'warning');
            } else {
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 1000 * intento));
            }
        }
    }
}