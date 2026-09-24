
def generate_ai_response(
    message: str,
    conversation: list = [],
    knowledge=None
) -> str:

    message_lower = message.lower()

    # --------------------------------------------------
    # Knowledge Base Context
    # --------------------------------------------------

    if knowledge:

        course_name = knowledge.get(
            "name",
            "the course"
        )

        description = knowledge.get(
            "description"
        )

        duration = knowledge.get(
            "duration"
        )

        fee = knowledge.get(
            "fee"
        )

        schedule = knowledge.get(
            "schedule"
        )

        requirements = knowledge.get(
            "requirements"
        )

        # ----------------------------------------------
        # Duration
        # ----------------------------------------------

        if (
            "duration" in message_lower
            or "how long" in message_lower
        ):
            return (
                f"The {course_name} course duration "
                f"is {duration}."
            )

        # ----------------------------------------------
        # Schedule / Classes / Batches
        # ----------------------------------------------

        if (
            "schedule" in message_lower
            or "class" in message_lower
            or "batch" in message_lower
        ):
            return (
                f"The {course_name} course has "
                f"the following schedule: {schedule}."
            )

        # ----------------------------------------------
        # Requirements / Eligibility
        # ----------------------------------------------

        if (
            "requirement" in message_lower
            or "eligibility" in message_lower
            or "qualification" in message_lower
        ):
            return (
                f"For the {course_name} course, "
                f"the requirements are: {requirements}."
            )

        # ----------------------------------------------
        # Fee / Price / Cost
        # ----------------------------------------------

        if (
            "fee" in message_lower
            or "price" in message_lower
            or "cost" in message_lower
            or "payment" in message_lower
        ):

            if fee and float(fee) > 0:
                return (
                    f"The {course_name} course fee "
                    f"is {fee}."
                )

            return (
                f"I can help you with the {course_name} "
                "course fee. Our team can provide "
                "you with the latest fee details."
            )

        # ----------------------------------------------
        # General Course Question
        # ----------------------------------------------

        if (
            course_name.lower() in message_lower
            or "course" in message_lower
            or "training" in message_lower
        ):

            if description:
                return (
                    f"{course_name} is a course that "
                    f"{description}"
                )

    # --------------------------------------------------
    # Conversation Context
    # --------------------------------------------------

    previous_messages = " ".join(
        item.message_text.lower()
        for item in conversation
    )

    if (
        "ccna" in message_lower
        or "ccna" in previous_messages
    ):

        if (
            "fee" in message_lower
            or "price" in message_lower
            or "cost" in message_lower
            or "payment" in message_lower
        ):
            return (
                "Sure! I can help you with the CCNA "
                "course fee. Our team can provide you "
                "with the latest fee details. Would you "
                "also like to know the course duration "
                "and schedule?"
            )

        return (
            "Our CCNA course covers networking "
            "fundamentals, routing, switching, "
            "and practical networking skills."
        )

    # --------------------------------------------------
    # Greeting
    # --------------------------------------------------

    if (
        "hello" in message_lower
        or "hi" in message_lower
    ):
        return (
            "Hello! 👋 Welcome to Nexora Training "
            "Institute. How can I help you today?"
        )

    # --------------------------------------------------
    # Default Response
    # --------------------------------------------------

    return (
        "Thanks for your message. "
        "Our team will help you with your enquiry."
    )