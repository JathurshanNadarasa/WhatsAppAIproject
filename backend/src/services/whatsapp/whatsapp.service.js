const pool = require("../../config/database");

const {
    generateAIResponse
} = require("../ai/ai.service");

const {
    getConversationHistory
} = require("./conversation.service");

const {
    STATES,
    getConversationState,
    updateConversationState,
    saveMessageAnalysis
} = require("./conversation-state.service");

const {
    detectCourse
} = require("../knowledge/course-detector.service");

const {
    getCourseById,
    getCourses
} = require("../knowledge/course.service");

const {
    getFAQs
} = require("../knowledge/faq.service");

const {
    detectFAQ
} = require("../knowledge/faq-detector.service");

const {
    detectIntent
} = require("../ai/intent-detector.service");

const {
    extractCustomerInfo
} = require("../ai/customer-info-extractor.service");

const {
    DEFAULT_CUSTOMER_NAME,
    updateCustomerName,
    hasKnownName,
    getFirstName
} = require("../customer/customer.service");


// Intents where "the course we were talking about" applies
const COURSE_FOLLOW_UP_INTENTS = new Set([
    "COURSE_INQUIRY",
    "FEE_INQUIRY",
    "DURATION_INQUIRY",
    "SCHEDULE_INQUIRY",
    "REQUIREMENT_INQUIRY",
    "REGISTRATION",
    "PAYMENT_INQUIRY",
    "ONLINE_CLASS_INQUIRY",
    "GENERAL_INQUIRY"
]);

// C14: reply to voice notes, stickers, photos without text
const NON_TEXT_REPLY =
    "Thanks! I can only read text messages for now. Could you type your question? 😊";

const NAME_QUESTION =
    "By the way, may I know your name? 😊";


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
    messageText,
    // C14: image / audio / document ...
    mediaId = null,
    mediaMimeType = null
}) => {

    // --------------------------------------------------
    // 1. Check Duplicate WhatsApp Message
    // --------------------------------------------------

    const existingMessage = await pool.query(
        `SELECT id
         FROM messages
         WHERE whatsapp_message_id = $1`,
        [messageId]
    );

    if (existingMessage.rows.length > 0) {
        return {
            duplicate: true,
            messageId: existingMessage.rows[0].id
        };
    }


    // --------------------------------------------------
    // 2-3. Find or Create Customer
    // --------------------------------------------------

    const customerResult = await pool.query(
        `SELECT id, name, phone, email, name_confirmed
         FROM customers
         WHERE business_id = $1
         AND phone = $2
         LIMIT 1`,
        [businessId, phone]
    );

    let customer;

    if (customerResult.rows.length > 0) {

        customer = customerResult.rows[0];

    } else {

        const newCustomerResult = await pool.query(
            `INSERT INTO customers (business_id, name, phone)
             VALUES ($1, $2, $3)
             RETURNING id, name, phone, email, name_confirmed`,
            [businessId, DEFAULT_CUSTOMER_NAME, phone]
        );

        customer = newCustomerResult.rows[0];
    }


    // --------------------------------------------------
    // 4-5. Find or Create Open Conversation
    // --------------------------------------------------

    const conversationResult = await pool.query(
        `SELECT id
         FROM conversations
         WHERE business_id = $1
         AND customer_id = $2
         AND status = 'open'
         ORDER BY last_message_at DESC
         LIMIT 1`,
        [businessId, customer.id]
    );

    let conversationId;

    if (conversationResult.rows.length > 0) {

        conversationId = conversationResult.rows[0].id;

    } else {

        const newConversationResult = await pool.query(
            `INSERT INTO conversations (business_id, customer_id, status)
             VALUES ($1, $2, 'open')
             RETURNING id`,
            [businessId, customer.id]
        );

        conversationId = newConversationResult.rows[0].id;
    }


    // --------------------------------------------------
    // 6. Save Customer Message
    // --------------------------------------------------

    const messageResult = await pool.query(
        `INSERT INTO messages
         (conversation_id, sender_type, message_type, message_text,
          whatsapp_message_id, media_id, media_mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, conversation_id, sender_type, message_type,
                   message_text, whatsapp_message_id, created_at`,
        [conversationId, "customer", messageType, messageText, messageId, mediaId, mediaMimeType]
    );

    const savedMessage = messageResult.rows[0];


    // --------------------------------------------------
    // 7. Update Conversation Timestamp
    // --------------------------------------------------

    await pool.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
    );


    // --------------------------------------------------
    // 8. Understand the message + build a reply
    // --------------------------------------------------

    let aiReply = null;
    let intent = null;
    let handover = "bot";

    // C14: voice note / sticker / photo without a caption.
    // The bot can't read it, so ask for text (unless staff are handling it).
    if (!String(messageText || "").trim()) {

        const state = await getConversationState(conversationId);

        return {
            duplicate: false,
            customer,
            conversationId,
            message: savedMessage,
            aiReply: state.handoverStatus === "bot" ? NON_TEXT_REPLY : null,
            intent: null,
            handover: state.handoverStatus
        };
    }

    try {

        const result = await handleConversationTurn({
            businessId,
            customer,
            conversationId,
            savedMessage,
            messageText
        });

        customer = result.customer;
        aiReply = result.aiReply;
        intent = result.intent;
        handover = result.handover || "bot";

    } catch (error) {

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
        message: savedMessage,
        aiReply,
        intent,
        handover
    };
};


