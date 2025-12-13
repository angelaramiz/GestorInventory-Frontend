/**
 * Extension Conflict Detector
 * Detecta interferencias de extensiones del navegador
 */

class ExtensionConflictDetector {
    constructor() {
        this.conflicts = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        console.log('🔍 Iniciando detector de conflictos de extensiones...');

        // Detectar modificaciones DOM
        this.observeDOM();

        // Detectar errores de selectores
        this.detectSelectorErrors();

        // Detectar elementos ocultos inesperadamente
        this.detectHiddenElements();

        // Verificar disponibilidad de APIs
        this.checkAPIs();

        this.initialized = true;

        // Reportar después de 3 segundos
        setTimeout(() => this.generateReport(), 3000);
    }

    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Detectar scripts de extensiones
                        if (node.src && (
                            node.src.includes('extension://') ||
                            node.src.includes('moz-extension://') ||
                            node.src.includes('chrome-extension://')
                        )) {
                            this.conflicts.push({
                                type: 'extension_script',
                                element: node,
                                source: node.src,
                                timestamp: Date.now()
                            });
                        }

                        // Detectar elementos con estilos forzados
                        if (node.style && (
                            node.style.display === 'none !important' ||
                            node.style.visibility === 'hidden'
                        )) {
                            this.conflicts.push({
                                type: 'forced_style',
                                element: node,
                                styles: node.style.cssText,
                                timestamp: Date.now()
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    detectSelectorErrors() {
        // Override console.error para capturar errores de selectores
        const originalError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('Failed to parse selector') ||
                message.includes(':has-text') ||
                message.includes('invalid pseudo-class')) {
                this.conflicts.push({
                    type: 'selector_error',
                    message: message,
                    timestamp: Date.now()
                });
            }
            originalError.apply(console, args);
        };
    }

    detectHiddenElements() {
        // Verificar elementos importantes que podrían estar ocultos
        const importantSelectors = [
            '[id*="registro"]',
            '[id*="entrada"]',
            '.registro-button',
            '.registro-input',
            '.registro-card'
        ];

        importantSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const computed = window.getComputedStyle(element);
                    if (computed.display === 'none' &&
                        !element.hasAttribute('data-hidden-intentionally')) {
                        this.conflicts.push({
                            type: 'unexpected_hidden',
                            element: element,
                            selector: selector,
                            timestamp: Date.now()
                        });
                    }
                });
            } catch (error) {
                // Ignorar errores de selectores
            }
        });
    }

    checkAPIs() {
        const apis = ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage'];
        apis.forEach(api => {
            if (typeof window[api] !== 'function' && typeof window[api] !== 'object') {
                this.conflicts.push({
                    type: 'missing_api',
                    api: api,
                    timestamp: Date.now()
                });
            }
        });
    }

    generateReport() {
        if (this.conflicts.length === 0) {
            console.log('✅ No se detectaron conflictos con extensiones');
            return;
        }

        console.group('⚠️ Reporte de Conflictos de Extensiones');

        this.conflicts.forEach((conflict, index) => {
            console.log(`${index + 1}. ${conflict.type.toUpperCase()}:`);
            console.log('   Detalles:', conflict);

            if (conflict.type === 'selector_error' &&
                conflict.message.includes(':has-text')) {
                console.log('   💡 Solución: Este error proviene de uBlock Origin o similar.');
                console.log('   💡 No afecta tu aplicación. Puedes ignorarlo o deshabilitar la extensión.');
            }
        });

        console.groupEnd();

        // Agregar clase al body para activar indicadores visuales
        if (this.conflicts.some(c => c.type === 'selector_error')) {
            document.body.classList.add('has-extension-errors');
        }
    }

    // Método público para obtener el reporte
    getReport() {
        return {
            total_conflicts: this.conflicts.length,
            conflicts: this.conflicts,
            recommendations: this.getRecommendations()
        };
    }

    getRecommendations() {
        const recommendations = [];

        if (this.conflicts.some(c => c.message && c.message.includes(':has-text'))) {
            recommendations.push('Considera deshabilitar uBlock Origin en localhost para desarrollo');
        }

        if (this.conflicts.some(c => c.type === 'forced_style')) {
            recommendations.push('Algunos elementos están siendo ocultados por extensiones');
        }

        if (this.conflicts.some(c => c.type === 'missing_api')) {
            recommendations.push('Algunas APIs del navegador pueden estar bloqueadas');
        }

        return recommendations;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const detector = new ExtensionConflictDetector();
        detector.init();

        // Hacer disponible globalmente para debugging
        window.extensionDetector = detector;
    });
} else {
    const detector = new ExtensionConflictDetector();
    detector.init();
    window.extensionDetector = detector;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionConflictDetector;
}
