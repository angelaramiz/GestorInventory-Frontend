/**
 * ⚠️ ARCHIVO EN PROCESO DE REFACTORIZACIÓN
 * 
 * Este archivo gestiona la generación de reportes PDF con códigos de barras.
 * Está marcado para refactorización futura en un ReportService especializado.
 * 
 * ESTADO ACTUAL: FUNCIONAL (Fase 3 completada)
 * PRÓXIMA FASE: Migrar a ReportService (Fase 4)
 * 
 * FUNCIONALIDADES:
 * - Generación de reportes PDF con jsPDF
 * - Códigos de barras con JsBarcode
 * - Filtrado por áreas y categorías
 * - Agrupación por fecha de caducidad
 * - Fusión de productos por código
 * 
 * DEPENDENCIAS:
 * - db-operations.js (obtenerAreasPorCategoria)
 * - auth.js (getSupabase)
 * - jsPDF (generación PDF)
 * - JsBarcode (códigos de barras)
 * - SweetAlert2 (alertas)
 * 
 * USO: Solo en plantillas/report.html
 * 
 * FUTURO REPORTE SERVICE:
 * - Separar lógica de negocio de UI
 * - Modularizar generación de PDF
 * - Crear servicio de exportación
 * - Mejorar performance y mantenibilidad
 * 
 * @deprecated Para nuevo código, planear arquitectura de ReportService
 * @version 3.0.0
 */

console.info('📊 rep.js - Sistema de reportes cargado (pendiente refactorización a ReportService)');

import { obtenerAreasPorCategoria } from './db-operations.js';
import { getSupabase } from './auth.js';

let productosInventario = [];
let supabase;
let todasLasAreas = [];

// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar Supabase
        supabase = await getSupabase();
        if (!supabase) {
            throw new Error('Supabase no está inicializado');
        }

        // Cargar áreas y productos
        await cargarAreas();
        await cargarProductos();

        // Event listeners
        document.getElementById('area-todas').addEventListener('change', toggleTodasLasAreas);
        document.getElementById('aplicarFiltroBtn').addEventListener('click', filtrarProductosPorAreasSeleccionadas);
        document.getElementById('generarReporteBtn').addEventListener('click', mostrarOpcionesReporte);
    } catch (error) {
        console.error('Error al inicializar la página:', error);
        Swal.fire('Error', 'Ocurrió un error al inicializar la página.', 'error');
    }
});

// Función para manejar la selección de "Todas las áreas"
function toggleTodasLasAreas(e) {
    const isChecked = e.target.checked;
    document.querySelectorAll('.areaCheckbox').forEach(checkbox => {
        if (checkbox.id !== 'area-todas') {
            checkbox.checked = false;
            checkbox.disabled = isChecked;
        }
    });
}

// Maneja el evento cuando se selecciona un área específica
function handleAreaSpecificSelection() {
    const areaCheckboxes = document.querySelectorAll('.areaCheckbox:not(#area-todas)');
    const todasCheckbox = document.getElementById('area-todas');

    // Si hay al menos un área específica seleccionada, desmarcar "Todas las áreas"
    const hayAreasSeleccionadas = Array.from(areaCheckboxes).some(cb => cb.checked);
    if (hayAreasSeleccionadas) {
        todasCheckbox.checked = false;
    }
}

