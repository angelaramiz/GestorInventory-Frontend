// Prueba de la función extraerDatosCodeCODE128
function extraerDatosCodeCODE128(codigo) {
    console.log(`Extrayendo datos de código: ${codigo}`);
    // Sanitizar entrada
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

    // Convertir pesos y centavos a números
    const pesos = parseInt(pesosStr, 10);
    const centavos = parseInt(centavosStr, 10);

    // Calcular precio por porción: pesos + centavos/100
    const precioPorcion = pesos + (centavos / 100);

    // Calcular peso temporal para mostrar en el modal (se recalculará con precio real)
    const precioKiloTemporal = 100; // Valor temporal para prueba
    const pesoTemporal = precioPorcion / precioKiloTemporal;

    console.log(`Datos extraídos - PLU: ${plu}, Precio: $${precioPorcion.toFixed(2)}, Peso temporal: ${pesoTemporal.toFixed(3)}kg`);

    return {
        plu: plu,
        precioPorcion: precioPorcion,
        pesoTemporal: pesoTemporal,
        centavos: centavos,
        digitoControl: digitoControl
    };
}

// Probar con el código que sabemos que funciona
const resultado = extraerDatosCodeCODE128('28310000391746');
console.log('Resultado:', resultado);