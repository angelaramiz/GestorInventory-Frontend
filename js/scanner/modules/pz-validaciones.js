/**
 * FASE 10: Módulo de Validaciones y Manejo de Errores
 * Centraliza todas las validaciones del flujo PZ
 */

import { getSupabase } from '../../auth/auth.js';

/**
 * Validar cantidad > 0
 * @param {number} cantidad - Cantidad a validar
 * @returns {Object} { valido: boolean, mensaje: string }
 */
export function validarCantidad(cantidad) {
    const cant = parseFloat(cantidad);
    
    if (isNaN(cant)) {
        return {
            valido: false,
            mensaje: '❌ La cantidad debe ser un número válido'
        };
    }
    
    if (cant <= 0) {
        return {
            valido: false,
            mensaje: '❌ La cantidad debe ser mayor que 0'
        };
    }
    
    if (cant > 10000) {
        return {
            valido: false,
            mensaje: '⚠️ Cantidad sospechosamente alta (>10000). ¿Estás seguro?'
        };
    }
    
    return {
        valido: true,
        mensaje: '✅ Cantidad válida'
    };
}

/**
 * Validar que se haya ingresado al menos 1 producto virtual
 * @param {number} totalProductos - Total de productos ingresados
 * @returns {Object} { valido: boolean, mensaje: string }
 */
export function validarAlmenoUnProducto(totalProductos) {
    if (totalProductos === 0) {
        return {
            valido: false,
            mensaje: '❌ Debes ingresar al menos 1 producto virtual antes de continuar'
        };
    }
    
    if (totalProductos === 1) {
        return {
            valido: true,
            mensaje: '⚠️ Tienes solo 1 producto. ¿Estás seguro de continuar?',
            advertencia: true
        };
    }
    
    return {
        valido: true,
        mensaje: `✅ ${totalProductos} productos ingresados`
    };
}

/**
 * Validar conexión a Supabase antes de escanear
 * @returns {Promise<Object>} { conectado: boolean, mensaje: string, detalles: Object }
 */
export async function validarConexionSupabase() {
    try {
        console.log('🔗 Validando conexión a Supabase...');
        
        const supabase = await getSupabase();
        if (!supabase) {
            return {
                conectado: false,
                mensaje: '❌ No se pudo obtener cliente de Supabase',
                detalles: { error: 'Sin cliente Supabase' }
            };
        }
        
        // Hacer ping a tabla areas (más rápido que cargar datos)
        const { error, status } = await supabase
            .from('areas')
            .select('id', { count: 'exact' })
            .limit(1);
        
        if (error) {
            console.error('❌ Error de conexión:', error);
            return {
                conectado: false,
                mensaje: `❌ Error de conexión a Supabase: ${error.message}`,
                detalles: { error: error.code, status }
            };
        }
        
        console.log('✅ Conexión a Supabase verificada');
        return {
            conectado: true,
            mensaje: '✅ Conexión a Supabase activa',
            detalles: { status }
        };
    } catch (err) {
        console.error('❌ Error validando conexión:', err);
        return {
            conectado: false,
            mensaje: `❌ Error inesperado: ${err.message}`,
            detalles: { error: err.message }
        };
    }
}

/**
 * Validar que el escáner esté disponible (cámara accesible)
 * @returns {Promise<Object>} { disponible: boolean, mensaje: string, detalles: Object }
 */
export async function validarEscanerDisponible() {
    try {
        console.log('📷 Validando disponibilidad de escáner...');
        
        // Verificar API de mediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return {
                disponible: false,
                mensaje: '❌ API de mediaDevices no disponible en este navegador',
                detalles: { razon: 'API_NO_SOPORTADA' }
            };
        }
        
        // Enumerarar dispositivos
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        const camaras = dispositivos.filter(d => d.kind === 'videoinput');
        
        if (camaras.length === 0) {
            return {
                disponible: false,
                mensaje: '❌ No se encontró cámara en el dispositivo',
                detalles: { 
                    razon: 'SIN_CAMARA',
                    dispositivos: dispositivos.length,
                    camaras: 0
                }
            };
        }
        
        // Intentar acceder a la cámara
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            // Cerrar stream inmediatamente
            stream.getTracks().forEach(track => track.stop());
            
            console.log(`✅ Escáner disponible (${camaras.length} cámara(s) detectada(s))`);
            return {
                disponible: true,
                mensaje: '✅ Escáner y cámara disponibles',
                detalles: { 
                    camaras: camaras.length,
                    dispositivos: dispositivos.length
                }
            };
        } catch (permError) {
            return {
                disponible: false,
                mensaje: '❌ Permiso de cámara denegado. Verifica los permisos del navegador',
                detalles: { 
                    razon: 'PERMISO_DENEGADO',
                    error: permError.name
                }
            };
        }
    } catch (err) {
        console.error('❌ Error validando escáner:', err);
        return {
            disponible: false,
            mensaje: `❌ Error inesperado: ${err.message}`,
            detalles: { error: err.message }
        };
    }
}

