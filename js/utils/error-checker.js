// Verificador de errores de inicialización
// Este script debe ser incluido ANTES que theme-manager.js para capturar errores

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
    
        return true;
}

// Verificar en diferentes momentos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
                setTimeout(verificarDOM, 50);
    });
} else {
        verificarDOM();
}

// Función de diagnóstico avanzado
window.diagnosticarTemas = function() {
    console.group('🔧 DIAGNÓSTICO COMPLETO DE TEMAS');
    
                if (window.themeManager) {
                // Ejecutar debug del ThemeManager
        window.themeManager.debugThemeSync();
    }
    
        console.groupEnd();
};

// Auto-diagnóstico después de un tiempo
setTimeout(() => {
    if (window.location.search.includes('debug') || window.location.search.includes('test')) {
        window.diagnosticarTemas();
    }
}, 2000);


