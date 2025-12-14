// Inicialización común del tema toggle para todas las páginas
function initializeThemeToggle() {
    // Esperar a que el DOM esté listo y que themeManager esté disponible
    document.addEventListener('DOMContentLoaded', () => {
        // Verificar que themeManager esté disponible
        if (!window.themeManager) {
            console.warn('ThemeManager no está disponible');
            return;
        }

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeIcon = document.getElementById('themeIcon');

        if (!themeToggleBtn || !themeIcon) {
            // Si no hay botón específico, crear el toggle automático
            window.themeManager.createThemeToggle();
            return;
        }

        function updateThemeIcon(theme) {
            if (theme === 'dark') {
                themeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
                    </path>
                `;
                themeToggleBtn.title = "Cambiar a modo claro";
            } else {
                themeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
                    </path>
                `;
                themeToggleBtn.title = "Cambiar a modo oscuro";
            }
        }

        // Actualizar icono inicial
        updateThemeIcon(window.themeManager.getActualTheme());

        // Manejar clic en el botón
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = window.themeManager.toggleTheme();
            updateThemeIcon(newTheme);
        });

        // Escuchar cambios de tema desde otras fuentes (como la página de configuraciones)
        window.addEventListener('themeChanged', (e) => {
            updateThemeIcon(e.detail.theme);
        });
    });
}

// Auto-inicializar
initializeThemeToggle();
