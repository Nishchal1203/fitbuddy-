from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class WorkoutBase(BaseModel):
	title: str
	notes: str | None = None
	performed_at: datetime | None = None
	duration_minutes: int | None = None
	exercises: List[Dict[str, Any]] | None = None
	calories_burned: float | None = None

	model_config = {"from_attributes": True}


class WorkoutCreate(WorkoutBase):
	pass


class WorkoutUpdate(BaseModel):
	title: str | None = None
	notes: str | None = None
	performed_at: datetime | None = None
	duration_minutes: int | None = None
	exercises: List[Dict[str, Any]] | None = None
	calories_burned: float | None = None


class WorkoutRead(WorkoutBase):
	id: int

