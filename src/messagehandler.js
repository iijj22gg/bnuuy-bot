const auth = require("./auth")
const env = require("./env")

const MESSAGE_LIMIT = 100;
const TIME_WINDOW = 30 * 1000; // 30 seconds
let messageTimestamps = [];

let messageQueue = [];
isProcessing = false

async function processQueue(message, bID) {
	messageQueue.push(...(Array.isArray(message) ? message : [message])); // If message is truthy, convert message to list and push it
	
	if (messageQueue.length === 0 || isProcessing) return;
    isProcessing = true;

    while (messageQueue.length > 0) {
		const now = Date.now();
		messageTimestamps = messageTimestamps.filter(timestamp => now - timestamp < TIME_WINDOW); // Remove timestamps older than TIME_WINDOW
		
		if (messageTimestamps.length >= MESSAGE_LIMIT) {
			const delay = messageTimestamps[0] + TIME_WINDOW - now;
			await new Promise(resolve => setTimeout(resolve, delay));
			continue;
		};

		sendChatMessage(messageQueue.shift());
        messageTimestamps.push(now);

	}
	
	isProcessing = false;
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

function clearQueue() {
    messageQueue = [];
}

function unshiftQueue(message, bID) {
    if (message) messageQueue.unshift(message);
}

function getQueueLength() {
    return messageQueue.length
}

module.exports = {
    processQueue, clearQueue, unshiftQueue, getQueueLength
}