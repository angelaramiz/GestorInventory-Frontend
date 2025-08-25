/**
 * Archivo puente para scanner.js
 * 
 * Este archivo mantiene la compatibilidad hacia atrás con el código existente
 * que depende de las funciones de scanner.js, dirigiendo las llamadas
 * al nuevo BasicScannerService.
 * 
 * @file scanner-bridge.js
 * @author Angel Aramiz
 * @version 2.0.0
 */

// Importar servicio especializado
import { basicScannerService } from '../core/services/BasicScannerService.js';

/**
 * Inicializar escáner básico
 */
export async function initScanner() {
    try {
        console.log('🔄 Inicializando servicio de escáner básico...');
        
        await basicScannerService.initialize();
        
        console.log('✅ Servicio de escáner básico inicializado');
        return true;
        
    } catch (error) {
        console.error('❌ Error al inicializar servicio de escáner:', error);
        throw error;
    }
}

/**
 * Función de compatibilidad para iniciar escaneo
 * @param {string} containerId - ID del contenedor (opcional)
 */
export async function iniciarEscaneo(containerId = 'reader') {
    try {
        // Verificar permisos primero
        const hasPermissions = await basicScannerService.checkCameraPermissions();
        if (!hasPermissions) {
            throw new Error('Se requiere acceso a la cámara');
        }
        
        // Mostrar contenedor si existe
        const scannerContainer = document.getElementById("scanner-container");
        if (scannerContainer) {
            scannerContainer.style.display = "block";
        }
        
        return await basicScannerService.startScanner(containerId);
        
    } catch (error) {
        console.error("Error al iniciar el escáner:", error);
        
        // Mostrar mensaje de error si la función está disponible
        if (typeof mostrarMensaje !== 'undefined') {
            mostrarMensaje("Se requiere acceso a la cámara", "error");
        }
        
        throw error;
    }
}

/**
 * Función para toggle del escáner con modal
 * @param {string} inputId - ID del input objetivo
 */
export async function toggleEscaner(inputId) {
    try {
        if (inputId) {
            // Usar modal del escáner si está disponible mostrarModalEscaneo
            if (typeof mostrarModalEscaneo !== 'undefined') {
                mostrarModalEscaneo(inputId);
            } else {
                // Fallback: usar modal del BasicScannerService
                await basicScannerService.startModalScanner(inputId);
            }
        }
    } catch (error) {
        console.error('Error en toggleEscaner:', error);
    }
}

/**
 * Detener el escáner
 */
export async function detenerEscaner() {
    try {
        return await basicScannerService.stopScanner();
    } catch (error) {
        console.error('Error al detener escáner:', error);
        return false;
    }
}

/**
 * Iniciar escáner con modal (compatibilidad)
 * @param {string} inputId - ID del input objetivo
 */
export async function iniciarEscaneoConModal(inputId) {
    try {
        return await basicScannerService.startModalScanner(inputId);
    } catch (error) {
        console.error("Error en iniciarEscaneoConModal:", error);
        
        if (typeof mostrarMensaje !== 'undefined') {
            mostrarMensaje("Error al iniciar el escáner. Verifica los permisos de la cámara.", "error");
        }
        
        throw error;
    }
}

/**
 * Manejar código escaneado (compatibilidad)
 * @param {string} codigo - Código escaneado
 * @param {Object} formato - Objeto con información del formato
 * @param {Function} callback - Callback a ejecutar
 */
export function manejarCodigoEscaneado(codigo, formato, callback) {
    try {
        // Extraer nombre del formato
        const formatName = formato?.result?.format?.formatName?.toLowerCase() || 'unknown';
        
        // Procesar código usando el servicio
        const processedCode = basicScannerService.processCodeByFormat(
            basicScannerService.sanitizeCode(codigo), 
            formatName
        );
        
        // Mostrar mensajes si la función está disponible
        if (typeof mostrarMensaje !== 'undefined') {
            mostrarMensaje(`Código escaneado: ${processedCode}`, "info");
            
            if (formatName === "code_128" && processedCode !== codigo) {
                mostrarMensaje(`Código parcial extraído: ${processedCode}`, "info");
            }
        }
        
        // Ejecutar callback
        if (callback && typeof callback === 'function') {
            callback(processedCode);
        }
        
        return processedCode;
        
    } catch (error) {
        console.error('Error al manejar código escaneado:', error);
        
        if (typeof mostrarMensaje !== 'undefined') {
            mostrarMensaje("Error al procesar código escaneado", "error");
        }
        
        return codigo; // Devolver código original en caso de error
    }
}

/**
 * Reproducir tono (compatibilidad)
 * @param {number} frequency - Frecuencia en Hz
 * @param {number} duration - Duración en segundos
 * @param {string} type - Tipo de onda
 */
export function playTone(frequency, duration, type = 'sine') {
    try {
        return basicScannerService.playTone(frequency, duration, type);
    } catch (error) {
        console.error('Error al reproducir tono:', error);
    }
}

/**
 * Configurar escáner
 * @param {Object} configuracion - Nueva configuración
 */
