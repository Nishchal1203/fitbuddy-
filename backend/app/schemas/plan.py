from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class PlanBase(BaseModel):
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    duration_days: Optional[int] = None


class PlanCreate(PlanBase):
    pass


class PlanExerciseItem(BaseModel):
    exercise_id: Optional[int] = None
    name: str
    category: str
    sets: Optional[int | str] = None
    reps: Optional[int | str] = None
    rest: Optional[str] = None
    time: Optional[int | str] = None
    duration: Optional[int | str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    instructions: Optional[str] = None


class CustomPlanCreate(PlanBase):
    exercises: list[PlanExerciseItem]


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    duration_days: Optional[int] = None


class PlanRead(PlanBase):
    id: int
    created_at: datetime
    owner_id: Optional[int] = None
    goal_id: Optional[int] = None
    is_completed: bool = False
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SavedPlanCreate(BaseModel):
    workout_id: int


class SavedPlanRead(BaseModel):
    id: int
    user_id: int
    workout_id: int
    start_date: Optional[datetime] = None

    model_config = {"from_attributes": True}
