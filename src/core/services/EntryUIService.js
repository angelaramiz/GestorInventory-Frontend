/**
 * EntryUIService - Servicio para gestión de interfaz de entradas
 * 
 * Gestiona la interacción con la UI:
 * - Renderizado de formularios
 * - Visualización de tablas
 * - Estados de carga
 * - Manejo de eventos
 * 
 * @class EntryUIService
 * @version 4.0.0
 * @since 2025-10-04
 */

export class EntryUIService {
    constructor() {
        this.elements = {};
    }

    /**
     * Inicializa los elementos del DOM
     */
    initializeElements() {
        this.elements = {
            // Campos de búsqueda
            busquedaCodigo: document.getElementById('busquedaCodigo'),
            busquedaNombre: document.getElementById('busquedaNombre'),
            busquedaMarca: document.getElementById('busquedaMarca'),

            // Botones de búsqueda
            buscarPorCodigo: document.getElementById('buscarPorCodigo'),
            buscarPorNombre: document.getElementById('buscarPorNombre'),
            buscarPorMarca: document.getElementById('buscarPorMarca'),

            // Campos de producto
            codigoProducto: document.getElementById('codigoProducto'),
            nombreProducto: document.getElementById('nombreProducto'),
            marcaProducto: document.getElementById('marcaProducto'),
            categoriaProducto: document.getElementById('categoriaProducto'),
            unidadProducto: document.getElementById('unidadProducto'),

            // Campos de entrada
            cantidadEntrada: document.getElementById('cantidadEntrada'),
            fechaEntrada: document.getElementById('fechaEntrada'),
            comentariosEntrada: document.getElementById('comentariosEntrada'),

            // Botones de acción
            registrarEntrada: document.getElementById('registrarEntrada'),
            limpiarFormulario: document.getElementById('limpiarFormulario'),

            // Filtros
            filtroCodigo: document.getElementById('filtroCodigo'),
            filtroNombre: document.getElementById('filtroNombre'),
            filtroMarca: document.getElementById('filtroMarca'),
            filtrarEntradas: document.getElementById('filtrarEntradas'),
            limpiarFiltros: document.getElementById('limpiarFiltros'),

            // Tabla y otros
            tablaEntradasBody: document.getElementById('tablaEntradasBody'),
            contadorEntradas: document.getElementById('contadorEntradas'),
            sincronizarEntradas: document.getElementById('sincronizarEntradas'),
            generarReporte: document.getElementById('generarReporte')
        };
    }

    /**
     * Muestra los datos del producto en el formulario
     * @param {Object} producto - Producto a mostrar
     */
    displayProductData(producto) {
        if (!producto) {
            this.clearForm();
            return;
        }

        const campos = [
            { elem: this.elements.codigoProducto, valor: producto.codigo || '' },
            { elem: this.elements.nombreProducto, valor: producto.nombre || '' },
            { elem: this.elements.marcaProducto, valor: producto.marca || '' },
            { elem: this.elements.categoriaProducto, valor: producto.categoria || '' },
            { elem: this.elements.unidadProducto, valor: producto.unidad || '' }
        ];

        campos.forEach(campo => {
            if (campo.elem) {
                campo.elem.value = campo.valor;
            }
        });

        // Limpiar campos de entrada
        this.clearEntryFields();

        // Establecer fecha actual
        this.setCurrentDate();

        // Enfocar en cantidad
        if (this.elements.cantidadEntrada) {
            this.elements.cantidadEntrada.focus();
        }
    }

    /**
     * Limpia el formulario completo
     */
    clearForm() {
        const campos = [
            'codigoProducto', 'nombreProducto', 'marcaProducto',
            'categoriaProducto', 'unidadProducto', 'cantidadEntrada',
            'fechaEntrada', 'comentariosEntrada'
        ];

        campos.forEach(campoId => {
            const elemento = this.elements[campoId];
            if (elemento) {
                elemento.value = '';
            }
        });

        this.setCurrentDate();
    }

    /**
     * Limpia solo los campos de entrada
     */
    clearEntryFields() {
        const campos = ['cantidadEntrada', 'fechaEntrada', 'comentariosEntrada'];
        campos.forEach(campoId => {
            const elemento = this.elements[campoId];
            if (elemento) {
                elemento.value = '';
            }
        });
    }

    /**
     * Establece la fecha actual en el campo de fecha
     */
    setCurrentDate() {
        if (this.elements.fechaEntrada) {
            this.elements.fechaEntrada.value = new Date().toISOString().split('T')[0];
        }
    }

