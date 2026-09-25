"""
Keyword template replies (pre-C8 logic).
Used as the FALLBACK when the LLM is disabled or fails.
"""


def _sentence(text) -> str:
    """Strip and remove trailing dots, so we can add exactly one."""
    return str(text or "").strip().rstrip(".").strip()


def _has(message: str, words) -> bool:
    return any(word in message for word in words)


def _fee_text(fee):
    try:
        amount = float(fee)
    except (TypeError, ValueError):
        return None
    return f"LKR {amount:,.2f}" if amount > 0 else None


def template_reply(
    message: str,
    knowledge=None,
    business_name: str = "our institute",
    customer_first_name: str | None = None,
) -> str:

    text = (message or "").lower().strip()

    # --------------------------------------------------
    # 1. Course knowledge
    # --------------------------------------------------

    if knowledge:

        name = knowledge.get("name") or "the course"
        description = _sentence(knowledge.get("description"))
        duration = _sentence(knowledge.get("duration"))
        schedule = _sentence(knowledge.get("schedule"))
        requirements = _sentence(knowledge.get("requirements"))
        fee = _fee_text(knowledge.get("fee"))

        team = "Our team will share the latest details with you shortly."

        if _has(text, ["fee", "price", "cost", "payment", "how much"]):
            return (
                f"The {name} course fee is {fee}."
                if fee
                else f"I'll check the {name} course fee for you. {team}"
            )

        if _has(text, ["duration", "how long", "months", "weeks"]):
            return (
                f"The {name} course duration is {duration}."
                if duration
                else f"I'll check the {name} course duration for you. {team}"
            )

        if _has(text, ["schedule", "class", "batch", "when", "time"]):
            return (
                f"The {name} course schedule: {schedule}."
                if schedule
                else f"I'll check the {name} schedule for you. {team}"
            )

        if _has(text, ["requirement", "eligibility", "qualification", "need"]):
            return (
                f"For the {name} course, the requirements are: {requirements}."
                if requirements
                else f"I'll check the {name} requirements for you. {team}"
            )

        parts = []

        if name.lower() in text:
            parts.append("Great choice!")

        if description:
            parts.append(f"Our {name} course covers {description}.")
        else:
            parts.append(f"Our {name} course is available.")

        if duration:
            parts.append(f"The course duration is {duration}.")

        parts.append("Would you like to know the fee, schedule, or requirements?")

        return " ".join(parts)

    # --------------------------------------------------
    # 2. Greeting
    # --------------------------------------------------

    if text in ("hi", "hello", "hey") or text.startswith(("hi ", "hello ", "hey ")):

        greeting = f"Hello {customer_first_name}!" if customer_first_name else "Hello!"

        return (
            f"{greeting} 👋 Welcome to {business_name}. "
            "How can I help you today?"
        )

    # --------------------------------------------------
    # 3. Default
    # --------------------------------------------------

    return (
        "Thanks for your message. "
        "Our team will help you with your enquiry."
    )
