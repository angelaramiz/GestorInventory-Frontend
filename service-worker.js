const CACHE_NAME = "gestor-inventory-v2";

// Detectar si estamos en localhost o en GitHub Pages
const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
const BASE_PATH = isLocalhost ? "" : "/GestorInventory-Frontend";

// Rutas de los recursos que se almacenarán en la caché
const ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/css/styles.css`,
    `${BASE_PATH}/js/main.js`,
    `${BASE_PATH}/js/auth.js`,
    `${BASE_PATH}/librerías/tailwind.min.css`,
    `${BASE_PATH}/librerías/sweetalert2@11.js`,
    `${BASE_PATH}/register.html`,
    `${BASE_PATH}/manifest.json`
    // Añade más recursos estáticos aquí
];

self.addEventListener("install", event => {
    console.log("🔧 Service Worker: Instalando...");
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => {
                console.log("📦 Service Worker: Cacheando archivos principales");
                return cache.addAll(
                    ASSETS.map(asset => new Request(asset, { mode: "no-cors" }))
                );
            })
            .then(() => {
                console.log("✅ Service Worker: Archivos cacheados exitosamente");
            })
            .catch(error => {
                console.error("❌ Service Worker: Error al cachear archivos:", error);
            })
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("🚀 Service Worker: Activando...");
    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(
                                "🗑️ Service Worker: Eliminando caché antigua:",
                                cacheName
                            );
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log("✅ Service Worker: Activado correctamente");
            })
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // Filtrar solicitudes que no debemos manejar
    const shouldIgnore =
        // Extensiones de Chrome
        url.protocol === "chrome-extension:" ||
        // APIs externas
        url.hostname.includes("supabase.co") ||
        url.hostname.includes("gestorinventory-backend.fly.dev") ||
        // CDNs y recursos externos
        url.hostname.includes("cdn.jsdelivr.net") ||
        url.hostname.includes("googleapis.com") ||
        // Métodos que no sean GET
        event.request.method !== "GET" ||
        // URLs que contienen parámetros de autenticación
        url.search.includes("token") ||
        url.search.includes("auth");

    if (shouldIgnore) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                // Solo loggear archivos importantes, no todos
                if (
                    event.request.url.includes(".js") ||
                    event.request.url.includes(".css") ||
                    event.request.url.includes(".html")
                ) {
                    console.log(
                        "📄 SW: Cache hit ->",
                        event.request.url.split("/").pop()
                    );
                }
                return response;
            }

            // Solo loggear descargas importantes
            if (
                event.request.url.includes(".js") ||
                event.request.url.includes(".css") ||
                event.request.url.includes(".html")
            ) {
                console.log(
                    "⬇️ SW: Downloading ->",
                    event.request.url.split("/").pop()
                );
            }

            return fetch(event.request)
                .then(response => {
                    // Solo cachear respuestas exitosas y del mismo origen
                    if (
                        response.status === 200 &&
                        (url.origin === location.origin || url.protocol === "https:")
                    ) {
                        const responseClone = response.clone();
                        caches
                            .open(CACHE_NAME)
                            .then(cache => {
                                // Verificar nuevamente antes de guardar en caché
                                try {
                                    cache.put(event.request, responseClone);
                                } catch (error) {
                                    console.warn(
                                        "⚠️ SW: No se pudo cachear:",
                                        event.request.url.split("/").pop()
                                    );
                                }
                            })
                            .catch(error =>
                                console.warn("⚠️ SW: Error al abrir caché:", error)
                            );
                    }
                    return response;
                })
                .catch(error => {
                    console.error(
                        "❌ SW: Error en fetch:",
                        event.request.url.split("/").pop(),
                        error.message
                    );
                    // Retornar una respuesta de fallback si es necesario
                    if (event.request.destination === "document") {
                        return caches.match("/index.html") || caches.match("./index.html");
                    }
                    // Para otros recursos, retornar el error
                    throw error;
                });
        })
    );
});
