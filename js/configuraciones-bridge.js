/**
 * Archivo puente para configuraciones.js
 * 
 * Este archivo mantiene la compatibilidad hacia atrás con el código existente
 * que depende de las funciones de configuraciones.js, dirigiendo las llamadas
 * a los nuevos servicios especializados.
 * 
 * @file configuraciones-bridge.js
 * @author Angel Aramiz
 * @version 2.0.0
 */

// Importar servicios especializados
import { configurationService } from '../core/services/ConfigurationService.js';
import { configurationUIService } from '../core/services/ConfigurationUIService.js';

/**
 * Inicializar sistema de configuraciones
 */
export async function initConfiguraciones() {
    try {
        console.log('🔄 Inicializando servicios de configuraciones...');
        
        // Inicializar servicios en paralelo
        await Promise.all([
            configurationService.initialize(),
            configurationUIService.initialize()
        ]);
        
        console.log('✅ Servicios de configuraciones inicializados');
        return true;
        
    } catch (error) {
        console.error('❌ Error al inicializar servicios de configuraciones:', error);
        throw error;
    }
}

/**
 * Clase ConfiguracionesManager para compatibilidad hacia atrás
 */
export class ConfiguracionesManager {
    constructor() {
        this.config = configurationService.getConfiguration();
        this.themeManager = window.themeManager;
        
        // Auto-inicialización cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.inicializarPostDOM();
            });
        } else {
            this.inicializarPostDOM();
        }
    }
    
    async inicializarPostDOM() {
        try {
            await initConfiguraciones();
            this.sincronizarTemas();
            this.inicializar();
        } catch (error) {
            console.error('Error en inicialización post-DOM:', error);
        }
    }
    
    sincronizarTemas() {
        // Delegado al ConfigurationService
        return configurationService.synchronizeThemes();
    }
    
    inicializar() {
        this.mostrarInformacionUsuario();
        this.cargarConfiguracionesEnInterfaz();
        this.configurarEventos();
        this.verificarPermisos();
        this.actualizarEstadoSistema();
        this.configurarNotificaciones();
    }
    
    mostrarInformacionUsuario() {
        return configurationUIService.loadUserInformation();
    }
    
    cargarConfiguracionesEnInterfaz() {
        return configurationUIService.loadConfigurationInInterface();
    }
    
    configurarEventos() {
        // Los eventos ya están configurados en ConfigurationUIService
        console.log('Eventos configurados por ConfigurationUIService');
    }
    
    verificarPermisos() {
        return configurationUIService.checkPermissions();
    }
    
    actualizarEstadoSistema() {
        return configurationUIService.updateSystemStatus();
    }
    
    configurarNotificaciones() {
        const notifications = configurationService.get('notifications');
        if (notifications?.browser) {
            configurationService.requestNotificationPermission();
        }
    }
    
    cargarConfiguracion() {
        return configurationService.loadConfiguration();
    }
    
    guardarConfiguracion() {
        return configurationService.saveConfiguration();
    }
    
    cambiarTema(nuevoTema) {
        return configurationService.setTheme(nuevoTema);
    }
    
    cambiarIdioma(nuevoIdioma) {
        return configurationService.setLanguage(nuevoIdioma);
    }
    
    configurarSincronizacionAutomatica(habilitada) {
        return configurationService.configureAutoSync(habilitada);
    }
    
    cambiarIntervaloSincronizacion(nuevoIntervalo) {
        const autoSync = configurationService.get('autoSync');
        return configurationService.configureAutoSync(autoSync, nuevoIntervalo);
    }
    
    iniciarSincronizacionAutomatica() {
        return configurationService.startAutoSync();
    }
    
    detenerSincronizacionAutomatica() {
        return configurationService.stopAutoSync();
    }
    
    async sincronizarManualmente() {
        return await configurationService.performSync();
    }
    
    guardarCredencialesGoogle() {
        return configurationUIService.saveGoogleCredentials();
    }
    
    limpiarCredencialesGoogle() {
        return configurationUIService.clearGoogleCredentials();
    }
    
    async probarConexionGoogle() {
        return await configurationService.testGoogleConnection();
    }
    
    exportarConfiguracion() {
        return configurationService.exportConfiguration();
    }
    
    async importarConfiguracion(event) {
        return await configurationUIService.importConfiguration(event);
    }
    
    resetearConfiguracion() {
        return configurationService.resetConfiguration();
    }
    
    togglePasswordVisibility(elementId) {
        return configurationUIService.togglePasswordVisibility(elementId);
    }
}

