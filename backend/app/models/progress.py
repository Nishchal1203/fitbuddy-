from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Date, Float, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"
    __table_args__ = (
        UniqueConstraint("owner_id", "date", name="uq_body_measurements_owner_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    
    # Core Metrics
    weight: Mapped[float | None] = mapped_column(Float, nullable=True) # in kg/lbs
    body_fat_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Specific Body Measurements (in cm/inches)
    chest: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist: Mapped[float | None] = mapped_column(Float, nullable=True)
    arms: Mapped[float | None] = mapped_column(Float, nullable=True)
    legs: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    owner: Mapped[User] = relationship(back_populates="measurements")


class UserAchievement(Base):
    """
    Tracks unlocked badges for the AchievementBadges component.
    """
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    badge_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # e.g., "7_DAY_STREAK", "100_WORKOUTS"
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    user: Mapped[User] = relationship(back_populates="achievements")