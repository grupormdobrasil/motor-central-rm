const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Central RM Online'));
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

async function iniciarMotor() {
    console.log("--- AGUARDANDO 15 SEGUNDOS PARA ESTABILIZAR O SERVIDOR ---");
    
    // O segredo está aqui: esperamos 15 segundos antes de sequer tentar conectar
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log("--- INICIANDO CONEXÃO ---");
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'debug' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n--- QR CODE GERADO ---');
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('COPIE ESTE LINK E COLE NO SEU NAVEGADOR AGORA:');
            console.log(qrUrl);
            console.log('--------------------------------------------\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(">> CONEXÃO FECHADA. Reconectando em 10s...");
                setTimeout(iniciarMotor, 10000);
            }
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
