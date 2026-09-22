from fastapi import FastAPI

from app.routes.ai import router as ai_router


app = FastAPI(
    title="Nexora WhatsApp AI Service",
    version="1.0.0",
)


@app.get("/health")
def health_check():

    return {
        "success": True,
        "message": "AI service is running",
    }


app.include_router(ai_router)