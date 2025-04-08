const { logger, processQueue } = require("../responseImports")

module.exports = {
    name: "!isprime",
    execute(data, args) {
        logger("Command isprime triggered by " + data.username)

	    let response = ''
                        
        if (args.length === 0) {
            response = "Please provide a number to check if it's prime.";
        } else {
            let number
            try { number = BigInt(args[0]); } catch {};
            if (!number || number < 2) {
                response = "I need a valid number higher than 1 to check!"
            } else {
                if (number < 2147483648) {
                    const smallNumber = parseInt(number)
                    const isPrime = checkPrime(smallNumber)
                    response = `This is easy! ${smallNumber} is ${isPrime ? "a prime number" : "not a prime number"}!`;
                } else {
                    const isPrime = millerRabinTest(number);
                    response = `Hmm... ${number} is ${isPrime ? "too big for my brain, but probably a prime number" : "not a prime number"}.`;
                }
                
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

function millerRabinTest(n, k = 5) {
    if (n === 2n || n === 3n) return true;
    if (n <= 1n || n % 2n === 0n) return false;

    // Find r and d such that n - 1 = d * 2^r
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r += 1n;
        d /= 2n;
    }

    // Repeat the test k times (k is the number of rounds)
    for (let i = 0; i < k; i++) {
        let a = BigInt(Math.floor(Math.random() * Number(n - 4n))) + 2n; // a random base
        let x = modExp(a, d, n);

        if (x === 1n || x === n - 1n) {
            continue;
        }

        let isComposite = true;
        for (let j = 0n; j < r - 1n; j++) {
            x = modExp(x, 2n, n);
            if (x === n - 1n) {
                isComposite = false;
                break;
            }
        }

        if (isComposite) {
            return false; // Found a witness for the composite nature of n
        }
    }

    return true; // No witnesses found, n is probably prime
}

// Modular exponentiation (a^b % n)
function modExp(base, exp, mod) {
    let result = 1n;
    base = base % mod;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        base = (base * base) % mod;
        exp /= 2n;
    }

    return result;
}