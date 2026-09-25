// --------------------------------------------------
// Lead Scoring (C10) - pure functions, no DB
// --------------------------------------------------
// Score 0-100 built from simple, explainable signals so
// staff can see WHY a lead is hot (score_breakdown).
// Tune the numbers here.
// --------------------------------------------------

// Points per intent (counted once each, not per message)
const INTENT_POINTS = {
    COURSE_INQUIRY: 10,
    DURATION_INQUIRY: 5,
    REQUIREMENT_INQUIRY: 5,
    ONLINE_CLASS_INQUIRY: 5,
    SCHEDULE_INQUIRY: 10,
    FEE_INQUIRY: 15,
    PAYMENT_INQUIRY: 20,
    REGISTRATION: 25,
    HUMAN_HANDOVER: 10
};

const POINTS = {
    courseIdentified: 10,
    nameShared: 5,
    engaged3: 5,       // 3+ customer messages
    engaged6: 10,      // 6+ customer messages (replaces engaged3)
    summaryHigh: 15,   // C9 summary says interest high
    summaryMedium: 5,
    inactive7Days: -10,
    inactive30Days: -25
};

const THRESHOLDS = {
    hot: 60,
    warm: 30
};


const temperatureFor = (score) =>
    score >= THRESHOLDS.hot
        ? "hot"
        : score >= THRESHOLDS.warm
            ? "warm"
            : "cold";


/**
 * @param {object} signals
 *   intents: string[]            all intents from customer messages
 *   courseNames: string[]        courses detected
 *   nameShared: boolean
 *   customerMessageCount: number
 *   summaryInterest: 'high'|'medium'|'low'|null
 *   lastActivityAt: Date
 *   now: Date (optional, for tests)
 */
const calculateLeadScore = ({
    intents = [],
    courseNames = [],
    nameShared = false,
    customerMessageCount = 0,
    summaryInterest = null,
    lastActivityAt = new Date(),
    now = new Date()
}) => {

    const breakdown = {};

    for (const intent of new Set(intents)) {
        if (INTENT_POINTS[intent]) {
            breakdown[intent] = INTENT_POINTS[intent];
        }
    }

    if (courseNames.length > 0) {
        breakdown.course_identified = POINTS.courseIdentified;
    }

    if (nameShared) {
        breakdown.name_shared = POINTS.nameShared;
    }

    if (customerMessageCount >= 6) {
        breakdown.engagement = POINTS.engaged6;
    } else if (customerMessageCount >= 3) {
        breakdown.engagement = POINTS.engaged3;
    }

    if (summaryInterest === "high") {
        breakdown.ai_interest = POINTS.summaryHigh;
    } else if (summaryInterest === "medium") {
        breakdown.ai_interest = POINTS.summaryMedium;
    }

    const daysInactive =
        (now.getTime() - new Date(lastActivityAt).getTime()) / 86400000;

    if (daysInactive > 30) {
        breakdown.inactive = POINTS.inactive30Days;
    } else if (daysInactive > 7) {
        breakdown.inactive = POINTS.inactive7Days;
    }

    const raw = Object.values(breakdown).reduce((sum, n) => sum + n, 0);

    const score = Math.max(0, Math.min(100, raw));

    return {
        score,
        temperature: temperatureFor(score),
        breakdown
    };
};


module.exports = {
    INTENT_POINTS,
    POINTS,
    THRESHOLDS,
    temperatureFor,
    calculateLeadScore
};
