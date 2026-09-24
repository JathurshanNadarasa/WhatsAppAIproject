// --------------------------------------------------
// Detect Customer Intent
// --------------------------------------------------

const detectIntent = (
    message
) => {

    // --------------------------------------------------
    // 1. Prepare message
    // --------------------------------------------------

    const text =
        (message || "")
            .toLowerCase()
            .trim();


    // --------------------------------------------------
    // 2. Greeting
    // --------------------------------------------------

    if (
        text === "hi" ||
        text === "hello" ||
        text === "hey" ||
        text.startsWith("hi ") ||
        text.startsWith("hello ") ||
        text.startsWith("hey ")
    ) {

        return "GREETING";
    }


    // --------------------------------------------------
    // 3. Human Handover
    // --------------------------------------------------

    if (
        text.includes("talk to someone") ||
        text.includes("talk to a person") ||
        text.includes("human") ||
        text.includes("advisor") ||
        text.includes("agent") ||
        text.includes("staff")
    ) {

        return "HUMAN_HANDOVER";
    }


    // --------------------------------------------------
    // 4. Registration
    // --------------------------------------------------

    if (
        text.includes("register") ||
        text.includes("registration") ||
        text.includes("enroll") ||
        text.includes("enrol") ||
        text.includes("join")
    ) {

        return "REGISTRATION";
    }


    // --------------------------------------------------
    // 5. Fee Inquiry
    // --------------------------------------------------

    if (
        text.includes("fee") ||
        text.includes("price") ||
        text.includes("cost") ||
        text.includes("how much")
    ) {

        return "FEE_INQUIRY";
    }


    // --------------------------------------------------
    // 6. Duration Inquiry
    // --------------------------------------------------

    if (
        text.includes("duration") ||
        text.includes("how long") ||
        text.includes("months") ||
        text.includes("weeks")
    ) {

        return "DURATION_INQUIRY";
    }


    // --------------------------------------------------
    // 7. Schedule Inquiry
    // --------------------------------------------------

    if (
        text.includes("schedule") ||
        text.includes("class time") ||
        text.includes("class timing") ||
        text.includes("batch") ||
        text.includes("when")
    ) {

        return "SCHEDULE_INQUIRY";
    }


    // --------------------------------------------------
    // 8. Requirement Inquiry
    // --------------------------------------------------

    if (
        text.includes("requirement") ||
        text.includes("qualification") ||
        text.includes("eligibility") ||
        text.includes("what do i need")
    ) {

        return "REQUIREMENT_INQUIRY";
    }


    // --------------------------------------------------
    // 9. Location Inquiry
    // --------------------------------------------------

    if (
        text.includes("where are you") ||
        text.includes("location") ||
        text.includes("address")
    ) {

        return "LOCATION_INQUIRY";
    }


    // --------------------------------------------------
    // 10. Online Class Inquiry
    // --------------------------------------------------

    if (
        text.includes("online class") ||
        text.includes("online classes") ||
        text.includes("online course") ||
        text.includes("online")
    ) {

        return "ONLINE_CLASS_INQUIRY";
    }


    // --------------------------------------------------
    // 11. Payment Inquiry
    // --------------------------------------------------

    if (
        text.includes("payment") ||
        text.includes("pay") ||
        text.includes("bank transfer") ||
        text.includes("installment") ||
        text.includes("card")
    ) {

        return "PAYMENT_INQUIRY";
    }


    // --------------------------------------------------
    // 12. Course Inquiry
    // --------------------------------------------------

    if (
        text.includes("course") ||
        text.includes("training") ||
        text.includes("learn") ||
        text.includes("study") ||
        text.includes("interested")
    ) {

        return "COURSE_INQUIRY";
    }


    // --------------------------------------------------
    // 13. General Inquiry
    // --------------------------------------------------

    return "GENERAL_INQUIRY";
};


module.exports = {
    detectIntent
};