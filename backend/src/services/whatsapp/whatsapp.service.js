
const pool = require("../../config/database");

const {
    generateAIResponse,
} = require("../ai/ai.service");

const {
    getConversationHistory
} = require("./conversation.service");

const {
    detectCourse
} = require("../knowledge/course-detector.service");

const {
    detectFAQ
} = require("../knowledge/faq-detector.service");

const {
    extractCustomerInfo
} = require("../ai/customer-info-extractor.service");

const {
    updateCustomerName
} = require("../customer/customer.service");


// --------------------------------------------------
// Get Business by WhatsApp Phone Number ID
// --------------------------------------------------

const getBusinessByPhoneNumberId = async (
    phoneNumberId
) => {

    const result =
        await pool.query(
            `SELECT
                id,
                name,
                whatsapp_phone_number_id,
                whatsapp_business_account_id
             FROM businesses
             WHERE whatsapp_phone_number_id = $1
             LIMIT 1`,
            [
                phoneNumberId
            ]
        );

    return result.rows[0];
};


// --------------------------------------------------
// Process Incoming WhatsApp Message
// --------------------------------------------------

const processIncomingMessage = async ({
    businessId,
    phone,
    messageId,
    messageType,
    messageText
}) => {

    // --------------------------------------------------
    // 1. Check Duplicate WhatsApp Message
    // --------------------------------------------------

    const existingMessage =
        await pool.query(
            `SELECT id
             FROM messages
             WHERE whatsapp_message_id = $1`,
            [
                messageId
            ]
        );


    if (
        existingMessage.rows.length > 0
    ) {

        return {
            duplicate: true,
            messageId:
                existingMessage.rows[0].id
        };
    }


    // --------------------------------------------------
    // 2. Find Existing Customer
    // --------------------------------------------------

    const customerResult =
        await pool.query(
            `SELECT
                id,
                name,
                phone,
                email
             FROM customers
             WHERE business_id = $1
             AND phone = $2
             LIMIT 1`,
            [
                businessId,
                phone
            ]
        );


    let customer;


    // --------------------------------------------------
    // 3. Create Customer if Not Found
    // --------------------------------------------------

    if (
        customerResult.rows.length > 0
    ) {

        customer =
            customerResult.rows[0];

    } else {

        const newCustomerResult =
            await pool.query(
                `INSERT INTO customers
                 (
                     business_id,
                     name,
                     phone
                 )
                 VALUES
                 (
                     $1,
                     $2,
                     $3
                 )
                 RETURNING
                     id,
                     name,
                     phone,
                     email`,
                [
                    businessId,
                    "WhatsApp Customer",
                    phone
                ]
            );

        customer =
            newCustomerResult.rows[0];
    }


    // --------------------------------------------------
    // 4. Find Open Conversation
    // --------------------------------------------------

    const conversationResult =
        await pool.query(
            `SELECT id
             FROM conversations
             WHERE business_id = $1
             AND customer_id = $2
             AND status = 'open'
             ORDER BY last_message_at DESC
             LIMIT 1`,
            [
                businessId,
                customer.id
            ]
        );


    let conversationId;


    // --------------------------------------------------
    // 5. Create Conversation if Not Found
    // --------------------------------------------------

    if (
        conversationResult.rows.length > 0
    ) {

        conversationId =
            conversationResult.rows[0].id;

    } else {

        const newConversationResult =
            await pool.query(
                `INSERT INTO conversations
                 (
                     business_id,
                     customer_id,
                     status
                 )
                 VALUES
                 (
                     $1,
                     $2,
                     'open'
                 )
                 RETURNING id`,
                [
                    businessId,
                    customer.id
                ]
            );

        conversationId =
            newConversationResult.rows[0].id;
    }


    // --------------------------------------------------
    // 6. Save Customer Message
    // --------------------------------------------------

    const messageResult =
        await pool.query(
            `INSERT INTO messages
             (
                 conversation_id,
                 sender_type,
                 message_type,
                 message_text,
                 whatsapp_message_id
             )
             VALUES
             (
                 $1,
                 $2,
                 $3,
                 $4,
                 $5
             )
             RETURNING
                 id,
                 conversation_id,
                 sender_type,
                 message_type,
                 message_text,
                 whatsapp_message_id,
                 created_at`,
            [
                conversationId,
                "customer",
                messageType,
                messageText,
                messageId
            ]
        );


    // --------------------------------------------------
    // 7. Update Conversation Timestamp
    // --------------------------------------------------

    await pool.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
            conversationId
        ]
    );


    // --------------------------------------------------
    // 8. Generate AI Response
    // --------------------------------------------------

    let aiReply = null;


    try {

        // --------------------------------------------------
        // 8.1 Get Conversation History
        // --------------------------------------------------

        const conversationHistory =
            await getConversationHistory(
                conversationId,
                10
            );


        console.log(
            "Conversation History:"
        );

        console.log(
            conversationHistory
        );


        // --------------------------------------------------
        // 8.2 Extract Customer Information
        // --------------------------------------------------

        console.log(
            "C7.5 NAME EXTRACTION STARTED"
        );


        const customerInfo =
            extractCustomerInfo(
                messageText,
                conversationHistory
            );


        console.log(
            "Extracted Customer Info:",
            customerInfo
        );


        // --------------------------------------------------
        // 8.3 Update Customer Name
        // --------------------------------------------------

        if (
            customerInfo.name &&
            customer.name !== customerInfo.name
        ) {

            const updatedCustomer =
                await updateCustomerName(
                    customer.id,
                    customerInfo.name
                );


            if (
                updatedCustomer
            ) {

                customer =
                    updatedCustomer;


                console.log(
                    "Customer name updated:",
                    customer.name
                );
            }
        }


        // --------------------------------------------------
        // 8.4 Detect Course
        // --------------------------------------------------

        let knowledge =
            await detectCourse(
                businessId,
                messageText,
                conversationHistory
            );


        console.log(
            "Detected Course:",
            knowledge
        );


        console.log(
            "Detected Course JSON:",
            JSON.stringify(
                knowledge,
                null,
                2
            )
        );


        // --------------------------------------------------
        // 8.5 Handle Ambiguous Course
        // --------------------------------------------------

        if (
            knowledge &&
            knowledge.ambiguous
        ) {

            const courseNames =
                knowledge.courses
                    .map(
                        course =>
                            course.name
                    )
                    .join(", ");


            console.log(
                "Ambiguous Course:",
                courseNames
            );


            return {
                duplicate: false,
                customer,
                conversationId,
                message:
                    messageResult.rows[0],
                aiReply:
                    `We offer several courses that may match your interest: ${courseNames}. Please tell me which course you are interested in.`
            };
        }


        // --------------------------------------------------
        // 8.6 FAQ Detection
        // --------------------------------------------------

        if (
            !knowledge
        ) {

            try {

                const faq =
                    await detectFAQ(
                        businessId,
                        messageText,
                        conversationHistory
                    );


                console.log(
                    "Detected FAQ:",
                    faq
                );


                // --------------------------------------------------
                // Handle Ambiguous FAQ
                // --------------------------------------------------

                if (
                    faq &&
                    faq.ambiguous
                ) {

                    const faqQuestions =
                        faq.faqs
                            .map(
                                item =>
                                    item.question
                            )
                            .join(", ");


                    console.log(
                        "Ambiguous FAQ:",
                        faqQuestions
                    );


                    return {
                        duplicate: false,
                        customer,
                        conversationId,
                        message:
                            messageResult.rows[0],
                        aiReply:
                            `I found several questions that may match your enquiry: ${faqQuestions}. Please provide a little more detail so I can assist you.`
                    };
                }


                // --------------------------------------------------
                // FAQ Found
                // --------------------------------------------------

                if (
                    faq
                ) {

                    console.log(
                        "FAQ Answer:",
                        faq.answer
                    );


                    aiReply =
                        faq.answer;
                }

            } catch (
                error
            ) {

                console.error(
                    "FAQ detection failed:",
                    error.message
                );
            }
        }


        // --------------------------------------------------
        // 8.7 Generate AI Response
        // --------------------------------------------------

        if (
            !aiReply
        ) {

            const aiResult =
                await generateAIResponse(
                    messageText,
                    conversationHistory,
                    knowledge
                );


            console.log(
                "AI Result:",
                aiResult
            );


            aiReply =
                aiResult.reply;
        }


        console.log(
            "AI Reply:",
            aiReply
        );


    } catch (
        error
    ) {

        console.error(
            "AI response generation failed:",
            error.message
        );
    }


    // --------------------------------------------------
    // 9. Return Incoming Message + AI Response
    // --------------------------------------------------

    return {
        duplicate: false,
        customer,
        conversationId,
        message:
            messageResult.rows[0],
        aiReply
    };
};


