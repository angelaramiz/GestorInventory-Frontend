/**
 * Utilidades específicas para la optimización de tablas móviles
 * Convierte automáticamente las tablas en vista de tarjetas en dispositivos móviles
 */

class TableMobileOptimizer {
    constructor() {
        this.tables = new Map();
        this.isMobile = window.innerWidth <= 640;
        this.init();
    }

    init() {
        // Observar cambios en el DOM para nuevas tablas
        this.setupMutationObserver();
        
        // Optimizar tablas existentes
        this.optimizeExistingTables();
        
        // Escuchar eventos del mobile optimizer principal
        document.addEventListener('mobileOptimizer:deviceTypeChanged', (e) => {
            this.isMobile = e.detail.isMobile;
            this.refreshAllTables();
        });

            }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Buscar nuevas tablas
                    const newTables = Array.from(mutation.addedNodes)
                        .filter(node => node.nodeType === Node.ELEMENT_NODE)
                        .flatMap(node => [
                            ...(node.matches && node.matches('table') ? [node] : []),
                            ...Array.from(node.querySelectorAll ? node.querySelectorAll('table') : [])
                        ]);
                    
                    newTables.forEach(table => this.optimizeTable(table));
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    optimizeExistingTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => this.optimizeTable(table));
    }

    optimizeTable(table) {
        if (this.tables.has(table)) return;

        const tableConfig = this.analyzeTable(table);
        this.tables.set(table, tableConfig);

        if (this.isMobile) {
            this.createMobileView(table, tableConfig);
        }
    }

    analyzeTable(table) {
        const headers = Array.from(table.querySelectorAll('thead th, thead td')).map((header, index) => ({
            index,
            text: this.cleanHeaderText(header.textContent),
            icon: this.extractHeaderIcon(header),
            type: this.detectColumnType(table, index),
            priority: this.getColumnPriority(header, index)
        }));

        const hasActions = headers.some(h => 
            h.text.toLowerCase().includes('accion') || 
            h.text.toLowerCase().includes('action') ||
            h.text.toLowerCase().includes('⚙️')
        );

        return {
            headers,
            hasActions,
            primaryColumn: this.findPrimaryColumn(headers),
            actionsColumn: hasActions ? headers.findIndex(h => 
                h.text.toLowerCase().includes('accion') || 
                h.text.toLowerCase().includes('action') ||
                h.text.toLowerCase().includes('⚙️')
            ) : -1
        };
    }

    cleanHeaderText(text) {
        return text.replace(/[^\w\s]/g, '').trim() || 'Campo';
    }

    extractHeaderIcon(header) {
        const text = header.textContent;
        const iconMatch = text.match(/[\u{1F000}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
        return iconMatch ? iconMatch[0] : '📋';
    }

    detectColumnType(table, columnIndex) {
        const cells = Array.from(table.querySelectorAll('tbody tr'))
            .slice(0, 3) // Analizar solo las primeras 3 filas
            .map(row => row.cells[columnIndex])
            .filter(cell => cell);

        if (cells.length === 0) return 'text';

        const sampleValues = cells.map(cell => cell.textContent.trim().toLowerCase());
        
        // Detectar tipos
        if (sampleValues.some(val => /^\d{4}-\d{2}-\d{2}/.test(val))) return 'date';
        if (sampleValues.some(val => /^\d+(\.\d+)?$/.test(val))) return 'number';
        if (sampleValues.some(val => val.includes('@'))) return 'email';
        if (cells.some(cell => cell.querySelector('button, a'))) return 'actions';
        
        return 'text';
    }

    getColumnPriority(header, index) {
        const text = header.textContent.toLowerCase();
        
        // Prioridades según el contenido
        if (text.includes('codigo') || text.includes('id')) return 1; // Más importante
        if (text.includes('nombre') || text.includes('name')) return 2;
        if (text.includes('cantidad') || text.includes('stock')) return 3;
        if (text.includes('precio') || text.includes('price')) return 4;
        if (text.includes('fecha') || text.includes('date')) return 5;
        if (text.includes('accion') || text.includes('action')) return 10; // Menos importante en tarjeta
        
        return 6; // Prioridad media
    }

    findPrimaryColumn(headers) {
        // El campo principal suele ser el primero o el que tenga mayor prioridad
        return headers.reduce((prev, current) => 
            prev.priority < current.priority ? prev : current
        ).index;
    }

    createMobileView(table, config) {
        if (table.dataset.mobileViewCreated) return;

        const container = this.findOrCreateContainer(table);
        const cardContainer = this.createCardContainer();
        
        // Procesar filas de datos
        const dataRows = Array.from(table.querySelectorAll('tbody tr'));
        dataRows.forEach(row => {
            const card = this.createCard(row, config);
            cardContainer.appendChild(card);
        });

        // Insertar vista móvil
        container.appendChild(cardContainer);
        
        // Configurar alternancia de vistas
        this.setupViewToggle(table, cardContainer);
        
        table.dataset.mobileViewCreated = 'true';
    }

    findOrCreateContainer(table) {
        // Buscar contenedor con scroll horizontal
        let container = table.closest('.overflow-x-auto');
        
        if (!container) {
            // Crear contenedor si no existe
            container = document.createElement('div');
            container.className = 'table-container relative';
            table.parentNode.insertBefore(container, table);
            container.appendChild(table);
        }
        
        return container;
    }

    createCardContainer() {
        const container = document.createElement('div');
        container.className = 'mobile-card-container space-y-4';
        container.style.display = this.isMobile ? 'block' : 'none';
        return container;
    }

    createCard(row, config) {
        const cells = Array.from(row.cells);
        const card = document.createElement('div');
        card.className = 'mobile-table-card bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300';
        
        // Header de la tarjeta (campo principal)
        const primaryCell = cells[config.primaryColumn];
        if (primaryCell) {
            const header = this.createCardHeader(primaryCell, config.headers[config.primaryColumn]);
            card.appendChild(header);
        }

        // Cuerpo de la tarjeta (campos importantes)
        const body = this.createCardBody(cells, config);
        card.appendChild(body);

        // Footer con acciones si existen
        if (config.actionsColumn >= 0 && cells[config.actionsColumn]) {
            const footer = this.createCardFooter(cells[config.actionsColumn]);
            card.appendChild(footer);
        }

        return card;
    }

    createCardHeader(cell, headerConfig) {
        const header = document.createElement('div');
        header.className = 'p-4 bg-gray-50 border-b border-gray-200';
        
        const title = document.createElement('div');
        title.className = 'font-semibold text-gray-900 text-lg';
        title.textContent = cell.textContent.trim();
        
        const subtitle = document.createElement('div');
        subtitle.className = 'text-sm text-gray-500 mt-1';
        subtitle.innerHTML = `${headerConfig.icon} ${headerConfig.text}`;
        
        header.appendChild(title);
        header.appendChild(subtitle);
        
        return header;
    }

    createCardBody(cells, config) {
        const body = document.createElement('div');
        body.className = 'p-4 space-y-3';
        
        // Mostrar campos por prioridad (excluyendo primary y actions)
        const fieldsToShow = config.headers
            .filter((header, index) => 
                index !== config.primaryColumn && 
                index !== config.actionsColumn &&
                index < cells.length
            )
            .sort((a, b) => a.priority - b.priority)
            .slice(0, 5); // Máximo 5 campos adicionales

        fieldsToShow.forEach(header => {
            const cell = cells[header.index];
            if (!cell || !cell.textContent.trim()) return;

            const field = this.createCardField(header, cell);
            body.appendChild(field);
        });

        return body;
    }

    createCardField(header, cell) {
        const field = document.createElement('div');
        field.className = 'flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0';
        
        const label = document.createElement('span');
        label.className = 'text-sm font-medium text-gray-600 flex items-center gap-1';
        label.innerHTML = `${header.icon} <span>${header.text}</span>`;
        
        const value = document.createElement('span');
        value.className = 'text-sm text-gray-900 text-right max-w-[60%] break-words';
        
        // Procesar el valor según el tipo
        const processedValue = this.processFieldValue(cell, header.type);
        value.innerHTML = processedValue;
        
        field.appendChild(label);
        field.appendChild(value);
        
        return field;
    }

    processFieldValue(cell, type) {
        const text = cell.textContent.trim();
        
        switch (type) {
            case 'date':
                try {
                    const date = new Date(text);
                    return date.toLocaleDateString('es-ES');
                } catch {
                    return text;
                }
            
            case 'number':
                if (/^\d+(\.\d+)?$/.test(text)) {
                    return new Intl.NumberFormat('es-ES').format(parseFloat(text));
                }
                return text;
            
            default:
                return text;
        }
    }

    createCardFooter(actionsCell) {
        const footer = document.createElement('div');
        footer.className = 'p-3 bg-gray-50 border-t border-gray-200';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex flex-wrap gap-2';
        
        // Clonar botones y optimizar para móvil
        const buttons = actionsCell.querySelectorAll('button, a');
        buttons.forEach(button => {
            const mobileButton = button.cloneNode(true);
            mobileButton.className = this.optimizeButtonClasses(button.className);
            actionsContainer.appendChild(mobileButton);
        });
        
        footer.appendChild(actionsContainer);
        return footer;
    }

    optimizeButtonClasses(originalClasses) {
        // Optimizar clases de botones para móvil
        const baseClasses = 'flex-1 min-w-[80px] px-3 py-2 text-xs font-medium rounded transition-colors';
        const colorClasses = this.extractColorClasses(originalClasses);
        
        return `${baseClasses} ${colorClasses}`;
    }

    extractColorClasses(classes) {
        // Extraer clases de color relevantes
        const colorPatterns = [
            /bg-\w+-\d+/g,
            /text-\w+-\d+/g,
            /hover:bg-\w+-\d+/g,
            /hover:text-\w+-\d+/g,
            /border-\w+-\d+/g
        ];
        
        const matches = [];
        colorPatterns.forEach(pattern => {
            const found = classes.match(pattern);
            if (found) matches.push(...found);
        });
        
        return matches.join(' ');
    }

    setupViewToggle(table, cardContainer) {
        // Alternar vistas según el tamaño de pantalla
        const toggleView = () => {
            if (this.isMobile) {
                table.style.display = 'none';
                cardContainer.style.display = 'block';
            } else {
                table.style.display = 'table';
                cardContainer.style.display = 'none';
            }
        };

        // Configurar observador de redimensionamiento
        const resizeObserver = new ResizeObserver(() => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 640;
            
            if (wasMobile !== this.isMobile) {
                toggleView();
            }
        });

        resizeObserver.observe(document.body);
        toggleView(); // Aplicar estado inicial
    }

    refreshAllTables() {
        this.tables.forEach((config, table) => {
            const cardContainer = table.parentNode.querySelector('.mobile-card-container');
            if (cardContainer) {
                // Actualizar vista
                if (this.isMobile) {
                    table.style.display = 'none';
                    cardContainer.style.display = 'block';
                } else {
                    table.style.display = 'table';
                    cardContainer.style.display = 'none';
                }
            }
        });
    }

    // API pública
    static init() {
        if (!window.tableMobileOptimizer) {
            window.tableMobileOptimizer = new TableMobileOptimizer();
        }
        return window.tableMobileOptimizer;
    }

    forceRefresh() {
        // Limpiar y recrear todas las optimizaciones
        this.tables.clear();
        document.querySelectorAll('.mobile-card-container').forEach(container => {
            container.remove();
        });
        document.querySelectorAll('table[data-mobile-view-created]').forEach(table => {
            delete table.dataset.mobileViewCreated;
        });
        
        this.optimizeExistingTables();
            }
}

// Auto-inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => TableMobileOptimizer.init(), 100);
    });
} else {
    setTimeout(() => TableMobileOptimizer.init(), 100);
}

// Exportar para uso manual
window.TableMobileOptimizer = TableMobileOptimizer;


