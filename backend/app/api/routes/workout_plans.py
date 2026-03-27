from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import Workout, WorkoutPlanFollow
from app.schemas.workout_plan import (
    AIWorkoutDraftCreate,
    AIWorkoutDraftResponse,
    ActivePlanEntryRead,
    CustomWorkoutPlanCreate,
    FollowPlanRead,
    PlanExercisesResponse,
    WorkoutPlanRead,
)
from app.services.ai.workout_ai_service import workout_ai_service

router = APIRouter(prefix="/workout-plans", tags=["workout-plans"])


@router.get("/recommended", response_model=list[WorkoutPlanRead])
def list_recommended_plans(
    level: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Workout).where(Workout.owner_id.is_(None), Workout.is_completed == False)

    if level:
        stmt = stmt.where(Workout.level == level.lower())

    rows = db.execute(stmt.order_by(Workout.created_at.desc())).scalars().all()
    return rows


@router.get("/active", response_model=list[ActivePlanEntryRead])
def list_active_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    followed_rows = db.execute(
        select(WorkoutPlanFollow, Workout)
        .join(Workout, Workout.id == WorkoutPlanFollow.workout_id)
        .where(WorkoutPlanFollow.user_id == current_user.id, Workout.is_completed == False)
        .order_by(WorkoutPlanFollow.start_date.desc())
    ).all()

    own_rows = db.execute(
        select(Workout)
        .where(Workout.owner_id == current_user.id, Workout.is_completed == False)
        .order_by(Workout.created_at.desc())
    ).scalars().all()

    active: list[ActivePlanEntryRead] = []
    included_ids: set[int] = set()

    for follow, plan in followed_rows:
        active.append(ActivePlanEntryRead(plan=plan, start_date=follow.start_date))
        included_ids.add(plan.id)

    for plan in own_rows:
        if plan.id in included_ids:
            continue
        active.append(ActivePlanEntryRead(plan=plan, start_date=plan.created_at))

    return active


