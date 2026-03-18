from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workout import WorkoutSession
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.services.rabbitmq_service import rabbitmq_service
from app.services.redis_service import redis_service
from app.services.calorie_service import calorie_service
from app.services.enhanced_calorie_service import enhanced_calorie_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
	payload: WorkoutCreate, 
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	workout = WorkoutSession(
		title=payload.title,
		notes=payload.notes,
		performed_at=payload.performed_at,
		duration_minutes=payload.duration_minutes,
		exercises=payload.exercises,
		owner_id=current_user.id,
	)
	db.add(workout)
	db.commit()
	db.refresh(workout)
	
	# Calculate calories immediately using enhanced calorie service
	if workout.duration_minutes and workout.duration_minutes > 0:
		try:
			# Try enhanced calculation first (uses exercises table)
			calorie_result = enhanced_calorie_service.calculate_calories_from_exercise_name(
				exercise_name=workout.title,
				duration_minutes=workout.duration_minutes,
				user_weight_kg=70.0  # Default weight, could be fetched from user profile
			)
			
			workout.calories_burned = calorie_result["calories_burned"]
			db.add(workout)
			db.commit()
			db.refresh(workout)
			
			logger.info(f"Calculated {workout.calories_burned} calories for workout {workout.id} "
					   f"using method: {calorie_result.get('matched_method', 'unknown')}")
			
		except Exception as e:
			logger.error(f"Error calculating calories for workout {workout.id}: {e}")
			# Fallback to original service
			try:
				calorie_result = calorie_service.calculate_calories(
					workout_title=workout.title,
					duration_minutes=workout.duration_minutes,
					user_weight_kg=70.0
				)
				workout.calories_burned = calorie_result["calories_burned"]
			except:
				# Ultimate fallback
				workout.calories_burned = workout.duration_minutes * 4.0
			
			db.add(workout)
			db.commit()
			db.refresh(workout)
	
	# Cache the workout data
	cache_workout_data(workout, current_user.id)
	
	return workout


@router.get("/", response_model=list[WorkoutRead])
def list_workouts(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	limit: int = 50,
	offset: int = 0
):
	# Check cache first
	cache_key = f"workouts:user:{current_user.id}:limit:{limit}:offset:{offset}"
	cached_workouts = redis_service.get(cache_key)
	
	if cached_workouts:
		logger.info(f"Retrieved cached workouts for user {current_user.id}")
		return cached_workouts
	
	# If not cached, fetch from database
	rows = db.execute(
		select(WorkoutSession)
		.where(WorkoutSession.owner_id == current_user.id)
		.order_by(WorkoutSession.performed_at.desc())
		.limit(limit)
		.offset(offset)
	).scalars().all()
	
	# Cache the results
	redis_service.set(cache_key, rows, expire=300)  # 5 minutes
	
	return rows


