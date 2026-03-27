from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.nutrition import FoodItem
from app.models.workout import Workout

SYSTEM_EXERCISES = [
    {"name": "Running", "category": "Cardio", "description": "Aerobic exercise that improves cardiovascular health and burns calories effectively."},
    {"name": "Cycling", "category": "Cardio", "description": "Low-impact cardio exercise that strengthens legs and improves endurance."},
    {"name": "Swimming", "category": "Cardio", "description": "Full-body cardio workout that's easy on joints and builds endurance."},
    {"name": "Jump Rope", "category": "Cardio", "description": "High-intensity cardio exercise that improves coordination and burns calories quickly."},
    {"name": "Rowing", "category": "Cardio", "description": "Full-body cardio workout that engages both upper and lower body muscles."},
    {"name": "Elliptical", "category": "Cardio", "description": "Low-impact cardio machine that provides a full-body workout."},
    {"name": "Stair Climbing", "category": "Cardio", "description": "High-intensity cardio exercise that strengthens legs and glutes."},
    {"name": "Dancing", "category": "Cardio", "description": "Fun cardio exercise that improves coordination and burns calories."},
    {"name": "Boxing", "category": "Cardio", "description": "High-intensity cardio workout that improves agility and upper body strength."},
    {"name": "HIIT", "category": "Cardio", "description": "High-Intensity Interval Training that maximizes calorie burn in minimal time."},
    {"name": "Push-ups", "category": "Strength", "description": "Bodyweight exercise that strengthens chest, shoulders, and triceps."},
    {"name": "Pull-ups", "category": "Strength", "description": "Upper body exercise that targets back, biceps, and shoulders."},
    {"name": "Squats", "category": "Strength", "description": "Compound exercise that strengthens legs, glutes, and core."},
    {"name": "Deadlifts", "category": "Strength", "description": "Full-body compound movement that builds overall strength and power."},
    {"name": "Bench Press", "category": "Strength", "description": "Upper body exercise that targets chest, shoulders, and triceps."},
    {"name": "Overhead Press", "category": "Strength", "description": "Shoulder exercise that builds upper body strength and stability."},
    {"name": "Rows", "category": "Strength", "description": "Back exercise that improves posture and strengthens the posterior chain."},
    {"name": "Lunges", "category": "Strength", "description": "Single-leg exercise that strengthens legs and improves balance."},
    {"name": "Planks", "category": "Strength", "description": "Isometric core exercise that strengthens the entire core region."},
    {"name": "Dips", "category": "Strength", "description": "Upper body exercise that targets triceps, chest, and shoulders."},
    {"name": "Yoga", "category": "Flexibility", "description": "Mind-body practice that improves flexibility, strength, and mental well-being."},
    {"name": "Stretching", "category": "Flexibility", "description": "Basic flexibility exercise that improves range of motion and reduces muscle tension."},
    {"name": "Pilates", "category": "Flexibility", "description": "Low-impact exercise that improves flexibility, core strength, and posture."},
    {"name": "Tai Chi", "category": "Flexibility", "description": "Gentle martial art that improves balance, flexibility, and mental focus."},
    {"name": "Dynamic Stretching", "category": "Flexibility", "description": "Active stretching that prepares muscles for movement and improves flexibility."},
    {"name": "Static Stretching", "category": "Flexibility", "description": "Held stretches that improve flexibility and help with muscle recovery."},
    {"name": "Foam Rolling", "category": "Flexibility", "description": "Self-massage technique that improves flexibility and reduces muscle soreness."},
    {"name": "Mobility Work", "category": "Flexibility", "description": "Exercises that improve joint range of motion and movement quality."},
    {"name": "Breathing Exercises", "category": "Flexibility", "description": "Techniques that improve lung capacity and promote relaxation."},
    {"name": "Meditation", "category": "Flexibility", "description": "Mindfulness practice that reduces stress and improves mental flexibility."},
]

SYSTEM_PLANS = [
    {
        "title": "Fat Loss Foundation",
        "description": "Beginner-friendly fat loss program with steady cardio and full-body strength.",
        "level": "beginner",
        "duration_days": 30,
    },
    {
        "title": "Lean Muscle Builder",
        "description": "Progressive plan focused on strength volume and lean muscle growth.",
        "level": "intermediate",
        "duration_days": 42,
    },
    {
        "title": "Athletic Conditioning",
        "description": "Advanced conditioning blend of HIIT, strength, and endurance blocks.",
        "level": "advanced",
        "duration_days": 56,
    },
    {
        "title": "Mobility and Recovery",
        "description": "Flexibility-first plan for recovery days, posture, and movement quality.",
        "level": "beginner",
        "duration_days": 21,
    },
]