// --------------------------------------------------
// Save intent/entities + conversation state (never throws)
// --------------------------------------------------

const persistTurn = async (conversationId, savedMessage, intent, entities, stateUpdate) => {

    stateUpdate.lastIntent = intent;

    try {

        await saveMessageAnalysis(savedMessage.id, intent, entities);
        await updateConversationState(conversationId, stateUpdate);

    } catch (error) {

        // Never lose the reply because bookkeeping failed
        console.error("Saving conversation state failed:", error.message);
    }
};


// --------------------------------------------------
// AI Context (C8)
// --------------------------------------------------
// Everything the LLM is allowed to use to answer:
// business name, customer first name, intent,
// all active courses and FAQs of this business.
// --------------------------------------------------

const buildAIContext = async ({
    businessId,
    customer,
    intent
}) => {

    const [businessResult, courses, faqs] = await Promise.all([
        pool.query(
            `SELECT name FROM businesses WHERE id = $1`,
            [businessId]
        ),
        getCourses(businessId).catch(() => []),
        getFAQs(businessId).catch(() => [])
    ]);

    return {
        business: {
            name: businessResult.rows[0]?.name || null
        },
        customer: {
            first_name: getFirstName(customer)
        },
        intent,
        courses: courses.map(course => ({
            name: course.name,
            description: course.description,
            duration: course.duration,
            fee: course.fee,
            schedule: course.schedule,
            requirements: course.requirements
        })),
        faqs: faqs.map(faq => ({
            question: faq.question,
            answer: faq.answer
        }))
    };
};


// --------------------------------------------------
// Conversation Turn (C7.6)
// --------------------------------------------------
// 1. load conversation state
// 2. extract + save customer name
// 3. detect intent + course (with memory)
// 4. build reply (name thanks / ambiguous / FAQ / AI)
// 5. ask for name once, if still unknown
// 6. persist intent, entities and state
// --------------------------------------------------

