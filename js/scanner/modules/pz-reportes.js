/**
 * FASE 7: Módulo de Reporte de Inventario
 * Crea reporte del inventario realizado
 * FUSIONA: Conteo de FASE 3 + Escaneo de FASE 6
 * NO compara, FUSIONA datos en registro único
 */

import { getSupabase } from '../../auth/auth.js';

/**
 * Genera reporte de inventario (FUSIÓN de conteo + escaneo)
 * @param {Array} productosVirtuales - Productos contados en FASE 3 (temporal)
 * @param {Array} productosEscaneados - Productos escaneados en FASE 6
 * @returns {Object} Reporte de inventario
 */
export function generarReporte(productosVirtuales, productosEscaneados = []) {
    console.log('📊 FASE 7: Generando reporte de inventario realizado');

    const filasReporte = [];
    
    // LÓGICA: FUSIÓN (no comparación)
    // Cada producto escaneado se FUSIONA con su información de FASE 3
    productosEscaneados.forEach((escaneo, index) => {
        // Buscar el virtual correspondiente
        const virtual = productosVirtuales.find(v => v.id === escaneo.virtual_id);
        
        // ESTADO: Inventariado (escaneo encontró el código en BD)
        // Si no tiene virtual, es incompleto (no se contó en FASE 3)
        const estado = virtual ? 'inventariado' : 'incompleto';
        
        const fila = {
            numero: index + 1,
            seccion: virtual?.seccion || 'N/A',
            nivel: virtual?.nivel || 'N/A',
            
            // Del escaneo (FASE 6)
            codigo: escaneo.codigo_producto || escaneo.codigoProducto || '',
            nombre_fisico: escaneo.nombre || 'Desconocido',
            
            // Del conteo manual (FASE 3) - FUSIONADO
            cantidad: virtual?.cantidad || 0,
            caducidad: virtual?.caducidad || 'N/A',
            
            // Estado del inventario
            estado: estado, // ✅ inventariado, ⚠️ incompleto
            observaciones: virtual ? '' : 'Escaneado sin registro de conteo',
            
            // Para Supabase (tabla inventario)
            marca: escaneo.marca || '',
            categoria: escaneo.categoria || '',
            lote: virtual?.lote || '1',
            unidad: escaneo.unidad || 'unidad',
            producto_id: escaneo.id_producto || '',
            colorEstado: virtual ? 'verde' : 'amarillo'
        };
        
        filasReporte.push(fila);
    });
    
    // Detectar productos contados pero NO escaneados (incompletos)
    const escaneadosIds = new Set(productosEscaneados.map(e => e.virtual_id));
    productosVirtuales.forEach((virtual, idx) => {
        if (!escaneadosIds.has(virtual.id)) {
            filasReporte.push({
                numero: filasReporte.length + 1,
                seccion: virtual.seccion,
                nivel: virtual.nivel,
                codigo: 'SIN ESCANEAR',
                nombre_fisico: virtual.nombre,
                cantidad: virtual.cantidad,
                caducidad: virtual.caducidad,
                estado: 'incompleto',
                observaciones: 'Contado pero no fue escaneado',
                marca: '',
                categoria: '',
                lote: virtual.lote || '1',
                unidad: 'unidad',
                producto_id: '',
                colorEstado: 'rojo'
            });
        }
    });

    // Calcular estadísticas
    const estadisticas = calcularEstadisticas(filasReporte);

    const reporte = {
        titulo: 'Reporte de Inventario Realizado',
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES'),
        filas: filasReporte,
        estadisticas: estadisticas,
        timestamp: new Date().toISOString()
    };

    console.log('✅ Reporte de inventario generado:', reporte);
    return reporte;
}

/**
 * Calcula estadísticas del reporte
 * @param {Array} filas - Filas del reporte
 * @returns {Object} Estadísticas
 */
function calcularEstadisticas(filas) {
    const stats = {
        totalProductos: filas.length,
        inventariados: 0,
        incompletos: 0,
        tasaExito: 0
    };

    filas.forEach(fila => {
        if (fila.estado === 'inventariado') {
            stats.inventariados++;
        } else if (fila.estado === 'incompleto') {
            stats.incompletos++;
        }
    });

    // Calcular tasa de éxito
    if (stats.totalProductos > 0) {
        stats.tasaExito = Math.round((stats.inventariados / stats.totalProductos) * 100);
    }

    return stats;
}

