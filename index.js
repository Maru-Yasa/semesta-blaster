const { startWhatsApp, sendMessage } = require('./client');
const fs = require('fs');
const consola = require('consola');
const path = require('path');

function getRandomDelay(minSeconds, maxSeconds) {
    const minMilliseconds = minSeconds * 1000;
    const maxMilliseconds = maxSeconds * 1000;
    return Math.floor(Math.random() * (maxMilliseconds - minMilliseconds + 1)) + minMilliseconds;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    try {
        let [clientId, numberFile, messageFile, imagePath] = process.argv.slice(2);

        const requiredFiles = [numberFile, messageFile, imagePath];

        for (const file of requiredFiles) {
            if (!file) {
                consola.error(`Missing file argument: ${file}`);
                return;
            }

            if (!fs.existsSync(file)) {
                consola.error(`File not found: ${file}`);
                return;
            }
        }

        const sock = await startWhatsApp(clientId);
    
        const numbers = JSON.parse(fs.readFileSync(numberFile, 'utf8'));
        let message = fs.readFileSync(messageFile, 'utf8');
        
        let chunkSize = 1_000;
        let secondPerChunk = 60_000;
        let secondPerMessage = 1_000;

        // make chunks
        let chunks = [];
        for (let i = 0; i < numbers.length; i += chunkSize) {
            let chunk = numbers.slice(i, i + chunkSize);
            chunks.push(chunk);
        }

        for (let chunk of chunks) {
            for (let number of chunk) {
                await delay(secondPerMessage);
                let dynamicMessage = message.replace('{nama_peserta}', number["nama_peserta"]);
        
                await sendMessage(sock, number['nomer_hp'], dynamicMessage, imagePath);
                consola.success(`Messages sent to ${number['nomer_hp']}`);
            }
            await delay(secondPerChunk);
        }
    
    } catch (error) {
        consola.error('Failed to start WhatsApp:', error);
    }
}

main();
