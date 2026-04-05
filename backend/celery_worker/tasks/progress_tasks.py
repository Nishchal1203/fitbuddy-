from celery_worker.celery_app import celery_app
from app.services.redis_service import redis_service
from app.db.session import SessionLocal
from app.models.user import User
from app.models.workout import WorkoutSession
from app.models.goal import Goal
from sqlalchemy import select, func
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def _start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)

@celery_app.task(bind=True, name='celery_worker.tasks.progress_tasks.analyze_weekly_progress')
def analyze_weekly_progress(self, user_id: int, week_start_date: str = None):
    """
    Analyze weekly progress for a specific user.
    """
    try:
        logger.info(f"Analyzing weekly progress for user {user_id}")
        
        # Parse week start date or use current week
        if week_start_date:
            week_start = _start_of_day(datetime.fromisoformat(week_start_date))
        else:
            # Get start of current week (Monday)
            today = datetime.now()
            week_start = _start_of_day(today - timedelta(days=today.weekday()))
        
        week_end_exclusive = week_start + timedelta(days=7)
        
        db = SessionLocal()
        
        try:
            # Get user
            user = db.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return {"status": "error", "message": "User not found"}
            
            # Get workouts in the week
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .where(WorkoutSession.performed_at >= week_start)
                .where(WorkoutSession.performed_at < week_end_exclusive)
            ).scalars().all()
            
            # Get active goals
            active_goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
                .where(Goal.is_completed == False)
            ).scalars().all()
            
            # Calculate progress metrics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            
            # Calculate weekly trends
            daily_workouts = {}
            for workout in workouts:
                day = workout.performed_at.date()
                if day not in daily_workouts:
                    daily_workouts[day] = []
                daily_workouts[day].append(workout)
            
            # Goal progress analysis
            goal_progress = []
            for goal in active_goals:
                # Simple goal progress calculation (can be enhanced)
                goal_progress.append({
                    "goal_id": goal.id,
                    "title": goal.title,
                    "target_date": goal.target_date.isoformat() if goal.target_date else None,
                    "is_completed": goal.is_completed,
                    "progress_percentage": 0  # Placeholder - implement actual progress calculation
                })
            
            analysis = {
                "user_id": user_id,
                "week_start": week_start.isoformat(),
                "week_end": (week_end_exclusive - timedelta(microseconds=1)).isoformat(),
                "analysis_date": datetime.now().isoformat(),
                "workout_summary": {
                    "total_workouts": total_workouts,
                    "total_duration_minutes": total_duration,
                    "total_calories_burned": total_calories,
                    "avg_duration_per_workout": total_duration / max(total_workouts, 1),
                    "workout_frequency": total_workouts / 7  # workouts per day
                },
                "daily_breakdown": {
                    day.isoformat(): {
                        "workout_count": len(workouts),
                        "total_duration": sum(w.duration_minutes or 0 for w in workouts),
                        "total_calories": sum(w.calories_burned or 0 for w in workouts)
                    }
                    for day, workouts in daily_workouts.items()
                },
                "goal_progress": goal_progress,
                "recommendations": generate_weekly_recommendations(total_workouts, total_duration, active_goals)
            }
            
            # Cache the analysis
            cache_key = f"progress:weekly:user:{user_id}:{week_start.date()}"
            redis_service.set(cache_key, analysis, expire=604800)  # 1 week
            
            logger.info(f"Completed weekly progress analysis for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "analysis": analysis
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error analyzing weekly progress: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.progress_tasks.analyze_monthly_progress')
def analyze_monthly_progress(self, user_id: int, month_start_date: str = None):
    """
    Analyze monthly progress for a specific user.
    """
    try:
        logger.info(f"Analyzing monthly progress for user {user_id}")
        
        # Parse month start date or use current month
        if month_start_date:
            month_start = _start_of_day(datetime.fromisoformat(month_start_date))
        else:
            # Get start of current month
            today = datetime.now()
            month_start = _start_of_day(today.replace(day=1))
        
        # Calculate end-exclusive month boundary
        if month_start.month == 12:
            month_end_exclusive = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end_exclusive = month_start.replace(month=month_start.month + 1)
        
        db = SessionLocal()
        
        try:
            # Get user
            user = db.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return {"status": "error", "message": "User not found"}
            
            # Get workouts in the month
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .where(WorkoutSession.performed_at >= month_start)
                .where(WorkoutSession.performed_at < month_end_exclusive)
            ).scalars().all()
            
            # Get goals
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
                .where(Goal.target_date >= month_start)
                .where(Goal.target_date < month_end_exclusive)
            ).scalars().all()
            
            # Calculate monthly metrics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            
            # Weekly breakdown
            weekly_stats = {}
            for workout in workouts:
                week_num = (workout.performed_at - month_start).days // 7
                if week_num not in weekly_stats:
                    weekly_stats[week_num] = {
                        "workout_count": 0,
                        "total_duration": 0,
                        "total_calories": 0
                    }
                weekly_stats[week_num]["workout_count"] += 1
                weekly_stats[week_num]["total_duration"] += workout.duration_minutes or 0
                weekly_stats[week_num]["total_calories"] += workout.calories_burned or 0
            
            # Goal analysis
            completed_goals = [g for g in goals if g.is_completed]
            active_goals = [g for g in goals if not g.is_completed]
            
            analysis = {
                "user_id": user_id,
                "month_start": month_start.isoformat(),
                "month_end": (month_end_exclusive - timedelta(microseconds=1)).isoformat(),
                "analysis_date": datetime.now().isoformat(),
                "monthly_summary": {
                    "total_workouts": total_workouts,
                    "total_duration_minutes": total_duration,
                    "total_calories_burned": total_calories,
                    "avg_workouts_per_week": total_workouts / 4.33,  # Average weeks per month
                    "avg_duration_per_workout": total_duration / max(total_workouts, 1),
                    "workout_consistency": calculate_consistency_score(
                        workouts,
                        month_start,
                        month_end_exclusive - timedelta(microseconds=1),
                    )
                },
                "weekly_breakdown": weekly_stats,
                "goal_analysis": {
                    "total_goals": len(goals),
                    "completed_goals": len(completed_goals),
                    "active_goals": len(active_goals),
                    "completion_rate": len(completed_goals) / max(len(goals), 1) * 100
                },
                "trends": calculate_monthly_trends(workouts),
                "recommendations": generate_monthly_recommendations(total_workouts, total_duration, goals)
            }
            
            # Cache the analysis
            cache_key = f"progress:monthly:user:{user_id}:{month_start.date()}"
            redis_service.set(cache_key, analysis, expire=2592000)  # 30 days
            
            logger.info(f"Completed monthly progress analysis for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "analysis": analysis
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error analyzing monthly progress: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.progress_tasks.analyze_weekly_progress_all_users')
def analyze_weekly_progress_all_users(self):
    """
    Analyze weekly progress for all active users.
    """
    try:
        logger.info("Starting weekly progress analysis for all users")
        
        db = SessionLocal()
        
        try:
            # Get all users
            users = db.execute(select(User)).scalars().all()
            
            results = []
            for user in users:
                try:
                    result = analyze_weekly_progress.delay(user.id)
                    results.append({"user_id": user.id, "task_id": result.id})
                except Exception as e:
                    logger.error(f"Failed to queue weekly analysis for user {user.id}: {e}")
            
            logger.info(f"Queued weekly progress analysis for {len(results)} users")
            
            return {
                "status": "success",
                "total_users": len(users),
                "queued_tasks": len(results),
                "results": results
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in weekly progress analysis for all users: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.progress_tasks.analyze_monthly_progress_all_users')
def analyze_monthly_progress_all_users(self):
    """
    Analyze monthly progress for all active users.
    """
    try:
        logger.info("Starting monthly progress analysis for all users")
        
        db = SessionLocal()
        
        try:
            # Get all users
            users = db.execute(select(User)).scalars().all()
            
            results = []
            for user in users:
                try:
                    result = analyze_monthly_progress.delay(user.id)
                    results.append({"user_id": user.id, "task_id": result.id})
                except Exception as e:
                    logger.error(f"Failed to queue monthly analysis for user {user.id}: {e}")
            
            logger.info(f"Queued monthly progress analysis for {len(results)} users")
            
            return {
                "status": "success",
                "total_users": len(users),
                "queued_tasks": len(results),
                "results": results
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in monthly progress analysis for all users: {e}")
        return {"status": "error", "message": str(e)}

def generate_weekly_recommendations(workout_count: int, total_duration: int, goals: List[Goal]) -> List[str]:
    """Generate weekly recommendations based on progress."""
    recommendations = []
    
    if workout_count < 3:
        recommendations.append("Try to increase your workout frequency to at least 3 times per week")
    elif workout_count > 6:
        recommendations.append("Great job! Consider adding rest days to prevent overtraining")
    
    if total_duration < 150:  # Less than 2.5 hours per week
        recommendations.append("Aim for at least 150 minutes of moderate exercise per week")
    elif total_duration > 300:  # More than 5 hours per week
        recommendations.append("Excellent dedication! Make sure you're getting enough recovery time")
    
    if goals:
        recommendations.append(f"You have {len(goals)} active goals. Focus on consistent progress toward your targets")
    
    return recommendations

def generate_monthly_recommendations(workout_count: int, total_duration: int, goals: List[Goal]) -> List[str]:
    """Generate monthly recommendations based on progress."""
    recommendations = []
    
    if workout_count < 12:  # Less than 3 workouts per week
        recommendations.append("Consider increasing your workout frequency for better results")
    elif workout_count > 20:  # More than 5 workouts per week
        recommendations.append("Outstanding consistency! Ensure you're balancing intensity with recovery")
    
    if total_duration < 600:  # Less than 10 hours per month
        recommendations.append("Aim for at least 10 hours of exercise per month for optimal health benefits")
    
    if goals:
        completed_goals = [g for g in goals if g.is_completed]
        if len(completed_goals) > 0:
            recommendations.append(f"Congratulations on completing {len(completed_goals)} goals this month!")
        else:
            recommendations.append("Focus on making steady progress toward your monthly goals")
    
    return recommendations

def calculate_consistency_score(workouts: List[WorkoutSession], start_date: datetime, end_date: datetime) -> float:
    """Calculate workout consistency score (0-100)."""
    if not workouts:
        return 0.0
    
    total_days = (end_date - start_date).days + 1
    workout_days = len(set(w.performed_at.date() for w in workouts))
    
    return min(100.0, (workout_days / total_days) * 100)

def calculate_monthly_trends(workouts: List[WorkoutSession]) -> Dict[str, Any]:
    """Calculate monthly trends."""
    if not workouts:
        return {"trend": "no_data", "change_percentage": 0}
    
    # Sort workouts by date
    sorted_workouts = sorted(workouts, key=lambda w: w.performed_at)
    
    # Calculate weekly totals
    weekly_totals = []
    current_week = []
    
    for workout in sorted_workouts:
        if not current_week or (workout.performed_at - current_week[0].performed_at).days < 7:
            current_week.append(workout)
        else:
            weekly_totals.append(len(current_week))
            current_week = [workout]
    
    if current_week:
        weekly_totals.append(len(current_week))
    
    # Calculate trend
    if len(weekly_totals) >= 2:
        first_half = sum(weekly_totals[:len(weekly_totals)//2])
        second_half = sum(weekly_totals[len(weekly_totals)//2:])
        
        if first_half > 0:
            change_percentage = ((second_half - first_half) / first_half) * 100
        else:
            change_percentage = 0
        
        if change_percentage > 10:
            trend = "increasing"
        elif change_percentage < -10:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
        change_percentage = 0
    
    return {
        "trend": trend,
        "change_percentage": round(change_percentage, 2),
        "weekly_totals": weekly_totals
    }
