// Módulo UI del Escáner PZ - Manejo de eventos y elementos de UI
// Conecta los botones del modal de escaneo con la lógica de pz-modo.js

import { detenerEscaneo } from './pz-scanner.js';

/**
 * Registra los event listeners del modal de escáner
 */
export function registrarEventListenersEscanerPZ(callbacks) {
    console.log('📌 Registrando event listeners del escáner PZ');

    // Botón cerrar modal
    const btnCerrar = document.getElementById('cerrarModalEscanerPZ');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            console.log('❌ Usuario cerró el modal de escaneo');
            detenerEscaneo();
            cerrarModalEscanero();
            if (callbacks && callbacks.onCancelar) {
                callbacks.onCancelar();
            }
        });
    }

    // Botón confirmar escaneo
    const btnConfirmar = document.getElementById('btnConfirmarEscanerPZ');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            console.log('✅ Usuario confirmó escaneo');
            if (callbacks && callbacks.onConfirmar) {
                callbacks.onConfirmar();
            }
        });
    }

    // Botón reintentar
    const btnReintentar = document.getElementById('btnReintentoEscanerPZ');
    if (btnReintentar) {
        btnReintentar.addEventListener('click', () => {
            console.log('🔄 Usuario reintentó escaneo');
            limpiarResultadoEscaneo();
            if (callbacks && callbacks.onReintentar) {
                callbacks.onReintentar();
            }
        });
    }

    // Botón saltar producto
    const btnSaltar = document.getElementById('btnSaltarProductoPZ');
    if (btnSaltar) {
        btnSaltar.addEventListener('click', () => {
            console.log('⏭️ Usuario saltó producto');
            limpiarResultadoEscaneo();
            if (callbacks && callbacks.onSaltar) {
                callbacks.onSaltar();
            }
        });
    }

    // Botón iniciar escaneo (manual)
    const btnIniciar = document.getElementById('btnIniciarEscanerPZ');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            console.log('▶️ Usuario inició escaneo manual');
            btnIniciar.style.display = 'none';
            document.getElementById('btnPauseEscanerPZ').style.display = 'inline-block';
            if (callbacks && callbacks.onIniciar) {
                callbacks.onIniciar();
            }
        });
    }

    // Botón pausar escaneo
    const btnPausa = document.getElementById('btnPauseEscanerPZ');
    if (btnPausa) {
        btnPausa.addEventListener('click', () => {
            console.log('⏸️ Usuario pausó escaneo');
            btnPausa.style.display = 'none';
            btnIniciar.style.display = 'inline-block';
            if (callbacks && callbacks.onPausar) {
                callbacks.onPausar();
            }
        });
    }
}

/**
 * Muestra el resultado del escaneo
 */
export function mostrarResultadoEscaneo(productoData) {
    console.log('✅ Mostrando resultado de escaneo:', productoData);

    const tarjeta = document.getElementById('tarjetaProductoEscaneado');
    if (!tarjeta) return;

    // Actualizar datos
    const nombreEl = document.getElementById('scanNombreProducto');
    const codigoEl = document.getElementById('scanCodigoProducto');
    const marcaEl = document.getElementById('scanMarcaProducto');
    const categoriaEl = document.getElementById('scanCategoriaProducto');

    if (nombreEl) nombreEl.textContent = productoData.nombre || '-';
    if (codigoEl) codigoEl.textContent = productoData.codigo || '-';
    if (marcaEl) marcaEl.textContent = productoData.marca || '-';
    if (categoriaEl) categoriaEl.textContent = productoData.categoria || '-';

    // Mostrar tarjeta
    tarjeta.style.display = 'block';
}

/**
 * Limpia el resultado del escaneo
 */
export function limpiarResultadoEscaneo() {
    const tarjeta = document.getElementById('tarjetaProductoEscaneado');
    if (tarjeta) {
        tarjeta.style.display = 'none';
    }
}

/**
 * Actualiza el contador de productos escaneados
 */
export function actualizarContadorEscaneo(escaneados, total, coincidencias) {
    const scanTotalEscaneados = document.getElementById('scanTotalEscaneados');
    const scanTotalFaltantes = document.getElementById('scanTotalFaltantes');
    const scanTotalCoincidencias = document.getElementById('scanTotalCoincidencias');

    if (scanTotalEscaneados) scanTotalEscaneados.textContent = escaneados;
    if (scanTotalFaltantes) scanTotalFaltantes.textContent = total - escaneados;
    if (scanTotalCoincidencias) scanTotalCoincidencias.textContent = coincidencias || 0;
}

/**
 * Cierra el modal de escáner
 */
export function cerrarModalEscanero() {
    const modal = document.getElementById('modalEscanerPZ');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Abre el modal de escáner
 */
export function abrirModalEscanero() {
    const modal = document.getElementById('modalEscanerPZ');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Muestra un mensaje de estado en el escáner
 */
export function mostrarEstadoEscaneo(mensaje, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    // Crear alerta flotante
    const alerta = document.createElement('div');
    alerta.className = `fixed top-4 right-4 p-4 rounded-lg text-white text-sm z-60 animate-fade-in`;
    
    switch(tipo) {
        case 'exito':
            alerta.className += ' bg-green-500';
            break;
        case 'error':
            alerta.className += ' bg-red-500';
            break;
        case 'advertencia':
            alerta.className += ' bg-yellow-500';
            break;
        default:
            alerta.className += ' bg-blue-500';
    }
    
    alerta.textContent = mensaje;
    document.body.appendChild(alerta);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}
