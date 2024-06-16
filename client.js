const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const consola = require('consola');

async function startWhatsApp(clientId) {
    const sessionDir = path.join(__dirname, 'sessions', clientId);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    return new Promise(async (resolve, reject) => {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }), // Silent logging except consola
            auth: state,
            printQRInTerminal: true, // Show QR code in terminal
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                consola.info('QR code received, scan it with your phone:');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect.error))?.output?.statusCode !== DisconnectReason.loggedOut;
                consola.error('Connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
                if (shouldReconnect) {
                    startWhatsApp(clientId).then(resolve).catch(reject);
                } else {
                    reject(new Error('Not reconnecting'));
                }
            } else if (connection === 'open') {
                consola.success('Opened connection');
                resolve(sock);
            } else if (connection === 'connecting') {
                consola.info('Connecting...');
            } else {
                consola.warn('Unknown connection state', connection);
            }
        });
    });
}

async function sendMessage(sock, number, message, imagePath) {
    const id = number + '@s.whatsapp.net';

    const imageBuffer = fs.readFileSync(imagePath);

    await sock.sendMessage(id, { 
        image: imageBuffer, 
        caption: message 
    });
}

module.exports = { startWhatsApp, sendMessage };
