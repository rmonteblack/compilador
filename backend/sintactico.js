let tokens = [];
let actual = 0;

function consumir(tipoEsperado, lexemaEsperado = null) {
    if (actual >= tokens.length) throw new Error(`Error Sintáctico: Se esperaba '${lexemaEsperado || tipoEsperado}' pero el código terminó.`);
    let tokenActual = tokens[actual];
    if (tokenActual.token === tipoEsperado) {
        if (lexemaEsperado && tokenActual.lexema !== lexemaEsperado) throw new Error(`Error Sintáctico: Se esperaba '${lexemaEsperado}' pero se encontró '${tokenActual.lexema}'.`);
        actual++; 
        return tokenActual;
    } else {
        throw new Error(`Error Sintáctico: Se esperaba un ${tipoEsperado} pero se encontró '${tokenActual.lexema}'.`);
    }
}

function analizarPrograma() {
    let hijos = [];
    
    let decls1 = analizarDeclaraciones();
    if (decls1.length > 0) hijos.push({ name: "Declaraciones Globales", children: decls1 });
    
    consumir('PALABRA_RESERVADA', 'INICIO');
    
    let decls2 = analizarDeclaraciones();
    if (decls2.length > 0) hijos.push({ name: "Declaraciones Locales", children: decls2 });
    
    let instrs = analizarInstrucciones();
    if (instrs.length > 0) hijos.push({ name: "Lógica Principal", children: instrs });
    
    consumir('PALABRA_RESERVADA', 'FIN');
    
    return { exito: true, mensaje: "Árbol Sintáctico Construido Correctamente.", ast: { name: "Programa (Raíz)", children: hijos } };
}

function analizarDeclaraciones() {
    let nodos = [];
    while (actual < tokens.length && (tokens[actual].lexema === 'VAR' || tokens[actual].lexema === 'CONST' || tokens[actual].lexema === 'FUNCION')) {
        if (tokens[actual].lexema === 'FUNCION') {
            nodos.push(analizarFuncion());
        } else {
            let tipo = consumir('PALABRA_RESERVADA').lexema;
            let id = consumir('IDENTIFICADOR').lexema;
            let nodo = { name: tipo, children: [{ name: id }] };

            if (actual < tokens.length && tokens[actual].token === 'OP_ASIGNACION') {
                consumir('OP_ASIGNACION');
                let val = consumirValor();
                nodo.children.push({ name: "=", children: [{name: val}] });
            }
            let delimitador = tokens[actual].lexema;
            if (delimitador === ';' || delimitador === ',') actual++;
            else throw new Error(`Falta ';' en '${id}'`);

            nodos.push(nodo);
        }
    }
    return nodos;
}

function analizarFuncion() {
    consumir('PALABRA_RESERVADA', 'FUNCION');
    let id = consumir('IDENTIFICADOR').lexema;
    consumir('SIMBOLO', '(');
    
    let params = [];
    while (actual < tokens.length && tokens[actual].token === 'IDENTIFICADOR') {
        params.push({ name: consumir('IDENTIFICADOR').lexema });
        if (actual < tokens.length && tokens[actual].lexema === ',') actual++;
        else break;
    }
    
    consumir('SIMBOLO', ')');
    consumir('SIMBOLO', ':');
    let instrs = analizarInstrucciones();
    consumir('PALABRA_RESERVADA', 'FIN');
    consumir('PALABRA_RESERVADA', 'FUNCION');
    consumir('DELIMITADOR', ';');

    return { name: "Función", children: [{ name: id }, { name: "Parámetros", children: params }, { name: "Cuerpo", children: instrs }] };
}

