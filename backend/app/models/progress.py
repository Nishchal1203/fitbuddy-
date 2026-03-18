from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Date, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
	from app.models.user import User


class Progress(Base):
	__tablename__ = "progress_entries"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	date: Mapped[date] = mapped_column(Date, nullable=False)
	metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
	metric_value: Mapped[float] = mapped_column(Float, nullable=False)
	unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

	owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
	owner: Mapped[User] = relationship(back_populates="progress_entries")
