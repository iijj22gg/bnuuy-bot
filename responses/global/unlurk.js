const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!unlurk",
    execute(data) {
        logger("Command unlurk triggered by " + data.username);                 
        processQueue(`Welcome back, @{data.username} milimi3Comfy`, data.broadcasterID);
    }
}
