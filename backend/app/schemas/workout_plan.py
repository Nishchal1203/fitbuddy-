from datetime import datetime
from pydantic import BaseModel, Field


class PlanExerciseItem(BaseModel):
    exercise_id: int | None = None
    name: str
    category: str
    sets: int | str | None = None
    reps: int | str | None = None
    rest: str | None = None
    time: int | str | None = None
    duration: int | str | None = None
    duration_minutes: int | None = None
    notes: str | None = None
    instructions: str | None = None


class WorkoutPlanRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    level: str | None = None
    duration_days: int | None = None
    created_at: datetime
    owner_id: int | None = None
    goal_id: int | None = None
    is_completed: bool
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class FollowPlanRead(BaseModel):
    id: int
    user_id: int
    workout_id: int
    start_date: datetime

    model_config = {"from_attributes": True}


class ActivePlanEntryRead(BaseModel):
    plan: WorkoutPlanRead
    start_date: datetime | None = None


class CustomWorkoutPlanCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    level: str = Field(default="beginner", min_length=3, max_length=50)
    duration_days: int = Field(default=30, ge=7, le=365)
    focus: str | None = Field(default=None, max_length=255)
    exercises: list[PlanExerciseItem] = Field(default_factory=list)


class AIWorkoutDraftCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    level: str = Field(default="beginner", min_length=3, max_length=50)
    duration_days: int = Field(default=30, ge=7, le=365)
    focus: str | None = Field(default=None, max_length=255)
    ai_prompt: str = Field(min_length=8, max_length=3000)


class AIWorkoutDraftResponse(BaseModel):
    plan: WorkoutPlanRead
    ai_status: str
    ai_message: str


class PlanExercisesResponse(BaseModel):
    plan_id: int
    plan_title: str
    plan_level: str | None = None
    plan_duration: int | None = None
    exercises: list[PlanExerciseItem]
