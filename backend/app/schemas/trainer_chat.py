from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TrainerChatConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class TrainerChatConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    pinned: bool | None = None


class TrainerChatMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    image_data: str | None = Field(default=None, max_length=2_000_000)


class TrainerChatMessageFeedbackUpdate(BaseModel):
    liked: bool | None = None


class TrainerChatMessageRead(BaseModel):
    id: int
    role: str
    text: str
    image_data: str | None
    liked: bool | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainerChatConversationRead(BaseModel):
    id: int
    title: str
    preview: str
    pinned: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrainerChatConversationDetailRead(TrainerChatConversationRead):
    messages: list[TrainerChatMessageRead]


class TrainerChatMessageRequestRead(BaseModel):
    request_id: int
    task_id: str
    status: str
    error_text: str | None
    assistant_message: TrainerChatMessageRead | None


class TrainerChatMessageCreateResponse(BaseModel):
    conversation_id: int
    user_message: TrainerChatMessageRead
    request: TrainerChatMessageRequestRead
