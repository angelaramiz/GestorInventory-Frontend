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
                incluirArea: document.getElementById('incluirArea').checked
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            generarReportePDF(result.value);
        }
    });
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
            
            // Filtrar los productos por las áreas seleccionadas
            productos = productosInventario.filter(p => areasSeleccionadas.includes(p.area_id));
        }

        if (productos.length === 0) {
            Swal.fire('Advertencia', 'No hay productos para generar el reporte.', 'warning');
            return;
        }

        // Ordenar productos según criterio seleccionado
        ordenarProductos(productos, opciones.orden);

        // Generar códigos de barras si es necesario
        if (opciones.incluirCodigo) {
            await generarCodigosDeBarras(productos);
        }

        // Crear documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Dimensiones de la página
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const cardWidth = (pageWidth - (margin * 3)) / 2; // Ancho de las tarjetas (2 columnas)
        const cardHeight = 45; // Altura compacta de las tarjetas

        // Variables para controlar la posición
        let x = margin;
        let y = margin;

        // Si se ordena por área, agrupar productos por área
        if (opciones.orden === 'area') {
            // Agrupar productos por área
            const productosPorArea = {};
            productos.forEach(producto => {
                if (!productosPorArea[producto.area_id]) {
                    productosPorArea[producto.area_id] = [];
                }
                productosPorArea[producto.area_id].push(producto);
            });
            
            let primeraArea = true;
            for (const areaId in productosPorArea) {
                // Buscar el nombre del área
                const area = todasLasAreas.find(a => a.id === areaId);
                const areaNombre = area ? area.nombre : 'Área desconocida';
                
                // Si no es la primera área, agregar una nueva página
                if (!primeraArea) {
                    doc.addPage();
                    y = margin;
                }
                primeraArea = false;
                
                // Agregar título del área
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Área: ${areaNombre}`, x, y);
                y += 10;
                
                // Procesar productos de esta área
                for (let i = 0; i < productosPorArea[areaId].length; i++) {
                    const producto = productosPorArea[areaId][i];
                    agregarProductoAlPDF(doc, producto, i, x, y, margin, cardWidth, cardHeight, pageHeight, opciones);
                    
                    // Actualizar posición para el siguiente producto
                    const column = i % 2; // 0: izquierda, 1: derecha
                    if (column === 1) {
                        y += cardHeight + 5; // Mover hacia abajo para la siguiente fila
                    }
                }
            }
        } else {
            // Procesamiento normal (sin agrupar por área)
            for (let i = 0; i < productos.length; i++) {
                const producto = productos[i];
                agregarProductoAlPDF(doc, producto, i, x, y, margin, cardWidth, cardHeight, pageHeight, opciones);
                
                // Actualizar posición para el siguiente producto
                const column = i % 2; // 0: izquierda, 1: derecha
                if (column === 1) {
                    y += cardHeight + 5; // Mover hacia abajo para la siguiente fila
                }
            }
        }

        // Guardar el PDF
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
function agregarProductoAlPDF(doc, producto, index, x, y, margin, cardWidth, cardHeight, pageHeight, opciones) {
    // Calcular la posición de la tarjeta
    const column = index % 2; // 0: izquierda, 1: derecha
    x = margin + column * (cardWidth + margin / 2);
    
    // Verificar si necesitamos una nueva página
    if (y + cardHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
    }

    // Dibujar borde de la tarjeta
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, cardWidth, cardHeight);

    // Contenido de la tarjeta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const nombreProducto = producto.nombre || 'Sin nombre';
    const fechaCaducidad = producto.caducidad
        ? new Date(producto.caducidad).toLocaleDateString('es-ES')
        : 'Sin caducidad';
        
    let titulo = nombreProducto;
    if (opciones.incluirCaducidad) {
        titulo += ` - ${fechaCaducidad}`;
    }
    
    doc.text(titulo, x + 3, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Cantidad y unidad
    const cantidadTexto = `Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
    doc.text(cantidadTexto, x + 3, y + 12);
    
    // Área (si la opción está activada)
    if (opciones.incluirArea) {
        const area = todasLasAreas.find(a => a.id === producto.area_id);
        const areaNombre = area ? area.nombre : 'Área desconocida';
        doc.text(`Área: ${areaNombre}`, x + 3, y + 17);
    }

    // Código de barras (si la opción está activada)
    if (opciones.incluirCodigo && producto.codigo) {
        try {
            const barcodeCanvas = document.getElementById(`barcode-${producto.codigo}`);
            if (barcodeCanvas) {
                const barcodeDataUrl = barcodeCanvas.toDataURL('image/png');
                doc.addImage(
                    barcodeDataUrl,
                    'PNG',
                    x + (cardWidth - 60) / 2, // Centrar horizontalmente
                    y + cardHeight - 20, // Cerca del fondo
                    60, // Ancho ajustado
                    15 // Altura ajustada
                );
            } else {
                console.warn(`No se encontró el código de barras para el producto con código: ${producto.codigo}`);
            }
        } catch (error) {
            console.error(`Error al agregar código de barras para ${producto.codigo}:`, error);
        }
    }

    // Comentarios (si existen y la opción está activada)
    if (opciones.incluirComentarios && producto.comentarios) {
        const comentarios = `Comentarios: ${producto.comentarios}`;
        doc.text(comentarios, x + 3, y + cardHeight - 5, { maxWidth: cardWidth - 6 });
    }
}

// Ordenar productos según el criterio seleccionado
function ordenarProductos(productos, criterio) {
    switch (criterio) {
        case 'caducidad':
            productos.sort((a, b) => {
                // Productos sin fecha de caducidad van al final
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
    // Limpiar el contenedor
    const container = document.getElementById('barcodeContainer');
    container.innerHTML = '';

    // Crear elementos canvas para cada código
    for (const producto of productos) {
        if (!producto.codigo) continue;

        const canvas = document.createElement('canvas');
        canvas.id = `barcode-${producto.codigo}`; // Usar el código como ID único
        container.appendChild(canvas);

        try {
            // Determinar el formato del código de barras
            let formato = 'CODE128';
            if (/^\d{13}$/.test(producto.codigo)) formato = 'EAN13';
            else if (/^\d{12}$/.test(producto.codigo)) formato = 'UPC';

            // Generar el código de barras con tamaño ajustado
            JsBarcode(canvas, producto.codigo, {
                format: formato,
                width: 2, // Ancho de las barras
                height: 40, // Altura de las barras
                displayValue: true,
                fontSize: 10, // Tamaño de la fuente
                margin: 5 // Margen alrededor del código
            });
        } catch (error) {
            console.error(`Error al generar código de barras para ${producto.codigo}:`, error);
        }
    }
}
