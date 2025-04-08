import { obtenerAreasPorCategoria } from './db-operations.js';
import { mostrarAlertaBurbuja, mostrarMensaje } from './logs.js';
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

        mostrarMensaje('Áreas disponibles de manera exitosa', 'success', );

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
        const marginHorizontal = 15; // Márgenes horizontales ajustados para centrar las columnas
        const marginVertical = 10; // Márgenes verticales
        const cardWidth = (pageWidth - (marginHorizontal * 3)) / 2; // Ajustar para 2 columnas
        const cardHeight = (pageHeight - (marginVertical * 6)) / 5; // Ajustar para 5 filas

        // Variables para controlar la posición
        let x = marginHorizontal;
        let y = marginVertical;

        // Agrupar productos por área
        const productosPorArea = productos.reduce((grupos, producto) => {
            const area = producto.area_nombre || producto.area || 'Sin área'; // Priorizar 'area_nombre', luego 'area', o 'Sin área'
            if (!grupos[area]) {
                grupos[area] = [];
            }
            grupos[area].push(producto);
            return grupos;
        }, {});

        // Procesar productos por área
        for (const [area, productosArea] of Object.entries(productosPorArea)) {
            // Agregar encabezado del área
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Área: ${area}`, marginHorizontal, y); // Mostrar el nombre del área correctamente
            y += 10; // Espacio debajo del encabezado

            for (let i = 0; i < productosArea.length; i++) {
                const producto = productosArea[i];

                // Calcular la posición de la tarjeta
                const column = i % 2; // 0: izquierda, 1: derecha
                x = marginHorizontal + column * (cardWidth + marginHorizontal);
                if (i > 0 && column === 0) {
                    y += cardHeight + marginVertical; // Reducir espacio entre filas
                }

                // Verificar si necesitamos una nueva página
                if (y + cardHeight > pageHeight - marginVertical) {
                    doc.addPage();
                    y = marginVertical;
                    doc.text(`Área: ${area}`, marginHorizontal, y); // Repetir encabezado en nueva página
                    y += 10;
                }

                // Dibujar borde de la tarjeta
                doc.setDrawColor(200, 200, 200);
                doc.rect(x, y, cardWidth, cardHeight);

                // Contenido de la tarjeta
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8); // Reducir tamaño de fuente
                const nombreProducto = producto.nombre || 'Sin nombre';
                const fechaCaducidad = producto.caducidad
                    ? new Date(producto.caducidad).toLocaleDateString('es-ES')
                    : 'Sin caducidad';
                doc.text(`${nombreProducto} - ${fechaCaducidad}`, x + 3, y + 6);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);

                // Cantidad y unidad
                const cantidadTexto = `Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
                doc.text(cantidadTexto, x + 3, y + 10); // Ajustar posición del texto

                // Código de barras (si la opción está activada)
                if (opciones.incluirCodigo && producto.codigo) {
                    try {
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

                        // Determinar el formato del código de barras
                        let formato = 'EAN13'; // Por defecto EAN-13
                        if (/^\d{12}$/.test(producto.codigo)) {
                            formato = 'UPC'; // Cambiar a UPC-A si tiene 12 dígitos
                        }

                        JsBarcode(svg, producto.codigo, {
                            format: formato,
                            width: 1,
                            height: 30,
                            displayValue: false,
                            margin: 0,
                        });

                        // Convertir SVG a PNG usando un canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const img = new Image();
                        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;

                        await new Promise((resolve, reject) => {
                            img.onload = () => {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                                resolve();
                            };
                            img.onerror = reject;
                        });

                        const pngDataUrl = canvas.toDataURL('image/png');

                        doc.addImage(
                            pngDataUrl,
                            'PNG',
                            x + (cardWidth - 50) / 2, // Centrar horizontalmente
                            y + cardHeight - 35, // Ajustar posición vertical
                            50, // Reducir ancho del código de barras
                            12 // Reducir altura del código de barras
                        );

                        // Agregar el código numérico debajo del código de barras
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7); // Reducir tamaño de fuente
                        doc.text(
                            producto.codigo,
                            x + cardWidth / 2, // Centrar horizontalmente
                            y + cardHeight - 20, // Posicionar debajo del código de barras
                            { align: 'center' }
                        );
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

            // Espacio entre áreas
            y += cardHeight + marginVertical;
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

    // Crear elementos SVG para cada código
    for (const producto of productos) {
        if (!producto.codigo) continue;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = `barcode-${producto.codigo}`; // Usar el código como ID único
        container.appendChild(svg);

        try {
            // Determinar el formato del código de barras
            let formato = 'EAN13'; // Por defecto EAN-13
            if (/^\d{12}$/.test(producto.codigo)) {
                formato = 'UPC'; // Cambiar a UPC-A si tiene 12 dígitos
            }

            // Generar el código de barras con tamaño ajustado
            JsBarcode(svg, producto.codigo, {
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
