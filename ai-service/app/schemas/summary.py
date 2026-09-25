from typing import Any, Optional

from pydantic import BaseModel, Field


class SummaryMessage(BaseModel):
    sender_type: str
    message_text: Optional[str] = None
    intent: Optional[str] = None
    entities: Optional[dict[str, Any]] = None


class SummaryRequest(BaseModel):
    messages: list[SummaryMessage] = []

    # { business: {name}, customer: {name}, courses: [names] }
    context: Optional[dict[str, Any]] = None


class ConversationSummary(BaseModel):
    summary: str
    primary_intent: Optional[str] = None
    customer_requirements: list[str] = Field(default_factory=list)
    interested_courses: list[str] = Field(default_factory=list)
    next_action: Optional[str] = None
    interest_level: Optional[str] = None      # high | medium | low
    sentiment: Optional[str] = None           # positive | neutral | negative
    language: Optional[str] = None
    unanswered_questions: list[str] = Field(default_factory=list)


class SummaryResponse(BaseModel):
    success: bool
    summary: ConversationSummary
    source: str = "rule"                      # llm | rule
