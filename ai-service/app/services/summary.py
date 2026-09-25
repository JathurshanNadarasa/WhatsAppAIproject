"""
Conversation summary (C9).

LLM produces a JSON summary for staff. If the LLM is off or
fails, a rule-based summary is built from the intents and
entities the backend already saved on each message (C7.6).
"""

import json
import logging
import re
from collections import Counter

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.summary import ConversationSummary
from app.services.llm.client import complete


logger = logging.getLogger("summary")

MAX_MESSAGES = 60

INTENTS = [
    "GREETING", "COURSE_INQUIRY", "FEE_INQUIRY", "DURATION_INQUIRY",
    "SCHEDULE_INQUIRY", "REQUIREMENT_INQUIRY", "LOCATION_INQUIRY",
    "ONLINE_CLASS_INQUIRY", "PAYMENT_INQUIRY", "REGISTRATION",
    "HUMAN_HANDOVER", "GENERAL_INQUIRY",
]

LEVELS = {"high", "medium", "low"}
SENTIMENTS = {"positive", "neutral", "negative"}


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def _transcript(messages: list) -> str:

    lines = []

    for m in messages[-MAX_MESSAGES:]:
        text = (m.get("message_text") or "").strip()
        if not text:
            continue
        who = "Customer" if m.get("sender_type") == "customer" else "Business"
        lines.append(f"{who}: {text}")

    return "\n".join(lines)


def _parse_json(text: str) -> dict | None:

    if not text:
        return None

    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


def _normalize(data: dict, known_courses: list[str]) -> ConversationSummary:

    def as_list(value):
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()][:10]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    intent = str(data.get("primary_intent") or "").upper().strip() or None
    if intent not in INTENTS:
        intent = "GENERAL_INQUIRY" if intent else None

    level = str(data.get("interest_level") or "").lower().strip() or None
    if level not in LEVELS:
        level = None

    sentiment = str(data.get("sentiment") or "").lower().strip() or None
    if sentiment not in SENTIMENTS:
        sentiment = None

    # Keep only courses that really exist (LLM must not invent)
    known = {c.lower(): c for c in known_courses}
    courses = [
        known[c.lower()]
        for c in as_list(data.get("interested_courses"))
        if c.lower() in known
    ]

    return ConversationSummary(
        summary=str(data.get("summary") or "").strip() or "No summary available.",
        primary_intent=intent,
        customer_requirements=as_list(data.get("customer_requirements")),
        interested_courses=list(dict.fromkeys(courses)),
        next_action=(str(data.get("next_action") or "").strip() or None),
        interest_level=level,
        sentiment=sentiment,
        language=(str(data.get("language") or "").strip().lower() or None),
        unanswered_questions=as_list(data.get("unanswered_questions")),
    )


# --------------------------------------------------
# LLM summary
# --------------------------------------------------

SYSTEM_PROMPT = """You summarize WhatsApp conversations between a customer and {business} (a training institute) for the institute's staff.

Return ONLY a JSON object with exactly these keys:
{{
  "summary": "2-4 sentences in ENGLISH: who the customer is, what they want, what was answered",
  "primary_intent": one of {intents},
  "customer_requirements": ["short phrases, e.g. 'Prefers weekend batch', 'Asked about installments'"],
  "interested_courses": ["exact course names from the COURSE LIST only"],
  "next_action": "one concrete next step for staff, e.g. 'Call to confirm weekend batch and share discount details'",
  "interest_level": "high | medium | low",
  "sentiment": "positive | neutral | negative",
  "language": "language the customer mainly used, e.g. english, tamil, sinhala, tanglish",
  "unanswered_questions": ["questions the business did NOT answer or promised to check"]
}}

interest_level guide:
- high: asked about fee/schedule/registration/payment, or said they want to join
- medium: asked about a specific course but no buying signal yet
- low: only greeted, general questions, or not interested

Rules: use only facts from the conversation. Write the summary and all phrases in English even if the chat is in Tamil/Sinhala/Tanglish. Do not invent courses, prices or promises.

COURSE LIST: {courses}
Customer name: {customer}"""


