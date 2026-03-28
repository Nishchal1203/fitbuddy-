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

        ctx            = user_context or {}
        age            = ctx.get("age", "unknown")
        weight_kg      = ctx.get("weight_kg", "unknown")
        height_cm      = ctx.get("height_cm", "unknown")
        activity_level = ctx.get("activity_level", "moderately active")
        goal           = ctx.get("primary_goal", "general health")
        allergies      = ctx.get("allergies", "none")
        cuisine_pref   = ctx.get("cuisine_preference", "no preference")
        meals_per_day  = ctx.get("meals_per_day", 4)

        system_prompt = (
            "You are a registered sports dietitian and evidence-based nutrition coach with expertise in "
            "body composition, athletic performance, and clinical nutrition.\n\n"

            "TASK: Design a complete, realistic single-day nutrition plan tailored to the user's "
            "profile, preferences, and goals.\n\n"

            "RULES YOU MUST FOLLOW:\n"
            "1. Return ONLY valid JSON — no prose, no markdown, no text outside JSON.\n"
            "2. Calculate calorie target using Mifflin-St Jeor BMR × activity multiplier:\n"
            "   - Sedentary: ×1.2 | Lightly active: ×1.375 | Moderately active: ×1.55 "
            "| Very active: ×1.725\n"
            "   - For fat loss: subtract 300-500 kcal. For muscle gain: add 200-300 kcal.\n"
            "3. Protein target: 1.6-2.2g per kg bodyweight for active users, 0.8g/kg for sedentary.\n"
            "4. Fat: 25-35% of total calories. Carbs: fill the remainder.\n"
            "5. summary: 2 sentences. First: acknowledge their goal and dietary preference. "
            "Second: state the calorie target and primary macro focus.\n"
            "6. suggestions: exactly 4 strings. Be specific — include meal timing, food choices, "
            "and portion guidance. Reference the user's actual goal and restrictions. Max 20 words each.\n"
            "7. meal_breakdown: each meal must have 1-3 items. Each item must have realistic "
            "macros that sum up close to the daily targets.\n"
            "8. meal names must be specific (e.g. 'Oats with banana and whey protein' not 'breakfast bowl').\n"
            "9. Respect all allergies and restrictions strictly — never include forbidden foods.\n"
            "10. diet_type must be one of: balanced, keto, vegan, vegetarian, high-protein, "
            "low-carb, mediterranean, paleo.\n\n"

            "OUTPUT FORMAT:\n"
            "{\n"
            '  "summary": "string",\n'
            '  "suggestions": ["string", "string", "string", "string"],\n'
            '  "recommended_plan": {\n'
            '    "calorie_target": integer,\n'
            '    "protein_g": number,\n'
            '    "carbs_g": number,\n'
            '    "fat_g": number,\n'
            '    "meal_count": integer,\n'
            '    "diet_type": "string",\n'
            '    "restrictions": ["string"],\n'
            '    "meal_breakdown": {\n'
            '      "breakfast": [{"name": "string", "kcal": integer, "protein_g": number, "carbs_g": number, "fat_g": number}],\n'
            '      "lunch":     [{"name": "string", "kcal": integer, "protein_g": number, "carbs_g": number, "fat_g": number}],\n'
            '      "dinner":    [{"name": "string", "kcal": integer, "protein_g": number, "carbs_g": number, "fat_g": number}]\n'
            "    }\n"
            "  }\n"
            "}"
        )

        user_prompt = (
            f"USER REQUEST: {prompt}\n\n"
            f"USER PROFILE:\n"
            f"- Age: {age}\n"
            f"- Weight: {weight_kg} kg\n"
            f"- Height: {height_cm} cm\n"
            f"- Activity level: {activity_level}\n"
            f"- Primary fitness goal: {goal}\n"
            f"- Meals per day preference: {meals_per_day}\n"
            f"- Food allergies/intolerances: {allergies}\n"
            f"- Cuisine preference: {cuisine_pref}\n\n"
            "Design a practical, enjoyable daily meal plan that fits the user's lifestyle. "
            "Meals should be easy to prepare (under 30 mins each). "
            "Macro totals across all meals must be within 5% of the daily targets."
        )

        result = self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback=fallback,
            max_tokens=1200,
            temperature=0.25,
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

        calorie_goal    = payload.get("calorie_goal", 2000)
        calories_eaten  = payload.get("calories_consumed", 0)
        protein_goal    = payload.get("protein_goal_g", 150)
        protein_eaten   = payload.get("protein_consumed_g", 0)
        water_cups      = payload.get("water_cups", 0)
        water_goal      = payload.get("water_goal_cups", 8)
        meals_logged    = payload.get("meals_logged", 0)
        workout_done    = payload.get("workout_completed", False)

        system_prompt = (
            "You are a tough-love but caring fitness nutrition coach reviewing a user's daily food log. "
            "Your feedback must be honest, specific, and actionable — not generic encouragement.\n\n"

            "SCORING RUBRIC (0-100):\n"
            "- Calorie adherence (within ±10% of goal): +30 points\n"
            "- Protein target hit (≥90% of goal): +25 points\n"
            "- Hydration goal met (≥80% of cup target): +20 points\n"
            "- Meals logged consistently (3+ meals): +15 points\n"
            "- Workout completed: +10 points\n"
            "Deduct points proportionally for shortfalls.\n\n"

            "RULES:\n"
            "1. Return ONLY valid JSON — no text outside JSON.\n"
            "2. score: integer 0-100. Calculate honestly based on the rubric above.\n"
            "3. verdict: 1 sentence, max 15 words. Be specific about what went well or wrong today.\n"
            "4. actions: exactly 3 strings. Each action must reference specific numbers from the "
            "user's data (e.g. 'You need 45g more protein — add a chicken breast or protein shake'). "
            "Max 20 words each. Do not repeat generic advice.\n\n"

            "OUTPUT FORMAT:\n"
            '{"score": integer, "verdict": "string", "actions": ["string", "string", "string"]}'
        )

        user_prompt = (
            f"TODAY'S NUTRITION LOG:\n"
            f"- Calorie goal: {calorie_goal} kcal | Consumed: {calories_eaten} kcal "
            f"({'surplus' if calories_eaten > calorie_goal else 'deficit'} of "
            f"{abs(calories_eaten - calorie_goal)} kcal)\n"
            f"- Protein goal: {protein_goal}g | Consumed: {protein_eaten}g "
            f"({round(protein_eaten/protein_goal*100) if protein_goal else 0}% of target)\n"
            f"- Water: {water_cups}/{water_goal} cups "
            f"({round(water_cups/water_goal*100) if water_goal else 0}% of target)\n"
            f"- Meals logged today: {meals_logged}\n"
            f"- Workout completed: {'Yes' if workout_done else 'No'}\n\n"
            "Score the day honestly and give 3 specific, actionable improvements for tomorrow."
        )

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
            "protein_g":      round(max(20, min(500, self.to_float(raw.get("protein_g"), fallback["protein_g"]))), 1),
            "carbs_g":        round(max(20, min(800, self.to_float(raw.get("carbs_g"),   fallback["carbs_g"]))),   1),
            "fat_g":          round(max(10, min(300, self.to_float(raw.get("fat_g"),     fallback["fat_g"]))),     1),
            "meal_count":     int(max(3, min(8, self.to_float(raw.get("meal_count"), fallback["meal_count"])))),
            "diet_type":      str(raw.get("diet_type") or fallback["diet_type"]).strip() or fallback["diet_type"],
            "restrictions":   raw.get("restrictions") if isinstance(raw.get("restrictions"), list) else fallback["restrictions"],
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
                items.append({
                    "name":      name,
                    "kcal":      int(max(0, self.to_float(item.get("kcal"), 0))),
                    "protein_g": round(max(0, self.to_float(item.get("protein_g"), item.get("protein") or 0)), 1),
                    "carbs_g":   round(max(0, self.to_float(item.get("carbs_g"),   item.get("carbs") or 0)),   1),
                    "fat_g":     round(max(0, self.to_float(item.get("fat_g"),     item.get("fat") or 0)),     1),
                })

            if items:
                normalized[section] = items
            elif isinstance(fallback.get(section), list):
                normalized[section] = fallback[section]
            else:
                normalized[section] = []

        return normalized


nutrition_ai_service = NutritionAIService()