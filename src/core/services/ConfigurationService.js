/**
 * ConfigurationService - Servicio especializado para gestión de configuraciones
 * 
 * Este servicio maneja todas las configuraciones del sistema incluyendo temas,
 * idiomas, sincronización, notificaciones y credenciales de servicios externos.
 * 
 * @class ConfigurationService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';

class ConfigurationService extends BaseService {
    constructor() {
        super('ConfigurationService');
        
        // Configuración por defecto
        this.defaultConfig = {
            theme: 'light',
            language: 'es',
            autoSync: true,
            syncInterval: 5,
            notifications: {
                browser: true,
                sound: true,
                lowStock: true
            },
            google: {
                driveApiKey: '',
                sheetsApiKey: '',
                sheetsId: '',
                connectionStatus: 'disconnected'
            },
            ui: {
                showTutorials: true,
                compactMode: false,
                animationsEnabled: true
            }
        };
        
        // Configuración actual
        this.config = { ...this.defaultConfig };
        
        // Referencias a otros servicios
        this.themeManager = null;
        this.syncInterval = null;
        
        // Estado del servicio
        this.isInitialized = false;
        
        this.debug('ConfigurationService inicializado');
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
            this.debug('Inicializando ConfigurationService...');

            // Cargar configuración guardada
            this.loadConfiguration();
            
            // Inicializar integración con ThemeManager
            this.initializeThemeIntegration();
            
            // Configurar listeners
            this.setupEventListeners();
            
            // Aplicar configuración inicial
            this.applyInitialConfiguration();

            this.status = 'initialized';
            this.isInitialized = true;
            this.emit('initialized');
            this.debug('ConfigurationService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar ConfigurationService:', error);
            throw error;
        }
    }

    /**
     * Cargar configuración desde localStorage
     */
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('gestorInventory_config');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.defaultConfig, ...parsedConfig };
                this.debug('Configuración cargada desde localStorage');
            } else {
                this.config = { ...this.defaultConfig };
                this.debug('Usando configuración por defecto');
            }
            
            this.emit('configurationLoaded', this.config);
            return this.config;
            
        } catch (error) {
            this.error('Error al cargar configuración:', error);
            this.config = { ...this.defaultConfig };
            this.emit('configurationLoadError', error);
            return this.config;
        }
    }

    /**
     * Guardar configuración en localStorage
     */
    saveConfiguration() {
        try {
            localStorage.setItem('gestorInventory_config', JSON.stringify(this.config));
            localStorage.setItem('gestorInventory_configLastUpdate', new Date().toISOString());
            
            // Guardar tema específicamente para sincronización
            if (this.config.theme) {
                localStorage.setItem('gestorInventory_theme', this.config.theme);
                localStorage.setItem('gestorInventory_themeLastUpdate', new Date().toISOString());
            }
            
            this.debug('Configuración guardada exitosamente');
            this.emit('configurationSaved', this.config);
            return true;
            
        } catch (error) {
            this.error('Error al guardar configuración:', error);
            this.emit('configurationSaveError', error);
            return false;
        }
    }

    /**
     * Inicializar integración con ThemeManager
     */
    initializeThemeIntegration() {
        try {
            // Obtener referencia al ThemeManager
            this.themeManager = window.themeManager;
            
            if (!this.themeManager && window.ThemeManager) {
                try {
                    this.themeManager = new window.ThemeManager();
                } catch (error) {
                    this.warn('No se pudo crear ThemeManager:', error);
                }
            }
            
            if (this.themeManager) {
                this.synchronizeThemes();
                this.debug('Integración con ThemeManager establecida');
            } else {
                this.warn('ThemeManager no disponible');
            }
            
        } catch (error) {
            this.warn('Error al inicializar integración con temas:', error);
        }
    }

    /**
     * Sincronizar temas entre sistemas
     */
    synchronizeThemes() {
        if (!this.themeManager) return;
        
        try {
            const configTheme = this.config.theme;
            const managerTheme = this.themeManager.currentTheme;
            
            // Resolver conflictos basado en timestamps
            if (configTheme && configTheme !== managerTheme) {
                const configLastUpdate = localStorage.getItem('gestorInventory_configLastUpdate');
                const themeLastUpdate = localStorage.getItem('gestorInventory_themeLastUpdate');
                
                if (!themeLastUpdate || (configLastUpdate && new Date(configLastUpdate) > new Date(themeLastUpdate))) {
                    this.themeManager.setTheme(configTheme);
                } else {
                    this.config.theme = managerTheme;
                    this.saveConfiguration();
                }
            }
            
            this.debug('Temas sincronizados');
            
        } catch (error) {
            this.warn('Error al sincronizar temas:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        try {
            // Listener para cambios de tema globales
            window.addEventListener('themeChanged', (e) => {
                if (this.config.theme !== e.detail.theme) {
                    this.config.theme = e.detail.theme;
                    this.saveConfiguration();
                    this.emit('themeChanged', e.detail.theme);
                }
            });
            
            // Listener para sincronización entre pestañas
            window.addEventListener('storage', (e) => {
                if (e.key === 'gestorInventory_config') {
                    try {
                        const newConfig = JSON.parse(e.newValue);
                        this.config = { ...this.defaultConfig, ...newConfig };
                        this.emit('configurationSynced', this.config);
                    } catch (error) {
                        this.warn('Error al sincronizar configuración entre pestañas:', error);
                    }
                }
            });
            
            this.debug('Event listeners configurados');
            
        } catch (error) {
            this.warn('Error al configurar listeners:', error);
        }
    }

    /**
     * Aplicar configuración inicial
     */
    applyInitialConfiguration() {
        try {
            // Aplicar tema inicial
            if (this.config.theme && this.themeManager) {
                this.themeManager.setTheme(this.config.theme);
            }
            
            // Configurar sincronización automática
            if (this.config.autoSync) {
                this.startAutoSync();
            }
            
            // Configurar notificaciones del navegador
            if (this.config.notifications.browser) {
                this.requestNotificationPermission();
            }
            
            this.debug('Configuración inicial aplicada');
            
        } catch (error) {
            this.warn('Error al aplicar configuración inicial:', error);
        }
    }

    /**
     * Obtener configuración actual
     * @returns {Object} Configuración actual
     */
    getConfiguration() {
        return { ...this.config };
    }

    /**
     * Obtener valor específico de configuración
     * @param {string} key - Clave de configuración (puede usar notación de punto)
     * @returns {any} Valor de configuración
     */
    get(key) {
        try {
            return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
        } catch (error) {
            this.warn(`Error al obtener configuración '${key}':`, error);
            return undefined;
        }
    }

    /**
     * Establecer valor de configuración
     * @param {string} key - Clave de configuración
     * @param {any} value - Valor a establecer
     * @param {boolean} save - Si guardar inmediatamente
     */
    set(key, value, save = true) {
        try {
            const keys = key.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((obj, k) => {
                if (!obj[k]) obj[k] = {};
                return obj[k];
            }, this.config);
            
            const oldValue = target[lastKey];
            target[lastKey] = value;
            
            if (save) {
                this.saveConfiguration();
            }
            
            this.emit('configurationUpdated', { key, value, oldValue });
            this.debug(`Configuración actualizada: ${key} = ${value}`);
            
        } catch (error) {
            this.error(`Error al establecer configuración '${key}':`, error);
        }
    }

    /**
     * Cambiar tema
     * @param {string} theme - Nombre del tema
     */
    setTheme(theme) {
        try {
            const oldTheme = this.config.theme;
            this.config.theme = theme;
            
            if (this.themeManager) {
                this.themeManager.setTheme(theme);
            }
            
            this.saveConfiguration();
            this.emit('themeChanged', { oldTheme, newTheme: theme });
            this.debug(`Tema cambiado a: ${theme}`);
            
        } catch (error) {
            this.error('Error al cambiar tema:', error);
        }
    }

    /**
     * Cambiar idioma
     * @param {string} language - Código del idioma
     */
    setLanguage(language) {
        try {
            const oldLanguage = this.config.language;
            this.config.language = language;
            this.saveConfiguration();
            
            this.emit('languageChanged', { oldLanguage, newLanguage: language });
            this.debug(`Idioma cambiado a: ${language}`);
            
        } catch (error) {
            this.error('Error al cambiar idioma:', error);
        }
    }

    /**
     * Configurar sincronización automática
     * @param {boolean} enabled - Si habilitar sincronización
     * @param {number} interval - Intervalo en minutos
     */
    configureAutoSync(enabled, interval = null) {
        try {
            this.config.autoSync = enabled;
            
            if (interval !== null) {
                this.config.syncInterval = Math.max(1, Math.min(60, interval));
            }
            
            if (enabled) {
                this.startAutoSync();
            } else {
                this.stopAutoSync();
            }
            
            this.saveConfiguration();
            this.emit('autoSyncConfigured', { enabled, interval: this.config.syncInterval });
            
        } catch (error) {
            this.error('Error al configurar sincronización automática:', error);
        }
    }

    /**
     * Iniciar sincronización automática
     */
    startAutoSync() {
        try {
            this.stopAutoSync(); // Limpiar intervalo existente
            
            if (this.config.autoSync && this.config.syncInterval > 0) {
                this.syncInterval = setInterval(() => {
                    this.performSync();
                }, this.config.syncInterval * 60 * 1000);
                
                this.debug(`Sincronización automática iniciada (${this.config.syncInterval} min)`);
                this.emit('autoSyncStarted', this.config.syncInterval);
            }
            
        } catch (error) {
            this.error('Error al iniciar sincronización automática:', error);
        }
    }

    /**
     * Detener sincronización automática
     */
    stopAutoSync() {
        try {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
                this.debug('Sincronización automática detenida');
                this.emit('autoSyncStopped');
            }
        } catch (error) {
            this.error('Error al detener sincronización automática:', error);
        }
    }

    /**
     * Realizar sincronización
     */
    async performSync() {
        try {
            this.debug('Iniciando sincronización...');
            this.emit('syncStarted');
            
            // Aquí se implementaría la lógica real de sincronización
            // Por ahora es una simulación
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.debug('Sincronización completada');
            this.emit('syncCompleted');
            
        } catch (error) {
            this.error('Error durante sincronización:', error);
            this.emit('syncError', error);
        }
    }

    /**
     * Configurar notificaciones
     * @param {Object} notificationSettings - Configuración de notificaciones
     */
    configureNotifications(notificationSettings) {
        try {
            this.config.notifications = {
                ...this.config.notifications,
                ...notificationSettings
            };
            
            if (this.config.notifications.browser) {
                this.requestNotificationPermission();
            }
            
            this.saveConfiguration();
            this.emit('notificationsConfigured', this.config.notifications);
            
        } catch (error) {
            this.error('Error al configurar notificaciones:', error);
        }
    }

    /**
     * Solicitar permisos de notificación
     */
    async requestNotificationPermission() {
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.debug(`Permiso de notificaciones: ${permission}`);
                return permission === 'granted';
            }
            return Notification.permission === 'granted';
        } catch (error) {
            this.warn('Error al solicitar permisos de notificación:', error);
            return false;
        }
    }

    /**
     * Configurar credenciales de Google
     * @param {Object} credentials - Credenciales de Google Services
     */
    setGoogleCredentials(credentials) {
        try {
            this.config.google = {
                ...this.config.google,
                ...credentials
            };
            
            this.saveConfiguration();
            this.emit('googleCredentialsUpdated', this.config.google);
            
        } catch (error) {
            this.error('Error al configurar credenciales de Google:', error);
        }
    }

    /**
     * Probar conexión con servicios de Google
     */
    async testGoogleConnection() {
        try {
            this.emit('googleConnectionTestStarted');
            
            const { driveApiKey, sheetsApiKey, sheetsId } = this.config.google;
            
            if (!driveApiKey && !sheetsApiKey) {
                throw new Error('Debes configurar al menos una API Key');
            }
            
            // Simulación de prueba (en implementación real haría llamadas reales)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const results = [];
            if (driveApiKey) results.push('Google Drive API: Conexión exitosa');
            if (sheetsApiKey) results.push('Google Sheets API: Conexión exitosa');
            if (sheetsId) results.push('Google Sheets ID: Válido');
            
            this.config.google.connectionStatus = 'connected';
            this.saveConfiguration();
            
            this.emit('googleConnectionTestCompleted', { success: true, results });
            return { success: true, results };
            
        } catch (error) {
            this.config.google.connectionStatus = 'error';
            this.saveConfiguration();
            
            this.emit('googleConnectionTestCompleted', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Exportar configuración
     */
    exportConfiguration() {
        try {
            const configToExport = {
                ...this.config,
                exportDate: new Date().toISOString(),
                version: '2.0.0'
            };
            
            const blob = new Blob([JSON.stringify(configToExport, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gestor-inventory-config-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.emit('configurationExported');
            
        } catch (error) {
            this.error('Error al exportar configuración:', error);
            this.emit('configurationExportError', error);
        }
    }

    /**
     * Importar configuración
     * @param {File} file - Archivo de configuración
     */
    async importConfiguration(file) {
        try {
            const text = await file.text();
            const importedConfig = JSON.parse(text);
            
            // Validar estructura básica
            if (!importedConfig || typeof importedConfig !== 'object') {
                throw new Error('Archivo de configuración inválido');
            }
            
            // Merge con configuración actual
            this.config = {
                ...this.defaultConfig,
                ...importedConfig,
                // Preservar ciertas configuraciones locales
                google: {
                    ...this.defaultConfig.google,
                    ...importedConfig.google
                }
            };
            
            this.saveConfiguration();
            this.emit('configurationImported', this.config);
            
        } catch (error) {
            this.error('Error al importar configuración:', error);
            this.emit('configurationImportError', error);
            throw error;
        }
    }

    /**
     * Resetear configuración a valores por defecto
     */
    resetConfiguration() {
        try {
            this.config = { ...this.defaultConfig };
            this.saveConfiguration();
            
            // Aplicar configuración resetada
            this.applyInitialConfiguration();
            
            this.emit('configurationReset');
            this.debug('Configuración reseteada a valores por defecto');
            
        } catch (error) {
            this.error('Error al resetear configuración:', error);
        }
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...super.getStats(),
            configurationStats: {
                totalKeys: this.countConfigKeys(this.config),
                autoSyncEnabled: this.config.autoSync,
                syncInterval: this.config.syncInterval,
                themeManagerConnected: !!this.themeManager,
                googleConfigured: !!(this.config.google.driveApiKey || this.config.google.sheetsApiKey),
                notificationsEnabled: this.config.notifications.browser
            }
        };
    }

    /**
     * Contar claves de configuración recursivamente
     */
    countConfigKeys(obj, count = 0) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                count++;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    count = this.countConfigKeys(obj[key], count);
                }
            }
        }
        return count;
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            this.stopAutoSync();
            this.themeManager = null;
            
            super.cleanup();
            this.debug('Recursos de ConfigurationService limpiados');
            
        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const configurationService = new ConfigurationService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        configurationService.initialize().catch(error => {
            console.warn('ConfigurationService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        configurationService.initialize().catch(error => {
            console.warn('ConfigurationService auto-inicialización falló:', error.message);
        });
    }
}

export default ConfigurationService;
