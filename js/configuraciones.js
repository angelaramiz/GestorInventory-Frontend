/**
 * ARCHIVO DEPRECADO - Usar ConfigurationService
 * 
 * Este archivo se mantiene unicamente por compatibilidad hacia atras.
 * Todo el codigo nuevo debe usar ConfigurationService directamente.
 * 
 * MIGRACION COMPLETA EN FASE 2:
 * - Servicio: ConfigurationService
 * - UI Service: ConfigurationUIService
 * - Bridge: configuraciones-bridge.js (365 lineas)
 * - Documentado en: docs/PHASE_2_SUMMARY.md
 * 
 * FASE 3: Wrapper para compatibilidad
 * 
 * USO MODERNO:
 * - Antes: import { cargarConfiguracion, cambiarTema } from './configuraciones.js';
 * - Ahora: import { configurationService } from '../src/core/services/ConfigurationService.js';
 *          const config = configurationService.getConfiguration();
 * 
 * @deprecated v3.0.0 - Usar ConfigurationService y ConfigurationUIService
 */

// Re-exportar todas las funciones desde el bridge
export {
    // Inicializacion
    initConfiguraciones,
    
    // Gestion de configuracion
    cargarConfiguracion,
    guardarConfiguracion,
    obtenerConfiguracion,
    obtenerConfiguracionClave,
    establecerConfiguracion,
    
    // Configuraciones especificas
    cambiarTema,
    cambiarIdioma,
    configurarSincronizacion,
    configurarNotificaciones,
    configurarGoogle,
    
    // Operaciones
    exportarConfiguracion,
    resetearConfiguracion,
    sincronizarManualmente,
    
    // UI
    mostrarInformacionUsuario,
    cargarInterfazConfiguraciones,
    togglePasswordVisibility,
    
    // Clase para compatibilidad
    ConfiguracionesManager,
    
    // Servicios
    configurationService,
    configurationUIService
} from './configuraciones-bridge.js';
