from typing import Any, Optional

from pydantic import BaseModel


class ConversationMessage(BaseModel):
    sender_type: str
    # Optional: image/audio messages have no text
    message_text: Optional[str] = None


class AIChatRequest(BaseModel):
    message: str

    conversation: list[ConversationMessage] = []

    # Course the customer is asking about (single course dict)
    knowledge: Optional[Any] = None

    # C8: business, customer, intent, courses, faqs
    context: Optional[dict[str, Any]] = None


class AIChatResponse(BaseModel):
    success: bool
    reply: str
    # "llm" or "template"
    source: str = "template"
