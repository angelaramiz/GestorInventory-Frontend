// Módulo de procesamiento para lotes-avanzado.js

import { getSupabase } from '../../auth/auth.js';
import { buscarPorCodigoParcial } from '../../products/product-search.js';
import { mostrarAlertaBurbuja } from './utils.js';
import { sanitizarEntrada } from './utils.js';
import { diccionarioSubproductos, configuracionEscaneo, productosEscaneados, preciosPorKiloGuardados, limpiarDebounce, TIEMPO_DEBOUNCE, ultimoCodigoEscaneado, tiempoUltimoEscaneo, precioKiloTemporal } from './config.js';

// Función para cargar diccionario de subproductos desde Supabase
export async function cargarDiccionarioSubproductos() {
    try {
        console.log('Cargando diccionario de subproductos desde Supabase...');

        // Obtener instancia de Supabase
        const supabase = await getSupabase();

        // Consultar productos_subproducto desde Supabase
        const { data, error } = await supabase
            .from('productos_subproductos')
            .select(`
                id,
                principalproductid,
                subproductid
            `);

        if (error) {
            console.error('Error al consultar productos_subproductos:', error);
        }

        // Limpiar diccionario existente
        diccionarioSubproductos.clear();

        // Llenar diccionario con datos reales
        if (data && data.length > 0) {
            data.forEach(relacion => {
                const principalId = relacion.principalproductid;
                const subId = relacion.subproductid;

                if (!diccionarioSubproductos.has(principalId)) {
                    diccionarioSubproductos.set(principalId, []);
                }
                diccionarioSubproductos.get(principalId).push(subId);
            });

            console.log(`Diccionario cargado con ${diccionarioSubproductos.size} productos primarios`);
        } else {
            console.log('No se encontraron relaciones de subproductos en la base de datos');
        }

    } catch (error) {
        console.error('Error al cargar diccionario de subproductos desde Supabase:', error);

        // En caso de error, simplemente limpiar el diccionario
        console.warn('No se pudieron cargar relaciones de subproductos desde el servidor');
        diccionarioSubproductos.clear();

        // Mostrar mensaje de advertencia
        mostrarAlertaBurbuja('⚠️ Diccionario no disponible, funcionando sin relaciones', 'warning');
    }
}

// Función para buscar producto por PLU en Supabase
export async function buscarProductoPorPLU(plu) {
    try {
        console.log(`Buscando producto con PLU: ${plu}`);

        // Obtener instancia de Supabase
        const supabase = await getSupabase();

        // Crear variaciones del código para búsqueda
        const variacionesCodigo = [
            plu,                              // PLU original (4 dígitos)
            plu.padStart(12, '0'),           // PLU rellenado a 12 dígitos
            plu.padStart(15, '0'),           // PLU rellenado a 15 dígitos
            plu.padStart(8, '0'),            // PLU rellenado a 8 dígitos
            '2' + plu.padStart(14, '0')      // Formato con prefijo 2 (tipo de código)
        ];

        console.log(`[Supabase] Buscando con variaciones de código:`, variacionesCodigo);

        // Intentar búsquedas progresivas en tabla PRODUCTOS
        let data = null;
        let error = null;

        for (const codigo of variacionesCodigo) {
            console.log(`[Supabase] Búsqueda en productos con código: "${codigo}"`);

            ({ data, error } = await supabase
                .from('productos')
                .select(`
                    codigo,
                    nombre,
                    marca,
                    unidad,
                    categoria
                `)
                .eq('codigo', codigo)
                .maybeSingle());

            if (data) {
                console.log(`✅ Producto encontrado en tabla productos con código "${codigo}":`, data);
                return {
                    codigo: data.codigo,
                    nombre: data.nombre,
                    marca: data.marca,
                    unidad: data.unidad,
                    categoria: data.categoria || 'Sin categoría'
                };
            }

            if (error && error.code !== 'PGRST116') {
                console.warn(`⚠️ Error en búsqueda productos con "${codigo}":`, error);
            }
        }

        // Si no encontró en PRODUCTOS, retornar null
        // Ya no se busca en productos_subproductos

        console.warn(`❌ Producto no encontrado para PLU: ${plu} - Variaciones intentadas: ${variacionesCodigo.join(', ')}`);
        return null;

    } catch (error) {
        console.error('Error al buscar producto por PLU:', error);
        console.warn('No se pudo conectar con el servidor para buscar el producto');
        return null;
    }
}

