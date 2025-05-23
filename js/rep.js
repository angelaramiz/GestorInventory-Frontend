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
                    <label class="block mb-1">Ordenar por:</label>
                    <select id="ordenReporte" class="w-full border rounded p-2">
                        <option value="caducidad">Fecha de caducidad (primero las más próximas)</option>
                        <option value="alfabetico">Orden alfabético por nombre</option>
                        ${!todasSeleccionadas && areasSeleccionadas.length > 1 ? '<option value="area">Por área</option>' : ''}
                    </select>
                </div>
                <div class="mb-3">
                    <label class="block mb-1">Incluir en el reporte:</label>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="incluirCaducidad" checked> Fechas de caducidad</label>
                        <label><input type="checkbox" id="incluirComentarios" checked> Comentarios</label>
                        <label><input type="checkbox" id="incluirCodigo" checked> Códigos de barras</label>
                        <label><input type="checkbox" id="incluirArea" checked> Área</label>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="block mb-1">Opciones adicionales:</label>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="fusionarLotes" checked> Fusionar productos idénticos (combinar lotes)</label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Generar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                orden: document.getElementById('ordenReporte').value,
                incluirCaducidad: document.getElementById('incluirCaducidad').checked,
                incluirComentarios: document.getElementById('incluirComentarios').checked,
                incluirCodigo: document.getElementById('incluirCodigo').checked,
                incluirArea: document.getElementById('incluirArea').checked,
                fusionarLotes: document.getElementById('fusionarLotes').checked
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

        ordenarProductos(productos, opciones.orden);

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
        let x = margin; // Posición X actual, se recalculará por columna

        // Si se ordena por área, agrupar productos por área
        if (opciones.orden === 'area') {
            const productosPorArea = {};
            productos.forEach(producto => {
                if (!productosPorArea[producto.area_id]) {
                    productosPorArea[producto.area_id] = [];
                }
                productosPorArea[producto.area_id].push(producto);
            });

            let primeraArea = true;
            for (const areaId in productosPorArea) {
                const area = todasLasAreas.find(a => a.id === areaId);
                const areaNombre = area ? area.nombre : 'Área desconocida';

                if (!primeraArea) {
                    doc.addPage();
                    y = margin; // Reiniciar Y para la nueva página
                }
                primeraArea = false;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Área: ${areaNombre}`, margin, y);
                y += 10; // Espacio después del título del área

                let currentX = margin; // X para la primera columna del área
                let columnInArea = 0;

                for (let i = 0; i < productosPorArea[areaId].length; i++) {
                    const producto = productosPorArea[areaId][i];

                    // Calcular X para la columna actual
                    currentX = margin + columnInArea * (cardWidth + margin / 2);

                    // Verificar si necesitamos una nueva página ANTES de agregar el producto
                    if (y + cardHeight > pageHeight - margin) {
                        doc.addPage();
                        y = margin; // Reiniciar Y para la nueva página
                        columnInArea = 0;
                        currentX = margin + columnInArea * (cardWidth + margin / 2);
                    }

                    y = agregarProductoAlPDF(doc, producto, currentX, y, margin, cardWidth, cardHeight, pageHeight, opciones);

                    columnInArea++;
                    if (columnInArea === 2) { // Si se completó la segunda columna
                        columnInArea = 0; // Reiniciar para la siguiente fila
                        y = y + cardHeight + 5; // Mover y para la siguiente fila
                    }
                }
            }
        } else {
            // Procesamiento normal (sin agrupar por área)
            let currentColumn = 0;
            for (let i = 0; i < productos.length; i++) {
                const producto = productos[i];

                // Calcular X para la columna actual
                x = margin + currentColumn * (cardWidth + margin / 2);

                // Verificar si necesitamos una nueva página ANTES de agregar el producto
                if (y + cardHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin; // Reiniciar Y para la nueva página
                    currentColumn = 0; // Reiniciar a la primera columna
                    x = margin + currentColumn * (cardWidth + margin / 2);
                }

                y = agregarProductoAlPDF(doc, producto, x, y, margin, cardWidth, cardHeight, pageHeight, opciones);

                currentColumn++;
                if (currentColumn === 2) { // Si se completó la segunda columna
                    currentColumn = 0; // Reiniciar para la siguiente fila
                    y = y + cardHeight + 5; // Mover y para la siguiente fila
                }
            }
        }

        const fechaActual = new Date().toISOString().slice(0, 10);
        doc.save(`reporte_preconteo_${fechaActual}.pdf`);
        Swal.fire('¡Éxito!', 'Reporte de preconteo generado correctamente.', 'success');
    } catch (error) {
        console.error('Error al generar el reporte:', error);
        Swal.fire('Error', 'No se pudo generar el reporte.', 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función auxiliar para agregar un producto al PDF
function agregarProductoAlPDF(doc, producto, xCurrent, yCurrent, margin, cardWidth, cardHeight, pageHeight, opciones) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(xCurrent, yCurrent, cardWidth, cardHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const nombreProducto = producto.nombre || 'Sin nombre';
    const fechaCaducidad = producto.caducidad
        ? new Date(producto.caducidad).toLocaleDateString('es-ES')
        : 'Sin caducidad';

    // Primero, mostrar solo el nombre del producto
    const anchoDiponibleTitulo = opciones.incluirCodigo ? cardWidth - 40 : cardWidth - 6;
    const nombreLines = doc.splitTextToSize(nombreProducto, anchoDiponibleTitulo);
    doc.text(nombreLines, xCurrent + 3, yCurrent + 6);
    let textY = yCurrent + 6 + (nombreLines.length * 4);

    // Luego, si es necesario, mostrar la fecha de caducidad en una línea separada
    if (opciones.incluirCaducidad) {
        doc.setFontSize(8);
        doc.text(`Cad: ${fechaCaducidad}`, xCurrent + 3, textY);
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

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const cantidadTexto = `Cant: ${producto.cantidad || '0'} ${producto.unidad || 'uds.'}`;
    if (textY + 4 <= yCurrent + cardHeight - 3) {
        doc.text(cantidadTexto, xCurrent + 3, textY);
        textY += 4;
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

        // Verificar si el producto tiene lotes fusionados
        if (producto.lotesFusionados && producto.lotesFusionados.length > 1) {
            // Crear detalle de lotes
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

            // Asegurar que los lotes se muestren después del código de barras y no se solapen
            if (opciones.incluirCodigo && producto.codigo) {
                textY = Math.max(textY, yCurrent + 22); // 5 (posición Y del código) + 15 (altura del código) + 2 (espacio adicional)
            }

            const espacioVerticalParaComentarios = yCurrent + cardHeight - textY - 3;
            const maxCommentLines = Math.max(0, Math.floor(espacioVerticalParaComentarios / lineHeightComentarios));

            if (maxCommentLines > 0) {
                doc.text(commentLines.slice(0, maxCommentLines), xCurrent + 3, textY);
            }
        }
        // Si no hay múltiples lotes o comentariosFusionados, mostrar solo los comentarios si los hay
        else if (producto.comentarios && producto.comentarios !== 'N/A') {
            const commentLines = doc.splitTextToSize(producto.comentarios, cardWidth - 6);

            // Asegurar que los comentarios se muestren después del código de barras y no se solapen
            if (opciones.incluirCodigo && producto.codigo) {
                textY = Math.max(textY, yCurrent + 22); // 5 (posición Y del código) + 15 (altura del código) + 2 (espacio adicional)
            }

            const espacioVerticalParaComentarios = yCurrent + cardHeight - textY - 3;
            const maxCommentLines = Math.max(0, Math.floor(espacioVerticalParaComentarios / lineHeightComentarios));

            if (maxCommentLines > 0) {
                doc.text(commentLines.slice(0, maxCommentLines), xCurrent + 3, textY);
            }
        }

        doc.setFontSize(originalFontSize);
    }

    // Si estamos en la primera columna, devolver la misma Y
    // Si estamos en la segunda columna, avanzar Y para la siguiente fila
    return yCurrent;
}

// Ordenar productos según el criterio seleccionado
function ordenarProductos(productos, criterio) {
    switch (criterio) {
        case 'caducidad':
            productos.sort((a, b) => {
                if (!a.caducidad) return 1;
                if (!b.caducidad) return -1;
                return new Date(a.caducidad) - new Date(b.caducidad);
            });
            break;
        case 'alfabetico':
            productos.sort((a, b) => {
                const nombreA = (a.nombre || '').toLowerCase();
                const nombreB = (b.nombre || '').toLowerCase();
                return nombreA.localeCompare(nombreB);
            });
            break;
        case 'area':
            productos.sort((a, b) => {
                const areaA = todasLasAreas.find(area => area.id === a.area_id)?.nombre || '';
                const areaB = todasLasAreas.find(area => area.id === b.area_id)?.nombre || '';
                return areaA.localeCompare(areaB);
            });
            break;
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

        const canvas = document.createElement('canvas'); let formato = 'CODE128'; // Formato por defecto - Definido fuera del try para evitar errores de referencia
        try {
            if (/^\d{13}$/.test(producto.codigo)) formato = 'EAN13';
            else if (/^\d{12}$/.test(producto.codigo)) formato = 'UPC';

            JsBarcode(canvas, producto.codigo, {
                format: formato,
                width: 1.5,
                height: 60, // Aumentado de 50 a 60
                displayValue: true,
                fontSize: 12,
                textMargin: 2.5,
                margin: 2      // Reducido de 5 a 2
            });
            producto.barcodeCanvas = canvas;
        } catch (error) {
            console.error(`Error al generar código de barras para ${producto.codigo} (Formato: ${formato}):`, error);
            if (formato !== 'CODE128') {
                try {
                    JsBarcode(canvas, producto.codigo, {
                        format: 'CODE128',
                        width: 1.5,
                        height: 60, // Aumentado de 50 a 60
                        displayValue: true,
                        fontSize: 12,
                        textMargin: 2.5,
                        margin: 2 // Reducido de 5 a 2
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
