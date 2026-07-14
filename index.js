const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log(`Servidor de manutenção rodando na porta ${port}`));

async function iniciarMotor() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    // SE NÃO ESTIVER CONECTADO, PEDE O CÓDIGO DE PAREAMENTO
    if (!sock.authState.creds.registered) {
        const phoneNumber = '55XXXXXXXXXXX'; // <--- INSIRA SEU NÚMERO AQUI (Ex: 5543999999999)
        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n\n=== SEU CÓDIGO DE PAREAMENTO: ${code} ===\n\n`);
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) iniciarMotor();
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
