// --------------------------------------------------
// Customer Information Extractor
// --------------------------------------------------

const extractCustomerInfo = (
    message,
    conversation = []
) => {

    // --------------------------------------------------
    // 1. Prepare current message
    // --------------------------------------------------

    const text =
        (message || "")
            .trim();


    // --------------------------------------------------
    // 2. Result object
    // --------------------------------------------------

    const customer = {};


    // --------------------------------------------------
    // 3. Extract Phone Number
    // --------------------------------------------------

    const phoneMatch =
        text.match(
            /(?:\+94|0094|0)?\s*\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}/
        );


    if (
        phoneMatch
    ) {

        customer.phone =
            phoneMatch[0]
                .replace(
                    /[\s-]/g,
                    ""
                );
    }


    // --------------------------------------------------
    // 4. Extract Name from direct statement
    // --------------------------------------------------

    const nameMatch =
        text.match(
            /(?:my name is|i am|i'm|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i
        );


    if (
        nameMatch
    ) {

        customer.name =
            nameMatch[1]
                .trim();
    }


    // --------------------------------------------------
    // 5. Conversation-based name extraction
    // --------------------------------------------------

    if (
        !customer.name &&
        text
    ) {

        const previousMessage =
            conversation[
                conversation.length - 1
            ];


        if (
            previousMessage &&
            previousMessage.sender_type === "ai" ||
            previousMessage.sender_type === "business"
        ) {

            const previousText =
                (
                    previousMessage.message_text ||
                    ""
                )
                    .toLowerCase()
                    .trim();


            const askedForName =
                previousText.includes(
                    "your name"
                )
                ||
                previousText.includes(
                    "know your name"
                )
                ||
                previousText.includes(
                    "may i know your name"
                )
                ||
                previousText.includes(
                    "what is your name"
                );


            if (
                askedForName
            ) {

                const simpleName =
                    text.match(
                        /^[A-Za-z]+(?:\s+[A-Za-z]+){0,2}$/
                    );


                if (
                    simpleName
                ) {

                    customer.name =
                        simpleName[0]
                            .trim();
                }
            }
        }
    }


    // --------------------------------------------------
    // 6. Return extracted information
    // --------------------------------------------------

    return customer;
};


// --------------------------------------------------
// Export
// --------------------------------------------------

module.exports = {
    extractCustomerInfo
};