@router.get("/{plan_id}", response_model=WorkoutPlanRead)
def get_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.get(Workout, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    if plan.owner_id not in (None, current_user.id):
        followed = db.execute(
            select(WorkoutPlanFollow).where(
                WorkoutPlanFollow.user_id == current_user.id,
                WorkoutPlanFollow.workout_id == plan.id,
            )
        ).scalar_one_or_none()
        if not followed:
            raise HTTPException(status_code=403, detail="Access denied")

    return plan


@router.get("/{plan_id}/exercises", response_model=PlanExercisesResponse)
def get_workout_plan_exercises(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = get_workout_plan(plan_id=plan_id, db=db, current_user=current_user)
    raw_exercises = plan.exercises if plan.exercises else _generate_exercises_for_plan(plan, db)
    exercises = _normalize_exercises_for_response(raw_exercises)
    return {
        "plan_id": plan.id,
        "plan_title": plan.title,
        "plan_level": plan.level,
        "plan_duration": plan.duration_days,
        "exercises": exercises,
    }


@router.post("/{plan_id}/follow", response_model=FollowPlanRead, status_code=status.HTTP_201_CREATED)
def follow_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.get(Workout, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    if plan.owner_id not in (None, current_user.id):
        raise HTTPException(status_code=400, detail="Cannot follow private plan")

    existing = db.execute(
        select(WorkoutPlanFollow).where(
            WorkoutPlanFollow.user_id == current_user.id,
            WorkoutPlanFollow.workout_id == plan_id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    follow = WorkoutPlanFollow(user_id=current_user.id, workout_id=plan_id, start_date=datetime.utcnow())
    db.add(follow)
    db.commit()
    db.refresh(follow)
    return follow


@router.delete("/{plan_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow = db.execute(
        select(WorkoutPlanFollow).where(
            WorkoutPlanFollow.user_id == current_user.id,
            WorkoutPlanFollow.workout_id == plan_id,
        )
    ).scalar_one_or_none()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow record not found")

    db.delete(follow)
    db.commit()
    return None


@router.post("/custom", response_model=WorkoutPlanRead, status_code=status.HTTP_201_CREATED)
def create_custom_workout_plan(
    payload: CustomWorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized_level = payload.level.lower()
    normalized_desc = payload.description or ""
    if payload.focus:
        normalized_desc = f"{normalized_desc} Focus: {payload.focus}".strip()

    plan = Workout(
        title=payload.title,
        description=normalized_desc,
        level=normalized_level,
        duration_days=payload.duration_days,
        exercises=[item.model_dump() for item in payload.exercises],
        owner_id=current_user.id,
        is_completed=False,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/ai-draft", response_model=AIWorkoutDraftResponse, status_code=status.HTTP_201_CREATED)
def create_ai_workout_draft(
    payload: AIWorkoutDraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_result = workout_ai_service.generate_workout_plan_draft(
        prompt=payload.ai_prompt,
        level=payload.level,
        duration_days=payload.duration_days,
        focus=payload.focus,
    )

    generated_exercises = ai_result.get("exercises")
    if not isinstance(generated_exercises, list) or len(generated_exercises) == 0:
        generated_exercises = _generate_ai_draft_exercises(payload.ai_prompt, payload.level)
    generated_exercises = _normalize_exercises_for_response(generated_exercises)

    title = payload.title or str(ai_result.get("title") or "AI Workout Plan")
    if not title.strip():
        title = "AI Workout Plan"

    description_parts = [
        payload.description
        or str(ai_result.get("summary") or "AI draft generated from your prompt."),
    ]
    if payload.focus:
        description_parts.append(f"Focus: {payload.focus}")
    description_parts.append(f"Prompt: {payload.ai_prompt}")

    plan = Workout(
        title=title.strip(),
        description=" ".join(part.strip() for part in description_parts if part and part.strip()),
        level=payload.level.lower(),
        duration_days=payload.duration_days,
        exercises=generated_exercises,
        owner_id=current_user.id,
        is_completed=False,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    ai_source = str(ai_result.get("source") or "fallback")
    ai_status = "generated" if ai_source == "cerebras" else "fallback-generated"
    ai_message = (
        "AI draft created using Cerebras model."
        if ai_source == "cerebras"
        else "AI provider unavailable. Created fallback rule-based draft."
    )

    return {
        "plan": plan,
        "ai_status": ai_status,
        "ai_message": ai_message,
    }


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.get(Workout, plan_id)
    if not plan or plan.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    db.delete(plan)
    db.commit()
    return None


def _generate_ai_draft_exercises(ai_prompt: str, level: str) -> list[dict]:
    lower = ai_prompt.lower()

    if any(word in lower for word in ["fat", "cut", "lean", "weight loss"]):
        focus = "fat-loss"
    elif any(word in lower for word in ["muscle", "bulk", "hypertrophy", "strength"]):
        focus = "muscle-gain"
    elif any(word in lower for word in ["mobility", "flexibility", "recovery", "joint"]):
        focus = "mobility"
    else:
        focus = "balanced"

    base_sets = "3" if level.lower() == "beginner" else "4"
    base_reps = "10-12" if level.lower() != "advanced" else "8-10"

    library: dict[str, list[dict]] = {
        "fat-loss": [
            {"name": "Incline Walk", "category": "Cardio", "sets": 1, "duration": "20 min", "rest": "-"},
            {"name": "Bodyweight Circuit", "category": "Strength", "sets": base_sets, "reps": base_reps, "rest": "60 sec"},
            {"name": "Burpees", "category": "Cardio", "sets": 3, "reps": "12", "rest": "45 sec"},
        ],
        "muscle-gain": [
            {"name": "Barbell Squat", "category": "Strength", "sets": base_sets, "reps": base_reps, "rest": "90 sec"},
            {"name": "Bench Press", "category": "Strength", "sets": base_sets, "reps": base_reps, "rest": "90 sec"},
            {"name": "Pull-up / Lat Pulldown", "category": "Strength", "sets": base_sets, "reps": "8-12", "rest": "90 sec"},
        ],
        "mobility": [
            {"name": "Dynamic Hip Mobility", "category": "Flexibility", "sets": 3, "duration": "45 sec", "rest": "20 sec"},
            {"name": "Thoracic Rotations", "category": "Flexibility", "sets": 3, "duration": "45 sec", "rest": "20 sec"},
            {"name": "Glute Bridge", "category": "Strength", "sets": base_sets, "reps": "12-15", "rest": "45 sec"},
        ],
        "balanced": [
            {"name": "Rowing Machine", "category": "Cardio", "sets": 1, "duration": "15 min", "rest": "-"},
            {"name": "Push-ups", "category": "Strength", "sets": base_sets, "reps": base_reps, "rest": "60 sec"},
            {"name": "Plank", "category": "Strength", "sets": 3, "duration": "45 sec", "rest": "30 sec"},
        ],
    }

    return library[focus]


def _generate_exercises_for_plan(plan: Workout, db: Session) -> list[dict]:
    level = (plan.level or "beginner").lower() 
    title = (plan.title or "").lower()

    base_counts = {
        "beginner": {"Strength": 2, "Cardio": 2, "Flexibility": 1},
        "intermediate": {"Strength": 3, "Cardio": 2, "Flexibility": 1},
        "advanced": {"Strength": 4, "Cardio": 2, "Flexibility": 1},
    }
    counts = base_counts.get(level, base_counts["beginner"]).copy()

    if "mobility" in title or "recovery" in title or "flex" in title:
        counts = {"Strength": 1, "Cardio": 1, "Flexibility": 4}
    elif "fat" in title or "cardio" in title or "condition" in title:
        counts["Cardio"] = counts["Cardio"] + 1

    exercises_by_category: dict[str, list[Exercise]] = {}
    for category in ["Strength", "Cardio", "Flexibility"]:
        exercises_by_category[category] = db.execute(
            select(Exercise)
            .where(
                and_(
                    Exercise.owner_id.is_(None),
                    Exercise.category == category,
                )
            )
            .order_by(Exercise.name.asc())
        ).scalars().all()

    if not any(exercises_by_category.values()):
        return []

    prescriptions = {
        "beginner": {
            "Strength": {"sets": 3, "reps": "8-12", "rest": "60 sec"},
            "Cardio": {"sets": 1, "duration": "15-25 min", "rest": "-"},
            "Flexibility": {"sets": 2, "duration": "30-45 sec", "rest": "30 sec"},
        },
        "intermediate": {
            "Strength": {"sets": 4, "reps": "10-14", "rest": "60-75 sec"},
            "Cardio": {"sets": 1, "duration": "20-30 min", "rest": "-"},
            "Flexibility": {"sets": 2, "duration": "40-60 sec", "rest": "30 sec"},
        },
        "advanced": {
            "Strength": {"sets": 5, "reps": "6-12", "rest": "75-90 sec"},
            "Cardio": {"sets": 1, "duration": "25-40 min", "rest": "-"},
            "Flexibility": {"sets": 3, "duration": "45-60 sec", "rest": "30 sec"},
        },
    }
    plan_prescription = prescriptions.get(level, prescriptions["beginner"])

    output: list[dict] = []
    for category in ["Strength", "Cardio", "Flexibility"]:
        pool = exercises_by_category.get(category, [])
        count = counts.get(category, 0)
        if not pool or count <= 0:
            continue

        for exercise in pool[:count]:
            item: dict = {
                "name": exercise.name,
                "category": exercise.category,
                "notes": exercise.description,
            }
            item.update(plan_prescription[category])
            output.append(item)

    return output


def _normalize_exercises_for_response(exercises: list[dict] | None) -> list[dict]:
    if not isinstance(exercises, list):
        return []

    normalized: list[dict] = []
    for item in exercises:
        if not isinstance(item, dict):
            continue

        entry = dict(item)

        # API schema expects rest as a string, but some historical records stored ints.
        if entry.get("rest") is not None and not isinstance(entry.get("rest"), str):
            entry["rest"] = str(entry.get("rest"))

        normalized.append(entry)

    return normalized
