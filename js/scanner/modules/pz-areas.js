/**
 * FASE 8: Seleccionar Otra Área para Contar
 * Permite al usuario contar múltiples áreas en la misma sesión
 */

import { getSupabase } from '../../auth/auth.js';

/**
 * Muestra modal para seleccionar otra área para contar
 */
export async function seleccionarOtraArea() {
    try {
        console.log('📍 FASE 8: Seleccionando otra área para contar...');

        // Obtener lista de áreas disponibles
        const areas = await obtenerAreasDisponibles();

        if (!areas || areas.length === 0) {
            alert('❌ No hay áreas disponibles');
            return;
        }

        // Mostrar modal de selección
        mostrarModalSeleccionArea(areas);

    } catch (error) {
        console.error('❌ Error en FASE 8:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Obtiene la lista de áreas disponibles de Supabase
 * @returns {Array} Lista de áreas
 */
async function obtenerAreasDisponibles() {
    try {
        const supabase = await getSupabase();
        
        const { data, error } = await supabase
            .from('areas')
            .select('id, nombre')
            .order('nombre');

        if (error) {
            throw new Error(`Error obteniendo áreas: ${error.message}`);
        }

        console.log(`✅ ${data.length} áreas disponibles obtenidas`);
        return data;

    } catch (error) {
        console.error('❌ Error al obtener áreas:', error);
        throw error;
    }
}

/**
 * Muestra modal visual para seleccionar área
 * @param {Array} areas - Lista de áreas disponibles
 */
function mostrarModalSeleccionArea(areas) {
    const modalHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;">
                <h2 style="margin: 0 0 20px 0; color: #111; font-size: 24px;">📍 Selecciona Otra Área para Contar</h2>
                
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px;">
                    ${areas.map(area => `
                        <button 
                            onclick="window.pz_seleccionarArea('${area.id}', '${area.nombre}')"
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
                            <div style="font-weight: bold; color: #111;">${area.nombre}</div>
                        </button>
                    `).join('')}
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        onclick="window.pz_cancelarOtraArea()"
                        style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; color: #374151;"
                    >
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    const contenedor = document.createElement('div');
    contenedor.id = 'modalSeleccionArea';
    contenedor.innerHTML = modalHTML;
    document.body.appendChild(contenedor);

    // Registrar funciones globales
    window.pz_seleccionarArea = (areaId, areaNombre) => confirmarAreaSeleccionada(areaId, areaNombre, contenedor);
    window.pz_cancelarOtraArea = () => {
        contenedor.remove();
        // Volver al flujo anterior (mostrar opciones nuevamente)
        importarModoYMostrarOpciones();
    };
}

/**
 * Confirma el área seleccionada y la prepara para el nuevo conteo
 * @param {string} areaId - ID del área
 * @param {string} areaNombre - Nombre del área
 * @param {HTMLElement} modalElement - Elemento modal a remover
 */
function confirmarAreaSeleccionada(areaId, areaNombre, modalElement) {
    console.log(`✅ Área seleccionada: ${areaNombre} (${areaId})`);

    // Guardar área seleccionada en localStorage
    localStorage.setItem('area_id', areaId);
    localStorage.setItem('area_nombre', areaNombre);

    console.log('💾 Área guardada en localStorage');

    // Remover modal
    modalElement.remove();

    // Importar y reinicializar el modo PZ con la nueva área
    import('./pz-modo.js').then(m => {
        m.reinicializarModoConteoNuevaArea(areaId, areaNombre);
    });
}

/**
 * Importa el módulo pz-modo y vuelve a mostrar opciones
 */
function importarModoYMostrarOpciones() {
    import('./pz-modo.js').then(m => {
        m.mostrarOpcionesPostConteo();
    });
}

/**
 * Exportar función para ser llamada desde pz-modo.js
 */
export { confirmarAreaSeleccionada };
