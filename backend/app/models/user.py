from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
	from app.models.exercise import Exercise
	from app.models.workout import WorkoutSession, Workout, WorkoutPlanFollow
	from app.models.goal import Goal
	from app.models.progress import BodyMeasurement, UserAchievement
	from app.models.nutrition import (
		FoodItem,
		MealLog,
		HydrationLog,
		NutritionGoal,
		AICoachInsight,
		AIDietPlan,
	)
	from app.models.trainer_chat import (
		TrainerChatConversation,
	)


class User(Base):
	__tablename__ = "users"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
	full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
	password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
	experience_level: Mapped[str | None] = mapped_column(String(255), nullable=True)
	auth_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="local")
	google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)

	exercises: Mapped[list[Exercise]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	workouts: Mapped[list[WorkoutSession]] = relationship(back_populates="owner" , cascade="all, delete-orphan")
	workout_plans: Mapped[list[Workout]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	followed_workout_plans: Mapped[list[WorkoutPlanFollow]] = relationship(back_populates="user", cascade="all, delete-orphan")
	goals: Mapped[list[Goal]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	food_items: Mapped[list[FoodItem]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	meal_logs: Mapped[list[MealLog]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	hydration_logs: Mapped[list[HydrationLog]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	nutrition_goal: Mapped[NutritionGoal | None] = relationship(back_populates="owner", uselist=False, cascade="all, delete-orphan")
	coach_insights: Mapped[list[AICoachInsight]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	ai_diet_plans: Mapped[list[AIDietPlan]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	trainer_chat_conversations: Mapped[list[TrainerChatConversation]] = relationship(
		back_populates="owner",
		cascade="all, delete-orphan",
		
	)
	measurements: Mapped[list["BodyMeasurement"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
	achievements: Mapped[list["UserAchievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")

