const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!lurk",
    execute(data) {
        logger("Command lurk triggered by " + data.username);                 
        processQueue(`Enjoy your lurk, @{data.username} milimi3Lick`, data.broadcasterID);
    }
}
