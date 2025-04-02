const { logger } = require("../responseImports")
const messageHandler = require("../../src/messagehandler")

module.exports = {
    name: "!dumpqueue",
    execute(data) {
        mql = messageHandler.getQueueLength();
		logger(`${username} is dumping ${mql} messages`);
        messageHandler.unshiftQueue(`Dumping ${mql} messages`, data.broadcasterID)
		messageHandler.processQueue()
    }
}