// --------------------------------------------------
// Save Outgoing WhatsApp Message
// --------------------------------------------------

const saveOutgoingMessage = async ({
    businessId,
    phone,
    messageText,
    whatsappMessageId
}) => {

    // --------------------------------------------------
    // 1. Find Customer
    // --------------------------------------------------

    const customerResult =
        await pool.query(
            `SELECT
                id,
                name,
                phone,
                email
             FROM customers
             WHERE business_id = $1
             AND phone = $2
             LIMIT 1`,
            [
                businessId,
                phone
            ]
        );


    let customer;


    // --------------------------------------------------
    // 2. Create Customer if Not Found
    // --------------------------------------------------

    if (
        customerResult.rows.length > 0
    ) {

        customer =
            customerResult.rows[0];

    } else {

        const newCustomerResult =
            await pool.query(
                `INSERT INTO customers
                 (
                     business_id,
                     name,
                     phone
                 )
                 VALUES
                 (
                     $1,
                     $2,
                     $3
                 )
                 RETURNING
                     id,
                     name,
                     phone,
                     email`,
                [
                    businessId,
                    "WhatsApp Customer",
                    phone
                ]
            );


        customer =
            newCustomerResult.rows[0];
    }


    // --------------------------------------------------
    // 3. Find Open Conversation
    // --------------------------------------------------

    const conversationResult =
        await pool.query(
            `SELECT id
             FROM conversations
             WHERE business_id = $1
             AND customer_id = $2
             AND status = 'open'
             ORDER BY last_message_at DESC
             LIMIT 1`,
            [
                businessId,
                customer.id
            ]
        );


    let conversationId;


    // --------------------------------------------------
    // 4. Create Conversation if Not Found
    // --------------------------------------------------

    if (
        conversationResult.rows.length > 0
    ) {

        conversationId =
            conversationResult.rows[0].id;

    } else {

        const newConversationResult =
            await pool.query(
                `INSERT INTO conversations
                 (
                     business_id,
                     customer_id,
                     status
                 )
                 VALUES
                 (
                     $1,
                     $2,
                     'open'
                 )
                 RETURNING id`,
                [
                    businessId,
                    customer.id
                ]
            );


        conversationId =
            newConversationResult.rows[0].id;
    }


    // --------------------------------------------------
    // 5. Save Outgoing Message
    // --------------------------------------------------

    const messageResult =
        await pool.query(
            `INSERT INTO messages
             (
                 conversation_id,
                 sender_type,
                 message_type,
                 message_text,
                 whatsapp_message_id
             )
             VALUES
             (
                 $1,
                 $2,
                 $3,
                 $4,
                 $5
             )
             RETURNING
                 id,
                 conversation_id,
                 sender_type,
                 message_type,
                 message_text,
                 whatsapp_message_id,
                 created_at`,
            [
                conversationId,
                "business",
                "text",
                messageText,
                whatsappMessageId
            ]
        );


    // --------------------------------------------------
    // 6. Update Conversation Timestamp
    // --------------------------------------------------

    await pool.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
            conversationId
        ]
    );


    return {
        customer,
        conversationId,
        message:
            messageResult.rows[0]
    };
};


// --------------------------------------------------
// Export
// --------------------------------------------------

module.exports = {
    getBusinessByPhoneNumberId,
    processIncomingMessage,
    saveOutgoingMessage
};
