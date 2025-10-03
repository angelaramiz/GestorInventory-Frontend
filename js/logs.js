/**
 * ARCHIVO DEPRECADO - Usar NotificationService
 * 
 * Este archivo se mantiene unicamente por compatibilidad hacia atras.
 * Todo el codigo nuevo debe usar NotificationService directamente.
 * 
 * MIGRACION:
 * - Antes: import { mostrarMensaje } from './logs.js';
 * - Ahora:  import notificationService from '../src/core/services/NotificationService.js';
 *          notificationService.mostrarMensaje(mensaje, tipo);
 * 
 * Este archivo simplemente re-exporta funciones desde logs-bridge.js
 * que a su vez delega al NotificationService moderno.
 * 
 * @deprecated v3.0.0 - Usar NotificationService
 */

// Re-exportar todas las funciones desde el bridge
export {
    // Mensajes y alertas
    mostrarMensaje,
    mostrarResultadoCarga,
    mostrarAlertaBurbuja,
    
    // Modal de escaneo
    mostrarModalEscaneo,
    cerrarModalEscaneo,
    
    // Servicio
    service
} from './logs-bridge.js';
