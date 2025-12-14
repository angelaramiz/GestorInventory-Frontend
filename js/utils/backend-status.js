/**
 * Backend Status Monitor - Monitorea la disponibilidad del backend
 */

import { BASE_URL } from '../core/configuraciones.js';

export class BackendStatusMonitor {
    constructor() {
        this.isBackendAvailable = false;
        this.lastCheckTime = null;
        this.checkInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Verificar disponibilidad del backend con reintentos
     */
    async checkBackendAvailability(retries = this.maxRetries) {
        try {
            const response = await fetch(`${BASE_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(3000) // 3 segundos timeout
            });

            if (response.ok) {
                this.isBackendAvailable = true;
                this.retryCount = 0;
                this.lastCheckTime = new Date();
                console.log('✅ Backend disponible:', BASE_URL);
                this.notifyBackendStatus(true);
                return true;
            } else {
                throw new Error(`Status: ${response.status}`);
            }
        } catch (error) {
            console.warn(`⚠️ Backend no disponible (intento ${this.maxRetries - retries + 1}/${this.maxRetries}):`, error.message);
            
            if (retries > 1) {
                // Reintentar después de 2 segundos
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.checkBackendAvailability(retries - 1);
            }

            this.isBackendAvailable = false;
            this.lastCheckTime = new Date();
            console.error('❌ Backend no disponible después de reintentos');
            this.notifyBackendStatus(false);
            return false;
        }
    }

    /**
     * Iniciar monitoreo continuo del backend
     */
    startMonitoring(intervalSeconds = 30) {
        // Primera verificación inmediata
        this.checkBackendAvailability();

        // Luego verificar cada X segundos
        this.checkInterval = setInterval(() => {
            this.checkBackendAvailability();
        }, intervalSeconds * 1000);

        // También verificar cuando el navegador vuelva a estar online
        window.addEventListener('online', () => {
            console.log('📡 Conexión de red restaurada, verificando backend...');
            this.checkBackendAvailability();
        });
    }

    /**
     * Detener monitoreo
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Notificar cambios de estado del backend
     */
    notifyBackendStatus(isAvailable) {
        const event = new CustomEvent('backendStatusChanged', {
            detail: {
                available: isAvailable,
                timestamp: new Date(),
                url: BASE_URL
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Obtener estado actual
     */
    getStatus() {
        return {
            available: this.isBackendAvailable,
            lastCheck: this.lastCheckTime,
            url: BASE_URL
        };
    }

    /**
     * Obtener indicador visual del estado
     */
    getStatusIndicator() {
        return this.isBackendAvailable 
            ? '🟢 Backend activo'
            : '🔴 Backend no disponible';
    }
}

// Exportar instancia singleton
export const backendStatusMonitor = new BackendStatusMonitor();
