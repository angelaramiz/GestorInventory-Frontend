// Script de diagnóstico para sincronización de entradas
// Ejecutar en la consola del navegador para verificar el estado

function diagnosticarSincronizacionEntradas() {
    console.log("🔍 DIAGNÓSTICO DE SINCRONIZACIÓN DE ENTRADAS");
    console.log("============================================");

    // Verificar conexión
    console.log("🌐 Estado de conexión:", navigator.onLine ? "✅ Online" : "❌ Offline");

    // Verificar usuario
    const usuarioId = localStorage.getItem('usuario_id');
    console.log("👤 Usuario ID:", usuarioId ? `✅ ${usuarioId}` : "❌ No encontrado");

    // Verificar cola de sincronización
    const syncQueue = JSON.parse(localStorage.getItem('syncQueueEntradas') || '[]');
    console.log("📋 Cola de sincronización:", syncQueue.length, "elementos");
    if (syncQueue.length > 0) {
        console.log("📋 Contenido de la cola:");
        syncQueue.forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}, Código: ${item.codigo}, Cantidad: ${item.cantidad}`);
        });
    }

    // Verificar último sync
    const lastSync = localStorage.getItem('lastSyncEntradas');
    console.log("⏰ Última sincronización:", lastSync || "Nunca");

    // Verificar base de datos local
    if (typeof dbEntradas !== 'undefined' && dbEntradas) {
        const transaction = dbEntradas.transaction(["registro_entradas"], "readonly");
        const objectStore = transaction.objectStore("registro_entradas");
        const request = objectStore.count();

        request.onsuccess = function() {
            console.log("💾 Registros en IndexedDB:", request.result);

            // Mostrar algunos registros de ejemplo
            const getAllRequest = objectStore.getAll();
            getAllRequest.onsuccess = function() {
                const registros = getAllRequest.result;
                console.log("📊 Registros de ejemplo:");
                registros.slice(0, 3).forEach((reg, index) => {
                    console.log(`   ${index + 1}. ${reg.nombre} - ${reg.cantidad} ${reg.unidad} (${reg.is_temp_id ? 'Temporal' : 'Sincronizado'})`);
                });

                console.log("🔍 Diagnóstico completado");
                console.log("💡 Si hay elementos en la cola pero no se sincronizan:");
                console.log("   1. Verifica que el script SQL se ejecutó en Supabase");
                console.log("   2. Verifica que estás online");
                console.log("   3. Revisa la consola por errores de red");
                console.log("   4. Si hay errores de 'Key already exists', ejecuta limpiarColaSincronizacionEntradas()");
                console.log("   5. Intenta recargar la página y sincronizar nuevamente");
            };
        };
    } else {
        console.log("💾 Base de datos IndexedDB: ❌ No inicializada");
    }
}

// Función para limpiar la cola de sincronización (usar con cuidado)
function limpiarColaSincronizacionEntradas() {
    if (confirm("¿Estás seguro de que quieres limpiar la cola de sincronización? Esto eliminará todos los datos pendientes de sincronización.")) {
        localStorage.setItem('syncQueueEntradas', '[]');
        console.log("🧹 Cola de sincronización limpiada");
        location.reload();
    }
}

// Hacer las funciones disponibles globalmente
window.diagnosticarSincronizacionEntradas = diagnosticarSincronizacionEntradas;
window.limpiarColaSincronizacionEntradas = limpiarColaSincronizacionEntradas;

console.log("🔧 Funciones de diagnóstico disponibles:");
console.log("   diagnosticarSincronizacionEntradas() - Ver estado de sincronización");
console.log("   limpiarColaSincronizacionEntradas() - Limpiar cola (con confirmación)");