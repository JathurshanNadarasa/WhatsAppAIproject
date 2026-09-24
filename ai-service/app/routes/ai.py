from fastapi import APIRouter

from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
)

from app.services.ai import (
    generate_ai_response,
)


router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


@router.post(
    "/chat",
    response_model=AIChatResponse,
)
def chat(request: AIChatRequest):

    reply = generate_ai_response(
        message=request.message,
        conversation=request.conversation,
        knowledge=request.knowledge
    )

    return {
        "success": True,
        "reply": reply,
    }