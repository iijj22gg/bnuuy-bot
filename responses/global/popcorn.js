const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!popcorn",
    execute(data) {
        logger("Command popcorn triggered by " + data.username)                    
        processQueue("milimi3Popcorn");
    }
}
