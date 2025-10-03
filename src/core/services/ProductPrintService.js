/**
 * ProductPrintService - Servicio especializado para códigos de barras e impresión
 * 
 * Este servicio maneja la generación de códigos de barras, impresión de etiquetas,
 * y creación de PDFs para productos.
 * 
 * @class ProductPrintService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

class ProductPrintService extends BaseService {
    constructor() {
        super('ProductPrintService');
        
        // Configuración de impresión
        this.printConfig = {
            barcodeFormat: 'CODE128',
            barcodeWidth: 2,
            barcodeHeight: 100,
            labelWidth: 200,
            labelHeight: 100,
            fontSize: 12,
            margin: 5
        };

        // Cache de códigos de barras generados
        this.barcodeCache = new Map();
        
        // Estado de librerías externas
        this.librariesStatus = {
            jsBarcode: false,
            jsPDF: false
        };
        
        this.debug('ProductPrintService inicializado');
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
            this.debug('Inicializando ProductPrintService...');

            // Verificar disponibilidad de librerías
            await this.checkLibraries();
            
            // Configurar canvas para códigos de barras
            this.setupBarcodeCanvas();
            
            // Cargar configuración guardada
            await this.loadPrintConfiguration();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('ProductPrintService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar ProductPrintService:', error);
            throw error;
        }
    }

    /**
     * Verificar disponibilidad de librerías externas
     */
    async checkLibraries() {
        // Verificar JsBarcode
        if (typeof window !== 'undefined' && window.JsBarcode) {
            this.librariesStatus.jsBarcode = true;
            this.debug('JsBarcode disponible');
        } else {
            this.warn('JsBarcode no disponible - funcionalidad de códigos de barras limitada');
        }

        // Verificar jsPDF
        if (typeof window !== 'undefined' && window.jsPDF) {
            this.librariesStatus.jsPDF = true;
            this.debug('jsPDF disponible');
        } else {
            this.warn('jsPDF no disponible - funcionalidad de PDF limitada');
        }
    }

    /**
     * Configurar canvas por defecto para códigos de barras
     */
    setupBarcodeCanvas() {
        if (typeof document !== 'undefined') {
            // Crear canvas temporal si no existe
            if (!document.getElementById('temp-barcode-canvas')) {
                const canvas = document.createElement('canvas');
                canvas.id = 'temp-barcode-canvas';
                canvas.style.display = 'none';
                document.body.appendChild(canvas);
            }
        }
    }

    /**
     * Cargar configuración de impresión guardada
     */
    async loadPrintConfiguration() {
        try {
            const savedConfig = localStorage.getItem('print_configuration');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.printConfig = { ...this.printConfig, ...config };
                this.debug('Configuración de impresión cargada:', this.printConfig);
            }
        } catch (error) {
            this.warn('Error al cargar configuración de impresión:', error);
        }
    }

    /**
     * Generar código de barras para un producto
     * @param {string} codigo - Código del producto
     * @param {string} canvasId - ID del canvas donde generar el código
     * @param {Object} options - Opciones de generación
     * @returns {Promise<boolean>} True si se generó exitosamente
     */
    async generateBarcode(codigo, canvasId = 'temp-barcode-canvas', options = {}) {
        try {
            if (!this.librariesStatus.jsBarcode) {
                throw new Error('JsBarcode no está disponible');
            }

            if (!codigo) {
                throw new Error('Código requerido para generar código de barras');
            }

            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                throw new Error(`Canvas con ID '${canvasId}' no encontrado`);
            }

            const config = {
                format: options.format || this.printConfig.barcodeFormat,
                width: options.width || this.printConfig.barcodeWidth,
                height: options.height || this.printConfig.barcodeHeight,
                displayValue: options.displayValue !== false,
                fontSize: options.fontSize || this.printConfig.fontSize,
                margin: options.margin || this.printConfig.margin
            };

            // Generar código de barras
            window.JsBarcode(canvas, codigo, config);

            // Guardar en cache
            this.barcodeCache.set(codigo, {
                timestamp: Date.now(),
                config: config,
                dataURL: canvas.toDataURL()
            });

            this.debug(`Código de barras generado para: ${codigo}`);
            this.emit('barcodeGenerated', { codigo, canvasId, config });

            return true;

        } catch (error) {
            this.error('Error al generar código de barras:', error);
            throw error;
        }
    }

    /**
     * Obtener código de barras como Data URL
     * @param {string} codigo - Código del producto
     * @param {Object} options - Opciones de generación
     * @returns {Promise<string>} Data URL del código de barras
     */
    async getBarcodeDataURL(codigo, options = {}) {
        try {
            // Verificar cache primero
            if (this.barcodeCache.has(codigo)) {
                const cached = this.barcodeCache.get(codigo);
                const cacheAge = Date.now() - cached.timestamp;
                
                // Usar cache si es menor a 1 hora
                if (cacheAge < 3600000) {
                    this.debug(`Usando código de barras en cache para: ${codigo}`);
                    return cached.dataURL;
                }
            }

            // Generar nuevo código de barras
            await this.generateBarcode(codigo, 'temp-barcode-canvas', options);
            
            const canvas = document.getElementById('temp-barcode-canvas');
            return canvas.toDataURL();

        } catch (error) {
            this.error('Error al obtener Data URL del código de barras:', error);
            throw error;
        }
    }

    /**
     * Crear etiqueta de producto para impresión
     * @param {Object} producto - Datos del producto
     * @param {Object} options - Opciones de etiqueta
     * @returns {Promise<HTMLElement>} Elemento de etiqueta
     */
    async createProductLabel(producto, options = {}) {
        try {
            if (!producto || !producto.codigo) {
                throw new Error('Producto con código requerido');
            }

            const labelConfig = {
                showBarcode: options.showBarcode !== false,
                showName: options.showName !== false,
                showPrice: options.showPrice !== false,
                showCode: options.showCode !== false,
                width: options.width || this.printConfig.labelWidth,
                height: options.height || this.printConfig.labelHeight
            };

            // Crear contenedor de etiqueta
            const label = document.createElement('div');
            label.className = 'product-label print-only';
            label.style.width = `${labelConfig.width}px`;
            label.style.height = `${labelConfig.height}px`;
            label.style.border = '1px solid #000';
            label.style.padding = '5px';
            label.style.fontFamily = 'Arial, sans-serif';
            label.style.fontSize = `${this.printConfig.fontSize}px`;
            label.style.pageBreakInside = 'avoid';

            let content = '';

            // Código de barras
            if (labelConfig.showBarcode && this.librariesStatus.jsBarcode) {
                const canvasId = `label-barcode-${Date.now()}`;
                content += `<canvas id="${canvasId}" style="width: 100%; height: 60px;"></canvas>`;
            }

            // Nombre del producto
            if (labelConfig.showName && producto.nombre) {
                content += `<div style="font-weight: bold; text-align: center; margin: 2px 0;">${producto.nombre}</div>`;
            }

            // Código del producto
            if (labelConfig.showCode) {
                content += `<div style="text-align: center; font-size: 10px; margin: 2px 0;">${producto.codigo}</div>`;
            }

            // Precio
            if (labelConfig.showPrice && producto.precio) {
                const precio = typeof producto.precio === 'number' ? 
                    producto.precio.toFixed(2) : producto.precio;
                content += `<div style="text-align: center; font-weight: bold; margin: 2px 0;">$${precio}</div>`;
            }

            label.innerHTML = content;

            // Generar código de barras si está habilitado
            if (labelConfig.showBarcode && this.librariesStatus.jsBarcode) {
                setTimeout(() => {
                    const canvas = label.querySelector('canvas');
                    if (canvas) {
                        this.generateBarcode(producto.codigo, canvas.id, {
                            height: 40,
                            fontSize: 10
                        }).catch(error => {
                            this.warn('Error al generar código de barras en etiqueta:', error);
                        });
                    }
                }, 100);
            }

            this.debug(`Etiqueta creada para producto: ${producto.codigo}`);
            this.emit('labelCreated', { producto, labelConfig });

            return label;

        } catch (error) {
            this.error('Error al crear etiqueta de producto:', error);
            throw error;
        }
    }

    /**
     * Imprimir etiqueta de producto
     * @param {Object} producto - Datos del producto
     * @param {Object} options - Opciones de impresión
     * @returns {Promise<void>}
     */
    async printProductLabel(producto, options = {}) {
        try {
            const label = await this.createProductLabel(producto, options);
            
            // Crear ventana de impresión
            const printWindow = window.open('', '_blank', 'width=400,height=300');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Etiqueta - ${producto.nombre}</title>
                    <style>
                        @media print {
                            .print-only { display: block !important; }
                            body { margin: 0; padding: 10px; }
                        }
                        @media screen {
                            .print-only { display: block; }
                            body { margin: 20px; }
                        }
                    </style>
                </head>
                <body>
                    ${label.outerHTML}
                </body>
                </html>
            `);

            printWindow.document.close();

            // Esperar a que se cargue y luego imprimir
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };

            this.debug(`Impresión iniciada para producto: ${producto.codigo}`);
            this.emit('printStarted', { producto, options });

        } catch (error) {
            this.error('Error al imprimir etiqueta:', error);
            throw error;
        }
    }

    /**
     * Crear PDF con etiquetas de productos
     * @param {Array} productos - Lista de productos
     * @param {Object} options - Opciones del PDF
     * @returns {Promise<Blob>} PDF generado
     */
    async createProductLabelsPDF(productos, options = {}) {
        try {
            if (!this.librariesStatus.jsPDF) {
                throw new Error('jsPDF no está disponible');
            }

            if (!Array.isArray(productos) || productos.length === 0) {
                throw new Error('Lista de productos requerida');
            }

            const config = {
                orientation: options.orientation || 'portrait',
                unit: 'mm',
                format: options.format || 'a4',
                labelsPerRow: options.labelsPerRow || 3,
                labelsPerColumn: options.labelsPerColumn || 8,
                labelWidth: options.labelWidth || 60,
                labelHeight: options.labelHeight || 30,
                margin: options.margin || 10
            };

            const pdf = new window.jsPDF(config.orientation, config.unit, config.format);
            let currentPage = 1;
            let labelIndex = 0;

            for (let i = 0; i < productos.length; i++) {
                const producto = productos[i];
                const row = Math.floor(labelIndex / config.labelsPerRow);
                const col = labelIndex % config.labelsPerRow;

                // Calcular posición
                const x = config.margin + (col * config.labelWidth);
                const y = config.margin + (row * config.labelHeight);

                // Verificar si necesitamos nueva página
                if (row >= config.labelsPerColumn) {
                    pdf.addPage();
                    currentPage++;
                    labelIndex = 0;
                    continue;
                }

                // Agregar contenido de etiqueta
                await this.addLabelToPDF(pdf, producto, x, y, config);

                labelIndex++;
            }

            const pdfBlob = pdf.output('blob');

            this.debug(`PDF creado con ${productos.length} etiquetas en ${currentPage} página(s)`);
            this.emit('pdfCreated', { productos, config, pages: currentPage });

            return pdfBlob;

        } catch (error) {
            this.error('Error al crear PDF de etiquetas:', error);
            throw error;
        }
    }

    /**
     * Agregar etiqueta individual al PDF
     * @param {Object} pdf - Instancia de jsPDF
     * @param {Object} producto - Datos del producto
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {Object} config - Configuración
     */
    async addLabelToPDF(pdf, producto, x, y, config) {
        try {
            // Marco de la etiqueta
            pdf.rect(x, y, config.labelWidth, config.labelHeight);

            // Título del producto
            if (producto.nombre) {
                pdf.setFontSize(8);
                pdf.text(producto.nombre.substring(0, 30), x + 2, y + 5, {
                    maxWidth: config.labelWidth - 4
                });
            }

            // Código del producto
            if (producto.codigo) {
                pdf.setFontSize(6);
                pdf.text(`Código: ${producto.codigo}`, x + 2, y + config.labelHeight - 8);
            }

            // Precio
            if (producto.precio) {
                const precio = typeof producto.precio === 'number' ? 
                    producto.precio.toFixed(2) : producto.precio;
                pdf.setFontSize(10);
                pdf.text(`$${precio}`, x + config.labelWidth - 20, y + config.labelHeight - 3);
            }

            // Código de barras (simplificado para PDF)
            if (this.librariesStatus.jsBarcode && producto.codigo) {
                try {
                    const barcodeDataURL = await this.getBarcodeDataURL(producto.codigo, {
                        height: 20,
                        width: 1
                    });
                    
                    pdf.addImage(
                        barcodeDataURL, 
                        'PNG', 
                        x + 2, 
                        y + 8, 
                        config.labelWidth - 4, 
                        10
                    );
                } catch (barcodeError) {
                    this.warn('Error al agregar código de barras al PDF:', barcodeError);
                }
            }

        } catch (error) {
            this.warn('Error al agregar etiqueta individual al PDF:', error);
        }
    }

    /**
     * Configurar opciones de impresión
     * @param {Object} newConfig - Nueva configuración
     */
    configurePrint(newConfig) {
        try {
            this.printConfig = { ...this.printConfig, ...newConfig };
            
            // Guardar configuración
            localStorage.setItem('print_configuration', JSON.stringify(this.printConfig));
            
            this.debug('Configuración de impresión actualizada:', this.printConfig);
            this.emit('configUpdated', this.printConfig);

        } catch (error) {
            this.error('Error al configurar impresión:', error);
            throw error;
        }
    }

    /**
     * Limpiar cache de códigos de barras
     * @param {number} maxAge - Edad máxima en milisegundos (por defecto 1 hora)
     */
    clearBarcodeCache(maxAge = 3600000) {
        try {
            const now = Date.now();
            let cleared = 0;

            for (const [codigo, data] of this.barcodeCache.entries()) {
                if (now - data.timestamp > maxAge) {
                    this.barcodeCache.delete(codigo);
                    cleared++;
                }
            }

            this.debug(`Cache de códigos de barras limpiado: ${cleared} entradas eliminadas`);
            this.emit('cacheCleared', { cleared, remaining: this.barcodeCache.size });

        } catch (error) {
            this.error('Error al limpiar cache de códigos de barras:', error);
        }
    }

    /**
     * Obtener estadísticas del servicio
     * @returns {Object} Estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            librariesStatus: this.librariesStatus,
            printConfig: this.printConfig,
            cacheSize: this.barcodeCache.size,
            cacheEntries: Array.from(this.barcodeCache.keys())
        };
    }

    /**
     * Validar si el servicio puede funcionar
     * @returns {Object} Estado de validación
     */
    validateService() {
        const validation = {
            isValid: true,
            warnings: [],
            errors: []
        };

        // Verificar librerías
        if (!this.librariesStatus.jsBarcode) {
            validation.warnings.push('JsBarcode no disponible - funcionalidad de códigos de barras limitada');
        }

        if (!this.librariesStatus.jsPDF) {
            validation.warnings.push('jsPDF no disponible - funcionalidad de PDF limitada');
        }

        // Verificar entorno
        if (typeof document === 'undefined') {
            validation.errors.push('Entorno DOM no disponible');
            validation.isValid = false;
        }

        if (typeof window === 'undefined') {
            validation.errors.push('Entorno window no disponible');
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            // Limpiar cache
            this.barcodeCache.clear();
            
            // Remover canvas temporal
            const tempCanvas = document.getElementById('temp-barcode-canvas');
            if (tempCanvas) {
                tempCanvas.remove();
            }
            
            super.cleanup();
            this.debug('Recursos de ProductPrintService limpiados');

        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const productPrintService = new ProductPrintService();

// Auto-inicialización si es posible
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        productPrintService.initialize().catch(error => {
            console.warn('ProductPrintService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        productPrintService.initialize().catch(error => {
            console.warn('ProductPrintService auto-inicialización falló:', error.message);
        });
    }
}

export default ProductPrintService;
