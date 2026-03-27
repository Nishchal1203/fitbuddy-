from __future__ import annotations

import json
from typing import Any

from app.services.ai.base_client import CerebrasBaseAIClient


class NutritionAIService(CerebrasBaseAIClient):
    def generate_nutrition_plan(
        self,
        *,
        prompt: str,
        user_context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        fallback = {
            "source": "fallback",
            "summary": "AI service unavailable, generated fallback plan.",
            "suggestions": [
                "Hit protein target early in the day.",
                "Keep hydration steady throughout the day.",
                "Center carbs around training windows.",
            ],
            "recommended_plan": {
                "calorie_target": 2300,
                "protein_g": 175,
                "carbs_g": 240,
                "fat_g": 75,
                "meal_count": 4,
                "diet_type": "high-protein",
                "restrictions": [],
                "meal_breakdown": {
                    "breakfast": [
                        {
                            "name": "Greek yogurt bowl with berries",
                            "kcal": 430,
                            "protein_g": 34,
                            "carbs_g": 48,
                            "fat_g": 11,
                        }
                    ],
                    "lunch": [
                        {
                            "name": "Grilled chicken rice bowl",
                            "kcal": 760,
                            "protein_g": 58,
                            "carbs_g": 86,
                            "fat_g": 20,
                        }
                    ],
                    "dinner": [
                        {
                            "name": "Paneer and quinoa plate",
                            "kcal": 700,
                            "protein_g": 46,
                            "carbs_g": 72,
                            "fat_g": 25,
                        }
                    ],
                },
            },
        }

        system_prompt = (
            "You are an evidence-based sports nutrition coach. "
            "Return valid JSON only with keys: summary (string), suggestions (array of strings), "
            "recommended_plan (object). recommended_plan keys: calorie_target, protein_g, carbs_g, fat_g, "
            "meal_count, diet_type, restrictions, meal_breakdown. "
            "meal_breakdown must include breakfast, lunch, dinner arrays. "
            "Each meal item must include: name, kcal, protein_g, carbs_g, fat_g."
        )

        user_prompt = (
            f"Prompt: {prompt}\n"
            f"User context JSON: {json.dumps(user_context or {}, ensure_ascii=True)}\n"
            "Create a realistic daily nutrition plan."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=1000,
            temperature=0.3,
        )

        if not isinstance(result.get("suggestions"), list):
            result["suggestions"] = fallback["suggestions"]

        recommended_plan = result.get("recommended_plan")
        if not isinstance(recommended_plan, dict):
            result["recommended_plan"] = fallback["recommended_plan"]
        else:
            result["recommended_plan"] = self._normalize_recommended_plan(
                recommended_plan,
                fallback=fallback["recommended_plan"],
            )

        result["summary"] = str(result.get("summary") or fallback["summary"]).strip()
        return result

    def generate_coach_insight(self, *, payload: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "source": "fallback",
            "score": 75,
            "verdict": "Solid day with small adjustments needed.",
            "actions": [
                "Prioritize protein in your next meal.",
                "Increase hydration in small intervals.",
                "Avoid late-night random snacking.",
            ],
        }

        system_prompt = (
            "You are a strict but supportive fitness nutrition coach. "
            "Return valid JSON only with keys: score (0-100 integer), verdict (string), actions (array of strings). "
            "Base feedback on calorie adherence, macro balance, and hydration."
        )

        user_prompt = f"Daily metrics JSON: {json.dumps(payload, ensure_ascii=True)}"

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=500,
            temperature=0.2,
        )

        score = result.get("score")
        if not isinstance(score, int):
            try:
                score = int(score)
            except Exception:
                score = fallback["score"]
        result["score"] = max(0, min(100, score))

        if not isinstance(result.get("actions"), list):
            result["actions"] = fallback["actions"]
        result["verdict"] = str(result.get("verdict") or fallback["verdict"]).strip()
        return result

    def _normalize_recommended_plan(
        self,
        raw: dict[str, Any],
        *,
        fallback: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "calorie_target": int(max(800, min(5000, self.to_float(raw.get("calorie_target"), fallback["calorie_target"])))),
            "protein_g": round(max(20, min(500, self.to_float(raw.get("protein_g"), fallback["protein_g"]))), 1),
            "carbs_g": round(max(20, min(800, self.to_float(raw.get("carbs_g"), fallback["carbs_g"]))), 1),
            "fat_g": round(max(10, min(300, self.to_float(raw.get("fat_g"), fallback["fat_g"]))), 1),
            "meal_count": int(max(3, min(8, self.to_float(raw.get("meal_count"), fallback["meal_count"])))),
            "diet_type": str(raw.get("diet_type") or fallback["diet_type"]).strip() or fallback["diet_type"],
            "restrictions": raw.get("restrictions") if isinstance(raw.get("restrictions"), list) else fallback["restrictions"],
            "meal_breakdown": self._normalize_meal_breakdown(
                raw.get("meal_breakdown"),
                fallback=fallback.get("meal_breakdown") or {},
            ),
        }

    def _normalize_meal_breakdown(
        self,
        raw: Any,
        *,
        fallback: dict[str, Any],
    ) -> dict[str, list[dict[str, Any]]]:
        sections = ("breakfast", "lunch", "dinner")
        source = raw if isinstance(raw, dict) else {}
        normalized: dict[str, list[dict[str, Any]]] = {}

        for section in sections:
            raw_items = source.get(section)
            if not isinstance(raw_items, list) or len(raw_items) == 0:
                raw_items = fallback.get(section)

            if not isinstance(raw_items, list):
                raw_items = []

            items: list[dict[str, Any]] = []
            for item in raw_items[:3]:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name") or item.get("food") or "").strip()
                if not name:
                    continue
                items.append(
                    {
                        "name": name,
                        "kcal": int(max(0, self.to_float(item.get("kcal"), 0))),
                        "protein_g": round(max(0, self.to_float(item.get("protein_g"), item.get("protein") or 0)), 1),
                        "carbs_g": round(max(0, self.to_float(item.get("carbs_g"), item.get("carbs") or 0)), 1),
                        "fat_g": round(max(0, self.to_float(item.get("fat_g"), item.get("fat") or 0)), 1),
                    }
                )

            if items:
                normalized[section] = items
            elif isinstance(fallback.get(section), list):
                normalized[section] = fallback[section]
            else:
                normalized[section] = []

        return normalized


nutrition_ai_service = NutritionAIService()
