/**
 * PDFGenerationService - Servicio para generación de reportes PDF
 * 
 * Gestiona la generación de documentos PDF con:
 * - Tablas de productos
 * - Códigos de barras (JsBarcode)
 * - Headers y footers personalizados
 * - Categorización visual por color
 * 
 * @class PDFGenerationService
 * @version 4.0.0
 * @since 2025-10-04
 */

export class PDFGenerationService {
    constructor() {
        this.jsPDF = null;
        this.JsBarcode = window.JsBarcode;
    }

    /**
     * Genera códigos de barras para todos los productos
     * @async
     * @param {Array} productos - Array de productos
     * @returns {Promise<void>}
     */
    async generateBarcodes(productos) {
        for (const producto of productos) {
            if (!producto.codigo) continue;

            const canvas = document.createElement('canvas');
            let formato = 'CODE128'; // Formato por defecto

            try {
                // Determinar formato basado en la longitud del código
                if (/^\d{13}$/.test(producto.codigo)) formato = 'EAN13';
                else if (/^\d{12}$/.test(producto.codigo)) formato = 'UPC';

                this.JsBarcode(canvas, producto.codigo, {
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
                console.error(`Error al generar código de barras para ${producto.codigo} (${formato}):`, error);
                
                // Fallback a CODE128
                if (formato !== 'CODE128') {
                    try {
                        this.JsBarcode(canvas, producto.codigo, {
                            format: 'CODE128',
                            width: 1.5,
                            height: 60,
                            displayValue: true,
                            fontSize: 12,
                            textMargin: 2.5,
                            margin: 2
                        });
                        producto.barcodeCanvas = canvas;
                        console.log(`Código de barras para ${producto.codigo} generado con CODE128 como fallback`);
                    } catch (fallbackError) {
                        console.error(`Error con CODE128 fallback para ${producto.codigo}:`, fallbackError);
                        producto.barcodeCanvas = null;
                    }
                } else {
                    producto.barcodeCanvas = null;
                }
            }
        }
    }

    /**
     * Genera el documento PDF con los productos
     * @param {Object} productosPorArea - Productos agrupados por área
     * @param {Array} todasLasAreas - Array de todas las áreas
     * @param {Object} opciones - Opciones de generación
     * @returns {Object} Documento jsPDF generado
     */
    async generatePDF(productosPorArea, todasLasAreas, opciones) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const cardWidth = (pageWidth - (margin * 3)) / 2;
        const cardHeight = 45;

        let y = margin;
        let contenidoProcesado = false;

        // Ordenar áreas alfabéticamente
        const areasOrdenadas = Object.keys(productosPorArea).sort((a, b) => {
            const areaA = todasLasAreas.find(area => area.id === a)?.nombre || '';
            const areaB = todasLasAreas.find(area => area.id === b)?.nombre || '';
            return areaA.localeCompare(areaB);
        });

        for (let areaIndex = 0; areaIndex < areasOrdenadas.length; areaIndex++) {
            const areaId = areasOrdenadas[areaIndex];
            const area = todasLasAreas.find(a => a.id === areaId);
            const areaNombre = area ? area.nombre : 'Área desconocida';

            // Categorizar productos por caducidad (importado de ReportService)
            const categorias = this._categorizeProductsByExpiry(productosPorArea[areaId]);

            // Aplicar filtro de agrupaciones
            let categoriasAFiltrar = ['vencidos', 'proximosSemana', 'mismoMes', 'siguienteMes', 'otros'];
            
            if (opciones.filtrarAgrupaciones && opciones.agrupacionesSeleccionadas) {
                categoriasAFiltrar = categoriasAFiltrar.filter(categoria => {
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
            const hayProductos = categoriasAFiltrar.some(categoria => 
                categorias[categoria] && categorias[categoria].length > 0
            );

            if (!hayProductos) continue;

            // Nueva página si ya hay contenido
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

            // Procesar cada categoría
            for (const categoria of categoriasAFiltrar) {
                if (!categorias[categoria] || categorias[categoria].length === 0) continue;

                y = this._addCategoryToPDF(
                    doc, 
                    categorias[categoria], 
                    categoria, 
                    y, 
                    margin, 
                    cardWidth, 
                    cardHeight, 
                    pageHeight, 
                    opciones,
                    todasLasAreas
                );
            }
        }

        return { doc, contenidoProcesado };
    }

    /**
     * Agrega una categoría de productos al PDF
     * @private
     */
    _addCategoryToPDF(doc, productos, categoria, yInicial, margin, cardWidth, cardHeight, pageHeight, opciones, todasLasAreas) {
        let y = yInicial;

        if (productos.length === 0) return y;

        // Verificar espacio para encabezado
        if (y + 20 > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }

        // Configuración de estilo de la categoría
        const config = this._getCategoryConfig(categoria);

        // Dibujar encabezado de categoría
        doc.setFillColor(config.fondo.r, config.fondo.g, config.fondo.b);
        doc.setDrawColor(config.borde.r, config.borde.g, config.borde.b);
        doc.setLineWidth(1);
        doc.rect(margin, y, 190, 12, 'FD');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(config.texto.r, config.texto.g, config.texto.b);
        doc.text(config.titulo, margin + 2, y + 8);

        doc.setTextColor(0, 0, 0);
        y += 15;

        // Agregar productos
        let currentColumn = 0;
        for (let i = 0; i < productos.length; i++) {
            const producto = productos[i];
            const x = margin + currentColumn * (cardWidth + margin / 2);

            // Nueva página si es necesario
            if (y + cardHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
                currentColumn = 0;
            }

            this._addProductCard(doc, producto, x, y, cardWidth, cardHeight, opciones, config, todasLasAreas);

            currentColumn++;
            if (currentColumn === 2) {
                currentColumn = 0;
                y += cardHeight + 5;
            }
        }

        if (currentColumn === 1) {
            y += cardHeight + 5;
        }

        return y + 10;
    }

    /**
     * Agrega una tarjeta de producto al PDF
     * @private
     */
    _addProductCard(doc, producto, xCurrent, yCurrent, cardWidth, cardHeight, opciones, config, todasLasAreas) {
        // Borde de tarjeta
        doc.setDrawColor(config.bordeTarjeta.r, config.bordeTarjeta.g, config.bordeTarjeta.b);
        doc.setLineWidth(0.8);
        doc.rect(xCurrent, yCurrent, cardWidth, cardHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);

        const nombreProducto = producto.nombre || 'Sin nombre';
        const fechaCaducidad = producto.caducidad
            ? new Date(producto.caducidad).toLocaleDateString('es-ES')
            : 'Sin caducidad';

        // Nombre del producto
        const anchoDisponible = opciones.incluirCodigo ? cardWidth - 40 : cardWidth - 6;
        const nombreLines = doc.splitTextToSize(nombreProducto, anchoDisponible);
        doc.text(nombreLines, xCurrent + 3, yCurrent + 6);
        let textY = yCurrent + 6 + (nombreLines.length * 4);

        // Fecha de caducidad
        if (opciones.incluirCaducidad) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(config.bordeTarjeta.r, config.bordeTarjeta.g, config.bordeTarjeta.b);
            doc.text(`Cad: ${fechaCaducidad}`, xCurrent + 3, textY);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            textY += 4;
        }

        // Código de barras
        if (opciones.incluirCodigo && producto.codigo && producto.barcodeCanvas) {
            const barcodeRenderWidth = 40;
            const barcodeRenderHeight = 18;
            const barcodeX = xCurrent + cardWidth - barcodeRenderWidth - 1;
            const barcodeY = yCurrent + 3;

            try {
                doc.addImage(producto.barcodeCanvas.toDataURL(), 'PNG', barcodeX, barcodeY, barcodeRenderWidth, barcodeRenderHeight);
            } catch (e) {
                console.error('Error al agregar código de barras:', e);
            }
        }

        // Cantidad
        const cantidadTexto = `Cant: ${producto.cantidad || '0'} ${producto.unidad || 'uds.'}`;
        if (textY + 4 <= yCurrent + cardHeight - 3) {
            doc.text(cantidadTexto, xCurrent + 3, textY);
            textY += 4;
        }

        // Marca
        if (producto.marca) {
            const marcaTexto = `Marca: ${producto.marca}`;
            if (textY + 4 <= yCurrent + cardHeight - 3) {
                doc.text(marcaTexto, xCurrent + 3, textY);
                textY += 4;
            }
        }

        // Área
        if (opciones.incluirArea) {
            const area = todasLasAreas.find(a => a.id === producto.area_id);
            const areaNombre = area ? area.nombre : 'N/A';
            const areaTexto = `Área: ${areaNombre}`;
            if (textY + 4 <= yCurrent + cardHeight - 3) {
                doc.text(areaTexto, xCurrent + 3, textY);
                textY += 4;
            }
        }

        // Comentarios
        if (opciones.incluirComentarios) {
            const originalFontSize = doc.getFontSize();
            doc.setFontSize(7);
            const lineHeight = 2.8;

            if (producto.lotesFusionados && producto.lotesFusionados.length > 1) {
                const lotesTexto = ['Lotes:'];

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

                const espacioVertical = yCurrent + cardHeight - textY - 3;
                const maxLines = Math.max(0, Math.floor(espacioVertical / lineHeight));

                if (maxLines > 0) {
                    doc.text(commentLines.slice(0, maxLines), xCurrent + 3, textY);
                }
            } else if (producto.comentarios && producto.comentarios !== 'N/A') {
                const commentLines = doc.splitTextToSize(producto.comentarios, cardWidth - 6);

                if (opciones.incluirCodigo && producto.codigo) {
                    textY = Math.max(textY, yCurrent + 22);
                }

                const espacioVertical = yCurrent + cardHeight - textY - 3;
                const maxLines = Math.max(0, Math.floor(espacioVertical / lineHeight));

                if (maxLines > 0) {
                    doc.text(commentLines.slice(0, maxLines), xCurrent + 3, textY);
                }
            }

            doc.setFontSize(originalFontSize);
        }
    }

    /**
     * Obtiene la configuración de color para cada categoría
     * @private
     */
    _getCategoryConfig(categoria) {
        const configs = {
            vencidos: {
                titulo: '🚨 PRODUCTOS VENCIDOS',
                fondo: { r: 220, g: 53, b: 69 },
                borde: { r: 139, g: 0, b: 0 },
                texto: { r: 255, g: 255, b: 255 },
                bordeTarjeta: { r: 220, g: 53, b: 69 }
            },
            proximosSemana: {
                titulo: '⚠️ VENCEN EN MENOS DE UNA SEMANA',
                fondo: { r: 255, g: 193, b: 7 },
                borde: { r: 212, g: 146, b: 0 },
                texto: { r: 0, g: 0, b: 0 },
                bordeTarjeta: { r: 255, g: 193, b: 7 }
            },
            mismoMes: {
                titulo: '📅 VENCEN ESTE MES',
                fondo: { r: 255, g: 152, b: 0 },
                borde: { r: 198, g: 117, b: 0 },
                texto: { r: 0, g: 0, b: 0 },
                bordeTarjeta: { r: 255, g: 152, b: 0 }
            },
            siguienteMes: {
                titulo: '📋 VENCEN EL PRÓXIMO MES',
                fondo: { r: 32, g: 201, b: 151 },
                borde: { r: 22, g: 141, b: 106 },
                texto: { r: 255, g: 255, b: 255 },
                bordeTarjeta: { r: 32, g: 201, b: 151 }
            },
            otros: {
                titulo: '📦 OTROS PRODUCTOS',
                fondo: { r: 108, g: 117, b: 125 },
                borde: { r: 73, g: 80, b: 87 },
                texto: { r: 255, g: 255, b: 255 },
                bordeTarjeta: { r: 108, g: 117, b: 125 }
            }
        };

        return configs[categoria] || configs.otros;
    }

    /**
     * Categoriza productos por caducidad (método privado de utilidad)
     * @private
     */
    _categorizeProductsByExpiry(productos) {
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

    /**
     * Exporta el PDF generado
     * @param {Object} doc - Documento jsPDF
     * @param {string} filename - Nombre del archivo
     */
    savePDF(doc, filename) {
        doc.save(filename);
    }
}

// Exportar instancia singleton
export const pdfGenerationService = new PDFGenerationService();

// Exportación por defecto
export default PDFGenerationService;
