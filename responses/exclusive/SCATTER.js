const { logger, processQueue } = require("../responseImports")

let lastScatterTime = 0;
const SCATTER_COOLDOWN = 60 * 1000; // 1 minute cooldown

module.exports = {
    name: "SCATTER",
    execute(data) {
        logger("SCATTER triggered by " + data.username)
        const now = Date.now()		
		if (now - lastScatterTime >= SCATTER_COOLDOWN) {
			lastScatterTime = now;
			processQueue("SCATTER", data.broadcasterID); 
		}
    }
}