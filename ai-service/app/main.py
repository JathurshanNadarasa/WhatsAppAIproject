import logging

from fastapi import FastAPI

from app.core.config import settings
from app.routes.ai import router as ai_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


app = FastAPI(
    title="Nexora WhatsApp AI Service",
    version="1.1.0",
)


@app.get("/health")
def health_check():

    return {
        "success": True,
        "message": "AI service is running",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "llm_enabled": settings.llm_enabled,
    }


app.include_router(ai_router)