SYSTEM_FOOD_ITEMS = [
    {"name": "Oatmeal", "category": "Grains", "food_type": "veg", "emoji": "oatmeal", "kcal": 150, "protein": 5, "carbs": 27, "fat": 3},
    {"name": "Quinoa", "category": "Grains", "food_type": "veg", "emoji": "quinoa", "kcal": 120, "protein": 4.4, "carbs": 21.3, "fat": 1.9},
    {"name": "Brown Rice", "category": "Grains", "food_type": "veg", "emoji": "rice", "kcal": 123, "protein": 2.7, "carbs": 25.6, "fat": 1.0},
    {"name": "Chicken Breast", "category": "Protein", "food_type": "non-veg", "emoji": "chicken", "kcal": 165, "protein": 31, "carbs": 0, "fat": 3.6},
    {"name": "Salmon", "category": "Protein", "food_type": "non-veg", "emoji": "salmon", "kcal": 208, "protein": 20, "carbs": 0, "fat": 13},
    {"name": "Boiled Egg", "category": "Protein", "food_type": "non-veg", "emoji": "egg", "kcal": 155, "protein": 13, "carbs": 1.1, "fat": 11},
    {"name": "Tofu", "category": "Protein", "food_type": "veg", "emoji": "tofu", "kcal": 76, "protein": 8, "carbs": 1.9, "fat": 4.8},
    {"name": "Greek Yogurt", "category": "Dairy", "food_type": "veg", "emoji": "yogurt", "kcal": 98, "protein": 10, "carbs": 3.6, "fat": 4},
    {"name": "Paneer", "category": "Dairy", "food_type": "veg", "emoji": "paneer", "kcal": 265, "protein": 18, "carbs": 1.2, "fat": 21},
    {"name": "Banana", "category": "Fruits", "food_type": "veg", "emoji": "banana", "kcal": 89, "protein": 1.3, "carbs": 23, "fat": 0.4},
    {"name": "Apple", "category": "Fruits", "food_type": "veg", "emoji": "apple", "kcal": 52, "protein": 0.3, "carbs": 14, "fat": 0.2},
    {"name": "Broccoli", "category": "Vegetables", "food_type": "veg", "emoji": "broccoli", "kcal": 34, "protein": 2.8, "carbs": 7, "fat": 0.4},
    {"name": "Spinach", "category": "Vegetables", "food_type": "veg", "emoji": "spinach", "kcal": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4},
    {"name": "Almonds", "category": "Snacks", "food_type": "veg", "emoji": "almonds", "kcal": 579, "protein": 21, "carbs": 22, "fat": 50},
    {"name": "Protein Shake", "category": "Beverages", "food_type": "veg", "emoji": "shake", "kcal": 50, "protein": 8, "carbs": 5, "fat": 0.5},
]


def seed_system_exercises(db: Session) -> int:
    existing_names = {
        name
        for name in db.execute(
            select(Exercise.name).where(Exercise.owner_id.is_(None))
        ).scalars().all()
    }

    created = 0
    for item in SYSTEM_EXERCISES:
        if item["name"] in existing_names:
            continue
        db.add(
            Exercise(
                name=item["name"],
                category=item["category"],
                description=item.get("description"),
                owner_id=None,
            )
        )
        created += 1

    if created:
        db.commit()

    return created


def seed_system_plans(db: Session) -> int:
    existing_titles = {
        title
        for title in db.execute(
            select(Workout.title).where(Workout.owner_id.is_(None))
        ).scalars().all()
    }

    created = 0
    for item in SYSTEM_PLANS:
        if item["title"] in existing_titles:
            continue
        db.add(
            Workout(
                title=item["title"],
                description=item["description"],
                level=item["level"],
                duration_days=item["duration_days"],
                owner_id=None,
            )
        )
        created += 1

    if created:
        db.commit()

    return created


def seed_system_food_items(db: Session) -> int:
    existing_names = {
        name
        for name in db.execute(
            select(FoodItem.name).where(FoodItem.owner_id.is_(None))
        ).scalars().all()
    }

    created = 0
    for item in SYSTEM_FOOD_ITEMS:
        if item["name"] in existing_names:
            continue
        db.add(
            FoodItem(
                name=item["name"],
                category=item["category"],
                food_type=item["food_type"],
                emoji=item["emoji"],
                kcal_per_100g=item["kcal"],
                protein_per_100g=item["protein"],
                carbs_per_100g=item["carbs"],
                fat_per_100g=item["fat"],
                owner_id=None,
            )
        )
        created += 1

    if created:
        db.commit()

    return created


def ensure_default_seed_data(db: Session) -> dict[str, int]:
    return {
        "exercises_created": seed_system_exercises(db),
        "plans_created": seed_system_plans(db),
        "foods_created": seed_system_food_items(db),
    }