// Cargar áreas disponibles usando la función obtenerAreasPorCategoria
async function cargarAreas() {
    try {
        mostrarCargando(true);

        const areas = await obtenerAreasPorCategoria();
        if (!areas || areas.length === 0) {
            console.warn('No se encontraron áreas disponibles.');
            return;
        }

        // console.log('Áreas disponibles:', areas);
        todasLasAreas = areas; // Guardar todas las áreas

        const areasContainer = document.getElementById('areasContainer');
        if (areasContainer) {
            // Mantener el checkbox de "Todas las áreas" que ya existe en el HTML
            areas.forEach(area => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'flex items-center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `area-${area.id}`;
                checkbox.value = area.id;
                checkbox.className = 'areaCheckbox mr-2';
                checkbox.disabled = document.getElementById('area-todas').checked; // Desactivado si "Todas" está marcado

                checkbox.addEventListener('change', handleAreaSpecificSelection);

                const label = document.createElement('label');
                label.htmlFor = `area-${area.id}`;
                label.textContent = area.nombre;

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                areasContainer.appendChild(checkboxDiv);
            });
        }
    } catch (error) {
        console.error('Error al cargar áreas:', error);
        Swal.fire('Error', 'No se pudieron cargar las áreas.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Cargar todos los productos del inventario desde Supabase
async function cargarProductos() {
    try {
        mostrarCargando(true);

        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        productosInventario = data;
        mostrarProductosEnLista(productosInventario);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos. Verifica tu conexión a internet.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Filtrar productos por áreas seleccionadas
async function filtrarProductosPorAreasSeleccionadas() {
    const todasSeleccionadas = document.getElementById('area-todas').checked;

    if (todasSeleccionadas) {
        // Si "Todas las áreas" está seleccionado, mostrar todos los productos
        mostrarProductosEnLista(productosInventario);
        return;
    }

    try {
        mostrarCargando(true);

        // Obtener IDs de todas las áreas seleccionadas
        const areasSeleccionadas = Array.from(
            document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)')
        ).map(checkbox => checkbox.value);

        if (areasSeleccionadas.length === 0) {
            // Si no hay áreas seleccionadas, no mostrar productos
            mostrarProductosEnLista([]);
            Swal.fire('Atención', 'Por favor, selecciona al menos un área para mostrar productos.', 'info');
            return;
        }

        // Filtrar productos por las áreas seleccionadas
        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .in('area_id', areasSeleccionadas) // Usar IN para filtrar por múltiples áreas
            .order('nombre', { ascending: true });

        if (error) throw error;

        mostrarProductosEnLista(data);
    } catch (error) {
        console.error('Error al filtrar productos por áreas:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos para las áreas seleccionadas.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Mostrar los productos en la lista
function mostrarProductosEnLista(productos) {
    const container = document.getElementById('productosContainer');
    container.innerHTML = '';

    if (productos.length === 0) {
        container.innerHTML = '<li class="text-gray-500">No hay productos disponibles para esta área.</li>';
        return;
    }

    productos.forEach(producto => {
        const li = document.createElement('li');
        li.className = 'py-1';

        // Buscar el nombre del área si está disponible
        const area = todasLasAreas.find(a => a.id === producto.area_id);
        const areaNombre = area ? area.nombre : 'Área desconocida';

        li.innerHTML = `<span class="font-semibold">${producto.nombre || 'Sin nombre'}</span> - Código: ${producto.codigo || 'Sin código'} <span class="text-gray-500 text-sm">(${areaNombre})</span>`;
        container.appendChild(li);
    });
}

// Mostrar/ocultar indicador de carga
function mostrarCargando(mostrar) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !mostrar);
}

// Mostrar opciones para generar el reporte
function mostrarOpcionesReporte() {
    const todasSeleccionadas = document.getElementById('area-todas').checked;
    const areasSeleccionadas = Array.from(
        document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)')
    ).map(checkbox => checkbox.value);

    if (!todasSeleccionadas && areasSeleccionadas.length === 0) {
        Swal.fire('Atención', 'Por favor, selecciona al menos un área para generar el reporte.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Configuración del reporte',
        html: `
            <div class="text-left">
                <div class="mb-3">
                    <p class="text-sm text-gray-600 mb-2">
                        📋 <strong>El reporte incluirá automáticamente:</strong><br>
                        • Fechas de caducidad • Comentarios • Códigos de barras • Área<br>
                        • Productos ordenados por fecha de caducidad (más próximas primero)<br>
                        • Agrupados por estado de caducidad con colores distintivos
                    </p>
                </div>
                <div class="mb-3">
                    <label class="block mb-1 font-semibold">Filtrar por agrupaciones de fechas de caducidad:</label>
                    <p class="text-xs text-gray-500 mb-2">
                        <strong>Ejemplo:</strong> Si solo necesitas un reporte de productos que vencen en los próximos 7 días, 
                        desmarca "Todas las agrupaciones" y selecciona solo "Vencen en los próximos 7 días"
                    </p>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="incluirTodasAgrupaciones" checked> 📊 Todas las agrupaciones</label>
                        <div id="agrupacionesEspecificas" class="ml-4 space-y-1" style="display: none;">
                            <label><input type="checkbox" id="incluirVencidos" class="agrupacion-checkbox"> 🚨 Productos vencidos</label>
                            <label><input type="checkbox" id="incluirProximaSemana" class="agrupacion-checkbox"> ⚠️ Vencen en los próximos 7 días</label>
                            <label><input type="checkbox" id="incluirMismoMes" class="agrupacion-checkbox"> 📅 Vencen en el mismo mes</label>
                            <label><input type="checkbox" id="incluirSiguienteMes" class="agrupacion-checkbox"> 📆 Vencen el siguiente mes</label>
                            <label><input type="checkbox" id="incluirOtros" class="agrupacion-checkbox"> 📋 Otros (fechas lejanas o sin fecha)</label>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="block mb-1">Opciones adicionales:</label>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="fusionarLotes" checked> 🔗 Fusionar productos idénticos (combinar lotes)</label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Generar',
        cancelButtonText: 'Cancelar',
        didOpen: () => {
            // Event listeners para manejar la selección de agrupaciones
            const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones');
            const agrupacionesDiv = document.getElementById('agrupacionesEspecificas');
            const agrupacionesCheckboxes = document.querySelectorAll('.agrupacion-checkbox');

            todasAgrupaciones.addEventListener('change', function() {
                if (this.checked) {
                    agrupacionesDiv.style.display = 'none';
                    agrupacionesCheckboxes.forEach(cb => cb.checked = false);
                } else {
                    agrupacionesDiv.style.display = 'block';
                }
            });

            agrupacionesCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        todasAgrupaciones.checked = false;
                    }
                    
                    // Si no hay ninguna agrupación específica seleccionada, volver a "Todas"
                    const haySeleccionadas = Array.from(agrupacionesCheckboxes).some(cb => cb.checked);
                    if (!haySeleccionadas) {
                        todasAgrupaciones.checked = true;
                        agrupacionesDiv.style.display = 'none';
                    }
                });
            });
        },
        preConfirm: () => {
            const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones').checked;
            
            return {
                incluirCaducidad: true, // Siempre incluido
                incluirComentarios: true, // Siempre incluido
                incluirCodigo: true, // Siempre incluido
                incluirArea: true, // Siempre incluido
                fusionarLotes: document.getElementById('fusionarLotes').checked,
                filtrarAgrupaciones: !todasAgrupaciones,
                agrupacionesSeleccionadas: todasAgrupaciones ? [] : {
                    vencidos: document.getElementById('incluirVencidos').checked,
                    proximosSemana: document.getElementById('incluirProximaSemana').checked,
                    mismoMes: document.getElementById('incluirMismoMes').checked,
                    siguienteMes: document.getElementById('incluirSiguienteMes').checked,
                    otros: document.getElementById('incluirOtros').checked
                }
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            generarReportePDF(result.value);
        }
    });
}

// Función para fusionar productos que son el mismo pero tienen diferentes lotes
function fusionarProductosPorCodigo(productos) {
    const productosFusionados = [];
    const mapaProductos = new Map(); // Usamos un mapa para agrupar por código

    // Agrupar productos por código
    productos.forEach(producto => {
        const codigo = producto.codigo || 'sincodigo';

        // Si el código ya existe, actualizamos el producto existente
        if (mapaProductos.has(codigo)) {
            const productoExistente = mapaProductos.get(codigo);

            // Sumar cantidades (como números)
            const cantidadOriginal = parseFloat(productoExistente.cantidad) || 0;
            const cantidadNueva = parseFloat(producto.cantidad) || 0;
            productoExistente.cantidad = (cantidadOriginal + cantidadNueva).toString();

            // Acumular información de lotes en los comentarios
            let comentarioLote = `Lote: ${producto.lote || 'Sin especificar'}, Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
            if (producto.caducidad) {
                comentarioLote += `, Caducidad: ${new Date(producto.caducidad).toLocaleDateString('es-ES')}`;
            }

            // Agregar el área si está disponible
            const area = todasLasAreas.find(a => a.id === producto.area_id);
            if (area) {
                comentarioLote += `, Área: ${area.nombre}`;
            }

            // Agregar comentarios originales del producto si existen
            if (producto.comentarios && producto.comentarios !== 'N/A') {
                comentarioLote += `, Notas: ${producto.comentarios}`;
            }

            // Actualizar comentarios del producto fusionado
            if (!productoExistente.comentariosFusionados) {
                // Primera fusión: inicializar el array con el lote original
                const comentarioOriginal = `Lote: ${productoExistente.lote || 'Sin especificar'}, Cantidad: ${cantidadOriginal} ${productoExistente.unidad || 'unidades'}`;

                let comentarioOriginalCompleto = comentarioOriginal;
                if (productoExistente.caducidad) {
                    comentarioOriginalCompleto += `, Caducidad: ${new Date(productoExistente.caducidad).toLocaleDateString('es-ES')}`;
                }

                // Agregar el área para el lote original
                const areaOriginal = todasLasAreas.find(a => a.id === productoExistente.area_id);
                if (areaOriginal) {
                    comentarioOriginalCompleto += `, Área: ${areaOriginal.nombre}`;
                }

                productoExistente.comentariosFusionados = [comentarioOriginalCompleto];

                // Agregar los comentarios originales si existen y no son "N/A"
                if (productoExistente.comentarios && productoExistente.comentarios !== 'N/A') {
                    productoExistente.comentariosFusionados[0] += `, Notas: ${productoExistente.comentarios}`;
                }
            }

            // Añadir el comentario del nuevo lote
            productoExistente.comentariosFusionados.push(comentarioLote);

            // Guardar lotes individuales para mejor visualización
            if (!productoExistente.lotesFusionados) {
                productoExistente.lotesFusionados = [
                    {
                        lote: productoExistente.lote || '1',
                        cantidad: cantidadOriginal,
                        caducidad: productoExistente.caducidad,
                        area_id: productoExistente.area_id,
                        comentarios: productoExistente.comentarios
                    }
                ];
            }

            // Añadir el nuevo lote a la lista
            productoExistente.lotesFusionados.push({
                lote: producto.lote || '1',
                cantidad: cantidadNueva,
                caducidad: producto.caducidad,
                area_id: producto.area_id,
                comentarios: producto.comentarios
            });

            // Actualizar el campo de comentarios para reflejar todos los lotes
            productoExistente.comentarios = `Producto fusionado con múltiples lotes:\n- ${productoExistente.comentariosFusionados.join('\n- ')}`;

            // Conservar la fecha de caducidad más próxima
            if (producto.caducidad && productoExistente.caducidad) {
                const fechaExistente = new Date(productoExistente.caducidad);
                const fechaNueva = new Date(producto.caducidad);
                if (fechaNueva < fechaExistente) {
                    productoExistente.caducidad = producto.caducidad;
                }
            } else if (producto.caducidad) {
                productoExistente.caducidad = producto.caducidad;
            }

        } else {
            // Si es un producto nuevo, simplemente lo agregamos al mapa
            // Creamos una copia para no modificar el original
            const productoCopia = { ...producto };
            // Inicializar campo para lotes fusionados (para uso interno)
            productoCopia.comentariosFusionados = [];
            productoCopia.lotesFusionados = [{
                lote: producto.lote || '1',
                cantidad: parseFloat(producto.cantidad) || 0,
                caducidad: producto.caducidad,
                area_id: producto.area_id,
                comentarios: producto.comentarios
            }];
            mapaProductos.set(codigo, productoCopia);
        }
    });

    // Convertir el mapa a array para retornarlo
    mapaProductos.forEach(producto => {
        productosFusionados.push(producto);
    });

    console.log(`Se han fusionado ${productos.length} productos en ${productosFusionados.length} elementos únicos`);
    return productosFusionados;
}

// Generar el reporte en PDF
async function generarReportePDF(opciones) {
    try {
        mostrarCargando(true);

        // Determinar qué productos incluir en el reporte
        let productos = [];
        const todasSeleccionadas = document.getElementById('area-todas').checked;

        if (todasSeleccionadas) {
            productos = productosInventario;
        } else {
            const areasSeleccionadas = Array.from(
                document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)')
            ).map(checkbox => checkbox.value);

            productos = productosInventario.filter(p => areasSeleccionadas.includes(p.area_id));
        }

        if (productos.length === 0) {
            Swal.fire('Advertencia', 'No hay productos para generar el reporte.', 'warning');
            return;
        }

        if (opciones.fusionarLotes) {
            productos = fusionarProductosPorCodigo(productos);
        }

        // Agrupar productos por área y ordenar por fecha de caducidad
        const productosPorArea = agruparProductosPorArea(productos);

        if (opciones.incluirCodigo) {
            await generarCodigosDeBarras(productos);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const cardWidth = (pageWidth - (margin * 3)) / 2;
        const cardHeight = 45;

        let y = margin; // Posición Y actual en la página
        let contenidoProcesado = false; // Para verificar si se procesó algún contenido

        // Procesar cada área ordenada alfabéticamente
        const areasOrdenadas = Object.keys(productosPorArea).sort((a, b) => {
            const areaA = todasLasAreas.find(area => area.id === a)?.nombre || '';
            const areaB = todasLasAreas.find(area => area.id === b)?.nombre || '';
            return areaA.localeCompare(areaB);
        });

        for (let areaIndex = 0; areaIndex < areasOrdenadas.length; areaIndex++) {
            const areaId = areasOrdenadas[areaIndex];
            const area = todasLasAreas.find(a => a.id === areaId);
            const areaNombre = area ? area.nombre : 'Área desconocida';

            // Categorizar productos por estado de caducidad
            const categorias = categorizarProductosPorCaducidad(productosPorArea[areaId]);

            // Aplicar filtro de agrupaciones si está habilitado
            let categoriasAfiltrar = ['vencidos', 'proximosSemana', 'mismoMes', 'siguienteMes', 'otros'];
            
            if (opciones.filtrarAgrupaciones && opciones.agrupacionesSeleccionadas) {
                // Mantener el orden original de las categorías, pero filtrar las seleccionadas
                categoriasAfiltrar = categoriasAfiltrar.filter(categoria => {
                    switch(categoria) {
                        case 'vencidos': return opciones.agrupacionesSeleccionadas.vencidos;
                        case 'proximosSemana': return opciones.agrupacionesSeleccionadas.proximosSemana;
                        case 'mismoMes': return opciones.agrupacionesSeleccionadas.mismoMes;
                        case 'siguienteMes': return opciones.agrupacionesSeleccionadas.siguienteMes;
                        case 'otros': return opciones.agrupacionesSeleccionadas.otros;
                        default: return false;
                    }
                });
            }

            // Verificar si hay productos en las categorías seleccionadas
            const hayProductosEnCategoriasSeleccionadas = categoriasAfiltrar.some(categoria => 
                categorias[categoria] && categorias[categoria].length > 0
            );

            // Si no hay productos en las categorías seleccionadas para esta área, continuar con la siguiente
            if (!hayProductosEnCategoriasSeleccionadas) {
                continue;
            }

            // Si llegamos aquí, significa que esta área tiene productos para mostrar
            if (contenidoProcesado) {
                doc.addPage();
                y = margin;
            }

            // Título del área
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Productos de inventario de área: "${areaNombre}"`, margin, y);
            y += 15;

            contenidoProcesado = true;

            // Procesar cada categoría seleccionada
            for (const categoria of categoriasAfiltrar) {
                if (!categorias[categoria] || categorias[categoria].length === 0) continue;

                y = procesarCategoriaEnPDF(doc, categorias[categoria], categoria, y, margin, cardWidth, cardHeight, pageHeight, opciones);
            }
        }

        // Verificar si se procesó algún contenido
        if (!contenidoProcesado) {
            Swal.fire('Advertencia', 'No hay productos en las agrupaciones de fechas seleccionadas para generar el reporte.', 'warning');
            return;
        }

        // Generar nombre descriptivo del archivo
        const fechaActual = new Date().toISOString().slice(0, 10);
        let nombreArchivo = `reporte_preconteo_${fechaActual}`;
        
        if (opciones.filtrarAgrupaciones && opciones.agrupacionesSeleccionadas) {
            const agrupacionesActivas = [];
            if (opciones.agrupacionesSeleccionadas.vencidos) agrupacionesActivas.push('vencidos');
            if (opciones.agrupacionesSeleccionadas.proximosSemana) agrupacionesActivas.push('proximos7dias');
            if (opciones.agrupacionesSeleccionadas.mismoMes) agrupacionesActivas.push('mismo_mes');
            if (opciones.agrupacionesSeleccionadas.siguienteMes) agrupacionesActivas.push('siguiente_mes');
            if (opciones.agrupacionesSeleccionadas.otros) agrupacionesActivas.push('otros');
            
            if (agrupacionesActivas.length > 0) {
                nombreArchivo += `_filtrado_${agrupacionesActivas.join('_')}`;
            }
        }
        
        doc.save(`${nombreArchivo}.pdf`);
        Swal.fire('¡Éxito!', 'Reporte de preconteo generado correctamente.', 'success');
    } catch (error) {
        console.error('Error al generar el reporte:', error);
        Swal.fire('Error', 'No se pudo generar el reporte.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Agrupar productos por área
function agruparProductosPorArea(productos) {
    const productosPorArea = {};
    productos.forEach(producto => {
        if (!productosPorArea[producto.area_id]) {
            productosPorArea[producto.area_id] = [];
        }
        productosPorArea[producto.area_id].push(producto);
    });

    // Ordenar productos dentro de cada área por fecha de caducidad (más cercanas primero)
    Object.keys(productosPorArea).forEach(areaId => {
        productosPorArea[areaId].sort((a, b) => {
            if (!a.caducidad) return 1;
            if (!b.caducidad) return -1;
            return new Date(a.caducidad) - new Date(b.caducidad);
        });
    });

    return productosPorArea;
}

// Categorizar productos por estado de caducidad
function categorizarProductosPorCaducidad(productos) {
    const ahora = new Date();
    const fechaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const unaSemanaDesdeHoy = new Date(fechaActual);
    unaSemanaDesdeHoy.setDate(fechaActual.getDate() + 7);

    const finDelMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    const finDelSiguienteMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 2, 0);

    const categorias = {
        vencidos: [],
        proximosSemana: [],
        mismoMes: [],
        siguienteMes: [],
        otros: []
    };

    productos.forEach(producto => {
        if (!producto.caducidad) {
            categorias.otros.push(producto);
            return;
        }

        const fechaCaducidad = new Date(producto.caducidad);

        if (fechaCaducidad < fechaActual) {
            categorias.vencidos.push(producto);
        } else if (fechaCaducidad <= finDelMesActual) {
            // Primero verificar si vence en el mismo mes
            if (fechaCaducidad <= unaSemanaDesdeHoy) {
                categorias.proximosSemana.push(producto);
            } else {
                categorias.mismoMes.push(producto);
            }
        } else if (fechaCaducidad <= finDelSiguienteMes) {
            categorias.siguienteMes.push(producto);
        } else {
            categorias.otros.push(producto);
        }
    });

    return categorias;
}

// Procesar una categoría de productos en el PDF
function procesarCategoriaEnPDF(doc, productos, categoria, yInicial, margin, cardWidth, cardHeight, pageHeight, opciones) {
    let y = yInicial;

    if (productos.length === 0) return y;

    // Verificar si hay espacio para el encabezado de la categoría
    if (y + 20 > pageHeight - margin) {
        doc.addPage();
        y = margin;
    }

    // Configurar estilo del encabezado según la categoría
    const configCategoria = obtenerConfiguracionCategoria(categoria);

    // Dibujar rectángulo de encabezado
    doc.setFillColor(configCategoria.fondo.r, configCategoria.fondo.g, configCategoria.fondo.b);
    doc.setDrawColor(configCategoria.borde.r, configCategoria.borde.g, configCategoria.borde.b);
    doc.setLineWidth(1);
    doc.rect(margin, y, 190, 12, 'FD'); // F = fill, D = draw border

    // Título de la categoría
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(configCategoria.texto.r, configCategoria.texto.g, configCategoria.texto.b);
    doc.text(configCategoria.titulo, margin + 2, y + 8);

    // Resetear color de texto a negro para los productos
    doc.setTextColor(0, 0, 0);

    y += 15;

    // Agregar productos de la categoría
    let currentColumn = 0;
    for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];

        // Calcular X para la columna actual
        const x = margin + currentColumn * (cardWidth + margin / 2);

        // Verificar si necesitamos una nueva página
        if (y + cardHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            currentColumn = 0;
        }

        // Agregar producto con estilo específico de la categoría
        agregarProductoConEstiloCategoria(doc, producto, x, y, cardWidth, cardHeight, opciones, configCategoria);

        currentColumn++;
        if (currentColumn === 2) {
            currentColumn = 0;
            y += cardHeight + 5;
        }
    }

    // Si terminamos en la primera columna, avanzar Y para la siguiente sección
    if (currentColumn === 1) {
        y += cardHeight + 5;
    }

    return y + 10; // Espacio extra entre categorías
}

// Obtener configuración de estilo para cada categoría
function obtenerConfiguracionCategoria(categoria) {
    const configuraciones = {
        vencidos: {
            titulo: '🚨 PRODUCTOS VENCIDOS',
            fondo: { r: 220, g: 53, b: 69 },     // Rojo oscuro
            borde: { r: 139, g: 0, b: 0 },       // Rojo muy oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 220, g: 53, b: 69 }
        },
        proximosSemana: {
            titulo: '⚠️ VENCEN EN MENOS DE UNA SEMANA',
            fondo: { r: 255, g: 193, b: 7 },     // Amarillo
            borde: { r: 212, g: 146, b: 0 },     // Amarillo oscuro
            texto: { r: 0, g: 0, b: 0 },         // Negro
            bordeTarjeta: { r: 255, g: 193, b: 7 }
        },
        mismoMes: {
            titulo: '📅 VENCEN ESTE MES',
            fondo: { r: 255, g: 152, b: 0 },     // Naranja
            borde: { r: 198, g: 117, b: 0 },     // Naranja oscuro
            texto: { r: 0, g: 0, b: 0 },         // Negro
            bordeTarjeta: { r: 255, g: 152, b: 0 }
        },
        siguienteMes: {
            titulo: '📋 VENCEN EL PRÓXIMO MES',
            fondo: { r: 32, g: 201, b: 151 },    // Verde azulado
            borde: { r: 22, g: 141, b: 106 },    // Verde azulado oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 32, g: 201, b: 151 }
        },
        otros: {
            titulo: '📦 OTROS PRODUCTOS',
            fondo: { r: 108, g: 117, b: 125 },   // Gris
            borde: { r: 73, g: 80, b: 87 },      // Gris oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 108, g: 117, b: 125 }
        }
    };

    return configuraciones[categoria] || configuraciones.otros;
}

// Agregar producto con estilo específico de categoría
function agregarProductoConEstiloCategoria(doc, producto, xCurrent, yCurrent, cardWidth, cardHeight, opciones, configCategoria) {
    // Dibujar borde de la tarjeta con color de la categoría
    doc.setDrawColor(configCategoria.bordeTarjeta.r, configCategoria.bordeTarjeta.g, configCategoria.bordeTarjeta.b);
    doc.setLineWidth(0.8);
    doc.rect(xCurrent, yCurrent, cardWidth, cardHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Negro para el texto del producto

    const nombreProducto = producto.nombre || 'Sin nombre';
    const fechaCaducidad = producto.caducidad
        ? new Date(producto.caducidad).toLocaleDateString('es-ES')
        : 'Sin caducidad';

    // Mostrar el nombre del producto
    const anchoDiponibleTitulo = opciones.incluirCodigo ? cardWidth - 40 : cardWidth - 6;
    const nombreLines = doc.splitTextToSize(nombreProducto, anchoDiponibleTitulo);
    doc.text(nombreLines, xCurrent + 3, yCurrent + 6);
    let textY = yCurrent + 6 + (nombreLines.length * 4);

    // Mostrar fecha de caducidad con color según la categoría
    if (opciones.incluirCaducidad) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(configCategoria.bordeTarjeta.r, configCategoria.bordeTarjeta.g, configCategoria.bordeTarjeta.b);
        doc.text(`Cad: ${fechaCaducidad}`, xCurrent + 3, textY);
        doc.setTextColor(0, 0, 0); // Volver a negro
        doc.setFont('helvetica', 'normal');
        textY += 4;
    }

    // Agregar el código de barras a la derecha del título y la información básica del producto
    if (opciones.incluirCodigo && producto.codigo && producto.barcodeCanvas) {
        const barcodeRenderWidth = 40;
        const barcodeRenderHeight = 18;
        const barcodeX = xCurrent + cardWidth - barcodeRenderWidth - 1;
        const barcodeY = yCurrent + 3; // Posicionarlo arriba a la derecha

        try {
            doc.addImage(producto.barcodeCanvas.toDataURL(), 'PNG', barcodeX, barcodeY, barcodeRenderWidth, barcodeRenderHeight);
        } catch (e) {
            console.error('Error al agregar imagen de código de barras:', e);
        }
    }

    const cantidadTexto = `Cant: ${producto.cantidad || '0'} ${producto.unidad || 'uds.'}`;
    if (textY + 4 <= yCurrent + cardHeight - 3) {
        doc.text(cantidadTexto, xCurrent + 3, textY);
        textY += 4;
    }

    // Agregar marca del producto
    if (producto.marca) {
        const marcaTexto = `Marca: ${producto.marca}`;
        if (textY + 4 <= yCurrent + cardHeight - 3) {
            doc.text(marcaTexto, xCurrent + 3, textY);
            textY += 4;
        }
    }

    if (opciones.incluirArea) {
        const area = todasLasAreas.find(a => a.id === producto.area_id);
        const areaNombre = area ? area.nombre : 'N/A';
        const areaTexto = `Área: ${areaNombre}`;
        if (textY + 4 <= yCurrent + cardHeight - 3) {
            doc.text(areaTexto, xCurrent + 3, textY);
            textY += 4;
        }
    }

    if (opciones.incluirComentarios) {
        const originalFontSize = doc.getFontSize();
        doc.setFontSize(7);
        const lineHeightComentarios = 2.8;

        if (producto.lotesFusionados && producto.lotesFusionados.length > 1) {
            let lotesTexto = ['Lotes:'];

            producto.lotesFusionados.forEach(lote => {
                let loteInfo = `- Lote: ${lote.lote}, Cantidad: ${lote.cantidad} ${producto.unidad || 'uds.'}`;

                if (lote.caducidad) {
                    loteInfo += `, Caducidad: ${new Date(lote.caducidad).toLocaleDateString('es-ES')}`;
                }

                const areaLote = todasLasAreas.find(a => a.id === lote.area_id);
                if (areaLote) {
                    loteInfo += `, Área: ${areaLote.nombre}`;
                }

                if (lote.comentarios && lote.comentarios !== 'N/A') {
                    loteInfo += `, Notas: ${lote.comentarios}`;
                }

                lotesTexto.push(loteInfo);
            });

            const commentLines = doc.splitTextToSize(lotesTexto.join('\n'), cardWidth - 6);

            if (opciones.incluirCodigo && producto.codigo) {
                textY = Math.max(textY, yCurrent + 22);
            }

            const espacioVerticalParaComentarios = yCurrent + cardHeight - textY - 3;
            const maxCommentLines = Math.max(0, Math.floor(espacioVerticalParaComentarios / lineHeightComentarios));

            if (maxCommentLines > 0) {
                doc.text(commentLines.slice(0, maxCommentLines), xCurrent + 3, textY);
            }
        } else if (producto.comentarios && producto.comentarios !== 'N/A') {
            const commentLines = doc.splitTextToSize(producto.comentarios, cardWidth - 6);

            if (opciones.incluirCodigo && producto.codigo) {
                textY = Math.max(textY, yCurrent + 22);
            }

            const espacioVerticalParaComentarios = yCurrent + cardHeight - textY - 3;
            const maxCommentLines = Math.max(0, Math.floor(espacioVerticalParaComentarios / lineHeightComentarios));

            if (maxCommentLines > 0) {
                doc.text(commentLines.slice(0, maxCommentLines), xCurrent + 3, textY);
            }
        }

        doc.setFontSize(originalFontSize);
    }
}

// Generar códigos de barras para todos los productos
async function generarCodigosDeBarras(productos) {
    const container = document.getElementById('barcodeContainer');
    if (!container) {
        console.error('El contenedor de códigos de barras no existe en el DOM.');
    } else {
        container.innerHTML = ''; // Limpiar el contenedor si ya existe
    }

    for (const producto of productos) {
        if (!producto.codigo) continue;

        const canvas = document.createElement('canvas');
        let formato = 'CODE128'; // Formato por defecto

        try {
            // Determinar formato basado en la longitud del código
            if (/^\d{13}$/.test(producto.codigo)) formato = 'EAN13';
            else if (/^\d{12}$/.test(producto.codigo)) formato = 'UPC';

            JsBarcode(canvas, producto.codigo, {
                format: formato,
                width: 1.5,
                height: 60,
                displayValue: true,
                fontSize: 12,
                textMargin: 2.5,
                margin: 2
            });
            producto.barcodeCanvas = canvas;
        } catch (error) {
            console.error(`Error al generar código de barras para ${producto.codigo} (Formato: ${formato}):`, error);
            if (formato !== 'CODE128') {
                try {
                    JsBarcode(canvas, producto.codigo, {
                        format: 'CODE128',
                        width: 1.5,
                        height: 60,
                        displayValue: true,
                        fontSize: 12,
                        textMargin: 2.5,
                        margin: 2
                    });
                    producto.barcodeCanvas = canvas;
                    console.log(`Código de barras para ${producto.codigo} generado con CODE128 como fallback.`);
                } catch (fallbackError) {
                    console.error(`Error al generar código de barras para ${producto.codigo} con CODE128 (fallback):`, fallbackError);
                    producto.barcodeCanvas = null;
                }
            } else {
                producto.barcodeCanvas = null;
            }
        }
    }
}
