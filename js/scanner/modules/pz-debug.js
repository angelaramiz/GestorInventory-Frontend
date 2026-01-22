/**
 * FASE 12: Módulo de Testing, Optimización y Debugging
 * Funciones para validar el flujo completo y monitorear performance
 */

import { loggerPZ } from './pz-validaciones.js';
import { getSupabase } from '../../auth/auth.js';

/**
 * Suite de tests para validar flujo completo KG → PZ
 */
export const testSuite = {
    resultados: [],
    
    agregar(nombre, valido, detalles = null) {
        this.resultados.push({
            timestamp: new Date().toISOString(),
            nombre,
            valido,
            detalles,
            duracion: detalles?.duracion || 0
        });
    },
    
    limpiar() {
        this.resultados = [];
    },
    
    obtenerResumen() {
        const total = this.resultados.length;
        const exitosos = this.resultados.filter(r => r.valido).length;
        const fallos = total - exitosos;
        const porcentaje = total > 0 ? ((exitosos / total) * 100).toFixed(1) : 0;
        
        return {
            total,
            exitosos,
            fallos,
            porcentaje: `${porcentaje}%`,
            timestamp: new Date().toISOString()
        };
    },
    
    mostrarResultados() {
        const resumen = this.obtenerResumen();
        const resultsHTML = `
            <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 15px 0; color: #333;">📋 Resultados de Tests - FASE 12</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
                        <div><strong>Total:</strong> ${resumen.total}</div>
                        <div><strong>✅ Exitosos:</strong> ${resumen.exitosos}</div>
                        <div><strong>❌ Fallos:</strong> ${resumen.fallos}</div>
                        <div><strong>Porcentaje:</strong> ${resumen.porcentaje}</div>
                    </div>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${this.resultados.map(r => `
                        <div style="display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid #e5e7eb; align-items: center;">
                            <span style="font-size: 20px;">${r.valido ? '✅' : '❌'}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #333;">${r.nombre}</div>
                                ${r.detalles ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${JSON.stringify(r.detalles).substring(0, 100)}</div>` : ''}
                            </div>
                            ${r.duracion > 0 ? `<div style="color: #999; font-size: 12px;">${r.duracion}ms</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = resultsHTML;
        document.body.appendChild(container);
        
        console.log('📋 Resultados completos:', this.resultados);
    }
};

/**
 * Test: Validar estructura de IndexedDB
 */
export async function testIndexedDBStructure() {
    console.log('🧪 Test: Validar estructura de IndexedDB');
    loggerPZ.agregar('DEBUG', 'Iniciando test de IndexedDB');
    
    const inicio = performance.now();
    
    try {
        // Abrir BD
        const request = indexedDB.open('GestorInventory_PZ', 2);
        
        const resultado = await new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Verificar object stores
                const stores = Array.from(db.objectStoreNames);
                console.log('📊 Object Stores encontrados:', stores);
                
                const storesExpectados = [
                    'productos_virtuales_por_seccion',
                    'secciones_inventario',
                    'inventario_temporal_escaneo'
                ];
                
                const storesValidos = storesExpectados.every(s => stores.includes(s));
                
                resolve({
                    valido: storesValidos,
                    stores,
                    storesExpectados
                });
            };
            request.onerror = () => reject(request.error);
        });
        
        const duracion = performance.now() - inicio;
        testSuite.agregar('IndexedDB Structure', resultado.valido, { ...resultado, duracion: Math.round(duracion) });
        
        return resultado.valido;
    } catch (error) {
        console.error('❌ Error en test IndexedDB:', error);
        testSuite.agregar('IndexedDB Structure', false, { error: error.message });
        return false;
    }
}

/**
 * Test: Validar conexión a Supabase
 */
export async function testSupabaseConnection() {
    console.log('🧪 Test: Validar conexión a Supabase');
    loggerPZ.agregar('DEBUG', 'Iniciando test de Supabase');
    
    const inicio = performance.now();
    
    try {
        const supabase = await getSupabase();
        
        // Test lectura
        const { data, error } = await supabase
            .from('areas')
            .select('id', { count: 'exact' })
            .limit(1);
        
        const duracion = performance.now() - inicio;
        const valido = !error && data !== null;
        
        testSuite.agregar('Supabase Connection', valido, { 
            error: error?.message || null,
            rowsReturned: data?.length || 0,
            duracion: Math.round(duracion)
        });
        
        return valido;
    } catch (error) {
        testSuite.agregar('Supabase Connection', false, { error: error.message });
        return false;
    }
}

