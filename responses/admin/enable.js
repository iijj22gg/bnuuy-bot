const { logger } = require("../responseImports")
const messageHandler = require("../../src/messagehandler")
const globals = require("../../src/globals")

module.exports = {
    name: "!enable",
    execute(data) {
        if (globals.getResponsesPaused() == false) {
            messageHandler.processQueue("Responses are already enabled.", data.broadcasterID)
            logger("Enable administered by " + data.username + ", nothing to do")
        }
        else if (globals.getResponsesPaused() == true) {
            globals.setResponsesPaused(false)
            messageHandler.processQueue("Responses are now enabled.", data.broadcasterID)
            logger("Enable administered by " + data.username)
        }
    }
}