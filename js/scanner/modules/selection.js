// Módulo para selección de tipo de inventario (FASE 1)
// Gestiona la selección entre KG y PZ

export function inicializarSeleccionInventario() {
    const btnIniciar = document.getElementById('iniciarEscaneoLotesAvanzado');
    const modalSeleccion = document.getElementById('modalSeleccionInventario');
    const btnKG = document.getElementById('btnInventarioKG');
    const btnPZ = document.getElementById('btnInventarioPZ');
    const btnCancelar = document.getElementById('btnCancelarSeleccion');

    if (!btnIniciar) {
        console.error('❌ No se encontró el botón iniciarEscaneoLotesAvanzado');
        return;
    }

    // Click en botón principal: mostrar modal de selección
    btnIniciar.addEventListener('click', () => {
        console.log('📦 Abriendo modal de selección de inventario');
        modalSeleccion.style.display = 'flex';
    });

    // Opción KG: flujo existente
    if (btnKG) {
        btnKG.addEventListener('click', () => {
            console.log('⚖️ Seleccionado: Inventario por KG');
            modalSeleccion.style.display = 'none';

            // Importar y ejecutar flujo KG existente
            import('./scanner.js').then((module) => {
                if (typeof module.iniciarEscaneoLotesAvanzado === 'function') {
                    module.iniciarEscaneoLotesAvanzado();
                } else {
                    console.error('❌ No se encontró iniciarEscaneoLotesAvanzado');
                }
            });
        });
    }

    // Opción PZ: nuevo flujo (FASE 2+)
    if (btnPZ) {
        btnPZ.addEventListener('click', () => {
            console.log('📋 Seleccionado: Inventario por PZ (Secciones y Niveles)');
            modalSeleccion.style.display = 'none';

            // Importar y ejecutar flujo PZ (cuando esté listo)
            import('./pz-modo.js').then((module) => {
                if (typeof module.iniciarInventarioPZ === 'function') {
                    module.iniciarInventarioPZ();
                } else {
                    console.warn('⚠️ Módulo PZ aún no implementado');
                    alert('El modo PZ está en desarrollo');
                }
            }).catch((error) => {
                console.warn('⚠️ Módulo PZ aún no disponible:', error.message);
                alert('El modo PZ aún no está disponible');
            });
        });
    }

    // Botón Cancelar
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            console.log('❌ Cancelado: Modal de selección cerrado');
            modalSeleccion.style.display = 'none';
        });
    }

    // Cerrar modal al hacer click fuera
    modalSeleccion.addEventListener('click', (e) => {
        if (e.target === modalSeleccion) {
            console.log('❌ Modal cerrado (click afuera)');
            modalSeleccion.style.display = 'none';
        }
    });
}