export function configurarEscaner(configuracion) {
    try {
        return basicScannerService.updateConfig(configuracion);
    } catch (error) {
        console.error('Error al configurar escáner:', error);
        throw error;
    }
}

/**
 * Obtener configuración del escáner
 * @returns {Object} Configuración actual
 */
export function obtenerConfiguracionEscaner() {
    try {
        return basicScannerService.getConfig();
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        return {};
    }
}

/**
 * Obtener estado del escáner
 * @returns {Object} Estado actual
 */
export function obtenerEstadoEscaner() {
    try {
        return basicScannerService.getScannerState();
    } catch (error) {
        console.error('Error al obtener estado:', error);
        return { isScanning: false };
    }
}

/**
 * Verificar si el escáner está activo
 * @returns {boolean} Si está escaneando
 */
export function isEscanerActivo() {
    try {
        return basicScannerService.getScannerState().isScanning;
    } catch (error) {
        return false;
    }
}

/**
 * Cerrar modal del escáner
 */
export async function cerrarModalEscaner() {
    try {
        return await basicScannerService.closeScannerModal();
    } catch (error) {
        console.error('Error al cerrar modal:', error);
    }
}

/**
 * Inicializar con verificación de permisos
 */
export async function inicializarConPermisos() {
    try {
        await initScanner();
        const hasPermissions = await basicScannerService.checkCameraPermissions();
        
        if (!hasPermissions) {
            console.warn('Permisos de cámara no disponibles');
            
            if (typeof mostrarMensaje !== 'undefined') {
                mostrarMensaje("Se requiere acceso a la cámara para usar el escáner", "warning");
            }
        }
        
        return hasPermissions;
        
    } catch (error) {
        console.error('Error en inicialización con permisos:', error);
        return false;
    }
}

/**
 * Manejar escáner para input específico con búsqueda automática
 * @param {string} inputId - ID del input
 * @param {string} searchType - Tipo de búsqueda
 */
export async function escanearParaInput(inputId, searchType = 'auto') {
    try {
        const callback = (code, format) => {
            // Actualizar input
            const input = document.getElementById(inputId);
            if (input) {
                input.value = code;
            }
            
            // Ejecutar búsqueda según tipo
            setTimeout(async () => {
                try {
                    switch (searchType) {
                        case 'consulta':
                            const { buscarProducto } = await import('./product-operations-bridge.js');
                            buscarProducto(code, format);
                            break;
                        case 'editar':
                            const { buscarProductoParaEditar } = await import('./product-operations-bridge.js');
                            buscarProductoParaEditar(code, format);
                            break;
                        case 'inventario':
                            const { buscarProductoInventario } = await import('./product-operations-bridge.js');
                            buscarProductoInventario(code, format);
                            break;
                        default:
                            // Auto-detectar según inputId
                            if (inputId.includes('consulta')) {
                                const { buscarProducto } = await import('./product-operations-bridge.js');
                                buscarProducto(code, format);
                            } else if (inputId.includes('editar')) {
                                const { buscarProductoParaEditar } = await import('./product-operations-bridge.js');
                                buscarProductoParaEditar(code, format);
                            } else {
                                const { buscarProductoInventario } = await import('./product-operations-bridge.js');
                                buscarProductoInventario(code, format);
                            }
                    }
                } catch (error) {
                    console.error('Error en búsqueda automática:', error);
                }
            }, 100);
        };
        
        return await basicScannerService.startModalScanner(inputId, callback);
        
    } catch (error) {
        console.error('Error en escanearParaInput:', error);
        throw error;
    }
}

/**
 * Variables globales para compatibilidad hacia atrás
 */
if (typeof window !== 'undefined') {
    // Exponer funciones globalmente
    window.scannerBasico = {
        iniciarEscaneo,
        toggleEscaner,
        detenerEscaner,
        iniciarEscaneoConModal,
        manejarCodigoEscaneado,
        playTone,
        configurarEscaner,
        obtenerConfiguracionEscaner,
        obtenerEstadoEscaner,
        isEscanerActivo,
        cerrarModalEscaner,
        inicializarConPermisos,
        escanearParaInput
    };
    
    // Exponer servicio
    window.basicScannerService = basicScannerService;
    
    // Auto-inicialización
    document.addEventListener('DOMContentLoaded', () => {
        initScanner().catch(error => {
            console.warn('Auto-inicialización de escáner básico falló:', error.message);
        });
    });
    
    // Si el DOM ya está cargado
    if (document.readyState !== 'loading') {
        initScanner().catch(error => {
            console.warn('Auto-inicialización de escáner básico falló:', error.message);
        });
    }
}

export {
    basicScannerService
};

export default {
    initScanner,
    iniciarEscaneo,
    toggleEscaner,
    detenerEscaner,
    iniciarEscaneoConModal,
    manejarCodigoEscaneado,
    playTone,
    configurarEscaner,
    obtenerConfiguracionEscaner,
    obtenerEstadoEscaner,
    isEscanerActivo,
    cerrarModalEscaner,
    inicializarConPermisos,
    escanearParaInput,
    
    // Servicio
    service: basicScannerService
};
