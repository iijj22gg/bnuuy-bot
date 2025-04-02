const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!github",
    execute(data) {
        logger("Command github triggered by " + data.username)                    
        processQueue("BnuuyBot's code: https://github.com/iijj22gg/bnuuy-bot");
    }
}