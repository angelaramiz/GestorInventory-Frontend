// Script de prueba para verificar sincronización de temas
console.log('🧪 Iniciando pruebas de sincronización de temas...');

// Función para mostrar el estado actual
function mostrarEstado() {
    console.group('📊 Estado actual de temas');
    
    // ThemeManager
    if (window.themeManager) {
        console.log('ThemeManager disponible:', true);
        console.log('Tema actual:', window.themeManager.currentTheme);
        console.log('Tema real:', window.themeManager.getActualTheme());
    } else {
        console.log('ThemeManager disponible:', false);
    }
    
    // localStorage
    console.log('localStorage tema:', localStorage.getItem('gestorInventory_theme'));
    console.log('localStorage tema actualizado:', localStorage.getItem('gestorInventory_themeLastUpdate'));
    
    // Configuraciones
    try {
        const config = JSON.parse(localStorage.getItem('gestorInventory_config') || '{}');
        console.log('Config tema:', config.theme);
        console.log('Config actualizada:', localStorage.getItem('gestorInventory_configLastUpdate'));
    } catch (e) {
        console.log('Error leyendo config:', e.message);
    }
    
    // DOM
    console.log('Clase en body:', document.body.className);
    console.log('Clase en html:', document.documentElement.className);
    console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
    
    console.groupEnd();
}

// Función para probar cambio de tema
function probarCambioTema(tema) {
    console.log(`🎨 Probando cambio a tema: ${tema}`);
    
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
    console.log('🧹 Reseteando todos los temas...');
    
    localStorage.removeItem('gestorInventory_theme');
    localStorage.removeItem('gestorInventory_themeLastUpdate');
    
    const config = JSON.parse(localStorage.getItem('gestorInventory_config') || '{}');
    delete config.theme;
    localStorage.setItem('gestorInventory_config', JSON.stringify(config));
    
    console.log('✅ Reset completado. Recarga la página para ver el tema por defecto.');
}

// Función para sincronizar manualmente
function sincronizarManualmente() {
    console.log('🔄 Forzando sincronización manual...');
    
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
        console.log('🚀 Probando secuencia completa...');
        mostrarEstado();
        
        setTimeout(() => probarCambioTema('dark'), 1000);
        setTimeout(() => probarCambioTema('light'), 2000);
        setTimeout(() => probarCambioTema('auto'), 3000);
        setTimeout(() => {
            console.log('✅ Secuencia completada');
            mostrarEstado();
        }, 4000);
    }
};

// Mostrar estado inicial al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🎯 Pruebas de tema disponibles en window.temaDebug');
        console.log('Comandos disponibles:');
        console.log('- temaDebug.mostrarEstado()');
        console.log('- temaDebug.probarCambioTema("dark"|"light"|"auto")');
        console.log('- temaDebug.resetearTemas()');
        console.log('- temaDebug.sincronizarManualmente()');
        console.log('- temaDebug.probarSecuencia()');
        
        mostrarEstado();
    }, 500);
});
