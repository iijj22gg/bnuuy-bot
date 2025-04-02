let responsesPaused = false

function setResponsesPaused(state) {
    if (state === true || state === false) responsesPaused = state;
}

function getResponsesPaused() {
    return responsesPaused;
}

module.exports = { setResponsesPaused, getResponsesPaused }