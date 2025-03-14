const CACHE_NAME = 'gestor-inventory-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
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