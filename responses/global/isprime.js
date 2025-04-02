const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!isprime",
    execute(data, args) {
        logger("Command isprime triggered by " + data.username)

	    let response = ''
                        
        if (args.length === 0) {
            response = "Please provide a number to check if it's prime.";
        } else {
            const number = parseInt(args[0], 10);
                            
            if (isNaN(number) || number < 2) {
                response = "Please provide a valid number greater than 1.";
            } else {
                const isPrime = checkPrime(number);
                response = `${number} is ${isPrime ? "a prime number" : "not a prime number"}.`;
            }
        }
                    
        processQueue(response, data.broadcasterID);
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