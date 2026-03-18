from datetime import date
from typing import Optional
from pydantic import BaseModel

class ProgressBase(BaseModel):
	date: date
	metric_name: str
	metric_value: float
	unit: str | None = None

	model_config = {"from_attributes": True}


class ProgressCreate(ProgressBase):
	pass


class ProgressUpdate(BaseModel):
	date: Optional[date] = None
	metric_name: str | None = None
	metric_value: float | None = None
	unit: str | None = None


class ProgressRead(ProgressBase):
	id: int

