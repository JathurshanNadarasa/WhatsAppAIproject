def generate_ai_response(message: str) -> str:

    message_lower = message.lower()

    if "ccna" in message_lower:
        return (
            "Our CCNA course covers networking fundamentals, "
            "routing, switching, and practical networking skills."
        )

    if (
        "hello" in message_lower
        or "hi" in message_lower
    ):
        return (
            "Hello! 👋 Welcome to Nexora Training Institute. "
            "How can I help you today?"
        )

    return (
        "Thanks for your message. "
        "Our team will help you with your enquiry."
    )