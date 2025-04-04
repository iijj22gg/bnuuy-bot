const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!8ball",
    execute(data) {
        logger("Command 8ball triggered by " + data.username)

		const responses = [
			"It is certain.", "Without a doubt.", "You may rely on it.", 
			"Yes, definitely.", "It is decidedly so.", "As I see it, yes.", 
			"Most likely.", "Yes.", "Outlook good.", "Signs point to yes.", 
			"Reply hazy, try again.", "Better not tell you now.", 
			"Ask again later.", "Cannot predict now.", "Concentrate and ask again.", 
			"Don't count on it.", "My reply is no.", "My sources say no.", 
			"Outlook not so good.", "Very doubtful.", "Ask Mili.", "VoteYea", "VoteNay",
			"Ask the mods.", "Eat a lemon.", "Never.", "Always.", "We will never know."
		];
					
		const randomResponse = responses[Math.floor(Math.random() * responses.length)];
		processQueue(`@${data.username}, 🎱 ${randomResponse}`, data.broadcasterID);
    }
}