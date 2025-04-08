const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!raidmsg",
    execute(data) {
        logger("Command raidmsg triggered by " + data.username)
		let msgList = []                   
        msgList.push("MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid");
		msgList.push("MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰")
        processQueue(msgList, data.broadcasterID);
    }
}