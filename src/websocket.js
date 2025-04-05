const WebSocket = require('ws');

const env = require("./env")
const auth = require("./auth")
const globals = require("./globals")

const { logger } = require("./logger")
const { processQueue } = require("./messagehandler")
const { responseMaps } = require("../responses/index")

// Main definitions
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';

var websocketSessionID;

let keepaliveDuration
let keepaliveTimeout
let keepAliveCount = 0

// Bot definitions
let websocketClient

let responseMapList = []

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

// Emote repeats
const triggerPhrases = new Set([
	"milimi3Kiss", "milimi3Wiggle1", "milimi3Headpat", "milimi3Ghost1", "milimi3Stare",
	"milimi3Flicker", "milimi3Hype1", "milimi3Hallo", "milimi3Hmph", "milimi3Bleh",
	"milimi3Hydrate", "milimi3Bunbundancey", "milimi3Headpat", "milimi3Popcorn", "milimi3Lick",
	"milimi3Run", "milimi3Taptap", "milimi3Hug"
]);
const phraseCooldowns = {};
const PHRASE_COOLDOWN = 60 * 1000; // 1 minute


// Other
const greetingCooldown = 10 * 60 * 1000; // 10 minutes
let lastChatTimestamp = 0;
const ignoredUsers = new Set(["streamelements", "sery_bot", "cutebnuuybot"]);



// Websocket Handlers

async function startWebSocketClient(url) {
	let currentURL = EVENTSUB_WEBSOCKET_URL
	if (url) currentURL = url

    await auth.validateAuth();

	const newWebsocket = new WebSocket(currentURL);

	newWebsocket.on('error', console.error);

	newWebsocket.on('open', () => {
		logger('WebSocket connection opened to ' + currentURL);
	});

	newWebsocket.on('message', (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()), newWebsocket, currentURL);
	});

	newWebsocket.on('close', (code, reason) => {
		if ([4003, 4035].includes(code)) {
			logger('Unused socket closed');
			return;
		}
		logger(`WebSocket closed with code ${code}: ${reason}`, 'error')
		setTimeout(() => startWebSocketClient(), 5000)
	});
}

function handleWebSocketMessage(data, currentWSclient, url) {
	
	switch (data.metadata.message_type) {
		case 'session_welcome':
			websocketSessionID = data.payload.session.id; // Register Session ID
			keepaliveDuration = data.payload.session.keepalive_timeout_seconds;

			// Listen to EventSub
			if (websocketClient && websocketClient.readyState === WebSocket.OPEN) {websocketClient.close(4035)};
			if (url == EVENTSUB_WEBSOCKET_URL) {registerEventSubListeners()};
			websocketClient = currentWSclient;
			resetKeepAlive(currentWSclient);
			break;
		
		case 'session_keepalive':
			keepAliveCount++
			logger(`[KeepAlive] #${keepAliveCount}`, 'blank', 1);
			break;
		
		case 'session_reconnect':
			logger('Reconnect received');
			startWebSocketClient(data.payload.session.reconnect_url);
			break;
		
		case 'notification':
			
			switch (data.metadata.subscription_type) {
				case 'channel.chat.message':
					
					const username = data.payload.event.chatter_user_login;
    				const messageText = data.payload.event.message.text.trim();
					const broadcasterID = data.payload.event.broadcaster_user_id;

					

					const metadata = {
						username: data.payload.event.chatter_user_login,
						broadcasterID: data.payload.event.broadcaster_user_id
					};

					const now = Date.now()
					const msgArgs = messageText.split(' ')

					if (chatTimeout) clearTimeout(chatTimeout);
					chatTimeout = setTimeout(() => {
						clearTimeout(hydrateTimeout)
					}, 600000)

					if (ignoredUsers.has(username)) break;

					if (globals.getResponsesPaused()) {responseMapList = []}
					else {
						responseMapList = [responseMaps.global]
						if (broadcasterID == env.CHAT_CHANNEL_USER_ID) responseMapList.push(responseMaps.exclusive)
					}
					
					// Admin Commands
					if (env.authorizedUsers.has(username)) responseMapList.push(responseMaps.admin)

					if (!responseMapList.length) break;

					let previousChatTimestamp = lastChatTimestamp
					lastChatTimestamp = now;
					
					let responseFound = false;
					for (const map of responseMapList) {
						if (map && map.has(msgArgs[0])) {
							map.get(msgArgs[0]).execute(metadata, msgArgs.slice(1))
							responseFound = true
							break;
						}
					}
					if (responseFound === true || responseMapList.every(map => map === responseMaps.admin)) break;
					
					
					// Phrases
					if (messageText.toLowerCase().includes("cutting board") || messageText.toLowerCase().includes("chopping board")) {
						logger("Cutting board triggered by " + username)
						const cutMessage = cuttingBoards[Math.floor(Math.random() * cuttingBoards.length)]
							.replace("{user}", "@" + username);
						processQueue(cutMessage);
						break;
					}

					if (username == 'soundalerts' && messageText.includes('Hydrate')) {
						logger('Hydrate timeout reset')
						if (hydrateTimeout) clearTimeout(hydrateTimeout); 
						hydrateTimeout = setTimeout(() => {
							logger("Hydrate timeout reached")
							processQueue('No one has hydrated Mili for 30 minutes! milimi3Nervous')
							hydrateTimeout = setTimeout(() => {
								logger('Hydrate timout 2 reached')
								processQueue('No one has hydrated Mili for 1 hour! milimi3Cry')
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
						processQueue(messagePhrases.join(' '))
						break;
					}
					
					// Greeting
					if (now - previousChatTimestamp > greetingCooldown) {
						
						logger("Greeting triggered by " + username)

						// Pick a random greeting
						const randomGreeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)]
							.replace("{user}", username);
		
						processQueue(randomGreeting);
					}

					
					break;
				default:
					logger(data)
			}
			break;
	};

	if (keepaliveTimeout) resetKeepAlive(websocketClient);

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

function resetKeepAlive(wsc) {
	if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
	keepaliveTimeout = setTimeout(() => {
		logger("Keepalive timed out.", 'warn')
		wsc.close(4000, "Keepalive timeout");
	}, keepaliveDuration * 1000 * 2)
}

module.exports = {
    startWebSocketClient
}