/**
 * Test: Validar datos en IndexedDB
 */
export async function testDataIntegrity() {
    console.log('🧪 Test: Validar integridad de datos en IndexedDB');
    loggerPZ.agregar('DEBUG', 'Iniciando test de integridad de datos');
    
    const inicio = performance.now();
    
    try {
        const { obtenerTodasLasSecciones } = await import('../../db/db-operations-pz.js');
        
        const secciones = await obtenerTodasLasSecciones();
        
        // Validaciones básicas
        const validaciones = {
            seccionesExisten: secciones && secciones.length > 0,
            estructuraValida: secciones.every(s => 
                s.id && 
                s.seccion_numero !== undefined && 
                s.total_productos !== undefined &&
                s.area_id !== undefined
            ),
            timestampValido: secciones.every(s => 
                s.fecha_inicio && new Date(s.fecha_inicio).getTime() > 0
            )
        };
        
        const duracion = performance.now() - inicio;
        const valido = Object.values(validaciones).every(v => v);
        
        testSuite.agregar('Data Integrity', valido, { 
            ...validaciones,
            seccionesEncontradas: secciones.length,
            duracion: Math.round(duracion)
        });
        
        return valido;
    } catch (error) {
        testSuite.agregar('Data Integrity', false, { error: error.message });
        return false;
    }
}

/**
 * Test: Validar Performance (velocidad de carga)
 */
export async function testPerformance() {
    console.log('🧪 Test: Validar Performance');
    loggerPZ.agregar('DEBUG', 'Iniciando test de performance');
    
    try {
        const { obtenerTodasLasSecciones } = await import('../../db/db-operations-pz.js');
        
        const inicio = performance.now();
        
        // Realizar operación repetida
        for (let i = 0; i < 5; i++) {
            await obtenerTodasLasSecciones();
        }
        
        const tiempoPromedio = (performance.now() - inicio) / 5;
        
        // Criterios de performance
        const criterios = {
            rapido: tiempoPromedio < 50,      // < 50ms es rápido
            aceptable: tiempoPromedio < 100,  // < 100ms es aceptable
            lento: tiempoPromedio >= 100      // >= 100ms es lento
        };
        
        const valido = criterios.rapido || criterios.aceptable;
        
        testSuite.agregar('Performance', valido, {
            tiempoPromedio: Math.round(tiempoPromedio),
            criterios
        });
        
        return valido;
    } catch (error) {
        testSuite.agregar('Performance', false, { error: error.message });
        return false;
    }
}

/**
 * Test: Detectar Memory Leaks
 */
export async function testMemoryLeaks() {
    console.log('🧪 Test: Detectar posibles Memory Leaks');
    loggerPZ.agregar('DEBUG', 'Iniciando test de memory leaks');
    
    try {
        // Verificar objetos globales problemáticos
        const globalesAuditar = [
            'estadoPZ',
            'productosVirtuales',
            'inventarioTemporal'
        ];
        
        const leaksDetectados = [];
        
        globalesAuditar.forEach(global => {
            if (window[global] && typeof window[global] === 'object') {
                const size = JSON.stringify(window[global]).length;
                if (size > 1000000) { // > 1MB es sospechoso
                    leaksDetectados.push({
                        variable: global,
                        size: `${(size / 1024 / 1024).toFixed(2)}MB`
                    });
                }
            }
        });
        
        const valido = leaksDetectados.length === 0;
        
        testSuite.agregar('Memory Leaks', valido, {
            leaksDetectados,
            variablesAuditadas: globalesAuditar.length
        });
        
        return valido;
    } catch (error) {
        testSuite.agregar('Memory Leaks', false, { error: error.message });
        return false;
    }
}

/**
 * Test: Validar logs de debug
 */
export async function testDebugLogs() {
    console.log('🧪 Test: Validar sistema de logs');
    loggerPZ.agregar('DEBUG', 'Iniciando test de logs');
    
    try {
        const logCount = loggerPZ.logs.length;
        const tiposLogs = {};
        
        loggerPZ.logs.forEach(log => {
            tiposLogs[log.nivel] = (tiposLogs[log.nivel] || 0) + 1;
        });
        
        const valido = logCount > 0;
        
        testSuite.agregar('Debug Logs', valido, {
            totalLogs: logCount,
            porTipo: tiposLogs,
            maxLogsConfigured: loggerPZ.maxLogs
        });
        
        return valido;
    } catch (error) {
        testSuite.agregar('Debug Logs', false, { error: error.message });
        return false;
    }
}

