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
    `${BASE_PATH}/js/core/main.js`,
    `${BASE_PATH}/js/auth/auth.js`,
    `${BASE_PATH}/js/lib/tailwind.min.css`,
    `${BASE_PATH}/js/lib/sweetalert2@11.js`,
    `${BASE_PATH}/register.html`,
    `${BASE_PATH}/manifest.json`
    // Añade más recursos estáticos aquí
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(
                    ASSETS.map(asset => new Request(asset, { mode: "no-cors" }))
                );
            })
            .catch(error => {
                console.error("❌ Service Worker: Error al cachear archivos:", error);
            })
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
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
                return response;
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
                                    // Error silencioso
                                }
                            })
                            .catch(error => {
                                // Error silencioso
                            });
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
