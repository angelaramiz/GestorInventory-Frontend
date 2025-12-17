// Gestor global de temas para todas las rutas del proyecto
// NOTA: Este archivo NO usa exports/imports para evitar errores de sintaxis en navegadores
// que cargan el script directamente como <script src="...">
class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.initializeTheme();
        this.setupThemeListeners();
    }

    // Cargar tema desde localStorage o detectar preferencia del sistema
    loadTheme() {
        // Primero revisar el tema específico
        const savedTheme = localStorage.getItem('gestorInventory_theme');
        if (savedTheme) {
            return savedTheme;
        }

        // Si no hay tema específico, revisar las configuraciones generales
        try {
            const configData = localStorage.getItem('gestorInventory_config');
            if (configData) {
                const config = JSON.parse(configData);
                if (config.theme) {
                    // Sincronizar el tema específico con la configuración encontrada
                    localStorage.setItem('gestorInventory_theme', config.theme);
                    return config.theme;
                }
            }
        } catch (error) {
            console.warn('Error al cargar tema desde configuraciones:', error);
        }

        // Si no hay tema guardado, usar preferencia del sistema
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    // Guardar tema en localStorage
    saveTheme(theme) {
        localStorage.setItem('gestorInventory_theme', theme);
        localStorage.setItem('gestorInventory_themeLastUpdate', new Date().toISOString());
        this.currentTheme = theme;
        
        // También sincronizar con el sistema de configuraciones si existe
        this.syncWithLocalConfig(theme);
    }
    
    // Sincronizar con el sistema de configuraciones local
    syncWithLocalConfig(theme) {
        try {
            const configData = localStorage.getItem('gestorInventory_config');
            if (configData) {
                const config = JSON.parse(configData);
                if (config.theme !== theme) {
                    config.theme = theme;
                    localStorage.setItem('gestorInventory_config', JSON.stringify(config));
                    localStorage.setItem('gestorInventory_configLastUpdate', new Date().toISOString());
                }
            }
        } catch (error) {
            console.warn('Error al sincronizar con configuraciones locales:', error);
        }
    }

    // Aplicar el tema al documento
    applyTheme(theme) {
        // Verificar que el DOM esté disponible
        if (!document.body || !document.documentElement) {
            console.warn('DOM no disponible para aplicar tema, reintentando...');
            // Reintentar cuando el DOM esté listo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.applyTheme(theme);
                });
                return;
            }
        }

        const body = document.body;
        const html = document.documentElement;

        // Verificar que los elementos existan antes de usarlos
        if (!body || !html) {
            console.warn('Elementos del DOM no disponibles para aplicar tema');
            return;
        }

        // Remover todas las clases de tema
        body.classList.remove('theme-light', 'theme-dark');
        html.classList.remove('theme-light', 'theme-dark');

        // Aplicar la nueva clase de tema
        const themeClass = `theme-${theme}`;
        body.classList.add(themeClass);
        html.classList.add(themeClass);

        // Actualizar atributo data-theme para CSS avanzado
        html.setAttribute('data-theme', theme);

        // Emitir evento personalizado para componentes que necesiten reaccionar
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    }

    // Alternar entre modo claro y oscuro
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }

    // Establecer un tema específico
    setTheme(theme) {
        if (!['light', 'dark', 'auto'].includes(theme)) {
            console.warn('Tema no válido:', theme);
            return;
        }

        let actualTheme = theme;

        // Si el tema es 'auto', determinar según la preferencia del sistema
        if (theme === 'auto') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        this.applyTheme(actualTheme);
        this.saveTheme(theme); // Guardar el tema seleccionado (incluyendo 'auto')
        
        // Actualizar controles de tema en la página actual
        this.updateThemeControls();
    }

    // Obtener el tema actual
    getTheme() {
        return this.currentTheme;
    }

    // Inicializar el tema al cargar la página
    initializeTheme() {
        // Solo inicializar si el DOM está disponible
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyTheme(this.getActualTheme());
            });
        } else {
            this.applyTheme(this.getActualTheme());
        }
    }

    // Obtener el tema real (resolviendo 'auto')
    getActualTheme() {
        if (this.currentTheme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    // Configurar listeners para cambios de preferencia del sistema y sincronización entre pestañas
    setupThemeListeners() {
        // Escuchar cambios en la preferencia del sistema
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Solo reaccionar si el tema está en modo automático
                if (this.currentTheme === 'auto') {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }

        // Escuchar cambios en localStorage para sincronización entre pestañas
        window.addEventListener('storage', (e) => {
            if (e.key === 'gestorInventory_theme' && e.newValue !== null) {
                const newTheme = e.newValue;
                if (newTheme !== this.currentTheme) {
                    console.log('🔄 Sincronizando tema desde otra pestaña:', newTheme);
                    this.currentTheme = newTheme;
                    this.applyTheme(this.getActualTheme());
                    
                    // Actualizar controles de tema en la página actual
                    this.updateThemeControls();
                }
            }
        });
    }

    // Actualizar controles de tema en la página cuando cambie el tema
    updateThemeControls() {
        try {
            // Actualizar checkbox del toggle
            const themeCheckbox = document.querySelector('.theme-checkbox');
            if (themeCheckbox) {
                themeCheckbox.checked = this.getActualTheme() === 'dark';
            }

            // Actualizar select de tema
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) {
                themeSelect.value = this.currentTheme;
            }
        } catch (error) {
            console.warn('Error al actualizar controles de tema:', error);
        }
    }

    // Crear y mostrar el control de tema en la página
    createThemeToggle(container = null) {
        // Verificar que el DOM esté disponible
        if (!document.body) {
            console.warn('DOM no disponible para crear theme toggle');
            return null;
        }
        // Toggle eliminado: devolver null para evitar insertar el control en el DOM.
        // Si se desea restaurarlo en el futuro, revertir este cambio.
        return null;
    }

    // Crear un selector de tema más completo (con opción auto)
    createThemeSelector(container = null) {
        const themeSelector = document.createElement('div');
        themeSelector.className = 'theme-selector-container dark-theme-bg dark-theme-text';
        themeSelector.innerHTML = `
            <div class="theme-selector-wrapper dark-theme-bg">
                <label class="theme-selector-label dark-theme-text" for="theme-select">Tema:</label>
                <select id="theme-select" class="theme-select dark-theme-input dark-theme-bg dark-theme-text">
                    <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Claro</option>
                    <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Oscuro</option>
                    <option value="auto" ${this.currentTheme === 'auto' ? 'selected' : ''}>Automático</option>
                </select>
            </div>
        `;

        // Agregar evento de cambio
        const select = themeSelector.querySelector('#theme-select');
        select.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        if (container) {
            container.appendChild(themeSelector);
        }

        return themeSelector;
    }

    // Método para sincronizar con el configuraciones.js existente
    syncWithConfig(configManager) {
        if (configManager && configManager.config) {
            // Obtener tema de la configuración existente
            const configTheme = configManager.config.theme;
            if (configTheme && configTheme !== this.currentTheme) {
                this.setTheme(configTheme);
            }
            
            // Escuchar cambios en la configuración
            window.addEventListener('themeChanged', (e) => {
                if (configManager.config) {
                    configManager.config.theme = e.detail.theme;
                    configManager.guardarConfiguracion();
                }
            });
        }
    }

    // Función de debug para verificar sincronización
    debugThemeSync() {
        const themeManagerTheme = this.currentTheme;
        const localStorageTheme = localStorage.getItem('gestorInventory_theme');
        const themeLastUpdate = localStorage.getItem('gestorInventory_themeLastUpdate');
        
        let configTheme = null;
        let configLastUpdate = null;
        
        try {
            const configData = localStorage.getItem('gestorInventory_config');
            if (configData) {
                const config = JSON.parse(configData);
                configTheme = config.theme;
            }
            configLastUpdate = localStorage.getItem('gestorInventory_configLastUpdate');
        } catch (error) {
            console.warn('Error al leer configuraciones para debug:', error);
        }
        
        console.group('🎨 DEBUG SINCRONIZACIÓN DE TEMAS');
        console.log('ThemeManager.currentTheme:', themeManagerTheme);
        console.log('localStorage gestorInventory_theme:', localStorageTheme);
        console.log('Config.theme:', configTheme);
        console.log('Última actualización tema:', themeLastUpdate);
        console.log('Última actualización config:', configLastUpdate);
        console.log('Tema aplicado en DOM:', document.documentElement.getAttribute('data-theme'));
        console.groupEnd();
        
        return {
            themeManagerTheme,
            localStorageTheme,
            configTheme,
            themeLastUpdate,
            configLastUpdate
        };
    }
}

