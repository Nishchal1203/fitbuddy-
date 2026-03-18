from celery import current_task
from celery_worker.celery_app import celery_app
from app.services.redis_service import redis_service
from app.db.session import SessionLocal
from app.models.user import User
from app.models.workout import WorkoutSession
from app.models.goal import Goal
from sqlalchemy import select, func, and_
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='celery_worker.tasks.batch_tasks.process_historical_data')
def process_historical_data(self, user_id: int, start_date: str, end_date: str):
    """
    Process historical data for a user within a specified date range.
    """
    try:
        logger.info(f"Processing historical data for user {user_id} from {start_date} to {end_date}")
        
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        
        db = SessionLocal()
        
        try:
            # Get user
            user = db.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return {"status": "error", "message": "User not found"}
            
            # Get workouts in date range
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .where(WorkoutSession.performed_at >= start_dt)
                .where(WorkoutSession.performed_at <= end_dt)
                .order_by(WorkoutSession.performed_at)
            ).scalars().all()
            
            # Get goals in date range
            goals = db.execute(
                select(Goal)
                .where(Goal.owner_id == user_id)
                .where(Goal.created_at >= start_dt)
                .where(Goal.created_at <= end_dt)
            ).scalars().all()
            
            # Process workout data
            workout_analysis = analyze_historical_workouts(workouts, start_dt, end_dt)
            
            # Process goal data
            goal_analysis = analyze_historical_goals(goals, start_dt, end_dt)
            
            # Calculate trends
            trends = calculate_historical_trends(workouts, start_dt, end_dt)
            
            # Generate insights
            insights = generate_historical_insights(workout_analysis, goal_analysis, trends)
            
            # Create comprehensive report
            historical_data = {
                "user_id": user_id,
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                    "duration_days": (end_dt - start_dt).days + 1
                },
                "processed_at": datetime.now().isoformat(),
                "workout_analysis": workout_analysis,
                "goal_analysis": goal_analysis,
                "trends": trends,
                "insights": insights,
                "summary": {
                    "total_workouts": len(workouts),
                    "total_goals": len(goals),
                    "completed_goals": len([g for g in goals if g.is_completed]),
                    "data_quality_score": calculate_data_quality_score(workouts, goals)
                }
            }
            
            # Cache the processed data
            cache_key = f"historical_data:user:{user_id}:{start_date}:{end_date}"
            redis_service.set(cache_key, historical_data, expire=86400)  # 1 day
            
            logger.info(f"Completed historical data processing for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "historical_data": historical_data
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error processing historical data: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.batch_tasks.migrate_legacy_data')
def migrate_legacy_data(self):
    """
    Migrate and process legacy data for all users.
    """
    try:
        logger.info("Starting legacy data migration")
        
        db = SessionLocal()
        
        try:
            # Get all users
            users = db.execute(select(User)).scalars().all()
            
            migration_results = []
            
            for user in users:
                try:
                    # Process user's historical data
                    result = process_user_legacy_data(user.id, db)
                    migration_results.append({
                        "user_id": user.id,
                        "status": "success",
                        "processed_workouts": result["workouts_processed"],
                        "processed_goals": result["goals_processed"]
                    })
                except Exception as e:
                    logger.error(f"Failed to migrate data for user {user.id}: {e}")
                    migration_results.append({
                        "user_id": user.id,
                        "status": "error",
                        "error": str(e)
                    })
            
            logger.info(f"Completed legacy data migration for {len(users)} users")
            
            return {
                "status": "success",
                "total_users": len(users),
                "migration_results": migration_results,
                "completed_at": datetime.now().isoformat()
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in legacy data migration: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.batch_tasks.generate_analytics_summary')
def generate_analytics_summary(self):
    """
    Generate system-wide analytics summary.
    """
    try:
        logger.info("Generating system-wide analytics summary")
        
        db = SessionLocal()
        
        try:
            # Get system-wide statistics
            total_users = db.execute(select(func.count(User.id))).scalar()
            total_workouts = db.execute(select(func.count(WorkoutSession.id))).scalar()
            total_goals = db.execute(select(func.count(Goal.id))).scalar()
            completed_goals = db.execute(select(func.count(Goal.id)).where(Goal.is_completed == True)).scalar()
            
            # Get recent activity (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_workouts = db.execute(
                select(func.count(WorkoutSession.id))
                .where(WorkoutSession.performed_at >= thirty_days_ago)
            ).scalar()
            
            recent_goals = db.execute(
                select(func.count(Goal.id))
                .where(Goal.created_at >= thirty_days_ago)
            ).scalar()
            
            # Calculate averages
            avg_workouts_per_user = total_workouts / max(total_users, 1)
            avg_goals_per_user = total_goals / max(total_users, 1)
            goal_completion_rate = completed_goals / max(total_goals, 1) * 100
            
            # Generate insights
            insights = generate_system_insights(
                total_users, total_workouts, total_goals, 
                completed_goals, recent_workouts, recent_goals
            )
            
            summary = {
                "generated_at": datetime.now().isoformat(),
                "system_stats": {
                    "total_users": total_users,
                    "total_workouts": total_workouts,
                    "total_goals": total_goals,
                    "completed_goals": completed_goals,
                    "goal_completion_rate": round(goal_completion_rate, 2)
                },
                "recent_activity": {
                    "workouts_last_30_days": recent_workouts,
                    "goals_created_last_30_days": recent_goals,
                    "avg_workouts_per_user": round(avg_workouts_per_user, 2),
                    "avg_goals_per_user": round(avg_goals_per_user, 2)
                },
                "insights": insights,
                "recommendations": generate_system_recommendations(
                    total_users, goal_completion_rate, recent_workouts
                )
            }
            
            # Cache the summary
            cache_key = "analytics:system_summary"
            redis_service.set(cache_key, summary, expire=3600)  # 1 hour
            
            logger.info("Completed system-wide analytics summary generation")
            
            return {
                "status": "success",
                "summary": summary
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error generating analytics summary: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.batch_tasks.cleanup_old_data')
def cleanup_old_data(self, days_to_keep: int = 365):
    """
    Clean up old cached data and temporary files.
    """
    try:
        logger.info(f"Starting cleanup of data older than {days_to_keep} days")
        
        # This would typically involve cleaning up old cache entries,
        # temporary files, and archived data
        # For now, we'll just log the operation
        
        cleanup_results = {
            "cache_entries_cleaned": 0,  # Placeholder
            "temp_files_removed": 0,     # Placeholder
            "archived_data_processed": 0, # Placeholder
            "cleanup_date": datetime.now().isoformat()
        }
        
        logger.info("Completed data cleanup")
        
        return {
            "status": "success",
            "cleanup_results": cleanup_results
        }
        
    except Exception as e:
        logger.error(f"Error in data cleanup: {e}")
        return {"status": "error", "message": str(e)}

def process_user_legacy_data(user_id: int, db) -> Dict[str, int]:
    """Process legacy data for a specific user."""
    # Get all workouts for user
    workouts = db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.owner_id == user_id)
    ).scalars().all()
    
    # Get all goals for user
    goals = db.execute(
        select(Goal)
        .where(Goal.owner_id == user_id)
    ).scalars().all()
    
    # Process workouts (add missing data, calculate metrics, etc.)
    workouts_processed = 0
    for workout in workouts:
        # Add any missing calculated fields
        if workout.duration_minutes and not workout.calories_burned:
            # Calculate calories if missing
            estimated_calories = workout.duration_minutes * 8.0  # Simple estimate
            workout.calories_burned = estimated_calories
            db.add(workout)
            workouts_processed += 1
    
    # Process goals (update progress, completion status, etc.)
    goals_processed = 0
    for goal in goals:
        # Update goal progress if needed
        if not goal.is_completed and goal.target_date and goal.target_date < datetime.now().date():
            # Mark overdue goals
            goals_processed += 1
    
    db.commit()
    
    return {
        "workouts_processed": workouts_processed,
        "goals_processed": goals_processed
    }

