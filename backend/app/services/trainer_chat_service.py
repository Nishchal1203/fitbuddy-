from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.nutrition import NutritionGoal
from app.models.trainer_chat import (
    TrainerChatConversation,
    TrainerChatMessage,
    TrainerChatMessageRequest,
)
from app.models.user import User
from app.models.workout import WorkoutSession


def _build_title(text: str) -> str:
    clean = text.strip()
    return (clean[:40].strip() + "...") if len(clean) > 40 else (clean or "New Chat")


def _build_preview(text: str) -> str:
    clean = text.replace("**", "").strip()
    return (clean[:80].strip() + "...") if len(clean) > 80 else clean


class TrainerChatService:
    def create_conversation(self, db: Session, user_id: int, title: str | None = None) -> TrainerChatConversation:
        conversation = TrainerChatConversation(
            owner_id=user_id,
            title=(title or "New Chat").strip()[:255] or "New Chat",
            preview="",
            pinned=False,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    def list_conversations(
        self,
        db: Session,
        user_id: int,
        *,
        q: str | None,
        limit: int,
        offset: int,
    ) -> list[TrainerChatConversation]:
        query = select(TrainerChatConversation).where(TrainerChatConversation.owner_id == user_id)
        if q:
            like = f"%{q.strip()}%"
            query = query.where(
                or_(
                    TrainerChatConversation.title.ilike(like),
                    TrainerChatConversation.preview.ilike(like),
                )
            )

        query = query.order_by(
            TrainerChatConversation.pinned.desc(),
            TrainerChatConversation.updated_at.desc(),
            TrainerChatConversation.id.desc(),
        ).offset(max(0, offset)).limit(max(1, min(limit, 100)))

        return list(db.execute(query).scalars().all())

    def get_conversation(self, db: Session, user_id: int, conversation_id: int) -> TrainerChatConversation | None:
        conversation = db.get(TrainerChatConversation, conversation_id)
        if not conversation or conversation.owner_id != user_id:
            return None
        return conversation

    def delete_conversation(self, db: Session, user_id: int, conversation_id: int) -> bool:
        conversation = self.get_conversation(db, user_id, conversation_id)
        if not conversation:
            return False
        db.delete(conversation)
        db.commit()
        return True

    def update_conversation(
        self,
        db: Session,
        user_id: int,
        conversation_id: int,
        *,
        title: str | None,
        pinned: bool | None,
    ) -> TrainerChatConversation | None:
        conversation = self.get_conversation(db, user_id, conversation_id)
        if not conversation:
            return None

        if title is not None:
            trimmed = title.strip()
            if trimmed:
                conversation.title = trimmed[:255]
        if pinned is not None:
            conversation.pinned = pinned

        conversation.updated_at = datetime.utcnow()
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    def add_user_message(
        self,
        db: Session,
        user_id: int,
        conversation_id: int,
        *,
        text: str,
        image_data: str | None,
    ) -> tuple[TrainerChatConversation | None, TrainerChatMessage | None]:
        conversation = self.get_conversation(db, user_id, conversation_id)
        if not conversation:
            return None, None

        clean_text = text.strip()
        if not clean_text:
            return conversation, None

        message = TrainerChatMessage(
            conversation_id=conversation.id,
            role="user",
            text=clean_text,
            image_data=image_data,
            liked=None,
        )
        db.add(message)
        db.flush()

        if conversation.preview.strip() == "":
            conversation.title = _build_title(clean_text)

        conversation.preview = _build_preview(clean_text)
        conversation.updated_at = datetime.utcnow()
        db.add(conversation)
        db.commit()
        db.refresh(message)
        db.refresh(conversation)
        return conversation, message

    def create_message_request(
        self,
        db: Session,
        conversation_id: int,
        user_message_id: int,
        task_id: str,
    ) -> TrainerChatMessageRequest:
        request = TrainerChatMessageRequest(
            conversation_id=conversation_id,
            user_message_id=user_message_id,
            task_id=task_id,
            status="queued",
            error_text=None,
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        return request

    def get_request(
        self,
        db: Session,
        user_id: int,
        conversation_id: int,
        request_id: int,
    ) -> TrainerChatMessageRequest | None:
        conversation = self.get_conversation(db, user_id, conversation_id)
        if not conversation:
            return None
        request = db.get(TrainerChatMessageRequest, request_id)
        if not request or request.conversation_id != conversation.id:
            return None
        return request

    def update_feedback(
        self,
        db: Session,
        user_id: int,
        message_id: int,
        liked: bool | None,
    ) -> TrainerChatMessage | None:
        message = db.get(TrainerChatMessage, message_id)
        if not message:
            return None
        conversation = db.get(TrainerChatConversation, message.conversation_id)
        if not conversation or conversation.owner_id != user_id:
            return None
        message.liked = liked
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    def list_messages(
        self,
        db: Session,
        user_id: int,
        conversation_id: int,
    ) -> list[TrainerChatMessage] | None:
        conversation = self.get_conversation(db, user_id, conversation_id)
        if not conversation:
            return None

        query = (
            select(TrainerChatMessage)
            .where(TrainerChatMessage.conversation_id == conversation_id)
            .order_by(TrainerChatMessage.created_at.asc(), TrainerChatMessage.id.asc())
        )
        return list(db.execute(query).scalars().all())

    def build_user_context(self, db: Session, user_id: int, conversation_id: int | None = None) -> dict[str, Any]:
        """
        Build user context for the AI coach.
        
        If conversation_id is provided, only extract context from that specific conversation.
        Otherwise, use global user profile data (fallback for backward compatibility).
        """
        # Always get user's basic profile info
        user = db.get(User, user_id) if user_id else None
        name = getattr(user, "full_name", None) or ""
        age = getattr(user, "age", None) or ""
        weight_kg = getattr(user, "weight_kg", None) or ""
        height_cm = getattr(user, "height_cm", None) or ""
        experience_level = getattr(user, "experience_level", "intermediate") or "intermediate"
        
        # If conversation_id provided, extract context ONLY from that conversation
        if conversation_id:
            messages = list(db.execute(
                select(TrainerChatMessage)
                .where(TrainerChatMessage.conversation_id == conversation_id)
                .order_by(TrainerChatMessage.created_at.asc())
            ).scalars().all())
            
            # Extract conversation-specific context from previous messages
            conversation_text = "\n".join([f"{m.role.upper()}: {m.text}" for m in messages if m.text])
            
            # Only include goals/workouts/nutrition if they were explicitly discussed
            goals_summary = "No goals discussed in this conversation"
            recent_workouts_summary = "No workouts mentioned in this conversation"
            nutrition_summary = "No nutrition info discussed in this conversation"
            injuries = "None reported in this conversation"
            
            # Simple keyword matching to detect if topics were discussed
            lower_text = conversation_text.lower()
            if any(kw in lower_text for kw in ["goal", "target", "want to", "trying to", "aiming"]):
                # Extract from conversation or from user profile if mentioned
                goals = db.execute(
                    select(Goal)
                    .where(Goal.owner_id == user_id)
                    .order_by(Goal.id.desc())
                    .limit(3)
                ).scalars().all()
                if goals:
                    goals_summary = ", ".join([g.title for g in goals])
            
            if any(kw in lower_text for kw in ["workout", "train", "exercise", "lift", "cardio"]):
                workouts = db.execute(
                    select(WorkoutSession)
                    .where(WorkoutSession.owner_id == user_id)
                    .order_by(WorkoutSession.performed_at.desc())
                    .limit(3)
                ).scalars().all()
                if workouts:
                    workout_titles = [w.title for w in workouts if w.title]
                    recent_workouts_summary = ", ".join(workout_titles) if workout_titles else "No titled workouts"
            
            if any(kw in lower_text for kw in ["eat", "food", "diet", "nutrition", "meal", "calorie", "macro", "protein"]):
                nutrition_goal = db.execute(
                    select(NutritionGoal).where(NutritionGoal.owner_id == user_id)
                ).scalar_one_or_none()
                if nutrition_goal:
                    nutrition_summary = (
                        f"Target kcal: {nutrition_goal.daily_calories}, protein: {nutrition_goal.protein_g}g, "
                        f"carbs: {nutrition_goal.carbs_g}g, fat: {nutrition_goal.fat_g}g"
                    )
            
            if any(kw in lower_text for kw in ["injury", "pain", "hurt", "sore", "issue", "problem"]):
                injuries = "Injuries may have been discussed - check conversation history"
        else:
            # Fallback: use global profile data (for backward compatibility)
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
                .order_by(Goal.id.desc())
                .limit(5)
            ).scalars().all()
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .order_by(WorkoutSession.performed_at.desc())
                .limit(5)
            ).scalars().all()
            nutrition_goal = db.execute(
                select(NutritionGoal).where(NutritionGoal.owner_id == user_id)
            ).scalar_one_or_none()

            goals_summary = ", ".join([g.title for g in goals]) if goals else "No active goals"
            workout_titles = [w.title for w in workouts if w.title]
            recent_workouts_summary = ", ".join(workout_titles) if workout_titles else "No logged workouts"
            nutrition_summary = (
                f"Target kcal: {nutrition_goal.daily_calories}, protein: {nutrition_goal.protein_g}g, "
                f"carbs: {nutrition_goal.carbs_g}g, fat: {nutrition_goal.fat_g}g"
            ) if nutrition_goal else "No nutrition goal"
            injuries = "None reported"

        return {
            "name": name,
            "age": age,
            "weight_kg": weight_kg,
            "height_cm": height_cm,
            "experience_level": experience_level,
            "goals_summary": goals_summary,
            "recent_workouts_summary": recent_workouts_summary,
            "nutrition_summary": nutrition_summary,
            "injuries": injuries,
        }

    def build_conversation_history(self, db: Session, conversation_id: int, limit: int = 20) -> list[dict[str, str]]:
        query = (
            select(TrainerChatMessage)
            .where(TrainerChatMessage.conversation_id == conversation_id)
            .order_by(TrainerChatMessage.created_at.desc(), TrainerChatMessage.id.desc())
            .limit(max(1, limit))
        )
        rows = list(db.execute(query).scalars().all())
        rows.reverse()
        return [{"role": row.role, "text": row.text} for row in rows]


trainer_chat_service = TrainerChatService()
