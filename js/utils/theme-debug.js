// Script de prueba para verificar sincronización de temas
// Función para mostrar el estado actual
function mostrarEstado() {
    console.group('📊 Estado actual de temas');
    
    // ThemeManager
    if (window.themeManager) {
                            } else {
            }
    
    // localStorage
            // Configuraciones
    try {
        const config = JSON.parse(localStorage.getItem('gestorInventory_config') || '{}');
                    } catch (e) {
            }
    
    // DOM
                console.groupEnd();
}

// Función para probar cambio de tema
function probarCambioTema(tema) {
        if (window.themeManager) {
        window.themeManager.setTheme(tema);
        setTimeout(() => {
            mostrarEstado();
        }, 100);
    } else {
        console.error('ThemeManager no disponible');
    }
}

// Función para limpiar todo y empezar de cero
function resetearTemas() {
        localStorage.removeItem('gestorInventory_theme');
    localStorage.removeItem('gestorInventory_themeLastUpdate');
    
    const config = JSON.parse(localStorage.getItem('gestorInventory_config') || '{}');
    delete config.theme;
    localStorage.setItem('gestorInventory_config', JSON.stringify(config));
    
    }

// Función para sincronizar manualmente
function sincronizarManualmente() {
        if (window.themeManager) {
        window.themeManager.syncWithLocalConfig(window.themeManager.currentTheme);
        mostrarEstado();
    } else {
        console.error('ThemeManager no disponible');
    }
}

// Exponer funciones globalmente para uso en consola
window.temaDebug = {
    mostrarEstado,
    probarCambioTema,
    resetearTemas,
    sincronizarManualmente,
    probarSecuencia: () => {
                mostrarEstado();
        
        setTimeout(() => probarCambioTema('dark'), 1000);
        setTimeout(() => probarCambioTema('light'), 2000);
        setTimeout(() => probarCambioTema('auto'), 3000);
        setTimeout(() => {
                        mostrarEstado();
        }, 4000);
    }
};

// Mostrar estado inicial al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
                                                                mostrarEstado();
    }, 500);
});


