// Configuración para manejo de tokens
export const TOKEN_CONFIG = {
    // Intervalo para verificar el estado del token (en milisegundos)
    CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutos
    
    // Tiempo antes de la expiración para renovar el token (en segundos)
    REFRESH_THRESHOLD: 300, // 5 minutos
    
    // Tiempo máximo de espera para operaciones de red (en milisegundos)
    NETWORK_TIMEOUT: 10000, // 10 segundos
    
    // Número máximo de reintentos para renovar token
    MAX_RETRY_ATTEMPTS: 3,
    
    // Intervalo entre reintentos (en milisegundos)
    RETRY_INTERVAL: 2000, // 2 segundos
};

// Función para obtener configuración según el entorno
export function getTokenConfig() {
    // En desarrollo, usar intervalos más frecuentes para debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return {
            ...TOKEN_CONFIG,
            CHECK_INTERVAL: 1 * 60 * 1000, // 1 minuto en desarrollo
            REFRESH_THRESHOLD: 180, // 3 minutos en desarrollo
        };
    }
    
    return TOKEN_CONFIG;
}

// Función para logging específico de tokens
export function logTokenEvent(event, data = {}) {
    const timestamp = new Date().toISOString();
    }


