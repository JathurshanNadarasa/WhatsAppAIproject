"""
AI reply generation (C8).

1. Try the LLM with a grounded prompt (courses, FAQs, customer).
2. If the LLM is disabled / fails / returns junk -> keyword template.

Returns (reply, source) where source is "llm" or "template".
"""

import logging

from app.core.config import settings
from app.services.llm.client import complete
from app.services.prompt import build_messages, build_system_prompt
from app.services.template import template_reply


logger = logging.getLogger("ai")

MAX_REPLY_CHARS = 1000  # WhatsApp-friendly


def _clean_reply(text: str) -> str | None:

    reply = (text or "").strip().strip('"').strip()

    # Models sometimes add markdown bold; WhatsApp uses *single*
    reply = reply.replace("**", "*")

    if not reply:
        return None

    if len(reply) > MAX_REPLY_CHARS:
        cut = reply[:MAX_REPLY_CHARS]
        reply = cut[: cut.rfind(".") + 1] or cut

    return reply


def generate_ai_response(
    message: str,
    conversation: list | None = None,
    knowledge=None,
    context: dict | None = None,
) -> tuple[str, str]:

    conversation = conversation or []
    context = context or {}

    business_name = (
        (context.get("business") or {}).get("name")
        or settings.DEFAULT_BUSINESS_NAME
    )

    customer_first_name = (context.get("customer") or {}).get("first_name")

    # ---------- 1. LLM ----------

    if settings.llm_enabled:

        system_prompt = build_system_prompt(knowledge, context)
        messages = build_messages(message, conversation)

        reply = _clean_reply(complete(system_prompt, messages))

        if reply:
            logger.info("LLM reply (%s)", settings.LLM_PROVIDER)
            return reply, "llm"

        logger.warning("LLM unavailable, using template fallback")

    # ---------- 2. Template fallback ----------

    reply = template_reply(
        message,
        knowledge=knowledge,
        business_name=business_name,
        customer_first_name=customer_first_name,
    )

    return reply, "template"
