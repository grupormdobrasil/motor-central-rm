const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

async function iniciarMotor() {
    // Usamos memória para evitar erros de escrita em disco na Render
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
            if (shouldReconnect) {
                iniciarMotor();
            }
        } else if (connection === 'open') {
            console.log('🚀 CONEXÃO ABERTA. Iniciando autenticação...');
            
            // Só pedimos o código se o robô REALMENTE estiver conectado
            if (!sock.authState.creds.registered) {
                try {
                    const phoneNumber = '554384380000'; 
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n\n=== SEU CÓDIGO DE PAREAMENTO: ${code} ===\n\n`);
                } catch (err) {
                    console.log('Erro ao solicitar código:', err);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
