"""
Provider-agnostic LLM client (C8).

complete(system_prompt, messages) -> str | None

messages: [{"role": "user" | "assistant", "content": "..."}]
Returns None on any failure so the caller can fall back.
"""

import logging
import time

import httpx

from app.core.config import settings


logger = logging.getLogger("llm")


class TruncatedReply(Exception):
    """Model hit the output token limit mid-reply."""


def _handle_truncation(text: str, json_mode: bool, reason: str) -> str:
    """
    Output limit reached. For chat replies keep only complete
    sentences; if nothing usable is left (or it's JSON), fail so the
    next model / template is used instead of sending half a sentence.
    """

    logger.warning("LLM reply truncated (%s)", reason)

    if not json_mode:
        cut = max(text.rfind(ch) for ch in (".", "!", "?", "\n"))
        trimmed = text[: cut + 1].strip() if cut > 0 else ""
        if len(trimmed) >= 20:
            return trimmed

    raise TruncatedReply(f"Reply cut off by token limit ({reason})")


def _gemini(system_prompt: str, messages: list, model_name: str, json_mode: bool = False) -> str:

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_name}:generateContent"
    )

    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]

    generation_config = {
        "temperature": settings.LLM_TEMPERATURE,
        "maxOutputTokens": settings.LLM_MAX_OUTPUT_TOKENS,
    }

    # Thinking tokens count against maxOutputTokens and can leave
    # NO text for the reply. Short WhatsApp replies need little
    # thinking, so keep it as low as each model family allows.
    model = model_name.lower()

    if model.startswith("gemini-3"):
        # Gemini 3.x: thinkingLevel (low/medium/high)
        # Never send thinkingBudget together with it (400 error)
        generation_config["thinkingConfig"] = {"thinkingLevel": "low"}

    elif model.startswith("gemini-2.5") and "flash" in model:
        # Gemini 2.5 Flash: legacy thinkingBudget
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}

    if json_mode:
        generation_config["responseMimeType"] = "application/json"

    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": generation_config,
    }

    response = httpx.post(
        url,
        headers={"x-goog-api-key": settings.LLM_API_KEY},
        json=body,
        timeout=settings.LLM_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    data = response.json()

    candidates = data.get("candidates") or []

    if not candidates:
        # Usually a safety block on the prompt
        raise ValueError(
            f"Gemini returned no candidates: {data.get('promptFeedback')}"
        )

    candidate = candidates[0]
    parts = (candidate.get("content") or {}).get("parts") or []
    text = "".join(
        part.get("text", "")
        for part in parts
        if not part.get("thought")
    )

    finish = candidate.get("finishReason")

    if not text.strip():
        raise ValueError(f"Gemini returned empty text (finishReason={finish})")

    if finish == "MAX_TOKENS":
        return _handle_truncation(text, json_mode, "gemini MAX_TOKENS")

    return text


def _openai(system_prompt: str, messages: list, model_name: str, json_mode: bool = False) -> str:

    body = {
        "model": model_name,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
    }

    if json_mode:
        body["response_format"] = {"type": "json_object"}

    response = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
        json=body,
        timeout=settings.LLM_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    choice = response.json()["choices"][0]
    text = choice["message"]["content"] or ""

    if choice.get("finish_reason") == "length":
        return _handle_truncation(text, json_mode, "openai length")

    return text


def _anthropic(system_prompt: str, messages: list, model_name: str, json_mode: bool = False) -> str:

    body = {
        "model": model_name,
        "system": system_prompt,
        "messages": messages,
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
    }

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": settings.LLM_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        json=body,
        timeout=settings.LLM_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    data = response.json()

    text = "".join(
        block.get("text", "")
        for block in data["content"]
        if block.get("type") == "text"
    )

    if data.get("stop_reason") == "max_tokens":
        return _handle_truncation(text, json_mode, "anthropic max_tokens")

    return text


PROVIDERS = {
    "gemini": _gemini,
    "openai": _openai,
    "anthropic": _anthropic,
}


# Temporary errors worth retrying
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

RETRY_DELAYS_SECONDS = [1, 3, 6]


def _try_model(system_prompt: str, messages: list, model_name: str, json_mode: bool = False) -> str | None:

    provider = PROVIDERS[settings.LLM_PROVIDER]

    for attempt in range(settings.LLM_MAX_RETRIES + 1):

        try:

            text = (provider(system_prompt, messages, model_name, json_mode) or "").strip()

            if text:
                return text

            return None

        except httpx.HTTPStatusError as error:

            status = error.response.status_code

            logger.error(
                "LLM HTTP %s (%s, attempt %s): %s",
                status,
                model_name,
                attempt + 1,
                error.response.text[:300],
            )

            if status not in RETRYABLE_STATUS:
                # 400/401/403/404: retrying won't help
                return None

            if attempt < settings.LLM_MAX_RETRIES:
                delay = RETRY_DELAYS_SECONDS[min(attempt, len(RETRY_DELAYS_SECONDS) - 1)]
                logger.info("Retrying %s in %ss", model_name, delay)
                time.sleep(delay)

        except httpx.TimeoutException:

            # A slow model: move to the backup instead of waiting again
            logger.error("LLM timeout (%s)", model_name)
            return None

        except Exception as error:  # bad JSON, network...

            logger.error("LLM call failed (%s): %s", model_name, error)
            return None

    return None


def complete(system_prompt: str, messages: list, json_mode: bool = False) -> str | None:
    """
    Main model first (with retries), then each fallback model.
    Returns None if all fail -> caller uses template reply.
    """

    if not settings.llm_enabled:
        return None

    models = [settings.LLM_MODEL] + [
        m for m in settings.LLM_FALLBACK_MODELS
        if m != settings.LLM_MODEL
    ]

    for model_name in models:

        text = _try_model(system_prompt, messages, model_name, json_mode)

        if text:
            if model_name != settings.LLM_MODEL:
                logger.warning("Answered by fallback model %s", model_name)
            return text

    return None