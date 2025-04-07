//importaciones
import { cargarDatosEnTabla } from "./db-operations.js";
import { iniciarEscaneoConModal, detenerEscaner } from "./scanner.js";

// Funciones de mensajes y alertas

// Función para mostrar mensajes con SweetAlert2 y mejoras visuales
export function mostrarMensaje(mensaje, tipo, opciones = {}) {
    const iconosValidos = ["success", "error", "warning", "info", "question"];
    const icono = iconosValidos.includes(tipo) ? tipo : "info";

    Swal.fire({
        title: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        text: mensaje,
        icon: icono,
        timer: opciones.timer || 2000,
        showConfirmButton: opciones.showConfirmButton || false,
    });
}

// Mostrar resultado de carga con animación de progreso
export function mostrarResultadoCarga(successCount, errorCount) {
    const mensaje = `Carga completada. ${successCount} productos agregados/actualizados. ${errorCount} errores.`;
    const icon = errorCount > 0 ? "warning" : "success";
    const totalOperaciones = successCount + errorCount;

    let progressBarHTML = "";
    if (totalOperaciones > 0) {
        const porcentajeExito = Math.round((successCount / totalOperaciones) * 100);
        progressBarHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: 0%;"></div>
            </div>
        `;
    } else {
        progressBarHTML = 'No se registraron operaciones';
    }

    Swal.fire({
        title: errorCount > 0 ? "Advertencia" : "Éxito",
        html: `${mensaje}${progressBarHTML}`,
        icon: icon,
        timer: 2000,
        showConfirmButton: false,
        didOpen: () => {
            if (progressBarHTML) {
                const progressBarElement = document.querySelector(".progress-bar");
                if (progressBarElement) {
                    progressBarElement.style.transition = "width 2s ease-in-out";
                    progressBarElement.style.width = `${porcentajeExito}%`;
                }
            }
        },
        willClose: () => {
            cargarDatosEnTabla();
        }
    });
}

// Crear un contador para llevar registro de las burbujas activas
let burbujaCount = 0;
const OFFSET_Y = 10; // Espacio vertical entre burbujas en píxeles
const BURBUJA_HEIGHT = 60; // Altura aproximada de cada burbuja en píxeles (ajustar según diseño)

// Función para mostrar alertas de estado como burbujas en cascada
export function mostrarAlertaBurbuja(mensaje, tipo) {
    // Incrementar contador para esta burbuja
    const burbujaIndex = burbujaCount++;
    
    const burbuja = document.createElement('div');
    burbuja.className = `alerta-burbuja ${tipo}`;
    burbuja.textContent = mensaje;
    burbuja.style.position = 'fixed';
    burbuja.style.right = '20px';
    burbuja.style.top = `${OFFSET_Y + (burbujaIndex * (BURBUJA_HEIGHT + 10))}px`; // Posicionar en cascada
    burbuja.style.zIndex = '9999';
    burbuja.style.opacity = '0';
    burbuja.style.transform = 'translateX(50px)';
    burbuja.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    document.body.appendChild(burbuja);

    // Mostrar la burbuja con animación
    setTimeout(() => {
        burbuja.style.opacity = '1';
        burbuja.style.transform = 'translateX(0)';
    }, 10);

    // Ocultar la burbuja después de 3 segundos
    setTimeout(() => {
        burbuja.style.opacity = '0';
        burbuja.style.transform = 'translateX(50px)';
        
        // Eliminar la burbuja del DOM después de la animación
        setTimeout(() => {
            burbuja.remove();
            // Ajustar posición de las burbujas restantes
            reposicionarBurbujas();
            // Decrementar contador cuando se elimina
            burbujaCount--;
        }, 300);
    }, 3000);
}

// Función para reposicionar las burbujas activas
function reposicionarBurbujas() {
    const burbujas = document.querySelectorAll('.alerta-burbuja');
    burbujas.forEach((burbuja, index) => {
        burbuja.style.top = `${OFFSET_Y + (index * (BURBUJA_HEIGHT + 10))}px`;
    });
}

// También necesitamos agregar estilos adicionales para las burbujas
const agregarEstilosBurbuja = () => {
    if (!document.getElementById('estilos-burbuja')) {
        const estilos = document.createElement('style');
        estilos.id = 'estilos-burbuja';
        estilos.textContent = `
            .alerta-burbuja {
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: white;
                font-size: 14px;
                min-width: 200px;
                max-width: 400px;
                margin-bottom: 10px;
                z-index: 9999;
            }
            
            .alerta-burbuja.success {
                background-color: #4caf50;
            }
            
            .alerta-burbuja.error {
                background-color: #f44336;
            }
            
            .alerta-burbuja.warning {
                background-color: #ff9800;
            }
            
            .alerta-burbuja.info {
                background-color: #2196f3;
            }
        `;
        document.head.appendChild(estilos);
    }
};

// Ejecutar cuando se carga el script
agregarEstilosBurbuja();

// Ventana modal con transición para escáner
export function mostrarModalEscaneo(inputId) {
    const modalHtml = `
        <div id="scanner-modal" class="scanner-modal">
            <div class="scanner-modal-content">
                <span class="scanner-close-btn">&times;</span>
                <h2>Escanear Código</h2>
                <div id="scanner-container-modal">
                    <div id="reader"></div>
                </div>
                <div class="scanner-loader">Cargando cámara...</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = document.getElementById("scanner-modal");
    const closeButton = document.querySelector(".scanner-close-btn");
    const loader = document.querySelector(".scanner-loader");

    // Animación de entrada
    setTimeout(() => modal.classList.add("scanner-modal-show"), 10);

    // Iniciar escáner después de la animación
    setTimeout(() => {
        iniciarEscaneoConModal(inputId);
        loader.style.display = "none";
        // Forzar un redibujado del contenedor
        const scannerContainer = document.getElementById("scanner-container-modal");
        scannerContainer.style.display = 'block';
        scannerContainer.offsetHeight; // Trigger reflow

    }, 500);

    // Cerrar modal
    closeButton.onclick = () => cerrarModalEscaneo(modal);
    window.onclick = event => {
        if (event.target === modal) cerrarModalEscaneo(modal);
    };
}

export function cerrarModalEscaneo(modal) {
    modal.classList.remove("scanner-modal-show");
    setTimeout(() => {
        detenerEscaner();
        modal.remove();
    }, 300);
}

// Estilos personalizados para ventanas modales y transiciones
// Verificar si los estilos ya existen
const styleId = 'gestor-inventory-styles'; // ID único para identificar los estilos
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId; // Asignar un ID único al elemento <style>
    style.textContent = `
        .scanner-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }
        .scanner-modal-show {
            display: flex;
            opacity: 1;
        }
        .scanner-modal-content {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            position: relative;
            animation: fadeIn 0.5s ease-in-out;
        }
        .scanner-close-btn {
            position: absolute;
            right: 10px;
            top: 5px;
            font-size: 20px;
            cursor: pointer;
        }
        .scanner-loader {
            text-align: center;
            margin-top: 20px;
            font-size: 16px;
            color: #555;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .progress-bar-container {
            width: 100%;
            background-color: #f3f3f3;
            border-radius: 5px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-bar {
            height: 10px;
            background-color: #4caf50;
            width: 0;
            transition: width 2s ease-in-out;
        }
        .custom-alert {
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
        .custom-alert-title {
            font-size: 18px;
            font-weight: bold;
        }
        .custom-alert-text {
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}
