// Prueba de la función buscarProductoPorPLU (versión simplificada)
async function buscarProductoPorPLU(plu) {
    try {
        console.log(`Buscando producto con PLU: ${plu}`);

        // Simular búsqueda en IndexedDB (sin conexión real)
        console.log('Simulando búsqueda en IndexedDB...');

        // Simular que no se encuentra en IndexedDB
        console.log(`Producto no encontrado en IndexedDB, buscando en Supabase...`);

        // Simular búsqueda en Supabase (sin conexión real)
        console.log('Simulando búsqueda en Supabase...');

        // Simular que no se encuentra
        console.log('Producto no encontrado en ninguna base de datos');

        return null;

    } catch (error) {
        console.error('Error al buscar producto por PLU:', error);
        return null;
    }
}

// Probar con PLU 8310
buscarProductoPorPLU('8310').then(resultado => {
    console.log('Resultado de búsqueda:', resultado);
});