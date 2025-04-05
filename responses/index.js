const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const { logger } = require('../src/logger')

const responseMaps = {};

const responseWatcher = chokidar.watch('.', {
    ignored: /index\.js$/,
    cwd: __dirname,
    ignoreInitial: false,
    persistent: true
});

responseWatcher
    .on('add', loadResponse)
    .on('change', loadResponse)
    .on('unlink', removeResponse);

function loadResponse(filePath) {
    try {
        const fullPath = path.resolve(__dirname, filePath);
        delete require.cache[require.resolve(fullPath)];
        const response = require(fullPath);

        if (response?.name) {
            const dirName = path.basename(path.dirname(fullPath));
            if (!responseMaps[dirName]) responseMaps[dirName] = new Map();

            responseMaps[dirName].set(response.name, response);
            logger(`✅ Loaded ${response.name} in ${dirName}`);
        }
    } catch (err) {
        console.error(`❌ Error loading ${filePath}:`, err);
    }
}
function removeResponse(filePath) {
    const fullPath = path.resolve(__dirname, filePath);
    const dirName = path.basename(path.dirname(fullPath));
    const responseName = Object.keys(require.cache).includes(require.resolve(filePath))
        ? require(filePath).name
        : null;

    if (responseName && responseMaps[dirName]) {
        responseMaps[dirName].delete(responseName);
        logger(`🗑️ Removed ${responseName} from ${dirName}`);
    }

    delete require.cache[require.resolve(filePath)];
}


module.exports = { responseMaps };