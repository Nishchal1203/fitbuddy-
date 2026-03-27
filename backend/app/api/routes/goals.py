from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.models.workout import Workout
from app.schemas.goal import AIGoalDraftCreate, AIGoalDraftResponse, GoalCreate, GoalRead, GoalUpdate
from app.services.rabbitmq_service import rabbitmq_service
from app.services.redis_service import redis_service
from app.services.ai.goal_ai_service import goal_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("/ai-draft", response_model=AIGoalDraftResponse)
def generate_goal_draft(
	payload: AIGoalDraftCreate,
	current_user: User = Depends(get_current_user),
):
	ai_result = goal_ai_service.generate_goal_draft(
		prompt=payload.prompt,
		user_context=payload.user_context,
	)

	summary = str(ai_result.get("summary") or "Goal draft generated from your vision.")
	suggestions = ai_result.get("suggestions")
	if not isinstance(suggestions, list) or len(suggestions) == 0:
		suggestions = [
			"Set one measurable weekly checkpoint.",
			"Keep a fixed review day every week.",
			"Track trend, not just one-day numbers.",
		]

	recommended_goal = ai_result.get("recommended_goal")
	if not isinstance(recommended_goal, dict):
		recommended_goal = {
			"title": "AI Vision Goal",
			"category": "Fitness",
			"current_value": 0,
			"target_value": 100,
			"target_unit": "points",
			"duration_days": 45,
			"description": "A clear measurable goal generated from your vision.",
		}

	return {
		"summary": summary,
		"suggestions": suggestions,
		"recommended_goal": recommended_goal,
		"source": str(ai_result.get("source") or "fallback"),
	}


