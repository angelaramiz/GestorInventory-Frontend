/**
 * ConfigurationUIService - Servicio especializado para la interfaz de configuraciones
 * 
 * Este servicio maneja la interfaz de usuario del sistema de configuraciones,
 * incluyendo formularios, validaciones y sincronización con ConfigurationService.
 * 
 * @class ConfigurationUIService
 * @extends BaseService
 * @author Angel Aramiz
 * @version 2.0.0
 */

import { BaseService } from '../base/BaseService.js';
import { configurationService } from './ConfigurationService.js';

class ConfigurationUIService extends BaseService {
    constructor() {
        super('ConfigurationUIService');
        
        // Referencias a elementos DOM
        this.elements = {
            // Información de usuario
            userInfo: null,
            profileInfo: null,
            
            // Configuración de tema e idioma
            themeSelect: null,
            languageSelect: null,
            
            // Google Services
            googleDriveApiKey: null,
            googleSheetsApiKey: null,
            googleSheetsId: null,
            
            // Sincronización
            autoSyncEnabled: null,
            syncInterval: null,
            manualSyncBtn: null,
            
            // Notificaciones
            browserNotifications: null,
            soundNotifications: null,
            lowStockAlerts: null,
            
            // Botones de acción
            changePasswordBtn: null,
            exportConfigBtn: null,
            importConfigBtn: null,
            importConfigFile: null,
            resetSyncBtn: null
        };
        
        // Estado del formulario
        this.formState = {
            isDirty: false,
            isSubmitting: false,
            validationErrors: {}
        };
        
        this.debug('ConfigurationUIService inicializado');
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
            this.debug('Inicializando ConfigurationUIService...');

            // Esperar a que ConfigurationService esté listo
            await this.waitForConfigurationService();
            
            // Cachear elementos DOM
            this.cacheElements();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar datos en la interfaz
            this.loadUserInformation();
            this.loadConfigurationInInterface();
            
            // Verificar permisos y estado
            this.checkPermissions();
            this.updateSystemStatus();

            this.status = 'initialized';
            this.emit('initialized');
            this.debug('ConfigurationUIService inicializado correctamente');

        } catch (error) {
            this.status = 'error';
            this.error('Error al inicializar ConfigurationUIService:', error);
            throw error;
        }
    }

    /**
     * Esperar a que ConfigurationService esté disponible
     */
    async waitForConfigurationService() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (configurationService && configurationService.status === 'initialized') {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('ConfigurationService no disponible después de espera');
    }

    /**
     * Cachear elementos DOM
     */
    cacheElements() {
        try {
            // Información de usuario
            this.elements.userInfo = document.getElementById('userInfo');
            this.elements.profileInfo = document.getElementById('profileInfo');
            
            // Configuración de tema e idioma
            this.elements.themeSelect = document.getElementById('themeSelect');
            this.elements.languageSelect = document.getElementById('languageSelect');
            
            // Google Services
            this.elements.googleDriveApiKey = document.getElementById('googleDriveApiKey');
            this.elements.googleSheetsApiKey = document.getElementById('googleSheetsApiKey');
            this.elements.googleSheetsId = document.getElementById('googleSheetsId');
            
            // Sincronización
            this.elements.autoSyncEnabled = document.getElementById('autoSyncEnabled');
            this.elements.syncInterval = document.getElementById('syncInterval');
            this.elements.manualSyncBtn = document.getElementById('manualSyncBtn');
            
            // Notificaciones
            this.elements.browserNotifications = document.getElementById('browserNotifications');
            this.elements.soundNotifications = document.getElementById('soundNotifications');
            this.elements.lowStockAlerts = document.getElementById('lowStockAlerts');
            
            // Botones de acción
            this.elements.changePasswordBtn = document.getElementById('changePasswordBtn');
            this.elements.exportConfigBtn = document.getElementById('exportConfigBtn');
            this.elements.importConfigBtn = document.getElementById('importConfigBtn');
            this.elements.importConfigFile = document.getElementById('importConfigFile');
            this.elements.resetSyncBtn = document.getElementById('resetSyncBtn');
            
            this.debug('Elementos DOM cacheados');
            
        } catch (error) {
            this.warn('Error al cachear elementos DOM:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        try {
            // Cambio de tema
            if (this.elements.themeSelect) {
                this.elements.themeSelect.addEventListener('change', (e) => {
                    this.handleThemeChange(e.target.value);
                });
            }
            
            // Cambio de idioma
            if (this.elements.languageSelect) {
                this.elements.languageSelect.addEventListener('change', (e) => {
                    this.handleLanguageChange(e.target.value);
                });
            }
            
            // Google Services
            this.setupGoogleServiceListeners();
            
            // Sincronización
            this.setupSyncListeners();
            
            // Notificaciones
            this.setupNotificationListeners();
            
            // Botones de acción
            this.setupActionListeners();
            
            // Listeners del ConfigurationService
            this.setupConfigurationServiceListeners();
            
            this.debug('Event listeners configurados');
            
        } catch (error) {
            this.error('Error al configurar event listeners:', error);
        }
    }

    /**
     * Configurar listeners de Google Services
     */
    setupGoogleServiceListeners() {
        // Campos de credenciales
        if (this.elements.googleDriveApiKey) {
            this.elements.googleDriveApiKey.addEventListener('change', (e) => {
                this.handleGoogleCredentialChange('driveApiKey', e.target.value.trim());
            });
        }
        
        if (this.elements.googleSheetsApiKey) {
            this.elements.googleSheetsApiKey.addEventListener('change', (e) => {
                this.handleGoogleCredentialChange('sheetsApiKey', e.target.value.trim());
            });
        }
        
        if (this.elements.googleSheetsId) {
            this.elements.googleSheetsId.addEventListener('change', (e) => {
                this.handleGoogleCredentialChange('sheetsId', e.target.value.trim());
            });
        }
        
        // Botones de mostrar/ocultar contraseñas
        const toggleDriveKey = document.getElementById('toggleDriveKey');
        const toggleSheetsKey = document.getElementById('toggleSheetsKey');
        
        if (toggleDriveKey) {
            toggleDriveKey.addEventListener('click', () => {
                this.togglePasswordVisibility('googleDriveApiKey');
            });
        }
        
        if (toggleSheetsKey) {
            toggleSheetsKey.addEventListener('click', () => {
                this.togglePasswordVisibility('googleSheetsApiKey');
            });
        }
        
        // Botones de acción Google
        const testGoogleBtn = document.getElementById('testGoogleBtn');
        const saveGoogleBtn = document.getElementById('saveGoogleBtn');
        const clearGoogleBtn = document.getElementById('clearGoogleBtn');
        
        if (testGoogleBtn) {
            testGoogleBtn.addEventListener('click', () => this.testGoogleConnection());
        }
        
        if (saveGoogleBtn) {
            saveGoogleBtn.addEventListener('click', () => this.saveGoogleCredentials());
        }
        
        if (clearGoogleBtn) {
            clearGoogleBtn.addEventListener('click', () => this.clearGoogleCredentials());
        }
    }

    /**
     * Configurar listeners de sincronización
     */
    setupSyncListeners() {
        if (this.elements.autoSyncEnabled) {
            this.elements.autoSyncEnabled.addEventListener('change', (e) => {
                this.handleAutoSyncChange(e.target.checked);
            });
        }
        
        if (this.elements.syncInterval) {
            this.elements.syncInterval.addEventListener('change', (e) => {
                this.handleSyncIntervalChange(parseInt(e.target.value));
            });
        }
        
        if (this.elements.manualSyncBtn) {
            this.elements.manualSyncBtn.addEventListener('click', () => {
                this.performManualSync();
            });
        }
        
        if (this.elements.resetSyncBtn) {
            this.elements.resetSyncBtn.addEventListener('click', () => {
                this.resetConfiguration();
            });
        }
    }

    /**
     * Configurar listeners de notificaciones
     */
    setupNotificationListeners() {
        if (this.elements.browserNotifications) {
            this.elements.browserNotifications.addEventListener('change', (e) => {
                this.handleNotificationChange('browser', e.target.checked);
            });
        }
        
        if (this.elements.soundNotifications) {
            this.elements.soundNotifications.addEventListener('change', (e) => {
                this.handleNotificationChange('sound', e.target.checked);
            });
        }
        
        if (this.elements.lowStockAlerts) {
            this.elements.lowStockAlerts.addEventListener('change', (e) => {
                this.handleNotificationChange('lowStock', e.target.checked);
            });
        }
    }

    /**
     * Configurar listeners de botones de acción
     */
    setupActionListeners() {
        if (this.elements.changePasswordBtn) {
            this.elements.changePasswordBtn.addEventListener('click', () => {
                this.showPasswordChangeModal();
            });
        }
        
        if (this.elements.exportConfigBtn) {
            this.elements.exportConfigBtn.addEventListener('click', () => {
                this.exportConfiguration();
            });
        }
        
        if (this.elements.importConfigBtn) {
            this.elements.importConfigBtn.addEventListener('click', () => {
                if (this.elements.importConfigFile) {
                    this.elements.importConfigFile.click();
                }
            });
        }
        
        if (this.elements.importConfigFile) {
            this.elements.importConfigFile.addEventListener('change', (e) => {
                this.importConfiguration(e);
            });
        }
    }

    /**
     * Configurar listeners del ConfigurationService
     */
    setupConfigurationServiceListeners() {
        configurationService.on('configurationUpdated', (data) => {
            this.handleConfigurationUpdate(data);
        });
        
        configurationService.on('themeChanged', (data) => {
            this.updateThemeSelect(data.newTheme);
        });
        
        configurationService.on('syncStarted', () => {
            this.showSyncInProgress(true);
        });
        
        configurationService.on('syncCompleted', () => {
            this.showSyncInProgress(false);
            this.showSuccessMessage('Sincronización completada');
        });
        
        configurationService.on('syncError', (error) => {
            this.showSyncInProgress(false);
            this.showErrorMessage(`Error en sincronización: ${error.message}`);
        });
    }

    /**
     * Cargar información del usuario
     */
    loadUserInformation() {
        try {
            const email = localStorage.getItem('email') || 'usuario@ejemplo.com';
            const rol = localStorage.getItem('rol') || 'Usuario';
            const nombre = localStorage.getItem('nombre') || 'Usuario';
            const usuario_id = localStorage.getItem('usuario_id') || 'N/A';

            // Actualizar header si existe
            if (this.elements.userInfo) {
                this.elements.userInfo.textContent = `${nombre} (${rol})`;
            }

            // Actualizar perfil si existe
            if (this.elements.profileInfo) {
                this.elements.profileInfo.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="font-medium text-gray-600">Nombre:</span>
                            <span class="text-gray-800">${nombre}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-medium text-gray-600">Email:</span>
                            <span class="text-gray-800">${email}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-medium text-gray-600">Rol:</span>
                            <span class="text-gray-800">${rol}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-medium text-gray-600">ID Usuario:</span>
                            <span class="text-gray-800">${usuario_id}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-medium text-gray-600">Último acceso:</span>
                            <span class="text-gray-800">${new Date().toLocaleString('es-ES')}</span>
                        </div>
                    </div>
                `;
            }
            
            this.debug('Información de usuario cargada');
            
        } catch (error) {
            this.error('Error al cargar información de usuario:', error);
        }
    }

    /**
     * Cargar configuración en la interfaz
     */
    loadConfigurationInInterface() {
        try {
            const config = configurationService.getConfiguration();
            
            // Tema
            if (this.elements.themeSelect) {
                this.elements.themeSelect.value = config.theme;
            }
            
            // Idioma
            if (this.elements.languageSelect) {
                this.elements.languageSelect.value = config.language;
            }
            
            // Google Services
            if (this.elements.googleDriveApiKey) {
                this.elements.googleDriveApiKey.value = config.google.driveApiKey;
            }
            if (this.elements.googleSheetsApiKey) {
                this.elements.googleSheetsApiKey.value = config.google.sheetsApiKey;
            }
            if (this.elements.googleSheetsId) {
                this.elements.googleSheetsId.value = config.google.sheetsId;
            }
            
            // Sincronización
            if (this.elements.autoSyncEnabled) {
                this.elements.autoSyncEnabled.checked = config.autoSync;
            }
            if (this.elements.syncInterval) {
                this.elements.syncInterval.value = config.syncInterval;
            }
            
            // Notificaciones
            if (this.elements.browserNotifications) {
                this.elements.browserNotifications.checked = config.notifications.browser;
            }
            if (this.elements.soundNotifications) {
                this.elements.soundNotifications.checked = config.notifications.sound;
            }
            if (this.elements.lowStockAlerts) {
                this.elements.lowStockAlerts.checked = config.notifications.lowStock;
            }
            
            this.debug('Configuración cargada en interfaz');
            
        } catch (error) {
            this.error('Error al cargar configuración en interfaz:', error);
        }
    }

    /**
     * Manejar cambio de tema
     */
    handleThemeChange(theme) {
        try {
            configurationService.setTheme(theme);
            this.showSuccessMessage('Tema actualizado correctamente');
            this.markFormDirty();
        } catch (error) {
            this.showErrorMessage('Error al cambiar tema');
            this.error('Error al cambiar tema:', error);
        }
    }

    /**
     * Manejar cambio de idioma
     */
    handleLanguageChange(language) {
        try {
            configurationService.setLanguage(language);
            this.markFormDirty();
            
            // Mostrar modal de confirmación para recarga
            this.showLanguageChangeConfirmation();
            
        } catch (error) {
            this.showErrorMessage('Error al cambiar idioma');
            this.error('Error al cambiar idioma:', error);
        }
    }

    /**
     * Manejar cambio de credenciales de Google
     */
    handleGoogleCredentialChange(key, value) {
        try {
            const currentGoogle = configurationService.get('google') || {};
            const newGoogle = { ...currentGoogle, [key]: value };
            
            configurationService.setGoogleCredentials(newGoogle);
            this.markFormDirty();
            
        } catch (error) {
            this.showErrorMessage('Error al actualizar credenciales');
            this.error('Error al actualizar credenciales de Google:', error);
        }
    }

    /**
     * Manejar cambio de sincronización automática
     */
    handleAutoSyncChange(enabled) {
        try {
            const interval = this.elements.syncInterval ? parseInt(this.elements.syncInterval.value) : 5;
            configurationService.configureAutoSync(enabled, interval);
            
            const message = enabled ? 'Sincronización automática habilitada' : 'Sincronización automática deshabilitada';
            this.showSuccessMessage(message);
            
        } catch (error) {
            this.showErrorMessage('Error al configurar sincronización');
            this.error('Error al configurar sincronización:', error);
        }
    }

    /**
     * Manejar cambio de intervalo de sincronización
     */
    handleSyncIntervalChange(interval) {
        try {
            if (interval >= 1 && interval <= 60) {
                const autoSync = this.elements.autoSyncEnabled ? this.elements.autoSyncEnabled.checked : false;
                configurationService.configureAutoSync(autoSync, interval);
            }
        } catch (error) {
            this.error('Error al cambiar intervalo de sincronización:', error);
        }
    }

    /**
     * Manejar cambio de notificaciones
     */
    handleNotificationChange(type, enabled) {
        try {
            const currentNotifications = configurationService.get('notifications') || {};
            const newNotifications = { ...currentNotifications, [type]: enabled };
            
            configurationService.configureNotifications(newNotifications);
            this.markFormDirty();
            
        } catch (error) {
            this.showErrorMessage('Error al configurar notificaciones');
            this.error('Error al configurar notificaciones:', error);
        }
    }

    /**
     * Alternar visibilidad de contraseña
     */
    togglePasswordVisibility(elementId) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.type = element.type === 'password' ? 'text' : 'password';
            }
        } catch (error) {
            this.warn('Error al alternar visibilidad de contraseña:', error);
        }
    }

    /**
     * Probar conexión con Google
     */
    async testGoogleConnection() {
        try {
            const btn = document.getElementById('testGoogleBtn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Probando...';
                btn.disabled = true;
                
                const result = await configurationService.testGoogleConnection();
                
                if (result.success) {
                    this.showGoogleConnectionSuccess(result.results);
                }
                
                btn.textContent = originalText;
                btn.disabled = false;
            }
            
        } catch (error) {
            this.showErrorMessage(`Error en la conexión: ${error.message}`);
            
            const btn = document.getElementById('testGoogleBtn');
            if (btn) {
                btn.textContent = 'Probar Conexión';
                btn.disabled = false;
            }
        }
    }

    /**
     * Mostrar resultado exitoso de conexión Google
     */
    showGoogleConnectionSuccess(results) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Prueba de Conexión',
                html: `
                    <div class="text-left">
                        <p class="mb-3">Resultados de la prueba:</p>
                        <ul class="list-disc list-inside space-y-1">
                            ${results.map(resultado => `<li class="text-sm">✅ ${resultado}</li>`).join('')}
                        </ul>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Entendido'
            });
        }
    }

    /**
     * Realizar sincronización manual
     */
    async performManualSync() {
        try {
            await configurationService.performSync();
        } catch (error) {
            this.showErrorMessage('Error en sincronización manual');
        }
    }

    /**
     * Exportar configuración
     */
    exportConfiguration() {
        try {
            configurationService.exportConfiguration();
            this.showSuccessMessage('Configuración exportada correctamente');
        } catch (error) {
            this.showErrorMessage('Error al exportar configuración');
        }
    }

    /**
     * Importar configuración
     */
    async importConfiguration(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            await configurationService.importConfiguration(file);
            this.loadConfigurationInInterface();
            this.showSuccessMessage('Configuración importada correctamente');
            
        } catch (error) {
            this.showErrorMessage('Error al importar configuración');
        }
    }

    /**
     * Resetear configuración
     */
    resetConfiguration() {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '¿Resetear configuración?',
                text: 'Esto restaurará todos los valores por defecto.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, resetear',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    configurationService.resetConfiguration();
                    this.loadConfigurationInInterface();
                    this.showSuccessMessage('Configuración reseteada');
                }
            });
        }
    }

    /**
     * Mostrar confirmación de cambio de idioma
     */
    showLanguageChangeConfirmation() {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Idioma actualizado',
                text: 'Los cambios se aplicarán cuando recargues la página. ¿Quieres recargar ahora?',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Recargar página',
                cancelButtonText: 'Más tarde'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.reload();
                }
            });
        }
    }

    /**
     * Marcar formulario como modificado
     */
    markFormDirty() {
        this.formState.isDirty = true;
        this.emit('formDirty', this.formState);
    }

    /**
     * Mostrar progreso de sincronización
     */
    showSyncInProgress(inProgress) {
        if (this.elements.manualSyncBtn) {
            this.elements.manualSyncBtn.textContent = inProgress ? 'Sincronizando...' : 'Sincronizar';
            this.elements.manualSyncBtn.disabled = inProgress;
        }
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccessMessage(message) {
        this.emit('successMessage', message);
        // Importar función de logs si está disponible
        if (typeof mostrarAlertaBurbuja !== 'undefined') {
            mostrarAlertaBurbuja(message, 'success');
        }
    }

    /**
     * Mostrar mensaje de error
     */
    showErrorMessage(message) {
        this.emit('errorMessage', message);
        // Importar función de logs si está disponible
        if (typeof mostrarAlertaBurbuja !== 'undefined') {
            mostrarAlertaBurbuja(message, 'error');
        }
    }

    /**
     * Verificar permisos
     */
    checkPermissions() {
        // Implementar verificación de permisos según sea necesario
        this.debug('Permisos verificados');
    }

    /**
     * Actualizar estado del sistema
     */
    updateSystemStatus() {
        // Implementar actualización de estado del sistema
        this.debug('Estado del sistema actualizado');
    }

    /**
     * Limpiar recursos del servicio
     */
    cleanup() {
        try {
            this.elements = {};
            this.formState = { isDirty: false, isSubmitting: false, validationErrors: {} };
            
            super.cleanup();
            this.debug('Recursos de ConfigurationUIService limpiados');
            
        } catch (error) {
            this.error('Error al limpiar recursos:', error);
        }
    }
}

// Crear instancia singleton
export const configurationUIService = new ConfigurationUIService();

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        configurationUIService.initialize().catch(error => {
            console.warn('ConfigurationUIService auto-inicialización falló:', error.message);
        });
    });
    
    // Si ya está cargado
    if (document.readyState !== 'loading') {
        configurationUIService.initialize().catch(error => {
            console.warn('ConfigurationUIService auto-inicialización falló:', error.message);
        });
    }
}

export default ConfigurationUIService;
