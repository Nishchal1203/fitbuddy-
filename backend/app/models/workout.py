from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Text, Integer, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
	from app.models.user import User
	from app.models.goal import Goal


class WorkoutSession(Base):
	__tablename__ = "workout_sessions"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	title: Mapped[str] = mapped_column(String(255), nullable=False)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
	performed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
	# duration in minutes
	duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
	# exercises performed in this workout session (stored as JSON)
	exercises: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
	# calories burned during this workout session
	calories_burned: Mapped[float | None] = mapped_column(nullable=True)

	owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
	owner: Mapped[User] = relationship(back_populates="workouts")


class Workout(Base):
	__tablename__ = "workouts"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	title: Mapped[str] = mapped_column(String(255), nullable=False)
	description: Mapped[str | None] = mapped_column(Text, nullable=True)
	exercises: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
	# Plan categorization
	level: Mapped[str | None] = mapped_column(String(50), nullable=True)
	duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

	# If NULL => system plan; else user-specific plan
	owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
	owner: Mapped[User] = relationship(back_populates="workout_plans")
	
	# Goal relationship for custom plans
	goal_id: Mapped[int | None] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=True)
	goal: Mapped["Goal | None"] = relationship(back_populates="custom_plans")
	
	# Plan completion tracking
	is_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
	completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

	followers: Mapped[list[WorkoutPlanFollow]] = relationship(
		back_populates="workout",
		cascade="all, delete-orphan",
	)


class WorkoutPlanFollow(Base):
	__tablename__ = "workout_plan_follows"
	__table_args__ = (
		UniqueConstraint("user_id", "workout_id", name="uq_workout_plan_follows_user_workout"),
	)

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
	workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id", ondelete="CASCADE"), index=True, nullable=False)
	start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

	user: Mapped[User] = relationship(back_populates="followed_workout_plans")
	workout: Mapped[Workout] = relationship(back_populates="followers")

