from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field


MEAL_SECTIONS = {"Breakfast", "Lunch", "Dinner", "Snacks"}


class FoodItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=80)
    food_type: str | None = Field(default=None, max_length=20)
    emoji: str | None = Field(default=None, max_length=12)
    kcal_per_100g: float = Field(ge=0)
    protein_per_100g: float = Field(default=0, ge=0)
    carbs_per_100g: float = Field(default=0, ge=0)
    fat_per_100g: float = Field(default=0, ge=0)

    model_config = {"from_attributes": True}


class FoodItemCreate(FoodItemBase):
    pass


class FoodItemRead(FoodItemBase):
    id: int
    owner_id: int | None


class FoodItemListResponse(BaseModel):
    items: list[FoodItemRead]
    total: int
    limit: int
    offset: int


class MealLogInput(BaseModel):
    food_item_id: int | None = None
    food_name: str = Field(min_length=1, max_length=255)
    grams: float = Field(ge=1, le=5000)
    kcal: float = Field(ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)


class MealLogCreate(BaseModel):
    date: date
    section: str = Field(min_length=3, max_length=30)
    logged_at: datetime
    meals: list[MealLogInput] = Field(min_length=1)


class MealLogRead(BaseModel):
    id: int
    date: date
    section: str
    logged_at: datetime
    food_item_id: int | None
    food_name: str
    grams: float
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float

    model_config = {"from_attributes": True}


class MealLogListResponse(BaseModel):
    date: date
    meals: list[MealLogRead]


class NutritionGoalBase(BaseModel):
    daily_calories: int = Field(ge=800, le=5000)
    protein_g: float = Field(ge=20, le=500)
    carbs_g: float = Field(ge=20, le=800)
    fat_g: float = Field(ge=10, le=300)
    hydration_ml: int = Field(default=2500, ge=500, le=10000)
    diet_type: str | None = Field(default=None, max_length=100)
    restrictions: list[str] = Field(default_factory=list)


class NutritionGoalCreate(NutritionGoalBase):
    pass


class NutritionGoalRead(NutritionGoalBase):
    id: int

    model_config = {"from_attributes": True}


class HydrationLogCreate(BaseModel):
    date: date
    amount_ml: int = Field(ge=1, le=10000)
    logged_at: datetime


class HydrationLogRead(BaseModel):
    id: int
    date: date
    amount_ml: int
    logged_at: datetime

    model_config = {"from_attributes": True}


class HydrationSummaryResponse(BaseModel):
    date: date
    consumed_ml: int
    goal_ml: int
    cup_size_ml: int
    cups_count: int
    adherence_percentage: int


class DailyNutritionSummaryResponse(BaseModel):
    date: date
    consumed: dict
    targets: dict
    remaining: dict
    progress_percentage: dict


class CoachInsightCreate(BaseModel):
    date: date
    current_calories: float = Field(ge=0)
    target_calories: float = Field(ge=1)
    macros: dict
    macro_targets: dict
    hydration_ml: int = Field(ge=0)
    hydration_goal_ml: int = Field(ge=1)


class CoachInsightResponse(BaseModel):
    score: int
    verdict: str
    actions: list[str]
    timestamp: datetime


class AIDietPlanGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    image_base64: str | None = None
    user_context: dict | None = None


class AIDietPlanRead(BaseModel):
    id: int
    name: str
    prompt: str
    summary: str
    suggestions: list[str]
    action_data: dict
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AIDietPlanGenerateResponse(BaseModel):
    plan_id: int
    summary: str
    suggestions: list[str]
    recommended_plan: dict
    created_at: datetime
