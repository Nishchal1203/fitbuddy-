from celery_worker.celery_app import celery_app
from app.services.redis_service import redis_service
from app.db.session import SessionLocal
from app.models.user import User
from app.models.goal import Goal
from sqlalchemy import select, and_
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='celery_worker.tasks.goal_tasks.check_goal_deadlines')
def check_goal_deadlines(self):
    """
    Check all active goals for deadline reminders and send notifications.
    """
    try:
        logger.info("Starting goal deadline check")
        
        db = SessionLocal()
        
        try:
            # Get all active goals
            active_goals = db.execute(
                select(Goal)
                .where(Goal.is_completed == False)
                .where(Goal.target_date.isnot(None))
            ).scalars().all()
            
            today = datetime.now().date()
            reminders_sent = 0
            
            for goal in active_goals:
                if goal.target_date:
                    days_remaining = (goal.target_date - today).days
                    
                    # Send reminders based on days remaining
                    if days_remaining == 7:
                        send_goal_reminder.delay(goal.owner_id, goal.id, "deadline_approaching_7_days")
                        reminders_sent += 1
                    elif days_remaining == 3:
                        send_goal_reminder.delay(goal.owner_id, goal.id, "deadline_approaching_3_days")
                        reminders_sent += 1
                    elif days_remaining == 1:
                        send_goal_reminder.delay(goal.owner_id, goal.id, "deadline_approaching_1_day")
                        reminders_sent += 1
                    elif days_remaining < 0:
                        send_goal_reminder.delay(goal.owner_id, goal.id, "deadline_passed")
                        reminders_sent += 1
            
            logger.info(f"Goal deadline check completed. Sent {reminders_sent} reminders")
            
            return {
                "status": "success",
                "total_goals_checked": len(active_goals),
                "reminders_sent": reminders_sent,
                "checked_at": datetime.now().isoformat()
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error checking goal deadlines: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.goal_tasks.send_goal_reminder')
def send_goal_reminder(self, user_id: int, goal_id: int, reminder_type: str):
    """
    Send a goal reminder to a user.
    """
    try:
        logger.info(f"Sending {reminder_type} reminder for goal {goal_id} to user {user_id}")
        
        db = SessionLocal()
        
        try:
            # Get user and goal
            user = db.get(User, user_id)
            goal = db.get(Goal, goal_id)
            
            if not user or not goal:
                logger.error(f"User {user_id} or goal {goal_id} not found")
                return {"status": "error", "message": "User or goal not found"}
            
            # Create reminder message
            reminder_message = create_reminder_message(goal, reminder_type)
            
            # Store reminder in cache for potential email/notification system
            reminder_data = {
                "user_id": user_id,
                "goal_id": goal_id,
                "reminder_type": reminder_type,
                "message": reminder_message,
                "sent_at": datetime.now().isoformat(),
                "goal_title": goal.title,
                "target_date": goal.target_date.isoformat() if goal.target_date else None
            }
            
            # Cache the reminder
            cache_key = f"reminder:goal:{goal_id}:{reminder_type}:{datetime.now().date()}"
            redis_service.set(cache_key, reminder_data, expire=86400)  # 1 day
            
            # Log the reminder (in a real system, this would trigger email/SMS)
            logger.info(f"Reminder sent to user {user_id}: {reminder_message}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "goal_id": goal_id,
                "reminder_type": reminder_type,
                "message": reminder_message,
                "sent_at": datetime.now().isoformat()
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error sending goal reminder: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.goal_tasks.update_goal_progress')
def update_goal_progress(self, user_id: int, goal_id: int):
    """
    Update progress for a specific goal based on recent activity.
    """
    try:
        logger.info(f"Updating progress for goal {goal_id} of user {user_id}")
        
        db = SessionLocal()
        
        try:
            # Get goal
            goal = db.get(Goal, goal_id)
            if not goal:
                logger.error(f"Goal {goal_id} not found")
                return {"status": "error", "message": "Goal not found"}
            
            # Calculate progress based on goal type and recent activity
            progress_data = calculate_goal_progress(goal, db)
            
            # Update goal if needed
            if progress_data["is_completed"] and not goal.is_completed:
                goal.is_completed = True
                db.add(goal)
                db.commit()
                
                # Send completion notification
                send_goal_reminder.delay(user_id, goal_id, "goal_completed")
            
            # Cache progress data
            cache_key = f"goal_progress:{goal_id}"
            redis_service.set(cache_key, progress_data, expire=3600)  # 1 hour
            
            logger.info(f"Updated progress for goal {goal_id}")
            
            return {
                "status": "success",
                "goal_id": goal_id,
                "progress_data": progress_data
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error updating goal progress: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.goal_tasks.analyze_goal_performance')
def analyze_goal_performance(self, user_id: int):
    """
    Analyze goal performance for a user.
    """
    try:
        logger.info(f"Analyzing goal performance for user {user_id}")
        
        db = SessionLocal()
        
        try:
            # Get all goals for user
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
            ).scalars().all()
            
            if not goals:
                return {
                    "status": "success",
                    "user_id": user_id,
                    "analysis": {
                        "total_goals": 0,
                        "completed_goals": 0,
                        "completion_rate": 0,
                        "average_completion_time": 0
                    }
                }
            
            # Analyze goals
            completed_goals = [g for g in goals if g.is_completed]
            active_goals = [g for g in goals if not g.is_completed]
            
            # Calculate completion times
            completion_times = []
            for goal in completed_goals:
                if goal.target_date:
                    # Estimate completion time (simplified)
                    completion_times.append(30)  # Placeholder
            
            avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
            
            # Calculate success rate by deadline
            on_time_goals = 0
            for goal in completed_goals:
                if goal.target_date and goal.target_date >= datetime.now().date():
                    on_time_goals += 1
            
            analysis = {
                "user_id": user_id,
                "total_goals": len(goals),
                "completed_goals": len(completed_goals),
                "active_goals": len(active_goals),
                "completion_rate": len(completed_goals) / len(goals) * 100,
                "on_time_completion_rate": on_time_goals / max(len(completed_goals), 1) * 100,
                "average_completion_time_days": avg_completion_time,
                "goal_categories": categorize_goals(goals),
                "recommendations": generate_goal_recommendations(goals, completed_goals, active_goals)
            }
            
            # Cache the analysis
            cache_key = f"goal_analysis:user:{user_id}"
            redis_service.set(cache_key, analysis, expire=3600)  # 1 hour
            
            logger.info(f"Completed goal performance analysis for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "analysis": analysis
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error analyzing goal performance: {e}")
        return {"status": "error", "message": str(e)}

def create_reminder_message(goal: Goal, reminder_type: str) -> str:
    """Create appropriate reminder message based on type."""
    messages = {
        "deadline_approaching_7_days": f"Your goal '{goal.title}' is due in 7 days. Keep up the great work!",
        "deadline_approaching_3_days": f"Your goal '{goal.title}' is due in 3 days. You're almost there!",
        "deadline_approaching_1_day": f"Your goal '{goal.title}' is due tomorrow. Finish strong!",
        "deadline_passed": f"Your goal '{goal.title}' deadline has passed. Consider extending or creating a new goal.",
        "goal_completed": f"Congratulations! You've completed your goal '{goal.title}'!"
    }
    
    return messages.get(reminder_type, f"Reminder about your goal '{goal.title}'")

def calculate_goal_progress(goal: Goal, db) -> Dict[str, Any]:
    """Calculate progress for a goal based on recent activity."""
    # This is a simplified implementation
    # In a real system, you'd analyze workout data, measurements, etc.
    
    progress_percentage = 0
    is_completed = False
    
    # Simple logic based on goal age and completion status
    if goal.is_completed:
        progress_percentage = 100
        is_completed = True
    elif goal.target_date:
        days_since_created = (datetime.now().date() - goal.created_at.date()).days
        days_to_target = (goal.target_date - goal.created_at.date()).days
        
        if days_to_target > 0:
            progress_percentage = min(100, (days_since_created / days_to_target) * 100)
    
    return {
        "goal_id": goal.id,
        "progress_percentage": round(progress_percentage, 2),
        "is_completed": is_completed,
        "calculated_at": datetime.now().isoformat()
    }

def categorize_goals(goals: List[Goal]) -> Dict[str, int]:
    """Categorize goals by type."""
    categories = {
        "weight_loss": 0,
        "muscle_gain": 0,
        "endurance": 0,
        "strength": 0,
        "general_fitness": 0
    }
    
    for goal in goals:
        title_lower = goal.title.lower()
        if any(word in title_lower for word in ["weight", "lose", "fat"]):
            categories["weight_loss"] += 1
        elif any(word in title_lower for word in ["muscle", "gain", "bulk"]):
            categories["muscle_gain"] += 1
        elif any(word in title_lower for word in ["endurance", "cardio", "running"]):
            categories["endurance"] += 1
        elif any(word in title_lower for word in ["strength", "lift", "power"]):
            categories["strength"] += 1
        else:
            categories["general_fitness"] += 1
    
    return categories

def generate_goal_recommendations(goals: List[Goal], completed_goals: List[Goal], active_goals: List[Goal]) -> List[str]:
    """Generate goal-related recommendations."""
    recommendations = []
    
    if len(completed_goals) > len(active_goals):
        recommendations.append("Great job completing goals! Consider setting new challenges to maintain momentum.")
    elif len(active_goals) > 5:
        recommendations.append("You have many active goals. Consider focusing on 2-3 key goals for better results.")
    
    if not completed_goals:
        recommendations.append("Set smaller, achievable milestones to build confidence and momentum.")
    
    # Check for overdue goals
    overdue_goals = [g for g in active_goals if g.target_date and g.target_date < datetime.now().date()]
    if overdue_goals:
        recommendations.append(f"You have {len(overdue_goals)} overdue goals. Consider adjusting timelines or priorities.")
    
    recommendations.append("Regular progress tracking helps maintain motivation and adjust strategies.")
    
    return recommendations
