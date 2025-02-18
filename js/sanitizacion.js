// js/sanitization.js

/**
 * Escapa caracteres HTML especiales para prevenir inyecciones XSS.
 * @param {string} input - Entrada a sanitizar.
 * @returns {string} - Entrada sanitizada.
 */
export function sanitizarEntrada(input) {
    const tempDiv = document.createElement("div");
    tempDiv.textContent = input; // Escapa caracteres HTML especiales
    return tempDiv.innerHTML;
}

/**
 * Valida que una entrada cumpla con un patrón específico.
 * @param {string} input - Entrada a validar.
 * @param {string} tipo - Tipo de validación ("codigo", "texto", etc.).
 * @returns {boolean} - Verdadero si la entrada es válida.
 */
export function validarCampo(input, tipo) {
    const patronCodigo = /^[A-Za-z0-9\-]+$/; // Solo letras, números y guiones
    const patronTexto = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s\-\.,'()\/]+$/; // Incluye más caracteres

    switch (tipo) {
        case "codigo":
            return patronCodigo.test(input);
        case "texto":
            return patronTexto.test(input);
        default:
            return false;
    }
}

/**
 * Sanitiza y valida un objeto de producto antes de guardarlo.
 * @param {Object} producto - Objeto con los datos del producto.
 * @returns {Object|null} - Producto sanitizado o null si hay errores.
 */
export function sanitizarProducto(producto) {
    const codigo = sanitizarEntrada(producto.codigo);
    const nombre = sanitizarEntrada(producto.nombre);
    const categoria = sanitizarEntrada(producto.categoria);
    const marca = sanitizarEntrada(producto.marca);
    const unidad = sanitizarEntrada(producto.unidad);

    // Validar campos
    if (!validarCampo(codigo, "codigo") ||
        !validarCampo(nombre, "texto") ||
        !validarCampo(categoria, "texto") ||
        !validarCampo(marca, "texto") ||
        !validarCampo(unidad, "texto")) {
        console.error("Error de validación en el producto:", producto);
        return null;
    }

    return {
        codigo,
        nombre,
        categoria,
        marca,
        unidad
    };
}