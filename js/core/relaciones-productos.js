// js/relaciones-productos.js
// Utilidad para obtener relaciones de productos desde Supabase y devolver un Map
// Uso: await obtenerRelacionesProductosSupabase()

/**
 * Consulta la tabla productos_subproductos en Supabase y retorna un Map con las relaciones.
 * El Map tiene como clave el código del producto principal y como valor un array de códigos de subproductos.
 * @returns {Promise<Map<string, string[]>>}
 */
export async function obtenerRelacionesProductosSupabase() {
    if (!window.getSupabase) throw new Error('No se encontró getSupabase en window.');
    const supabase = await window.getSupabase();
    const { data, error } = await supabase.from('productos_subproductos').select('*');
    if (error) throw error;
    // Construir el Map de relaciones principal -> [subproductos] usando los campos correctos
    const relaciones = new Map();
    data.forEach(rel => {
        const principal = rel.principalproductid;
        const sub = rel.subproductid;
        if (!relaciones.has(principal)) {
            relaciones.set(principal, []);
        }
        relaciones.get(principal).push(sub);
    });
    return relaciones;
}

/**
 * Dado un código, busca si es principal o subproducto y retorna la relación.
 * @param {string} codigo Código a buscar
 * @param {Map<string, string[]>} relaciones Map de relaciones principal -> [subproductos]
 * @returns {Object} { tipo: 'principal'|'subproducto'|'ninguno', principal: string|null, subproductos: string[] }
 */
export function buscarRelacionProducto(codigo, relaciones) {
    // ¿Es principal?
    if (relaciones.has(codigo)) {
        return {
            tipo: 'principal',
            principal: codigo,
            subproductos: relaciones.get(codigo)
        };
    }
    // ¿Es subproducto?
    for (const [principal, subs] of relaciones.entries()) {
        if (subs.includes(codigo)) {
            return {
                tipo: 'subproducto',
                principal,
                subproductos: subs
            };
        }
    }
    // No está relacionado
    return {
        tipo: 'ninguno',
        principal: null,
        subproductos: []
    };
}
