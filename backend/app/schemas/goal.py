from datetime import date
from pydantic import BaseModel


class GoalBase(BaseModel):
	title: str
	description: str | None = None
	target_date: date | None = None
	is_completed: bool = False

	model_config = {"from_attributes": True}


class GoalCreate(GoalBase):
	pass


class GoalUpdate(BaseModel):
	title: str | None = None
	description: str | None = None
	target_date: date | None = None
	is_completed: bool | None = None


class GoalRead(GoalBase):
	id: int