@router.post("/", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	goal = Goal(
		title=payload.title,
		description=payload.description,
		target_date=payload.target_date,
		is_completed=payload.is_completed,
		owner_id=current_user.id,
	)
	db.add(goal)
	db.commit()
	db.refresh(goal)

	# Cache the goal data
	cache_goal_data(goal, current_user.id)
	
	# Invalidate user's goal cache
	invalidate_user_goal_cache(current_user.id)

	return goal


@router.get("/", response_model=list[GoalRead])
def list_goals(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	include_completed: bool = True
):
	# Check cache first
	cache_key = f"goals:user:{current_user.id}:completed:{include_completed}"
	cached_goals = redis_service.get(cache_key)
	
	if cached_goals:
		logger.info(f"Retrieved cached goals for user {current_user.id}")
		return cached_goals
	
	# Build query
	query = select(Goal).where(Goal.owner_id == current_user.id)
	if not include_completed:
		query = query.where(Goal.is_completed == False)
	
	rows = db.execute(query.order_by(Goal.id.desc())).scalars().all()
	
	# Cache the results
	redis_service.set(cache_key, rows, expire=600)  # 10 minutes
	
	return rows


@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	# Check cache first
	cache_key = f"goal:{goal_id}:user:{current_user.id}"
	cached_goal = redis_service.get(cache_key)
	
	if cached_goal:
		logger.info(f"Retrieved cached goal {goal_id}")
		return cached_goal
	
	# If not cached, fetch from database
	goal = db.get(Goal, goal_id)
	if not goal or goal.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Goal not found")
	
	# Cache the goal
	redis_service.set(cache_key, goal, expire=600)  # 10 minutes
	
	return goal


@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	goal = db.get(Goal, goal_id)
	if not goal or goal.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Goal not found")
	
	# Check if goal is being marked as completed
	was_completed = goal.is_completed
	data = payload.model_dump(exclude_unset=True)
	is_being_completed = data.get('is_completed', False)
	
	# Update goal
	for k, v in data.items():
		setattr(goal, k, v)
	
	# If goal is being marked as completed, delete the associated custom plans
	if not was_completed and is_being_completed:
		# Find all custom plans created for this goal
		custom_plans = db.execute(
			select(Workout).where(Workout.goal_id == goal_id)
		).scalars().all()
		
		# Delete all custom plans associated with this goal
		for plan in custom_plans:
			db.delete(plan)
			logger.info(f"🗑️ Deleted custom plan {plan.id} for completed goal {goal_id}")
		
		if not custom_plans:
			logger.info(f"ℹ️ No custom plans found for goal {goal_id}")
	
	db.add(goal)
	db.commit()
	db.refresh(goal)
	
	# Invalidate cache
	invalidate_goal_cache(goal_id, current_user.id)
	
	# Queue goal progress update if completion status changed
	if was_completed != is_being_completed:
		rabbitmq_service.publish_goal_reminder(
			user_id=current_user.id,
			goal_id=goal_id,
			reminder_type="goal_completed" if is_being_completed else "goal_reopened"
		)
	
	return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	goal = db.get(Goal, goal_id)
	if not goal or goal.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Goal not found")
	
	# Invalidate cache before deletion
	invalidate_goal_cache(goal_id, current_user.id)
	
	db.delete(goal)
	db.commit()
	return None


@router.get("/stats/summary", response_model=dict)
def get_goal_summary(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	"""Get goal summary statistics for the user."""
	# Check cache first
	cache_key = f"goal_summary:user:{current_user.id}"
	cached_summary = redis_service.get(cache_key)
	
	if cached_summary:
		logger.info(f"Retrieved cached goal summary for user {current_user.id}")
		return cached_summary
	
	# Get all goals for user
	goals = db.execute(
		select(Goal).where(Goal.owner_id == current_user.id)
	).scalars().all()
	
	# Calculate statistics
	total_goals = len(goals)
	completed_goals = [g for g in goals if g.is_completed]
	active_goals = [g for g in goals if not g.is_completed]
	
	# Calculate completion rate
	completion_rate = len(completed_goals) / max(total_goals, 1) * 100
	
	# Calculate overdue goals
	today = datetime.now().date()
	overdue_goals = [g for g in active_goals if g.target_date and g.target_date < today]
	
	# Calculate upcoming deadlines (next 7 days)
	next_week = today + timedelta(days=7)
	upcoming_deadlines = [g for g in active_goals if g.target_date and today <= g.target_date <= next_week]
	
	summary = {
		"total_goals": total_goals,
		"completed_goals": len(completed_goals),
		"active_goals": len(active_goals),
		"overdue_goals": len(overdue_goals),
		"upcoming_deadlines": len(upcoming_deadlines),
		"completion_rate": round(completion_rate, 2),
		"generated_at": datetime.now().isoformat()
	}
	
	# Cache the summary
	redis_service.set(cache_key, summary, expire=1800)  # 30 minutes
	
	return summary


@router.post("/{goal_id}/trigger-analysis")
def trigger_goal_analysis(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	"""Manually trigger goal analysis for a specific goal."""
	goal = db.get(Goal, goal_id)
	if not goal or goal.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Goal not found")
	
	# Queue goal progress update
	success = rabbitmq_service.publish_goal_reminder(
		user_id=current_user.id,
		goal_id=goal_id,
		reminder_type="manual_analysis"
	)
	
	if success:
		return {"message": "Goal analysis queued successfully", "goal_id": goal_id}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue goal analysis")


@router.post("/trigger-deadline-check")
def trigger_deadline_check(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	"""Manually trigger deadline check for all user goals."""
	# This would typically be done by the scheduled task, but we can trigger it manually
	success = rabbitmq_service.publish_goal_reminder(
		user_id=current_user.id,
		goal_id=0,  # 0 indicates check all goals
		reminder_type="manual_deadline_check"
	)
	
	if success:
		return {"message": "Deadline check queued successfully", "user_id": current_user.id}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue deadline check")


def cache_goal_data(goal: Goal, user_id: int):
	"""Cache goal data for quick access."""
	goal_data = {
		"id": goal.id,
		"title": goal.title,
		"description": goal.description,
		"target_date": goal.target_date.isoformat() if goal.target_date else None,
		"is_completed": goal.is_completed,
		"user_id": user_id
	}
	
	cache_key = f"goal:{goal.id}:user:{user_id}"
	redis_service.set(cache_key, goal_data, expire=600)  # 10 minutes


def invalidate_goal_cache(goal_id: int, user_id: int):
	"""Invalidate cached goal data."""
	cache_keys = [
		f"goal:{goal_id}:user:{user_id}",
		f"goals:user:{user_id}:*",
		f"goal_summary:user:{user_id}"
	]
	
	for key_pattern in cache_keys:
		redis_service.delete(key_pattern)


def invalidate_user_goal_cache(user_id: int):
	"""Invalidate all goal-related cache for a user."""
	cache_keys = [
		f"goals:user:{user_id}:*",
		f"goal_summary:user:{user_id}"
	]
	
	for key_pattern in cache_keys:
		redis_service.delete(key_pattern)

