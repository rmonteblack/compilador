const reglas = [
    { tipo: 'ESPACIO', regex: /^\s+/ },
    { tipo: 'PALABRA_RESERVADA', regex: /^\b(INICIO|FIN|VAR|CONST|SI|ENTONCES|SINO|FUNCION|RETORNAR|MIENTRAS)\b/ },
    { tipo: 'OP_ASIGNACION', regex: /^(:=|=)/ },
    { tipo: 'OP_RELACIONAL', regex: /^(>=|<=|==|!=|>|<)/ },
    { tipo: 'NUMERO', regex: /^\d+(\.\d+)?\b/ },
    { tipo: 'USUARIO', regex: /^@[a-zA-Z_][a-zA-Z0-9_]*/ }, 
    { tipo: 'IDENTIFICADOR', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
    { tipo: 'OP_ARITMETICO', regex: /^[\+\-\*\/]/ },
    { tipo: 'ID_RESERVADO', regex: /^@/ },
    { tipo: 'DELIMITADOR', regex: /^;/ },
   { tipo: 'SIMBOLO', regex: /^[():,]/ }, 
];

// funcion para exportar al servidor
function analizarLexico(codigo) {
    let tokens = [];
    let errores = []; // Lista para guardar los errores sin detenernos
    let indexGlobal = 0; 

    while (codigo.length > 0) {
        let match = false;

        for (let regla of reglas) {
            let resultado = regla.regex.exec(codigo);

            if (resultado) {
                let lexema = resultado[0];
                
                if (regla.tipo !== 'ESPACIO') {
                    tokens.push({ lexema: lexema, token: regla.tipo });
                }

                codigo = codigo.slice(lexema.length);
                indexGlobal += lexema.length; 
                match = true;
                break;
            }
        }

  
        if (!match) {
            errores.push({
                simbolo: codigo[0],
                posicion: indexGlobal,
                mensaje: `Símbolo no reconocido '${codigo[0]}'`
            });
            

            codigo = codigo.slice(1);
            
            indexGlobal += 1;
        }
    }

    // devolvemos todo el paquete al servidor
    return { 
        error: errores.length > 0, // Será "true" si la lista de errores tiene al menos 1
        tokens: tokens, 
        errores: errores 
    };
}

// exportacion de la funcion para el servidor 
module.exports = analizarLexico;