// Importaciones necesarias
import { mostrarMensaje, mostrarAlertaBurbuja } from './logs.js';
import { isTokenExpired, mostrarDialogoSesionExpirada, verificarTokenAutomaticamente } from './auth.js';

// Configuración por defecto
const defaultConfig = {
    backendUrl: 'http://localhost:3000',
    theme: 'light',
    language: 'es',
    autoSync: true,
    syncInterval: 5,
    notifications: {
        browser: true,
        sound: true,
        lowStock: true,
        lowStockThreshold: 10
    }
};

class ConfiguracionesManager {
    constructor() {
        this.config = this.loadConfig();
        this.init();
    }

    init() {
        this.cargarInformacionUsuario();
        this.cargarConfiguracionesActuales();
        this.configurarEventListeners();
        this.verificarPermisos();
        this.actualizarEstadoConexion();
        this.actualizarUltimaSincronizacion();
    }

    // Cargar configuración desde localStorage
    loadConfig() {
        const savedConfig = localStorage.getItem('appConfig');
        return savedConfig ? { ...defaultConfig, ...JSON.parse(savedConfig) } : defaultConfig;
    }

    // Guardar configuración en localStorage
    saveConfig() {
        localStorage.setItem('appConfig', JSON.stringify(this.config));
        mostrarAlertaBurbuja('Configuración guardada correctamente', 'success');
    }

    // Cargar información del usuario
    cargarInformacionUsuario() {
        const email = localStorage.getItem('email');
        const rol = localStorage.getItem('rol');
        const nombre = localStorage.getItem('nombre') || 'Usuario';
        
        document.getElementById('userInfo').textContent = `${nombre} (${rol})`;
        
        const profileInfo = document.getElementById('profileInfo');
        profileInfo.innerHTML = `
            <div class="space-y-2">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Rol:</strong> ${rol}</p>
                <p><strong>Nombre:</strong> ${nombre}</p>
                <p><strong>Último acceso:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `;
    }

    // Cargar configuraciones actuales en la interfaz
    cargarConfiguracionesActuales() {
        // URL del Backend
        document.getElementById('backendUrl').value = this.config.backendUrl;
        document.getElementById('currentBackendUrl').textContent = this.config.backendUrl;

        // Tema
        document.getElementById('themeSelect').value = this.config.theme;

        // Idioma
        document.getElementById('languageSelect').value = this.config.language;

        // Sincronización
        document.getElementById('autoSyncEnabled').checked = this.config.autoSync;
        document.getElementById('syncInterval').value = this.config.syncInterval;

        // Notificaciones
        document.getElementById('browserNotifications').checked = this.config.notifications.browser;
        document.getElementById('soundNotifications').checked = this.config.notifications.sound;
        document.getElementById('lowStockAlerts').checked = this.config.notifications.lowStock;
        document.getElementById('lowStockThreshold').value = this.config.notifications.lowStockThreshold;

        // Aplicar tema actual
        this.aplicarTema();
    }

    // Verificar permisos del usuario
    verificarPermisos() {
        const rol = localStorage.getItem('rol');
        
        // Solo administradores pueden cambiar algunas configuraciones
        if (rol !== 'Administrador') {
            document.getElementById('backendUrl').disabled = true;
            document.getElementById('updateBackendBtn').disabled = true;
            document.getElementById('resetSyncBtn').disabled = true;
            
            // Agregar mensaje informativo
            const systemConfigDiv = document.querySelector('h2:contains("Configuraciones del Sistema")').parentElement;
            const warningDiv = document.createElement('div');
            warningDiv.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4';
            warningDiv.innerHTML = '<p><strong>Nota:</strong> Algunas configuraciones están restringidas para su rol.</p>';
            systemConfigDiv.insertBefore(warningDiv, systemConfigDiv.children[1]);
        }
    }

