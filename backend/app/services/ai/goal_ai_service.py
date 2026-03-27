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

        system_prompt = (
            "You are an elite goal-setting coach for fitness and wellness. "
            "Return valid JSON only with keys: summary (string), suggestions (array of strings), recommended_goal (object). "
            "recommended_goal keys: title, category, current_value, target_value, target_unit, duration_days, description. "
            "Allowed category values: Fitness, Nutrition, Sleep, Weight."
        )

        user_prompt = (
            f"Vision prompt: {prompt}\n"
            f"User context JSON: {json.dumps(user_context or {}, ensure_ascii=True)}\n"
            "Generate one practical, measurable goal."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=600,
            temperature=0.3,
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
            "title": str(raw.get("title") or fallback["title"]).strip() or fallback["title"],
            "category": category,
            "current_value": round(max(0, self.to_float(raw.get("current_value"), fallback["current_value"])), 2),
            "target_value": round(max(1, self.to_float(raw.get("target_value"), fallback["target_value"])), 2),
            "target_unit": str(raw.get("target_unit") or fallback["target_unit"]).strip() or fallback["target_unit"],
            "duration_days": int(max(7, min(365, self.to_float(raw.get("duration_days"), fallback["duration_days"])))),
            "description": str(raw.get("description") or fallback["description"]).strip() or fallback["description"],
        }


goal_ai_service = GoalAIService()
