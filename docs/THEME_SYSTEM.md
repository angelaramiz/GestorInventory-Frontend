# Sistema de Temas - Modo Oscuro

Este documento explica cómo funciona el sistema de temas implementado en el Gestor de Inventario.

## Características

✅ **Modo claro y oscuro**: Soporte completo para ambos temas
✅ **Modo automático**: Detecta la preferencia del sistema operativo
✅ **Persistencia**: El tema seleccionado se guarda en localStorage
✅ **Sincronización**: El tema se sincroniza entre todas las páginas
✅ **Botón toggle**: Presente en todas las páginas principales
✅ **Integración con configuraciones**: Selector completo en la página de configuraciones

## Archivos del Sistema

### `js/theme-manager.js`
Gestor principal del sistema de temas. Maneja:
- Carga y guardado del tema
- Aplicación de clases CSS
- Detección de preferencias del sistema
- Eventos de cambio de tema

### `js/theme-toggle.js`
Script para inicializar botones de toggle de tema en las páginas.

### `css/styles.css`
Contiene todos los estilos para modo oscuro con la clase `.theme-dark`.

## Cómo Usar

### Toggle Rápido
Cada página principal tiene un botón de sol/luna en el header que permite alternar entre modo claro y oscuro.

### Configuración Completa
En la página de configuraciones (`/plantillas/configuraciones.html`) hay un selector que permite elegir entre:
- **Claro**: Modo claro fijo
- **Oscuro**: Modo oscuro fijo  
- **Automático**: Sigue la preferencia del sistema

### Programáticamente

```javascript
// Cambiar a modo oscuro
window.themeManager.setTheme('dark');

// Cambiar a modo claro
window.themeManager.setTheme('light');

// Cambiar a modo automático
window.themeManager.setTheme('auto');

// Alternar entre claro y oscuro
window.themeManager.toggleTheme();

// Obtener tema actual
const currentTheme = window.themeManager.getTheme();
```

## Páginas Implementadas

El modo oscuro está implementado en todas las páginas:

- ✅ `index.html` (Login)
- ✅ `register.html` (Registro)
- ✅ `plantillas/main.html` (Dashboard principal)
- ✅ `plantillas/configuraciones.html` (Configuraciones)
- ✅ `plantillas/inventario.html` (Inventario)
- ✅ `plantillas/agregar.html` (Agregar producto)
- ✅ `plantillas/editar.html` (Editar producto)
- ✅ `plantillas/consulta.html` (Consulta de producto)
- ✅ `plantillas/confirm-email.html` (Confirmación de email)
- ✅ `plantillas/archivos.html` (Gestión de archivos)
- ✅ `plantillas/report.html` (Reportes)
- ✅ `plantillas/registro-entradas.html` (Registro de entradas)

## Estilos CSS

### Clases Principales
- `.theme-light`: Modo claro
- `.theme-dark`: Modo oscuro

### Elementos Styled
- Backgrounds: `bg-white`, `bg-gray-100`, `bg-gray-50`
- Textos: `text-gray-700`, `text-gray-500`, `text-gray-600`
- Bordes: `border-gray-300`, `border-gray-200`
- Inputs, selects, textareas
- Botones y sus estados hover
- Tablas y sus filas
- Modales y overlays
- Notificaciones toast
- Sombras y efectos

### Toggle Button Styles
El botón de toggle tiene estilos especiales:
- Backdrop blur effect
- Iconos dinámicos (sol para claro, luna para oscuro)
- Tooltips informativos
- Transiciones suaves

## Eventos

### `themeChanged`
Se dispara cuando cambia el tema:

```javascript
window.addEventListener('themeChanged', (e) => {
    console.log('Nuevo tema:', e.detail.theme);
});
```

## Integración

### En páginas nuevas:
1. Incluir los scripts:
```html
<script src="../js/theme-manager.js"></script>
<script src="../js/theme-toggle.js"></script>
```

2. Incluir los estilos:
```html
<link rel="stylesheet" href="../css/styles.css">
```

3. Opcionalmente, agregar botón de toggle en el header:
```html
<button id="themeToggleBtn" class="p-2 rounded-lg bg-blue-700 hover:bg-blue-800 transition-colors" title="Alternar tema">
    <svg id="themeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
        </path>
    </svg>
</button>
```

## Compatibilidad

- ✅ Chrome/Edge
- ✅ Firefox  
- ✅ Safari
- ✅ Dispositivos móviles
- ✅ Detección automática de preferencias del sistema (`prefers-color-scheme`)

## Notas Técnicas

- El tema se guarda en `localStorage` con la clave `gestorInventory_theme`
- La clase se aplica tanto al `<body>` como al `<html>`
- Se usa el atributo `data-theme` para selectores CSS avanzados
- El sistema respeta las preferencias de reducción de movimiento (`prefers-reduced-motion`)
- Todos los estilos usan `!important` para sobrescribir Tailwind CSS
