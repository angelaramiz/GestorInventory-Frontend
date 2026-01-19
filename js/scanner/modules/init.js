// Módulo de inicialización para lotes-avanzado.js

import { configuracionEscaneo, inicializarConfiguracion, isEscaneoLotesAvanzadoActivo, scannerLotesAvanzado } from './config.js';
import { cargarDiccionarioSubproductos } from './processor.js';
import { iniciarEscaneoLotesAvanzado, cerrarModalLotesAvanzado, pausarEscaneoLotesAvanzado, finalizarEscaneoLotesAvanzado, reanudarEscaneoLotesAvanzado } from './scanner.js';
import { cerrarModalInfoProducto, guardarInfoProducto } from './core.js';
import { guardarInventarioLotesAvanzado } from './storage.js';
import { inicializarSeleccionInventario } from './selection.js';

// Función para inicializar el sistema de lotes avanzado
export function inicializarSistemaLotesAvanzado() {
    console.log('inicializarSistemaLotesAvanzado() llamada, document.readyState:', document.readyState);
    
    // Usar setTimeout para asegurar que el DOM esté completamente listo
    setTimeout(() => {
        _inicializarElementos();
    }, 100);
}

function _inicializarElementos() {
    console.log('_inicializarElementos() ejecutada');
    
    // Inicializar configuración
    inicializarConfiguracion();

    // Inicializar estado de checkboxes de configuración
    const checkboxConfirmar = document.getElementById('confirmarProductosSimilares');
    const checkboxAgrupar = document.getElementById('agruparAutomaticamente');
    const checkboxSonido = document.getElementById('sonidoConfirmacion');

    if (checkboxConfirmar) {
        checkboxConfirmar.checked = configuracionEscaneo.confirmarProductosSimilares;
    }
    if (checkboxAgrupar) {
        checkboxAgrupar.checked = configuracionEscaneo.agruparAutomaticamente;
    }
    if (checkboxSonido) {
        checkboxSonido.checked = configuracionEscaneo.sonidoConfirmacion;
    }

    // Checkbox para relacionar productos (por defecto true). Reflejar valor persistido y asegurar listener
    const checkboxRelacionar = document.getElementById('relacionarProductos');
    if (checkboxRelacionar) {
        checkboxRelacionar.checked = configuracionEscaneo.relacionarProductos;
        // Guardar cambios en localStorage cuando el usuario lo modifique
        checkboxRelacionar.addEventListener('change', function () {
            configuracionEscaneo.relacionarProductos = this.checked;
            try {
                localStorage.setItem('lotes_relacionarProductos', this.checked ? '1' : '0');
            } catch (e) {
                console.warn('No se pudo guardar en localStorage:', e);
            }
            console.log('Configuración relacionar productos cambiada:', this.checked);
        });
    }

    // Event listeners para las pestañas principales
    const tabManual = document.getElementById('tabInventarioManual');
    const tabAvanzado = document.getElementById('tabLotesAvanzado');

    
    console.log('Botones encontrados:', { tabManual: !!tabManual, tabAvanzado: !!tabAvanzado });
    
    if (tabManual) {
        tabManual.addEventListener('click', () => {
            console.log('Cambiando a pestaña manual');
            cambiarPestanaPrincipal('manual');
        });
    } else {
        console.warn('No se encontró el botón tabInventarioManual');
    }

    if (tabAvanzado) {
        tabAvanzado.addEventListener('click', () => {
            console.log('Cambiando a pestaña avanzado');
            cambiarPestanaPrincipal('avanzado');
        });
    } else {
        console.warn('No se encontró el botón tabLotesAvanzado');
    }

    // Event listeners para configuración
    document.getElementById('confirmarProductosSimilares')?.addEventListener('change', function () {
        configuracionEscaneo.confirmarProductosSimilares = this.checked;
        console.log('Configuración confirmación cambiada:', this.checked);
    });

    document.getElementById('agruparAutomaticamente')?.addEventListener('change', function () {
        configuracionEscaneo.agruparAutomaticamente = this.checked;
        console.log('Configuración agrupación cambiada:', this.checked);
    });

    document.getElementById('sonidoConfirmacion')?.addEventListener('change', function () {
        configuracionEscaneo.sonidoConfirmacion = this.checked;
        console.log('Configuración sonido cambiada:', this.checked);
    });

    // Inicializar selección de tipo de inventario (FASE 1)
    inicializarSeleccionInventario();

    // Event listeners para el modal de escaneo
    document.getElementById('cerrarModalLotesAvanzado')?.addEventListener('click', cerrarModalLotesAvanzado);
    document.getElementById('pausarEscaneoLotesAvanzado')?.addEventListener('click', pausarEscaneoLotesAvanzado);
    document.getElementById('finalizarEscaneoLotesAvanzado')?.addEventListener('click', finalizarEscaneoLotesAvanzado);

    // Event listeners para las pestañas del modal
    document.getElementById('tabEscanerAvanzado')?.addEventListener('click', () => {
        cambiarTabModalAvanzado('escaner');
    });

    document.getElementById('tabListadoAvanzado')?.addEventListener('click', () => {
        cambiarTabModalAvanzado('listado');
    });

    // Event listeners para el modal de información de producto
    document.getElementById('cerrarModalInfoProducto')?.addEventListener('click', cerrarModalInfoProducto);
    document.getElementById('cancelarInfoProducto')?.addEventListener('click', cerrarModalInfoProducto);
    document.getElementById('guardarInfoProducto')?.addEventListener('click', guardarInfoProducto);

    // Event listener para guardar inventario
    document.getElementById('guardarInventarioLotesAvanzado')?.addEventListener('click', guardarInventarioLotesAvanzado);

    // Cargar diccionario de subproductos al inicializar
    cargarDiccionarioSubproductos();
}

