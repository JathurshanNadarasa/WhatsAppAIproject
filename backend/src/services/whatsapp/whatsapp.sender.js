// --------------------------------------------------
// WhatsApp Cloud API client (C14)
// --------------------------------------------------
// sendText / sendTemplate / markAsRead / listTemplates
// Errors are normalised into WhatsAppError with a plain
// message staff can understand, and temporary errors
// (rate limit, Meta 5xx) are retried once.
// --------------------------------------------------

const axios = require("axios");


const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
// WHATSAPP_API_BASE_URL only for tests with a fake Meta server
const BASE_URL = process.env.WHATSAPP_API_BASE_URL || `https://graph.facebook.com/${API_VERSION}`;
const TIMEOUT_MS = Number(process.env.WHATSAPP_TIMEOUT_MS) || 15000;


class WhatsAppError extends Error {
    constructor(message, { code = null, status = null, retryable = false, fatal = false, details = null } = {}) {
        super(message);
        this.name = "WhatsAppError";
        this.code = code;           // Meta error code
        this.status = status;       // HTTP status
        this.retryable = retryable; // try again later
        this.fatal = fatal;         // config problem (token / permissions)
        this.details = details;
    }
}


// Plain-language meaning of the Meta errors we meet most
const KNOWN_ERRORS = {
    190: { text: "The WhatsApp access token has expired or is invalid. Update WHATSAPP_ACCESS_TOKEN.", fatal: true },
    10: { text: "The app doesn't have permission to send WhatsApp messages. Check the token's permissions.", fatal: true },
    200: { text: "The app doesn't have permission to send WhatsApp messages. Check the token's permissions.", fatal: true },
    100: { text: "Meta rejected the request (invalid parameter)." },
    131047: { text: "More than 24 hours since the customer's last message. Use a template." },
    131026: { text: "Message couldn't be delivered. The number may not use WhatsApp." },
    131030: { text: "This number isn't in your test recipients list. Add it in the Meta app (API Setup)." },
    131051: { text: "WhatsApp doesn't support this message type." },
    131056: { text: "Too many messages to this customer too quickly. Try again shortly.", retryable: true },
    130429: { text: "WhatsApp rate limit reached. Try again shortly.", retryable: true },
    132000: { text: "The template's variables don't match. Check the number of parameters." },
    132001: { text: "That template doesn't exist or isn't approved in this language." },
    133010: { text: "This phone number isn't registered with WhatsApp Cloud API yet." }
};


const normaliseError = (error) => {

    const status = error.response?.status || null;
    const meta = error.response?.data?.error;

    if (meta) {
        const known = KNOWN_ERRORS[meta.code] || {};
        return new WhatsAppError(
            known.text || meta.error_data?.details || meta.message || "WhatsApp API error",
            {
                code: meta.code,
                status,
                retryable: Boolean(known.retryable) || status >= 500,
                fatal: Boolean(known.fatal),
                details: meta.error_data?.details || meta.message
            }
        );
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return new WhatsAppError("WhatsApp didn't answer in time.", { retryable: true });
    }

    return new WhatsAppError(error.message || "Couldn't reach WhatsApp.", { retryable: true });
};


const config = (overrides = {}) => {

    const accessToken = overrides.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
        throw new WhatsAppError("WHATSAPP_ACCESS_TOKEN is not set.", { fatal: true });
    }

    return {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        timeout: TIMEOUT_MS
    };
};


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// POST with one retry for temporary errors
const post = async (path, body, overrides) => {

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await axios.post(`${BASE_URL}/${path}`, body, config(overrides));
            return response.data;
        } catch (error) {
            const normalised = error instanceof WhatsAppError ? error : normaliseError(error);
            if (!normalised.retryable || attempt === 2) throw normalised;
            await sleep(1500);
        }
    }
};


// ---------- Public API ----------

const sendText = async ({ phoneNumberId, to, text, accessToken }) => {

    const data = await post(`${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text }
    }, { accessToken });

    return { messageId: data?.messages?.[0]?.id || null, raw: data };
};


// params: ["Kamal", "CCNA"] -> {{1}}, {{2}} in the template body
const sendTemplate = async ({ phoneNumberId, to, name, language = "en", params = [], accessToken }) => {

    const template = { name, language: { code: language } };

    if (params.length > 0) {
        template.components = [{
            type: "body",
            parameters: params.map((value) => ({ type: "text", text: String(value) }))
        }];
    }

    const data = await post(`${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template
    }, { accessToken });

    return { messageId: data?.messages?.[0]?.id || null, raw: data };
};


// Blue ticks for the customer's message (best effort)
const markAsRead = async ({ phoneNumberId, messageId, accessToken }) =>
    post(`${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
    }, { accessToken });


// Approved templates of the WhatsApp Business Account
const listTemplates = async ({ businessAccountId, accessToken }) => {

    try {
        const response = await axios.get(`${BASE_URL}/${businessAccountId}/message_templates`, {
            ...config({ accessToken }),
            params: { limit: 100, fields: "name,language,status,category,components" }
        });
        return response.data?.data || [];
    } catch (error) {
        throw error instanceof WhatsAppError ? error : normaliseError(error);
    }
};


// Old name kept so existing code keeps working
const sendWhatsAppMessage = async ({ phoneNumberId, accessToken, to, message }) => {
    const result = await sendText({ phoneNumberId, accessToken, to, text: message });
    return result.raw;
};


module.exports = {
    WhatsAppError,
    sendText,
    sendTemplate,
    markAsRead,
    listTemplates,
    sendWhatsAppMessage
};
