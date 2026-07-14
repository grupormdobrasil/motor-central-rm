const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

let pairingCodeRequested = false;

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
            if (shouldReconnect) setTimeout(iniciarMotor, 5000); // Espera 5 segundos antes de tentar de novo
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
            
            if (!sock.authState.creds.registered && !pairingCodeRequested) {
                pairingCodeRequested = true;
                try {
                    const phoneNumber = '554384380000'; // <--- INSIRA SEU NÚMERO AQUI
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n\n=== SEU CÓDIGO DE PAREAMENTO: ${code} ===\n\n`);
                } catch (e) {
                    console.log('Erro ao solicitar código:', e);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
