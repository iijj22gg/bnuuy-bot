const http = require("http")
const fs = require("fs");
const qs = require("querystring")

const env = require("./env")

let accessToken = null;
let refreshToken = null;
let tokenExpiration = 0;

const SCOPES = "user:bot user:read:chat user:write:chat";
const REDIRECT_URI = "http://localhost:3000"

const TOKEN_FILE = "tokens.json";

async function validateAuth() {

    loadTokens();
	if (!accessToken) {
		await getToken()
	}

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
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
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
        const authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${env.CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(SCOPES)}&state=${STATE}`;
        
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
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
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

module.exports = {
    validateAuth,
    refreshAuth,
    getToken: () => accessToken
}