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
import json

logger = logging.getLogger(__name__)


def _start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)

@celery_app.task(bind=True, name='celery_worker.tasks.report_tasks.generate_weekly_report')
def generate_weekly_report(self, user_id: int, week_start_date: str = None):
    """
    Generate a comprehensive weekly fitness report for a user.
    """
    try:
        logger.info(f"Generating weekly report for user {user_id}")
        
        # Parse week start date or use current week
        if week_start_date:
            week_start = _start_of_day(datetime.fromisoformat(week_start_date))
        else:
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
                .order_by(WorkoutSession.performed_at)
            ).scalars().all()
            
            # Get goals
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
            ).scalars().all()
            
            # Calculate metrics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            
            # Daily breakdown
            daily_stats = {}
            for workout in workouts:
                day = workout.performed_at.date()
                if day not in daily_stats:
                    daily_stats[day] = {
                        "workouts": [],
                        "total_duration": 0,
                        "total_calories": 0
                    }
                daily_stats[day]["workouts"].append({
                    "id": workout.id,
                    "title": workout.title,
                    "duration_minutes": workout.duration_minutes,
                    "calories_burned": workout.calories_burned,
                    "performed_at": workout.performed_at.isoformat()
                })
                daily_stats[day]["total_duration"] += workout.duration_minutes or 0
                daily_stats[day]["total_calories"] += workout.calories_burned or 0
            
            # Goal progress
            active_goals = [g for g in goals if not g.is_completed]
            completed_goals = [g for g in goals if g.is_completed and g.target_date and g.target_date >= week_start and g.target_date <= week_end]
            
            # Generate insights
            insights = generate_weekly_insights(workouts, total_duration, total_calories, active_goals)
            
            # Create report
            report = {
                "report_type": "weekly",
                "user_id": user_id,
                "user_name": user.email,  # Using email as name placeholder
                "week_period": {
                    "start_date": week_start.isoformat(),
                    "end_date": (week_end_exclusive - timedelta(microseconds=1)).isoformat(),
                    "generated_at": datetime.now().isoformat()
                },
                "summary": {
                    "total_workouts": total_workouts,
                    "total_duration_minutes": total_duration,
                    "total_calories_burned": total_calories,
                    "avg_duration_per_workout": total_duration / max(total_workouts, 1),
                    "workout_frequency": total_workouts / 7,
                    "active_goals": len(active_goals),
                    "goals_completed_this_week": len(completed_goals)
                },
                "daily_breakdown": daily_stats,
                "goal_progress": {
                    "active_goals": [
                        {
                            "id": goal.id,
                            "title": goal.title,
                            "target_date": goal.target_date.isoformat() if goal.target_date else None,
                            "description": goal.description
                        }
                        for goal in active_goals
                    ],
                    "completed_goals": [
                        {
                            "id": goal.id,
                            "title": goal.title,
                            "completed_at": goal.target_date.isoformat() if goal.target_date else None
                        }
                        for goal in completed_goals
                    ]
                },
                "insights": insights,
                "recommendations": generate_weekly_recommendations_report(total_workouts, total_duration, active_goals)
            }
            
            # Cache the report
            cache_key = f"report:weekly:user:{user_id}:{week_start.date()}"
            redis_service.set(cache_key, report, expire=604800)  # 1 week
            
            logger.info(f"Generated weekly report for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "report": report
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error generating weekly report: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.report_tasks.generate_monthly_report')
def generate_monthly_report(self, user_id: int, month_start_date: str = None):
    """
    Generate a comprehensive monthly fitness report for a user.
    """
    try:
        logger.info(f"Generating monthly report for user {user_id}")
        
        # Parse month start date or use current month
        if month_start_date:
            month_start = _start_of_day(datetime.fromisoformat(month_start_date))
        else:
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
                .order_by(WorkoutSession.performed_at)
            ).scalars().all()
            
            # Get goals
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
            ).scalars().all()
            
            # Calculate metrics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            
            # Weekly breakdown
            weekly_stats = {}
            for workout in workouts:
                week_num = (workout.performed_at - month_start).days // 7
                if week_num not in weekly_stats:
                    weekly_stats[week_num] = {
                        "week_start": (month_start + timedelta(weeks=week_num)).isoformat(),
                        "workouts": [],
                        "total_duration": 0,
                        "total_calories": 0
                    }
                weekly_stats[week_num]["workouts"].append({
                    "id": workout.id,
                    "title": workout.title,
                    "duration_minutes": workout.duration_minutes,
                    "calories_burned": workout.calories_burned,
                    "performed_at": workout.performed_at.isoformat()
                })
                weekly_stats[week_num]["total_duration"] += workout.duration_minutes or 0
                weekly_stats[week_num]["total_calories"] += workout.calories_burned or 0
            
            # Goal analysis
            monthly_goals = [
                g
                for g in goals
                if g.target_date and g.target_date >= month_start and g.target_date < month_end_exclusive
            ]
            completed_monthly_goals = [g for g in monthly_goals if g.is_completed]
            
            # Calculate trends
            trends = calculate_monthly_trends_report(
                workouts,
                month_start,
                month_end_exclusive - timedelta(microseconds=1),
            )
            
            # Generate insights
            insights = generate_monthly_insights(workouts, total_duration, total_calories, monthly_goals)
            
            # Create report
            report = {
                "report_type": "monthly",
                "user_id": user_id,
                "user_name": user.email,
                "month_period": {
                    "start_date": month_start.isoformat(),
                    "end_date": (month_end_exclusive - timedelta(microseconds=1)).isoformat(),
                    "generated_at": datetime.now().isoformat()
                },
                "summary": {
                    "total_workouts": total_workouts,
                    "total_duration_minutes": total_duration,
                    "total_calories_burned": total_calories,
                    "avg_workouts_per_week": total_workouts / 4.33,
                    "avg_duration_per_workout": total_duration / max(total_workouts, 1),
                    "workout_consistency": calculate_consistency_score_report(
                        workouts,
                        month_start,
                        month_end_exclusive - timedelta(microseconds=1),
                    ),
                    "goals_set_this_month": len(monthly_goals),
                    "goals_completed_this_month": len(completed_monthly_goals)
                },
                "weekly_breakdown": weekly_stats,
                "goal_analysis": {
                    "monthly_goals": [
                        {
                            "id": goal.id,
                            "title": goal.title,
                            "target_date": goal.target_date.isoformat(),
                            "is_completed": goal.is_completed,
                            "description": goal.description
                        }
                        for goal in monthly_goals
                    ],
                    "completion_rate": len(completed_monthly_goals) / max(len(monthly_goals), 1) * 100
                },
                "trends": trends,
                "insights": insights,
                "recommendations": generate_monthly_recommendations_report(total_workouts, total_duration, monthly_goals)
            }
            
            # Cache the report
            cache_key = f"report:monthly:user:{user_id}:{month_start.date()}"
            redis_service.set(cache_key, report, expire=2592000)  # 30 days
            
            logger.info(f"Generated monthly report for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "report": report
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error generating monthly report: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.report_tasks.generate_weekly_reports_all_users')
def generate_weekly_reports_all_users(self):
    """
    Generate weekly reports for all active users.
    """
    try:
        logger.info("Starting weekly report generation for all users")
        
        db = SessionLocal()
        
        try:
            users = db.execute(select(User)).scalars().all()
            
            results = []
            for user in users:
                try:
                    result = generate_weekly_report.delay(user.id)
                    results.append({"user_id": user.id, "task_id": result.id})
                except Exception as e:
                    logger.error(f"Failed to queue weekly report for user {user.id}: {e}")
            
            logger.info(f"Queued weekly report generation for {len(results)} users")
            
            return {
                "status": "success",
                "total_users": len(users),
                "queued_tasks": len(results),
                "results": results
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in weekly report generation for all users: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.report_tasks.generate_monthly_reports_all_users')
def generate_monthly_reports_all_users(self):
    """
    Generate monthly reports for all active users.
    """
    try:
        logger.info("Starting monthly report generation for all users")
        
        db = SessionLocal()
        
        try:
            users = db.execute(select(User)).scalars().all()
            
            results = []
            for user in users:
                try:
                    result = generate_monthly_report.delay(user.id)
                    results.append({"user_id": user.id, "task_id": result.id})
                except Exception as e:
                    logger.error(f"Failed to queue monthly report for user {user.id}: {e}")
            
            logger.info(f"Queued monthly report generation for {len(results)} users")
            
            return {
                "status": "success",
                "total_users": len(users),
                "queued_tasks": len(results),
                "results": results
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in monthly report generation for all users: {e}")
        return {"status": "error", "message": str(e)}

def generate_weekly_insights(workouts: List[WorkoutSession], total_duration: int, total_calories: int, goals: List[Goal]) -> List[str]:
    """Generate weekly insights."""
    insights = []
    total_workouts = len(workouts)
    
    if total_workouts >= 5:
        insights.append("Excellent workout consistency this week!")
    elif total_workouts >= 3:
        insights.append("Good workout frequency. Keep up the momentum!")
    else:
        insights.append("Consider increasing your workout frequency for better results.")
    
    if total_duration >= 150:
        insights.append("You've met the recommended 150 minutes of exercise this week.")
    elif total_duration >= 75:
        insights.append("You're halfway to the recommended weekly exercise target.")
    
    if total_calories > 1000:
        insights.append(f"Great calorie burn this week: {total_calories} calories!")
    
    if goals:
        insights.append(f"You're working toward {len(goals)} fitness goals.")
    
    return insights

def generate_monthly_insights(workouts: List[WorkoutSession], total_duration: int, total_calories: int, goals: List[Goal]) -> List[str]:
    """Generate monthly insights."""
    insights = []
    
    avg_weekly_workouts = len(workouts) / 4.33
    if avg_weekly_workouts >= 4:
        insights.append("Outstanding workout consistency this month!")
    elif avg_weekly_workouts >= 3:
        insights.append("Great workout consistency. You're building a solid habit!")
    elif avg_weekly_workouts >= 2:
        insights.append("Good progress. Consider increasing frequency for better results.")
    
    if total_duration >= 600:  # 10 hours per month
        insights.append("Excellent monthly exercise volume!")
    elif total_duration >= 300:  # 5 hours per month
        insights.append("Good monthly exercise volume. Keep it up!")
    
    if total_calories > 4000:
        insights.append(f"Impressive calorie burn this month: {total_calories} calories!")
    
    completed_goals = [g for g in goals if g.is_completed]
    if completed_goals:
        insights.append(f"Congratulations on completing {len(completed_goals)} goals this month!")
    
    return insights

def generate_weekly_recommendations_report(workout_count: int, total_duration: int, goals: List[Goal]) -> List[str]:
    """Generate weekly report recommendations."""
    recommendations = []
    
    if workout_count < 3:
        recommendations.append("Aim for at least 3 workouts per week for optimal health benefits")
    elif workout_count > 6:
        recommendations.append("Great dedication! Ensure you're getting adequate rest between intense sessions")
    
    if total_duration < 150:
        recommendations.append("Try to reach 150 minutes of moderate exercise per week")
    
    if goals:
        recommendations.append("Focus on consistent progress toward your weekly goals")
    
    recommendations.append("Consider varying your workout types to prevent plateaus")
    
    return recommendations

def generate_monthly_recommendations_report(workout_count: int, total_duration: int, goals: List[Goal]) -> List[str]:
    """Generate monthly report recommendations."""
    recommendations = []
    
    if workout_count < 12:
        recommendations.append("Increase workout frequency to at least 3 times per week")
    elif workout_count > 20:
        recommendations.append("Excellent consistency! Consider adding variety to your routine")
    
    if total_duration < 600:
        recommendations.append("Aim for at least 10 hours of exercise per month")
    
    if goals:
        recommendations.append("Set specific, measurable goals for next month")
    
    recommendations.append("Consider tracking additional metrics like strength gains or endurance improvements")
    
    return recommendations

def calculate_monthly_trends_report(workouts: List[WorkoutSession], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Calculate monthly trends for reports."""
    if not workouts:
        return {"trend": "no_data", "change_percentage": 0, "weekly_progression": []}
    
    # Calculate weekly totals
    weekly_totals = []
    current_week = []
    
    for workout in sorted(workouts, key=lambda w: w.performed_at):
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
        
        if change_percentage > 15:
            trend = "strongly_increasing"
        elif change_percentage > 5:
            trend = "increasing"
        elif change_percentage < -15:
            trend = "strongly_decreasing"
        elif change_percentage < -5:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
        change_percentage = 0
    
    return {
        "trend": trend,
        "change_percentage": round(change_percentage, 2),
        "weekly_progression": weekly_totals
    }

def calculate_consistency_score_report(workouts: List[WorkoutSession], start_date: datetime, end_date: datetime) -> float:
    """Calculate consistency score for reports."""
    if not workouts:
        return 0.0
    
    total_days = (end_date - start_date).days + 1
    workout_days = len(set(w.performed_at.date() for w in workouts))
    
    return round(min(100.0, (workout_days / total_days) * 100), 2)
