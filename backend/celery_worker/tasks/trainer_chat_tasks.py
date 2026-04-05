from __future__ import annotations

import logging

from sqlalchemy import select

from app.models.trainer_chat import TrainerChatMessage, TrainerChatMessageRequest
from app.services.ai.trainer_chat_ai_service import trainer_chat_ai_service
from app.services.trainer_chat_service import trainer_chat_service
from app.db.session import SessionLocal
from celery_worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="celery_worker.tasks.trainer_chat_tasks.process_trainer_chat_response")
def process_trainer_chat_response(self, user_id: int, conversation_id: int, user_message_id: int):
    db = SessionLocal()
    try:
        req = db.execute(
            select(TrainerChatMessageRequest)
            .where(TrainerChatMessageRequest.task_id == self.request.id)
        ).scalar_one_or_none()

        if req:
            req.status = "processing"
            req.error_text = None
            db.add(req)
            db.commit()

        user_message = db.get(TrainerChatMessage, user_message_id)
        if not user_message:
            raise ValueError("User message not found")

        # Build context ONLY from current conversation (don't pollute with global user data)
        context = trainer_chat_service.build_user_context(db, user_id, conversation_id=conversation_id)
        history = trainer_chat_service.build_conversation_history(db, conversation_id, limit=24)

        ai_result = trainer_chat_ai_service.generate_reply(
            user_prompt=user_message.text,
            conversation_history=history,
            user_context=context,
            has_image=bool(user_message.image_data),
        )

        assistant_text = str(ai_result.get("reply") or "I could not generate a response.")
        assistant_message = TrainerChatMessage(
            conversation_id=conversation_id,
            role="assistant",
            text=assistant_text,
            image_data=None,
            liked=None,
        )
        db.add(assistant_message)
        db.flush()

        conversation = trainer_chat_service.get_conversation(db, user_id, conversation_id)
        if conversation:
            conversation.preview = assistant_text[:80] + ("..." if len(assistant_text) > 80 else "")
            db.add(conversation)

        if req:
            req.status = "completed"
            req.error_text = None
            req.assistant_message_id = assistant_message.id
            db.add(req)

        db.commit()
        return {
            "status": "completed",
            "assistant_message_id": assistant_message.id,
        }
    except Exception as exc:
        logger.exception("trainer chat task failed")
        req = db.execute(
            select(TrainerChatMessageRequest)
            .where(TrainerChatMessageRequest.task_id == self.request.id)
        ).scalar_one_or_none()
        if req:
            req.status = "failed"
            req.error_text = str(exc)
            db.add(req)
            db.commit()
        return {
            "status": "failed",
            "error": str(exc),
        }
    finally:
        db.close()
