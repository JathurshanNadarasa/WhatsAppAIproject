const {
    getFAQs
} = require("./faq.service");


// --------------------------------------------------
// Detect FAQ
// --------------------------------------------------

const detectFAQ = async (
    businessId,
    message,
    conversation = []
) => {

    // --------------------------------------------------
    // 1. Get all active FAQs
    // --------------------------------------------------

    const faqs =
        await getFAQs(
            businessId
        );


    // --------------------------------------------------
    // 2. Prepare current message
    // --------------------------------------------------

    const currentMessage =
        message || "";

    const currentText =
        currentMessage
            .toLowerCase()
            .trim();


    // --------------------------------------------------
    // 3. Exact question match
    // --------------------------------------------------

    const exactMatches =
        faqs.filter(
            faq => {

                const question =
                    faq.question
                        .toLowerCase()
                        .trim();

                return (
                    currentText === question
                );
            }
        );


    // --------------------------------------------------
    // 4. If exactly one exact match
    // --------------------------------------------------

    if (
        exactMatches.length === 1
    ) {

        return exactMatches[0];
    }


    // --------------------------------------------------
    // 5. Build searchable text
    // --------------------------------------------------

    const conversationText =
        conversation
            .map(
                item =>
                    item.message_text || ""
            )
            .join(" ");


    const searchText =
        `${currentText} ${conversationText}`
            .toLowerCase()
            .trim();


    // --------------------------------------------------
    // 6. Keyword matching
    // --------------------------------------------------

    const matches =
        faqs.filter(
            faq => {

                const questionWords =
                    faq.question
                        .toLowerCase()
                        .replace(
                            /[?!.,]/g,
                            ""
                        )
                        .split(/\s+/)
                        .filter(
                            word =>
                                word.length >= 4
                        );


                const matchedWords =
                    questionWords.filter(
                        word =>
                            searchText.includes(
                                word
                            )
                    );


                return (
                    matchedWords.length >= 2
                );
            }
        );


    // --------------------------------------------------
    // 7. If exactly one FAQ matches
    // --------------------------------------------------

    if (
        matches.length === 1
    ) {

        return matches[0];
    }


    // --------------------------------------------------
    // 8. Multiple FAQ matches
    // --------------------------------------------------

    if (
        matches.length > 1
    ) {

        return {
            ambiguous: true,
            faqs: matches
        };
    }


    // --------------------------------------------------
    // 9. No FAQ found
    // --------------------------------------------------

    return null;
};


module.exports = {
    detectFAQ
};