/**
 * Mostrar confirmación antes de cambios irreversibles
 * @param {string} accion - Descripción de la acción
 * @param {string} detalles - Detalles adicionales
 * @returns {Promise<boolean>} true si el usuario confirma
 */
export function mostrarConfirmacion(accion, detalles = '') {
    return new Promise((resolve) => {
        // Crear modal de confirmación personalizado
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
        `;
        
        const contenido = document.createElement('div');
        contenido.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 25px;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        contenido.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">⚠️ Confirmar Acción</h3>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.6;">
                ${accion}
                ${detalles ? `<br><br><strong>Detalles:</strong><br>${detalles}` : ''}
            </p>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btnCancelar" style="flex: 1; padding: 10px; background: #e5e7eb; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s;">
                    ❌ Cancelar
                </button>
                <button id="btnConfirmar" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s;">
                    ✅ Confirmar
                </button>
            </div>
        `;
        
        modal.appendChild(contenido);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('btnCancelar').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        document.getElementById('btnConfirmar').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        // Agregar estilos de animación
        if (!document.querySelector('style[data-pz-animations]')) {
            const style = document.createElement('style');
            style.setAttribute('data-pz-animations', 'true');
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateY(-30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    });
}

/**
 * Mostrar alerta con validación
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - 'error', 'warning', 'success', 'info'
 * @param {number} duracion - Duración en ms (0 = permanente)
 */
export function mostrarAlerta(mensaje, tipo = 'info', duracion = 0) {
    const colores = {
        error: { bg: '#ef4444', icon: '❌' },
        warning: { bg: '#f59e0b', icon: '⚠️' },
        success: { bg: '#10b981', icon: '✅' },
        info: { bg: '#3b82f6', icon: 'ℹ️' }
    };
    
    const config = colores[tipo] || colores.info;
    
    const alerta = document.createElement('div');
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${config.bg};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10003;
        animation: slideInRight 0.3s ease-out;
        max-width: 350px;
        font-size: 14px;
    `;
    
    alerta.innerHTML = `${config.icon} ${mensaje}`;
    document.body.appendChild(alerta);
    
    if (duracion > 0) {
        setTimeout(() => {
            alerta.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => alerta.remove(), 300);
        }, duracion);
    }
    
    // Agregar estilos de animación
    if (!document.querySelector('style[data-alert-animations]')) {
        const style = document.createElement('style');
        style.setAttribute('data-alert-animations', 'true');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Validar flujo completo antes de escanear
 * @returns {Promise<Object>} { valido: boolean, errores: Array, advertencias: Array }
 */
export async function validarFlujoCompleto(totalProductos) {
    const errores = [];
    const advertencias = [];
    
    console.log('🔍 Iniciando validación completa del flujo...');
    
    // 1. Validar productos ingresados
    const valProductos = validarAlmenoUnProducto(totalProductos);
    if (!valProductos.valido) {
        errores.push(valProductos.mensaje);
    } else if (valProductos.advertencia) {
        advertencias.push(valProductos.mensaje);
    }
    
    // 2. Validar conexión a Supabase
    const valSupabase = await validarConexionSupabase();
    if (!valSupabase.conectado) {
        errores.push(valSupabase.mensaje);
    }
    
    // 3. Validar escáner
    const valEscanero = await validarEscanerDisponible();
    if (!valEscanero.disponible) {
        errores.push(valEscanero.mensaje);
    }
    
    const valido = errores.length === 0;
    
    console.log(`📊 Validación completa: ${valido ? '✅ VALIDO' : '❌ INVÁLIDO'}`);
    if (errores.length > 0) console.error('Errores:', errores);
    if (advertencias.length > 0) console.warn('Advertencias:', advertencias);
    
    return {
        valido,
        errores,
        advertencias,
        timestamp: new Date().toISOString()
    };
}

/**
 * Log de ejecución para debugging (FASE 12)
 */
export const loggerPZ = {
    logs: [],
    maxLogs: 500,
    
    agregar(nivel, mensaje, detalles = null) {
        const entrada = {
            timestamp: new Date().toISOString(),
            nivel, // 'DEBUG', 'INFO', 'WARN', 'ERROR'
            mensaje,
            detalles,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.logs.push(entrada);
        
        // Mantener límite de logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Log a consola también
        const estilo = {
            'DEBUG': 'color: #666; background: #f0f0f0;',
            'INFO': 'color: #3b82f6; background: #dbeafe;',
            'WARN': 'color: #f59e0b; background: #fef3c7;',
            'ERROR': 'color: #ef4444; background: #fee2e2;'
        };
        
        console.log(`%c[${nivel}] ${mensaje}`, estilo[nivel] || '', detalles);
    },
    
    obtenerLogs(filtro = null) {
        if (!filtro) return this.logs;
        return this.logs.filter(l => l.nivel === filtro);
    },
    
    descargar() {
        const contenido = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([contenido], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pz-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    },
    
    limpiar() {
        this.logs = [];
    }
};

export default {
    validarCantidad,
    validarAlmenoUnProducto,
    validarConexionSupabase,
    validarEscanerDisponible,
    mostrarConfirmacion,
    mostrarAlerta,
    validarFlujoCompleto,
    loggerPZ
};
