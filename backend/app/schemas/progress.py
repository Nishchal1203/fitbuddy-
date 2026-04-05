from datetime import date as DateType, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# 1. Body Measurement Schemas


class BodyMeasurementBase(BaseModel):
    weight: Optional[float] = Field(None, description="Weight in kg or lbs")
    body_fat_percentage: Optional[float] = Field(None, description="Body fat percentage")
    chest: Optional[float] = Field(None, description="Chest measurement")
    waist: Optional[float] = Field(None, description="Waist measurement")
    arms: Optional[float] = Field(None, description="Arms measurement")
    legs: Optional[float] = Field(None, description="Legs measurement")
    notes: Optional[str] = Field(None, description="Optional notes for the day")


class BodyMeasurementCreate(BodyMeasurementBase):
    date: DateType = Field(default_factory=DateType.today, description="Date of the measurement")


class BodyMeasurementUpdate(BodyMeasurementBase):
    pass


class BodyMeasurementResponse(BodyMeasurementBase):
    id: int
    date: DateType
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


# 2. Achievement (DB row)


class UserAchievementResponse(BaseModel):
    id: int
    badge_type: str = Field(..., description="Unique identifier for the badge type")
    title: str
    description: str
    unlocked_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 3. Progress dashboard — shapes expected by the Next.js Progress page


class WeightDataPoint(BaseModel):
    date: DateType
    weight: float


class WeightTrendResponse(BaseModel):
    timeframe: str = Field(..., description="e.g. '1_month', '6_months', '1_year'")
    data: List[WeightDataPoint]
    current_weight: Optional[float] = None
    weight_change: Optional[float] = Field(None, description="Difference from start of timeframe")


class StreakResponse(BaseModel):
    current_streak: int = Field(default=0, description="Current consecutive active days")
    longest_streak: int = Field(default=0, description="All-time longest streak")
    total_workout_days: int = Field(default=0, description="Distinct days with at least one workout")
    last_workout_date: str = Field(..., description="ISO-8601 timestamp of last session")
    weekly_activity: List[bool] = Field(
        ...,
        description="Mon–Sun of the current calendar week; true if a workout was logged that day",
        min_length=7,
        max_length=7,
    )


class MonthlySummaryCardResponse(BaseModel):
    month: int
    year: int
    workouts_completed: int = 0
    total_distance_km: float = 0.0
    calories_burned: float = 0.0
    active_minutes: int = 0
    prev_workouts_completed: int = 0
    prev_total_distance_km: float = 0.0
    prev_calories_burned: float = 0.0
    prev_active_minutes: int = 0


BadgeCategory = Literal["Fitness", "Nutrition", "Sleep", "Streak", "Milestones"]
BadgeRarity = Literal["common", "rare", "epic", "legendary"]
BadgeIconKey = Literal[
    "trophy",
    "star",
    "zap",
    "flame",
    "target",
    "dumbbell",
    "heart",
    "moon",
    "droplets",
    "award",
    "medal",
]


class AchievementBadgeCard(BaseModel):
    id: str
    title: str
    description: str
    category: BadgeCategory
    unlocked: bool = True
    unlocked_at: Optional[str] = Field(None, description="ISO-8601")
    icon_key: BadgeIconKey
    rarity: BadgeRarity


class WeightHistoryEntry(BaseModel):
    date: str
    weight: float


class MeasurementDelta(BaseModel):
    current: float
    previous: float


class BodyMeasurementsCardResponse(BaseModel):
    chest: Optional[MeasurementDelta] = None
    waist: Optional[MeasurementDelta] = None
    hips: Optional[MeasurementDelta] = None
    biceps: Optional[MeasurementDelta] = None
    thighs: Optional[MeasurementDelta] = None
    shoulders: Optional[MeasurementDelta] = None
    updated_at: Optional[str] = None


class ProgressDashboardResponse(BaseModel):
    latest_measurements: Optional[BodyMeasurementResponse] = None
    streak: StreakResponse
    monthly_summary: MonthlySummaryCardResponse
    recent_achievements: List[UserAchievementResponse]


# 4. Comprehensive Progress Tracking (multi-metric timeseries)

class ComprehensiveProgressPoint(BaseModel):
    """Single day of aggregated progress across all metrics"""
    date: str  # ISO-8601 date string
    weight: Optional[float] = Field(None, description="Body weight in kg")
    workout_sessions: int = Field(default=0, description="Number of workout sessions")
    workout_calories: float = Field(default=0.0, description="Total calories burned in workouts")
    workout_duration_minutes: int = Field(default=0, description="Total workout duration in minutes")
    diet_calories_consumed: float = Field(default=0.0, description="Total calories consumed from food")
    diet_macros_protein: float = Field(default=0.0, description="Protein in grams")
    diet_macros_carbs: float = Field(default=0.0, description="Carbs in grams")
    diet_macros_fat: float = Field(default=0.0, description="Fat in grams")
    hydration_ml: int = Field(default=0, description="Total hydration in milliliters")
    goals_completed: int = Field(default=0, description="Goals completed on this day")
    goals_total: int = Field(default=0, description="Total active goals")
    measurement_logged: bool = Field(default=False, description="Body measurement recorded")


class ComprehensiveProgressResponse(BaseModel):
    """Complete progress tracking over a timeframe"""
    timeframe: str = Field(..., description="'1_month', '3_months', '6_months', '1_year'")
    data: List[ComprehensiveProgressPoint]
    summary: dict = Field(
        default_factory=dict,
        description="Aggregated stats for the timeframe (total workouts, total calories, etc.)"
    )
