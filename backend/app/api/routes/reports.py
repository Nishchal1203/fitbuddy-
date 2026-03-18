from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.redis_service import redis_service
from app.services.rabbitmq_service import rabbitmq_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/weekly")
def get_weekly_report(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	week_start_date: Optional[str] = None
):
	"""Get weekly progress report for the current user."""
	# Check cache first
	cache_key = f"report:weekly:user:{current_user.id}:{week_start_date or 'current'}"
	cached_report = redis_service.get(cache_key)
	
	if cached_report:
		logger.info(f"Retrieved cached weekly report for user {current_user.id}")
		return cached_report
	
	# If not cached, trigger report generation
	success = rabbitmq_service.publish_report_generation(
		user_id=current_user.id,
		report_type="weekly"
	)
	
	if success:
		return {
			"message": "Weekly report generation queued successfully",
			"user_id": current_user.id,
			"report_type": "weekly",
			"status": "processing",
			"estimated_completion": "2-3 minutes"
		}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue weekly report generation")


@router.get("/monthly")
def get_monthly_report(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	month_start_date: Optional[str] = None
):
	"""Get monthly progress report for the current user."""
	# Check cache first
	cache_key = f"report:monthly:user:{current_user.id}:{month_start_date or 'current'}"
	cached_report = redis_service.get(cache_key)
	
	if cached_report:
		logger.info(f"Retrieved cached monthly report for user {current_user.id}")
		return cached_report
	
	# If not cached, trigger report generation
	success = rabbitmq_service.publish_report_generation(
		user_id=current_user.id,
		report_type="monthly"
	)
	
	if success:
		return {
			"message": "Monthly report generation queued successfully",
			"user_id": current_user.id,
			"report_type": "monthly",
			"status": "processing",
			"estimated_completion": "3-5 minutes"
		}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue monthly report generation")


@router.get("/progress-analysis")
def get_progress_analysis(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	analysis_type: str = "weekly"
):
	"""Get progress analysis for the current user."""
	if analysis_type not in ["weekly", "monthly"]:
		raise HTTPException(status_code=400, detail="analysis_type must be 'weekly' or 'monthly'")
	
	# Check cache first
	cache_key = f"progress:{analysis_type}:user:{current_user.id}:current"
	cached_analysis = redis_service.get(cache_key)
	
	if cached_analysis:
		logger.info(f"Retrieved cached {analysis_type} progress analysis for user {current_user.id}")
		return cached_analysis
	
	# If not cached, trigger analysis
	success = rabbitmq_service.publish_progress_analysis(
		user_id=current_user.id,
		analysis_type=analysis_type,
		period=f"current_{analysis_type}"
	)
	
	if success:
		return {
			"message": f"{analysis_type.title()} progress analysis queued successfully",
			"user_id": current_user.id,
			"analysis_type": analysis_type,
			"status": "processing",
			"estimated_completion": "1-2 minutes"
		}
	else:
		raise HTTPException(status_code=500, detail=f"Failed to queue {analysis_type} progress analysis")


@router.get("/workout-trends")
def get_workout_trends(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	period: str = "monthly"
):
	"""Get workout trends for the current user."""
	if period not in ["weekly", "monthly", "yearly"]:
		raise HTTPException(status_code=400, detail="period must be 'weekly', 'monthly', or 'yearly'")
	
	# Check cache first
	cache_key = f"trends:user:{current_user.id}:{period}"
	cached_trends = redis_service.get(cache_key)
	
	if cached_trends:
		logger.info(f"Retrieved cached workout trends for user {current_user.id}")
		return cached_trends
	
	# If not cached, trigger trend calculation
	success = rabbitmq_service.publish_batch_processing(
		user_id=current_user.id,
		start_date=(datetime.now() - timedelta(days=30)).isoformat(),
		end_date=datetime.now().isoformat()
	)
	
	if success:
		return {
			"message": f"Workout trends calculation queued successfully",
			"user_id": current_user.id,
			"period": period,
			"status": "processing",
			"estimated_completion": "2-3 minutes"
		}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue workout trends calculation")