    /**
     * Obtiene los datos de entrada del formulario
     * @returns {Object} Datos de entrada
     */
    getEntryData() {
        return {
            cantidad: this.elements.cantidadEntrada?.value?.trim() || '',
            fecha_entrada: this.elements.fechaEntrada?.value || '',
            comentarios: this.elements.comentariosEntrada?.value?.trim() || ''
        };
    }

    /**
     * Obtiene el término de búsqueda según el tipo
     * @param {string} tipo - Tipo: 'codigo', 'nombre', 'marca'
     * @returns {string}
     */
    getSearchTerm(tipo) {
        const elementos = {
            codigo: this.elements.busquedaCodigo,
            nombre: this.elements.busquedaNombre,
            marca: this.elements.busquedaMarca
        };

        return elementos[tipo]?.value?.trim() || '';
    }

    /**
     * Obtiene los filtros actuales
     * @returns {Object}
     */
    getFilters() {
        return {
            codigo: this.elements.filtroCodigo?.value?.trim() || '',
            nombre: this.elements.filtroNombre?.value?.trim() || '',
            marca: this.elements.filtroMarca?.value?.trim() || ''
        };
    }

    /**
     * Limpia los filtros
     */
    clearFilters() {
        const filtros = ['filtroCodigo', 'filtroNombre', 'filtroMarca'];
        filtros.forEach(filtroId => {
            const elemento = this.elements[filtroId];
            if (elemento) {
                elemento.value = '';
            }
        });
    }

    /**
     * Renderiza la tabla de entradas
     * @param {Array} entradas - Array de entradas
     */
    renderEntriesTable(entradas) {
        const tbody = this.elements.tablaEntradasBody;

        if (!tbody) {
            console.warn("No se encontró el elemento tablaEntradasBody");
            return;
        }

        tbody.innerHTML = '';

        if (entradas.length === 0) {
            tbody.innerHTML = `
                <tr class="dark-theme-bg">
                    <td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500 dark-theme-text-secondary">
                        No hay entradas registradas
                    </td>
                </tr>
            `;
            this.updateCounter(0);
            return;
        }

        entradas.forEach((entrada, index) => {
            const fila = document.createElement('tr');
            fila.className = index % 2 === 0 ? 'bg-white dark-theme-bg' : 'bg-gray-50 dark-theme-bg-secondary';

            fila.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark-theme-text">
                    ${entrada.codigo || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.nombre || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.marca || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.categoria || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.unidad || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.cantidad || 0}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.fecha_entrada ? new Date(entrada.fecha_entrada).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark-theme-text-secondary">
                    ${entrada.comentarios || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="window.eliminarEntrada(${entrada.id})" 
                            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                        Eliminar
                    </button>
                </td>
            `;

            tbody.appendChild(fila);
        });

        this.updateCounter(entradas.length);
    }

    /**
     * Actualiza el contador de entradas
     * @param {number} count - Número de entradas
     */
    updateCounter(count) {
        if (this.elements.contadorEntradas) {
            this.elements.contadorEntradas.textContent = `Total: ${count} entradas`;
        }
    }

    /**
     * Muestra mensaje de éxito
     * @param {string} message - Mensaje
     */
    showSuccess(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: message,
                timer: 2000,
                showConfirmButton: false
            });
        }
    }

    /**
     * Muestra mensaje de error
     * @param {string} message - Mensaje
     */
    showError(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message
            });
        }
    }

    /**
     * Muestra mensaje de advertencia
     * @param {string} message - Mensaje
     */
    showWarning(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: message
            });
        }
    }

    /**
     * Muestra mensaje de información
     * @param {string} message - Mensaje
     */
    showInfo(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'info',
                title: 'Información',
                text: message
            });
        }
    }

    /**
     * Muestra confirmación de eliminación
     * @async
     * @param {string} message - Mensaje
     * @returns {Promise<boolean>}
     */
    async confirmDelete(message = '¿Está seguro de que desea eliminar esta entrada?') {
        if (window.Swal) {
            const result = await Swal.fire({
                icon: 'warning',
                title: '¿Confirmar eliminación?',
                text: message,
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280'
            });
            return result.isConfirmed;
        }
        return confirm(message);
    }

    /**
     * Muestra alerta burbuja (compatibilidad)
     * @param {string} message - Mensaje
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     */
    showBubbleAlert(message, type = 'info') {
        if (window.Swal && Swal.mixin) {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });

            Toast.fire({
                icon: type,
                title: message
            });
        }
    }
}

// Exportar instancia singleton
export const entryUIService = new EntryUIService();

// Exportación por defecto
export default EntryUIService;
