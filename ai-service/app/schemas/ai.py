from pydantic import BaseModel


class AIChatRequest(BaseModel):
    message: str


class AIChatResponse(BaseModel):
    success: bool
    reply: str