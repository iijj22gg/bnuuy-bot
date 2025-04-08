const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!balls",
    execute(data) {
        logger("Command balls triggered by " + data.username)                    
        processQueue("milimi3Hmph");
    }
}