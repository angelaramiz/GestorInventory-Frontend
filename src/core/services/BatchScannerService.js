/**
 * BatchScannerService - Servicio especializado para escaneo de lotes avanzado
 * 
 * Este servicio maneja el escáner QR/código de barras para lotes,
 * procesamiento de códigos CODE128, y gestión de productos por peso.
 * 
 * @class BatchScannerService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

class BatchScannerService extends BaseService {
    constructor() {
        super('BatchScannerService');
        
        // Estado del escáner
        this.scanner = null;
        this.isActive = false;
        this.isTransitioning = false;
        
        // Control de debounce
        this.lastScannedCode = null;
        this.lastScanTime = 0;
        this.debounceTime = 5000; // 5 segundos
        
        // Configuración del escáner
        this.scannerConfig = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
        };
        
        // Configuración de procesamiento
        this.processingConfig = {
            confirmarProductosSimilares: false,
            agruparAutomaticamente: true,
            sonidoConfirmacion: true,
            precioKiloTemporal: 100.00
        };
        
        // Regex para CODE128
        this.code128Regex = /^2(\d{4})(\d{6})(\d{2})(\d+)$/;
        
        this.debug('BatchScannerService inicializado');
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
            this.debug('Inicializando BatchScannerService...');

            // Verificar disponibilidad de Html5Qrcode
            await this.checkScannerLibrary();
            
            // Cargar configuración guardada
            await this.loadConfiguration();
            
            // Configurar audio context para sonidos
            this.setupAudioContext();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('BatchScannerService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar BatchScannerService:', error);
            throw error;
        }
    }

    /**
     * Verificar disponibilidad de la librería Html5Qrcode
     */
    async checkScannerLibrary() {
        if (typeof window !== 'undefined' && window.Html5Qrcode) {
            this.debug('Html5Qrcode disponible');
            return true;
        } else {
            this.warn('Html5Qrcode no disponible - funcionalidad de escáner limitada');
            return false;
        }
    }

    /**
     * Configurar contexto de audio para sonidos
     */
    setupAudioContext() {
        try {
            if (typeof window !== 'undefined') {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.debug('Contexto de audio configurado');
            }
        } catch (error) {
            this.warn('No se pudo configurar contexto de audio:', error);
        }
    }

    /**
     * Cargar configuración guardada
     */
    async loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('batch_scanner_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.processingConfig = { ...this.processingConfig, ...config };
                this.debug('Configuración cargada:', this.processingConfig);
            }
        } catch (error) {
            this.warn('Error al cargar configuración:', error);
        }
    }

    /**
     * Guardar configuración
     */
    async saveConfiguration() {
        try {
            localStorage.setItem('batch_scanner_config', JSON.stringify(this.processingConfig));
            this.debug('Configuración guardada');
            this.emit('configurationSaved', this.processingConfig);
        } catch (error) {
            this.error('Error al guardar configuración:', error);
        }
    }

    /**
     * Actualizar configuración del escáner
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfiguration(newConfig) {
        this.processingConfig = { ...this.processingConfig, ...newConfig };
        this.saveConfiguration();
        this.emit('configurationUpdated', this.processingConfig);
    }

    /**
     * Inicializar escáner en un elemento DOM
     * @param {string} elementId - ID del elemento contenedor
     * @returns {Promise<boolean>} True si se inicializó exitosamente
     */
    async initializeScanner(elementId) {
        try {
            if (!window.Html5Qrcode) {
                throw new Error('Html5Qrcode no está disponible');
            }

            if (this.scanner) {
                await this.stopScanner();
            }

            this.scanner = new window.Html5Qrcode(elementId);
            
            this.debug(`Escáner inicializado en elemento: ${elementId}`);
            this.emit('scannerInitialized', { elementId });
            
            return true;

        } catch (error) {
            this.error('Error al inicializar escáner:', error);
            throw error;
        }
    }

    /**
     * Iniciar escaneo
     * @param {Object} config - Configuración del escáner (opcional)
     * @returns {Promise<boolean>} True si se inició exitosamente
     */
    async startScanning(config = {}) {
        try {
            if (!this.scanner) {
                throw new Error('Escáner no inicializado');
            }

            if (this.isActive) {
                this.debug('Escáner ya está activo');
                return true;
            }

            const scanConfig = { ...this.scannerConfig, ...config };

            await this.scanner.start(
                { facingMode: "environment" },
                scanConfig,
                (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
                (error) => this.onScanError(error)
            );

            this.isActive = true;
            this.clearDebounce();
            
            this.debug('Escaneo iniciado');
            this.emit('scanningStarted', scanConfig);
            
            return true;

        } catch (error) {
            this.error('Error al iniciar escaneo:', error);
            throw error;
        }
    }

    /**
     * Pausar escaneo
     */
    async pauseScanning() {
        try {
            if (!this.scanner || !this.isActive) {
                this.debug('Escáner no está activo');
                return;
            }

            await this.scanner.pause();
            this.isActive = false;
            
            this.debug('Escaneo pausado');
            this.emit('scanningPaused');

        } catch (error) {
            this.error('Error al pausar escaneo:', error);
            throw error;
        }
    }

    /**
     * Reanudar escaneo
     */
    async resumeScanning() {
        try {
            if (!this.scanner) {
                throw new Error('Escáner no inicializado');
            }

            if (this.isActive) {
                this.debug('Escáner ya está activo');
                return;
            }

            await this.scanner.resume();
            this.isActive = true;
            
            this.debug('Escaneo reanudado');
            this.emit('scanningResumed');

        } catch (error) {
            this.error('Error al reanudar escaneo:', error);
            throw error;
        }
    }

    /**
     * Detener escáner completamente
     */
    async stopScanner() {
        try {
            if (this.scanner) {
                if (this.isActive) {
                    await this.scanner.stop();
                }
                this.scanner.clear();
                this.scanner = null;
            }
            
            this.isActive = false;
            this.clearDebounce();
            
            this.debug('Escáner detenido');
            this.emit('scannerStopped');

        } catch (error) {
            this.error('Error al detener escáner:', error);
            throw error;
        }
    }

    /**
     * Manejar escaneo exitoso
     * @param {string} decodedText - Texto decodificado
     * @param {Object} decodedResult - Resultado del escaneo
     */
    async onScanSuccess(decodedText, decodedResult) {
        try {
            this.debug(`Código escaneado: ${decodedText}`);

            // Verificar debounce
            if (this.isDuplicateScan(decodedText)) {
                this.debug('Código duplicado ignorado por debounce');
                return;
            }

            // Actualizar debounce
            this.updateDebounce(decodedText);

            // Reproducir sonido si está habilitado
            if (this.processingConfig.sonidoConfirmacion) {
                this.playConfirmationSound();
            }

            // Procesar código escaneado
            await this.processScannedCode(decodedText, decodedResult);

        } catch (error) {
            this.error('Error al procesar código escaneado:', error);
            this.emit('scanError', { code: decodedText, error: error.message });
        }
    }

    /**
     * Manejar error de escaneo
     * @param {Error} error - Error del escáner
     */
    onScanError(error) {
        // Los errores de escaneo son normales durante el proceso
        // Solo logear errores importantes
        if (error.toString().includes('No MultiFormat Readers')) {
            return; // Ignorar este error común
        }
        
        this.debug(`Error de escaneo: ${error}`);
    }

    /**
     * Procesar código escaneado
     * @param {string} code - Código escaneado
     * @param {Object} scanResult - Resultado del escaneo
     */
    async processScannedCode(code, scanResult) {
        try {
            this.debug(`Procesando código: ${code}`);

            // Sanitizar código
            const sanitizedCode = this.sanitizeInput(code);

            // Intentar extraer datos CODE128
            const extractedData = this.extractCODE128Data(sanitizedCode);

            if (extractedData) {
                this.debug('Datos CODE128 extraídos:', extractedData);
                this.emit('code128Processed', { 
                    originalCode: code,
                    sanitizedCode,
                    extractedData,
                    scanResult 
                });
            } else {
                // Código regular (no CODE128)
                this.debug('Código regular detectado');
                this.emit('regularCodeProcessed', { 
                    code: sanitizedCode,
                    scanResult 
                });
            }

        } catch (error) {
            this.error('Error al procesar código:', error);
            this.emit('processingError', { code, error: error.message });
        }
    }

    /**
     * Extraer datos de código CODE128
     * @param {string} code - Código a procesar
     * @returns {Object|null} Datos extraídos o null si no es CODE128
     */
    extractCODE128Data(code) {
        try {
            // Eliminar ceros a la izquierda
            const cleanCode = code.replace(/^0+/, '');
            
            // Aplicar regex
            const match = cleanCode.match(this.code128Regex);
            
            if (!match) {
                return null;
            }

            const plu = match[1];                    // PLU de 4 dígitos
            const pesosStr = match[2];               // Pesos de 6 dígitos
            const centavosStr = match[3];            // Centavos de 2 dígitos
            const digitoControl = match[4];          // Dígito de control

            // Convertir a números
            const pesos = parseInt(pesosStr, 10);
            const centavos = parseInt(centavosStr, 10);
            
            // Calcular precio por porción
            const precioPorcion = pesos + (centavos / 100);
            
            // Calcular peso temporal
            const pesoTemporal = precioPorcion / this.processingConfig.precioKiloTemporal;

            const extractedData = {
                plu,
                precioPorcion,
                pesoTemporal,
                centavos,
                digitoControl,
                originalCode: code,
                cleanCode
            };

            this.debug('Datos CODE128 extraídos:', extractedData);
            return extractedData;

        } catch (error) {
            this.error('Error al extraer datos CODE128:', error);
            return null;
        }
    }

    /**
     * Verificar si es un escaneo duplicado
     * @param {string} code - Código escaneado
     * @returns {boolean} True si es duplicado
     */
    isDuplicateScan(code) {
        if (!this.lastScannedCode || !this.lastScanTime) {
            return false;
        }

        const now = Date.now();
        const timeDiff = now - this.lastScanTime;

        return code === this.lastScannedCode && timeDiff < this.debounceTime;
    }

    /**
     * Actualizar datos de debounce
     * @param {string} code - Código escaneado
     */
    updateDebounce(code) {
        this.lastScannedCode = code;
        this.lastScanTime = Date.now();
    }

    /**
     * Limpiar debounce
     */
    clearDebounce() {
        this.lastScannedCode = null;
        this.lastScanTime = 0;
        this.debug('Debounce limpiado');
    }

    /**
     * Reproducir sonido de confirmación
     */
    playConfirmationSound() {
        try {
            if (!this.audioContext) {
                return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);

        } catch (error) {
            this.debug('No se pudo reproducir sonido:', error);
        }
    }

    /**
     * Sanitizar entrada de texto
     * @param {string} input - Texto de entrada
     * @returns {string} Texto sanitizado
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }
        return input.trim();
    }

    /**
     * Mostrar animación de procesamiento en el escáner
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de animación (processing, success, error)
     */
    showProcessingAnimation(message, type = 'processing') {
        try {
            const reader = document.querySelector('#qr-reader');
            if (!reader) return;

            let overlay = document.getElementById('processingOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'processingOverlay';
                overlay.className = 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10';
                reader.style.position = 'relative';
                reader.appendChild(overlay);
            }

            let iconHTML = '';
            let colorClass = '';

            switch (type) {
                case 'processing':
                    iconHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>';
                    colorClass = 'bg-blue-500';
                    break;
                case 'success':
                    iconHTML = '<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                    colorClass = 'bg-green-500';
                    break;
                case 'error':
                    iconHTML = '<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
                    colorClass = 'bg-red-500';
                    break;
            }

            overlay.innerHTML = `
                <div class="${colorClass} text-white p-4 rounded-lg flex items-center space-x-3">
                    ${iconHTML}
                    <span class="font-semibold">${message}</span>
                </div>
            `;

            overlay.style.display = 'flex';
            
            this.emit('animationShown', { message, type });

        } catch (error) {
            this.error('Error al mostrar animación:', error);
        }
    }

    /**
     * Ocultar animación de procesamiento
     */
    hideProcessingAnimation() {
        try {
            const overlay = document.getElementById('processingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
            
            this.emit('animationHidden');

        } catch (error) {
            this.error('Error al ocultar animación:', error);
        }
    }

    /**
     * Obtener estado del escáner
     * @returns {Object} Estado actual del escáner
     */
    getScannerState() {
        return {
            isInitialized: !!this.scanner,
            isActive: this.isActive,
            isTransitioning: this.isTransitioning,
            configuration: this.processingConfig,
            lastScannedCode: this.lastScannedCode,
            lastScanTime: this.lastScanTime
        };
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            scannerState: this.getScannerState(),
            debounceTime: this.debounceTime,
            audioContextAvailable: !!this.audioContext,
            html5QrcodeAvailable: typeof window !== 'undefined' && !!window.Html5Qrcode
        };
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            // Detener escáner
            if (this.scanner) {
                this.stopScanner().catch(error => {
                    this.warn('Error al detener escáner durante cleanup:', error);
                });
            }

            // Limpiar audio context
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close().catch(error => {
                    this.warn('Error al cerrar audio context:', error);
                });
            }

            // Limpiar debounce
            this.clearDebounce();

            // Ocultar animaciones
            this.hideProcessingAnimation();

            super.cleanup();
            this.debug('Recursos de BatchScannerService limpiados');

        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const batchScannerService = new BatchScannerService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        batchScannerService.initialize().catch(error => {
            console.warn('BatchScannerService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        batchScannerService.initialize().catch(error => {
            console.warn('BatchScannerService auto-inicialización falló:', error.message);
        });
    }
}

export default BatchScannerService;
