const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeLink = "Aguardando geração do QR Code... Aguarde alguns segundos e atualize a página.";

// Rota para ver o QR Code
app.get('/qr', (req, res) => {
    res.send(`
        <html>
            <body style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h1>Status: ${qrCodeLink.includes('http') ? 'QR Code Gerado' : 'Carregando...'}</h1>
                <img src="${qrCodeLink}" style="width:300px; height:300px;" />
                <p>Escaneie rápido com o WhatsApp da loja!</p>
                <script>setTimeout(() => location.reload(), 3000);</script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

async function iniciarMotor() {
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('QR Code gerado! Acesse /qr no seu navegador.');
        }

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                iniciarMotor();
            }
        } else if (connection === 'open') {
            qrCodeLink = "Conectado com sucesso!";
            console.log('🚀 CONECTADO COM SUCESSO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}
iniciarMotor();
