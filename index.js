const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Motor Grupo RM Online'));
app.listen(PORT, () => console.log(`Servidor de porta aberto na porta ${PORT}`));

const GOOGLE_SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbwopLn_UDSxz20PHzsW8DasTz8CK7FfmRsHF5-6o43f-FqFAO8uf3gZeOo5StQB6LB_/exec";

async function iniciarMotor() {
    console.log("Iniciando motor do WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Vamos imprimir manualmente para garantir
        logger: pino({ level: 'silent' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // DEBUG: Isso vai aparecer no seu log do Render
        console.log("Status da conexão:", connection);

        if (qr) {
            console.log('================================================');
            console.log('QR CODE ABAIXO:');
            qrcode.generate(qr, { small: true });
            console.log('================================================');
        }

        if (connection === 'close') {
            const erro = lastDisconnect?.error?.output?.statusCode;
            if (erro !== DisconnectReason.loggedOut) {
                console.log("Reconectando...");
                iniciarMotor();
            }
        } else if (connection === 'open') {
            console.log('🚀 CONECTADO COM SUCESSO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const textoMensagem = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const numeroCliente = msg.key.remoteJid.replace('@s.whatsapp.net', '');

        try {
            const respostaGoogle = await axios.post(GOOGLE_SHEETS_WEBHOOK, { telefone: numeroCliente, mensagem: textoMensagem });
            if (respostaGoogle.data.reply) {
                await sock.sendMessage(msg.key.remoteJid, { text: respostaGoogle.data.reply });
            }
        } catch (erro) {
            console.error('Erro na resposta:', erro.message);
        }
    });
}
iniciarMotor();
