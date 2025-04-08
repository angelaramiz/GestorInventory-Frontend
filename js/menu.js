document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuRoutes = document.getElementById('menuRoutes');

    const routes = [
        { name: 'Consulta de Producto', path: './consulta.html' },
        { name: 'Editar Producto', path: './editar.html' },
        { name: 'Inventario', path: './inventario.html' },
        { name: 'Reporte para Inventario', path: './report.html' },
        { name: 'Agregar Productos', path: './agregar.html' },
        { name: 'Administración de Archivos', path: './archivos.html' }
    ];

    // Generar las rutas dinámicamente
    routes.forEach(route => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${route.path}" class="text-blue-500 hover:underline">${route.name}</a>`;
        menuRoutes.appendChild(li);
    });

    // Mostrar el menú
    menuToggle?.addEventListener('click', () => {
        sideMenu.classList.remove('-translate-x-full');
    });

    // Ocultar el menú
    closeMenu?.addEventListener('click', () => {
        sideMenu.classList.add('-translate-x-full');
    });
});
