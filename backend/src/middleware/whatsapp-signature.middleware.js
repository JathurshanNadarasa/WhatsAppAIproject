// --------------------------------------------------
// Verify that a webhook really comes from Meta (C14)
// Meta signs the raw body with your App Secret:
//   X-Hub-Signature-256: sha256=<hmac>
// Set WHATSAPP_APP_SECRET to turn this on.
// --------------------------------------------------

const crypto = require("crypto");


const verifyWhatsAppSignature = (req, res, next) => {

    const secret = process.env.WHATSAPP_APP_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            console.error("WHATSAPP_APP_SECRET is not set - rejecting webhook in production");
            return res.sendStatus(401);
        }
        return next();               // development: allow Postman tests
    }

    const header = req.get("x-hub-signature-256") || "";
    const received = header.startsWith("sha256=") ? header.slice(7) : "";

    const expected = crypto
        .createHmac("sha256", secret)
        .update(req.rawBody || Buffer.from(""))
        .digest("hex");

    const a = Buffer.from(received, "hex");
    const b = Buffer.from(expected, "hex");

    const valid = a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);

    if (!valid) {
        console.warn("Rejected WhatsApp webhook: invalid signature");
        return res.sendStatus(401);
    }

    next();
};


module.exports = verifyWhatsAppSignature;
