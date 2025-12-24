// utils.js
// Funciones utilitarias

import { db, dbInventario } from './db-init.js';
import { mostrarMensaje } from '../utils/logs.js';

// Función para resetear la base de datos
export function resetearBaseDeDatos(database, storeName) {
    const transaction = database.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.clear();

    request.onsuccess = function (event) {
        console.log(`Base de datos de ${storeName} limpiada correctamente`);
        mostrarMensaje(
            `Base de datos de ${storeName} reseteada correctamente`,
            "success"
        );
        // Nota: Las funciones de recarga se llaman desde los módulos respectivos si es necesario
    };

    request.onerror = function (event) {
        console.error(
            `Error al limpiar la base de datos de ${storeName}:`,
            event.target.error
        );
        mostrarMensaje(
            `Error al resetear la base de datos de ${storeName}`,
            "error"
        );
    };
}

// Función para generar una plantilla de inventario en formato CSV
export function generarPlantillaInventario() {
    // Crear encabezados para la plantilla de inventario
    const headers = "Código,Nombre,Categoría,Marca,Lote,Unidad,Cantidad,Fecha de Caducidad,Comentarios\n";

    // Crear filas de ejemplo (opcional)
    let filaEjemplo = "123456,Producto de ejemplo,Categoría,Marca,1,Pz,10,2025-12-31,Comentarios de ejemplo\n";

    // Combinar encabezados y ejemplo
    const csv = "\uFEFFCódigo,Nombre,Categoría,Marca,Lote,Unidad,Cantidad,Fecha de Caducidad,Comentarios\n" + filaEjemplo;

    // Crear el blob y descargar
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
        const nombreArchivo = `plantilla_inventario_${fecha}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", nombreArchivo);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Mostrar mensaje de éxito
        mostrarMensaje("Plantilla de inventario generada correctamente", "success");
    } else {
        mostrarMensaje("Tu navegador no soporta la descarga de archivos", "error");
    }
}