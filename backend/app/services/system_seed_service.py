from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
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


def ensure_default_seed_data(db: Session) -> dict[str, int]:
    return {
        "exercises_created": seed_system_exercises(db),
        "plans_created": seed_system_plans(db),
    }