@router.get("/{workout_id}", response_model=WorkoutRead)
def get_workout(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	# Check cache first
	cache_key = f"workout:{workout_id}:user:{current_user.id}"
	cached_workout = redis_service.get(cache_key)
	
	if cached_workout:
		logger.info(f"Retrieved cached workout {workout_id}")
		return cached_workout
	
	# If not cached, fetch from database
	workout = db.get(WorkoutSession, workout_id)
	if not workout or workout.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Workout not found")
	
	# Cache the workout
	redis_service.set(cache_key, workout, expire=600)  # 10 minutes
	
	return workout


@router.patch("/{workout_id}", response_model=WorkoutRead)
def update_workout(workout_id: int, payload: WorkoutUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	workout = db.get(WorkoutSession, workout_id)
	if not workout or workout.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Workout not found")
	
	data = payload.model_dump(exclude_unset=True)
	for k, v in data.items():
		setattr(workout, k, v)
	
	db.add(workout)
	db.commit()
	db.refresh(workout)
	
	# Invalidate cache
	invalidate_workout_cache(workout_id, current_user.id)
	
	# Recalculate calories if duration changed
	if 'duration_minutes' in data:
		try:
			calorie_result = calorie_service.calculate_calories(
				workout_title=workout.title,
				duration_minutes=workout.duration_minutes,
				user_weight_kg=70.0
			)
			workout.calories_burned = calorie_result["calories_burned"]
			db.add(workout)
			db.commit()
			logger.info(f"Recalculated {workout.calories_burned} calories for workout {workout_id}")
		except Exception as e:
			logger.error(f"Error recalculating calories for workout {workout_id}: {e}")
	
	return workout


@router.post("/calculate-calories")
def calculate_calories_direct(payload: dict, current_user: User = Depends(get_current_user)):
	"""Calculate calories for a workout without saving it."""
	try:
		title = payload.get("title", "")
		duration_minutes = payload.get("duration_minutes", 0)
		user_weight_kg = payload.get("user_weight_kg", 70.0)
		
		if not title or duration_minutes <= 0:
			raise HTTPException(status_code=400, detail="Invalid title or duration")
		
		# Try enhanced service first
		result = enhanced_calorie_service.calculate_calories_from_exercise_name(
			exercise_name=title,
			duration_minutes=duration_minutes,
			user_weight_kg=user_weight_kg
		)
		
		return result
		
	except Exception as e:
		logger.error(f"Error in direct calorie calculation: {e}")
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/exercises/categories")
def get_exercise_categories():
	"""Get all available exercise categories."""
	try:
		categories = enhanced_calorie_service.get_all_categories()
		return {"categories": categories}
	except Exception as e:
		logger.error(f"Error getting exercise categories: {e}")
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/exercises/category/{category}")
def get_exercises_by_category(category: str):
	"""Get all exercises in a specific category."""
	try:
		exercises = enhanced_calorie_service.get_exercises_by_category(category)
		return {"category": category, "exercises": exercises}
	except Exception as e:
		logger.error(f"Error getting exercises by category: {e}")
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/exercises/search")
def search_exercises(q: str = ""):
	"""Search exercises by name or description."""
	try:
		if not q:
			raise HTTPException(status_code=400, detail="Search query required")
		
		exercises = enhanced_calorie_service.search_exercises(q)
		return {"query": q, "exercises": exercises}
	except Exception as e:
		logger.error(f"Error searching exercises: {e}")
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/{workout_id}/calories")
def get_workout_calories(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	"""Get detailed calorie calculation for a workout."""
	workout = db.get(WorkoutSession, workout_id)
	if not workout or workout.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Workout not found")
	
	if not workout.duration_minutes or workout.duration_minutes <= 0:
		raise HTTPException(status_code=400, detail="No duration data available for calorie calculation")
	
	# Calculate calories with detailed information
	calorie_result = calorie_service.calculate_calories(
		workout_title=workout.title,
		duration_minutes=workout.duration_minutes,
		user_weight_kg=70.0
	)
	
	return {
		"workout_id": workout.id,
		"workout_title": workout.title,
		"duration_minutes": workout.duration_minutes,
		"calories_burned": calorie_result["calories_burned"],
		"met_value": calorie_result["met_value"],
		"matched_keywords": calorie_result["matched_keywords"],
		"calculation_details": calorie_result
	}


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	workout = db.get(WorkoutSession, workout_id)
	if not workout or workout.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Workout not found")
	
	# Invalidate cache before deletion
	invalidate_workout_cache(workout_id, current_user.id)
	
	db.delete(workout)
	db.commit()
	return None


@router.get("/stats/summary", response_model=dict)
def get_workout_summary(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	days: int = 30
):
	"""Get workout summary statistics for the user."""
	# Check cache first
	cache_key = f"workout_summary:user:{current_user.id}:days:{days}"
	cached_summary = redis_service.get(cache_key)
	
	if cached_summary:
		logger.info(f"Retrieved cached workout summary for user {current_user.id}")
		return cached_summary
	
	# Calculate date range
	end_date = datetime.now()
	start_date = end_date - timedelta(days=days)
	
	# Get workouts in date range
	workouts = db.execute(
		select(WorkoutSession)
		.where(WorkoutSession.owner_id == current_user.id)
		.where(WorkoutSession.performed_at >= start_date)
		.where(WorkoutSession.performed_at <= end_date)
	).scalars().all()
	
	# Calculate statistics
	total_workouts = len(workouts)
	total_duration = sum(w.duration_minutes or 0 for w in workouts)
	total_calories = sum(w.calories_burned or 0 for w in workouts)
	avg_duration = total_duration / max(total_workouts, 1)
	avg_calories = total_calories / max(total_workouts, 1)
	
	summary = {
		"period_days": days,
		"total_workouts": total_workouts,
		"total_duration_minutes": total_duration,
		"total_calories_burned": total_calories,
		"avg_duration_per_workout": round(avg_duration, 2),
		"avg_calories_per_workout": round(avg_calories, 2),
		"workout_frequency_per_week": round(total_workouts / (days / 7), 2),
		"generated_at": datetime.now().isoformat()
	}
	
	# Cache the summary
	redis_service.set(cache_key, summary, expire=1800)  # 30 minutes
	
	return summary


@router.post("/{workout_id}/recalculate-calories")
def recalculate_calories(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	"""Manually trigger calorie recalculation for a workout."""
	workout = db.get(WorkoutSession, workout_id)
	if not workout or workout.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Workout not found")
	
	# Queue recalculation
	success = rabbitmq_service.publish_workout_processing(workout_id, current_user.id)
	
	if success:
		return {"message": "Calorie recalculation queued successfully", "workout_id": workout_id}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue calorie recalculation")


@router.post("/trigger-analysis")
def trigger_progress_analysis(
	analysis_type: str = "weekly",
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	"""Trigger progress analysis for the current user."""
	if analysis_type not in ["weekly", "monthly"]:
		raise HTTPException(status_code=400, detail="analysis_type must be 'weekly' or 'monthly'")
	
	success = rabbitmq_service.publish_progress_analysis(
		user_id=current_user.id,
		analysis_type=analysis_type,
		period=f"current_{analysis_type}"
	)
	
	if success:
		return {"message": f"{analysis_type.title()} progress analysis queued successfully", "user_id": current_user.id}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue progress analysis")


def cache_workout_data(workout: WorkoutSession, user_id: int):
	"""Cache workout data for quick access."""
	workout_data = {
		"id": workout.id,
		"title": workout.title,
		"duration_minutes": workout.duration_minutes,
		"calories_burned": workout.calories_burned,
		"performed_at": workout.performed_at.isoformat(),
		"user_id": user_id
	}
	
	cache_key = f"workout:{workout.id}:user:{user_id}"
	redis_service.set(cache_key, workout_data, expire=600)  # 10 minutes


def invalidate_workout_cache(workout_id: int, user_id: int):
	"""Invalidate cached workout data."""
	cache_keys = [
		f"workout:{workout_id}:user:{user_id}",
		f"workouts:user:{user_id}:*",
		f"workout_summary:user:{user_id}:*"
	]
	
	for key_pattern in cache_keys:
		redis_service.delete(key_pattern)
