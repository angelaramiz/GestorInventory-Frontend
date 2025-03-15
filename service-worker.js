const CACHE_NAME = 'gestor-inventory-v1';

// Detectar si estamos en localhost o en GitHub Pages
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const BASE_PATH = isLocalhost ? '' : '/GestorInventory-Frontend';

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
    `${BASE_PATH}/manifest.json`,
    // Añade más recursos estáticos aquí
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});