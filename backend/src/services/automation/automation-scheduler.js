// --------------------------------------------------
// Automation scheduler (C11)
// Every AUTOMATION_TICK_SECONDS (default 60):
//   1. run delayed automations that are due
//   2. fire "customer_inactive" automations
//   3. handover wait notices + auto-release (C12)
// Set AUTOMATION_SCHEDULER=off to disable.
// --------------------------------------------------

const {
    processDueRuns,
    scanInactiveConversations
} = require("./automation-engine");

const {
    processHandoverTimers
} = require("../handover/handover.service");


let timer = null;
let busy = false;


const tick = async () => {

    if (busy) return { skipped: true };

    busy = true;

    try {
        const due = await processDueRuns();
        const inactive = await scanInactiveConversations();
        const handover = await processHandoverTimers();
        if (due || inactive || handover.notices || handover.released) {
            console.log(
                `Automation tick: ${due} due, ${inactive} follow-up(s), ` +
                `${handover.notices} wait notice(s), ${handover.released} auto-released`
            );
        }
        return { due, inactive, handover };
    } catch (error) {
        console.error("Automation tick failed:", error.message);
        return { error: error.message };
    } finally {
        busy = false;
    }
};


const startAutomationScheduler = () => {

    if (process.env.AUTOMATION_SCHEDULER === "off" || timer) {
        return;
    }

    const seconds = Number(process.env.AUTOMATION_TICK_SECONDS) || 60;

    timer = setInterval(tick, seconds * 1000);
    timer.unref?.();

    console.log(`⏱️  Automation scheduler running every ${seconds}s`);
};


module.exports = {
    tick,
    startAutomationScheduler
};
