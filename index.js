const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

async function iniciarMotor() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) iniciarMotor();
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
            
            // AGORA SIM: Só pedimos o código se não estivermos registrados
            if (!sock.authState.creds.registered) {
                const phoneNumber = '554384380000'; // <--- INSIRA SEU NÚMERO AQUI (55 + DDD + NUMERO)
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n\n=== SEU CÓDIGO DE PAREAMENTO: ${code} ===\n\n`);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