// Función para verificar si un producto ya fue escaneado
export function verificarProductoExistente(plu) {
    const productoExistente = productosEscaneados.find(p => p.plu === plu);

    if (productoExistente) {
        console.log(`Producto con PLU ${plu} ya fue escaneado anteriormente`);
        return productoExistente;
    }

    // Si no fue escaneado, verificar si tenemos precio por kilo guardado
    const precioKiloGuardado = preciosPorKiloGuardados.get(plu);
    if (precioKiloGuardado) {
        console.log(`Precio por kilo guardado para PLU ${plu}: $${precioKiloGuardado.toFixed(2)}`);
        return { plu: plu, precioKilo: precioKiloGuardado };
    }

    return null;
}

// Función para verificar si un producto con el mismo precio ya fue registrado recientemente
export function verificarRegistroReciente(plu, precioPorcion) {
    const ahora = Date.now();
    const TIEMPO_REGISTRO_RECIENTE = 5000; // 5 segundos - tiempo más largo para evitar bucle

    const registroReciente = productosEscaneados.find(p =>
        p.plu === plu &&
        p.precioPorcion === precioPorcion &&
        (ahora - new Date(p.timestamp).getTime()) < TIEMPO_REGISTRO_RECIENTE
    );

    if (registroReciente) {
        console.log(`Producto con PLU ${plu} y precio ${precioPorcion} ya fue registrado recientemente`);
        return true;
    }

    return false;
}

// Función para extraer datos CODE128 usando regex
export function extraerDatosCodeCODE128(codigo) {
    console.log(`Extrayendo datos de código: ${codigo}`);
    // Sanitizar entrada
    codigo = sanitizarEntrada(codigo);
    codigo = codigo.replace(/^0+/, ''); // Eliminar ceros a la izquierda

    // Regex para extraer datos: ^2(\d{4})(\d{6})(\d{2})(\d+)$
    // Grupos: 1=PLU(4 dígitos), 2=pesos(6 dígitos), 3=centavos(2 dígitos), 4=control(variable)
    const regexExtraccion = /^2(\d{4})(\d{6})(\d{2})(\d+)$/;
    const match = codigo.match(regexExtraccion);

    if (!match) {
        console.warn(`Código no coincide con el formato esperado: ${codigo}`);
        return null;
    }

    const plu = match[1];                    // PLU de 4 dígitos
    const pesosStr = match[2];               // Pesos de 6 dígitos
    const centavosStr = match[3];            // Centavos de 2 dígitos
    const digitoControl = match[4];          // Dígito de control (variable)

    console.log(`Debug - PLU extraído: "${plu}"`);
    console.log(`Debug - Pesos string extraído: "${pesosStr}"`);
    console.log(`Debug - Centavos string extraído: "${centavosStr}"`);
    console.log(`Debug - Dígito control: "${digitoControl}"`);

    // Convertir pesos y centavos a números
    const pesos = parseInt(pesosStr, 10);
    const centavos = parseInt(centavosStr, 10);
    console.log(`Debug - Pesos como número: ${pesos}`);
    console.log(`Debug - Centavos como número: ${centavos}`);

    // Calcular precio por porción: pesos + centavos/100
    const precioPorcion = pesos + (centavos / 100);
    console.log(`Debug - Precio final: $${precioPorcion.toFixed(2)}`);

    // Calcular peso temporal para mostrar en el modal (se recalculará con precio real)
    const pesoTemporal = precioPorcion / precioKiloTemporal;

    console.log(`Datos extraídos - PLU: ${plu}, Precio: $${precioPorcion.toFixed(2)}, Peso temporal: ${pesoTemporal.toFixed(3)}kg, Centavos: ${centavos}, Dígito Control: ${digitoControl}`);

    return {
        plu: plu,
        precioPorcion: precioPorcion,
        pesoTemporal: pesoTemporal,
        centavos: centavos,
        digitoControl: digitoControl
    };
}