/**
 * Ejecutar suite completa de tests
 */
export async function ejecutarTestsCompletos() {
    console.log('🧪 FASE 12: Ejecutando suite completa de tests...');
    loggerPZ.agregar('INFO', 'Iniciando suite completa de tests');
    
    testSuite.limpiar();
    
    // Ejecutar todos los tests
    const resultados = {
        indexeddb: await testIndexedDBStructure(),
        supabase: await testSupabaseConnection(),
        integridad: await testDataIntegrity(),
        performance: await testPerformance(),
        memory: await testMemoryLeaks(),
        logs: await testDebugLogs()
    };
    
    const resumen = testSuite.obtenerResumen();
    
    console.log('✅ Suite de tests completada');
    console.log('📊 Resumen:', resumen);
    console.log('📋 Resultados detallados:', resultados);
    
    loggerPZ.agregar('INFO', 'Suite de tests completada', resumen);
    
    return {
        resultados,
        resumen,
        timestamp: new Date().toISOString()
    };
}

/**
 * Mostrar panel de debugging en la interfaz
 */
export function mostrarPanelDebug() {
    const panel = document.createElement('div');
    panel.id = 'panelDebugPZ';
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #1f2937;
        color: #f3f4f6;
        border-radius: 12px;
        padding: 15px;
        max-width: 350px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid #667eea;
    `;
    
    const resumen = testSuite.obtenerResumen();
    const logs = loggerPZ.obtenerLogs().slice(-10); // Últimos 10 logs
    
    panel.innerHTML = `
        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #4b5563;">
            <strong>🧪 Panel de Debug - FASE 12</strong>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 5px;">
                Tests: ${resumen.exitosos}/${resumen.total} ✅ | ${resumen.porcentaje}
            </div>
        </div>
        <div style="margin-bottom: 10px;">
            <strong>Logs recientes:</strong>
            <div style="background: #111827; padding: 8px; border-radius: 4px; margin-top: 5px; max-height: 200px; overflow-y: auto;">
                ${logs.map(log => `
                    <div style="margin: 2px 0; color: ${
                        log.nivel === 'ERROR' ? '#fca5a5' :
                        log.nivel === 'WARN' ? '#fcd34d' :
                        log.nivel === 'INFO' ? '#93c5fd' :
                        '#d1d5db'
                    };">
                        [${log.nivel}] ${log.mensaje}
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button onclick="
                const panel = document.getElementById('panelDebugPZ');
                const newPanel = document.createElement('div');
                newPanel.innerHTML = '<p>Ejecutando tests...</p>';
                panel.appendChild(newPanel);
                // Los tests se ejecutan en background
            " style="flex: 1; padding: 5px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                🧪 Tests
            </button>
            <button onclick="
                window.loggerPZ?.descargar();
            " style="flex: 1; padding: 5px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                📥 Descargar
            </button>
            <button onclick="
                document.getElementById('panelDebugPZ').remove();
            " style="flex: 1; padding: 5px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Hacer disponible globalmente
    window.loggerPZ = loggerPZ;
    window.testSuite = testSuite;
    window.ejecutarTestsCompletos = ejecutarTestsCompletos;
    window.mostrarPanelDebug = mostrarPanelDebug;
}

/**
 * Profiler de funciones (mide tiempo de ejecución)
 */
export function profileFunction(fn, name = fn.name || 'función') {
    return async function (...args) {
        const inicio = performance.now();
        let error = null;
        let resultado = null;
        
        try {
            resultado = await fn(...args);
        } catch (err) {
            error = err;
        }
        
        const duracion = performance.now() - inicio;
        
        loggerPZ.agregar('DEBUG', `[PROFILE] ${name}`, {
            duracion: Math.round(duracion),
            error: error?.message || null,
            argumentos: args.length
        });
        
        if (error) throw error;
        return resultado;
    };
}

/**
 * Exportar objeto de utilidades públicas
 */
export const debugPZ = {
    mostrarPanelDebug,
    ejecutarTestsCompletos,
    testSuite,
    profileFunction,
    loggerPZ
};

export default debugPZ;
