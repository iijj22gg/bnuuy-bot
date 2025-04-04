const fs = require('fs');
const path = require('path');

const globalResponses = new Map()
let dir = path.join(__dirname, 'global')
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith(".js") && file !=="index.js") {
        const response = require(path.join(dir, file));
        globalResponses.set(response.name, response)
    }
});

const exclusiveResponses = new Map()
dir = path.join(__dirname, 'exclusive')
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith(".js")) {
        const response = require(path.join(dir, file));
        exclusiveResponses.set(response.name, response)
    }
});

const adminResponses = new Map()
dir = path.join(__dirname, 'admin')
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith(".js")) {
        const response = require(path.join(dir, file));
        adminResponses.set(response.name, response)
    }
});

module.exports = { globalResponses, exclusiveResponses, adminResponses };