def _llm_summary(messages: list, context: dict) -> ConversationSummary | None:

    transcript = _transcript(messages)

    if not transcript:
        return None

    courses = context.get("courses") or []

    system_prompt = SYSTEM_PROMPT.format(
        business=(context.get("business") or {}).get("name") or settings.DEFAULT_BUSINESS_NAME,
        intents=", ".join(INTENTS),
        courses=", ".join(courses) or "(none)",
        customer=(context.get("customer") or {}).get("name") or "unknown",
    )

    raw = complete(
        system_prompt,
        [{"role": "user", "content": f"CONVERSATION:\n{transcript}"}],
        json_mode=True,
    )

    data = _parse_json(raw)

    if not data:
        if raw:
            logger.warning("Summary JSON could not be parsed: %s", raw[:200])
        return None

    try:
        return _normalize(data, courses)
    except ValidationError as error:
        logger.warning("Summary validation failed: %s", error)
        return None


# --------------------------------------------------
# Rule-based fallback
# --------------------------------------------------

BUYING_INTENTS = {"FEE_INQUIRY", "SCHEDULE_INQUIRY", "REGISTRATION", "PAYMENT_INQUIRY"}

INTENT_PRIORITY = [
    "HUMAN_HANDOVER", "REGISTRATION", "PAYMENT_INQUIRY", "FEE_INQUIRY",
    "SCHEDULE_INQUIRY", "REQUIREMENT_INQUIRY", "DURATION_INQUIRY",
    "ONLINE_CLASS_INQUIRY", "COURSE_INQUIRY", "LOCATION_INQUIRY",
]

INTENT_PHRASES = {
    "FEE_INQUIRY": "Asked about fees",
    "DURATION_INQUIRY": "Asked about course duration",
    "SCHEDULE_INQUIRY": "Asked about schedule/batches",
    "REQUIREMENT_INQUIRY": "Asked about entry requirements",
    "LOCATION_INQUIRY": "Asked about location",
    "ONLINE_CLASS_INQUIRY": "Asked about online classes",
    "PAYMENT_INQUIRY": "Asked about payment options",
    "REGISTRATION": "Wants to register",
    "HUMAN_HANDOVER": "Asked to talk to a staff member",
}


def _rule_summary(messages: list, context: dict) -> ConversationSummary:

    customer_msgs = [
        m for m in messages
        if m.get("sender_type") == "customer"
        and (m.get("message_text") or "").strip()
    ]

    intents = [m.get("intent") for m in customer_msgs if m.get("intent")]
    counts = Counter(i for i in intents if i not in ("GREETING", "GENERAL_INQUIRY"))

    courses = []
    for m in customer_msgs:
        course = (m.get("entities") or {}).get("course") or {}
        if course.get("name") and course["name"] not in courses:
            courses.append(course["name"])

    # Strongest buying signal wins, not the most frequent intent
    primary = next(
        (i for i in INTENT_PRIORITY if i in counts),
        intents[-1] if intents else None,
    )

    requirements = [INTENT_PHRASES[i] for i in counts if i in INTENT_PHRASES]

    if "HUMAN_HANDOVER" in counts or "REGISTRATION" in counts or set(counts) & BUYING_INTENTS:
        level = "high"
    elif courses:
        level = "medium"
    else:
        level = "low"

    name = (context.get("customer") or {}).get("name") or "The customer"

    parts = [f"{name} sent {len(customer_msgs)} message(s)."]
    if courses:
        parts.append(f"Interested in: {', '.join(courses)}.")
    if requirements:
        parts.append(" ".join(r + "." for r in requirements))

    if "HUMAN_HANDOVER" in counts:
        next_action = "Contact the customer - they asked for a staff member."
    elif level == "high":
        next_action = f"Follow up to help {name} register" + (f" for {courses[0]}." if courses else ".")
    elif courses:
        next_action = f"Share more details about {courses[0]}."
    else:
        next_action = "No action needed yet."

    return ConversationSummary(
        summary=" ".join(parts),
        primary_intent=primary,
        customer_requirements=requirements,
        interested_courses=courses,
        next_action=next_action,
        interest_level=level,
        sentiment=None,
        language=None,
        unanswered_questions=[],
    )


# --------------------------------------------------
# Public
# --------------------------------------------------

def summarize_conversation(messages: list, context: dict | None = None):

    context = context or {}

    if settings.llm_enabled:
        result = _llm_summary(messages, context)
        if result:
            return result, "llm"
        logger.warning("LLM summary failed, using rule-based summary")

    return _rule_summary(messages, context), "rule"
