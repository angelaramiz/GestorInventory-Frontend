// rep-utils.js - Utilidades para reportes

// Helper: parsear una fecha tipo 'YYYY-MM-DD' o ISO y devolver una Date en la fecha local
export function parseDateLocal(fecha) {
    if (!fecha) return null;
    if (fecha instanceof Date && !isNaN(fecha)) {
        return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }
    const s = String(fecha).trim();
    // Formato exacto YYYY-MM-DD -> crear Date en hora local (evitar conversión UTC)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const d = parseInt(m[3], 10);
        return new Date(y, mo, d);
    }

    // Intentar parseo general (ISO u otros). Luego convertir a fecha local usando componentes año/mes/día
    const dt = new Date(s);
    if (!isNaN(dt)) {
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }

    return null;
}

export function formatDateLocal(fecha) {
    const d = parseDateLocal(fecha);
    return d ? d.toLocaleDateString('es-ES') : null;
}

// Función para fusionar productos que son el mismo pero tienen diferentes lotes
export function fusionarProductosPorCodigo(productos, todasLasAreas) {
    const productosFusionados = [];
    const mapaProductos = new Map(); // Usamos un mapa para agrupar por código

    // Agrupar productos por código
    productos.forEach(producto => {
        const codigo = producto.codigo || 'sincodigo';

        // Si el código ya existe, actualizamos el producto existente
        if (mapaProductos.has(codigo)) {
            const productoExistente = mapaProductos.get(codigo);

            // Sumar cantidades (como números) y redondear a 3 decimales para evitar artefactos de punto flotante
            const cantidadOriginal = parseFloat(productoExistente.cantidad) || 0;
            const cantidadNueva = parseFloat(producto.cantidad) || 0;
            const suma = cantidadOriginal + cantidadNueva;
            // Redondeo a 3 decimales
            const sumaRedondeada = Math.round(suma * 1000) / 1000;
            // Guardar como string con 3 decimales para consistencia en el reporte
            productoExistente.cantidad = sumaRedondeada.toFixed(3);

            // Acumular información de lotes en los comentarios
            let comentarioLote = `Lote: ${producto.lote || 'Sin especificar'}, Cantidad: ${producto.cantidad || '0'} ${producto.unidad || 'unidades'}`;
                if (producto.caducidad) {
                comentarioLote += `, Caducidad: ${formatDateLocal(producto.caducidad)}`;
            }

            // Agregar el área si está disponible
            const area = todasLasAreas.find(a => a.id === producto.area_id);
            if (area) {
                comentarioLote += `, Área: ${area.nombre}`;
            }

            // Agregar comentarios originales del producto si existen
            if (producto.comentarios && producto.comentarios !== 'N/A') {
                comentarioLote += `, Notas: ${producto.comentarios}`;
            }

            // Actualizar comentarios del producto fusionado
            if (!productoExistente.comentariosFusionados) {
                // Primera fusión: inicializar el array con el lote original
                const comentarioOriginal = `Lote: ${productoExistente.lote || 'Sin especificar'}, Cantidad: ${cantidadOriginal} ${productoExistente.unidad || 'unidades'}`;

                let comentarioOriginalCompleto = comentarioOriginal;
                if (productoExistente.caducidad) {
                    comentarioOriginalCompleto += `, Caducidad: ${new Date(productoExistente.caducidad).toLocaleDateString('es-ES')}`;
                }

                // Agregar el área para el lote original
                const areaOriginal = todasLasAreas.find(a => a.id === productoExistente.area_id);
                if (areaOriginal) {
                    comentarioOriginalCompleto += `, Área: ${areaOriginal.nombre}`;
                }

                productoExistente.comentariosFusionados = [comentarioOriginalCompleto];

                // Agregar los comentarios originales si existen y no son "N/A"
                if (productoExistente.comentarios && productoExistente.comentarios !== 'N/A') {
                    productoExistente.comentariosFusionados[0] += `, Notas: ${productoExistente.comentarios}`;
                }
            }

            // Añadir el comentario del nuevo lote
            productoExistente.comentariosFusionados.push(comentarioLote);

            // Guardar lotes individuales para mejor visualización
            if (!productoExistente.lotesFusionados) {
                productoExistente.lotesFusionados = [
                    {
                        lote: productoExistente.lote || '1',
                        cantidad: cantidadOriginal,
                        caducidad: productoExistente.caducidad,
                        area_id: productoExistente.area_id,
                        comentarios: productoExistente.comentarios
                    }
                ];
            }

            // Añadir el nuevo lote a la lista
            productoExistente.lotesFusionados.push({
                lote: producto.lote || '1',
                cantidad: cantidadNueva,
                caducidad: producto.caducidad,
                area_id: producto.area_id,
                comentarios: producto.comentarios
            });

            // Actualizar el campo de comentarios para reflejar todos los lotes
            productoExistente.comentarios = `Producto fusionado con múltiples lotes:\n- ${productoExistente.comentariosFusionados.join('\n- ')}`;

            // Conservar la fecha de caducidad más próxima
            if (producto.caducidad && productoExistente.caducidad) {
                const fechaExistente = parseDateLocal(productoExistente.caducidad);
                const fechaNueva = parseDateLocal(producto.caducidad);
                if (fechaNueva && fechaExistente && fechaNueva < fechaExistente) {
                    productoExistente.caducidad = producto.caducidad;
                }
            } else if (producto.caducidad) {
                productoExistente.caducidad = producto.caducidad;
            }

        } else {
            // Si es un producto nuevo, simplemente lo agregamos al mapa
            // Creamos una copia para no modificar el original
            const productoCopia = { ...producto };
            // Inicializar campo para lotes fusionados (para uso interno)
            productoCopia.comentariosFusionados = [];
            productoCopia.lotesFusionados = [{
                lote: producto.lote || '1',
                cantidad: parseFloat(producto.cantidad) || 0,
                caducidad: producto.caducidad,
                area_id: producto.area_id,
                comentarios: producto.comentarios
            }];
            mapaProductos.set(codigo, productoCopia);
        }
    });

    // Convertir el mapa a array para retornarlo
    mapaProductos.forEach(producto => {
        productosFusionados.push(producto);
    });

    console.log(`Se han fusionado ${productos.length} productos en ${productosFusionados.length} elementos únicos`);
    return productosFusionados;
}