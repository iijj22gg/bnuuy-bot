const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!freaky",
    execute(data) {
        logger("Command freaky triggered by " + data.username);                 
        processQueue("😏", data.broadcasterID);
    }
}