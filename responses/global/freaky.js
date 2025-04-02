const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!freaky",
    execute(data) {
        logger("Command freaky triggered by " + username);                 
        processQueue("😏", data.broadcasterID);
    }
}