// Función para cambiar entre pestañas principales
export function cambiarPestanaPrincipal(tipo) {
    console.log('Cambiando pestaña a:', tipo);
    
    const tabManual = document.getElementById('tabInventarioManual');
    const tabAvanzado = document.getElementById('tabLotesAvanzado');
    const contenidoManual = document.getElementById('contenidoInventarioManual');
    const contenidoAvanzado = document.getElementById('contenidoLotesAvanzado');
    
    console.log('Elementos encontrados:', {
        tabManual: !!tabManual,
        tabAvanzado: !!tabAvanzado,
        contenidoManual: !!contenidoManual,
        contenidoAvanzado: !!contenidoAvanzado
    });

    if (tipo === 'manual') {
        // Activar pestaña manual
        tabManual.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500 font-semibold';
        tabAvanzado.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300 font-semibold';

        // Mostrar contenido manual
        contenidoManual.style.display = 'block';
        contenidoAvanzado.style.display = 'none';
        console.log('Pestaña manual activada');
    } else if (tipo === 'avanzado') {
        // Activar pestaña avanzado
        tabManual.className = 'px-6 py-3 bg-gray-200 text-gray-700 rounded-t-lg hover:bg-gray-300 font-semibold';
        tabAvanzado.className = 'px-6 py-3 bg-blue-500 text-white rounded-t-lg ml-2 border-b-2 border-blue-500 font-semibold';

        // Mostrar contenido avanzado
        contenidoManual.style.display = 'none';
        contenidoAvanzado.style.display = 'block';
        console.log('Pestaña avanzado activada');
    }
}

// Función para cambiar pestañas en el modal avanzado
export function cambiarTabModalAvanzado(tab) {
    const tabEscaner = document.getElementById('tabEscanerAvanzado');
    const tabListado = document.getElementById('tabListadoAvanzado');
    const contenidoEscaner = document.getElementById('contenidoEscanerAvanzado');
    const contenidoListado = document.getElementById('contenidoListadoAvanzado');

    if (tab === 'escaner') {
        // Activar pestaña escáner
        tabEscaner.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg border-b-2 border-blue-500';
        tabListado.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg ml-2 hover:bg-gray-300';

        // Mostrar contenido escáner
        contenidoEscaner.style.display = 'block';
        contenidoListado.style.display = 'none';

        // Reanudar escáner si estaba pausado
        if (!isEscaneoLotesAvanzadoActivo && scannerLotesAvanzado) {
            reanudarEscaneoLotesAvanzado();
        }
    } else if (tab === 'listado') {
        // Activar pestaña listado
        tabEscaner.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg hover:bg-gray-300';
        tabListado.className = 'px-4 py-2 bg-blue-500 text-white rounded-t-lg ml-2 border-b-2 border-blue-500';

        // Mostrar contenido listado
        contenidoEscaner.style.display = 'none';
        contenidoListado.style.display = 'block';

        // Pausar escáner al cambiar a listado
        if (isEscaneoLotesAvanzadoActivo && scannerLotesAvanzado) {
            pausarEscaneoLotesAvanzado();
        }
    }
}