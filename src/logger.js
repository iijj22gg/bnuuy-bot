const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require("readline")
let lgInit = false

// Configuration
const LOG_DIR = 'logs';
// const MAX_LOG_SIZE = 10 * 1024 * 1024; // Max size 10MB before rotation
const LOG_FILE = path.join(LOG_DIR, 'latest.log');
lastID = null;


(function loggerInit() {
    if (lgInit == true) return;
    lgInit = true;
    if (!fs.existsSync(LOG_DIR)) {
        logger('1', 'debug')
        fs.mkdirSync(LOG_DIR);
    }
    if (fs.existsSync(LOG_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const gzip = zlib.createGzip();
        const input = fs.createReadStream(LOG_FILE);
        const output = fs.createWriteStream(path.join(LOG_DIR, `log_${timestamp}.log.gz`));

        input.pipe(gzip).pipe(output);

        output.on('finish', () => {
            fs.unlinkSync(LOG_FILE);
        });
    }

})()





function logger(text, type, id) {
    timestamp = new Date().toISOString()
    if (id) {
        if (id == lastID) {
            readline.moveCursor(process.stdout, 0, -1);
            readline.clearLine(process.stdout, 0);
        }
    }
    switch (type) {
        case `error`:
            message = `[Error] [${timestamp}] ${text}`
            console.error(message);
            fs.appendFileSync(LOG_FILE, `${message}\n`)
            break;
        case `warn`:
            message = `[Warn] [${timestamp}] ${text}`
            console.warn(message);
            fs.appendFileSync(LOG_FILE, `${message}\n`)
            break;
        case `debug`:
            console.debug(`[Debug] ${text}`);
            break;
        case 'blank':
            console.log(text)
            break;
        default:
            console.log(`[Info] ${text}`)
            fs.appendFileSync(LOG_FILE, `[Info] [${timestamp}] ${text}\n`)

    };
    lastID = id
};

module.exports = {
    logger
}