function analizarInstrucciones() {
    let nodos = [];
    while (actual < tokens.length && tokens[actual].lexema !== 'FIN' && tokens[actual].lexema !== 'SINO' && tokens[actual].lexema !== 'RETORNAR') {
        let tokenAct = tokens[actual];
        if (tokenAct.lexema === 'SI') nodos.push(analizarCondicional());
        else if (tokenAct.token === 'IDENTIFICADOR') nodos.push(analizarAsignacionOLlamada());
        else throw new Error(`Instrucción no reconocida '${tokenAct.lexema}'`);
    }
    
    if (actual < tokens.length && tokens[actual].lexema === 'RETORNAR') {
        consumir('PALABRA_RESERVADA', 'RETORNAR');
        let val = consumirValor();
        let nodoRet = { name: "Retornar", children: [{name: val}] };
        if (actual < tokens.length && tokens[actual].token === 'OP_ARITMETICO') {
            let op = consumir('OP_ARITMETICO').lexema;
            let val2 = consumirValor();
            nodoRet.children = [{ name: "Operación", children: [{name: val}, {name: op}, {name: val2}] }];
        }
        consumir('DELIMITADOR', ';');
        nodos.push(nodoRet);
    }
    return nodos;
}

function analizarCondicional() {
    consumir('PALABRA_RESERVADA', 'SI');
    let val1 = consumirValor();
    let op = consumir('OP_RELACIONAL').lexema;
    let val2 = consumirValor();
    
    let nodoSi = { name: "Condicional (SI)", children: [{ name: "Condición", children: [{name: op, children:[{name: val1}, {name: val2}]}] }] };

    consumir('PALABRA_RESERVADA', 'ENTONCES');
    let instrs = analizarInstrucciones();
    nodoSi.children.push({ name: "ENTONCES (True)", children: instrs });
    
    if (actual < tokens.length && tokens[actual].lexema === 'SINO') {
        consumir('PALABRA_RESERVADA', 'SINO');
        let instrsSino = analizarInstrucciones();
        nodoSi.children.push({ name: "SINO (False)", children: instrsSino });
    }
    
    consumir('PALABRA_RESERVADA', 'FIN');
    consumir('PALABRA_RESERVADA', 'SI');
    consumir('DELIMITADOR', ';');
    
    return nodoSi;
}

function analizarAsignacionOLlamada() {
    let id = consumir('IDENTIFICADOR').lexema;
    let nodo = { name: "Asignación", children: [{ name: id }] };
    
    if (actual < tokens.length && tokens[actual].token === 'OP_ASIGNACION') {
        consumir('OP_ASIGNACION');
        if (actual < tokens.length && tokens[actual].token === 'IDENTIFICADOR' && actual + 1 < tokens.length && tokens[actual+1].lexema === '(') {
            let fn = consumir('IDENTIFICADOR').lexema;
            consumir('SIMBOLO', '(');
            let args = [];
            while (actual < tokens.length && tokens[actual].lexema !== ')') {
                args.push({ name: tokens[actual].lexema });
                actual++;
            }
            consumir('SIMBOLO', ')');
            nodo.children.push({ name: "Llamar Función", children: [{name: fn}, {name: "Argumentos", children: args}] });
        } else {
            let val1 = consumirValor();
            if (actual < tokens.length && tokens[actual].token === 'OP_ARITMETICO') {
                let op = consumir('OP_ARITMETICO').lexema;
                let val2 = consumirValor();
                nodo.children.push({ name: "Operación", children: [{name: val1}, {name: op}, {name: val2}] });
            } else {
                nodo.children.push({ name: val1 });
            }
        }
    } else if (actual < tokens.length && tokens[actual].lexema === '(') {
        consumir('SIMBOLO', '(');
        while (actual < tokens.length && tokens[actual].lexema !== ')') { actual++; }
        consumir('SIMBOLO', ')');
        nodo = { name: "Llamada Función", children: [{name: id}] };
    } else {
        throw new Error(`Se esperaba una asignación (=) después de '${id}'`);
    }

    consumir('DELIMITADOR', ';');
    return nodo;
}

function consumirValor() {
    if (actual < tokens.length && (tokens[actual].token === 'NUMERO' || tokens[actual].token === 'IDENTIFICADOR')) {
        let val = tokens[actual].lexema;
        actual++; 
        return val;
    } else {
        throw new Error(`Se esperaba un número o variable.`);
    }
}

function iniciarAnalisisSintactico(listaTokens) {
    tokens = listaTokens;
    actual = 0; 
    try {
        return analizarPrograma();
    } catch (error) {
        return { exito: false, mensaje: error.message };
    }
}

module.exports = iniciarAnalisisSintactico;