/**
 * Renderiza reporte en HTML
 * @param {Object} reporte - Reporte generado
 * @returns {string} HTML del reporte
 */
export function renderizarReporteHTML(reporte) {
    console.log('🎨 Renderizando reporte en HTML');

    const colorMap = {
        'verde': '#10b981',
        'amarillo': '#f59e0b',
        'rojo': '#ef4444'
    };

    let html = `
        <div class="reporte-contenedor" style="max-width: 1200px; margin: 20px auto; font-family: Arial, sans-serif;">
            <div class="reporte-encabezado" style="background: linear-gradient(to right, #1e40af, #1e3a8a); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28px;">📊 ${reporte.titulo}</h1>
                <p style="margin: 10px 0 0 0; font-size: 14px;">
                    📅 ${reporte.fecha} | ⏰ ${reporte.hora}
                </p>
            </div>

            <!-- Estadísticas Resumen -->
            <div class="reporte-estadisticas" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="stat-card" style="background: #10b98130; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 12px; color: #059669; font-weight: bold;">✅ INVENTARIADOS</div>
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">${reporte.estadisticas.inventariados}</div>
                </div>
                <div class="stat-card" style="background: #f59e0b30; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 12px; color: #b45309; font-weight: bold;">⚠️ INCOMPLETOS</div>
                    <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${reporte.estadisticas.incompletos}</div>
                </div>
                <div class="stat-card" style="background: #3b82f630; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 12px; color: #1e40af; font-weight: bold;">📊 TOTAL</div>
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${reporte.estadisticas.totalProductos}</div>
                </div>
                <div class="stat-card" style="background: #8b5cf630; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                    <div style="font-size: 12px; color: #6b21a8; font-weight: bold;">✨ TASA ÉXITO</div>
                    <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${reporte.estadisticas.tasaExito}%</div>
                </div>
            </div>

            <!-- Tabla de Detalle -->
            <div class="reporte-tabla" style="overflow-x: auto; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                        <tr>
                            <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">#</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Sec</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Niv</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Código</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Producto</th>
                            <th style="padding: 12px; text-align: center; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Cantidad</th>
                            <th style="padding: 12px; text-align: center; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Caducidad</th>
                            <th style="padding: 12px; text-align: center; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Filas de reporte
    reporte.filas.forEach((fila) => {
        const colorFondo = colorMap[fila.colorEstado] + '20';
        const colorBorde = colorMap[fila.colorEstado];
        const estadoLabel = fila.estado === 'inventariado' ? '✅ Inventariado' : '⚠️ Incompleto';

        html += `
                        <tr style="background: ${colorFondo}; border-bottom: 1px solid #e5e7eb; border-left: 3px solid ${colorBorde};">
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">${fila.numero}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">${fila.seccion}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">${fila.nivel}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 11px;">${fila.codigo}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">${fila.nombre_fisico}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${fila.cantidad}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${fila.caducidad}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${colorBorde};">
                                ${estadoLabel}
                            </td>
                        </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>

            <!-- Botones de Acción -->
            <div class="reporte-acciones" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="descargarReporteCSV()" style="padding: 12px 24px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    📊 Exportar CSV
                </button>
                <button onclick="guardarEnSupabase()" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    ☁️ Guardar en BD
                </button>
            </div>
        </div>
    `;

    return html;
}

/**
 * Renderiza reporte en el DOM
 * @param {Object} reporte - Reporte generado
 * @param {Array} productosVirtuales - Productos virtuales (para guardar)
 * @param {Array} productosEscaneados - Productos escaneados (para guardar)
 */
export function mostrarReporte(reporte, productosVirtuales = [], productosEscaneados = []) {
    console.log('📺 Mostrando reporte en pantalla');

    // Usar el div reporteContenedor que ya existe en el HTML
    let contenedor = document.getElementById('reporteContenedor');
    
    if (!contenedor) {
        console.warn('⚠️ No se encontró el div reporteContenedor en el HTML, creando uno...');
        // Crear un contenedor temporal
        contenedor = document.createElement('div');
        contenedor.id = 'reporteContenedor';
        contenedor.className = 'my-8';
        
        // Intentar insertar después del modal o al final del body
        const modalPZ = document.getElementById('modalInventarioPZ');
        if (modalPZ && modalPZ.parentNode) {
            modalPZ.parentNode.insertBefore(contenedor, modalPZ.nextSibling);
        } else {
            document.body.appendChild(contenedor);
        }
        console.log('✅ Contenedor creado dinámicamente');
    }

    contenedor.innerHTML = renderizarReporteHTML(reporte);

    // Registrar funciones globales
    window.guardarEnSupabaseClick = () => guardarEnSupabase(reporte, productosVirtuales, productosEscaneados);
    window.descargarReportePDFClick = () => descargarReportePDF(reporte);
    window.descargarReporteCSVClick = () => descargarReporteCSV(reporte);

    const btnGuardar = contenedor.querySelector('button[onclick*="guardarEnSupabase"]');
    const btnPDF = contenedor.querySelector('button[onclick*="descargarReportePDF"]');
    const btnCSV = contenedor.querySelector('button[onclick*="descargarReporteCSV"]');

    if (btnGuardar) btnGuardar.onclick = window.guardarEnSupabaseClick;
    if (btnPDF) btnPDF.onclick = window.descargarReportePDFClick;
    if (btnCSV) btnCSV.onclick = window.descargarReporteCSVClick;

    // Scroll hacia el reporte
    setTimeout(() => {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    
    console.log('✅ Reporte mostrado en pantalla');
}

/**
 * Convierte tipo de caducidad a fecha real
 * @param {string} tipoCaducidad - "este_mes" o "después_mes"
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function calcularFechaCaducidad(tipoCaducidad) {
    const hoy = new Date();
    let dias = 0;

    if (tipoCaducidad === 'este_mes') {
        // Menos de 30 días (25 días para asegurar está dentro del mes)
        dias = 25;
    } else if (tipoCaducidad === 'después_mes') {
        // Al menos 60 días
        dias = 60;
    } else {
        // Default: 30 días
        dias = 30;
    }

    const fechaCaducidad = new Date(hoy);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + dias);

    // Formato YYYY-MM-DD
    const año = fechaCaducidad.getFullYear();
    const mes = String(fechaCaducidad.getMonth() + 1).padStart(2, '0');
    const día = String(fechaCaducidad.getDate()).padStart(2, '0');

    return `${año}-${mes}-${día}`;
}

/**
 * Prepara datos para Supabase según estructura tabla inventario
 * @param {Object} reporte - Reporte generado
 * @returns {Array} Datos para Supabase
 */
function prepararDatosSupabase(reporte) {
    const datosSupabase = [];
    const usuario_id = localStorage.getItem('usuario_id') || 'anonymous';
    const area_id = localStorage.getItem('area_id') || '10000000-0000-0000-0000-000000000001';

    reporte.filas.forEach((fila, index) => {
        // Generar ID: {codigo}-{lote}
        const lote = fila.lote || '1';
        const id = `${fila.codigo}-${lote}`;

        // Convertir caducidad a fecha real
        const fechaCaducidad = calcularFechaCaducidad(fila.caducidad);

        // Mapear a estructura de tabla inventario en Supabase
        const producto = {
            id: id,
            codigo: fila.codigo || '',
            nombre: fila.nombre_fisico,
            categoria: fila.categoria || '',
            lote: lote,
            unidad: fila.unidad || 'unidad',
            cantidad: parseFloat(fila.cantidad) || 0,
            caducidad: fechaCaducidad,
            comentarios: fila.observaciones || 'N/A',
            usuario_id: usuario_id,
            area_id: area_id,
            marca: fila.marca || '',
            is_temp_id: false,
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        };
        datosSupabase.push(producto);
    });

    console.log(`📦 ${datosSupabase.length} productos preparados para Supabase`);
    return datosSupabase;
}

/**
 * Guarda inventario en Supabase
 * @param {Object} reporte - Reporte generado
 * @param {Array} productosVirtuales - Productos virtuales
 * @param {Array} productosEscaneados - Productos escaneados
 */
export async function guardarEnSupabase(reporte, productosVirtuales, productosEscaneados) {
    console.log('☁️ Iniciando guardado en Supabase...');

    const confirmacion = await new Promise((resolve) => {
        const modalHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                    <h3 style="margin: 0 0 15px 0; color: #111; font-size: 20px;">✅ Confirmar Guardado</h3>
                    <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">
                        Se guardarán <strong>${reporte.filas.length} productos</strong> en tabla inventario de Supabase.
                    </p>
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px;">
                        <div style="margin-bottom: 8px;"><strong>Estadísticas:</strong></div>
                        <div>✅ Inventariados: ${reporte.estadisticas.inventariados}</div>
                        <div>⚠️ Incompletos: ${reporte.estadisticas.incompletos}</div>
                        <div>✨ Tasa de Éxito: ${reporte.estadisticas.tasaExito}%</div>
                    </div>
                    <p style="color: #d97706; font-size: 12px; margin-bottom: 20px;">
                        ⚠️ Esta acción no se puede deshacer.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="btnCancelarGuardado" style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; color: #374151;">
                            Cancelar
                        </button>
                        <button id="btnConfirmarGuardado" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            ✅ Guardar Inventario
                        </button>
                    </div>
                </div>
            </div>
        `;

        const contenedor = document.createElement('div');
        contenedor.innerHTML = modalHTML;
        document.body.appendChild(contenedor);

        document.getElementById('btnConfirmarGuardado').onclick = () => {
            contenedor.remove();
            resolve(true);
        };

        document.getElementById('btnCancelarGuardado').onclick = () => {
            contenedor.remove();
            resolve(false);
        };
    });

    if (!confirmacion) {
        console.log('❌ Guardado cancelado por usuario');
        return false;
    }

    try {
        const datosSupabase = prepararDatosSupabase(reporte);
        const supabase = await getSupabase();

        if (!supabase) {
            throw new Error('No se pudo obtener cliente Supabase');
        }

        let mensajeEstado = document.getElementById('mensajeEstadoGuardado');
        if (!mensajeEstado) {
            mensajeEstado = document.createElement('div');
            mensajeEstado.id = 'mensajeEstadoGuardado';
            document.body.appendChild(mensajeEstado);
        }

        mensajeEstado.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10001;">
                🔄 Guardando ${datosSupabase.length} productos...
            </div>
        `;

        const { data, error } = await supabase
            .from('inventario')
            .insert(datosSupabase);

        if (error) {
            console.error('❌ Error al guardar:', error);
            mensajeEstado.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10001;">
                    ❌ Error: ${error.message}
                </div>
            `;
            return false;
        }

        console.log('✅ Guardado exitoso en Supabase');
        mensajeEstado.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10001;">
                ✅ ${datosSupabase.length} productos guardados
            </div>
        `;

        // Limpiar el reporte después de guardar exitosamente
        const reporteContenedor = document.getElementById('reporteContenedor');
        if (reporteContenedor) {
            setTimeout(() => {
                reporteContenedor.innerHTML = '';
                console.log('🧹 Reporte limpiado');
            }, 2000);
        }

        setTimeout(() => mensajeEstado.remove(), 3000);
        localStorage.removeItem('estadoPZ');
        localStorage.removeItem('productosVirtuales');

        return true;

    } catch (error) {
        console.error('❌ Error inesperado:', error);
        alert(`❌ Error: ${error.message}`);
        return false;
    }
}

/**
 * Descarga reporte como CSV
 * @param {Object} reporte - Reporte a descargar
 */
export function descargarReporteCSV(reporte) {
    console.log('📊 Generando CSV...');
    
    try {
        const encabezados = ['#', 'Sección', 'Nivel', 'Código', 'Producto', 'Cantidad', 'Caducidad', 'Estado', 'Observaciones'];
        
        const filas = reporte.filas.map(fila => [
            fila.numero,
            fila.seccion,
            fila.nivel,
            fila.codigo,
            `"${fila.nombre_fisico}"`,
            fila.cantidad,
            fila.caducidad,
            fila.estado,
            `"${fila.observaciones}"`
        ]);

        filas.push([]);
        filas.push(['RESUMEN', '', '', '', '', '', '', '', '']);
        filas.push(['Inventariados', reporte.estadisticas.inventariados, '', '', '', '', '', '', '']);
        filas.push(['Incompletos', reporte.estadisticas.incompletos, '', '', '', '', '', '', '']);
        filas.push(['Tasa de Éxito', `${reporte.estadisticas.tasaExito}%`, '', '', '', '', '', '', '']);

        let csv = encabezados.join(',') + '\n';
        csv += filas.map(fila => fila.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const nombreArchivo = `inventario_${new Date().toISOString().slice(0,10)}.csv`;
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ CSV descargado');

    } catch (error) {
        console.error('❌ Error CSV:', error);
        alert(`Error: ${error.message}`);
    }
}