/**
 * Funciones de compatibilidad hacia atrás
 */

export function cargarConfiguracion() {
    return configurationService.loadConfiguration();
}

export function guardarConfiguracion() {
    return configurationService.saveConfiguration();
}

export function obtenerConfiguracion() {
    return configurationService.getConfiguration();
}

export function obtenerConfiguracionClave(clave) {
    return configurationService.get(clave);
}

export function establecerConfiguracion(clave, valor, guardar = true) {
    return configurationService.set(clave, valor, guardar);
}

export function cambiarTema(tema) {
    return configurationService.setTheme(tema);
}

export function cambiarIdioma(idioma) {
    return configurationService.setLanguage(idioma);
}

export function configurarSincronizacion(habilitada, intervalo = null) {
    return configurationService.configureAutoSync(habilitada, intervalo);
}

export function configurarNotificaciones(configuracion) {
    return configurationService.configureNotifications(configuracion);
}

export function configurarGoogle(credenciales) {
    return configurationService.setGoogleCredentials(credenciales);
}

export async function probarConexionGoogle() {
    return await configurationService.testGoogleConnection();
}

export function exportarConfiguracion() {
    return configurationService.exportConfiguration();
}

export async function importarConfiguracion(archivo) {
    return await configurationService.importConfiguration(archivo);
}

export function resetearConfiguracion() {
    return configurationService.resetConfiguration();
}

export function sincronizarManualmente() {
    return configurationService.performSync();
}

export function mostrarInformacionUsuario() {
    return configurationUIService.loadUserInformation();
}

export function cargarInterfazConfiguraciones() {
    return configurationUIService.loadConfigurationInInterface();
}

export function togglePasswordVisibility(elementId) {
    return configurationUIService.togglePasswordVisibility(elementId);
}

/**
 * Configuración por defecto exportada para compatibilidad
 */
export const DEFAULT_CONFIG = {
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

/**
 * Exportar servicios para acceso directo
 */
export {
    configurationService,
    configurationUIService
};

/**
 * Variables globales para compatibilidad hacia atrás
 */
if (typeof window !== 'undefined') {
    // Crear instancia global del manager para compatibilidad
    window.configuracionesManager = new ConfiguracionesManager();
    
    // Exponer funciones globalmente
    window.configuraciones = {
        cargarConfiguracion,
        guardarConfiguracion,
        obtenerConfiguracion,
        obtenerConfiguracionClave,
        establecerConfiguracion,
        cambiarTema,
        cambiarIdioma,
        configurarSincronizacion,
        configurarNotificaciones,
        configurarGoogle,
        probarConexionGoogle,
        exportarConfiguracion,
        importarConfiguracion,
        resetearConfiguracion,
        sincronizarManualmente,
        mostrarInformacionUsuario,
        cargarInterfazConfiguraciones,
        togglePasswordVisibility,
        DEFAULT_CONFIG
    };
    
    // Exponer servicios
    window.configurationServices = {
        configuration: configurationService,
        ui: configurationUIService
    };
    
    // Auto-inicialización cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        initConfiguraciones().catch(error => {
            console.warn('Auto-inicialización de configuraciones falló:', error.message);
        });
    });
    
    // Si el DOM ya está cargado
    if (document.readyState !== 'loading') {
        initConfiguraciones().catch(error => {
            console.warn('Auto-inicialización de configuraciones falló:', error.message);
        });
    }
}

export default {
    initConfiguraciones,
    ConfiguracionesManager,
    cargarConfiguracion,
    guardarConfiguracion,
    obtenerConfiguracion,
    obtenerConfiguracionClave,
    establecerConfiguracion,
    cambiarTema,
    cambiarIdioma,
    configurarSincronizacion,
    configurarNotificaciones,
    configurarGoogle,
    probarConexionGoogle,
    exportarConfiguracion,
    importarConfiguracion,
    resetearConfiguracion,
    sincronizarManualmente,
    mostrarInformacionUsuario,
    cargarInterfazConfiguraciones,
    togglePasswordVisibility,
    DEFAULT_CONFIG,
    
    // Servicios
    services: {
        configuration: configurationService,
        ui: configurationUIService
    }
};
