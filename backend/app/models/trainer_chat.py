from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


class TrainerChatConversation(Base):
    __tablename__ = "trainer_chat_conversations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Chat")
    preview: Mapped[str] = mapped_column(String(600), nullable=False, default="")
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        index=True,
    )

    owner: Mapped[User] = relationship(back_populates="trainer_chat_conversations")
    messages: Mapped[list[TrainerChatMessage]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    message_requests: Mapped[list[TrainerChatMessageRequest]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class TrainerChatMessage(Base):
    __tablename__ = "trainer_chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("trainer_chat_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    image_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    liked: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    conversation: Mapped[TrainerChatConversation] = relationship(back_populates="messages")


class TrainerChatMessageRequest(Base):
    __tablename__ = "trainer_chat_message_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("trainer_chat_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_message_id: Mapped[int] = mapped_column(
        ForeignKey("trainer_chat_messages.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    assistant_message_id: Mapped[int | None] = mapped_column(
        ForeignKey("trainer_chat_messages.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    task_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued", index=True)
    error_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    conversation: Mapped[TrainerChatConversation] = relationship(back_populates="message_requests")
    user_message: Mapped[TrainerChatMessage] = relationship(
        foreign_keys=[user_message_id],
    )
    assistant_message: Mapped[TrainerChatMessage | None] = relationship(
        foreign_keys=[assistant_message_id],
    )
