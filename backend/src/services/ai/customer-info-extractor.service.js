// --------------------------------------------------
// Customer Information Extractor (C7.6)
// --------------------------------------------------
// Pulls the customer's name / phone out of a message.
//
// options.expectingName = true when the bot has just
// asked "May I know your name?" (conversation.state ===
// 'awaiting_name'). Only then is a bare reply like
// "Kamal Perera" treated as a name.
// --------------------------------------------------

// Words that follow "I am / I'm" but are NOT names
const NOT_A_NAME = new Set([
    "interested", "looking", "searching", "here", "from", "fine",
    "good", "ok", "okay", "not", "just", "also", "very", "so",
    "a", "an", "the", "going", "trying", "planning", "asking",
    "working", "studying", "student", "currently", "still",
    "ready", "available", "free", "busy", "new", "confused",
    "sure", "sorry", "thinking", "calling", "writing", "messaging",
    "hi", "hello", "hey", "yes", "no", "yeah", "thanks", "thank",
    "course", "courses", "fee", "fees", "price", "python", "java",
    "please", "pls", "want", "need", "would", "like", "can", "what",
    "when", "where", "how", "why", "which", "who", "is", "are",
    "and", "i", "but", "or", "with", "to", "my", "wants"
]);

const MAX_NAME_WORDS = 3;


// --------------------------------------------------
// Helpers
// --------------------------------------------------

const toTitleCase = (value) =>
    value
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");


// Returns a clean name or null
const cleanName = (raw) => {

    if (!raw) {
        return null;
    }

    const words = raw
        .replace(/[^A-Za-z.\s'-]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    // Stop at the first word that clearly isn't a name
    const nameWords = [];

    for (const word of words) {

        if (NOT_A_NAME.has(word.toLowerCase())) {
            break;
        }

        nameWords.push(word);

        if (nameWords.length === MAX_NAME_WORDS) {
            break;
        }
    }

    if (nameWords.length === 0) {
        return null;
    }

    const name = nameWords.join(" ").replace(/\.+$/, "");

    if (name.length < 2 || name.length > 60) {
        return null;
    }

    return toTitleCase(name);
};


// --------------------------------------------------
// Main extractor
// --------------------------------------------------

const extractCustomerInfo = (
    message,
    conversation = [],
    options = {}
) => {

    const { expectingName = false } = options;

    const text = (message || "").trim();

    const customer = {};

    if (!text) {
        return customer;
    }


    // 1. Phone number (Sri Lankan formats)
    const phoneMatch = text.match(
        /(?:\+94|0094|0)\s*7\d[\s-]?\d{3}[\s-]?\d{4}\b/
    );

    if (phoneMatch) {
        customer.phone = phoneMatch[0].replace(/[\s-]/g, "");
    }


    // 2. Explicit statement: "my name is X", "call me X",
    //    "this is X", "I am X" / "I'm X"
    const explicitMatch = text.match(
        /\b(?:my name is|my name's|name is|call me|this is|i am|i'm|im)\s+([A-Za-z][A-Za-z.'\s-]{0,60})/i
    );

    if (explicitMatch) {

        const name = cleanName(explicitMatch[1]);

        if (name) {
            customer.name = name;
            customer.nameSource = "explicit";
        }
    }


    // 3. Bare reply right after the bot asked for the name
    if (!customer.name && expectingName) {

        // "Kamal", "kamal perera", "Kamal." , "Kamal here"
        const bare = text
            .replace(/\b(here|sir|madam|miss)\b/gi, "")
            .trim();

        const looksLikeName = /^[A-Za-z][A-Za-z.'\s-]{0,60}$/.test(bare)
            && bare.split(/\s+/).length <= MAX_NAME_WORDS;

        if (looksLikeName) {

            const name = cleanName(bare);

            if (name) {
                customer.name = name;
                customer.nameSource = "reply";
            }
        }
    }

    return customer;
};


module.exports = {
    extractCustomerInfo,
    cleanName
};
