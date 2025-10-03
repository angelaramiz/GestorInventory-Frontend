/**
 * ScannerService - Servicio para operaciones de escaneo
 * 
 * Extrae la lógica de negocio relacionada con:
 * - Escaneo de códigos de barras y QR
 * - Gestión de cámara
 * - Procesamiento de resultados de escaneo
 * - Integración con html5-qrcode
 * - Validación de códigos escaneados
 * 
 * @author Angel Aramiz
 * @version 1.0.0
 */

import { BaseService } from './BaseService.js';
// NO importar logs.js - usar this.showMessage() y this.showToast() de BaseService

export class ScannerService extends BaseService {
    constructor() {
        super('ScannerService');
        this.html5QrCode = null;
        this.isScanning = false;
        this.scannerConfig = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
        };
        this.scanResults = [];
        this.lastScanTime = 0;
        this.scanCooldown = 1000; // 1 segundo entre escaneos
    }

    /**
     * Inicializar el servicio de scanner
     */
    async initialize() {
        this.log('Inicializando ScannerService');
        
        // Verificar disponibilidad de la librería
        await this.checkLibraryAvailability();
        
        // Configurar eventos
        this.setupEventListeners();
        
        this.isInitialized = true;
        this.startTime = Date.now();
        this.log('ScannerService inicializado correctamente');
    }

    // ========================================
    // OPERACIONES PRINCIPALES DE ESCANEO
    // ========================================

    /**
     * Iniciar escaneo con cámara por defecto
     * @param {string} elementId - ID del elemento HTML para mostrar la cámara
     * @param {Object} options - Opciones de escaneo
     * @returns {Promise<void>}
     */
    async startCameraScanning(elementId, options = {}) {
        return this.executeOperation(async () => {
            if (this.isScanning) {
                throw new Error('Ya hay un escaneo en curso');
            }
            
            // Verificar que el elemento existe
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Elemento ${elementId} no encontrado`);
            }
            
            // Configurar configuración de escaneo
            const config = {
                ...this.scannerConfig,
                ...options
            };
            
            // Inicializar Html5Qrcode
            this.html5QrCode = new Html5Qrcode(elementId);
            
            // Iniciar escaneo con cámara por defecto
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Usar cámara trasera por defecto
                config,
                this.onScanSuccess.bind(this),
                this.onScanFailure.bind(this)
            );
            
            this.isScanning = true;
            
            this.emit('scanningStarted', { elementId });
            
            this.log('Escaneo iniciado con cámara por defecto');
            
        }, 'startCameraScanning', {
            successMessage: 'Escaneo iniciado correctamente'
        });
    }

    /**
     * Detener escaneo actual
     * @returns {Promise<void>}
     */
    async stopScanning() {
        return this.executeOperation(async () => {
            if (!this.isScanning || !this.html5QrCode) {
                return;
            }
            
            await this.html5QrCode.stop();
            await this.html5QrCode.clear();
            
            this.isScanning = false;
            this.html5QrCode = null;
            
            this.emit('scanningStopped');
            
            this.log('Escaneo detenido');
            
        }, 'stopScanning');
    }

    /**
     * Escanear archivo de imagen
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} Resultado del escaneo
     */
    async scanFile(file) {
        return this.executeOperation(async () => {
            if (!file) {
                throw new Error('Archivo requerido');
            }
            
            // Validar tipo de archivo
            if (!file.type.startsWith('image/')) {
                throw new Error('Debe ser un archivo de imagen');
            }
            
            // Verificar tamaño
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error('El archivo es demasiado grande (máximo 10MB)');
            }
            
            // Crear instancia temporal para escaneo de archivo
            const tempScanner = new Html5Qrcode("temp-scanner");
            
            try {
                const result = await tempScanner.scanFile(file, true);
                
                // Procesar resultado
                const processedResult = await this.processRawScanResult(result);
                
                this.emit('fileScanCompleted', {
                    file: file.name,
                    result: processedResult
                });
                
                return processedResult;
                
            } finally {
                // Limpiar instancia temporal
                await tempScanner.clear();
            }
            
        }, 'scanFile', {
            successMessage: 'Archivo escaneado correctamente'
        });
    }

    // ========================================
    // PROCESAMIENTO DE RESULTADOS
    // ========================================

    /**
     * Callback para escaneo exitoso
     * @param {string} decodedText - Texto decodificado
     * @param {Object} decodedResult - Resultado completo del escaneo
     */
    async onScanSuccess(decodedText, decodedResult) {
        try {
            // Aplicar cooldown para evitar escaneos múltiples
            const now = Date.now();
            if (now - this.lastScanTime < this.scanCooldown) {
                return;
            }
            this.lastScanTime = now;
            
            // Procesar resultado
            const processedResult = await this.processRawScanResult(decodedText, decodedResult);
            
            // Guardar en historial
            this.addToScanHistory(processedResult);
            
            // Emitir evento
            this.emit('scanSuccess', processedResult);
            
            this.log(`Código escaneado: ${decodedText}`);
            
        } catch (error) {
            this.handleError(error, 'onScanSuccess');
            this.emit('scanError', {
                error: error.message,
                rawResult: decodedText
            });
        }
    }

    /**
     * Callback para fallos de escaneo
     * @param {string} error - Mensaje de error
     */
    onScanFailure(error) {
        // Los fallos de escaneo son normales cuando no hay código visible
        // Solo loguear errores importantes
        if (error && !error.includes('No QR code found')) {
            this.log(`Error de escaneo: ${error}`, 'warn');
        }
    }

    /**
     * Procesar resultado bruto de escaneo
     * @param {string} rawResult - Resultado bruto
     * @param {Object} metadata - Metadatos adicionales
     * @returns {Promise<Object>} Resultado procesado
     */
    async processRawScanResult(rawResult, metadata = {}) {
        const result = {
            raw_data: rawResult,
            timestamp: new Date().toISOString(),
            scan_type: metadata.format || 'unknown',
            processed_data: null,
            validation: null,
            product_info: null
        };
        
        // Intentar diferentes tipos de procesamiento
        result.processed_data = this.parseScannedData(rawResult);
        
        // Validar formato
        result.validation = this.validateScannedCode(rawResult);
        
        // Buscar información del producto si es un código válido
        if (result.validation.isValid) {
            result.product_info = await this.lookupProductByCode(rawResult);
        }
        
        return result;
    }

    /**
     * Parsear datos escaneados
     * @param {string} rawData - Datos brutos
     * @returns {Object} Datos parseados
     */
    parseScannedData(rawData) {
        const parsed = {
            type: 'unknown',
            code: rawData,
            data: {}
        };
        
        try {
            // Intentar parsear como JSON (códigos QR estructurados)
            const jsonData = JSON.parse(rawData);
            parsed.type = 'json';
            parsed.data = jsonData;
            
            // Si es un QR de producto generado por nuestra app
            if (jsonData.id && jsonData.codigo) {
                parsed.type = 'product_qr';
            }
            
        } catch (e) {
            // No es JSON, verificar otros formatos
            
            // Verificar si es un código de barras estándar
            if (/^[0-9]{8,14}$/.test(rawData)) {
                parsed.type = 'barcode';
                parsed.data.ean = rawData;
            }
            
            // Verificar si es un código alfanumérico
            else if (/^[A-Z0-9-]{3,20}$/.test(rawData)) {
                parsed.type = 'alphanumeric_code';
                parsed.data.code = rawData;
            }
            
            // Verificar si es una URL
            else if (rawData.startsWith('http')) {
                parsed.type = 'url';
                parsed.data.url = rawData;
            }
            
            // Verificar si es texto libre
            else {
                parsed.type = 'text';
                parsed.data.text = rawData;
            }
        }
        
        return parsed;
    }

    /**
     * Validar código escaneado
     * @param {string} code - Código a validar
     * @returns {Object} Resultado de validación
     */
    validateScannedCode(code) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: [],
            format: 'unknown'
        };
        
        if (!code || typeof code !== 'string') {
            validation.errors.push('Código vacío o inválido');
            return validation;
        }
        
        const trimmedCode = code.trim();
        
        // Validar longitud mínima
        if (trimmedCode.length < 3) {
            validation.errors.push('Código demasiado corto');
            return validation;
        }
        
        // Validar longitud máxima
        if (trimmedCode.length > 100) {
            validation.warnings.push('Código muy largo, puede no ser un código de producto');
        }
        
        // Detectar formato
        if (/^[0-9]{8,14}$/.test(trimmedCode)) {
            validation.format = 'ean';
            validation.isValid = this.validateEAN(trimmedCode);
        } else if (/^[A-Z0-9-]{3,20}$/.test(trimmedCode)) {
            validation.format = 'alphanumeric';
            validation.isValid = true;
        } else {
            validation.format = 'custom';
            validation.isValid = true;
            validation.warnings.push('Formato de código no estándar');
        }
        
        return validation;
    }

    /**
     * Validar código EAN
     * @param {string} code - Código EAN
     * @returns {boolean} true si es válido
     */
    validateEAN(code) {
        if (!/^[0-9]{8,14}$/.test(code)) {
            return false;
        }
        
        // Calcular dígito de verificación para EAN-13
        if (code.length === 13) {
            const digits = code.split('').map(Number);
            let sum = 0;
            
            for (let i = 0; i < 12; i++) {
                sum += digits[i] * (i % 2 === 0 ? 1 : 3);
            }
            
            const checkDigit = (10 - (sum % 10)) % 10;
            return checkDigit === digits[12];
        }
        
        // Para otros formatos, asumir válido
        return true;
    }

    /**
     * Buscar producto por código
     * @param {string} code - Código a buscar
     * @returns {Promise<Object|null>} Información del producto
     */
    async lookupProductByCode(code) {
        try {
            const productService = this.getService('product');
            
            // Buscar por código de barras primero
            let product = await productService.findByBarcode(code);
            
            // Si no se encuentra, buscar por código
            if (!product) {
                const products = await productService.searchByText(code, { limit: 1 });
                product = products.length > 0 ? products[0] : null;
            }
            
            return product;
            
        } catch (error) {
            this.log(`Error buscando producto por código ${code}: ${error.message}`, 'error');
            return null;
        }
    }

    // ========================================
    // HISTORIAL Y ESTADÍSTICAS
    // ========================================

    /**
     * Añadir resultado al historial
     * @param {Object} result - Resultado del escaneo
     */
    addToScanHistory(result) {
        this.scanResults.push(result);
        
        // Mantener solo los últimos 100 escaneos
        if (this.scanResults.length > 100) {
            this.scanResults.shift();
        }
        
        // Guardar en localStorage
        try {
            localStorage.setItem('scan_history', JSON.stringify(this.scanResults.slice(-50)));
        } catch (error) {
            this.log('Error guardando historial de escaneos', 'warn');
        }
    }

    /**
     * Obtener historial de escaneos
     * @param {number} limit - Límite de resultados
     * @returns {Array} Historial de escaneos
     */
    getScanHistory(limit = 50) {
        return this.scanResults.slice(-limit);
    }

    /**
     * Limpiar historial de escaneos
     */
    clearScanHistory() {
        this.scanResults = [];
        localStorage.removeItem('scan_history');
        this.log('Historial de escaneos limpiado');
    }

    /**
     * Obtener estadísticas de escaneo
     * @returns {Object} Estadísticas
     */
    getScanStatistics() {
        const stats = {
            total_scans: this.scanResults.length,
            successful_scans: this.scanResults.filter(r => r.validation?.isValid).length,
            products_found: this.scanResults.filter(r => r.product_info).length,
            scan_types: {},
            recent_activity: []
        };
        
        // Contar tipos de escaneo
        for (const result of this.scanResults) {
            const type = result.processed_data?.type || 'unknown';
            stats.scan_types[type] = (stats.scan_types[type] || 0) + 1;
        }
        
        // Actividad reciente (últimas 24 horas)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        stats.recent_activity = this.scanResults.filter(r => 
            new Date(r.timestamp) > yesterday
        );
        
        return stats;
    }

    // ========================================
    // CONFIGURACIÓN Y SETUP
    // ========================================

    /**
     * Verificar disponibilidad de la librería
     */
    async checkLibraryAvailability() {
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Librería html5-qrcode no está disponible');
        }
        
        // Verificar soporte del navegador
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('El navegador no soporta acceso a la cámara');
        }
        
        this.log('Librería html5-qrcode disponible y funcional');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Listener para cambios de visibilidad
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isScanning) {
                this.log('Página oculta, pausando escaneo');
                // Optionalmente pausar escaneo cuando la página no es visible
            }
        });
        
        // Listener para cambios de orientación
        window.addEventListener('orientationchange', () => {
            if (this.isScanning) {
                this.log('Orientación cambiada durante escaneo');
                // Optionalmente reiniciar escaneo tras cambio de orientación
            }
        });
    }

    /**
     * Actualizar configuración de escaneo
     * @param {Object} newConfig - Nueva configuración
     */
    updateScannerConfig(newConfig) {
        this.scannerConfig = {
            ...this.scannerConfig,
            ...newConfig
        };
        
        this.log('Configuración de scanner actualizada');
    }

    /**
     * Obtener servicio por nombre (placeholder)
     * @param {string} serviceName - Nombre del servicio
     * @returns {Object} Instancia del servicio
     */
    getService(serviceName) {
        // Esta implementación debe ser proporcionada por el ServiceManager
        // Por ahora es un placeholder
        return {
            findByBarcode: async () => null,
            searchByText: async () => []
        };
    }

    /**
     * Cargar historial desde localStorage
     */
    loadScanHistory() {
        try {
            const saved = localStorage.getItem('scan_history');
            if (saved) {
                this.scanResults = JSON.parse(saved);
                this.log(`${this.scanResults.length} escaneos cargados del historial`);
            }
        } catch (error) {
            this.log('Error cargando historial de escaneos', 'warn');
            this.scanResults = [];
        }
    }

    /**
     * Dispose del servicio
     */
    dispose() {
        // Detener escaneo si está activo
        if (this.isScanning) {
            this.stopScanning().catch(error => {
                this.log(`Error deteniendo escaneo: ${error.message}`, 'error');
            });
        }
        
        // Limpiar referencias
        this.html5QrCode = null;
        
        super.dispose();
    }
}
