const express = require('express');
const cors = require('cors');
const path = require('path'); 
const analizarLexico = require('./analizador'); 
const iniciarAnalisisSintactico = require('./sintactico'); 

// Importar el SDK oficial de Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------
// CONFIGURACIÓN DE LA IA (GEMINI)
// ----------------------------------------------------------------------
// IMPORTANTE: Pon tu clave real aquí o usa variables de entorno (.env)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCUym0by49RiXY2JtpelADOyL7sPZVMu2I";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ----------------------------------------------------------------------
// BASE DE DATOS EN MEMORIA (Para la Nómina)
// ----------------------------------------------------------------------
let baseDeDatosNomina = [];
let hashLoteActual = "";

// ----------------------------------------------------------------------
// RUTAS DEL FRONTEND
// ----------------------------------------------------------------------
// Carpeta frontend para pagina web
app.use('/', express.static(path.join(__dirname, '../frontend')));

// ----------------------------------------------------------------------
// RUTAS DEL COMPILADOR (TU CÓDIGO ORIGINAL)
// ----------------------------------------------------------------------
app.post('/api/analizar', (req, res) => {
    const codigo = req.body.codigo;
    
    // FASE 1: Análisis Léxico
    const resultadoLexico = analizarLexico(codigo); 
    
    // FASE 2: Semantico / Sintactico
    if (resultadoLexico.error === false && resultadoLexico.tokens.length > 0) {
        const resultadoSintactico = iniciarAnalisisSintactico(resultadoLexico.tokens);
        // Adjuntamos el resultado del árbol al paquete final
        resultadoLexico.sintactico = resultadoSintactico; 
    }

    res.json(resultadoLexico); 
});

// ----------------------------------------------------------------------
// RUTAS DEL ERP DE NÓMINA
// ----------------------------------------------------------------------

// 1. Guardar la corrida de nómina validada
app.post('/api/nomina/guardar', (req, res) => {
    const { resultados, hash } = req.body;
    
    if (!resultados || !hash) {
        return res.status(400).json({ error: "Datos incompletos." });
    }

    baseDeDatosNomina = resultados;
    hashLoteActual = hash;
    
    console.log(`Lote Financiero Guardado. Hash: ${hashLoteActual}`);
    res.json({ mensaje: "Nómina guardada exitosamente." });
});

// 2. Conexión segura con la IA de Gemini
app.post('/api/ia/consultar', async (req, res) => {
    const { pregunta } = req.body;

    if (!pregunta) {
        return res.status(400).json({ error: "Falta la pregunta del usuario." });
    }

    try {
        // Mapear un resumen de los datos para darle contexto a la IA sin saturarla
        const contextoResumido = baseDeDatosNomina.map(r => ({
            empleado: r.nombre, 
            salarioBase: r.salario, 
            totalIngresosExtras: r.bonos, 
            totalDeducciones: r.deducciones, 
            liquidoARecibir: r.total
        }));

        const systemPrompt = `Eres el Auditor Financiero IA estricto pero servicial del sistema PayLogic. 
        Eres experto en planillas y contabilidad laboral de Guatemala. 
        Usa siempre Quetzales ('Q.'). 
        Analiza los siguientes datos JSON de la corrida actual de nómina y responde la pregunta del usuario. 
        Si el usuario pregunta algo que no está en los datos, indícalo cordialmente.
        
        DATOS DE NÓMINA (Lote: ${hashLoteActual}):
        ${JSON.stringify(contextoResumido)}
        
        PREGUNTA DEL USUARIO:
        ${pregunta}`;

        // Instanciar el modelo de Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemPrompt);
        const respuestaIA = result.response.text();

        res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error("Error en la conexión con Gemini:", error);
        res.status(500).json({ 
            error: "No se pudo conectar con el modelo LLM. Verifica tu API Key en el servidor." 
        });
    }
});

// 3. Login del Portal del Empleado
app.post('/api/empleado/login', (req, res) => {
    const { id, pin } = req.body;

    const empleado = baseDeDatosNomina.find(e => e.id === id && e.pin === pin);

    if (empleado) {
        res.json({ empleado: empleado, hashLote: hashLoteActual });
    } else {
        res.status(401).json({ error: "Credenciales inválidas." });
    }
});

// 4. Firma del Recibo por parte del Empleado
app.post('/api/empleado/firmar', (req, res) => {
    const { id, pin } = req.body;

    const index = baseDeDatosNomina.findIndex(e => e.id === id && e.pin === pin);

    if (index !== -1) {
        baseDeDatosNomina[index].status = 'FIRMADO';
        console.log(`Auditoría: El empleado ${id} firmó el documento del lote ${hashLoteActual}`);
        res.json({ mensaje: "Recibo validado correctamente." });
    } else {
        res.status(401).json({ error: "Firma no autorizada." });
    }
});

// ----------------------------------------------------------------------
// INICIO DEL SERVIDOR
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor de Backend / Compilador PayLogic corriendo en el puerto ${PORT}`);
});