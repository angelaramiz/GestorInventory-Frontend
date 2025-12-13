/**
 * Gestor de Responsividad Móvil
 * Optimiza la interfaz para dispositivos móviles y tablets
 */

class MobileOptimizer {
    constructor() {
        this.isMobile = window.innerWidth <= 640;
        this.isTablet = window.innerWidth > 640 && window.innerWidth <= 1024;
        this.isTouch = 'ontouchstart' in window;
        this.currentOrientation = this.getOrientation();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.optimizeViewport();
        this.setupTouchEnhancements();
        this.optimizeTables();
        this.setupMobileMenus();
        this.optimizeModals();
        this.setupResponsiveForms();
        
            }

    setupEventListeners() {
        // Redimensionamiento de ventana
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Cambio de orientación
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // Eventos de scroll para optimización
        window.addEventListener('scroll', this.throttle(() => {
            this.optimizeScrollPerformance();
        }, 16));
    }

    handleResize() {
        const wasMovile = this.isMobile;
        const wasTablet = this.isTablet;
        
        this.isMobile = window.innerWidth <= 640;
        this.isTablet = window.innerWidth > 640 && window.innerWidth <= 1024;
        
        if (wasMovile !== this.isMobile || wasTablet !== this.isTablet) {
            this.optimizeTables();
            this.optimizeModals();
            this.setupResponsiveForms();
            this.emit('deviceTypeChanged', {
                isMobile: this.isMobile,
                isTablet: this.isTablet
            });
        }
    }

    handleOrientationChange() {
        const newOrientation = this.getOrientation();
        
        if (newOrientation !== this.currentOrientation) {
            this.currentOrientation = newOrientation;
            this.optimizeForOrientation();
            this.emit('orientationChanged', newOrientation);
        }
    }

    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    optimizeViewport() {
        // Asegurar viewport correcto
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        
        // Prevenir zoom en inputs en iOS
        if (this.isTouch && /iPhone|iPad/.test(navigator.userAgent)) {
            this.preventZoomOnInputs();
        }
    }

