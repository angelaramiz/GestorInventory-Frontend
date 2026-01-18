// Módulo de UI para lotes-avanzado.js

import { productosEscaneados, productosAgrupados, configuracionEscaneo, limpiarDebounce } from './config.js';
import { mostrarMensaje, mostrarAlertaBurbuja } from './utils.js';

// Función para actualizar contadores
export function actualizarContadoresAvanzado() {
    const totalProductos = productosEscaneados.length;
    const pesoTotal = productosEscaneados.reduce((sum, item) => sum + item.peso, 0);
    const productosPrimarios = new Set(productosEscaneados.map(p => p.productoPrimario?.codigo || p.codigo)).size;

    const contadorEl = document.getElementById('contadorProductosAvanzado');
    const totalProductosEl = document.getElementById('totalProductosAvanzado');
    const pesoTotalEl = document.getElementById('pesoTotalAvanzado');
    const totalPrimariosEl = document.getElementById('totalProductosPrimarios');

    if (contadorEl) contadorEl.textContent = totalProductos;
    if (totalProductosEl) totalProductosEl.textContent = totalProductos;
    if (pesoTotalEl) pesoTotalEl.textContent = pesoTotal.toFixed(3);
    if (totalPrimariosEl) totalPrimariosEl.textContent = productosPrimarios;

    // Habilitar botón finalizar si hay productos
    const btnFinalizar = document.getElementById('finalizarEscaneoLotesAvanzado');
    if (btnFinalizar) {
        btnFinalizar.disabled = !(totalProductos > 0);
    }
}

// Función para actualizar el listado de productos escaneados
export function actualizarListadoProductosAvanzado() {
    const tbody = document.getElementById('listadoProductosAvanzado');
    tbody.innerHTML = '';

    productosEscaneados.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="py-2 px-4 dark-table-cell">${index + 1}</td>
            <td class="py-2 px-4 font-mono text-sm dark-table-cell">${item.codigo}</td>
            <td class="py-2 px-4 dark-table-cell">${item.plu}</td>
            <td class="py-2 px-4 dark-table-cell">${item.nombre}</td>
            <td class="py-2 px-4 dark-table-cell">${item.peso.toFixed(3)}</td>
            <td class="py-2 px-4 dark-table-cell">$${item.precioKilo.toFixed(2)}</td>
            <td class="py-2 px-4 dark-table-cell">$${item.precioPorcion.toFixed(2)}</td>
            <td class="py-2 px-4">
                <span class="px-2 py-1 text-xs rounded dark-badge ${item.tipo === 'primario' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${item.tipo === 'primario' ? 'Primario' : 'Subproducto'}
                </span>
            </td>
            <td class="py-2 px-4">
                <button onclick="eliminarProductoEscaneado('${item.id}')" 
                        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        title="Eliminar">
                    🗑️
                </button>
            </td>
        `;
    });
}

// Función para eliminar un producto escaneado
window.eliminarProductoEscaneado = function (id) {
    console.log(`Eliminando producto con ID: ${id}`);
    console.log('Productos antes de eliminar:', productosEscaneados);

    // Encontrar el índice del producto a eliminar
    const index = productosEscaneados.findIndex(item => item.id === id);

    if (index !== -1) {
        // Eliminar del array
        productosEscaneados.splice(index, 1);

        console.log('Productos después de eliminar:', productosEscaneados);

        // Actualizar el listado inmediatamente
        actualizarListadoProductosAvanzado();

        // Actualizar contadores
        actualizarContadoresAvanzado();

        // Mostrar mensaje de confirmación
        mostrarAlertaBurbuja('🗑️ Producto eliminado', 'success');
    } else {
        console.error('No se encontró el producto con ID:', id);
        mostrarAlertaBurbuja('❌ Error al eliminar producto', 'error');
    }
};

// Función para mostrar detalle del producto primario
export function mostrarDetalleProductoPrimario(grupo) {
    let detalleHTML = `
        <div class="bg-blue-50 p-4 rounded-lg mb-4 dark-modal-section">
            <h3 class="text-lg font-bold text-blue-800 mb-2 dark-modal-title">Producto Primario</h3>
            <p class="dark-modal-text"><strong>Código:</strong> ${grupo.productoPrimario.codigo}</p>
            <p class="dark-modal-text"><strong>Nombre:</strong> ${grupo.productoPrimario.nombre}</p>
            <p class="dark-modal-text"><strong>Marca:</strong> ${grupo.productoPrimario.marca}</p>
            <p class="dark-modal-text"><strong>Peso Total:</strong> ${grupo.pesoTotal.toFixed(3)} Kg</p>
        </div>
        
        <div class="bg-white border rounded-lg overflow-hidden dark-modal-table">
            <div class="bg-gray-50 px-4 py-2 border-b dark-modal-header">
                <h4 class="font-semibold text-gray-800 dark-modal-title">Subproductos Escaneados</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 dark-modal-header">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Código</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Nombre</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Peso</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Precio/Kg</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark-modal-text">Precio Porción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    `;

    grupo.subproductos.forEach(sub => {
        detalleHTML += `
            <tr>
                <td class="px-4 py-2 dark-modal-text">${sub.codigo}</td>
                <td class="px-4 py-2 dark-modal-text">${sub.nombre}</td>
                <td class="px-4 py-2 dark-modal-text">${sub.peso.toFixed(3)}</td>
                <td class="px-4 py-2 dark-modal-text">$${sub.precioKilo.toFixed(2)}</td>
                <td class="px-4 py-2 dark-modal-text">$${sub.precioPorcion.toFixed(2)}</td>
            </tr>
        `;
    });

    detalleHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Mostrar en modal usando SweetAlert
    Swal.fire({
        title: 'Detalle del Producto',
        html: detalleHTML,
        width: '80%',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            popup: 'swal-wide'
        }
    });
}