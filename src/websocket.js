const WebSocket = require('ws');

const env = require("./env")
const auth = require("./auth")

const { logger } = require("./logger")

// Main definitions
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';

var websocketSessionID;

let keepaliveDuration
let keepaliveTimeout
let keepAliveCount = 0

// Bot definitions
let messageQueue = [];

const MESSAGE_LIMIT = 100;
const TIME_WINDOW = 30 * 1000; // 30 seconds
let messageTimestamps = [];

let commandsEnabled = true;

const greetingMessages = [
    "milimi3Wiggle1",
    "Hallo! milimi3Hallo",
    "milimi3Kiss"
];
const cuttingBoards = [
	"{user}, Mili is not flat enough to be a cutting board! milimi3Hmph",
	"{user}, Mili is still growing! milimi3Hmph",
    "{user}, why do you bully Mili in this way?"
];

let hydrateTimeout
let chatTimeout

// Command vars
// Scatter
let lastScatterTime = 0;
const SCATTER_COOLDOWN = 60 * 1000; // 1 minute cooldown

// Emote repeats
const triggerPhrases = new Set(["milimi3Kiss", "milimi3Wiggle1", "milimi3Headpat", "milimi3Ghost1", "milimi3Stare", "milimi3Flicker", "milimi3Hype1", "milimi3Hallo", "milimi3Hmph", "milimi3Bleh", "milimi3Hydrate", "milimi3Bunbundancey", "milimi3Headpat", "milimi3Popcorn", "milimi3Lick", "milimi3Run", "milimi3Taptap", "milimi3Hug"]);
const phraseCooldowns = {};
const PHRASE_COOLDOWN = 60 * 1000; // 1 minute


// Other
const greetingCooldown = 10 * 60 * 1000; // 10 minutes
let lastChatTimestamp = 0;
const ignoredUsers = new Set(["streamelements", "sery_bot", "cutebnuuybot"]);



// Websocket Handlers

async function startWebSocketClient() {

    await auth.validateAuth();

	let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

	websocketClient.on('error', console.error);

	websocketClient.on('open', () => {
		logger('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
	});

	websocketClient.on('message', (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()), websocketClient);
	});

	websocketClient.on('close', (code, reason) => {
		logger(`WebSocket closed with code ${code}: ${reason}`, 'error')
	});

	return websocketClient;
}

