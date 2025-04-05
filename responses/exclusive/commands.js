const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!commands",
    execute(data) {
        logger("Command list triggered by " + data.username)                      
        processQueue("Command list: 8ball balls commands freaky github isprime popcorn raidmsg rng", data.broadcasterID);
    }
}