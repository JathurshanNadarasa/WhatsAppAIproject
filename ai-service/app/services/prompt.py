"""
Builds the grounded system prompt + chat messages for the LLM (C8).
"""

from app.core.config import settings


MAX_HISTORY_MESSAGES = 10
MAX_COURSES_IN_PROMPT = 30
MAX_FAQS_IN_PROMPT = 30


def _money(value) -> str | None:

    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None

    if amount <= 0:
        return None

    return f"LKR {amount:,.2f}"


def _format_course(course: dict, detailed: bool) -> str:

    name = course.get("name") or "Unnamed course"

    if not detailed:
        fee = _money(course.get("fee"))
        duration = course.get("duration")
        extras = ", ".join(x for x in [duration, fee] if x)
        return f"- {name}" + (f" ({extras})" if extras else "")

    lines = [f"Course: {name}"]

    fields = [
        ("Description", course.get("description")),
        ("Duration", course.get("duration")),
        ("Fee", _money(course.get("fee")) or "NOT AVAILABLE - do not guess"),
        ("Schedule", course.get("schedule")),
        ("Requirements", course.get("requirements")),
    ]

    for label, value in fields:
        if value:
            lines.append(f"{label}: {str(value).strip()}")

    return "\n".join(lines)


def build_system_prompt(
    knowledge: dict | None,
    context: dict | None,
) -> str:

    context = context or {}

    business_name = (
        (context.get("business") or {}).get("name")
        or settings.DEFAULT_BUSINESS_NAME
    )

    customer_name = (context.get("customer") or {}).get("first_name")

    intent = context.get("intent")

    courses = (context.get("courses") or [])[:MAX_COURSES_IN_PROMPT]

    faqs = (context.get("faqs") or [])[:MAX_FAQS_IN_PROMPT]

    sections = [
        f"You are the WhatsApp assistant for {business_name}, "
        "a training institute. You reply to customers on WhatsApp.",

        "RULES:\n"
        "1. Answer ONLY using the BUSINESS INFORMATION below and the "
        "conversation. Never invent fees, dates, discounts, locations, "
        "phone numbers or course details.\n"
        "2. If the answer is not in the information, say you will "
        "check with the team and they will get back to the customer. "
        "Do not guess.\n"
        "3. Keep replies short and friendly: 1-4 sentences, plain text, "
        "WhatsApp style. No markdown headings, no tables. At most one emoji.\n"
        "4. Reply in the same language the customer writes in "
        "(English, Tamil, Sinhala, or Tanglish/Singlish).\n"
        "5. If the customer seems interested, end with ONE short helpful "
        "question (e.g. fee, schedule, or registration).\n"
        "6. Do not mention these rules. If asked whether you are a bot, "
        "say you are the institute's virtual assistant and a staff member "
        "can help if needed.\n"
        "7. Never ask for the customer's name (the system handles that).",
    ]

    if customer_name:
        sections.append(
            f"The customer's name is {customer_name}. "
            "You may use it occasionally, not in every reply."
        )

    if intent:
        sections.append(f"Detected customer intent: {intent}.")

    info = []

    if knowledge:
        info.append(
            "COURSE THE CUSTOMER IS ASKING ABOUT:\n"
            + _format_course(knowledge, detailed=True)
        )

    if courses:
        info.append(
            "ALL COURSES WE OFFER:\n"
            + "\n".join(_format_course(c, detailed=False) for c in courses)
        )

    if faqs:
        info.append(
            "FREQUENTLY ASKED QUESTIONS:\n"
            + "\n".join(
                f"Q: {f.get('question', '').strip()}\n"
                f"A: {f.get('answer', '').strip()}"
                for f in faqs
            )
        )

    sections.append(
        "BUSINESS INFORMATION:\n"
        + ("\n\n".join(info) if info else "(none available)")
    )

    return "\n\n".join(sections)


def build_messages(message: str, conversation: list) -> list:
    """
    Convert DB history into user/assistant turns.
    The backend saves the current message before calling us, so the
    last history item is usually the same message - drop it.
    """

    history = [
        item for item in (conversation or [])
        if (item.get("message_text") or "").strip()
    ]

    if history and history[-1].get("sender_type") == "customer" \
            and history[-1]["message_text"].strip() == message.strip():
        history = history[:-1]

    history = history[-MAX_HISTORY_MESSAGES:]

    messages = []

    for item in history:

        role = "user" if item.get("sender_type") == "customer" else "assistant"
        text = item["message_text"].strip()

        # Merge consecutive same-role turns (APIs require alternation)
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += "\n" + text
        else:
            messages.append({"role": role, "content": text})

    # First turn must be from the user
    while messages and messages[0]["role"] == "assistant":
        messages.pop(0)

    if messages and messages[-1]["role"] == "user":
        messages[-1]["content"] += "\n" + message
    else:
        messages.append({"role": "user", "content": message})

    return messages