function handleWebSocketMessage(data, websocketClient) {
	
	switch (data.metadata.message_type) {
		case 'session_welcome':
			websocketSessionID = data.payload.session.id; // Register Session ID
			keepaliveDuration = data.payload.session.keepalive_timeout_seconds;

			// Listen to EventSub
			registerEventSubListeners();
			resetKeepAlive(websocketClient);
			break;
		
		case 'session_keepalive':
			keepAliveCount++
			logger(`[KeepAlive] #${keepAliveCount}`, 'blank', 1);
			break;
		
		case 'notification':
			
			switch (data.metadata.subscription_type) {
				case 'channel.chat.message':
					
					const username = data.payload.event.chatter_user_login;
    				const messageText = data.payload.event.message.text.trim();

					const now = Date.now()
					let previousChatTimestamp = lastChatTimestamp
					lastChatTimestamp = now;

					if (chatTimeout) clearTimeout(chatTimeout);
					chatTimeout = setTimeout(() => {
						clearTimeout(hydrateTimeout)
					}, 600000)

					// Admin Commands
					if (env.authorizedUsers.has(username)) {
						if (messageText.startsWith("!enable")) {
						
							const statusMessage = commandsEnabled ? "Commands are already enabled." : "Commands are now enabled.";
							commandsEnabled = true;
							messageQueue = [statusMessage];
							
							processQueue();
							break;
						}
	
						if (messageText.startsWith("!disable")) {
						
							const statusMessage = commandsEnabled ? "Commands are now disabled." : "Commands are already disabled.";
							commandsEnabled = false;
							messageQueue = [statusMessage];
							
							processQueue();
							break;
						}

						if (messageText.startsWith("!bbotclear")) {
							messageQueue.push("!vanish")
							processQueue();
							break;
						}
					}

					
					if (ignoredUsers.has(username) || !commandsEnabled) {
                        break;
                    }
                    


					if (messageText.startsWith("!rng")) {
						logger("Command RNG triggered by " + username)
                        
						const args = messageText.split(" ").slice(1); // Remove "!rng"
                        let min = 1, max = 1000, prefix = "Random number";
                        let rangeFound = false;
                    
                        for (let i = 0; i < args.length; i++) {
                            // Join up to three tokens to detect "x - y" format
                            const potentialRange = args.slice(i, i + 3).join("").replace(/\s/g, ""); // Remove spaces around '-'
                            
                            if (!rangeFound && /^\d+-\d+$/.test(potentialRange)) { // Check for "x-x" pattern
                                let [low, high] = potentialRange.split("-").map(Number);
                                if (low < high) { // Ensure valid range
                                    min = low;
                                    max = high;
                                    rangeFound = true;
                                    i += 2; // Skip next two elements since they are part of the range
                                }
                            } else { 
                                prefix = args.slice(i).join(" "); // Everything after the range is the custom prefix
                                break;
                            }
                        }
                    
                        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                        const message = `${prefix}: ${randomNumber}`;
                        
                        // Add message to queue
                        messageQueue.push(message);
                        processQueue();
						break;
                    }

                    if (messageText.startsWith("!isprime")) {
						
						logger("Command isprime triggered by " + username)

                        const args = messageText.split(" ").slice(1); // Remove "!isprime"
                        
                        if (args.length === 0) {
                            messageQueue.push("Please provide a number to check if it's prime.");
                        } else {
                            const number = parseInt(args[0], 10);
                            
                            if (isNaN(number) || number < 2) {
                                messageQueue.push("Please provide a valid number greater than 1.");
                            } else {
                                const isPrime = checkPrime(number);
                                messageQueue.push(`${number} is ${isPrime ? "a prime number" : "not a prime number"}.`);
                            }
                        }
                    
                        processQueue();
						break;
                    }

					if (messageText.startsWith("!8ball")) {

						logger("Command 8ball triggered by " + username)

						const responses = [
							"It is certain.", "Without a doubt.", "You may rely on it.", 
							"Yes, definitely.", "It is decidedly so.", "As I see it, yes.", 
							"Most likely.", "Yes.", "Outlook good.", "Signs point to yes.", 
							"Reply hazy, try again.", "Better not tell you now.", 
							"Ask again later.", "Cannot predict now.", "Concentrate and ask again.", 
							"Don't count on it.", "My reply is no.", "My sources say no.", 
							"Outlook not so good.", "Very doubtful.", "Ask Mili", "VoteYea", "VoteNay",
							"Ask the mods"
						];
					
						const randomResponse = responses[Math.floor(Math.random() * responses.length)];
						messageQueue.push(`@${username}, 🎱 ${randomResponse}`);
						processQueue();
						break;
					}                    

                    if (messageText == "!freaky") { 
						logger("Command freaky triggered by " + username)                       
                        messageQueue.push("😏");
                        processQueue();
						break;
                    }
					if (messageText == "!balls") {
						logger("Command balls triggered by " + username)                    
                        messageQueue.push("milimi3Hmph");
                        processQueue();
						break;
                    }
					if (messageText == "!raidmsg") {   
						logger("Command raidmsg triggered by " + username)                     
                        messageQueue.push("MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid");
						messageQueue.push("MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰")
                        processQueue();
						break;
                    }

					if (messageText == "!commands") {  
						logger("Command list triggered by " + username)                      
                        messageQueue.push("Command list: 8ball balls commands freaky isprime raidmsg rng");
                        processQueue();
						break;
                    }

					
					
					// Phrases
					if (messageText === "SCATTER") {	
						logger("SCATTER triggered by " + username)			
						if (now - lastScatterTime >= SCATTER_COOLDOWN) {
							messageQueue.push("SCATTER");
							lastScatterTime = now;
							processQueue();
							break; 
						}
					}

					if (messageText.toLowerCase().includes("cutting board") || messageText.toLowerCase().includes("chopping board")) {
						logger("Cutting board triggered by " + username)
						const cutMessage = cuttingBoards[Math.floor(Math.random() * cuttingBoards.length)]
							.replace("{user}", "@" + username);
						messageQueue.push(cutMessage);
						processQueue();
						break;
					}

					if (username == 'soundalerts' && messageText.includes('Hydrate')) {
						logger('Hydrate timeout reset')
						if (hydrateTimeout) clearTimeout(hydrateTimeout); 
						hydrateTimeout = setTimeout(() => {
							logger("Hydrate timeout reached")
							messageQueue.push('No one has hydrated Mili for 30 minutes! milimi3Nervous')
							processQueue()
							hydrateTimeout = setTimeout(() => {
								logger('Hydrate timout 2 reached')
								messageQueue.push('No one has hydrated Mili for 1 hour! milimi3Cry')
								processQueue()
							}, 1800000)
						}, 1800000);
						break
					}

					let messagePhrases = []
					for (const phrase of triggerPhrases) {
						if (messageText.includes(phrase)) {
					
							// Check cooldown for this trigger
							if (!phraseCooldowns[phrase] || now - phraseCooldowns[phrase] >= PHRASE_COOLDOWN) {
								messagePhrases.push(phrase);
								phraseCooldowns[phrase] = now;
							}
						}
					}
					if (messagePhrases.length > 0) {
						logger("Phrase triggered by " + username + ": " + messagePhrases.join(' '))
						messageQueue.push(messagePhrases.join(' '))
						processQueue()
						break;
					}
					
					// Greeting
					if (now - previousChatTimestamp > greetingCooldown) {
						
						logger("Greeting triggered by " + username)

						// Pick a random greeting
						const randomGreeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)]
							.replace("{user}", username);
		
						messageQueue.push(randomGreeting);
						processQueue();
					}

					
					break;
				default:
					logger(data)
			}
			break;
	};

	if (keepaliveTimeout) resetKeepAlive(websocketClient);

}

