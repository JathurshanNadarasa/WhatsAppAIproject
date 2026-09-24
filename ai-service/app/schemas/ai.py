from pydantic import BaseModel
from typing import Optional, Any


class ConversationMessage(BaseModel):
    sender_type: str
    message_text: str


class AIChatRequest(BaseModel):
    message: str

    conversation: list[ConversationMessage] = []

    knowledge: Optional[Any] = None


class AIChatResponse(BaseModel):
    success: bool
    reply: str