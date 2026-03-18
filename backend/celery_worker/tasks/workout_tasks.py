from celery import current_task
from celery_worker.celery_app import celery_app
from app.services.redis_service import redis_service
from app.services.calorie_service import calorie_service
from app.db.session import SessionLocal
from app.models.workout import WorkoutSession
from sqlalchemy import select
import logging
from datetime import datetime, timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='celery_worker.tasks.workout_tasks.process_workout_statistics')
def process_workout_statistics(self, workout_id: int, user_id: int):
    """
    Process workout statistics and calculate calories burned.
    """
    try:
        logger.info(f"Processing workout statistics for workout {workout_id}, user {user_id}")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Get workout from database
            workout = db.get(WorkoutSession, workout_id)
            if not workout:
                logger.error(f"Workout {workout_id} not found")
                return {"status": "error", "message": "Workout not found"}
            
            # Calculate calories using local FastAPI service logic
            if workout.duration_minutes and workout.duration_minutes > 0:
                calorie_result = calorie_service.calculate_calories(
                    workout_title=workout.title,
                    duration_minutes=workout.duration_minutes,
                    user_weight_kg=70.0
                )
                calories = calorie_result.get("calories_burned")
                
                if calories is not None:
                    # Update workout with calculated calories
                    workout.calories_burned = calories
                    db.add(workout)
                    db.commit()
                    
                    # Cache the result
                    cache_key = f"calories:workout:{workout_id}:duration:{workout.duration_minutes}"
                    redis_service.set(cache_key, calories, expire=86400)  # 24 hours
                    
                    logger.info(f"Successfully processed workout {workout_id} with {calories} calories")
                    
                    # Update user metrics cache
                    update_user_fitness_metrics.delay(user_id)
                    
                    return {
                        "status": "success",
                        "workout_id": workout_id,
                        "calories_burned": calories,
                        "processed_at": datetime.now().isoformat()
                    }
                else:
                    logger.warning(f"Failed to calculate calories for workout {workout_id}")
                    return {"status": "error", "message": "Calorie calculation failed"}
            else:
                logger.warning(f"No duration provided for workout {workout_id}")
                return {"status": "error", "message": "No duration provided"}
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error processing workout statistics: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.workout_tasks.update_user_fitness_metrics')
def update_user_fitness_metrics(self, user_id: int):
    """
    Update user fitness metrics based on recent workouts.
    """
    try:
        logger.info(f"Updating fitness metrics for user {user_id}")
        
        db = SessionLocal()
        
        try:
            # Get user's workouts from last 30 days
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .where(WorkoutSession.performed_at >= thirty_days_ago)
            ).scalars().all()
            
            # Calculate metrics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            avg_duration = total_duration / total_workouts if total_workouts > 0 else 0
            avg_calories = total_calories / total_workouts if total_workouts > 0 else 0
            
            # Get weekly metrics
            seven_days_ago = datetime.now() - timedelta(days=7)
            weekly_workouts = [w for w in workouts if w.performed_at >= seven_days_ago]
            weekly_duration = sum(w.duration_minutes or 0 for w in weekly_workouts)
            weekly_calories = sum(w.calories_burned or 0 for w in weekly_workouts)
            
            metrics = {
                "user_id": user_id,
                "last_updated": datetime.now().isoformat(),
                "last_30_days": {
                    "total_workouts": total_workouts,
                    "total_duration_minutes": total_duration,
                    "total_calories_burned": total_calories,
                    "avg_duration_minutes": round(avg_duration, 2),
                    "avg_calories_per_workout": round(avg_calories, 2)
                },
                "last_7_days": {
                    "total_workouts": len(weekly_workouts),
                    "total_duration_minutes": weekly_duration,
                    "total_calories_burned": weekly_calories
                }
            }
            
            # Cache the metrics
            redis_service.set_user_metrics(user_id, metrics)
            
            logger.info(f"Updated fitness metrics for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "metrics": metrics
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error updating user fitness metrics: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(bind=True, name='celery_worker.tasks.workout_tasks.calculate_workout_trends')
def calculate_workout_trends(self, user_id: int, period: str = "monthly"):
    """
    Calculate workout trends for a user over a specified period.
    """
    try:
        logger.info(f"Calculating {period} workout trends for user {user_id}")
        
        db = SessionLocal()
        
        try:
            # Determine date range based on period
            if period == "weekly":
                start_date = datetime.now() - timedelta(days=7)
            elif period == "monthly":
                start_date = datetime.now() - timedelta(days=30)
            elif period == "yearly":
                start_date = datetime.now() - timedelta(days=365)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            # Get workouts in the period
            workouts = db.execute(
                select(WorkoutSession)
                .where(WorkoutSession.owner_id == user_id)
                .where(WorkoutSession.performed_at >= start_date)
                .order_by(WorkoutSession.performed_at)
            ).scalars().all()
            
            # Calculate trends
            workout_counts = {}
            duration_totals = {}
            calories_totals = {}
            
            for workout in workouts:
                date_key = workout.performed_at.date().isoformat()
                
                if date_key not in workout_counts:
                    workout_counts[date_key] = 0
                    duration_totals[date_key] = 0
                    calories_totals[date_key] = 0
                
                workout_counts[date_key] += 1
                duration_totals[date_key] += workout.duration_minutes or 0
                calories_totals[date_key] += workout.calories_burned or 0
            
            trends = {
                "user_id": user_id,
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": datetime.now().isoformat(),
                "daily_stats": {
                    date: {
                        "workout_count": count,
                        "total_duration_minutes": duration_totals[date],
                        "total_calories_burned": calories_totals[date]
                    }
                    for date, count in workout_counts.items()
                },
                "summary": {
                    "total_workouts": len(workouts),
                    "total_duration_minutes": sum(duration_totals.values()),
                    "total_calories_burned": sum(calories_totals.values()),
                    "avg_workouts_per_day": len(workouts) / max(len(workout_counts), 1),
                    "avg_duration_per_workout": sum(duration_totals.values()) / max(len(workouts), 1),
                    "avg_calories_per_workout": sum(calories_totals.values()) / max(len(workouts), 1)
                }
            }
            
            # Cache the trends
            cache_key = f"trends:user:{user_id}:{period}"
            redis_service.set(cache_key, trends, expire=3600)  # 1 hour
            
            logger.info(f"Calculated {period} trends for user {user_id}")
            
            return {
                "status": "success",
                "user_id": user_id,
                "trends": trends
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error calculating workout trends: {e}")
        return {"status": "error", "message": str(e)}