function checkPrime(num) {
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) {
            return false;
        }
    }
    return true;
}

function processQueue() {
	if (messageQueue.length === 0) return; // Exit if the queue is empty

    const now = Date.now();

    // Remove timestamps older than 30 seconds
    messageTimestamps = messageTimestamps.filter(timestamp => now - timestamp < TIME_WINDOW);

    if (messageTimestamps.length < MESSAGE_LIMIT) {
            sendChatMessage(messageQueue.shift());
            messageTimestamps.push(now); // Timestamp
			processQueue();
    } else {
        setTimeout(processQueue, (messageTimestamps[0] + TIME_WINDOW - now));
    }
}

async function sendChatMessage(chatMessage) {
	let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + auth.getToken(),
			'Client-Id': env.CLIENT_ID,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			broadcaster_id: env.CHAT_CHANNEL_USER_ID,
			sender_id: env.BOT_USER_ID,
			message: chatMessage
		})
	});

	if (response.status == 401) {
		await auth.refreshAuth();
		await sendChatMessage(chatMessage);
	}
	else if (response.status != 200) {
		let data = await response.json();
		logger("Failed to send chat message", 'error');
		console.error(data);
	} else {
		logger(`Sent message: ${chatMessage}`);
	}
}

async function registerEventSubListeners() {
	// Register channel.chat.message
	let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + auth.getToken(),
			'Client-Id': env.CLIENT_ID,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			type: 'channel.chat.message',
			version: '1',
			condition: {
				broadcaster_user_id: env.CHAT_CHANNEL_USER_ID,
				user_id: env.BOT_USER_ID
			},
			transport: {
				method: 'websocket',
				session_id: websocketSessionID
			}
		})
	});

	if (response.status != 202) {
		let data = await response.json();
		console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
		console.error(data);
		process.exit(1);
	} else {
		const data = await response.json();
		logger(`Subscribed to channel.chat.message [${data.data[0].id}]`);
	}
}

function resetKeepAlive(websocketClient) {
	if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
	keepaliveTimeout = setTimeout(() => {
		logger("Keepalive timed out.", 'warn')
		websocketClient.close(4000, "Keepalive timeout");
	}, keepaliveDuration * 1000 * 2)
}

module.exports = {
    startWebSocketClient
}