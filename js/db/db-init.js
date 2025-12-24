// db-init.js
// Variables globales y inicialización de bases de datos

export let db;
export let dbInventario;
export let dbEntradas;

// Nombre y versión de la base de datos
const dbName = "ProductosDB";
const dbVersion = 1;

// Inicialización de la base de datos
export function inicializarDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = event => {
            console.error("Error al abrir la base de datos:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = event => {
            db = event.target.result;
            console.log("Base de datos inicializada correctamente");
            resolve(db);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;

            // Crear object store para productos si no existe
            if (!db.objectStoreNames.contains("productos")) {
                const objectStore = db.createObjectStore("productos", { keyPath: "codigo" });
                objectStore.createIndex("nombre", "nombre", { unique: false });
                objectStore.createIndex("categoria", "categoria", { unique: false });
                objectStore.createIndex("marca", "marca", { unique: false });
                objectStore.createIndex("unidad", "unidad", { unique: false });
            }

            console.log("Base de datos actualizada a la versión", dbVersion);
        };
    });
}

// Inicialización de la base de datos de inventario
export function inicializarDBInventario() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("InventarioDB", 3); // Incrementamos la versión para forzar la actualización de índices

        request.onerror = event => {
            console.error("Error al abrir la base de datos de inventario:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = event => {
            dbInventario = event.target.result;
            console.log("Base de datos de inventario inicializada correctamente");
            resolve(dbInventario);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;

            // Crear object store para inventario si no existe
            if (!db.objectStoreNames.contains("inventario")) {
                const objectStore = db.createObjectStore("inventario", { keyPath: "id", autoIncrement: true });
                objectStore.createIndex("codigo", "codigo", { unique: false });
                objectStore.createIndex("nombre", "nombre", { unique: false });
                objectStore.createIndex("categoria", "categoria", { unique: false });
                objectStore.createIndex("marca", "marca", { unique: false });
                objectStore.createIndex("unidad", "unidad", { unique: false });
                objectStore.createIndex("cantidad", "cantidad", { unique: false });
                objectStore.createIndex("caducidad", "caducidad", { unique: false });
                objectStore.createIndex("comentarios", "comentarios", { unique: false });
                objectStore.createIndex("area_id", "area_id", { unique: false });
                objectStore.createIndex("areaName", "areaName", { unique: false });
                objectStore.createIndex("usuario_id", "usuario_id", { unique: false });
                objectStore.createIndex("last_modified", "last_modified", { unique: false });
            }

            console.log("Base de datos de inventario actualizada");
        };
    });
}

// Inicialización de la base de datos para registro de entradas
export function inicializarDBEntradas() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("RegistroEntradasDB", 1);

        request.onerror = function (event) {
            console.error("Error al abrir la base de datos de entradas:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function (event) {
            dbEntradas = event.target.result;
            console.log("Base de datos de entradas inicializada correctamente");
            resolve(dbEntradas);
        };

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            // Crear object store para registro_entradas si no existe
            if (!db.objectStoreNames.contains("registro_entradas")) {
                const objectStore = db.createObjectStore("registro_entradas", { keyPath: "id", autoIncrement: true });
                objectStore.createIndex("codigo", "codigo", { unique: false });
                objectStore.createIndex("nombre", "nombre", { unique: false });
                objectStore.createIndex("categoria", "categoria", { unique: false });
                objectStore.createIndex("marca", "marca", { unique: false });
                objectStore.createIndex("unidad", "unidad", { unique: false });
                objectStore.createIndex("cantidad", "cantidad", { unique: false });
                objectStore.createIndex("fecha_entrada", "fecha_entrada", { unique: false });
                objectStore.createIndex("proveedor", "proveedor", { unique: false });
                objectStore.createIndex("numero_factura", "numero_factura", { unique: false });
                objectStore.createIndex("usuario_id", "usuario_id", { unique: false });
                objectStore.createIndex("created_at", "created_at", { unique: false });
                objectStore.createIndex("updated_at", "updated_at", { unique: false });
            }

            console.log("Base de datos de entradas actualizada");
        };
    });
}