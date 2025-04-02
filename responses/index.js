const fs = require('fs');
const path = require('path');

const globalResponses = new Map()
fs.readdirSync((dir = path.join(__dirname, './global/'))).forEach(file => {
    if (file.endsWith(".js") && file !=="index.js") {
        const response = require(path.join(__dirname, file));
        responses.set(response.name, response)
    }
});

const exclusiveResponses = new Map()
let dir
fs.readdirSync((dir = path.join(__dirname, './exclusive/'))).forEach(file => {
    if (file.endsWith(".js")) {
        const response = require(path.join(dir, file));
        responses.set(response.name, response)
    }
});

const adminResponses = new Map()
fs.readdirSync((dir = path.join(__dirname, './admin/'))).forEach(file => {
    if (file.endsWith(".js")) {
        const response = require(path.join(dir, file));
        responses.set(response.name, response)
    }
});

module.exports = { globalResponses, exclusiveResponses, adminResponses };