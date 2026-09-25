// --------------------------------------------------
// Condition evaluator + message templates (C11)
// Pure functions - no DB.
// --------------------------------------------------

// "lead.score" -> ctx.lead.score
const getPath = (obj, path) =>
    String(path || "")
        .split(".")
        .reduce((value, key) => (value == null ? undefined : value[key]), obj);


const lower = (v) => (typeof v === "string" ? v.toLowerCase() : v);


const OPERATORS = {
    eq: (a, b) => lower(a) === lower(b),
    neq: (a, b) => lower(a) !== lower(b),
    gt: (a, b) => Number(a) > Number(b),
    gte: (a, b) => Number(a) >= Number(b),
    lt: (a, b) => Number(a) < Number(b),
    lte: (a, b) => Number(a) <= Number(b),
    in: (a, b) => Array.isArray(b) && b.map(lower).includes(lower(a)),
    not_in: (a, b) => Array.isArray(b) && !b.map(lower).includes(lower(a)),
    // string contains, or array contains
    contains: (a, b) =>
        Array.isArray(a)
            ? a.map(lower).includes(lower(b))
            : String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase()),
    exists: (a) => a !== undefined && a !== null && a !== ""
};


const VALID_OPERATORS = Object.keys(OPERATORS);


// ALL conditions must pass. Returns { passed, failed: [...] }
const evaluateConditions = (conditions = [], context = {}) => {

    const failed = [];

    for (const condition of conditions) {

        const op = OPERATORS[condition.op];

        if (!op) {
            failed.push({ ...condition, reason: "unknown operator" });
            continue;
        }

        const actual = getPath(context, condition.field);

        if (!op(actual, condition.value)) {
            failed.push({ ...condition, actual });
        }
    }

    return { passed: failed.length === 0, failed };
};


// "Hi {{customer.first_name}}" -> "Hi Kamal"
const renderTemplate = (template, context = {}) =>
    String(template || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
        const value = getPath(context, path);
        if (value == null || value === "") return "";
        return Array.isArray(value) ? value.join(", ") : String(value);
    })
    .replace(/\s{2,}/g, " ")
    .trim();


module.exports = {
    VALID_OPERATORS,
    getPath,
    evaluateConditions,
    renderTemplate
};
