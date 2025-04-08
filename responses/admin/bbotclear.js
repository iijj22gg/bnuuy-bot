const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!bbotclear",
    execute(data) {
        logger("bbotclear administered by " + data.username)
        processQueue("!vanish", data.broadcasterID)		
    }
}