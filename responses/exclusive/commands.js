const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!commands",
    execute(data) {
        logger("Command list triggered by " + data.username)                      
        processQueue("Here are my commands! 8ball balls commands freaky github isprime popcorn raidmsg rng", data.broadcasterID);
    }
}