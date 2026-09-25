// --------------------------------------------------
// Automation actions (C11)
// Each handler returns { ok, skipped?, detail }
// --------------------------------------------------

const { renderTemplate } = require("./conditions");

const { createNotification } = require("../notification/notification.service");


const ACTIONS = {

    // params: { title, message, type?, user_id? }
    notify_staff: async (params, ctx, automation) => {

        const notification = await createNotification({
            businessId: ctx.ids.businessId,
            userId: params.user_id || null,
            type: params.type || "automation",
            title: renderTemplate(params.title || automation.name, ctx),
            body: renderTemplate(params.message || "", ctx),
            leadId: ctx.ids.leadId,
            conversationId: ctx.ids.conversationId,
            automationId: automation.id
        });

        return { ok: true, detail: { notificationId: notification.id } };
    },


    // params: { message }
    send_whatsapp_message: async (params, ctx) => {

        // Never talk over a human agent
        if (ctx.conversation?.handover_status && ctx.conversation.handover_status !== "bot") {
            return { ok: false, skipped: true, detail: "Human handover active" };
        }

        if (!ctx.ids.conversationId) {
            return { ok: false, skipped: true, detail: "No conversation" };
        }

        const { sendToCustomer } = require("../whatsapp/outbound.service");

        const result = await sendToCustomer({
            businessId: ctx.ids.businessId,
            conversationId: ctx.ids.conversationId,
            text: renderTemplate(params.message, ctx)
        });

        return result.ok
            ? { ok: true, detail: { sent: result.sent, text: result.message?.message_text } }
            : { ok: false, skipped: true, detail: result.reason };
    },


    // params: { name, language?, params?: ["{{customer.first_name}}", ...] }  (C14)
    // Works outside the 24h window (template must be approved in Meta)
    send_whatsapp_template: async (params, ctx) => {

        if (ctx.conversation?.handover_status && ctx.conversation.handover_status !== "bot") {
            return { ok: false, skipped: true, detail: "Human handover active" };
        }

        if (!ctx.ids.conversationId) {
            return { ok: false, skipped: true, detail: "No conversation" };
        }

        const { sendTemplateToCustomer } = require("../whatsapp/outbound.service");

        const values = (params.params || []).map((p) => renderTemplate(p, ctx));

        const result = await sendTemplateToCustomer({
            businessId: ctx.ids.businessId,
            conversationId: ctx.ids.conversationId,
            name: params.name,
            language: params.language || "en",
            params: values,
            preview: params.preview ? renderTemplate(params.preview, ctx) : null
        });

        return result.ok
            ? { ok: true, detail: { sent: result.sent, template: params.name } }
            : { ok: false, detail: result.reason };
    },


    // params: { reason }   (C12)
    request_handover: async (params, ctx, automation) => {

        if (!ctx.ids.conversationId) {
            return { ok: false, skipped: true, detail: "No conversation" };
        }

        const { requestHandover } = require("../handover/handover.service");

        const conversation = await requestHandover({
            businessId: ctx.ids.businessId,
            conversationId: ctx.ids.conversationId,
            reason: renderTemplate(params.reason || `Automation: ${automation.name}`, ctx)
        });

        return { ok: true, detail: { handover_status: conversation.handover_status } };
    },


    // params: { status }
    update_lead_status: async (params, ctx) => {

        if (!ctx.ids.leadId) {
            return { ok: false, skipped: true, detail: "No lead" };
        }

        const { updateLead } = require("../lead/lead.service");

        await updateLead(ctx.ids.leadId, ctx.ids.businessId, { status: params.status });

        return { ok: true, detail: { status: params.status } };
    },


    // params: { user_id }
    assign_lead: async (params, ctx) => {

        if (!ctx.ids.leadId) {
            return { ok: false, skipped: true, detail: "No lead" };
        }

        const { updateLead } = require("../lead/lead.service");

        await updateLead(ctx.ids.leadId, ctx.ids.businessId, { assignedUserId: params.user_id });

        return { ok: true, detail: { assignedUserId: params.user_id } };
    },


    // params: { note }   (appended to the lead notes)
    add_lead_note: async (params, ctx) => {

        if (!ctx.ids.leadId) {
            return { ok: false, skipped: true, detail: "No lead" };
        }

        const pool = require("../../config/database");
        const { updateLead } = require("../lead/lead.service");

        const current = await pool.query(`SELECT notes FROM leads WHERE id = $1`, [ctx.ids.leadId]);

        const note = renderTemplate(params.note, ctx);
        const existing = current.rows[0]?.notes;

        await updateLead(ctx.ids.leadId, ctx.ids.businessId, {
            notes: existing ? `${existing}\n${note}` : note
        });

        return { ok: true, detail: { note } };
    }
};


const VALID_ACTIONS = Object.keys(ACTIONS);


module.exports = {
    ACTIONS,
    VALID_ACTIONS
};
