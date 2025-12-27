// rep-pdf.js - Funciones para generación de PDF

import { fusionarProductosPorCodigo, formatDateLocal, parseDateLocal } from './rep-utils.js';
import { mostrarCargando } from './rep-ui.js';

// Agrupar productos por área
export function agruparProductosPorArea(productos) {
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
export function categorizarProductosPorCaducidad(productos) {
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

        const fechaCaducidad = parseDateLocal(producto.caducidad);

        if (!fechaCaducidad) {
            categorias.otros.push(producto);
            return;
        }

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
export function procesarCategoriaEnPDF(doc, productos, categoria, yInicial, margin, cardWidth, cardHeight, pageHeight, opciones, areaNombre, pageWidth, organizacion, todasLasAreas) {
    let y = yInicial;

    if (productos.length === 0) return y;

    // Verificar si hay espacio para el encabezado de la categoría
    if (y + 20 > pageHeight - margin) {
        doc.addPage();
        // Dibujar encabezado/pie en la nueva página
        dibujarEncabezadoYPie(doc, areaNombre, margin, pageWidth, pageHeight, organizacion);
        y = margin + 15;
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
            // Dibujar encabezado/pie en la nueva página
            dibujarEncabezadoYPie(doc, areaNombre, margin, pageWidth, pageHeight, organizacion);
            y = margin + 15;
            currentColumn = 0;
        }

        // Agregar producto con estilo específico de la categoría
        agregarProductoConEstiloCategoria(doc, producto, x, y, cardWidth, cardHeight, opciones, configCategoria, todasLasAreas);

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
export function obtenerConfiguracionCategoria(categoria) {
    const configuraciones = {
        vencidos: {
            // Evitar emojis aquí porque jsPDF no los renderiza correctamente en muchos entornos
            titulo: 'PRODUCTOS VENCIDOS',
            fondo: { r: 220, g: 53, b: 69 },     // Rojo oscuro
            borde: { r: 139, g: 0, b: 0 },       // Rojo muy oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 220, g: 53, b: 69 }
        },
        proximosSemana: {
            titulo: 'VENCEN EN MENOS DE UNA SEMANA',
            fondo: { r: 255, g: 193, b: 7 },     // Amarillo
            borde: { r: 212, g: 146, b: 0 },     // Amarillo oscuro
            texto: { r: 0, g: 0, b: 0 },         // Negro
            bordeTarjeta: { r: 255, g: 193, b: 7 }
        },
        mismoMes: {
            titulo: 'VENCEN ESTE MES',
            fondo: { r: 255, g: 152, b: 0 },     // Naranja
            borde: { r: 198, g: 117, b: 0 },     // Naranja oscuro
            texto: { r: 0, g: 0, b: 0 },         // Negro
            bordeTarjeta: { r: 255, g: 152, b: 0 }
        },
        siguienteMes: {
            titulo: 'VENCEN EL PRÓXIMO MES',
            fondo: { r: 32, g: 201, b: 151 },    // Verde azulado
            borde: { r: 22, g: 141, b: 106 },    // Verde azulado oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 32, g: 201, b: 151 }
        },
        otros: {
            titulo: 'OTROS PRODUCTOS',
            fondo: { r: 108, g: 117, b: 125 },   // Gris
            borde: { r: 73, g: 80, b: 87 },      // Gris oscuro
            texto: { r: 255, g: 255, b: 255 },   // Blanco
            bordeTarjeta: { r: 108, g: 117, b: 125 }
        }
    };

    return configuraciones[categoria] || configuraciones.otros;
}

// Dibujar encabezado (título + fecha) y pie de página (organización) en la página actual
export function dibujarEncabezadoYPie(doc, areaNombre, margin, pageWidth, pageHeight, organizacion) {
    const fechaStr = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    // Encabezado: título a la izquierda, fecha a la derecha
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Productos de inventario de área: "${areaNombre}"`, margin, margin + 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    try {
        doc.text(fechaStr, pageWidth - margin, margin + 6, { align: 'right' });
    } catch (e) {
        // Fallback si la opción align no está soportada
        const txtWidth = doc.getTextWidth(fechaStr);
        doc.text(fechaStr, pageWidth - margin - txtWidth, margin + 6);
    }

    // Línea separadora debajo del encabezado
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, margin + 9, pageWidth - margin, margin + 9);

    // Nota: el pie con paginación se agrega en una pasada final antes de guardar el PDF.
    // Aquí no dibujamos el nombre de la organización para evitar duplicados.
}

// Agregar producto con estilo específico de categoría
export function agregarProductoConEstiloCategoria(doc, producto, xCurrent, yCurrent, cardWidth, cardHeight, opciones, configCategoria, todasLasAreas) {
    // Dibujar borde de la tarjeta con color de la categoría
    doc.setDrawColor(configCategoria.bordeTarjeta.r, configCategoria.bordeTarjeta.g, configCategoria.bordeTarjeta.b);
    doc.setLineWidth(0.8);
    doc.rect(xCurrent, yCurrent, cardWidth, cardHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Negro para el texto del producto

    const nombreProducto = producto.nombre || 'Sin nombre';
    const fechaCaducidad = producto.caducidad
        ? formatDateLocal(producto.caducidad)
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
    if (opciones.incluirCodigo && producto.barcodeCanvas) {
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

    // Mostrar cantidad formateada: si la unidad es Kg mostrar 3 decimales, si no mostrar tal cual
    let cantidadDisplay = producto.cantidad || '0';
    const cantidadNum = parseFloat(producto.cantidad);
    if (!isNaN(cantidadNum) && producto.unidad && String(producto.unidad).toLowerCase().includes('kg')) {
        cantidadDisplay = cantidadNum.toFixed(3);
    }
    const cantidadTexto = `Cant: ${cantidadDisplay} ${producto.unidad || 'uds.'}`;
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
export async function generarCodigosDeBarras(productos) {
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

// Generar el reporte en PDF
export async function generarReportePDF(opciones, productosInventario, todasLasAreas, supabase) {
    try {
        mostrarCargando(true);

        // Usar todos los productos que se pasaron como parámetro (ya filtrados)
        let productos = productosInventario;

        if (productos.length === 0) {
            Swal.fire('Advertencia', 'No hay productos para generar el reporte.', 'warning');
            return;
        }

        if (opciones.fusionarLotes) {
            productos = fusionarProductosPorCodigo(productos, todasLasAreas);
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

    const organizacion = document.title || 'Organización';

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

            // Dibujar encabezado con fecha y pie con organización en la página actual
            dibujarEncabezadoYPie(doc, areaNombre, margin, pageWidth, pageHeight, organizacion);

            // Reservar espacio debajo del encabezado
            y = margin + 15;

            contenidoProcesado = true;

            // Procesar cada categoría seleccionada
            for (const categoria of categoriasAfiltrar) {
                if (!categorias[categoria] || categorias[categoria].length === 0) continue;

                y = procesarCategoriaEnPDF(doc, categorias[categoria], categoria, y, margin, cardWidth, cardHeight, pageHeight, opciones, areaNombre, pageWidth, organizacion, todasLasAreas);
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
        
        // Asegurar que la organización aparezca en el pie de todas las páginas (incluida la única página)
        try {
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                // Ubicar el pie ligeramente por encima del borde inferior para evitar solapamientos
                const footerY = pageHeight - margin - 6;
                const footerText = `Página ${p}/${totalPages}`;
                try {
                    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
                } catch (e) {
                    const w = doc.getTextWidth(footerText);
                    doc.text(footerText, (pageWidth - w) / 2, footerY);
                }
            }
        } catch (e) {
            console.error('Error al dibujar pies de página en todas las páginas:', e);
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