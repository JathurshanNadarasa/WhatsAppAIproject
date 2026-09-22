const pool = require("../../config/database");

const getBusinessByPhoneNumberId = async (
    phoneNumberId
) => {
    const result = await pool.query(
        `SELECT
            id,
            name,
            whatsapp_phone_number_id,
            whatsapp_business_account_id
         FROM businesses
         WHERE whatsapp_phone_number_id = $1
         LIMIT 1`,
        [phoneNumberId]
    );

    return result.rows[0];
};

const processIncomingMessage = async ({
    businessId,
    phone,
    messageId,
    messageType,
    messageText
}) => {
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

    const customerResult = await pool.query(
        `SELECT id, name, phone, email
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
            `INSERT INTO customers
             (business_id, name, phone)
             VALUES ($1, $2, $3)
             RETURNING id, name, phone, email`,
            [
                businessId,
                "WhatsApp Customer",
                phone
            ]
        );

        customer = newCustomerResult.rows[0];
    }

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
            `INSERT INTO conversations
             (business_id, customer_id, status)
             VALUES ($1, $2, 'open')
             RETURNING id`,
            [
                businessId,
                customer.id
            ]
        );

        conversationId =
            newConversationResult.rows[0].id;
    }

    const messageResult = await pool.query(
        `INSERT INTO messages
         (
             conversation_id,
             sender_type,
             message_type,
             message_text,
             whatsapp_message_id
         )
         VALUES ($1, $2, $3, $4, $5)
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

    await pool.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
    );

    return {
        duplicate: false,
        customer,
        conversationId,
        message: messageResult.rows[0]
    };
};

const saveOutgoingMessage = async ({
    businessId,
    phone,
    messageText,
    whatsappMessageId
}) => {
    // 1. Find customer
    const customerResult = await pool.query(
        `SELECT id, name, phone, email
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
        // 2. Create customer if not found
        const newCustomerResult = await pool.query(
            `INSERT INTO customers
             (business_id, name, phone)
             VALUES ($1, $2, $3)
             RETURNING id, name, phone, email`,
            [
                businessId,
                "WhatsApp Customer",
                phone
            ]
        );

        customer = newCustomerResult.rows[0];
    }

    // 3. Find open conversation
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
        // 4. Create conversation
        const newConversationResult = await pool.query(
            `INSERT INTO conversations
             (business_id, customer_id, status)
             VALUES ($1, $2, 'open')
             RETURNING id`,
            [
                businessId,
                customer.id
            ]
        );

        conversationId =
            newConversationResult.rows[0].id;
    }

    // 5. Save outgoing message
    const messageResult = await pool.query(
        `INSERT INTO messages
         (
             conversation_id,
             sender_type,
             message_type,
             message_text,
             whatsapp_message_id
         )
         VALUES ($1, $2, $3, $4, $5)
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

    // 6. Update conversation timestamp
    await pool.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
    );

    return {
        customer,
        conversationId,
        message: messageResult.rows[0]
    };
};

module.exports = {
    getBusinessByPhoneNumberId,
    processIncomingMessage,
    saveOutgoingMessage
};