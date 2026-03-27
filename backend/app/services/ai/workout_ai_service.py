from __future__ import annotations

from typing import Any

from app.services.ai.base_client import CerebrasBaseAIClient


class WorkoutAIService(CerebrasBaseAIClient):
    def generate_workout_plan_draft(
        self,
        *,
        prompt: str,
        level: str,
        duration_days: int,
        focus: str | None,
    ) -> dict[str, Any]:
        fallback = {
            "source": "fallback",
            "title": "AI Workout Plan",
            "summary": "Generated with local fallback because external AI is unavailable.",
            "exercises": [],
        }

        system_prompt = (
            "You are a certified strength and conditioning coach. "
            "Return valid JSON only with keys: title (string), summary (string), exercises (array). "
            "Return exactly 6 exercises only. Keep summary under 25 words. "
            "Each exercise item should include: name, category, sets, reps, rest, duration, notes."
        )

        user_prompt = (
            f"User prompt: {prompt}\n"
            f"Level: {level}\n"
            f"Duration days: {duration_days}\n"
            f"Focus: {focus or 'general fitness'}\n"
            "Generate a concise workout draft. Keep note fields short (max 8 words)."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=500,
            temperature=0.3,
        )

        exercises = result.get("exercises")
        if not isinstance(exercises, list):
            result["exercises"] = []

        result["title"] = str(result.get("title") or fallback["title"]).strip()
        result["summary"] = str(result.get("summary") or fallback["summary"]).strip()
        return result


workout_ai_service = WorkoutAIService()
