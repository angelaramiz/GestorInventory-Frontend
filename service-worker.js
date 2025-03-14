const CACHE_NAME = 'gestor-inventory-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    // Añade más recursos estáticos aquí
];

// Detectar si estamos en localhost o en GitHub Pages
const BASE_PATH = location.hostname === 'localhost' ? '' : '/GestorInventory-Frontend';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS.map(asset => BASE_PATH + asset)))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});