// Declarar la instancia global sin inicializar
window.themeManager = null;

// Hacer disponible la clase globalmente para uso directo
window.ThemeManager = ThemeManager;

// Función de inicialización
function initializeThemeManager() {
    try {
        if (!window.themeManager) {
            window.themeManager = new ThemeManager();
            console.log('✅ ThemeManager inicializado correctamente');
        }
        return window.themeManager;
    } catch (error) {
        console.error('❌ Error al inicializar ThemeManager:', error);
        return null;
    }
}

// Auto-inicializar cuando el DOM esté listo
function safeInitialization() {
    try {
        const manager = initializeThemeManager();
        if (manager) {
            setupThemeControls();
        }
    } catch (error) {
        console.error('❌ Error durante la inicialización segura:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInitialization);
} else {
    // El DOM ya está listo, pero usar un setTimeout para asegurar que todo esté cargado
    setTimeout(safeInitialization, 0);
}

// Función para configurar controles de tema
function setupThemeControls() {
    if (!window.themeManager) {
        console.warn('ThemeManager no disponible para configurar controles');
        return;
    }
    
    // Verificar que el DOM esté disponible
    if (!document.body) {
        console.warn('DOM no disponible para configurar controles de tema');
        return;
    }
    
    // Forzar una sincronización inicial
    window.themeManager.syncWithLocalConfig(window.themeManager.currentTheme);
    
    // Buscar si existe un select de tema en la página y sincronizarlo
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = window.themeManager.currentTheme;
        themeSelect.addEventListener('change', (e) => {
            window.themeManager.setTheme(e.target.value);
        });
    }

    // Agregar toggle de tema al header si no existe control
    if (!themeSelect && !document.querySelector('.theme-toggle-container')) {
        const header = document.querySelector('header');
        if (header) {
            window.themeManager.createThemeToggle();
        }
    }
    
    // Debug en desarrollo (solo si hay parámetro debug en URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'theme') {
        window.themeManager.debugThemeSync();
    }
}
