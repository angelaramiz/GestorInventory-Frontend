/**
 * ReportUIService - Servicio para gestión de interfaz de reportes
 * 
 * Gestiona la interacción con la UI:
 * - Inicialización de filtros y controles
 * - Visualización de productos en lista
 * - Estados de carga
 * - Manejo de selecciones de usuario
 * - Diálogos de configuración
 * 
 * @class ReportUIService
 * @version 4.0.0
 * @since 2025-10-04
 */

export class ReportUIService {
    constructor() {
        this.elements = {};
    }

    /**
     * Inicializa los elementos del DOM
     */
    initializeElements() {
        this.elements = {
            areasContainer: document.getElementById('areasContainer'),
            productosContainer: document.getElementById('productosContainer'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            areaTodas: document.getElementById('area-todas'),
            aplicarFiltroBtn: document.getElementById('aplicarFiltroBtn'),
            generarReporteBtn: document.getElementById('generarReporteBtn')
        };
    }

    /**
     * Renderiza los checkboxes de áreas
     * @param {Array} areas - Array de áreas
     */
    renderAreaCheckboxes(areas) {
        if (!this.elements.areasContainer) return;

        areas.forEach(area => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'flex items-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `area-${area.id}`;
            checkbox.value = area.id;
            checkbox.className = 'areaCheckbox mr-2';
            checkbox.disabled = this.elements.areaTodas?.checked || false;

            checkbox.addEventListener('change', () => this._handleAreaSpecificSelection());

            const label = document.createElement('label');
            label.htmlFor = `area-${area.id}`;
            label.textContent = area.nombre;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            this.elements.areasContainer.appendChild(checkboxDiv);
        });
    }

    /**
     * Muestra los productos en la lista
     * @param {Array} productos - Array de productos
     * @param {Array} todasLasAreas - Array de áreas para mapeo
     */
    displayProductList(productos, todasLasAreas) {
        if (!this.elements.productosContainer) return;

        this.elements.productosContainer.innerHTML = '';

        if (productos.length === 0) {
            this.elements.productosContainer.innerHTML = 
                '<li class="text-gray-500">No hay productos disponibles para esta área.</li>';
            return;
        }

        productos.forEach(producto => {
            const li = document.createElement('li');
            li.className = 'py-1';

            const area = todasLasAreas.find(a => a.id === producto.area_id);
            const areaNombre = area ? area.nombre : 'Área desconocida';

            li.innerHTML = `<span class="font-semibold">${producto.nombre || 'Sin nombre'}</span> - Código: ${producto.codigo || 'Sin código'} <span class="text-gray-500 text-sm">(${areaNombre})</span>`;
            this.elements.productosContainer.appendChild(li);
        });
    }

    /**
     * Muestra u oculta el indicador de carga
     * @param {boolean} show - Mostrar o no el indicador
     */
    toggleLoading(show) {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.toggle('hidden', !show);
        }
    }

    /**
     * Obtiene los IDs de las áreas seleccionadas
     * @returns {Array<string>} Array de IDs de áreas
     */
    getSelectedAreaIds() {
        const checkboxes = document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Verifica si "Todas las áreas" está seleccionado
     * @returns {boolean}
     */
    isAllAreasSelected() {
        return this.elements.areaTodas?.checked || false;
    }

    /**
     * Muestra el diálogo de configuración de reporte
     * @returns {Promise<Object|null>} Opciones seleccionadas o null si se cancela
     */
    async showReportConfigDialog() {
        const result = await Swal.fire({
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
                this._setupReportDialogListeners();
            },
            preConfirm: () => {
                return this._getReportOptions();
            }
        });

        return result.isConfirmed ? result.value : null;
    }

    /**
     * Configura los listeners del diálogo de reporte
     * @private
     */
    _setupReportDialogListeners() {
        const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones');
        const agrupacionesDiv = document.getElementById('agrupacionesEspecificas');
        const agrupacionesCheckboxes = document.querySelectorAll('.agrupacion-checkbox');

        todasAgrupaciones?.addEventListener('change', function() {
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
                
                const haySeleccionadas = Array.from(agrupacionesCheckboxes).some(cb => cb.checked);
                if (!haySeleccionadas) {
                    todasAgrupaciones.checked = true;
                    agrupacionesDiv.style.display = 'none';
                }
            });
        });
    }

    /**
     * Obtiene las opciones seleccionadas del diálogo
     * @private
     * @returns {Object} Opciones de reporte
     */
    _getReportOptions() {
        const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones')?.checked || false;
        
        return {
            incluirCaducidad: true,
            incluirComentarios: true,
            incluirCodigo: true,
            incluirArea: true,
            fusionarLotes: document.getElementById('fusionarLotes')?.checked || false,
            filtrarAgrupaciones: !todasAgrupaciones,
            agrupacionesSeleccionadas: todasAgrupaciones ? [] : {
                vencidos: document.getElementById('incluirVencidos')?.checked || false,
                proximosSemana: document.getElementById('incluirProximaSemana')?.checked || false,
                mismoMes: document.getElementById('incluirMismoMes')?.checked || false,
                siguienteMes: document.getElementById('incluirSiguienteMes')?.checked || false,
                otros: document.getElementById('incluirOtros')?.checked || false
            }
        };
    }

    /**
     * Maneja la selección específica de áreas
     * @private
     */
    _handleAreaSpecificSelection() {
        const areaCheckboxes = document.querySelectorAll('.areaCheckbox:not(#area-todas)');
        const todasCheckbox = document.getElementById('area-todas');

        const hayAreasSeleccionadas = Array.from(areaCheckboxes).some(cb => cb.checked);
        if (hayAreasSeleccionadas && todasCheckbox) {
            todasCheckbox.checked = false;
        }
    }

    /**
     * Configura el listener para "Todas las áreas"
     * @param {Function} callback - Función callback a ejecutar
     */
    setupAllAreasToggle(callback) {
        if (!this.elements.areaTodas) return;

        this.elements.areaTodas.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.areaCheckbox').forEach(checkbox => {
                if (checkbox.id !== 'area-todas') {
                    checkbox.checked = false;
                    checkbox.disabled = isChecked;
                }
            });
            if (callback) callback(isChecked);
        });
    }

    /**
     * Muestra mensaje de error
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        Swal.fire('Error', message, 'error');
    }

    /**
     * Muestra mensaje de advertencia
     * @param {string} message - Mensaje de advertencia
     */
    showWarning(message) {
        Swal.fire('Advertencia', message, 'warning');
    }

    /**
     * Muestra mensaje de éxito
     * @param {string} message - Mensaje de éxito
     */
    showSuccess(message) {
        Swal.fire('¡Éxito!', message, 'success');
    }

    /**
     * Muestra mensaje de información
     * @param {string} message - Mensaje de información
     */
    showInfo(message) {
        Swal.fire('Atención', message, 'info');
    }

    /**
     * Genera el nombre del archivo PDF según las opciones
     * @param {Object} opciones - Opciones de reporte
     * @returns {string} Nombre del archivo
     */
    generateFileName(opciones) {
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
        
        return `${nombreArchivo}.pdf`;
    }
}

// Exportar instancia singleton
export const reportUIService = new ReportUIService();

// Exportación por defecto
export default ReportUIService;
