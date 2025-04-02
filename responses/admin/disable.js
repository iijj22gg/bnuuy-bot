const { logger } = require("../responseImports")
const messageHandler = require("../../src/messagehandler")
const globals = require("../../src/globals")

module.exports = {
    name: "!disable",
    execute(data) {
        if (globals.getResponsesPaused() == false) {
            globals.setResponsesPaused(true)
            messageHandler.clearQueue()
            messageHandler.processQueue("Responses are now disabled.", data.broadcasterID)
            logger("Disable administered by " + data.username)
        }
        else if (globals.getResponsesPaused() == true) {
            messageHandler.processQueue("Responses are already disabled.", data.broadcasterID)
            logger("Disable administered by " + data.username + ", nothing to do")
        }
    }
}