from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import Workout, SavedPlan
from app.models.goal import Goal
from app.schemas.plan import CustomPlanCreate, PlanRead, SavedPlanRead

router = APIRouter(prefix="/plans", tags=["plans"])


def _is_plan_expired(start_date: datetime | None, duration_days: int | None) -> bool:
    if not start_date or not duration_days or duration_days <= 0:
        return False
    return datetime.utcnow() >= (start_date + timedelta(days=duration_days))


def _cleanup_expired_saved_plans(db: Session, user_id: int) -> None:
    saved_plans = db.execute(
        select(SavedPlan, Workout)
        .join(Workout, Workout.id == SavedPlan.workout_id)
        .where(SavedPlan.user_id == user_id)
    ).all()

    expired_saved_plan_ids: list[int] = []
    completed_owned_plan_ids: list[int] = []

    for saved_plan, workout in saved_plans:
        if _is_plan_expired(saved_plan.start_date, workout.duration_days):
            expired_saved_plan_ids.append(saved_plan.id)
            if workout.owner_id == user_id and not workout.is_completed:
                completed_owned_plan_ids.append(workout.id)

    if not expired_saved_plan_ids and not completed_owned_plan_ids:
        return

    if expired_saved_plan_ids:
        db.query(SavedPlan).filter(SavedPlan.id.in_(expired_saved_plan_ids)).delete(synchronize_session=False)

    if completed_owned_plan_ids:
        now = datetime.utcnow()
        db.query(Workout).filter(Workout.id.in_(completed_owned_plan_ids)).update(
            {Workout.is_completed: True, Workout.completed_at: now},
            synchronize_session=False,
        )

    db.commit()


@router.get("/", response_model=List[PlanRead])
def list_plans(
    level: Optional[str] = Query(None, description="Filter by experience level (beginner, intermediate, advanced)"),
    db: Session = Depends(get_db)
):
    """
    Get all available workout plans (system plans where owner_id is NULL).
    Can filter by experience level.
    """
    query = select(Workout).where(Workout.owner_id.is_(None))
    
    if level:
        query = query.where(Workout.level == level.lower())
    
    plans = db.execute(query.order_by(Workout.created_at.desc())).scalars().all()
    return plans


