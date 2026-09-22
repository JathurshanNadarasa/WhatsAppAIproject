const path = require("path");

require("dotenv").config({
    path: path.resolve(
        __dirname,
        "../../../.env"
    )
});

console.log(
    "Phone Number ID:",
    process.env.WHATSAPP_PHONE_NUMBER_ID
);

console.log(
    "Access Token exists:",
    !!process.env.WHATSAPP_ACCESS_TOKEN
);

console.log(
    "Access Token length:",
    process.env.WHATSAPP_ACCESS_TOKEN?.length
);

console.log(
    "Access Token starts with:",
    process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 8)
);

const {
    sendWhatsAppMessage
} = require("./whatsapp.sender");

const test = async () => {
    try {
        const result = await sendWhatsAppMessage({
            phoneNumberId:
                process.env.WHATSAPP_PHONE_NUMBER_ID,

            accessToken:
                process.env.WHATSAPP_ACCESS_TOKEN,

            to: "94755301479",

            message:
                "Hello from Nexora WhatsApp AI 🚀"
        });

        console.log(
            "WhatsApp message sent successfully:"
        );

        console.log(result);
    } catch (error) {
        console.error(
            "WhatsApp send error:"
        );

        console.error(
            error.response?.data ||
            error.message
        );
    }
};

test();