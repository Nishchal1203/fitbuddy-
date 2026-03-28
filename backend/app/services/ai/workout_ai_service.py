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
        user_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        fallback = {
            "source": "fallback",
            "title": "AI Workout Plan",
            "summary": "Generated with local fallback because external AI is unavailable.",
            "exercises": [],
        }

        ctx        = user_context or {}
        age        = ctx.get("age", "unknown")
        weight_kg  = ctx.get("weight_kg", "unknown")
        injuries   = ctx.get("injuries", "none")
        equipment  = ctx.get("available_equipment", "full gym")
        days_week  = ctx.get("days_per_week", 4)
        goal       = ctx.get("primary_goal", focus or "general fitness")

        system_prompt = (
            "You are a certified strength and conditioning specialist (CSCS) with expertise in "
            "program design for all fitness levels. You design evidence-based, progressive workout "
            "plans that are safe, effective, and tailored to the individual.\n\n"

            "TASK: Generate a structured workout plan draft as a JSON object.\n\n"

            "RULES YOU MUST FOLLOW:\n"
            "1. Return ONLY valid JSON — no prose, no markdown, no text outside the JSON.\n"
            "2. Return EXACTLY 6 exercises — no more, no less.\n"
            "3. title: 3-6 words, specific to the focus and level "
            "(e.g. 'Beginner Upper Body Strength' not 'Workout Plan').\n"
            "4. summary: exactly 2 sentences, max 30 words total. "
            "Sentence 1: what the plan targets. Sentence 2: key training principle used.\n"
            "5. Exercise selection rules by level:\n"
            "   - beginner: bodyweight + machine exercises, simple movement patterns\n"
            "   - intermediate: barbell + dumbbell compounds, some isolation work\n"
            "   - advanced: complex movements, periodization, accessory work\n"
            "6. Each exercise MUST include all fields: name, category, sets, reps, rest, "
            "duration, notes.\n"
            "7. sets: integer 2-5. reps: string like '8-12' or '15' or 'AMRAP'. "
            "rest: string like '60 sec' or '2 min'. duration: string like '45 min' or 'N/A'.\n"
            "8. notes: max 8 words, specific coaching cue (e.g. 'Drive knees out at bottom').\n"
            "9. Vary categories across the 6 exercises — do not use the same category more than 3 times.\n"
            "10. NEVER include exercises that aggravate stated injuries.\n"
            "11. NEVER include equipment the user doesn't have access to.\n"
            "12. category must be one of: Strength, Cardio, Mobility, Core, HIIT, Flexibility.\n\n"

            "OUTPUT FORMAT:\n"
            "{\n"
            '  "title": "string",\n'
            '  "summary": "string",\n'
            '  "exercises": [\n'
            "    {\n"
            '      "name": "string",\n'
            '      "category": "Strength|Cardio|Mobility|Core|HIIT|Flexibility",\n'
            '      "sets": integer,\n'
            '      "reps": "string",\n'
            '      "rest": "string",\n'
            '      "duration": "string",\n'
            '      "notes": "string"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        user_prompt = (
            f"USER REQUEST: {prompt}\n\n"
            f"TRAINING PROFILE:\n"
            f"- Experience level: {level}\n"
            f"- Primary goal: {goal}\n"
            f"- Plan duration: {duration_days} days\n"
            f"- Training days per week: {days_week}\n"
            f"- Available equipment: {equipment}\n"
            f"- Age: {age}\n"
            f"- Weight: {weight_kg} kg\n"
            f"- Injuries or limitations: {injuries}\n\n"
            "Design 6 exercises that directly serve this user's goal and level. "
            "Prioritize compound movements for efficiency. "
            "Order exercises from most demanding to least (neural fatigue principle). "
            "Make coaching notes specific — give the single most important cue for each exercise."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=700,
            temperature=0.25,
        )

        exercises = result.get("exercises")
        if not isinstance(exercises, list):
            result["exercises"] = []
        else:
            result["exercises"] = self._normalize_exercises(exercises)

        result["title"]   = str(result.get("title")   or fallback["title"]).strip()
        result["summary"] = str(result.get("summary") or fallback["summary"]).strip()
        return result

    def _normalize_exercises(
        self, raw: list[Any]
    ) -> list[dict[str, Any]]:
        normalized = []
        valid_categories = {"Strength", "Cardio", "Mobility", "Core", "HIIT", "Flexibility"}

        for item in raw[:6]:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            if not name:
                continue

            category = str(item.get("category") or "Strength").strip().title()
            if category not in valid_categories:
                category = "Strength"

            sets = item.get("sets")
            try:
                sets = max(1, min(10, int(sets)))
            except Exception:
                sets = 3

            normalized.append({
                "name":     name,
                "category": category,
                "sets":     sets,
                "reps":     str(item.get("reps") or "10").strip(),
                "rest":     str(item.get("rest") or "60 sec").strip(),
                "duration": str(item.get("duration") or "N/A").strip(),
                "notes":    str(item.get("notes") or "").strip(),
            })

        return normalized


workout_ai_service = WorkoutAIService()