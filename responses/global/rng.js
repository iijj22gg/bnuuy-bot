const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!rng",
    execute(data, args) {
        logger("Command RNG triggered by " + data.username)

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
                        
        // Add message to queue
        processQueue(`${prefix}: ${randomNumber}`, data.broadcasterID);
    }
}