/**
 * FileOperationsService - Servicio para operaciones con archivos
 * 
 * Migra la funcionalidad de importación/exportación de db-operations.js:
 * - Carga y descarga de CSV
 * - Generación de PDF
 * - Backup y restore de datos
 * - Operaciones de importación masiva
 * 
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';
import { mostrarMensaje, mostrarResultadoCarga, mostrarAlertaBurbuja } from '../../../js/logs.js';
import { sanitizarProducto } from '../../../js/sanitizacion.js';

export class FileOperationsService extends BaseService {
    constructor() {
        super('FileOperationsService');
        
        // Configuración de archivos
        this.supportedFormats = ['csv', 'json', 'pdf'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        
        // Referencias a servicios necesarios
        this.databaseService = null;
        this.productRepository = null;
        this.inventoryRepository = null;
    }

    /**
     * Inicializar el servicio
     */
    async initialize() {
        try {
            // Importar servicios necesarios dinámicamente
            const { databaseService } = await import('./DatabaseService.js');
            const { ProductRepository } = await import('../repositories/ProductRepository.js');
            const { InventoryRepository } = await import('../repositories/InventoryRepository.js');
            
            this.databaseService = databaseService;
            this.productRepository = new ProductRepository();
            this.inventoryRepository = new InventoryRepository();
            
            this.status = 'initialized';
            this.emit('initialized', { service: this.name });
            
        } catch (error) {
            this.handleError('Error al inicializar FileOperationsService', error);
            throw error;
        }
    }

    /**
     * Cargar archivo CSV de productos
     */
    async loadProductsCSV(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No se proporcionó archivo'));
                return;
            }

            if (file.size > this.maxFileSize) {
                reject(new Error('El archivo excede el tamaño máximo permitido'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const products = this.parseCSV(csv);
                    
                    mostrarResultadoCarga(`Leyendo archivo: ${file.name}`);
                    
                    const processedProducts = await this.processProductsFromCSV(products);
                    
                    this.emit('csvLoaded', { 
                        fileName: file.name, 
                        productCount: processedProducts.length 
                    });
                    
                    resolve(processedProducts);
                    
                } catch (error) {
                    this.handleError('Error al procesar CSV', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                const error = new Error('Error al leer el archivo');
                this.handleError('Error de lectura de archivo', error);
                reject(error);
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Parsear contenido CSV
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            throw new Error('El archivo CSV está vacío');
        }

        // Obtener headers
        const headers = lines[0].split(',').map(header => 
            header.trim().replace(/"/g, '').toLowerCase()
        );

        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => 
                value.trim().replace(/"/g, '')
            );
            
            if (values.length !== headers.length) {
                console.warn(`Línea ${i + 1} ignorada: número incorrecto de columnas`);
                continue;
            }
            
            const product = {};
            headers.forEach((header, index) => {
                product[header] = values[index];
            });
            
            products.push(product);
        }
        
        return products;
    }

    /**
     * Procesar productos desde CSV
     */
    async processProductsFromCSV(rawProducts) {
        const processedProducts = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rawProducts.length; i++) {
            try {
                const rawProduct = rawProducts[i];
                
                // Mapear campos del CSV a estructura del producto
                const product = this.mapCSVToProduct(rawProduct);
                
                // Sanitizar producto
                const sanitizedProduct = sanitizarProducto(product);
                
                // Validar producto usando el modelo
                const { Product } = await import('../models/Product.js');
                const productModel = new Product(sanitizedProduct);
                
                if (!productModel.validate()) {
                    throw new Error(`Producto inválido: ${JSON.stringify(productModel.getErrors())}`);
                }
                
                // Guardar en base de datos local
                await this.productRepository.create(productModel.toJSON());
                
                processedProducts.push(productModel.toJSON());
                successCount++;
                
                // Mostrar progreso cada 10 productos
                if (i % 10 === 0) {
                    mostrarResultadoCarga(`Procesando: ${i + 1}/${rawProducts.length} productos`);
                }
                
            } catch (error) {
                console.error(`Error procesando producto ${i + 1}:`, error);
                errorCount++;
            }
        }

        // Mostrar resultado final
        const message = `Importación completada: ${successCount} éxitos, ${errorCount} errores`;
        if (errorCount > 0) {
            mostrarAlertaBurbuja(message, "warning");
        } else {
            mostrarAlertaBurbuja(message, "success");
        }

        return processedProducts;
    }

    /**
     * Mapear campos CSV a estructura de producto
     */
    mapCSVToProduct(csvProduct) {
        return {
            codigo: csvProduct.codigo || csvProduct.sku || csvProduct.id || '',
            nombre: csvProduct.nombre || csvProduct.name || csvProduct.producto || '',
            categoria: csvProduct.categoria || csvProduct.category || '',
            marca: csvProduct.marca || csvProduct.brand || '',
            unidad: csvProduct.unidad || csvProduct.unit || 'unidad',
            precio: parseFloat(csvProduct.precio || csvProduct.price || 0),
            costo: parseFloat(csvProduct.costo || csvProduct.cost || 0),
            descripcion: csvProduct.descripcion || csvProduct.description || '',
            proveedor: csvProduct.proveedor || csvProduct.supplier || '',
            ubicacion: csvProduct.ubicacion || csvProduct.location || '',
            stock: parseInt(csvProduct.stock || csvProduct.cantidad || 0, 10),
            stockMinimo: parseInt(csvProduct.stockminimo || csvProduct.minstock || 0, 10),
            codigoBarras: csvProduct.codigobarras || csvProduct.barcode || '',
            activo: csvProduct.activo !== '0' && csvProduct.activo !== 'false'
        };
    }

    /**
     * Descargar productos como CSV
     */
    async downloadProductsCSV() {
        try {
            const products = await this.productRepository.findAll();
            
            if (products.length === 0) {
                mostrarAlertaBurbuja("No hay productos para exportar", "info");
                return;
            }

            const csvContent = this.generateProductsCSV(products);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.emit('csvDownloaded', { 
                type: 'products', 
                count: products.length 
            });
            
            mostrarAlertaBurbuja(`${products.length} productos exportados`, "success");
            
        } catch (error) {
            this.handleError('Error al descargar CSV de productos', error);
        }
    }

    /**
     * Descargar inventario como CSV
     */
    async downloadInventoryCSV() {
        try {
            const inventory = await this.inventoryRepository.findAll();
            
            if (inventory.length === 0) {
                mostrarAlertaBurbuja("No hay datos de inventario para exportar", "info");
                return;
            }

            const csvContent = this.generateInventoryCSV(inventory);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.emit('csvDownloaded', { 
                type: 'inventory', 
                count: inventory.length 
            });
            
            mostrarAlertaBurbuja(`${inventory.length} items de inventario exportados`, "success");
            
        } catch (error) {
            this.handleError('Error al descargar CSV de inventario', error);
        }
    }

    /**
     * Generar contenido CSV de productos
     */
    generateProductsCSV(products) {
        const headers = [
            'codigo', 'nombre', 'categoria', 'marca', 'unidad',
            'precio', 'costo', 'descripcion', 'proveedor', 'ubicacion',
            'stock', 'stockMinimo', 'codigoBarras', 'activo',
            'fechaCreacion', 'fechaActualizacion'
        ];

        let csv = headers.join(',') + '\n';
        
        products.forEach(product => {
            const row = headers.map(header => {
                let value = product[header] || '';
                
                // Escapar comillas y comas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                
                return value;
            });
            
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generar contenido CSV de inventario
     */
    generateInventoryCSV(inventory) {
        const headers = [
            'codigo', 'cantidad', 'cantidadAnterior', 'fechaActualizacion',
            'usuario', 'observaciones', 'tipoMovimiento'
        ];

        let csv = headers.join(',') + '\n';
        
        inventory.forEach(item => {
            const row = headers.map(header => {
                let value = item[header] || '';
                
                // Escapar comillas y comas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                
                return value;
            });
            
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generar PDF de inventario
     */
    async downloadInventoryPDF(options = {}) {
        try {
            // Verificar si jsPDF está disponible
            if (typeof window.jsPDF === 'undefined') {
                throw new Error('jsPDF no está disponible');
            }

            const inventory = await this.inventoryRepository.findAll();
            
            if (inventory.length === 0) {
                mostrarAlertaBurbuja("No hay datos de inventario para exportar", "info");
                return;
            }

            await this.generatePDFWithOptions({
                data: inventory,
                title: 'Reporte de Inventario',
                filename: `inventario_${new Date().toISOString().split('T')[0]}.pdf`,
                ...options
            });
            
            this.emit('pdfDownloaded', { 
                type: 'inventory', 
                count: inventory.length 
            });
            
        } catch (error) {
            this.handleError('Error al generar PDF de inventario', error);
        }
    }

    /**
     * Generar PDF con opciones
     */
    async generatePDFWithOptions(options) {
        const {
            data,
            title = 'Reporte',
            filename = 'reporte.pdf',
            includeFilters = false,
            includeStats = true,
            sortBy = null
        } = options;

        // Filtrar y ordenar datos si es necesario
        let processedData = [...data];
        
        if (sortBy) {
            processedData = this.sortInventoryData(processedData, sortBy);
        }

        // Crear documento PDF
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        // Configurar fuente
        doc.setFontSize(16);
        doc.text(title, 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 30);
        
        if (includeStats) {
            this.addStatsToPDF(doc, processedData, 40);
        }

        // Agregar tabla de datos
        const startY = includeStats ? 70 : 50;
        this.addTableToPDF(doc, processedData, startY);

        // Descargar PDF
        doc.save(filename);
        
        mostrarAlertaBurbuja(`PDF generado: ${filename}`, "success");
    }

    /**
     * Agregar estadísticas al PDF
     */
    addStatsToPDF(doc, data, startY) {
        const totalItems = data.length;
        const totalQuantity = data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
        const lowStockItems = data.filter(item => 
            item.cantidad <= (item.stockMinimo || 0)
        ).length;

        doc.setFontSize(12);
        doc.text('Estadísticas:', 20, startY);
        
        doc.setFontSize(10);
        doc.text(`Total de productos: ${totalItems}`, 30, startY + 10);
        doc.text(`Cantidad total en stock: ${totalQuantity}`, 30, startY + 20);
        doc.text(`Productos con stock bajo: ${lowStockItems}`, 30, startY + 30);
    }

    /**
     * Agregar tabla al PDF
     */
    addTableToPDF(doc, data, startY) {
        const headers = ['Código', 'Cantidad', 'Fecha', 'Observaciones'];
        const cellWidth = 40;
        const cellHeight = 8;
        
        // Headers
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, index) => {
            doc.text(header, 20 + (index * cellWidth), startY);
        });
        
        // Datos
        doc.setFont(undefined, 'normal');
        let currentY = startY + cellHeight;
        
        data.slice(0, 30).forEach(item => { // Limitar a 30 items por página
            const row = [
                item.codigo || '',
                (item.cantidad || 0).toString(),
                item.fechaActualizacion ? 
                    new Date(item.fechaActualizacion).toLocaleDateString() : '',
                (item.observaciones || '').substring(0, 15) + '...'
            ];
            
            row.forEach((cell, index) => {
                doc.text(cell, 20 + (index * cellWidth), currentY);
            });
            
            currentY += cellHeight;
            
            // Nueva página si es necesario
            if (currentY > 280) {
                doc.addPage();
                currentY = 20;
            }
        });
    }

    /**
     * Ordenar datos de inventario
     */
    sortInventoryData(data, sortBy) {
        const sortOptions = {
            'codigo': (a, b) => (a.codigo || '').localeCompare(b.codigo || ''),
            'cantidad': (a, b) => (b.cantidad || 0) - (a.cantidad || 0),
            'fecha': (a, b) => new Date(b.fechaActualizacion || 0) - new Date(a.fechaActualizacion || 0)
        };

        const sortFunction = sortOptions[sortBy];
        return sortFunction ? data.sort(sortFunction) : data;
    }

    /**
     * Validar archivo antes de procesar
     */
    validateFile(file, expectedType = 'csv') {
        if (!file) {
            throw new Error('No se proporcionó archivo');
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`El archivo excede el tamaño máximo permitido (${this.maxFileSize / 1024 / 1024}MB)`);
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(fileExtension)) {
            throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
        }

        if (expectedType && fileExtension !== expectedType) {
            throw new Error(`Se esperaba un archivo ${expectedType}, pero se recibió ${fileExtension}`);
        }

        return true;
    }
}

// Crear instancia singleton
export const fileOperationsService = new FileOperationsService();

// Backwards compatibility exports
export const cargarCSV = (event) => {
    const file = event.target.files[0];
    return fileOperationsService.loadProductsCSV(file);
};

export const descargarCSV = () => fileOperationsService.downloadProductsCSV();
export const descargarInventarioCSV = () => fileOperationsService.downloadInventoryCSV();
export const descargarInventarioPDF = (options) => fileOperationsService.downloadInventoryPDF(options);
