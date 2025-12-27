// product-barcode.js
// Funciones relacionadas con códigos de barras y generación de PDFs

import { db, dbInventario } from '../db/db-operations.js';
import { mostrarMensaje } from '../utils/logs.js';
import { getSupabase } from '../auth/auth.js';

// Función para generar código de barras
export function generarCodigoBarras(codigo, elementoId) {
    try {
        if (typeof JsBarcode !== 'undefined') {
            JsBarcode(`#${elementoId}`, codigo, {
                format: "CODE128",
                width: 2,
                height: 40,
                displayValue: true,
                fontSize: 14,
                margin: 10
            });
        } else {
            console.warn("JsBarcode no está disponible");
        }
    } catch (error) {
        console.error("Error al generar código de barras:", error);
    }
}

// Función para generar PDF con códigos de barras
export async function generarPDFCodigosBarras() {
    // Verificar sesión antes de continuar
    const { verificarSesionValida } = await import('../auth/auth.js');
    const sesionValida = await verificarSesionValida();

    if (!sesionValida) {
        console.error('Sesión no válida al intentar generar PDF');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener productos del inventario
    const productos = await new Promise((resolve) => {
        const transaction = dbInventario.transaction(["inventario"], "readonly");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    if (productos.length === 0) {
        mostrarMensaje("No hay productos en el inventario para generar códigos de barras", "warning");
        return;
    }

    // Configurar el PDF
    doc.setFontSize(16);
    doc.text("Códigos de Barras - Inventario", 20, 20);

    let yPosition = 40;
    const pageHeight = doc.internal.pageSize.height;
    const barcodeWidth = 80;
    const barcodeHeight = 30;
    const margin = 20;

    for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];

        // Verificar si hay espacio suficiente en la página
        if (yPosition + barcodeHeight + 20 > pageHeight) {
            doc.addPage();
            yPosition = 20;
        }

        // Agregar información del producto
        doc.setFontSize(10);
        doc.text(`${producto.nombre} (${producto.codigo})`, margin, yPosition);
        yPosition += 10;

        // Generar código de barras temporal en el DOM
        const tempCanvas = document.createElement('canvas');
        tempCanvas.id = `temp-barcode-${i}`;
        document.body.appendChild(tempCanvas);

        try {
            if (typeof JsBarcode !== 'undefined') {
                JsBarcode(`#temp-barcode-${i}`, producto.codigo, {
                    format: "CODE128",
                    width: 2,
                    height: 40,
                    displayValue: true,
                    fontSize: 12,
                    margin: 5
                });

                // Agregar el código de barras al PDF
                const imgData = tempCanvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', margin, yPosition, barcodeWidth, barcodeHeight);
            } else {
                doc.text(`Código: ${producto.codigo}`, margin + 10, yPosition + 15);
            }
        } catch (error) {
            console.error(`Error al generar código de barras para ${producto.codigo}:`, error);
            doc.text(`Código: ${producto.codigo}`, margin + 10, yPosition + 15);
        }

        // Limpiar el canvas temporal
        document.body.removeChild(tempCanvas);

        yPosition += barcodeHeight + 10;

        // Agregar información adicional
        doc.setFontSize(8);
        doc.text(`Lote: ${producto.lote} | Cantidad: ${producto.cantidad} | Caducidad: ${producto.caducidad}`, margin, yPosition);
        yPosition += 15;
    }

    // Agregar fecha de generación
    const fechaActual = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generado el: ${fechaActual}`, margin, yPosition + 10);

    // Descargar el PDF
    doc.save(`codigos-barras-inventario-${fechaActual.replace(/\//g, '-')}.pdf`);
    mostrarMensaje("PDF generado exitosamente", "success");
}

// Función para generar PDF de inventario
export async function generarPDFInventario() {
    // Verificar sesión antes de continuar
    const { verificarSesionValida } = await import('../auth/auth.js');
    const sesionValida = await verificarSesionValida();

    if (!sesionValida) {
        console.error('Sesión no válida al intentar generar PDF');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener productos del inventario
    const productos = await new Promise((resolve) => {
        const transaction = dbInventario.transaction(["inventario"], "readonly");
        const objectStore = transaction.objectStore("inventario");
        const request = objectStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    if (productos.length === 0) {
        mostrarMensaje("No hay productos en el inventario para generar el reporte", "warning");
        return;
    }

    // Configurar el PDF
    doc.setFontSize(18);
    doc.text("Reporte de Inventario", 20, 20);

    let yPosition = 40;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 8;

    // Encabezados de tabla
    doc.setFontSize(12);
    doc.text("Código", margin, yPosition);
    doc.text("Nombre", margin + 30, yPosition);
    doc.text("Lote", margin + 100, yPosition);
    doc.text("Cantidad", margin + 120, yPosition);
    doc.text("Caducidad", margin + 150, yPosition);
    yPosition += lineHeight * 2;

    // Línea separadora
    doc.line(margin, yPosition - 2, 190, yPosition - 2);
    yPosition += lineHeight;

    // Datos de productos
    doc.setFontSize(10);
    for (const producto of productos) {
        // Verificar si hay espacio suficiente
        if (yPosition + lineHeight * 3 > pageHeight) {
            doc.addPage();
            yPosition = 20;
        }

        doc.text(producto.codigo.toString(), margin, yPosition);
        doc.text(producto.nombre.substring(0, 25), margin + 30, yPosition);
        doc.text(producto.lote.toString(), margin + 100, yPosition);
        doc.text(producto.cantidad.toString(), margin + 120, yPosition);
        doc.text(producto.caducidad, margin + 150, yPosition);
        yPosition += lineHeight;
    }

    // Agregar resumen
    yPosition += lineHeight * 2;
    if (yPosition + lineHeight * 3 > pageHeight) {
        doc.addPage();
        yPosition = 20;
    }

    const totalProductos = productos.length;
    const totalCantidad = productos.reduce((sum, p) => sum + parseFloat(p.cantidad || 0), 0);

    doc.setFontSize(12);
    doc.text(`Total de productos: ${totalProductos}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Cantidad total: ${totalCantidad}`, margin, yPosition);

    // Agregar fecha de generación
    yPosition += lineHeight * 2;
    const fechaActual = new Date().toLocaleDateString();
    doc.text(`Generado el: ${fechaActual}`, margin, yPosition);

    // Descargar el PDF
    doc.save(`inventario-${fechaActual.replace(/\//g, '-')}.pdf`);
    mostrarMensaje("PDF de inventario generado exitosamente", "success");
}

// Función para imprimir códigos de barras
export async function imprimirCodigosBarras() {
    // Verificar sesión antes de continuar
    const { verificarSesionValida } = await import('../auth/auth.js');
    const sesionValida = await verificarSesionValida();

    if (!sesionValida) {
        console.error('Sesión no válida al intentar imprimir');
        return;
    }

    try {
        // Generar el PDF primero
        await generarPDFCodigosBarras();

        // Después de generar el PDF, intentar imprimirlo
        // Nota: En navegadores modernos, el PDF se descarga automáticamente
        // Para impresión directa, necesitaríamos una implementación más compleja
        mostrarMensaje("PDF generado. Use la función de impresión de su navegador para imprimirlo.", "info");
    } catch (error) {
        console.error("Error al imprimir códigos de barras:", error);
        mostrarMensaje("Error al generar PDF para impresión", "error");
    }
}