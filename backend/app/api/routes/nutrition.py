from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.nutrition import (
    AICoachInsight,
    AIDietPlan,
    FoodItem,
    HydrationLog,
    MealLog,
    NutritionGoal,
)
from app.models.user import User
from app.schemas.nutrition import (
    AIDietPlanGenerateRequest,
    AIDietPlanGenerateResponse,
    AIDietPlanRead,
    CoachInsightCreate,
    CoachInsightResponse,
    DailyNutritionSummaryResponse,
    FoodItemCreate,
    FoodItemListResponse,
    FoodItemRead,
    HydrationLogCreate,
    HydrationSummaryResponse,
    MEAL_SECTIONS,
    MealLogCreate,
    MealLogListResponse,
    MealLogRead,
    NutritionGoalCreate,
    NutritionGoalRead,
)
from app.services.ai.nutrition_ai_service import nutrition_ai_service

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/foods", response_model=FoodItemListResponse)
def list_foods(
    category: str | None = None,
    food_type: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(FoodItem).where(
        or_(FoodItem.owner_id.is_(None), FoodItem.owner_id == current_user.id)
    )

    if category:
        stmt = stmt.where(FoodItem.category == category)
    if food_type:
        stmt = stmt.where(FoodItem.food_type == food_type)
    if search:
        stmt = stmt.where(FoodItem.name.ilike(f"%{search.strip()}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    items = db.execute(stmt.order_by(FoodItem.name.asc()).limit(limit).offset(offset)).scalars().all()
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/foods/custom", response_model=FoodItemRead, status_code=status.HTTP_201_CREATED)
def create_custom_food(
    payload: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = FoodItem(
        name=payload.name,
        category=payload.category,
        food_type=payload.food_type,
        emoji=payload.emoji,
        kcal_per_100g=payload.kcal_per_100g,
        protein_per_100g=payload.protein_per_100g,
        carbs_per_100g=payload.carbs_per_100g,
        fat_per_100g=payload.fat_per_100g,
        owner_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/meals", response_model=list[MealLogRead], status_code=status.HTTP_201_CREATED)
def create_meals(
    payload: MealLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.section not in MEAL_SECTIONS:
        raise HTTPException(status_code=422, detail="Invalid meal section")

    created: list[MealLog] = []
    for row in payload.meals:
        if row.food_item_id is not None:
            food = db.get(FoodItem, row.food_item_id)
            if not food or (food.owner_id is not None and food.owner_id != current_user.id):
                raise HTTPException(status_code=404, detail="Food item not found")

        entry = MealLog(
            date=payload.date,
            section=payload.section,
            logged_at=payload.logged_at,
            food_item_id=row.food_item_id,
            food_name=row.food_name,
            grams=row.grams,
            kcal=row.kcal,
            protein_g=row.protein_g,
            carbs_g=row.carbs_g,
            fat_g=row.fat_g,
            owner_id=current_user.id,
        )
        db.add(entry)
        created.append(entry)

    db.commit()
    for entry in created:
        db.refresh(entry)
    return created


@router.get("/meals", response_model=MealLogListResponse)
def list_meals(
    date_value: date = Query(alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.execute(
            select(MealLog)
            .where(MealLog.owner_id == current_user.id, MealLog.date == date_value)
            .order_by(MealLog.logged_at.asc())
        )
        .scalars()
        .all()
    )
    return {"date": date_value, "meals": rows}


@router.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(MealLog, meal_id)
    if not row or row.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Meal log not found")
    db.delete(row)
    db.commit()
    return None


@router.get("/goals", response_model=NutritionGoalRead)
def get_nutrition_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.execute(
        select(NutritionGoal).where(NutritionGoal.owner_id == current_user.id)
    ).scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Nutrition goal not found")
    return goal


@router.post("/goals", response_model=NutritionGoalRead)
def upsert_nutrition_goal(
    payload: NutritionGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.execute(
        select(NutritionGoal).where(NutritionGoal.owner_id == current_user.id)
    ).scalar_one_or_none()

    if not goal:
        goal = NutritionGoal(owner_id=current_user.id, **payload.model_dump())
        db.add(goal)
    else:
        for key, value in payload.model_dump().items():
            setattr(goal, key, value)

    db.commit()
    db.refresh(goal)
    return goal


@router.post("/hydration", response_model=HydrationSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_hydration_log(
    payload: HydrationLogCreate,
    cup_size_ml: int = Query(default=250, ge=100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = HydrationLog(
        date=payload.date,
        amount_ml=payload.amount_ml,
        logged_at=payload.logged_at,
        owner_id=current_user.id,
    )
    db.add(entry)
    db.commit()

    consumed_ml = (
        db.scalar(
            select(func.coalesce(func.sum(HydrationLog.amount_ml), 0)).where(
                HydrationLog.owner_id == current_user.id,
                HydrationLog.date == payload.date,
            )
        )
        or 0
    )
    goal_ml = 2500
    cups_count = int((consumed_ml + cup_size_ml - 1) // cup_size_ml)
    adherence = int(min((consumed_ml / max(goal_ml, 1)) * 100, 999))
    return {
        "date": payload.date,
        "consumed_ml": int(consumed_ml),
        "goal_ml": goal_ml,
        "cup_size_ml": cup_size_ml,
        "cups_count": cups_count,
        "adherence_percentage": adherence,
    }


@router.get("/hydration", response_model=HydrationSummaryResponse)
def get_hydration_summary(
    date_value: date = Query(alias="date"),
    cup_size_ml: int = Query(default=250, ge=100, le=1000),
    goal_ml: int = Query(default=2500, ge=500, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consumed_ml = (
        db.scalar(
            select(func.coalesce(func.sum(HydrationLog.amount_ml), 0)).where(
                HydrationLog.owner_id == current_user.id,
                HydrationLog.date == date_value,
            )
        )
        or 0
    )
    cups_count = int((consumed_ml + cup_size_ml - 1) // cup_size_ml)
    adherence = int(min((consumed_ml / max(goal_ml, 1)) * 100, 999))
    return {
        "date": date_value,
        "consumed_ml": int(consumed_ml),
        "goal_ml": goal_ml,
        "cup_size_ml": cup_size_ml,
        "cups_count": cups_count,
        "adherence_percentage": adherence,
    }


@router.get("/summary", response_model=DailyNutritionSummaryResponse)
def get_daily_summary(
    date_value: date = Query(alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.execute(
            select(MealLog)
            .where(MealLog.owner_id == current_user.id, MealLog.date == date_value)
            .order_by(MealLog.logged_at.asc())
        )
        .scalars()
        .all()
    )

    consumed = {
        "calories": round(sum(x.kcal for x in rows), 1),
        "protein_g": round(sum(x.protein_g for x in rows), 1),
        "carbs_g": round(sum(x.carbs_g for x in rows), 1),
        "fat_g": round(sum(x.fat_g for x in rows), 1),
        "meals_count": len(rows),
    }

    goal = db.execute(
        select(NutritionGoal).where(NutritionGoal.owner_id == current_user.id)
    ).scalar_one_or_none()
    targets = {
        "calories": goal.daily_calories if goal else 2500,
        "protein_g": goal.protein_g if goal else 180,
        "carbs_g": goal.carbs_g if goal else 280,
        "fat_g": goal.fat_g if goal else 70,
    }
    remaining = {
        "calories": round(targets["calories"] - consumed["calories"], 1),
        "protein_g": round(targets["protein_g"] - consumed["protein_g"], 1),
        "carbs_g": round(targets["carbs_g"] - consumed["carbs_g"], 1),
        "fat_g": round(targets["fat_g"] - consumed["fat_g"], 1),
    }
    progress = {
        "calories": int(min((consumed["calories"] / max(targets["calories"], 1)) * 100, 999)),
        "protein": int(min((consumed["protein_g"] / max(targets["protein_g"], 1)) * 100, 999)),
        "carbs": int(min((consumed["carbs_g"] / max(targets["carbs_g"], 1)) * 100, 999)),
        "fat": int(min((consumed["fat_g"] / max(targets["fat_g"], 1)) * 100, 999)),
    }

    return {
        "date": date_value,
        "consumed": consumed,
        "targets": targets,
        "remaining": remaining,
        "progress_percentage": progress,
    }


@router.post("/ai/coach-insight", response_model=CoachInsightResponse)
def create_coach_insight(
    payload: CoachInsightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    calorie_gap = abs(payload.target_calories - payload.current_calories) / max(payload.target_calories, 1)
    protein_gap = abs(float(payload.macro_targets.get("protein_g", 0)) - float(payload.macros.get("protein_g", 0)))
    hydration_gap = max(payload.hydration_goal_ml - payload.hydration_ml, 0)

    deterministic_score = int(max(35, min(99, 100 - calorie_gap * 40 - protein_gap * 0.25 - (hydration_gap / max(payload.hydration_goal_ml, 1)) * 25)))

    if deterministic_score >= 85:
        deterministic_verdict = "Excellent day for your goal."
    elif deterministic_score >= 70:
        deterministic_verdict = "Solid day with small adjustments needed."
    else:
        deterministic_verdict = "You need a stronger close to hit today's nutrition target."

    deterministic_actions = [
        "Prioritize protein in your next meal if you are below target.",
        "Keep hydration steady in smaller intervals across the day.",
        "Choose whole-food carbs around training and avoid late random snacking.",
    ]

    ai_result = nutrition_ai_service.generate_coach_insight(
        payload={
            "date": str(payload.date),
            "current_calories": payload.current_calories,
            "target_calories": payload.target_calories,
            "macros": payload.macros,
            "macro_targets": payload.macro_targets,
            "hydration_ml": payload.hydration_ml,
            "hydration_goal_ml": payload.hydration_goal_ml,
        }
    )

    score = int(ai_result.get("score") or deterministic_score)
    score = max(35, min(99, score))
    verdict = str(ai_result.get("verdict") or deterministic_verdict)
    actions = ai_result.get("actions")
    if not isinstance(actions, list) or len(actions) == 0:
        actions = deterministic_actions

    row = AICoachInsight(
        date=payload.date,
        score=score,
        verdict=verdict,
        actions=actions,
        owner_id=current_user.id,
    )
    db.add(row)
    db.commit()

    return {
        "score": score,
        "verdict": verdict,
        "actions": actions,
        "timestamp": datetime.utcnow(),
    }


@router.post("/ai/generate-plan", response_model=AIDietPlanGenerateResponse)
def generate_ai_plan(
    payload: AIDietPlanGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_result = nutrition_ai_service.generate_nutrition_plan(
        prompt=payload.prompt,
        user_context=payload.user_context,
    )

    plan = ai_result.get("recommended_plan")
    if not isinstance(plan, dict):
        plan = {
            "calorie_target": 2300,
            "protein_g": 175,
            "carbs_g": 240,
            "fat_g": 75,
            "meal_count": 4,
            "diet_type": "high-protein",
            "restrictions": [],
        }

    summary = str(
        ai_result.get("summary")
        or "AI generated a personalized plan based on your prompt and current context."
    )
    suggestions = ai_result.get("suggestions")
    if not isinstance(suggestions, list) or len(suggestions) == 0:
        suggestions = [
            "Split protein across all meals for better muscle retention.",
            "Keep most carbs around training windows.",
            "Include hydration and sodium consistency for performance.",
        ]

    row = AIDietPlan(
        name="AI Diet Plan",
        prompt=payload.prompt,
        summary=summary,
        suggestions=suggestions,
        action_data=plan,
        owner_id=current_user.id,
        is_active=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "plan_id": row.id,
        "summary": summary,
        "suggestions": suggestions,
        "recommended_plan": plan,
        "created_at": row.created_at,
    }


@router.get("/ai/plans", response_model=list[AIDietPlanRead])
def list_ai_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.execute(
            select(AIDietPlan)
            .where(AIDietPlan.owner_id == current_user.id)
            .order_by(AIDietPlan.created_at.desc())
        )
        .scalars()
        .all()
    )


@router.post("/ai/plans/{plan_id}/activate", response_model=AIDietPlanRead)
def activate_ai_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.get(AIDietPlan, plan_id)
    if not plan or plan.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="AI plan not found")

    all_user_plans = (
        db.execute(select(AIDietPlan).where(AIDietPlan.owner_id == current_user.id))
        .scalars()
        .all()
    )
    for row in all_user_plans:
        row.is_active = row.id == plan.id

    db.commit()
    db.refresh(plan)
    return plan
