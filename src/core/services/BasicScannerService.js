/**
 * BasicScannerService - Servicio básico de escáner QR/código de barras
 * 
 * Este servicio proporciona funcionalidad básica de escáner que complementa
 * el BatchScannerService para casos de uso simples y modales.
 * 
 * @class BasicScannerService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';

class BasicScannerService extends BaseService {
    constructor() {
        super('BasicScannerService');
        
        // Estado del escáner
        this.scanner = null;
        this.isScanning = false;
        this.audioContext = null;
        
        // Configuración del escáner
        this.config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            facingMode: "environment",
            audioEnabled: true,
            successTone: { frequency: 440, duration: 0.2 },
            errorTone: { frequency: 220, duration: 0.5 }
        };
        
        // Referencias a elementos DOM
        this.elements = {
            scannerContainer: null,
            scannerModal: null,
            readerElement: null,
            overlay: null
        };
        
        // Callback actual
        this.currentCallback = null;
        this.currentInputId = null;
        
        this.debug('BasicScannerService inicializado');
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            if (this.status === 'initialized') {
                this.debug('Servicio ya inicializado');
                return;
            }

            this.status = 'initializing';
            this.debug('Inicializando BasicScannerService...');

            // Verificar disponibilidad de Html5Qrcode
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Html5Qrcode no está disponible');
            }
            
            // Crear elementos UI necesarios
            this.createScannerElements();
            
            // Configurar estilos
            this.injectStyles();
            
            // Verificar permisos de cámara
            await this.checkCameraPermissions();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('BasicScannerService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar BasicScannerService:', error);
            throw error;
        }
    }

    /**
     * Verificar permisos de cámara
     */
    async checkCameraPermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            this.debug('Permisos de cámara verificados');
            return true;
        } catch (error) {
            this.warn('Permisos de cámara no disponibles:', error);
            return false;
        }
    }

    /**
     * Crear elementos del escáner
     */
    createScannerElements() {
        try {
            // Crear overlay si no existe
            if (!document.getElementById('scanner-overlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'scanner-overlay';
                overlay.innerHTML = `
                    <div class="scanner-area dark-theme-scanner-area"></div>
                    <div class="scanner-line dark-theme-scanner-line"></div>
                    <div id="scanner-ready-indicator" class="dark-theme-scanner-indicator"></div>
                `;
                document.body.appendChild(overlay);
                this.elements.overlay = overlay;
            }
            
            this.debug('Elementos del escáner creados');
            
        } catch (error) {
            this.error('Error al crear elementos del escáner:', error);
        }
    }

    /**
     * Inyectar estilos CSS
     */
    injectStyles() {
        try {
            if (document.getElementById('basic-scanner-styles')) {
                return; // Ya inyectados
            }
            
            const style = document.createElement('style');
            style.id = 'basic-scanner-styles';
            style.textContent = `
                #scanner-container {
                    position: relative;
                    width: 100%;
                    max-width: 640px;
                    margin: 0 auto;
                    overflow: hidden;
                }
                #reader {
                    width: 100% !important;
                    height: auto !important;
                    aspect-ratio: 4/3;
                }
                #reader video {
                    width: 100% !important;
                    height: auto !important;
                }
                #scanner-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }
                .scanner-area {
                    position: absolute;
                    top: 20%;
                    left: 20%;
                    width: 60%;
                    height: 60%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
                }
                .scanner-line {
                    position: absolute;
                    left: 20%;
                    width: 60%;
                    height: 2px;
                    background-color: #00ff00;
                    animation: scan 2s linear infinite;
                }
                @keyframes scan {
                    0% { top: 20%; }
                    50% { top: 80%; }
                    100% { top: 20%; }
                }
                #scanner-ready-indicator {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: red;
                    transition: background-color 0.3s ease;
                }
                #cerrarEscaner {
                    position: absolute;
                    bottom: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10;
                }
                .html5-qrcode-element {
                    display: none !important;
                }
                
                /* Estilos para modal */
                .scanner-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .scanner-modal-content {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 90%;
                    max-height: 90%;
                    position: relative;
                }
                .scanner-close-btn {
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
            `;
            
            document.head.appendChild(style);
            this.debug('Estilos CSS inyectados');
            
        } catch (error) {
            this.error('Error al inyectar estilos:', error);
        }
    }

    /**
     * Iniciar escáner básico
     * @param {string} containerId - ID del contenedor del escáner
     * @param {Object} options - Opciones adicionales
     */
    async startScanner(containerId = 'reader', options = {}) {
        try {
            if (this.isScanning) {
                this.warn('Escáner ya está activo');
                return false;
            }
            
            const config = { ...this.config, ...options };
            
            this.scanner = new Html5Qrcode(containerId);
            this.isScanning = true;
            
            await this.scanner.start(
                { facingMode: config.facingMode },
                {
                    fps: config.fps,
                    qrbox: config.qrbox,
                    aspectRatio: config.aspectRatio
                },
                (decodedText, decodedResult) => {
                    this.handleScannedCode(decodedText, decodedResult);
                },
                (error) => {
                    // Errores de escaneo continuo (normales)
                    // this.debug('Escaneo en progreso...', error);
                }
            );
            
            this.updateScannerIndicator(true);
            this.debug('Escáner básico iniciado');
            this.emit('scannerStarted', { containerId, config });
            
            return true;
            
        } catch (error) {
            this.isScanning = false;
            this.error('Error al iniciar escáner básico:', error);
            this.emit('scannerError', error);
            throw error;
        }
    }

    /**
     * Detener escáner
     */
    async stopScanner() {
        try {
            if (!this.scanner || !this.isScanning) {
                this.debug('No hay escáner activo para detener');
                return false;
            }
            
            await this.scanner.stop();
            
            // Liberar stream de cámara manualmente
            const videoElement = document.querySelector("#reader video");
            if (videoElement?.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            }
            
            this.scanner.clear();
            this.scanner = null;
            this.isScanning = false;
            this.currentCallback = null;
            this.currentInputId = null;
            
            this.updateScannerIndicator(false);
            this.debug('Escáner básico detenido');
            this.emit('scannerStopped');
            
            return true;
            
        } catch (error) {
            this.error('Error al detener escáner:', error);
            this.emit('scannerError', error);
            return false;
        }
    }

    /**
     * Iniciar escáner en modal
     * @param {string} inputId - ID del input objetivo
     * @param {Function} callback - Callback personalizado
     */
    async startModalScanner(inputId, callback = null) {
        try {
            this.currentInputId = inputId;
            this.currentCallback = callback;
            
            // Crear modal si no existe
            const modal = this.createScannerModal();
            document.body.appendChild(modal);
            
            // Iniciar escáner en el modal
            await this.startScanner('reader-modal');
            
            this.debug(`Escáner modal iniciado para input: ${inputId}`);
            this.emit('modalScannerStarted', inputId);
            
        } catch (error) {
            this.error('Error al iniciar escáner modal:', error);
            this.closeScannerModal();
        }
    }

    /**
     * Crear modal del escáner
     */
    createScannerModal() {
        const modal = document.createElement('div');
        modal.id = 'scanner-modal';
        modal.className = 'scanner-modal';
        modal.innerHTML = `
            <div class="scanner-modal-content">
                <button class="scanner-close-btn" onclick="basicScannerService.closeScannerModal()">&times;</button>
                <h3>Escanear Código</h3>
                <div id="scanner-container-modal">
                    <div id="reader-modal"></div>
                </div>
            </div>
        `;
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeScannerModal();
            }
        });
        
        return modal;
    }

    /**
     * Cerrar modal del escáner
     */
    async closeScannerModal() {
        try {
            await this.stopScanner();
            
            const modal = document.getElementById('scanner-modal');
            if (modal) {
                modal.remove();
            }
            
            this.debug('Modal del escáner cerrado');
            this.emit('modalScannerClosed');
            
        } catch (error) {
            this.error('Error al cerrar modal:', error);
        }
    }

    /**
     * Manejar código escaneado
     * @param {string} code - Código escaneado
     * @param {Object} result - Resultado del escáner
     */
    handleScannedCode(code, result) {
        try {
            // Sanitizar código
            const sanitizedCode = this.sanitizeCode(code);
            const format = result.result.format.formatName.toLowerCase();
            
            // Procesar según formato
            const processedCode = this.processCodeByFormat(sanitizedCode, format);
            
            // Reproducir sonido de éxito
            if (this.config.audioEnabled) {
                this.playSuccessTone();
            }
            
            // Actualizar input si está definido
            if (this.currentInputId) {
                const input = document.getElementById(this.currentInputId);
                if (input) {
                    input.value = processedCode;
                }
            }
            
            // Ejecutar callback personalizado
            if (this.currentCallback && typeof this.currentCallback === 'function') {
                this.currentCallback(processedCode, format, sanitizedCode);
            } else {
                // Callback por defecto
                this.executeDefaultCallback(processedCode, format);
            }
            
            // Emitir evento
            this.emit('codeScanned', {
                originalCode: code,
                sanitizedCode,
                processedCode,
                format,
                inputId: this.currentInputId
            });
            
            // Cerrar modal si está abierto
            if (document.getElementById('scanner-modal')) {
                setTimeout(() => this.closeScannerModal(), 1000);
            }
            
            this.debug(`Código procesado: ${processedCode} (formato: ${format})`);
            
        } catch (error) {
            this.error('Error al manejar código escaneado:', error);
            this.playErrorTone();
        }
    }

    /**
     * Sanitizar código
     * @param {string} code - Código a sanitizar
     * @returns {string} Código sanitizado
     */
    sanitizeCode(code) {
        if (typeof code !== 'string') {
            return String(code);
        }
        
        // Remover caracteres especiales peligrosos
        return code.replace(/[<>\"'&]/g, '').trim();
    }

    /**
     * Procesar código según formato
     * @param {string} code - Código sanitizado
     * @param {string} format - Formato del código
     * @returns {string} Código procesado
     */
    processCodeByFormat(code, format) {
        try {
            if (format === 'code_128') {
                return this.processCODE128(code);
            }
            
            // Para otros formatos, devolver el código sanitizado
            return code;
            
        } catch (error) {
            this.warn('Error al procesar código por formato:', error);
            return code;
        }
    }

    /**
     * Procesar código CODE128
     * @param {string} code - Código CODE128
     * @returns {string} Código procesado
     */
    processCODE128(code) {
        try {
            // Eliminar ceros iniciales
            const cleanCode = code.replace(/^0+/, '');
            
            // Expresión regular para capturar los 4 dígitos después del primer "2"
            const regex = /2(\d{4})/;
            const match = cleanCode.match(regex);
            
            if (match) {
                const extractedCode = match[1];
                this.debug(`Código CODE128 extraído: ${extractedCode}`);
                return extractedCode;
            }
            
            this.warn('No se encontraron 4 dígitos después del primer "2" en CODE128');
            return code;
            
        } catch (error) {
            this.error('Error al procesar CODE128:', error);
            return code;
        }
    }

    /**
     * Ejecutar callback por defecto según el input
     * @param {string} code - Código procesado
     * @param {string} format - Formato del código
     */
    async executeDefaultCallback(code, format) {
        try {
            const inputId = this.currentInputId;
            
            // Importar funciones dinámicamente para evitar dependencias circulares
            if (inputId === "codigoConsulta") {
                const { buscarProducto } = await import('../../js/product-operations-bridge.js');
                buscarProducto(code, format);
            } else if (inputId === "codigoEditar") {
                const { buscarProductoParaEditar } = await import('../../js/product-operations-bridge.js');
                buscarProductoParaEditar(code, format);
            } else if (inputId === "codigo") {
                const { buscarProductoInventario } = await import('../../js/product-operations-bridge.js');
                buscarProductoInventario(code, format);
            }
            
        } catch (error) {
            this.warn('Error al ejecutar callback por defecto:', error);
        }
    }

    /**
     * Actualizar indicador del escáner
     * @param {boolean} active - Si el escáner está activo
     */
    updateScannerIndicator(active) {
        try {
            const indicator = document.getElementById('scanner-ready-indicator');
            if (indicator) {
                indicator.style.backgroundColor = active ? '#00ff00' : '#ff0000';
            }
        } catch (error) {
            this.warn('Error al actualizar indicador:', error);
        }
    }

    /**
     * Reproducir tono de éxito
     */
    playSuccessTone() {
        try {
            if (!this.config.audioEnabled) return;
            
            const { frequency, duration } = this.config.successTone;
            this.playTone(frequency, duration);
            
        } catch (error) {
            this.warn('Error al reproducir tono de éxito:', error);
        }
    }

    /**
     * Reproducir tono de error
     */
    playErrorTone() {
        try {
            if (!this.config.audioEnabled) return;
            
            const { frequency, duration } = this.config.errorTone;
            this.playTone(frequency, duration);
            
        } catch (error) {
            this.warn('Error al reproducir tono de error:', error);
        }
    }

    /**
     * Reproducir tono
     * @param {number} frequency - Frecuencia en Hz
     * @param {number} duration - Duración en segundos
     * @param {string} type - Tipo de onda
     */
    playTone(frequency, duration, type = 'sine') {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration - 0.01);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
            
        } catch (error) {
            this.warn('Error al reproducir tono:', error);
        }
    }

    /**
     * Configurar escáner
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        try {
            this.config = { ...this.config, ...newConfig };
            this.debug('Configuración del escáner actualizada');
            this.emit('configUpdated', this.config);
        } catch (error) {
            this.error('Error al actualizar configuración:', error);
        }
    }

    /**
     * Obtener configuración actual
     * @returns {Object} Configuración del escáner
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Obtener estado del escáner
     * @returns {Object} Estado actual
     */
    getScannerState() {
        return {
            isScanning: this.isScanning,
            hasScanner: !!this.scanner,
            currentInputId: this.currentInputId,
            hasCallback: !!this.currentCallback
        };
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            scannerStats: {
                isScanning: this.isScanning,
                hasAudioContext: !!this.audioContext,
                currentInput: this.currentInputId,
                configuration: this.config
            }
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            this.stopScanner();
            
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            // Remover elementos creados
            const overlay = document.getElementById('scanner-overlay');
            if (overlay) overlay.remove();
            
            const modal = document.getElementById('scanner-modal');
            if (modal) modal.remove();
            
            const styles = document.getElementById('basic-scanner-styles');
            if (styles) styles.remove();
            
            this.elements = {};
            this.currentCallback = null;
            this.currentInputId = null;
            
            super.cleanup();
            this.debug('Recursos de BasicScannerService limpiados');
            
        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const basicScannerService = new BasicScannerService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        basicScannerService.initialize().catch(error => {
            console.warn('BasicScannerService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        basicScannerService.initialize().catch(error => {
            console.warn('BasicScannerService auto-inicialización falló:', error.message);
        });
    }
}

export default BasicScannerService;
