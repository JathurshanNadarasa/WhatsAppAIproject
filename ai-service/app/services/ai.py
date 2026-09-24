def generate_ai_response(
    message: str,
    conversation: list = [],
    knowledge=None
) -> str:

    message_lower = message.lower().strip()

    # --------------------------------------------------
    # 1. Knowledge Base Response
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


 # --------------------------------------------------
        # Course Selection / Confirmation
        # --------------------------------------------------

        if (
            course_name.lower() in message_lower
        ):

            return (
                f"Great choice! "
                f"Our {course_name} course covers "
                f"{description}. "
                f"The course duration is {duration}."
            )
        # --------------------------------------------------
        # Fee Intent
        # --------------------------------------------------

        if (
            "fee" in message_lower
            or "price" in message_lower
            or "cost" in message_lower
            or "payment" in message_lower
            or "how much" in message_lower
        ):

            if fee and float(fee) > 0:
                return (
                    f"The {course_name} course fee "
                    f"is LKR {fee}."
                )

            return (
                f"I can help you with the {course_name} "
                "course fee. Our team can provide "
                "you with the latest fee details."
            )

        # --------------------------------------------------
        # Duration Intent
        # --------------------------------------------------

        if (
            "duration" in message_lower
            or "how long" in message_lower
            or "months" in message_lower
            or "weeks" in message_lower
        ):

            return (
                f"The {course_name} course duration "
                f"is {duration}."
            )

        # --------------------------------------------------
        # Schedule Intent
        # --------------------------------------------------

        if (
            "schedule" in message_lower
            or "class" in message_lower
            or "classes" in message_lower
            or "batch" in message_lower
            or "batches" in message_lower
            or "when" in message_lower
        ):

            return (
                f"The {course_name} course has "
                f"the following schedule: {schedule}."
            )

        # --------------------------------------------------
        # Requirements Intent
        # --------------------------------------------------

        if (
            "requirement" in message_lower
            or "requirements" in message_lower
            or "eligibility" in message_lower
            or "qualification" in message_lower
            or "need" in message_lower
        ):

            return (
                f"For the {course_name} course, "
                f"the requirements are: {requirements}."
            )

        # --------------------------------------------------
        # General Course Interest
        # --------------------------------------------------

        if (
            "learn" in message_lower
            or "study" in message_lower
            or "interested" in message_lower
            or "want to join" in message_lower
            or "join" in message_lower
            or "course" in message_lower
            or "training" in message_lower
        ):

            if description:
                return (
                        f"Our {course_name} course covers "
                        f"{description}."
                    )

            return (
                f"Our {course_name} course is available. "
                "Would you like to know the fee, "
                "duration, or schedule?"
            )

    
    # --------------------------------------------------
    # 2. Greeting
    # --------------------------------------------------

    if (
        message_lower == "hi"
        or message_lower == "hello"
        or message_lower.startswith("hi ")
        or message_lower.startswith("hello ")
    ):

        return (
            "Hello! 👋 Welcome to Nexora Training "
            "Institute. How can I help you today?"
        )

    # --------------------------------------------------
    # 3. Default Response
    # --------------------------------------------------

    return (
        "Thanks for your message. "
        "Our team will help you with your enquiry."
    )