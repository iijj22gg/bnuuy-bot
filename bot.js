require('dotenv').config();

const WebSocket = require('ws');
const http = require("http")
const fs = require("fs");
const qs = require("querystring")

// Env
const BOT_USER_ID = process.env.TW_BOT_USER_ID;
const CLIENT_ID = process.env.TW_CLIENT_ID;
const CLIENT_SECRET = process.env.TW_CLIENT_SECRET;

const CHAT_CHANNEL_USER_ID = process.env.TW_CHANNEL_USER_ID;

const authorizedUsers = new Set(process.env.AUTHORIZED_USERS.split(','));


// Main definitions
const SCOPES = "user:bot user:read:chat user:write:chat";
const REDIRECT_URI = "http://localhost:3000"
const TOKEN_FILE = "tokens.json";

const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';

var websocketSessionID;


let accessToken = null;
let refreshToken = null;
let tokenExpiration = 0;


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
	"{user}, Mili is still growing! milimi3Hmph"
];


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
const ignoredUsers = new Set(["streamelements", "sery_bot", "cutebnuuybot", "soundalerts"]);




// Auth Handlers

async function validateAuth() {
	const now = Date.now() / 1000
	
	let response = await fetch('https://id.twitch.tv/oauth2/validate', {
		method: 'GET',
		headers: {
			'Authorization': 'OAuth ' + accessToken
		}
	});
	
	switch (response.status) {
		case 200:
			console.log("Validated token.");
			break;
		case 401:
			await refreshAuth()
			break;
		default:
			console.error(data)
	}
}

async function refreshAuth() {
	let response
	try {
        console.log("Refreshing token...");
        response = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			body: new URLSearchParams({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			}),
		});
		
		data = await response.json()
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        tokenExpiration = Date.now() / 1000 + data.expires_in;
        saveTokens();

        console.log("Token refreshed successfully.");
        return accessToken;
    } catch (error) {
        console.error("Error refreshing token:", error.response?.data || error.message);
		console.log(response)
        process.exit()
	}
}

async function getToken() {
    return new Promise((resolve, reject) => {
        // Generate the authorization URL
		const STATE = Math.random().toString(36).substring(2); // Random state for security
        const authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(SCOPES)}&state=${STATE}`;
        
        console.log("Visit this URL to authorize the app:");
        console.log(authUrl);

        // HTTP server
        const server = http.createServer(async (req, res) => {
            const query = qs.parse(req.url.split("?")[1]);
            const { code, state } = query;

            if (state === STATE) { // Check if the state matches
                await getTokenFromCode(code);
                resolve();
            } else {
                console.error("State does not match!");
                reject(new Error("State does not match!"));
				process.end()
            }

            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Authorization complete. You can close this window.");
            server.close();
        });

        // Start the server
        server.listen(3000, () => {
            console.log("Listening for redirect on http://localhost:3000");
        });
    });
}

async function getTokenFromCode(authCode) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			body: new URLSearchParams({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				code: authCode,
				grant_type: 'authorization_code',
				redirect_uri: REDIRECT_URI,
			}),
		});

        // Handle token storage
		data = await response.json()
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        tokenExpiration = Date.now() / 1000 + data.expires_in; // In seconds
        saveTokens();

        console.log("New token obtained successfully.");
        return accessToken;
    } catch (error) {
        console.error("Error obtaining access token:", error.response?.data || error.message);
        process.exit()
    }
}



// Websocket Handlers

function startWebSocketClient() {
	let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

	websocketClient.on('error', console.error);

	websocketClient.on('open', () => {
		console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
	});

	websocketClient.on('message', (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()));
	});

	return websocketClient;
}

function handleWebSocketMessage(data) {
	
	switch (data.metadata.message_type) {
		case 'session_welcome':
			websocketSessionID = data.payload.session.id; // Register Session ID

			// Listen to EventSub
			registerEventSubListeners();
			break;
		
		case 'notification':
			
			switch (data.metadata.subscription_type) {
				case 'channel.chat.message':
					
					const username = data.payload.event.chatter_user_login;
    				const messageText = data.payload.event.message.text.trim();

					const now = Date.now()

					// Admin Commands
					if (authorizedUsers.has(username)) {
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
						console.log("Command RNG triggered by " + username)
                        
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
						
						console.log("Command isprime triggered by " + username)

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

						console.log("Command 8ball triggered by " + username)

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
						console.log("Command freaky triggered by " + username)                       
                        messageQueue.push("😏");
                        processQueue();
						break;
                    }
					if (messageText == "!balls") {
						console.log("Command balls triggered by " + username)                    
                        messageQueue.push("milimi3Hmph");
                        processQueue();
						break;
                    }
					if (messageText == "!raidmsg") {   
						console.log("Command raidmsg triggered by " + username)                     
                        messageQueue.push("MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid MILIRAID milimi3Raid");
						messageQueue.push("MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰 MILIRAID 🐰")
                        processQueue();
						break;
                    }

					if (messageText == "!commands") {  
						console.log("Command list triggered by " + username)                      
                        messageQueue.push("Command list: 8ball balls commands freaky isprime raidmsg rng");
                        processQueue();
						break;
                    }

					
					
					// Phrases
					if (messageText === "SCATTER") {	
						console.log("SCATTER triggered by " + username)			
						if (now - lastScatterTime >= SCATTER_COOLDOWN) {
							messageQueue.push("SCATTER");
							lastScatterTime = now;
							processQueue();
							break; 
						}
					}

					if (messageText.toLowerCase().includes("cutting board")) {
						console.log("Cutting board triggered by " + username)
						const cutMessage = cuttingBoards[Math.floor(Math.random() * cuttingBoards.length)]
							.replace("{user}", username);
						messageQueue.push(cutMessage);
						processQueue();
						break;
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
					if (!messagePhrases.length === 0) {
						console.log("Phrase triggered by " + username + ": " + messagePhrases.join(' '))
						messageQueue.push(messagePhrases.join(' '))
						processQueue()
						break;
					}
					
					// Greeting
					if (now - lastChatTimestamp > greetingCooldown) {
						
						console.log("Greeting triggered by " + username)

						// Pick a random greeting
						const randomGreeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)]
							.replace("{user}", username);
		
						messageQueue.push(randomGreeting);
						processQueue();
					}

					lastChatTimestamp = now; // Update cooldown

					break;
			}
			break;
	}
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
			'Authorization': 'Bearer ' + accessToken,
			'Client-Id': CLIENT_ID,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			broadcaster_id: CHAT_CHANNEL_USER_ID,
			sender_id: BOT_USER_ID,
			message: chatMessage
		})
	});

	if (response.status == 401) {
		await refreshAuth();
		await sendChatMessage(chatMessage);
	}
	else if (response.status != 200) {
		let data = await response.json();
		console.error("Failed to send chat message");
		console.error(data);
	} else {
		console.log("Sent message: " + chatMessage);
	}
}

async function registerEventSubListeners() {
	// Register channel.chat.message
	let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + accessToken,
			'Client-Id': CLIENT_ID,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			type: 'channel.chat.message',
			version: '1',
			condition: {
				broadcaster_user_id: CHAT_CHANNEL_USER_ID,
				user_id: BOT_USER_ID
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
		console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
	}
}


function loadTokens() {
    if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE));
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        tokenExpiration = data.token_expiration;
    }
}

function saveTokens() {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiration: tokenExpiration,
    }, null, 2));
}


// Main
(async () => {
	
	loadTokens();
	if (!accessToken) {
		await getToken()
	}

	await validateAuth();
	const websocketClient = startWebSocketClient();
})();