@router.get("/goal-performance")
def get_goal_performance(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	"""Get goal performance analysis for the current user."""
	# Check cache first
	cache_key = f"goal_analysis:user:{current_user.id}"
	cached_analysis = redis_service.get(cache_key)
	
	if cached_analysis:
		logger.info(f"Retrieved cached goal performance analysis for user {current_user.id}")
		return cached_analysis
	
	# If not cached, trigger analysis
	success = rabbitmq_service.publish_goal_reminder(
		user_id=current_user.id,
		goal_id=0,  # 0 indicates analyze all goals
		reminder_type="performance_analysis"
	)
	
	if success:
		return {
			"message": "Goal performance analysis queued successfully",
			"user_id": current_user.id,
			"status": "processing",
			"estimated_completion": "1-2 minutes"
		}
	else:
		raise HTTPException(status_code=500, detail="Failed to queue goal performance analysis")


@router.get("/available")
def get_available_reports(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	"""Get list of available reports and their status."""
	available_reports = []
	
	# Check for cached reports
	report_types = ["weekly", "monthly"]
	analysis_types = ["weekly", "monthly"]
	
	for report_type in report_types:
		cache_key = f"report:{report_type}:user:{current_user.id}:current"
		if redis_service.exists(cache_key):
			available_reports.append({
				"type": f"{report_type}_report",
				"status": "available",
				"cached_at": "recent"
			})
		else:
			available_reports.append({
				"type": f"{report_type}_report",
				"status": "not_available",
				"can_generate": True
			})
	
	for analysis_type in analysis_types:
		cache_key = f"progress:{analysis_type}:user:{current_user.id}:current"
		if redis_service.exists(cache_key):
			available_reports.append({
				"type": f"{analysis_type}_progress_analysis",
				"status": "available",
				"cached_at": "recent"
			})
		else:
			available_reports.append({
				"type": f"{analysis_type}_progress_analysis",
				"status": "not_available",
				"can_generate": True
			})
	
	# Check goal analysis
	goal_cache_key = f"goal_analysis:user:{current_user.id}"
	if redis_service.exists(goal_cache_key):
		available_reports.append({
			"type": "goal_performance_analysis",
			"status": "available",
			"cached_at": "recent"
		})
	else:
		available_reports.append({
			"type": "goal_performance_analysis",
			"status": "not_available",
			"can_generate": True
		})
	
	return {
		"user_id": current_user.id,
		"available_reports": available_reports,
		"generated_at": datetime.now().isoformat()
	}


@router.post("/generate-all")
def generate_all_reports(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user)
):
	"""Generate all available reports for the current user."""
	results = []
	
	# Queue weekly report
	weekly_success = rabbitmq_service.publish_report_generation(
		user_id=current_user.id,
		report_type="weekly"
	)
	results.append({"type": "weekly_report", "queued": weekly_success})
	
	# Queue monthly report
	monthly_success = rabbitmq_service.publish_report_generation(
		user_id=current_user.id,
		report_type="monthly"
	)
	results.append({"type": "monthly_report", "queued": monthly_success})
	
	# Queue progress analysis
	progress_success = rabbitmq_service.publish_progress_analysis(
		user_id=current_user.id,
		analysis_type="weekly",
		period="current_week"
	)
	results.append({"type": "weekly_progress_analysis", "queued": progress_success})
	
	# Queue goal analysis
	goal_success = rabbitmq_service.publish_goal_reminder(
		user_id=current_user.id,
		goal_id=0,
		reminder_type="performance_analysis"
	)
	results.append({"type": "goal_performance_analysis", "queued": goal_success})
	
	successful_queues = sum(1 for result in results if result["queued"])
	
	return {
		"message": f"Queued {successful_queues}/{len(results)} report generations",
		"user_id": current_user.id,
		"results": results,
		"estimated_completion": "5-10 minutes",
		"queued_at": datetime.now().isoformat()
	}
