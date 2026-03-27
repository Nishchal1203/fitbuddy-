from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    food_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    emoji: Mapped[str | None] = mapped_column(String(12), nullable=True)

    kcal_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    protein_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    carbs_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fat_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner: Mapped[User | None] = relationship(back_populates="food_items")
    meal_logs: Mapped[list[MealLog]] = relationship(back_populates="food_item")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    section: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    food_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("food_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    grams: Mapped[float] = mapped_column(Float, nullable=False)
    kcal: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    owner: Mapped[User] = relationship(back_populates="meal_logs")
    food_item: Mapped[FoodItem | None] = relationship(back_populates="meal_logs")


class HydrationLog(Base):
    __tablename__ = "hydration_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    owner: Mapped[User] = relationship(back_populates="hydration_logs")


class NutritionGoal(Base):
    __tablename__ = "nutrition_goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    daily_calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    hydration_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=2500)
    diet_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    restrictions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,
    )
    owner: Mapped[User] = relationship(back_populates="nutrition_goal")


class AICoachInsight(Base):
    __tablename__ = "ai_coach_insights"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String(255), nullable=False)
    actions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    owner: Mapped[User] = relationship(back_populates="coach_insights")


class AIDietPlan(Base):
    __tablename__ = "ai_diet_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="AI Diet Plan")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    suggestions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    action_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    owner: Mapped[User] = relationship(back_populates="ai_diet_plans")