const handleConversationTurn = async ({
    businessId,
    customer,
    conversationId,
    savedMessage,
    messageText
}) => {

    // ---------- 1. State + history ----------

    const state = await getConversationState(conversationId);

    // History includes the message we just saved (last item)
    const conversationHistory = await getConversationHistory(
        conversationId,
        10
    );

    const customerOnlyHistory = conversationHistory.filter(
        item => item.sender_type === "customer"
    );

    const expectingName = state.state === STATES.AWAITING_NAME;

    const stateUpdate = {};


    // ---------- 2. Customer name ----------

    const customerInfo = extractCustomerInfo(
        messageText,
        conversationHistory,
        { expectingName }
    );

    let justLearnedName = false;

    const shouldSaveName =
        customerInfo.name &&
        (
            !hasKnownName(customer) ||
            (
                customerInfo.nameSource === "explicit" &&
                customerInfo.name !== customer.name
            )
        );

    if (shouldSaveName) {

        const updated = await updateCustomerName(
            customer.id,
            customerInfo.name
        );

        if (updated) {
            customer = updated;
            justLearnedName = true;
            console.log("Customer name saved:", customer.name);
        }
    }

    // We asked once. Whether they answered or not, don't nag.
    if (expectingName) {
        stateUpdate.state = STATES.ACTIVE;
    }


    // ---------- 3. Intent + course ----------

    let intent = detectIntent(messageText);

    // Course named in THIS message (or ambiguous list)
    let course = await detectCourse(businessId, messageText, []);

    // Course remembered from earlier in this conversation.
    // Used only for follow-ups like "fee?" / "how long?",
    // and only if no FAQ answers the question (step 4).
    let rememberedCourse = null;

    if (!course && state.currentCourseId) {

        rememberedCourse = await getCourseById(
            businessId,
            state.currentCourseId
        );

    } else if (!course) {

        // Nothing saved yet (e.g. conversations from before
        // C7.6): look at older CUSTOMER messages only - bot
        // replies list many course names.
        const fromHistory = await detectCourse(
            businessId,
            "",
            customerOnlyHistory.slice(0, -1)
        );

        if (fromHistory && !fromHistory.ambiguous) {
            rememberedCourse = fromHistory;
        }
    }

    // "Tell me about Java Programming" -> COURSE_INQUIRY
    if (intent === "GENERAL_INQUIRY" && course && !course.ambiguous) {
        intent = "COURSE_INQUIRY";
    }

    const entities = {};

    if (course && !course.ambiguous) {
        entities.course = { id: course.id, name: course.name };
        stateUpdate.currentCourseId = course.id;
    }

    if (customerInfo.name) entities.name = customerInfo.name;
    if (customerInfo.phone) entities.phone = customerInfo.phone;



    // ---------- 3b. Human handover (C12) ----------

    // A human is handling (or about to handle) this chat:
    // keep learning from the message, but the bot stays silent.
    if (state.handoverStatus !== "bot") {

        if (expectingName) stateUpdate.state = STATES.ACTIVE;

        await persistTurn(conversationId, savedMessage, intent, entities, stateUpdate);

        console.log(`Handover (${state.handoverStatus}): bot silent for conversation ${conversationId}`);

        return { customer, aiReply: null, intent, handover: state.handoverStatus };
    }

    // Customer asks for a person -> start handover, fixed reply
    if (intent === "HUMAN_HANDOVER") {

        const { requestHandover, handoverAckMessage } = require("../handover/handover.service");

        await requestHandover({
            businessId,
            conversationId,
            reason: `Customer asked: "${String(messageText || "").slice(0, 200)}"`
        });

        stateUpdate.state = STATES.ACTIVE;

        await persistTurn(conversationId, savedMessage, intent, entities, stateUpdate);

        return {
            customer,
            aiReply: handoverAckMessage(getFirstName(customer)),
            intent,
            handover: "pending"
        };
    }


    // ---------- 4. Reply ----------

    let aiReply = null;
    let isClarification = false;
    let replySource = "rule";

    const isBareNameReply =
        justLearnedName &&
        customerInfo.nameSource === "reply";

    if (isBareNameReply) {

        const firstName = getFirstName(customer);

        const talkingAbout =
            (course && !course.ambiguous && course) || rememberedCourse;

        aiReply = talkingAbout
            ? `Thank you, ${firstName}! 😊 Would you like to know anything else about ${talkingAbout.name}?`
            : `Thank you, ${firstName}! 😊 How can I help you today?`;

    } else if (course && course.ambiguous) {

        const courseNames = course.courses
            .map(item => item.name)
            .join(", ");

        aiReply = `We offer several courses that may match your interest: ${courseNames}. Please tell me which course you are interested in.`;
        isClarification = true;

    } else {

        let knowledge = course || null;

        if (!knowledge) {

            try {

                const faq = await detectFAQ(
                    businessId,
                    messageText,
                    conversationHistory
                );

                if (faq && faq.ambiguous) {

                    const faqQuestions = faq.faqs
                        .map(item => item.question)
                        .join(", ");

                    aiReply = `I found several questions that may match your enquiry: ${faqQuestions}. Please provide a little more detail so I can assist you.`;
                    isClarification = true;

                } else if (faq) {

                    aiReply = faq.answer;
                }

            } catch (error) {

                console.error("FAQ detection failed:", error.message);
            }
        }

        // No FAQ answer -> continue with the remembered course
        if (
            !aiReply &&
            !knowledge &&
            rememberedCourse &&
            COURSE_FOLLOW_UP_INTENTS.has(intent)
        ) {
            knowledge = rememberedCourse;
            stateUpdate.currentCourseId = rememberedCourse.id;
            entities.course = {
                id: rememberedCourse.id,
                name: rememberedCourse.name,
                remembered: true
            };
        }

        if (!aiReply) {

            const aiContext = await buildAIContext({
                businessId,
                customer,
                intent
            });

            const aiResult = await generateAIResponse(
                messageText,
                conversationHistory,
                knowledge,
                aiContext
            );

            aiReply = aiResult.reply;
            replySource = aiResult.source;
        }
    }


    // ---------- 5. Ask for the name (once per conversation) ----------

    const shouldAskName =
        aiReply &&
        !hasKnownName(customer) &&
        !state.context.name_asked &&
        !justLearnedName &&
        !isClarification &&
        intent !== "HUMAN_HANDOVER";

    if (shouldAskName) {

        aiReply = `${aiReply}\n\n${NAME_QUESTION}`;

        stateUpdate.state = STATES.AWAITING_NAME;
        stateUpdate.context = { name_asked: true };
    }


    // ---------- 6. Persist ----------

    console.log("Intent:", intent, "Entities:", entities, "Reply source:", replySource);

    await persistTurn(conversationId, savedMessage, intent, entities, stateUpdate);

    return { customer, aiReply, intent };
};


// --------------------------------------------------
// Save Outgoing WhatsApp Message
// --------------------------------------------------

const saveOutgoingMessage = async ({
    businessId,
    phone,
    messageText,
    whatsappMessageId,
    // C12: "business" = bot/system, "staff" = human agent
    senderType = "business",
    sentByUserId = null
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
                 whatsapp_message_id,
                 sent_by_user_id
             )
             VALUES
             (
                 $1,
                 $2,
                 $3,
                 $4,
                 $5,
                 $6
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
                senderType,
                "text",
                messageText,
                whatsappMessageId,
                sentByUserId
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
