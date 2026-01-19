/**
 * FASE 4: Persistencia de Secciones - JSON/CSV Temporal
 * Gestiona el almacenamiento temporal de secciones completadas
 */

// Variable global para historial de secciones
let historialSecciones = [];

/**
 * Convierte una sección a formato JSON
 * @param {Object} seccion - Sección a convertir
 * @returns {string} JSON stringificado
 */
export function seccionAJSON(seccion) {
    return JSON.stringify(seccion, null, 2);
}

/**
 * Convierte una sección a formato CSV
 * @param {Object} seccion - Sección a convertir
 * @returns {string} CSV formateado
 */
export function seccionACSV(seccion) {
    let csv = `Sección,${seccion.seccion}\n`;
    csv += `\nNivel,Producto #,Cantidad,Caducidad,Timestamp\n`;

    seccion.niveles.forEach(nivel => {
        nivel.productos.forEach((producto, idx) => {
            const fila = [
                nivel.nivel,
                producto.numero,
                producto.cantidad,
                producto.caducidad === 'este_mes' ? 'Este Mes' : 'Después',
                producto.timestamp
            ];
            csv += fila.join(',') + '\n';
        });
    });

    return csv;
}

/**
 * Guarda una sección en el historial
 * @param {Object} seccion - Sección a guardar
 * @returns {number} ID de la sección guardada
 */
export function guardarSeccionEnHistorial(seccion) {
    const seccionConMetadata = {
        ...seccion,
        id: historialSecciones.length + 1,
        fechaGuardado: new Date().toISOString(),
        totalProductos: seccion.niveles.reduce((sum, n) => sum + n.productos.length, 0),
        totalNiveles: seccion.niveles.length
    };

    historialSecciones.push(seccionConMetadata);

    console.log(`✅ Sección ${seccion.seccion} guardada en historial (ID: ${seccionConMetadata.id})`);

    return seccionConMetadata.id;
}

/**
 * Obtiene todas las secciones del historial
 * @returns {Array} Array de secciones guardadas
 */
export function obtenerHistorialSecciones() {
    return historialSecciones;
}

/**
 * Obtiene una sección específica del historial
 * @param {number} id - ID de la sección
 * @returns {Object|null} Sección o null si no existe
 */
export function obtenerSeccionPorId(id) {
    return historialSecciones.find(s => s.id === id) || null;
}

/**
 * Obtiene resumen estadístico del historial
 * @returns {Object} Estadísticas del conteo
 */
export function obtenerResumenEstadistico() {
    const totalSecciones = historialSecciones.length;
    const totalProductos = historialSecciones.reduce((sum, s) => sum + s.totalProductos, 0);
    const totalNiveles = historialSecciones.reduce((sum, s) => sum + s.totalNiveles, 0);
    const tiempoInicio = historialSecciones[0]?.fechaGuardado;
    const tiempoFin = new Date().toISOString();

    return {
        totalSecciones,
        totalProductos,
        totalNiveles,
        tiempoInicio,
        tiempoFin,
        seccionesDetalles: historialSecciones.map(s => ({
            seccion: s.seccion,
            totalProductos: s.totalProductos,
            niveles: s.totalNiveles,
            fecha: s.fechaGuardado
        }))
    };
}

/**
 * Exporta todo el historial a JSON
 * @returns {string} JSON con todas las secciones
 */
export function exportarHistorialJSON() {
    return JSON.stringify({
        version: '1.0',
        tipo: 'Inventario PZ - Historial de Secciones',
        fechaExportacion: new Date().toISOString(),
        resumen: obtenerResumenEstadistico(),
        secciones: historialSecciones
    }, null, 2);
}

/**
 * Exporta todo el historial a CSV
 * @returns {string} CSV con todas las secciones
 */
export function exportarHistorialCSV() {
    let csv = 'INVENTARIO POR SECCIONES Y NIVELES (MODO PZ)\n';
    csv += `Fecha de Exportación: ${new Date().toLocaleString('es-ES')}\n`;
    csv += '='.repeat(80) + '\n\n';

    const resumen = obtenerResumenEstadistico();
    csv += `Total de Secciones: ${resumen.totalSecciones}\n`;
    csv += `Total de Productos: ${resumen.totalProductos}\n`;
    csv += `Total de Niveles: ${resumen.totalNiveles}\n\n`;

    csv += '='.repeat(80) + '\n\n';

    historialSecciones.forEach((seccion, idx) => {
        csv += `SECCIÓN ${seccion.seccion}\n`;
        csv += `Total Productos: ${seccion.totalProductos} | Niveles: ${seccion.totalNiveles}\n`;
        csv += `Guardado: ${new Date(seccion.fechaGuardado).toLocaleString('es-ES')}\n`;
        csv += '-'.repeat(80) + '\n';
        csv += 'Nivel,Producto #,Cantidad,Caducidad\n';

        seccion.niveles.forEach(nivel => {
            nivel.productos.forEach(producto => {
                const fila = [
                    nivel.nivel,
                    producto.numero,
                    producto.cantidad,
                    producto.caducidad === 'este_mes' ? 'Este Mes' : 'Después'
                ];
                csv += fila.join(',') + '\n';
            });
        });

        csv += '\n\n';
    });

    return csv;
}

/**
 * Limpia todo el historial
 */
export function limpiarHistorial() {
    historialSecciones = [];
    console.log('🧹 Historial de secciones limpiado');
}

/**
 * Descarga un archivo con los datos del historial
 * @param {string} formato - 'json' o 'csv'
 */
export function descargarHistorial(formato = 'json') {
    let contenido, nombreArchivo, tipo;

    if (formato === 'json') {
        contenido = exportarHistorialJSON();
        nombreArchivo = `inventario-pz-${new Date().toISOString().slice(0, 10)}.json`;
        tipo = 'application/json';
    } else if (formato === 'csv') {
        contenido = exportarHistorialCSV();
        nombreArchivo = `inventario-pz-${new Date().toISOString().slice(0, 10)}.csv`;
        tipo = 'text/csv';
    } else {
        console.error('❌ Formato no válido. Use "json" o "csv"');
        return;
    }

    // Crear blob y descargar
    const blob = new Blob([contenido], { type: tipo });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();

    console.log(`📥 Archivo descargado: ${nombreArchivo}`);
}

/**
 * Obtiene representación visual del historial
 * @returns {string} Representación en texto
 */
export function mostrarHistorialVisual() {
    if (historialSecciones.length === 0) {
        return 'No hay secciones guardadas aún.';
    }

    let visual = '📊 HISTORIAL DE SECCIONES\n';
    visual += '═'.repeat(60) + '\n\n';

    historialSecciones.forEach((seccion, idx) => {
        visual += `${idx + 1}. Sección ${seccion.seccion}\n`;
        visual += `   ├─ ID: ${seccion.id}\n`;
        visual += `   ├─ Productos: ${seccion.totalProductos}\n`;
        visual += `   ├─ Niveles: ${seccion.totalNiveles}\n`;
        visual += `   └─ Guardado: ${new Date(seccion.fechaGuardado).toLocaleString('es-ES')}\n\n`;
    });

    const resumen = obtenerResumenEstadistico();
    visual += '═'.repeat(60) + '\n';
    visual += `RESUMEN TOTAL: ${resumen.totalSecciones} secciones | `;
    visual += `${resumen.totalProductos} productos | `;
    visual += `${resumen.totalNiveles} niveles\n`;

    return visual;
}

export { historialSecciones };
