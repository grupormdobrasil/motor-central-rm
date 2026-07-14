const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log('Servidor HTTP rodando na porta ' + port));

async function iniciarMotor() {
    console.log("--- INICIANDO MOTOR: Carregando Auth ---");
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    console.log("--- INICIANDO MOTOR: Criando Socket ---");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'debug' }), // MODO VERBOSO ATIVADO
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    console.log("--- INICIANDO MOTOR: Socket Criado. Ouvindo eventos ---");

    sock.ev.on('connection.update', async (update) => {
        console.log(">> EVENTO RECEBIDO:", JSON.stringify(update));
        
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(">> CONEXÃO FECHADA. Reconectar?", shouldReconnect);
            if (shouldReconnect) {
                console.log(">> Reiniciando motor em 5s...");
                setTimeout(iniciarMotor, 5000);
            }
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
            
            if (!sock.authState.creds.registered) {
                console.log(">> SOLICITANDO CÓDIGO DE PAREAMENTO...");
                const phoneNumber = '554384380000'; // <--- INSIRA SEU NÚMERO
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n\n=== SEU CÓDIGO DE PAREAMENTO: ${code} ===\n\n`);
                } catch (e) {
                    console.log(">> ERRO AO SOLICITAR CÓDIGO:", e);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
