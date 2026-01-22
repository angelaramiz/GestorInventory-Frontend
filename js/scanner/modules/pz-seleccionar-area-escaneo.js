/**
 * FASE 8: Seleccionar Área para Escaneo
 * Permite al usuario elegir qué área escanear cuando hay múltiples
 */

import { obtenerTodasLasSecciones } from '../../db/db-operations-pz.js';

/**
 * Obtiene lista única de áreas que fueron contadas
 * @returns {Promise<Array>} Array de áreas con sus secciones
 */
async function obtenerAreasContadas() {
    try {
        const seccionesGuardadas = await obtenerTodasLasSecciones();
        
        // Agrupar secciones por area_id
        const areasMap = new Map();
        
        seccionesGuardadas.forEach(seccion => {
            const areaId = seccion.area_id || 'sin-area';
            
            if (!areasMap.has(areaId)) {
                areasMap.set(areaId, {
                    area_id: areaId,
                    secciones: 0,
                    productos: 0,
                    niveles: 0
                });
            }
            
            const area = areasMap.get(areaId);
            area.secciones += 1;
            area.productos += seccion.total_productos || 0;
            area.niveles += seccion.total_niveles || 0;
        });
        
        // Convertir Map a Array
        const areas = Array.from(areasMap.values());
        console.log(`📊 Áreas contadas para escaneo: ${areas.length}`);
        
        return areas;
    } catch (error) {
        console.error('❌ Error obteniendo áreas contadas:', error);
        throw error;
    }
}

/**
 * Muestra modal para seleccionar qué área escanear
 * @param {Array} areas - Lista de áreas contadas
 * @returns {Promise<string>} ID del área seleccionada
 */
function mostrarModalSeleccionAreaEscaneo(areas) {
    return new Promise((resolve, reject) => {
        const modalHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                    <h2 style="margin: 0 0 20px 0; color: #111; font-size: 24px;">🔍 Selecciona Área para Escanear</h2>
                    <p style="color: #666; margin-bottom: 20px;">Elige qué área deseas escanear:</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
                        ${areas.map(area => `
                            <button 
                                onclick="window.pz_seleccionarAreaEscaneo('${area.area_id}')"
                                style="
                                    padding: 15px;
                                    background: #f3f4f6;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: left;
                                    transition: all 0.2s;
                                    font-size: 16px;
                                "
                                onmouseover="this.style.background='#e5e7eb'; this.style.borderColor='#3b82f6';"
                                onmouseout="this.style.background='#f3f4f6'; this.style.borderColor='#e5e7eb';"
                            >
                                <div style="font-weight: bold; color: #111;">
                                    ${area.area_id === 'sin-area' ? '📦 Área sin especificar' : `📍 Área ${area.area_id}`}
                                </div>
                                <div style="font-size: 14px; color: #666; margin-top: 5px;">
                                    📊 ${area.secciones} sección(es) | ${area.productos} producto(s) | ${area.niveles} nivel(es)
                                </div>
                            </button>
                        `).join('')}
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button 
                            onclick="window.pz_cancelarSeleccionAreaEscaneo()"
                            style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; color: #374151;"
                        >
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        const contenedor = document.createElement('div');
        contenedor.id = 'modalSeleccionAreaEscaneo';
        contenedor.innerHTML = modalHTML;
        document.body.appendChild(contenedor);

        // Registrar funciones globales
        window.pz_seleccionarAreaEscaneo = (areaId) => {
            contenedor.remove();
            resolve(areaId);
        };
        
        window.pz_cancelarSeleccionAreaEscaneo = () => {
            contenedor.remove();
            reject(new Error('Usuario canceló la selección'));
        };
    });
}

/**
 * Permite al usuario seleccionar qué área escanear
 * @returns {Promise<string>} ID del área seleccionada
 */
export async function seleccionarAreaParaEscaneo() {
    try {
        console.log('🔍 FASE 8.3: Seleccionando área para escanear...');

        // Obtener áreas que fueron contadas
        const areas = await obtenerAreasContadas();

        if (!areas || areas.length === 0) {
            alert('❌ No hay áreas disponibles para escanear');
            throw new Error('No hay áreas contadas');
        }

        // Si solo hay una área, no mostrar modal
        if (areas.length === 1) {
            console.log(`✅ Una sola área encontrada: ${areas[0].area_id}`);
            return areas[0].area_id;
        }

        // Si hay múltiples áreas, mostrar modal
        console.log(`📍 Mostrando modal con ${areas.length} áreas disponibles`);
        const areaSeleccionada = await mostrarModalSeleccionAreaEscaneo(areas);
        console.log(`✅ Área seleccionada para escaneo: ${areaSeleccionada}`);
        
        return areaSeleccionada;

    } catch (error) {
        console.error('❌ Error seleccionando área para escaneo:', error);
        throw error;
    }
}

/**
 * Exportar función para llamadas externas
 */
export { obtenerAreasContadas, mostrarModalSeleccionAreaEscaneo };
