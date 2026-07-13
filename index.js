const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const pino = require('pino');

// A CHAVE-MESTRA DO SEU CÉREBRO NO GOOGLE SHEETS
const GOOGLE_SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbwopLn_UDSxz20PHzsW8DasTz8CK7FfmRsHF5-6o43f-FqFAO8uf3gZeOo5StQB6LB_/exec";

async function iniciarMotor() {
    // Salva a sessão para não pedir QR code toda hora
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Grupo RM', 'Chrome', '1.0.0']
    });

    // Evento de conexão para gerar o QR Code
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n==================================================');
            console.log('✅ NOVO QR CODE GERADO! ESCANEIE COM O CELULAR:');
            console.log('==================================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const erro = lastDisconnect?.error?.output?.statusCode;
            const reconectar = erro !== DisconnectReason.loggedOut;
            console.log(`\nConexão fechada. Reconectando: ${reconectar}`);
            if (reconectar) {
                iniciarMotor();
            } else {
                console.log('Sessão desconectada. Será necessário novo QR Code.');
            }
        } else if (connection === 'open') {
            console.log('\n🚀 Motor Grupo RM Conectado e Pronto para Operar!\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Evento de recebimento de mensagens
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // Ignora mensagens do próprio bot ou de status
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

        // Extrai o texto da mensagem
        const textoMensagem = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const numeroCliente = msg.key.remoteJid.replace('@s.whatsapp.net', '');

        if (textoMensagem.trim() === "") return;

        console.log(`Mensagem recebida de ${numeroCliente}: ${textoMensagem}`);

        try {
            // Dispara para o Cérebro no Google Sheets
            const respostaGoogle = await axios.post(GOOGLE_SHEETS_WEBHOOK, {
                telefone: numeroCliente,
                mensagem: textoMensagem
            });

            const textoResposta = respostaGoogle.data.reply;

            // Se o Google devolveu texto (bot não pausado), o motor envia
            if (textoResposta && textoResposta.trim() !== "") {
                // Aplica a "Pausa Humana" e o status de digitando
                await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
                await new Promise(r => setTimeout(r, 3000)); // Espera 3 segundos digitando
                await sock.sendPresenceUpdate('paused', msg.key.remoteJid);
                
                // Dispara a resposta real
                await sock.sendMessage(msg.key.remoteJid, { text: textoResposta });
                console.log(`Resposta enviada para o cliente: ${numeroCliente}`);
            } else {
                console.log(`Nenhuma resposta enviada (Atendente Humano assumiu).`);
            }

        } catch (erro) {
            console.error('Erro de comunicação com o Cérebro:', erro.message);
        }
    });
}

iniciarMotor();
