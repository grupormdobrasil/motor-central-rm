const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Motor Grupo RM Online'));
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

async function iniciarMotor() {
    console.log("--- INICIANDO MOTOR MODO DIAGNÓSTICO ---");
    
    // Usando /tmp para salvar sessão
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'debug' }), // Mudei para DEBUG para vermos tudo o que acontece
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('✅ QR CODE GERADO:');
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
        }

        if (connection === 'close') {
            const error = lastDisconnect.error;
            console.log("❌ CONEXÃO FECHADA!");
            console.log("MOTIVO DO ERRO:", error); // Isso vai nos dizer o real problema
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarMotor();
