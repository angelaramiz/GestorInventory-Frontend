/**
 * NotificationService - Servicio moderno de notificaciones
 * 
 * Reemplaza: js/logs.js (deprecado)
 * 
 * Funcionalidades:
 * - Alertas modales con SweetAlert2
 * - Notificaciones tipo toast/burbuja
 * - Mensajes de progreso
 * - Modales de escáner
 * 
 * @module NotificationService
 */

class NotificationService {
    constructor() {
        this.burbujaCount = 0;
        this.OFFSET_Y = 10;
        this.BURBUJA_HEIGHT = 60;
        this._inicializarEstilos();
    }

    /**
     * Muestra un mensaje modal con SweetAlert2
     * @param {string} mensaje - Texto del mensaje
     * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info', 'question'
     * @param {Object} opciones - Opciones adicionales
     */
    mostrarMensaje(mensaje, tipo = 'info', opciones = {}) {
        const iconosValidos = ['success', 'error', 'warning', 'info', 'question'];
        const icono = iconosValidos.includes(tipo) ? tipo : 'info';

        return Swal.fire({
            title: tipo.charAt(0).toUpperCase() + tipo.slice(1),
            text: mensaje,
            icon: icono,
            timer: opciones.timer || 1500,
            showConfirmButton: opciones.showConfirmButton || false,
            ...opciones
        });
    }

