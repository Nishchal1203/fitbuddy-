from __future__ import annotations

import json
from typing import Any

from app.services.ai.base_client import CerebrasBaseAIClient


class GoalAIService(CerebrasBaseAIClient):
    def generate_goal_draft(
        self,
        *,
        prompt: str,
        user_context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        fallback = {
            "source": "fallback",
            "summary": "Goal draft generated from your vision.",
            "suggestions": [
                "Set a realistic weekly milestone.",
                "Track progress on a fixed day every week.",
                "Keep one measurable primary KPI.",
            ],
            "recommended_goal": {
                "title": "AI Vision Goal",
                "category": "Fitness",
                "current_value": 0,
                "target_value": 100,
                "target_unit": "points",
                "duration_days": 45,
                "description": "A clear measurable goal generated from your vision.",
            },
        }

        ctx = user_context or {}
        age            = ctx.get("age", "unknown")
        weight_kg      = ctx.get("weight_kg", "unknown")
        height_cm      = ctx.get("height_cm", "unknown")
        experience     = ctx.get("experience_level", "intermediate")
        current_goals  = ctx.get("current_goals", [])
        injuries       = ctx.get("injuries", "none")

        system_prompt = (
            "You are an elite personal trainer and goal-setting coach with 15+ years of experience "
            "designing SMART goals for athletes and everyday fitness enthusiasts. "
            "Your job is to transform a user's vague fitness vision into one specific, measurable, "
            "attainable, relevant, and time-bound (SMART) goal.\n\n"

            "RULES YOU MUST FOLLOW:\n"
            "1. Return ONLY valid JSON — no prose, no markdown, no explanations outside the JSON.\n"
            "2. The summary must be 2 sentences: first sentence validates the user's vision warmly, "
            "second sentence states exactly what the goal will achieve and by when.\n"
            "3. suggestions must be exactly 4 strings. Each must be a concrete, actionable step "
            "(not generic advice). Include specific numbers where possible (e.g. '3 sets of 10 squats', "
            "'drink 500ml water before each meal'). Max 18 words per suggestion.\n"
            "4. recommended_goal.title must be 2-5 words, specific and motivating.\n"
            "5. recommended_goal.duration_days must be realistic: weight loss goals 60-120 days, "
            "strength goals 45-90 days, endurance goals 60-180 days.\n"
            "6. Set target_value based on evidence-based rates: safe weight loss = 0.5kg/week, "
            "muscle gain = 0.25kg/week, running improvement = 10% per week.\n"
            "7. If user has injuries mentioned, reflect that in suggestions — avoid exercises that "
            "aggravate the injury.\n"
            "8. category must be exactly one of: Fitness, Nutrition, Sleep, Weight.\n\n"

            "OUTPUT FORMAT:\n"
            "{\n"
            '  "summary": "string",\n'
            '  "suggestions": ["string", "string", "string", "string"],\n'
            '  "recommended_goal": {\n'
            '    "title": "string",\n'
            '    "category": "Fitness|Nutrition|Sleep|Weight",\n'
            '    "current_value": number,\n'
            '    "target_value": number,\n'
            '    "target_unit": "string",\n'
            '    "duration_days": integer,\n'
            '    "description": "string (1 sentence, max 20 words)"\n'
            "  }\n"
            "}"
        )

        user_prompt = (
            f"USER VISION: {prompt}\n\n"
            f"USER PROFILE:\n"
            f"- Age: {age}\n"
            f"- Weight: {weight_kg} kg\n"
            f"- Height: {height_cm} cm\n"
            f"- Experience level: {experience}\n"
            f"- Current active goals: {', '.join(current_goals) if current_goals else 'none'}\n"
            f"- Injuries or limitations: {injuries}\n\n"
            "Based on the user's vision and profile above, generate ONE specific, measurable, "
            "realistic goal. Make the suggestions directly actionable — not generic platitudes. "
            "The goal should complement (not duplicate) their existing goals if any."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=700,
            temperature=0.25,
        )

        if not isinstance(result.get("suggestions"), list):
            result["suggestions"] = fallback["suggestions"]

        goal = result.get("recommended_goal")
        if not isinstance(goal, dict):
            result["recommended_goal"] = fallback["recommended_goal"]
        else:
            result["recommended_goal"] = self._normalize_recommended_goal(
                goal,
                fallback=fallback["recommended_goal"],
            )

        result["summary"] = str(result.get("summary") or fallback["summary"]).strip()
        return result

    def _normalize_recommended_goal(
        self,
        raw: dict[str, Any],
        *,
        fallback: dict[str, Any],
    ) -> dict[str, Any]:
        category = str(raw.get("category") or fallback["category"]).strip().title()
        if category not in {"Fitness", "Nutrition", "Sleep", "Weight"}:
            category = fallback["category"]

        return {
            "title":         str(raw.get("title") or fallback["title"]).strip() or fallback["title"],
            "category":      category,
            "current_value": round(max(0, self.to_float(raw.get("current_value"), fallback["current_value"])), 2),
            "target_value":  round(max(1, self.to_float(raw.get("target_value"),  fallback["target_value"])),  2),
            "target_unit":   str(raw.get("target_unit") or fallback["target_unit"]).strip() or fallback["target_unit"],
            "duration_days": int(max(7, min(365, self.to_float(raw.get("duration_days"), fallback["duration_days"])))),
            "description":   str(raw.get("description") or fallback["description"]).strip() or fallback["description"],
        }


goal_ai_service = GoalAIService()