@router.get("/my-plans", response_model=List[SavedPlanRead])
def get_user_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all plans that the current user has subscribed to, plus their custom goal-based plans.
    """
    _cleanup_expired_saved_plans(db, current_user.id)

    # Get subscribed plans
    saved_plans = db.execute(
        select(SavedPlan).where(SavedPlan.user_id == current_user.id)
        .order_by(SavedPlan.id.desc())
    ).scalars().all()

    saved_plan_workout_ids = {sp.workout_id for sp in saved_plans}

    # Get custom plans created for this user (goal-based plans).
    # Include as fallback for legacy rows that do not have saved_plan entries.
    custom_plans = db.execute(
        select(Workout).where(
            and_(
                Workout.owner_id == current_user.id,
                or_(
                    Workout.goal_id.is_(None),  # Plans without goal association (legacy)
                    Goal.is_completed == False  # Plans from incomplete goals
                ),
                Workout.is_completed == False,
            )
        ).outerjoin(Goal, Workout.goal_id == Goal.id)
        .order_by(Workout.created_at.desc())
    ).scalars().all()

    # Convert custom plans to SavedPlan format for consistency
    custom_saved_plans = []
    for plan in custom_plans:
        if plan.id in saved_plan_workout_ids:
            continue
        if _is_plan_expired(plan.created_at, plan.duration_days):
            continue

        # Create a virtual SavedPlan entry for custom plans
        custom_saved_plan = SavedPlan(
            id=plan.id + 1000000,  # Use a high offset to avoid conflicts
            user_id=current_user.id,
            workout_id=plan.id,
            start_date=plan.created_at,
        )
        custom_saved_plans.append(custom_saved_plan)
    
    # Combine both lists
    all_plans = saved_plans + custom_saved_plans

    # Sort by start date (most recent first)
    def sort_key(plan):
        return plan.start_date or datetime.min
    
    all_plans.sort(key=sort_key, reverse=True)

    return all_plans


@router.post("/custom", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
def create_custom_plan(
    payload: CustomPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.exercises:
        raise HTTPException(status_code=400, detail="At least one exercise is required")

    normalized_exercises: list[dict[str, Any]] = []
    for item in payload.exercises:
        exercise_name = item.name
        exercise_category = item.category

        if item.exercise_id is not None:
            exercise = db.get(Exercise, item.exercise_id)
            if not exercise:
                raise HTTPException(status_code=404, detail=f"Exercise {item.exercise_id} not found")
            if exercise.owner_id not in (None, current_user.id):
                raise HTTPException(status_code=403, detail="Cannot use this exercise")
            exercise_name = exercise.name
            exercise_category = exercise.category

        normalized_exercises.append(
            {
                "exercise_id": item.exercise_id,
                "name": exercise_name,
                "category": exercise_category,
                "sets": item.sets,
                "reps": item.reps,
                "rest": item.rest,
                "time": item.time,
                "duration": item.duration,
                "duration_minutes": item.duration_minutes,
                "notes": item.notes,
                "instructions": item.instructions,
            }
        )

    custom_plan = Workout(
        title=payload.title,
        description=payload.description,
        level=(payload.level or "beginner").lower(),
        duration_days=payload.duration_days or 30,
        owner_id=current_user.id,
        exercises=normalized_exercises,
    )
    db.add(custom_plan)
    db.commit()
    db.refresh(custom_plan)

    saved_plan = SavedPlan(
        user_id=current_user.id,
        workout_id=custom_plan.id,
        start_date=datetime.utcnow(),
    )
    db.add(saved_plan)
    db.commit()

    return custom_plan


@router.post("/subscribe/{plan_id}", response_model=SavedPlanRead, status_code=status.HTTP_201_CREATED)
def subscribe_to_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Subscribe the current user to a specific workout plan.
    """
    # Check if the plan exists and is a system plan
    plan = db.get(Workout, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.owner_id is not None:
        raise HTTPException(status_code=400, detail="Cannot subscribe to user-specific plans")
    
    # Check if user is already subscribed to this plan
    existing_subscription = db.execute(
        select(SavedPlan).where(
            and_(
                SavedPlan.user_id == current_user.id,
                SavedPlan.workout_id == plan_id
            )
        )
    ).scalar_one_or_none()
    
    if existing_subscription:
        raise HTTPException(status_code=400, detail="Already subscribed to this plan")
    
    # Create new subscription
    saved_plan = SavedPlan(
        user_id=current_user.id,
        workout_id=plan_id,
        start_date=datetime.utcnow(),
    )
    
    db.add(saved_plan)
    db.commit()
    db.refresh(saved_plan)
    
    return saved_plan


@router.delete("/unsubscribe/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_from_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unsubscribe the current user from a specific workout plan.
    """
    saved_plan = db.execute(
        select(SavedPlan).where(
            and_(
                SavedPlan.user_id == current_user.id,
                SavedPlan.workout_id == plan_id
            )
        )
    ).scalar_one_or_none()
    
    if not saved_plan:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    db.delete(saved_plan)
    db.commit()
    
    return None


@router.get("/plan/{plan_id}", response_model=PlanRead)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a specific workout plan.
    """
    plan = db.get(Workout, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.owner_id is not None and plan.owner_id != current_user.id:
        saved_plan = db.execute(
            select(SavedPlan).where(
                SavedPlan.user_id == current_user.id,
                SavedPlan.workout_id == plan_id,
            )
        ).scalar_one_or_none()
        if not saved_plan:
            raise HTTPException(status_code=403, detail="Access denied")

    return plan


@router.get("/plan/{plan_id}/exercises")
def get_plan_exercises(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exercises for a specific workout plan.
    Generates exercises based on plan level and type.
    """
    plan = db.get(Workout, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # System plans are visible to all authenticated users.
    # User-owned plans are visible only to owner or subscribers.
    if plan.owner_id is not None and plan.owner_id != current_user.id:
        saved_plan = db.execute(
            select(SavedPlan).where(
                SavedPlan.user_id == current_user.id,
                SavedPlan.workout_id == plan_id
            )
        ).scalar_one_or_none()

        if not saved_plan:
            raise HTTPException(status_code=403, detail="Access denied")

    if plan.exercises:
        exercises = plan.exercises
    else:
        exercises = generate_exercises_for_plan(plan, db)
    
    return {
        "plan_id": plan_id,
        "plan_title": plan.title,
        "plan_level": plan.level,
        "plan_duration": plan.duration_days,
        "exercises": exercises
    }


def generate_exercises_for_plan(plan: Workout, db: Session) -> list[dict[str, Any]]:
    """
    Build deterministic plan exercises using seeded exercises from the database.
    """
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
            .where(Exercise.owner_id.is_(None), Exercise.category == category)
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

    output: list[dict[str, Any]] = []
    for category in ["Strength", "Cardio", "Flexibility"]:
        pool = exercises_by_category.get(category, [])
        count = counts.get(category, 0)
        if not pool or count <= 0:
            continue

        for exercise in pool[:count]:
            item: dict[str, Any] = {
                "name": exercise.name,
                "category": exercise.category,
                "notes": exercise.description,
            }
            item.update(plan_prescription[category])
            output.append(item)

    return output