    /**
     * Muestra resultado de carga masiva con barra de progreso
     * @param {number} successCount - Cantidad de operaciones exitosas
     * @param {number} errorCount - Cantidad de errores
     * @param {Function} onClose - Callback al cerrar
     */
    async mostrarResultadoCarga(successCount, errorCount, onClose = null) {
        const mensaje = `Carga completada. ${successCount} productos agregados/actualizados. ${errorCount} errores.`;
        const icon = errorCount > 0 ? 'warning' : 'success';
        const totalOperaciones = successCount + errorCount;
        
        let porcentajeExito = 0;
        let progressBarHTML = '';

        if (totalOperaciones > 0) {
            porcentajeExito = Math.round((successCount / totalOperaciones) * 100);
            progressBarHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%;"></div>
                </div>
            `;
        } else {
            progressBarHTML = 'No se registraron operaciones';
        }

        const result = await Swal.fire({
            title: errorCount > 0 ? 'Advertencia' : 'Éxito',
            html: `${mensaje}${progressBarHTML}`,
            icon: icon,
            timer: 2000,
            showConfirmButton: false,
            didOpen: () => {
                if (progressBarHTML && totalOperaciones > 0) {
                    const progressBarElement = document.querySelector('.progress-bar');
                    if (progressBarElement) {
                        progressBarElement.style.transition = 'width 2s ease-in-out';
                        progressBarElement.style.width = `${porcentajeExito}%`;
                    }
                }
            },
            willClose: () => {
                if (onClose && typeof onClose === 'function') {
                    onClose();
                }
            }
        });

        return result;
    }

    /**
     * Muestra una notificación tipo burbuja/toast
     * @param {string} mensaje - Texto del mensaje
     * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info'
     */
    mostrarAlertaBurbuja(mensaje, tipo = 'info') {
        const burbujaIndex = this.burbujaCount++;

        const burbuja = document.createElement('div');
        burbuja.className = `alerta-burbuja ${tipo}`;
        burbuja.textContent = mensaje;
        burbuja.style.position = 'fixed';
        burbuja.style.right = '20px';
        burbuja.style.top = `${this.OFFSET_Y + (burbujaIndex * (this.BURBUJA_HEIGHT + 10))}px`;
        burbuja.style.zIndex = '9999';
        burbuja.style.opacity = '0';
        burbuja.style.transform = 'translateX(50px)';
        burbuja.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        document.body.appendChild(burbuja);

        // Mostrar con animación
        setTimeout(() => {
            burbuja.style.opacity = '1';
            burbuja.style.transform = 'translateX(0)';
        }, 10);

        // Ocultar después de 3 segundos
        setTimeout(() => {
            burbuja.style.opacity = '0';
            burbuja.style.transform = 'translateX(50px)';

            setTimeout(() => {
                burbuja.remove();
                this._reposicionarBurbujas();
                this.burbujaCount--;
            }, 300);
        }, 3000);
    }

    /**
     * Muestra un toast simple (alternativa ligera a burbujas)
     * @param {string} mensaje - Texto del mensaje
     * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en ms
     */
    mostrarToast(mensaje, tipo = 'info', duration = 3000) {
        return Swal.fire({
            icon: tipo,
            title: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true
        });
    }

    /**
     * Muestra un modal de confirmación
     * @param {string} mensaje - Texto del mensaje
     * @param {string} titulo - Título del modal
     * @returns {Promise<boolean>} - True si confirma, false si cancela
     */
    async confirmar(mensaje, titulo = '¿Está seguro?') {
        const result = await Swal.fire({
            title: titulo,
            text: mensaje,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            cancelButtonText: 'No',
            reverseButtons: true
        });

        return result.isConfirmed;
    }

    /**
     * Muestra un modal para entrada de texto
     * @param {string} titulo - Título del modal
     * @param {string} placeholder - Placeholder del input
     * @returns {Promise<string|null>} - Texto ingresado o null si cancela
     */
    async solicitarTexto(titulo, placeholder = '') {
        const result = await Swal.fire({
            title: titulo,
            input: 'text',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar'
        });

        return result.isConfirmed ? result.value : null;
    }

    /**
     * Muestra un modal de carga/loading
     * @param {string} mensaje - Mensaje a mostrar
     */
    mostrarLoading(mensaje = 'Cargando...') {
        Swal.fire({
            title: mensaje,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    /**
     * Cierra el modal de carga
     */
    cerrarLoading() {
        Swal.close();
    }

    /**
     * Muestra modal de escáner con cámara
     * @param {string} inputId - ID del input donde se colocará el resultado
     * @param {Function} onScan - Callback cuando se escanea un código
     */
    async mostrarModalEscaneo(inputId, onScan = null) {
        const modalHtml = `
            <div id="scanner-modal" class="scanner-modal">
                <div class="scanner-modal-content">
                    <span class="scanner-close-btn">&times;</span>
                    <h2>Escanear Código</h2>
                    <div id="scanner-container-modal">
                        <div id="reader"></div>
                    </div>
                    <div class="scanner-loader">Cargando cámara...</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('scanner-modal');
        const closeButton = document.querySelector('.scanner-close-btn');
        const loader = document.querySelector('.scanner-loader');

        // Animación de entrada
        setTimeout(() => modal.classList.add('scanner-modal-show'), 10);

        // Iniciar escáner (requiere integración con scanner service)
        setTimeout(async () => {
            try {
                // Aquí se debe integrar con BasicScannerService
                if (window.iniciarEscaneoConModal) {
                    await window.iniciarEscaneoConModal(inputId);
                }
                loader.style.display = 'none';
                
                const scannerContainer = document.getElementById('scanner-container-modal');
                if (scannerContainer) {
                    scannerContainer.style.display = 'block';
                    scannerContainer.offsetHeight; // Trigger reflow
                }
            } catch (error) {
                console.error('Error al iniciar escáner:', error);
                this.mostrarMensaje('Error al iniciar la cámara', 'error');
                this.cerrarModalEscaneo(modal);
            }
        }, 500);

        // Cerrar modal
        closeButton.onclick = () => this.cerrarModalEscaneo(modal);
        window.onclick = event => {
            if (event.target === modal) {
                this.cerrarModalEscaneo(modal);
            }
        };

        return modal;
    }

    /**
     * Cierra el modal de escáner
     * @param {HTMLElement} modal - Elemento del modal
     */
    cerrarModalEscaneo(modal) {
        if (!modal) {
            modal = document.getElementById('scanner-modal');
        }

        if (modal) {
            modal.classList.remove('scanner-modal-show');
            setTimeout(() => {
                // Detener escáner si está disponible
                if (window.detenerEscaner) {
                    window.detenerEscaner();
                }
                modal.remove();
            }, 300);
        }
    }

    /**
     * Reposiciona las burbujas activas después de eliminar una
     * @private
     */
    _reposicionarBurbujas() {
        const burbujas = document.querySelectorAll('.alerta-burbuja');
        burbujas.forEach((burbuja, index) => {
            burbuja.style.top = `${this.OFFSET_Y + (index * (this.BURBUJA_HEIGHT + 10))}px`;
        });
    }

    /**
     * Inicializa los estilos CSS necesarios
     * @private
     */
    _inicializarEstilos() {
        const styleId = 'notification-service-styles';
        
        if (document.getElementById(styleId)) {
            return; // Ya están inicializados
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Estilos para burbujas de notificación */
            .alerta-burbuja {
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: white;
                font-size: 14px;
                min-width: 200px;
                max-width: 400px;
                margin-bottom: 10px;
                z-index: 9999;
            }
            
            .alerta-burbuja.success {
                background-color: #4caf50;
            }
            
            .alerta-burbuja.error {
                background-color: #f44336;
            }
            
            .alerta-burbuja.warning {
                background-color: #ff9800;
            }
            
            .alerta-burbuja.info {
                background-color: #2196f3;
            }

            /* Estilos para modal de escáner */
            .scanner-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            }
            
            .scanner-modal-show {
                display: flex;
                opacity: 1;
            }
            
            .scanner-modal-content {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                position: relative;
                animation: fadeIn 0.5s ease-in-out;
            }
            
            .scanner-close-btn {
                position: absolute;
                right: 10px;
                top: 5px;
                font-size: 20px;
                cursor: pointer;
            }
            
            .scanner-loader {
                text-align: center;
                margin-top: 20px;
                font-size: 16px;
                color: #555;
            }

            /* Barra de progreso */
            .progress-bar-container {
                width: 100%;
                background-color: #f3f3f3;
                border-radius: 5px;
                overflow: hidden;
                margin-top: 10px;
            }
            
            .progress-bar {
                height: 10px;
                background-color: #4caf50;
                width: 0;
                transition: width 2s ease-in-out;
            }

            /* Animaciones */
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Instancia singleton
const notificationService = new NotificationService();

export default notificationService;
