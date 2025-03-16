require('dotenv').config();

const BOT_USER_ID = process.env.TW_BOT_USER_ID;
const CLIENT_ID = process.env.TW_CLIENT_ID;
const CLIENT_SECRET = process.env.TW_CLIENT_SECRET;

const CHAT_CHANNEL_USER_ID = process.env.TW_CHANNEL_USER_ID;

const authorizedUsers = new Set(process.env.AUTHORIZED_USERS.split(','));

module.exports = {
    BOT_USER_ID,
    CLIENT_ID,
    CLIENT_SECRET,
    CHAT_CHANNEL_USER_ID,
    authorizedUsers
}