from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
	from app.models.user import User


class Exercise(Base):
	__tablename__ = "exercises"

	id: Mapped[int] = mapped_column(primary_key=True, index=True)
	name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
	category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
	description: Mapped[str | None] = mapped_column(Text, nullable=True)

	# If NULL => system exercise
	owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
	owner: Mapped[User | None] = relationship(back_populates="exercises")
