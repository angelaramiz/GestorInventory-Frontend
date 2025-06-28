// Verificador de errores de inicialización
// Este script debe ser incluido ANTES que theme-manager.js para capturar errores

console.log('🔍 Verificador de errores iniciado');

// Capturar errores globales
window.addEventListener('error', function(e) {
    console.error('❌ Error global capturado:', {
        mensaje: e.message,
        archivo: e.filename,
        linea: e.linea,
        columna: e.colno,
        error: e.error
    });
    
    // Si el error está relacionado con temas, mostrarlo prominentemente
    if (e.message.includes('theme') || e.message.includes('Theme') || 
        e.filename.includes('theme-manager') || e.filename.includes('configuraciones')) {
        console.warn('🎨 Error relacionado con sistema de temas detectado');
    }
});

// Capturar promesas rechazadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Promesa rechazada:', e.reason);
    if (e.reason && e.reason.toString().includes('theme')) {
        console.warn('🎨 Error de promesa relacionado con temas');
    }
});

// Verificar que los elementos críticos estén disponibles
function verificarDOM() {
    const elementos = ['body', 'documentElement'];
    const problemas = [];
    
    elementos.forEach(el => {
        const elemento = el === 'body' ? document.body : document.documentElement;
        if (!elemento) {
            problemas.push(el);
        }
    });
    
    if (problemas.length > 0) {
        console.warn('⚠️ Elementos DOM no disponibles:', problemas);
        return false;
    }
    
    console.log('✅ Elementos DOM básicos disponibles');
    return true;
}

// Verificar en diferentes momentos
console.log('📊 Estado inicial del DOM:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📊 DOM cargado, verificando elementos...');
        setTimeout(verificarDOM, 50);
    });
} else {
    console.log('📊 DOM ya está listo, verificando inmediatamente...');
    verificarDOM();
}

// Función de diagnóstico avanzado
window.diagnosticarTemas = function() {
    console.group('🔧 DIAGNÓSTICO COMPLETO DE TEMAS');
    
    console.log('Estado del DOM:', {
        readyState: document.readyState,
        body: !!document.body,
        documentElement: !!document.documentElement,
        bodyClassList: document.body ? document.body.classList.toString() : 'N/A',
        htmlClassList: document.documentElement ? document.documentElement.classList.toString() : 'N/A',
        dataTheme: document.documentElement ? document.documentElement.getAttribute('data-theme') : 'N/A'
    });
    
    console.log('ThemeManager disponible:', !!window.ThemeManager);
    console.log('Instancia themeManager:', !!window.themeManager);
    
    if (window.themeManager) {
        console.log('Estado del ThemeManager:', {
            currentTheme: window.themeManager.currentTheme,
            actualTheme: window.themeManager.getActualTheme()
        });
        
        // Ejecutar debug del ThemeManager
        window.themeManager.debugThemeSync();
    }
    
    console.log('LocalStorage keys relacionados:', {
        theme: localStorage.getItem('gestorInventory_theme'),
        config: localStorage.getItem('gestorInventory_config'),
        themeLastUpdate: localStorage.getItem('gestorInventory_themeLastUpdate'),
        configLastUpdate: localStorage.getItem('gestorInventory_configLastUpdate')
    });
    
    console.groupEnd();
};

// Auto-diagnóstico después de un tiempo
setTimeout(() => {
    if (window.location.search.includes('debug') || window.location.search.includes('test')) {
        window.diagnosticarTemas();
    }
}, 2000);

console.log('✅ Verificador de errores configurado correctamente');
