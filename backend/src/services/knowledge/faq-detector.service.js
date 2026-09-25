const {
    getFAQs
} = require("./faq.service");


// --------------------------------------------------
// FAQ Detector (C8 rewrite)
// --------------------------------------------------
// - Looks at the CURRENT message only (old version also
//   scanned bot replies -> "your" in "may I know your name"
//   matched "What are your office hours?")
// - Ignores common words (what, your, have, does...)
// - Whole-word matching, scored per FAQ
// - Returns the best FAQ only when the match is strong.
//   Anything weaker goes to the LLM, which receives all
//   FAQs in its prompt anyway.
// --------------------------------------------------

const STOP_WORDS = new Set([
    "a", "an", "the", "is", "are", "am", "was", "were", "be", "been",
    "do", "does", "did", "have", "has", "had", "can", "could", "will",
    "would", "should", "shall", "may", "might", "must",
    "i", "me", "my", "we", "our", "us", "you", "your", "yours",
    "it", "its", "they", "their", "them", "he", "she", "his", "her",
    "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
    "this", "that", "these", "those", "there", "here",
    "and", "or", "but", "if", "so", "to", "of", "in", "on", "at", "for",
    "with", "about", "from", "by", "as", "into", "any", "some", "all",
    "please", "pls", "hi", "hello", "hey", "tell", "know", "want", "need",
    "get", "give", "provide", "there", "much", "many", "also", "just",
    "any", "available", "details", "detail", "info", "information"
]);

// Minimum share of an FAQ's key words that must appear
const MIN_SCORE = 0.6;


const normalize = (text) =>
    (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();


// Very small stemmer: classes -> class, hours -> hour, located -> locat
const stem = (word) =>
    word
        .replace(/(ies)$/, "y")
        .replace(/(es|s)$/, "")
        .replace(/(ed|ing)$/, "")
        .replace(/e$/, "");


const keyWords = (text) => [
    ...new Set(
        normalize(text)
            .split(" ")
            .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
            .map(stem)
    )
];


const detectFAQ = async (
    businessId,
    message,
    // kept for backward compatibility, no longer used
    conversation = []
) => {

    const faqs = await getFAQs(businessId);

    const current = normalize(message);

    if (!current || faqs.length === 0) {
        return null;
    }


    // 1. Exact question match
    const exact = faqs.find(
        faq => normalize(faq.question) === current
    );

    if (exact) {
        return exact;
    }


    // 2. Score each FAQ by key-word overlap
    const messageWords = new Set(keyWords(current));

    if (messageWords.size === 0) {
        return null;
    }

    const scored = faqs
        .map(faq => {

            const questionWords = keyWords(faq.question);

            if (questionWords.length === 0) {
                return { faq, score: 0 };
            }

            const matched = questionWords.filter(
                word => messageWords.has(word)
            );

            return {
                faq,
                score: matched.length / questionWords.length,
                matchedCount: matched.length
            };
        })
        .filter(item => item.score >= MIN_SCORE && item.matchedCount >= 1)
        .sort((a, b) => b.score - a.score);


    if (scored.length === 0) {
        return null;
    }


    // 3. Clear winner
    if (scored.length === 1 || scored[0].score > scored[1].score) {
        return scored[0].faq;
    }


    // 4. Tie between strong matches
    const top = scored.filter(item => item.score === scored[0].score);

    return {
        ambiguous: true,
        faqs: top.map(item => item.faq)
    };
};


module.exports = {
    detectFAQ
};