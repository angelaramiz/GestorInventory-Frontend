// rep-ui.js - Funciones de interfaz de usuario para reportes

// Función para manejar la selección de "Todas las áreas"
export function toggleTodasLasAreas(e) {
    const isChecked = e.target.checked;
    document.querySelectorAll('.areaCheckbox').forEach(checkbox => {
        if (checkbox.id !== 'area-todas') {
            checkbox.checked = false;
            checkbox.disabled = isChecked;
        }
    });
}

// Maneja el evento cuando se selecciona un área específica
export function handleAreaSpecificSelection() {
    const areaCheckboxes = document.querySelectorAll('.areaCheckbox:not(#area-todas)');
    const todasCheckbox = document.getElementById('area-todas');

    // Si hay al menos un área específica seleccionada, desmarcar "Todas las áreas"
    const hayAreasSeleccionadas = Array.from(areaCheckboxes).some(cb => cb.checked);
    if (hayAreasSeleccionadas) {
        todasCheckbox.checked = false;
    }
}

// Mostrar los productos en la lista
export function mostrarProductosEnLista(productos, todasLasAreas) {
    const container = document.getElementById('productosContainer');
    container.innerHTML = '';

    if (productos.length === 0) {
        container.innerHTML = '<li class="text-gray-500">No hay productos disponibles para esta área.</li>';
        return;
    }

    productos.forEach(producto => {
        const li = document.createElement('li');
        li.className = 'py-1';

        // Buscar el nombre del área si está disponible
        const area = todasLasAreas.find(a => a.id === producto.area_id);
        const areaNombre = area ? area.nombre : 'Área desconocida';

        li.innerHTML = `<span class="font-semibold">${producto.nombre || 'Sin nombre'}</span> - Código: ${producto.codigo || 'Sin código'} <span class="text-gray-500 text-sm">(${areaNombre})</span>`;
        container.appendChild(li);
    });
}

// Mostrar/ocultar indicador de carga
export function mostrarCargando(mostrar) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !mostrar);
}

// Mostrar opciones para generar el reporte
export async function mostrarOpcionesReporte() {
    const todasSeleccionadas = document.getElementById('area-todas').checked;
    const areasSeleccionadas = Array.from(
        document.querySelectorAll('.areaCheckbox:checked:not(#area-todas)')
    ).map(checkbox => checkbox.value);

    if (!todasSeleccionadas && areasSeleccionadas.length === 0) {
        Swal.fire('Atención', 'Por favor, selecciona al menos un área para generar el reporte.', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Configuración del reporte',
        html: `
            <div class="text-left">
                <div class="mb-3">
                    <p class="text-sm text-gray-600 mb-2">
                        📋 <strong>El reporte incluirá automáticamente:</strong><br>
                        • Fechas de caducidad • Comentarios • Códigos de barras • Área<br>
                        • Productos ordenados por fecha de caducidad (más próximas primero)<br>
                        • Agrupados por estado de caducidad con colores distintivos
                    </p>
                </div>
                <div class="mb-3">
                    <label class="block mb-1 font-semibold">Filtrar por agrupaciones de fechas de caducidad:</label>
                    <p class="text-xs text-gray-500 mb-2">
                        <strong>Ejemplo:</strong> Si solo necesitas un reporte de productos que vencen en los próximos 7 días, 
                        desmarca "Todas las agrupaciones" y selecciona solo "Vencen en los próximos 7 días"
                    </p>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="incluirTodasAgrupaciones" checked> 📊 Todas las agrupaciones</label>
                        <div id="agrupacionesEspecificas" class="ml-4 space-y-1" style="display: none;">
                            <label><input type="checkbox" id="incluirVencidos" class="agrupacion-checkbox"> 🚨 Productos vencidos</label>
                            <label><input type="checkbox" id="incluirProximaSemana" class="agrupacion-checkbox"> ⚠️ Vencen en los próximos 7 días</label>
                            <label><input type="checkbox" id="incluirMismoMes" class="agrupacion-checkbox"> 📅 Vencen en el mismo mes</label>
                            <label><input type="checkbox" id="incluirSiguienteMes" class="agrupacion-checkbox"> 📆 Vencen el siguiente mes</label>
                            <label><input type="checkbox" id="incluirOtros" class="agrupacion-checkbox"> 📋 Otros (fechas lejanas o sin fecha)</label>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="block mb-1">Opciones adicionales:</label>
                    <div class="flex flex-col space-y-1">
                        <label><input type="checkbox" id="fusionarLotes" checked> 🔗 Fusionar productos idénticos (combinar lotes)</label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Generar',
        cancelButtonText: 'Cancelar',
        didOpen: () => {
            // Event listeners para manejar la selección de agrupaciones
            const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones');
            const agrupacionesDiv = document.getElementById('agrupacionesEspecificas');
            const agrupacionesCheckboxes = document.querySelectorAll('.agrupacion-checkbox');

            todasAgrupaciones.addEventListener('change', function() {
                if (this.checked) {
                    agrupacionesDiv.style.display = 'none';
                    agrupacionesCheckboxes.forEach(cb => cb.checked = false);
                } else {
                    agrupacionesDiv.style.display = 'block';
                }
            });

            agrupacionesCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        todasAgrupaciones.checked = false;
                    }
                    
                    // Si no hay ninguna agrupación específica seleccionada, volver a "Todas"
                    const haySeleccionadas = Array.from(agrupacionesCheckboxes).some(cb => cb.checked);
                    if (!haySeleccionadas) {
                        todasAgrupaciones.checked = true;
                        agrupacionesDiv.style.display = 'none';
                    }
                });
            });
        },
        preConfirm: () => {
            const todasAgrupaciones = document.getElementById('incluirTodasAgrupaciones').checked;
            
            return {
                incluirCaducidad: true, // Siempre incluido
                incluirComentarios: true, // Siempre incluido
                incluirCodigo: true, // Siempre incluido
                incluirArea: true, // Siempre incluido
                fusionarLotes: document.getElementById('fusionarLotes').checked,
                filtrarAgrupaciones: !todasAgrupaciones,
                agrupacionesSeleccionadas: todasAgrupaciones ? [] : {
                    vencidos: document.getElementById('incluirVencidos').checked,
                    proximosSemana: document.getElementById('incluirProximaSemana').checked,
                    mismoMes: document.getElementById('incluirMismoMes').checked,
                    siguienteMes: document.getElementById('incluirSiguienteMes').checked,
                    otros: document.getElementById('incluirOtros').checked
                }
            };
        }
    });

    if (result.isConfirmed) {
        return result.value;
    }
    
    return null;
}