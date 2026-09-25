"""
AI service settings (C8).

Read from ai-service/.env

LLM_PROVIDER   gemini | openai | anthropic | none
LLM_API_KEY    API key for that provider
LLM_MODEL      optional, a sensible default is used per provider
"""

import os

from dotenv import load_dotenv

load_dotenv()


DEFAULT_MODELS = {
    "gemini": "gemini-3.8-flash",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5",
}


class Settings:

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "none").strip().lower()

    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip()

    LLM_MODEL: str = (
        os.getenv("LLM_MODEL", "").strip()
        or DEFAULT_MODELS.get(os.getenv("LLM_PROVIDER", "").strip().lower(), "")
    )

    # Comma-separated backup models tried when the main one is
    # overloaded (503/429) or down. Same provider + key.
    LLM_FALLBACK_MODELS: list = [
        m.strip()
        for m in os.getenv("LLM_FALLBACK_MODELS", "").split(",")
        if m.strip()
    ]

    # Retries per model for temporary errors (429/500/503)
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "2"))

    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "15"))

    LLM_MAX_OUTPUT_TOKENS: int = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "2048"))

    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))

    DEFAULT_BUSINESS_NAME: str = os.getenv(
        "DEFAULT_BUSINESS_NAME",
        "our institute",
    )

    @property
    def llm_enabled(self) -> bool:
        return (
            self.LLM_PROVIDER in DEFAULT_MODELS
            and bool(self.LLM_API_KEY)
        )


settings = Settings()