const express = require('express');
const cors = require('cors');
const path = require('path'); 
const analizarLexico = require('./analizador'); 
const iniciarAnalisisSintactico = require('./sintactico'); 

const app = express();

app.use(cors());
app.use(express.json());

// carpeta frontend para pagina web
app.use('/', express.static(path.join(__dirname, '../frontend')));

app.post('/api/analizar', (req, res) => {
    const codigo = req.body.codigo;
    
    // FASE 1: Análisis Léxico
    const resultadoLexico = analizarLexico(codigo); 
    
    // FASE 2: Semantico
    if (resultadoLexico.error === false && resultadoLexico.tokens.length > 0) {
        const resultadoSintactico = iniciarAnalisisSintactico(resultadoLexico.tokens);
        // Adjuntamos el resultado del árbol al paquete final
        resultadoLexico.sintactico = resultadoSintactico; 
    }

    res.json(resultadoLexico); 
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});