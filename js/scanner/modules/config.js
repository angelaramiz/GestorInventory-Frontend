// Módulo de configuración para lotes-avanzado.js

// Configuración de escaneo
export let configuracionEscaneo = {
    confirmarProductosSimilares: false,  // Deshabilitado por defecto
    agruparAutomaticamente: true,
    sonidoConfirmacion: true,
    relacionarProductos: true // default ON
};

// Variables globales para el escaneo por lotes avanzado
export let scannerLotesAvanzado = null;
export let productosEscaneados = []; // Array de productos escaneados
export let productosAgrupados = []; // Array de productos agrupados por primario
export let isEscaneoLotesAvanzadoActivo = false;
export let isScannerTransitioning = false; // Bloqueo para evitar transiciones simultáneas

// Variables para control de debounce de escaneo
export let ultimoCodigoEscaneado = null;
export let tiempoUltimoEscaneo = 0;
export const TIEMPO_DEBOUNCE = 5000; // 5 segundos - optimizado para escaneo más rápido

// Diccionario para productos subproductos (se cargará desde Supabase)
export let diccionarioSubproductos = new Map();

// Precio por kilo temporal para cálculos iniciales (se actualizará con el precio real del usuario)
export const precioKiloTemporal = 100.00; // Precio base temporal en pesos

// Mapa para almacenar precios por kilo ingresados por el usuario (PLU -> precio por kilo)
export let preciosPorKiloGuardados = new Map();

// Función para inicializar configuración desde localStorage
export function inicializarConfiguracion() {
    try {
        const storedRelacionar = localStorage.getItem('lotes_relacionarProductos');
        if (storedRelacionar === null) {
            configuracionEscaneo.relacionarProductos = true; // default ON
        } else {
            configuracionEscaneo.relacionarProductos = (storedRelacionar === '1' || storedRelacionar === 'true');
        }
    } catch (e) {
        // Si localStorage no está disponible, usar default
        configuracionEscaneo.relacionarProductos = true;
    }
}

// Función para limpiar variables de debounce
export function limpiarDebounce() {
    ultimoCodigoEscaneado = null;
    tiempoUltimoEscaneo = 0;
    console.log('Variables de debounce limpiadas');
}