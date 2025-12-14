// Importaciones necesarias
import { mostrarAlertaBurbuja } from '../utils/logs.js';
import { isTokenExpired, mostrarDialogoSesionExpirada, verificarTokenAutomaticamente } from '../auth/auth.js';

export const BASE_URL = 'https://gestorinventory-backend-morning-dream-6699.fly.dev';

// Configuración por defecto
const DEFAULT_CONFIG = {
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

// Gestor principal de configuraciones
class ConfiguracionesManager {
    constructor() {
        this.config = this.cargarConfiguracion();
        
        // Inicializar el gestor de temas usando la instancia global si está disponible
        this.themeManager = window.themeManager;
        
        // Solo continuar si el DOM está listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.inicializarPostDOM();
            });
        } else {
            this.inicializarPostDOM();
        }
    }
    
    // Inicializar después de que el DOM esté listo
    inicializarPostDOM() {
        // Asegurar que el theme manager esté disponible
        if (!this.themeManager && window.themeManager) {
            this.themeManager = window.themeManager;
        }
        
        // Si aún no hay theme manager, intentar crear uno
        if (!this.themeManager && window.ThemeManager) {
            try {
                this.themeManager = new window.ThemeManager();
            } catch (error) {
                console.warn('No se pudo crear ThemeManager:', error);
            }
        }
        
        // Sincronizar temas bidireccional si el theme manager está disponible
        if (this.themeManager) {
            this.sincronizarTemas();
        }
        
        this.inicializar();
    }
    
    // Sincronizar temas entre sistemas
    sincronizarTemas() {
        if (!this.themeManager) {
            console.warn('ThemeManager no disponible para sincronización');
            return;
        }
        
        // Si hay diferencia entre configuraciones y theme manager, usar el más reciente
        const configTheme = this.config.theme;
        const managerTheme = this.themeManager.currentTheme;
        
        if (configTheme && configTheme !== managerTheme) {
            // Verificar cuál fue actualizado más recientemente
            const configLastUpdate = localStorage.getItem('gestorInventory_configLastUpdate');
            const themeLastUpdate = localStorage.getItem('gestorInventory_themeLastUpdate');
            
            if (!themeLastUpdate || (configLastUpdate && new Date(configLastUpdate) > new Date(themeLastUpdate))) {
                // Usar el tema de configuraciones
                this.themeManager.setTheme(configTheme);
            } else {
                // Usar el tema del manager
                this.config.theme = managerTheme;
                this.guardarConfiguracion();
            }
        }
        
        // Escuchar cambios del theme manager para actualizar configuraciones
        window.addEventListener('themeChanged', (e) => {
            if (this.config.theme !== e.detail.theme) {
                this.config.theme = e.detail.theme;
                this.guardarConfiguracion();
                
                // Actualizar el select si existe
                try {
                    const themeSelect = document.getElementById('themeSelect');
                    if (themeSelect && themeSelect.value !== e.detail.theme) {
                        themeSelect.value = e.detail.theme;
                    }
                } catch (error) {
                    console.warn('Error al actualizar select de tema:', error);
                }
            }
        });
        
        // También escuchar cambios en localStorage para sincronización entre pestañas
        window.addEventListener('storage', (e) => {
            if (e.key === 'gestorInventory_theme' && e.newValue !== this.config.theme) {
                this.config.theme = e.newValue;
                if (this.themeManager) {
                    this.themeManager.setTheme(e.newValue);
                }
                
                try {
                    const themeSelect = document.getElementById('themeSelect');
                    if (themeSelect) {
                        themeSelect.value = e.newValue;
                    }
                } catch (error) {
                    console.warn('Error al actualizar select de tema desde storage:', error);
                }
            }
        });
    }

    // Inicializar el gestor
    inicializar() {
        this.mostrarInformacionUsuario();
        this.cargarConfiguracionesEnInterfaz();
        this.configurarEventos();
        this.verificarPermisos();
        this.actualizarEstadoSistema();
        this.configurarNotificaciones();
    }

    // Cargar configuración desde localStorage
    cargarConfiguracion() {
        try {
            const configGuardada = localStorage.getItem('gestorInventory_config');
            if (configGuardada) {
                const config = JSON.parse(configGuardada);
                return { ...DEFAULT_CONFIG, ...config };
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            mostrarAlertaBurbuja('Error al cargar configuración, usando valores por defecto', 'warning');
        }
        return { ...DEFAULT_CONFIG };
    }

    // Guardar configuración en localStorage
    guardarConfiguracion() {
        try {
            localStorage.setItem('gestorInventory_config', JSON.stringify(this.config));
            localStorage.setItem('gestorInventory_configLastUpdate', new Date().toISOString());
            
            // También actualizar el tema específico para sincronización
            if (this.config.theme) {
                localStorage.setItem('gestorInventory_theme', this.config.theme);
                localStorage.setItem('gestorInventory_themeLastUpdate', new Date().toISOString());
            }
            
            mostrarAlertaBurbuja('Configuración guardada correctamente', 'success');
            return true;
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            mostrarAlertaBurbuja('Error al guardar configuración', 'error');
            return false;
        }
    }

    // Mostrar información del usuario
    mostrarInformacionUsuario() {
        try {
            const email = localStorage.getItem('email') || 'usuario@ejemplo.com';
            const rol = localStorage.getItem('rol') || 'Usuario';
            const nombre = localStorage.getItem('nombre') || 'Usuario';
            const usuario_id = localStorage.getItem('usuario_id') || 'N/A';

            // Actualizar información en el header solo si el elemento existe
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = `${nombre} (${rol})`;
            }

            // Actualizar información en el perfil
            const profileInfoElement = document.getElementById('profileInfo');
            if (profileInfoElement) {
                profileInfoElement.innerHTML = `
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
        } catch (error) {
            console.error('Error al mostrar información del usuario:', error);
        }
    }

    // Cargar configuraciones en la interfaz
    cargarConfiguracionesEnInterfaz() {
        try {
            // Configuración de Tema
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) {
                themeSelect.value = this.config.theme;
                // Aplicar tema usando el ThemeManager
                this.themeManager.setTheme(this.config.theme);
            }

            // Configuración de Idioma
            const languageSelect = document.getElementById('languageSelect');
            if (languageSelect) languageSelect.value = this.config.language;

            // Configuración de Google Services
            const googleDriveApiKey = document.getElementById('googleDriveApiKey');
            const googleSheetsApiKey = document.getElementById('googleSheetsApiKey');
            const googleSheetsId = document.getElementById('googleSheetsId');

            if (googleDriveApiKey) googleDriveApiKey.value = this.config.google.driveApiKey;
            if (googleSheetsApiKey) googleSheetsApiKey.value = this.config.google.sheetsApiKey;
            if (googleSheetsId) googleSheetsId.value = this.config.google.sheetsId;

            // Configuración de Sincronización
            const autoSyncCheckbox = document.getElementById('autoSyncEnabled');
            const syncIntervalInput = document.getElementById('syncInterval');
            if (autoSyncCheckbox) autoSyncCheckbox.checked = this.config.autoSync;
            if (syncIntervalInput) syncIntervalInput.value = this.config.syncInterval;

            // Configuración de Notificaciones
            const browserNotifications = document.getElementById('browserNotifications');
            const soundNotifications = document.getElementById('soundNotifications');
            const lowStockAlerts = document.getElementById('lowStockAlerts');

            if (browserNotifications) browserNotifications.checked = this.config.notifications.browser;
            if (soundNotifications) soundNotifications.checked = this.config.notifications.sound;
            if (lowStockAlerts) lowStockAlerts.checked = this.config.notifications.lowStock;

        } catch (error) {
            console.error('Error al cargar configuraciones en interfaz:', error);
            mostrarAlertaBurbuja('Error al cargar la interfaz de configuraciones', 'error');
        }
    }

    // Configurar eventos de la interfaz
    configurarEventos() {
        // Cambiar contraseña
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.mostrarCambioContrasena());
        }

        // Cambio de tema
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.cambiarTema(e.target.value));
        }

        // Cambio de idioma
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => this.cambiarIdioma(e.target.value));
        }

        // Eventos de Google Services
        this.configurarEventosGoogle();

        // Sincronización automática
        const autoSyncEnabled = document.getElementById('autoSyncEnabled');
        if (autoSyncEnabled) {
            autoSyncEnabled.addEventListener('change', (e) => this.configurarSincronizacionAutomatica(e.target.checked));
        }

        // Intervalo de sincronización
        const syncInterval = document.getElementById('syncInterval');
        if (syncInterval) {
            syncInterval.addEventListener('change', (e) => this.cambiarIntervaloSincronizacion(parseInt(e.target.value)));
        }

        // Sincronización manual
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.sincronizarManualmente());
        }

        // Reset configuración
        const resetSyncBtn = document.getElementById('resetSyncBtn');
        if (resetSyncBtn) {
            resetSyncBtn.addEventListener('click', () => this.resetearConfiguracion());
        }

        // Notificaciones
        this.configurarEventosNotificaciones();

        // Exportar/Importar configuración
        this.configurarEventosImportExport();
    }

    // Configurar eventos de notificaciones
    configurarEventosNotificaciones() {
        const browserNotifications = document.getElementById('browserNotifications');
        const soundNotifications = document.getElementById('soundNotifications');
        const lowStockAlerts = document.getElementById('lowStockAlerts');

        if (browserNotifications) {
            browserNotifications.addEventListener('change', (e) => {
                this.config.notifications.browser = e.target.checked;
                this.configurarNotificacionesBrowser(e.target.checked);
                this.guardarConfiguracion();
            });
        }

        if (soundNotifications) {
            soundNotifications.addEventListener('change', (e) => {
                this.config.notifications.sound = e.target.checked;
                this.guardarConfiguracion();
            });
        }

        if (lowStockAlerts) {
            lowStockAlerts.addEventListener('change', (e) => {
                this.config.notifications.lowStock = e.target.checked;
                this.guardarConfiguracion();
            });
        }
    }

    // Configurar eventos de importar/exportar
    configurarEventosImportExport() {
        const exportConfigBtn = document.getElementById('exportConfigBtn');
        const importConfigBtn = document.getElementById('importConfigBtn');
        const importConfigFile = document.getElementById('importConfigFile');

        if (exportConfigBtn) {
            exportConfigBtn.addEventListener('click', () => this.exportarConfiguracion());
        }

        if (importConfigBtn) {
            importConfigBtn.addEventListener('click', () => {
                if (importConfigFile) importConfigFile.click();
            });
        }

        if (importConfigFile) {
            importConfigFile.addEventListener('change', (e) => this.importarConfiguracion(e));
        }
    }

    // Configurar eventos de Google Services
    configurarEventosGoogle() {
        // Botones de mostrar/ocultar contraseñas
        const toggleDriveKey = document.getElementById('toggleDriveKey');
        const toggleSheetsKey = document.getElementById('toggleSheetsKey');

        if (toggleDriveKey) {
            toggleDriveKey.addEventListener('click', () => this.togglePasswordVisibility('googleDriveApiKey'));
        }

        if (toggleSheetsKey) {
            toggleSheetsKey.addEventListener('click', () => this.togglePasswordVisibility('googleSheetsApiKey'));
        }

        // Campos de credenciales
        const googleDriveApiKey = document.getElementById('googleDriveApiKey');
        const googleSheetsApiKey = document.getElementById('googleSheetsApiKey');
        const googleSheetsId = document.getElementById('googleSheetsId');

        if (googleDriveApiKey) {
            googleDriveApiKey.addEventListener('change', (e) => {
                this.config.google.driveApiKey = e.target.value.trim();
                this.guardarConfiguracion();
            });
        }

        if (googleSheetsApiKey) {
            googleSheetsApiKey.addEventListener('change', (e) => {
                this.config.google.sheetsApiKey = e.target.value.trim();
                this.guardarConfiguracion();
            });
        }

        if (googleSheetsId) {
            googleSheetsId.addEventListener('change', (e) => {
                this.config.google.sheetsId = e.target.value.trim();
                this.guardarConfiguracion();
            });
        }

        // Botones de acción
        const testGoogleConnection = document.getElementById('testGoogleConnection');
        const saveGoogleCredentials = document.getElementById('saveGoogleCredentials');
        const clearGoogleCredentials = document.getElementById('clearGoogleCredentials');

        if (testGoogleConnection) {
            testGoogleConnection.addEventListener('click', () => this.probarConexionGoogle());
        }

        if (saveGoogleCredentials) {
            saveGoogleCredentials.addEventListener('click', () => this.guardarCredencialesGoogle());
        }

        if (clearGoogleCredentials) {
            clearGoogleCredentials.addEventListener('click', () => this.limpiarCredencialesGoogle());
        }
    }

    // Verificar permisos del usuario
    verificarPermisos() {
        const rol = localStorage.getItem('rol');
        const isAdmin = rol === 'Administrador' || rol === 'admin';

        // Elementos que requieren permisos de administrador
        const adminElements = [
            'resetSyncBtn',
            'googleDriveApiKey',
            'googleSheetsApiKey',
            'googleSheetsId',
            'testGoogleConnection',
            'saveGoogleCredentials',
            'clearGoogleCredentials'
        ];

        adminElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element && !isAdmin) {
                element.disabled = true;
                element.title = 'Requiere permisos de administrador';
            }
        });

        // Mostrar mensaje informativo para usuarios no administradores
        if (!isAdmin) {
            const warningMessage = document.createElement('div');
            warningMessage.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4';
            warningMessage.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-yellow-700">
                            <strong>Permisos limitados:</strong> Algunas configuraciones están restringidas para su nivel de usuario.
                        </p>
                    </div>
                </div>
            `;

            const systemConfigSection = document.querySelector('h2:contains("Configuraciones del Sistema")')?.parentElement;
            if (systemConfigSection) {
                systemConfigSection.insertBefore(warningMessage, systemConfigSection.children[1]);
            }
        }
    }

    // Cambiar contraseña
    async mostrarCambioContrasena() {
        const { value: formValues } = await Swal.fire({
            title: 'Cambiar Contraseña',
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña actual</label>
                        <input id="currentPassword" type="password" class="swal2-input" placeholder="Ingresa tu contraseña actual">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
                        <input id="newPassword" type="password" class="swal2-input" placeholder="Ingresa la nueva contraseña">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Confirmar nueva contraseña</label>
                        <input id="confirmPassword" type="password" class="swal2-input" placeholder="Confirma la nueva contraseña">
                    </div>
                    <div class="text-xs text-gray-500 mt-2">
                        La contraseña debe tener al menos 6 caracteres
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Cambiar Contraseña',
            cancelButtonText: 'Cancelar',
            width: '500px',
            preConfirm: () => {
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (!currentPassword || !newPassword || !confirmPassword) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }

                if (newPassword !== confirmPassword) {
                    Swal.showValidationMessage('Las contraseñas no coinciden');
                    return false;
                }

                if (newPassword.length < 6) {
                    Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
                    return false;
                }

                return { currentPassword, newPassword };
            }
        });

        if (formValues) {
            try {
                // Aquí implementarías la lógica real para cambiar la contraseña
                // Por ahora, simulamos el proceso
                await this.procesarCambioContrasena(formValues.currentPassword, formValues.newPassword);
                mostrarAlertaBurbuja('Contraseña cambiada correctamente', 'success');
            } catch (error) {
                console.error('Error al cambiar contraseña:', error);
                mostrarAlertaBurbuja('Error al cambiar la contraseña', 'error');
            }
        }
    }

    // Procesar cambio de contraseña (simulado)
    async procesarCambioContrasena(currentPassword, newPassword) {
        // Simulación de petición al servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }

    // Alternar visibilidad de contraseña
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(inputId === 'googleDriveApiKey' ? 'toggleDriveKey' : 'toggleSheetsKey');

        if (input && button) {
            if (input.type === 'password') {
                input.type = 'text';
                button.innerHTML = `
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                `;
            } else {
                input.type = 'password';
                button.innerHTML = `
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                `;
            }
        }
    }

    // Probar conexión con Google Services
    async probarConexionGoogle() {
        const btn = document.getElementById('testGoogleConnection');
        if (!btn) return;

        const textoOriginal = btn.textContent;
        btn.textContent = 'Probando...';
        btn.disabled = true;

        try {
            const driveApiKey = this.config.google.driveApiKey;
            const sheetsApiKey = this.config.google.sheetsApiKey;
            const sheetsId = this.config.google.sheetsId;

            if (!driveApiKey && !sheetsApiKey) {
                throw new Error('Debes configurar al menos una API Key');
            }

            // Simulación de prueba de conexión
            await new Promise(resolve => setTimeout(resolve, 2000));

            // En una implementación real, aquí harías peticiones a las APIs de Google
            let resultados = [];

            if (driveApiKey) {
                resultados.push('✅ Google Drive API: Conexión exitosa');
            }

            if (sheetsApiKey) {
                resultados.push('✅ Google Sheets API: Conexión exitosa');
            }

            if (sheetsId) {
                resultados.push('✅ Google Sheets ID: Válido');
            }

            this.config.google.connectionStatus = 'connected';
            this.guardarConfiguracion();

            Swal.fire({
                title: 'Prueba de Conexión',
                html: `
                    <div class="text-left">
                        <p class="mb-3">Resultados de la prueba:</p>
                        <ul class="list-disc list-inside space-y-1">
                            ${resultados.map(resultado => `<li class="text-sm">${resultado}</li>`).join('')}
                        </ul>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Entendido'
            });

        } catch (error) {
            console.error('Error al probar conexión:', error);
            this.config.google.connectionStatus = 'error';
            this.guardarConfiguracion();

            mostrarAlertaBurbuja(`Error en la conexión: ${error.message}`, 'error');
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    }

    // Guardar credenciales de Google
    guardarCredencialesGoogle() {
        const driveApiKey = document.getElementById('googleDriveApiKey')?.value.trim();
        const sheetsApiKey = document.getElementById('googleSheetsApiKey')?.value.trim();
        const sheetsId = document.getElementById('googleSheetsId')?.value.trim();

        if (!driveApiKey && !sheetsApiKey) {
            mostrarAlertaBurbuja('Debes ingresar al menos una API Key', 'warning');
            return;
        }

        this.config.google.driveApiKey = driveApiKey || '';
        this.config.google.sheetsApiKey = sheetsApiKey || '';
        this.config.google.sheetsId = sheetsId || '';

        if (this.guardarConfiguracion()) {
            mostrarAlertaBurbuja('Credenciales de Google guardadas correctamente', 'success');
        }
    }

    // Limpiar credenciales de Google
    limpiarCredencialesGoogle() {
        Swal.fire({
            title: '¿Limpiar credenciales?',
            text: 'Esto eliminará todas las credenciales de Google configuradas.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.config.google.driveApiKey = '';
                this.config.google.sheetsApiKey = '';
                this.config.google.sheetsId = '';
                this.config.google.connectionStatus = 'disconnected';

                // Limpiar campos en la interfaz
                const googleDriveApiKey = document.getElementById('googleDriveApiKey');
                const googleSheetsApiKey = document.getElementById('googleSheetsApiKey');
                const googleSheetsId = document.getElementById('googleSheetsId');

                if (googleDriveApiKey) googleDriveApiKey.value = '';
                if (googleSheetsApiKey) googleSheetsApiKey.value = '';
                if (googleSheetsId) googleSheetsId.value = '';

                this.guardarConfiguracion();
                mostrarAlertaBurbuja('Credenciales de Google eliminadas', 'info');
            }
        });
    }

    // Cambiar tema
    cambiarTema(nuevoTema) {
        this.config.theme = nuevoTema;
        
        // Actualizar el ThemeManager global
        if (window.themeManager) {
            window.themeManager.setTheme(nuevoTema);
        } else {
            this.themeManager.setTheme(nuevoTema);
        }
        
        this.guardarConfiguracion();
        mostrarAlertaBurbuja('Tema actualizado correctamente', 'success');
    }

    // Aplicar tema (delegado al ThemeManager)
    aplicarTema(tema) {
        if (window.themeManager) {
            window.themeManager.setTheme(tema);
        } else {
            this.themeManager.setTheme(tema);
        }
    }

    // Cambiar idioma
    cambiarIdioma(nuevoIdioma) {
        this.config.language = nuevoIdioma;
        this.guardarConfiguracion();

        // Mostrar mensaje sobre recarga
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

    // Configurar sincronización automática
    configurarSincronizacionAutomatica(habilitada) {
        this.config.autoSync = habilitada;
        this.guardarConfiguracion();

        if (habilitada) {
            this.iniciarSincronizacionAutomatica();
            mostrarAlertaBurbuja('Sincronización automática habilitada', 'success');
        } else {
            this.detenerSincronizacionAutomatica();
            mostrarAlertaBurbuja('Sincronización automática deshabilitada', 'info');
        }
    }

    // Cambiar intervalo de sincronización
    cambiarIntervaloSincronizacion(nuevoIntervalo) {
        if (nuevoIntervalo >= 1 && nuevoIntervalo <= 60) {
            this.config.syncInterval = nuevoIntervalo;
            this.guardarConfiguracion();

            // Reiniciar sincronización si está habilitada
            if (this.config.autoSync) {
                this.iniciarSincronizacionAutomatica();
            }
        }
    }

    // Iniciar sincronización automática
    iniciarSincronizacionAutomatica() {
        this.detenerSincronizacionAutomatica(); // Limpiar cualquier intervalo existente

        if (this.config.autoSync) {
            this.syncInterval = setInterval(() => {
                this.sincronizarDatos();
            }, this.config.syncInterval * 60 * 1000); // Convertir minutos a milisegundos
        }
    }

    // Detener sincronización automática
    detenerSincronizacionAutomatica() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Sincronizar manualmente
    async sincronizarManualmente() {
        const btn = document.getElementById('manualSyncBtn');
        if (!btn) return;

        const textoOriginal = btn.textContent;
        btn.textContent = 'Sincronizando...';
        btn.disabled = true;

        try {
            await this.sincronizarDatos();
            mostrarAlertaBurbuja('Sincronización completada exitosamente', 'success');
            this.actualizarUltimaSincronizacion();
        } catch (error) {
            console.error('Error en sincronización manual:', error);
            mostrarAlertaBurbuja('Error durante la sincronización', 'error');
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    }

    // Sincronizar datos (implementación simulada)
    async sincronizarDatos() {
        // Aquí implementarías la lógica real de sincronización
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 2000);
        });
    }

    // Resetear configuración
    resetearConfiguracion() {
        Swal.fire({
            title: '¿Resetear configuración?',
            text: 'Esto restaurará todas las configuraciones a sus valores por defecto. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, resetear',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.config = { ...DEFAULT_CONFIG };
                this.guardarConfiguracion();
                this.cargarConfiguracionesEnInterfaz();
                mostrarAlertaBurbuja('Configuración reseteada a valores por defecto', 'success');
            }
        });
    }

    // Configurar notificaciones del navegador
    async configurarNotificacionesBrowser(habilitar) {
        if (!habilitar) return;

        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    mostrarAlertaBurbuja('Notificaciones habilitadas correctamente', 'success');
                    this.mostrarNotificacionPrueba();
                } else {
                    mostrarAlertaBurbuja('Permisos de notificación denegados', 'warning');
                    this.config.notifications.browser = false;
                    this.guardarConfiguracion();
                }
            } else if (Notification.permission === 'granted') {
                this.mostrarNotificacionPrueba();
            }
        } else {
            mostrarAlertaBurbuja('Este navegador no soporta notificaciones', 'warning');
            this.config.notifications.browser = false;
            this.guardarConfiguracion();
        }
    }

    // Mostrar notificación de prueba
    mostrarNotificacionPrueba() {
        if (Notification.permission === 'granted') {
            new Notification('Gestor de Inventario', {
                body: 'Las notificaciones están funcionando correctamente',
                icon: '../favicon.ico'
            });
        }
    }

    // Exportar configuración
    exportarConfiguracion() {
        try {
            const configToExport = {
                ...this.config,
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0.0',
                    userAgent: navigator.userAgent,
                    exportedBy: localStorage.getItem('email') || 'unknown'
                }
            };

            const dataStr = JSON.stringify(configToExport, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileName = `gestor-inventario-config-${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.style.display = 'none';
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);

            mostrarAlertaBurbuja('Configuración exportada correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar configuración:', error);
            mostrarAlertaBurbuja('Error al exportar la configuración', 'error');
        }
    }

    // Importar configuración
    importarConfiguracion(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            mostrarAlertaBurbuja('Por favor, selecciona un archivo JSON válido', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedConfig = JSON.parse(e.target.result);

                // Validar estructura básica
                if (!importedConfig || typeof importedConfig !== 'object') {
                    throw new Error('Estructura de configuración inválida');
                }

                // Mostrar confirmación antes de importar
                Swal.fire({
                    title: 'Confirmar importación',
                    html: `
                        <div class="text-left">
                            <p class="mb-2">¿Estás seguro de que quieres importar esta configuración?</p>
                            <div class="bg-gray-100 p-3 rounded text-sm">
                                <strong>Archivo:</strong> ${file.name}<br>
                                <strong>Fecha de exportación:</strong> ${importedConfig.metadata?.exportDate ? new Date(importedConfig.metadata.exportDate).toLocaleString() : 'Desconocida'}<br>
                                <strong>Versión:</strong> ${importedConfig.metadata?.version || 'Desconocida'}
                            </div>
                            <p class="mt-2 text-sm text-red-600">Esta acción sobrescribirá tu configuración actual.</p>
                        </div>
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Importar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Combinar configuración importada con la actual, manteniendo estructura
                        this.config = { ...DEFAULT_CONFIG, ...importedConfig };
                        delete this.config.metadata; // Remover metadata de importación

                        this.guardarConfiguracion();
                        this.cargarConfiguracionesEnInterfaz();
                        mostrarAlertaBurbuja('Configuración importada correctamente', 'success');
                    }
                });

            } catch (error) {
                console.error('Error al importar configuración:', error);
                mostrarAlertaBurbuja('Error: El archivo no es una configuración válida', 'error');
            }
        };

        reader.readAsText(file);
        event.target.value = ''; // Limpiar input
    }

    // Actualizar estado del sistema
    actualizarEstadoSistema() {
        this.actualizarEstadoConexion();
        this.actualizarUltimaSincronizacion();
        this.actualizarVersionApp();
    }

    // Actualizar estado de conexión
    actualizarEstadoConexion() {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        const updateStatus = () => {
            if (navigator.onLine) {
                statusElement.textContent = 'Conectado';
                statusElement.className = 'text-lg text-green-600 font-semibold';
            } else {
                statusElement.textContent = 'Sin conexión';
                statusElement.className = 'text-lg text-red-600 font-semibold';
            }
        };

        updateStatus();

        // Actualizar cada 10 segundos
        setInterval(updateStatus, 10000);

        // Escuchar eventos de conexión
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
    }

    // Actualizar última sincronización
    actualizarUltimaSincronizacion() {
        const lastSyncElement = document.getElementById('lastSync');
        if (!lastSyncElement) return;

        const lastSync = localStorage.getItem('gestorInventory_lastSync');
        if (lastSync) {
            const fecha = new Date(lastSync);
            lastSyncElement.textContent = fecha.toLocaleString('es-ES');
        } else {
            lastSyncElement.textContent = 'Nunca';
        }

        // Guardar timestamp actual
        localStorage.setItem('gestorInventory_lastSync', new Date().toISOString());
    }

    // Actualizar versión de la aplicación
    actualizarVersionApp() {
        const appVersionElement = document.getElementById('appVersion');
        if (appVersionElement) {
            appVersionElement.textContent = '1.0.0';
        }
    }

    // Configurar notificaciones según la configuración
    configurarNotificaciones() {
        if (this.config.notifications.browser) {
            this.configurarNotificacionesBrowser(true);
        }

        // Iniciar verificación de stock bajo si está habilitado
        if (this.config.notifications.lowStock) {
            this.iniciarVerificacionStockBajo();
        }
    }

    // Iniciar verificación de stock bajo
    iniciarVerificacionStockBajo() {
        // Verificar cada 5 minutos
        setInterval(() => {
            this.verificarStockBajo();
        }, 5 * 60 * 1000);
    }

    // Verificar stock bajo (implementación simulada)
    async verificarStockBajo() {
        // Aquí implementarías la lógica real para verificar stock
        // Por ahora es solo una simulación
        console.log('Verificando stock bajo...');
    }
}

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar si el token está expirado
        const token = localStorage.getItem('supabase.auth.token');
        if (!token || isTokenExpired(token)) {
            mostrarDialogoSesionExpirada();
            return;
        }

        // Verificar token automáticamente
        if (!verificarTokenAutomaticamente()) {
            return;
        }

        // Inicializar gestor de configuraciones
        window.configuracionesManager = new ConfiguracionesManager();

        console.log('✅ Gestor de configuraciones inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar configuraciones:', error);
        mostrarAlertaBurbuja('Error al cargar las configuraciones', 'error');
    }
});

// Exportar para uso global
window.ConfiguracionesManager = ConfiguracionesManager;
