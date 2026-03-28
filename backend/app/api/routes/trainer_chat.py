from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.trainer_chat import (
    TrainerChatConversationCreate,
    TrainerChatConversationDetailRead,
    TrainerChatConversationRead,
    TrainerChatConversationUpdate,
    TrainerChatMessageCreate,
    TrainerChatMessageCreateResponse,
    TrainerChatMessageFeedbackUpdate,
    TrainerChatMessageRead,
    TrainerChatMessageRequestRead,
)
from app.services.trainer_chat_service import trainer_chat_service
from celery_worker.tasks.trainer_chat_tasks import process_trainer_chat_response

router = APIRouter(prefix="/trainer-chat", tags=["trainer-chat"])


@router.post("/conversations", response_model=TrainerChatConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: TrainerChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = trainer_chat_service.create_conversation(db, current_user.id, payload.title)
    return conversation
    


@router.get("/conversations", response_model=list[TrainerChatConversationRead])
def list_conversations(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = trainer_chat_service.list_conversations(
        db,
        current_user.id,
        q=q,
        limit=limit,
        offset=offset,
    )
    return rows


@router.get("/conversations/{conversation_id}", response_model=TrainerChatConversationDetailRead)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = trainer_chat_service.get_conversation(db, current_user.id, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = trainer_chat_service.list_messages(db, current_user.id, conversation_id) or []
    return {
        "id": conversation.id,
        "title": conversation.title,
        "preview": conversation.preview,
        "pinned": conversation.pinned,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": messages,
    }


@router.post("/conversations/{conversation_id}/messages", response_model=TrainerChatMessageCreateResponse)
def create_message(
    conversation_id: int,
    payload: TrainerChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation, user_message = trainer_chat_service.add_user_message(
        db,
        current_user.id,
        conversation_id,
        text=payload.text,
        image_data=payload.image_data,
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message text is required")

    task_id = str(uuid4())
    request = trainer_chat_service.create_message_request(
        db,
        conversation.id,
        user_message.id,
        task_id,
    )

    process_trainer_chat_response.apply_async(
        args=(current_user.id, conversation.id, user_message.id),
        task_id=task_id,
    )

    return {
        "conversation_id": conversation.id,
        "user_message": user_message,
        "request": {
            "request_id": request.id,
            "task_id": request.task_id,
            "status": request.status,
            "error_text": request.error_text,
            "assistant_message": None,
        },
    }


@router.get("/conversations/{conversation_id}/messages/status", response_model=TrainerChatMessageRequestRead)
def get_message_status(
    conversation_id: int,
    request_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = trainer_chat_service.get_request(db, current_user.id, conversation_id, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Message request not found")

    assistant_message = req.assistant_message
    return {
        "request_id": req.id,
        "task_id": req.task_id,
        "status": req.status,
        "error_text": req.error_text,
        "assistant_message": assistant_message,
    }


@router.patch("/conversations/{conversation_id}", response_model=TrainerChatConversationRead)
def update_conversation(
    conversation_id: int,
    payload: TrainerChatConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = trainer_chat_service.update_conversation(
        db,
        current_user.id,
        conversation_id,
        title=payload.title,
        pinned=payload.pinned,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return updated


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = trainer_chat_service.delete_conversation(db, current_user.id, conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return None


@router.patch("/messages/{message_id}/feedback", response_model=TrainerChatMessageRead)
def update_message_feedback(
    message_id: int,
    payload: TrainerChatMessageFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = trainer_chat_service.update_feedback(db, current_user.id, message_id, payload.liked)
    if not updated:
        raise HTTPException(status_code=404, detail="Message not found")
    return updated
