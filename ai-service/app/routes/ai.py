from fastapi import APIRouter

from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
)

from app.services.ai import (
    generate_ai_response,
)

from app.schemas.summary import (
    SummaryRequest,
    SummaryResponse,
)

from app.services.summary import (
    summarize_conversation,
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

    reply, source = generate_ai_response(
        message=request.message,
        conversation=[m.model_dump() for m in request.conversation],
        knowledge=request.knowledge,
        context=request.context,
    )

    return {
        "success": True,
        "reply": reply,
        "source": source,
    }



@router.post(
    "/summarize",
    response_model=SummaryResponse,
)
def summarize(request: SummaryRequest):

    summary, source = summarize_conversation(
        messages=[m.model_dump() for m in request.messages],
        context=request.context,
    )

    return {
        "success": True,
        "summary": summary,
        "source": source,
    }