    preventZoomOnInputs() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (parseFloat(getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
            }
        });
    }

    setupTouchEnhancements() {
        if (!this.isTouch) return;

        // Mejorar área de toque para elementos pequeños
        const smallElements = document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');
        smallElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
                element.style.display = 'inline-flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        });

        // Feedback táctil
        this.setupTouchFeedback();
    }

    setupTouchFeedback() {
        document.addEventListener('touchstart', (e) => {
            if (e.target.matches('button, a, .clickable')) {
                e.target.style.opacity = '0.7';
                e.target.style.transform = 'scale(0.98)';
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (e.target.matches('button, a, .clickable')) {
                setTimeout(() => {
                    e.target.style.opacity = '';
                    e.target.style.transform = '';
                }, 100);
            }
        }, { passive: true });
    }

    optimizeTables() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            if (this.isMobile) {
                this.convertTableToCards(table);
            } else {
                this.restoreTableView(table);
            }
        });
    }

    convertTableToCards(table) {
        // Verificar si ya tiene vista de tarjetas
        if (table.dataset.mobileOptimized === 'true') return;

        const container = table.closest('.overflow-x-auto') || table.parentElement;
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            icon: this.extractIcon(th)
        }));
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        // Crear contenedor de tarjetas
        const cardContainer = document.createElement('div');
        cardContainer.className = 'mobile-card-view space-y-4';
        cardContainer.style.display = this.isMobile ? 'block' : 'none';
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const card = this.createMobileCard(headers, cells, row);
            cardContainer.appendChild(card);
        });
        
        // Ocultar tabla en móvil
        table.style.display = this.isMobile ? 'none' : 'table';
        table.classList.add('desktop-table');
        
        // Insertar tarjetas
        container.appendChild(cardContainer);
        table.dataset.mobileOptimized = 'true';
    }

    createMobileCard(headers, cells, originalRow) {
        const card = document.createElement('div');
        card.className = 'mobile-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
        
        // Header de la tarjeta (primera columna como título)
        if (cells[0]) {
            const cardHeader = document.createElement('div');
            cardHeader.className = 'mobile-card-header';
            
            const title = document.createElement('div');
            title.className = 'mobile-card-title text-lg font-semibold text-gray-900';
            title.textContent = cells[0].textContent.trim();
            
            const subtitle = document.createElement('div');
            subtitle.className = 'mobile-card-subtitle text-sm text-gray-500';
            subtitle.textContent = headers[0]?.text || 'Código';
            
            cardHeader.appendChild(title);
            cardHeader.appendChild(subtitle);
            card.appendChild(cardHeader);
        }
        
        // Cuerpo de la tarjeta
        const cardBody = document.createElement('div');
        cardBody.className = 'mobile-card-body space-y-2';
        
        // Saltar la primera celda (ya usada como título)
        for (let i = 1; i < cells.length - 1; i++) {
            const cell = cells[i];
            const header = headers[i];
            
            if (!cell || !header) continue;
            
            const field = document.createElement('div');
            field.className = 'mobile-card-field flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0';
            
            const label = document.createElement('span');
            label.className = 'mobile-card-label text-sm font-medium text-gray-600';
            label.innerHTML = `${header.icon} ${header.text}`;
            
            const value = document.createElement('span');
            value.className = 'mobile-card-value text-sm text-gray-900 text-right';
            value.innerHTML = cell.innerHTML;
            
            field.appendChild(label);
            field.appendChild(value);
            cardBody.appendChild(field);
        }
        
        card.appendChild(cardBody);
        
        // Acciones (última columna)
        const lastCell = cells[cells.length - 1];
        if (lastCell && lastCell.querySelector('button')) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'mobile-card-actions flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100';
            
            const buttons = lastCell.querySelectorAll('button');
            buttons.forEach(button => {
                const mobileButton = button.cloneNode(true);
                mobileButton.className = `${button.className} flex-1 min-w-0 text-xs py-2 px-3`;
                actionsContainer.appendChild(mobileButton);
            });
            
            card.appendChild(actionsContainer);
        }
        
        return card;
    }

    restoreTableView(table) {
        if (table.dataset.mobileOptimized !== 'true') return;
        
        const container = table.closest('.overflow-x-auto') || table.parentElement;
        const cardContainer = container.querySelector('.mobile-card-view');
        
        if (cardContainer) {
            cardContainer.style.display = this.isMobile ? 'block' : 'none';
        }
        
        table.style.display = this.isMobile ? 'none' : 'table';
    }

    extractIcon(element) {
        const iconText = element.textContent;
        const iconMatch = iconText.match(/^[^\w\s]+/);
        return iconMatch ? iconMatch[0] : '📄';
    }

    setupMobileMenus() {
        // Optimizar menús laterales para móvil
        const sideMenus = document.querySelectorAll('#sideMenu, .side-menu');
        
        sideMenus.forEach(menu => {
            if (this.isMobile) {
                menu.style.width = '100vw';
                menu.style.maxWidth = '320px';
                
                // Agregar overlay para cerrar
                this.addMenuOverlay(menu);
            }
        });

        // Optimizar menús de navegación por pestañas
        this.optimizeTabNavigation();
    }

    addMenuOverlay(menu) {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay fixed inset-0 bg-black bg-opacity-50 z-40';
        overlay.style.display = 'none';
        
        overlay.addEventListener('click', () => {
            menu.style.transform = 'translateX(-100%)';
            overlay.style.display = 'none';
        });
        
        document.body.appendChild(overlay);
        
        // Mostrar overlay cuando el menú esté abierto
        const observer = new MutationObserver(() => {
            const isOpen = !menu.style.transform.includes('-100%');
            overlay.style.display = isOpen ? 'block' : 'none';
        });
        
        observer.observe(menu, { attributes: true, attributeFilter: ['style'] });
    }

    optimizeTabNavigation() {
        const tabContainers = document.querySelectorAll('.tab-navigation, .flex.border-b');
        
        tabContainers.forEach(container => {
            if (this.isMobile) {
                container.style.overflowX = 'auto';
                container.style.webkitOverflowScrolling = 'touch';
                container.style.scrollbarWidth = 'none';
                container.style.msOverflowStyle = 'none';
                
                // Ocultar scrollbar
                const style = document.createElement('style');
                style.textContent = `
                    .tab-navigation::-webkit-scrollbar,
                    .flex.border-b::-webkit-scrollbar {
                        display: none;
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    optimizeModals() {
        const modals = document.querySelectorAll('.modal-overlay, .scanner-modal, [class*="modal"]');
        
        modals.forEach(modal => {
            if (this.isMobile) {
                const content = modal.querySelector('.modal-content, .scanner-content, [class*="modal-content"]');
                if (content) {
                    content.style.margin = '1rem';
                    content.style.maxHeight = 'calc(100vh - 2rem)';
                    content.style.maxWidth = 'calc(100vw - 2rem)';
                    content.style.width = 'auto';
                }
            }
        });
    }

    setupResponsiveForms() {
        const forms = document.querySelectorAll('form, .form-container');
        
        forms.forEach(form => {
            if (this.isMobile) {
                // Convertir grids a columnas simples
                const grids = form.querySelectorAll('.grid, [class*="grid-cols"]');
                grids.forEach(grid => {
                    grid.style.gridTemplateColumns = '1fr';
                    grid.style.gap = '1rem';
                });
                
                // Optimizar inputs
                this.optimizeFormInputs(form);
                
                // Agregar navegación de formulario en móvil
                this.addMobileFormNavigation(form);
            }
        });
    }

    optimizeFormInputs(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Ajustar tamaño de fuente para evitar zoom en iOS
            if (parseFloat(getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
            }
            
            // Mejorar padding táctil
            input.style.padding = '0.875rem';
            input.style.minHeight = '48px';
            
            // Optimizar tipos de input para móvil
            this.optimizeInputType(input);
        });
    }

    optimizeInputType(input) {
        // Optimizar teclados móviles
        if (input.type === 'email') {
            input.inputMode = 'email';
        } else if (input.type === 'tel') {
            input.inputMode = 'tel';
        } else if (input.type === 'number') {
            input.inputMode = 'numeric';
        } else if (input.type === 'url') {
            input.inputMode = 'url';
        }
        
        // Agregar autocomplete apropiado
        if (input.name && !input.autocomplete) {
            const autocompleteMap = {
                'email': 'email',
                'password': 'current-password',
                'name': 'name',
                'phone': 'tel',
                'address': 'address-line1',
                'city': 'address-level2',
                'country': 'country',
                'postal': 'postal-code'
            };
            
            for (const [key, value] of Object.entries(autocompleteMap)) {
                if (input.name.toLowerCase().includes(key)) {
                    input.autocomplete = value;
                    break;
                }
            }
        }
    }

    addMobileFormNavigation(form) {
        if (!this.isMobile) return;
        
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select'))
            .filter(input => !input.disabled && !input.readOnly);
        
        if (inputs.length < 2) return;
        
        inputs.forEach((input, index) => {
            // Agregar navegación entre campos
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.type !== 'textarea') {
                    e.preventDefault();
                    const nextInput = inputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                    } else {
                        // Último campo, enviar formulario si es posible
                        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                        if (submitButton) {
                            submitButton.click();
                        }
                    }
                }
            });
        });
    }

    optimizeForOrientation() {
        if (this.currentOrientation === 'landscape' && this.isMobile) {
            // Ajustes específicos para landscape en móvil
            document.body.style.paddingTop = '0.5rem';
            
            const headers = document.querySelectorAll('header');
            headers.forEach(header => {
                header.style.padding = '0.5rem';
            });
        } else {
            // Restaurar valores por defecto
            document.body.style.paddingTop = '';
            
            const headers = document.querySelectorAll('header');
            headers.forEach(header => {
                header.style.padding = '';
            });
        }
    }

    optimizeScrollPerformance() {
        // Lazy loading de imágenes
        const images = document.querySelectorAll('img[data-src]');
        if (images.length > 0 && 'IntersectionObserver' in window) {
            this.setupLazyLoading(images);
        }
        
        // Optimizar animaciones durante el scroll
        this.optimizeScrollAnimations();
    }

    setupLazyLoading(images) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    optimizeScrollAnimations() {
        const scrollElements = document.querySelectorAll('.scroll-fade-in:not(.visible)');
        
        if (scrollElements.length === 0) return;
        
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        scrollElements.forEach(el => scrollObserver.observe(el));
    }

    // Utilidades
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    emit(eventName, data) {
        const event = new CustomEvent(`mobileOptimizer:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    // API pública
    static init() {
        if (!window.mobileOptimizer) {
            window.mobileOptimizer = new MobileOptimizer();
        }
        return window.mobileOptimizer;
    }

    // Método para refrescar optimizaciones
    refresh() {
        this.optimizeTables();
        this.optimizeModals();
        this.setupResponsiveForms();
            }

    // Método para forzar modo móvil (útil para pruebas)
    forceMobileMode(enabled = true) {
        this.isMobile = enabled;
        this.refresh();
            }
}

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MobileOptimizer.init();
    });
} else {
    MobileOptimizer.init();
}

// Exportar para uso manual
window.MobileOptimizer = MobileOptimizer;


