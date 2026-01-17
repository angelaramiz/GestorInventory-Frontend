/**
 * @fileoverview Utilidad para validación de contraseñas
 * @module utils/password-validator
 * @since 1.0.0
 * 
 * Centraliza la lógica de validación de contraseñas para evitar duplicación de código
 * Implementa requisitos de seguridad para contraseñas en toda la aplicación
 */

/**
 * Valida la fortaleza de una contraseña según los requisitos de la aplicación
 * @param {string} password - La contraseña a validar
 * @returns {Object} Objeto con resultado de validación { isValid: boolean, error: string|null }
 */
export function validatePassword(password) {
    if (!password) {
        return { isValid: false, error: 'La contraseña es obligatoria' };
    }

    if (password.length < 8) {
        return { isValid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    const tieneLetra = /[a-zA-Z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);

    if (!tieneLetra || !tieneNumero) {
        return { isValid: false, error: 'La contraseña debe contener al menos una letra y un número' };
    }

    return { isValid: true, error: null };
}

/**
 * Valida que dos contraseñas coincidan
 * @param {string} password1 - Primera contraseña
 * @param {string} password2 - Segunda contraseña (confirmación)
 * @returns {Object} Objeto con resultado de validación { isValid: boolean, error: string|null }
 */
export function validatePasswordMatch(password1, password2) {
    if (password1 !== password2) {
        return { isValid: false, error: 'Las contraseñas no coinciden' };
    }
    return { isValid: true, error: null };
}

/**
 * Valida contraseña y confirmación en un solo paso
 * @param {string} password - Contraseña
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {Object} Objeto con resultado de validación { isValid: boolean, error: string|null }
 */
export function validatePasswordWithConfirmation(password, confirmPassword) {
    // Primero validar fortaleza
    const strengthValidation = validatePassword(password);
    if (!strengthValidation.isValid) {
        return strengthValidation;
    }

    // Luego validar coincidencia
    return validatePasswordMatch(password, confirmPassword);
}
