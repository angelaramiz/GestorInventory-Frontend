# Solución Error de Selector CSS

## Error Identificado
```
Uncaught (in promise) SyntaxError: Failed to parse selector " ##body:has-text("login")", invalid pseudo-class :has-text().
```

## Causa
Este error NO proviene de tu código, sino de una **extensión del navegador** (posiblemente uBlock Origin, AdBlock, o similar) que usa selectores CSS no estándar.

## Soluciones

### 1. Deshabilitar Extensiones Temporalmente
- Abre el navegador en **modo incógnito** o deshabilita extensiones
- Prueba tu aplicación sin extensiones activas

### 2. Configurar Excepción en uBlock Origin
Si usas uBlock Origin:
1. Click en el icono de uBlock Origin
2. Click en el botón "Poder" para deshabilitar en tu dominio local
3. O agrega `localhost` a la lista blanca

### 3. Ignorar Error en Consola
- Este error no afecta la funcionalidad de tu aplicación
- Proviene de `content-scripts.js` de la extensión, no de tu código

### 4. Configuración Opcional para Desarrollo
Crear archivo `.gitignore` para excluir logs de errores de extensiones:

```gitignore
# Logs de errores de extensiones
*.extension-errors.log
debug.log
```

## Verificación
Tu código CSS y JavaScript está correcto. El error es externo y no afecta la funcionalidad.
