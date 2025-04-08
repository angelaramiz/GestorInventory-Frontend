import { obtenerAreasPorCategoria } from './db-operations.js';
import { getSupabase } from './auth.js';

let productosInventario = [];
let supabase;

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
        document.getElementById('areaSelect').addEventListener('change', filtrarProductosPorArea);
        document.getElementById('generarReporteBtn').addEventListener('click', mostrarOpcionesReporte);
    } catch (error) {
        console.error('Error al inicializar la página:', error);
        Swal.fire('Error', 'Ocurrió un error al inicializar la página.', 'error');
    }
});

// Cargar áreas disponibles usando la función obtenerAreasPorCategoria
async function cargarAreas() {
    try {
        mostrarCargando(true);

        const areas = await obtenerAreasPorCategoria();
        if (!areas || areas.length === 0) {
            console.warn('No se encontraron áreas disponibles.');
            return;
        }

        console.log('Áreas disponibles:', areas);

        const selectArea = document.getElementById('areaSelect');
        if (selectArea) {
            selectArea.innerHTML = '<option value="todas">Todas las áreas</option>';
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id; // Usar el ID del área como valor
                option.textContent = area.nombre;
                selectArea.appendChild(option);
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

// Filtrar productos por área seleccionada
async function filtrarProductosPorArea() {
    const areaSeleccionada = document.getElementById('areaSelect').value;

    if (areaSeleccionada === 'todas') {
        mostrarProductosEnLista(productosInventario);
        return;
    }

    try {
        mostrarCargando(true);

        const { data, error } = await supabase
            .from('inventario')
            .select('*')
            .eq('area_id', areaSeleccionada) // Usar el valor como cadena
            .order('nombre', { ascending: true });

        if (error) throw error;

        mostrarProductosEnLista(data);
    } catch (error) {
        console.error('Error al filtrar productos por área:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos para esta área.', 'error');
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
        li.innerHTML = `<span class="font-semibold">${producto.nombre || 'Sin nombre'}</span> - Código: ${producto.codigo || 'Sin código'}`;
        container.appendChild(li);
    });
}

// Mostrar/ocultar indicador de carga
function mostrarCargando(mostrar) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !mostrar);
}

// Mostrar opciones para generar el reporte
function mostrarOpcionesReporte() {
    const areaSeleccionada = document.getElementById('areaSelect')?.value || 'todas';
    const esTodasLasAreas = areaSeleccionada === 'todas';

    Swal.fire({
        title: 'Configuración del reporte',
        html: `
            <div class="text-left">
                <div class="mb-3">
                    <label class="block mb-1">Ordenar por:</label>
                    <select id="ordenReporte" class="w-full border rounded p-2">
                        <option value="caducidad">Fecha de caducidad (primero las más próximas)</option>
                        <option value="alfabetico">Orden alfabético por nombre</option>
                        ${esTodasLasAreas ? '<option value="area">Por área</option>' : ''}
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

        // Obtener productos filtrados por área
        const areaSeleccionada = document.getElementById('areaSelect').value;
        let productos;

        if (areaSeleccionada === 'todas') {
            productos = productosInventario;
        } else {
            productos = productosInventario.filter(p => p.area_id === areaSeleccionada);
        }

        if (productos.length === 0) {
            Swal.fire('Advertencia', 'No hay productos para generar el reporte.', 'warning');
            return;
        }

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

        // Procesar productos
        for (let i = 0; i < productos.length; i++) {
            const producto = productos[i];

            // Calcular la posición de la tarjeta
            const column = i % 2; // 0: izquierda, 1: derecha
            x = margin + column * (cardWidth + margin / 2);
            if (i > 0 && column === 0) {
                y += cardHeight + 5; // Mover hacia abajo para la siguiente fila
            }

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
            doc.text(`${nombreProducto} - ${fechaCaducidad}`, x + 3, y + 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            // Cantidad y unidad
            const cantidadTexto = `Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
            doc.text(cantidadTexto, x + 3, y + 12);

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

            // Comentarios (si existen)
            if (producto.comentarios) {
                const comentarios = `Comentarios: ${producto.comentarios}`;
                doc.text(comentarios, x + 3, y + cardHeight - 5, { maxWidth: cardWidth - 6 });
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
        // 'area' no necesita ordenamiento especial, ya que lo manejamos por grupos
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