    // Configurar event listeners
    configurarEventListeners() {
        // Botón de cerrar sesión
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.cerrarSesion();
        });

        // Cambiar contraseña
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            this.mostrarDialogoCambiarContrasena();
        });

        // Actualizar URL del backend
        document.getElementById('updateBackendBtn').addEventListener('click', () => {
            this.actualizarBackendUrl();
        });

        // Cambio de tema
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.config.theme = e.target.value;
            this.aplicarTema();
            this.saveConfig();
        });

        // Cambio de idioma
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.config.language = e.target.value;
            this.saveConfig();
            mostrarAlertaBurbuja('Idioma actualizado. Recarga la página para ver los cambios.', 'info');
        });

        // Configuraciones de sincronización
        document.getElementById('autoSyncEnabled').addEventListener('change', (e) => {
            this.config.autoSync = e.target.checked;
            this.saveConfig();
        });

        document.getElementById('syncInterval').addEventListener('change', (e) => {
            this.config.syncInterval = parseInt(e.target.value);
            this.saveConfig();
        });

        // Sincronización manual
        document.getElementById('manualSyncBtn').addEventListener('click', () => {
            this.sincronizacionManual();
        });

        // Reset sincronización
        document.getElementById('resetSyncBtn').addEventListener('click', () => {
            this.resetearConfiguracion();
        });

        // Configuraciones de notificaciones
        document.getElementById('browserNotifications').addEventListener('change', (e) => {
            this.config.notifications.browser = e.target.checked;
            this.configurarNotificaciones();
            this.saveConfig();
        });

        document.getElementById('soundNotifications').addEventListener('change', (e) => {
            this.config.notifications.sound = e.target.checked;
            this.saveConfig();
        });

        document.getElementById('lowStockAlerts').addEventListener('change', (e) => {
            this.config.notifications.lowStock = e.target.checked;
            this.saveConfig();
        });

        document.getElementById('lowStockThreshold').addEventListener('change', (e) => {
            this.config.notifications.lowStockThreshold = parseInt(e.target.value);
            this.saveConfig();
        });

        // Exportar/Importar configuración
        document.getElementById('exportConfigBtn').addEventListener('click', () => {
            this.exportarConfiguracion();
        });

        document.getElementById('importConfigBtn').addEventListener('click', () => {
            document.getElementById('importConfigFile').click();
        });

        document.getElementById('importConfigFile').addEventListener('change', (e) => {
            this.importarConfiguracion(e);
        });
    }

    // Aplicar tema
    aplicarTema() {
        const body = document.body;
        body.classList.remove('theme-light', 'theme-dark');
        
        if (this.config.theme === 'dark') {
            body.classList.add('theme-dark');
        } else if (this.config.theme === 'auto') {
            // Detectar preferencia del sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add('theme-light');
        }
    }

    // Cerrar sesión
    cerrarSesion() {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: '¿Estás seguro de que quieres cerrar sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }

    // Mostrar diálogo para cambiar contraseña
    async mostrarDialogoCambiarContrasena() {
        const { value: formValues } = await Swal.fire({
            title: 'Cambiar Contraseña',
            html: `
                <div class="space-y-4">
                    <input id="currentPassword" type="password" class="swal2-input" placeholder="Contraseña actual">
                    <input id="newPassword" type="password" class="swal2-input" placeholder="Nueva contraseña">
                    <input id="confirmPassword" type="password" class="swal2-input" placeholder="Confirmar nueva contraseña">
                </div>
            `,
            focusConfirm: false,
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
                    Swal.showValidationMessage('La nueva contraseña debe tener al menos 6 caracteres');
                    return false;
                }

                return { currentPassword, newPassword };
            }
        });

        if (formValues) {
            // Aquí implementarías la lógica para cambiar la contraseña
            // Por ahora, solo mostramos un mensaje de éxito
            mostrarAlertaBurbuja('Contraseña cambiada correctamente', 'success');
        }
    }

    // Actualizar URL del backend
    actualizarBackendUrl() {
        const newUrl = document.getElementById('backendUrl').value.trim();
        
        if (!newUrl) {
            mostrarAlertaBurbuja('Por favor, ingresa una URL válida', 'error');
            return;
        }

        try {
            new URL(newUrl); // Validar URL
            this.config.backendUrl = newUrl;
            document.getElementById('currentBackendUrl').textContent = newUrl;
            this.saveConfig();
            mostrarAlertaBurbuja('URL del backend actualizada correctamente', 'success');
        } catch (error) {
            mostrarAlertaBurbuja('URL inválida. Por favor, verifica el formato.', 'error');
        }
    }

    // Configurar notificaciones del navegador
    async configurarNotificaciones() {
        if (this.config.notifications.browser) {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        this.config.notifications.browser = false;
                        document.getElementById('browserNotifications').checked = false;
                        mostrarAlertaBurbuja('Permisos de notificación denegados', 'warning');
                    }
                }
            } else {
                mostrarAlertaBurbuja('Este navegador no soporta notificaciones', 'warning');
                this.config.notifications.browser = false;
                document.getElementById('browserNotifications').checked = false;
            }
        }
    }

    // Sincronización manual
    async sincronizacionManual() {
        const btn = document.getElementById('manualSyncBtn');
        const originalText = btn.textContent;
        
        btn.textContent = 'Sincronizando...';
        btn.disabled = true;

        try {
            // Aquí implementarías la lógica de sincronización real
            // Por ahora, simulamos una sincronización
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            mostrarAlertaBurbuja('Sincronización completada', 'success');
            this.actualizarUltimaSincronizacion();
        } catch (error) {
            mostrarAlertaBurbuja('Error durante la sincronización', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Resetear configuración
    resetearConfiguracion() {
        Swal.fire({
            title: '¿Resetear configuración?',
            text: 'Esto restaurará todas las configuraciones a sus valores por defecto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, resetear',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.config = { ...defaultConfig };
                this.cargarConfiguracionesActuales();
                this.saveConfig();
                mostrarAlertaBurbuja('Configuración reseteada correctamente', 'success');
            }
        });
    }

    // Exportar configuración
    exportarConfiguracion() {
        const configToExport = {
            ...this.config,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const dataStr = JSON.stringify(configToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `config-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        mostrarAlertaBurbuja('Configuración exportada correctamente', 'success');
    }

    // Importar configuración
    importarConfiguracion(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedConfig = JSON.parse(e.target.result);
                
                // Validar estructura básica
                if (!importedConfig || typeof importedConfig !== 'object') {
                    throw new Error('Formato de archivo inválido');
                }

                // Merge con configuración por defecto para asegurar completitud
                this.config = { ...defaultConfig, ...importedConfig };
                this.cargarConfiguracionesActuales();
                this.saveConfig();
                
                mostrarAlertaBurbuja('Configuración importada correctamente', 'success');
            } catch (error) {
                mostrarAlertaBurbuja('Error al importar configuración: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    // Actualizar estado de conexión
    actualizarEstadoConexion() {
        const statusElement = document.getElementById('connectionStatus');
        
        if (navigator.onLine) {
            statusElement.textContent = 'Conectado';
            statusElement.className = 'text-lg text-green-600';
        } else {
            statusElement.textContent = 'Sin conexión';
            statusElement.className = 'text-lg text-red-600';
        }

        // Actualizar cada 5 segundos
        setTimeout(() => this.actualizarEstadoConexion(), 5000);
    }

    // Actualizar última sincronización
    actualizarUltimaSincronizacion() {
        const lastSync = localStorage.getItem('lastSync');
        const lastSyncElement = document.getElementById('lastSync');
        
        if (lastSync) {
            const date = new Date(lastSync);
            lastSyncElement.textContent = date.toLocaleString();
        } else {
            lastSyncElement.textContent = 'Nunca';
        }
        
        // Guardar timestamp actual
        localStorage.setItem('lastSync', new Date().toISOString());
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    if (isTokenExpired()) {
        mostrarDialogoSesionExpirada();
        return;
    }

    // Inicializar verificación automática de token
    verificarTokenAutomaticamente();

    // Inicializar manager de configuraciones
    new ConfiguracionesManager();
});