def analyze_historical_workouts(workouts: List[WorkoutSession], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Analyze historical workout data."""
    if not workouts:
        return {"total_workouts": 0, "analysis": "no_data"}
    
    total_duration = sum(w.duration_minutes or 0 for w in workouts)
    total_calories = sum(w.calories_burned or 0 for w in workouts)
    
    # Calculate daily averages
    days_in_period = (end_date - start_date).days + 1
    avg_workouts_per_day = len(workouts) / days_in_period
    avg_duration_per_day = total_duration / days_in_period
    
    # Calculate consistency
    workout_days = len(set(w.performed_at.date() for w in workouts))
    consistency_score = (workout_days / days_in_period) * 100
    
    return {
        "total_workouts": len(workouts),
        "total_duration_minutes": total_duration,
        "total_calories_burned": total_calories,
        "avg_workouts_per_day": round(avg_workouts_per_day, 2),
        "avg_duration_per_day": round(avg_duration_per_day, 2),
        "consistency_score": round(consistency_score, 2),
        "workout_frequency": categorize_frequency(avg_workouts_per_day)
    }

def analyze_historical_goals(goals: List[Goal], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Analyze historical goal data."""
    if not goals:
        return {"total_goals": 0, "analysis": "no_data"}
    
    completed_goals = [g for g in goals if g.is_completed]
    active_goals = [g for g in goals if not g.is_completed]
    
    # Calculate completion times
    completion_times = []
    for goal in completed_goals:
        if goal.target_date:
            # Estimate completion time
            completion_times.append(30)  # Placeholder
    
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    return {
        "total_goals": len(goals),
        "completed_goals": len(completed_goals),
        "active_goals": len(active_goals),
        "completion_rate": len(completed_goals) / len(goals) * 100,
        "avg_completion_time_days": round(avg_completion_time, 2),
        "goal_categories": categorize_goals(goals)
    }

def calculate_historical_trends(workouts: List[WorkoutSession], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Calculate trends from historical data."""
    if not workouts:
        return {"trend": "no_data"}
    
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
    
    # Determine trend
    if len(weekly_totals) >= 2:
        first_half = sum(weekly_totals[:len(weekly_totals)//2])
        second_half = sum(weekly_totals[len(weekly_totals)//2:])
        
        if first_half > 0:
            change_percentage = ((second_half - first_half) / first_half) * 100
        else:
            change_percentage = 0
        
        if change_percentage > 20:
            trend = "strongly_increasing"
        elif change_percentage > 5:
            trend = "increasing"
        elif change_percentage < -20:
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

def generate_historical_insights(workout_analysis: Dict, goal_analysis: Dict, trends: Dict) -> List[str]:
    """Generate insights from historical analysis."""
    insights = []
    
    if workout_analysis["total_workouts"] > 0:
        consistency = workout_analysis["consistency_score"]
        if consistency > 80:
            insights.append("Excellent workout consistency over this period!")
        elif consistency > 60:
            insights.append("Good workout consistency. Room for improvement.")
        else:
            insights.append("Consider improving workout consistency for better results.")
    
    if goal_analysis["total_goals"] > 0:
        completion_rate = goal_analysis["completion_rate"]
        if completion_rate > 70:
            insights.append("Great goal completion rate!")
        elif completion_rate > 50:
            insights.append("Good goal completion rate. Focus on achievable targets.")
        else:
            insights.append("Consider setting smaller, more achievable goals.")
    
    trend = trends.get("trend", "unknown")
    if trend == "increasing":
        insights.append("Positive trend detected! Your activity is increasing.")
    elif trend == "decreasing":
        insights.append("Activity trend is decreasing. Consider refocusing on your goals.")
    
    return insights

def calculate_data_quality_score(workouts: List[WorkoutSession], goals: List[Goal]) -> float:
    """Calculate data quality score based on completeness."""
    if not workouts and not goals:
        return 0.0
    
    total_items = len(workouts) + len(goals)
    complete_items = 0
    
    # Check workout completeness
    for workout in workouts:
        if workout.duration_minutes and workout.calories_burned:
            complete_items += 1
    
    # Check goal completeness
    for goal in goals:
        if goal.title and goal.target_date:
            complete_items += 1
    
    return round((complete_items / total_items) * 100, 2)

def categorize_frequency(avg_workouts_per_day: float) -> str:
    """Categorize workout frequency."""
    if avg_workouts_per_day >= 0.7:  # 5+ per week
        return "very_high"
    elif avg_workouts_per_day >= 0.5:  # 3-4 per week
        return "high"
    elif avg_workouts_per_day >= 0.3:  # 2-3 per week
        return "moderate"
    elif avg_workouts_per_day >= 0.1:  # 1-2 per week
        return "low"
    else:
        return "very_low"

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

def generate_system_insights(total_users: int, total_workouts: int, total_goals: int, 
                           completed_goals: int, recent_workouts: int, recent_goals: int) -> List[str]:
    """Generate system-wide insights."""
    insights = []
    
    if total_users > 100:
        insights.append("Large user base indicates strong platform adoption")
    elif total_users > 50:
        insights.append("Growing user community")
    
    if total_workouts > 1000:
        insights.append("High user engagement with workout tracking")
    
    goal_completion_rate = completed_goals / max(total_goals, 1) * 100
    if goal_completion_rate > 60:
        insights.append("Users are successfully achieving their fitness goals")
    elif goal_completion_rate > 40:
        insights.append("Moderate goal completion rate - consider improving goal-setting guidance")
    
    if recent_workouts > total_workouts * 0.1:  # 10% of total workouts in last 30 days
        insights.append("Strong recent user activity")
    
    return insights

def generate_system_recommendations(total_users: int, goal_completion_rate: float, recent_workouts: int) -> List[str]:
    """Generate system-wide recommendations."""
    recommendations = []
    
    if goal_completion_rate < 50:
        recommendations.append("Implement better goal-setting guidance and progress tracking")
    
    if recent_workouts < total_users * 2:  # Less than 2 workouts per user in last 30 days
        recommendations.append("Focus on user engagement and retention strategies")
    
    recommendations.append("Consider implementing gamification features to increase user motivation")
    recommendations.append("Regular user feedback collection to improve platform features")
    
    return recommendations
