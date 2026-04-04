from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.progress import BodyMeasurement, UserAchievement
from app.schemas.progress import (
    AchievementBadgeCard,
    BodyMeasurementCreate,
    BodyMeasurementResponse,
    MonthlySummaryCardResponse,
    StreakResponse,
    WeightHistoryEntry,
    WeightTrendResponse,
    ComprehensiveProgressResponse,
)
from app.services.achievement_badge_map import achievement_to_badge_card
from app.services.progress_service import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/streak", response_model=StreakResponse)
def get_user_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return progress_service.get_user_streak(db=db, user_id=current_user.id)


@router.get("/monthly-summary", response_model=MonthlySummaryCardResponse)
def get_monthly_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    m = month if month is not None else today.month
    y = year if year is not None else today.year
    return progress_service.get_monthly_summary_card(db=db, user_id=current_user.id, month=m, year=y)


@router.get("/weight-history", response_model=List[WeightHistoryEntry])
def get_weight_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw = progress_service.weight_history_for_chart(db=db, user_id=current_user.id)
    return [WeightHistoryEntry(**row) for row in raw]


@router.get("/trend/weight", response_model=WeightTrendResponse)
def get_weight_trend(
    timeframe: str = Query(
        "1_month", description="Valid options: '1_month', '6_months', '1_year'"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_timeframes = ["1_month", "6_months", "1_year"]
    if timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Must be one of: {valid_timeframes}",
        )
    return progress_service.get_weight_trend(
        db=db, user_id=current_user.id, timeframe=timeframe
    )


@router.post("/measurements", response_model=BodyMeasurementResponse)
def log_body_measurement(
    measurement_in: BodyMeasurementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_measurement = (
        db.query(BodyMeasurement)
        .filter(
            BodyMeasurement.owner_id == current_user.id,
            BodyMeasurement.date == measurement_in.date,
        )
        .first()
    )

    if existing_measurement:
        for field, value in measurement_in.model_dump(exclude_unset=True).items():
            setattr(existing_measurement, field, value)
        db.commit()
        db.refresh(existing_measurement)
        return existing_measurement

    new_measurement = BodyMeasurement(
        **measurement_in.model_dump(),
        owner_id=current_user.id,
    )
    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)
    return new_measurement


@router.get("/measurements/latest", response_model=BodyMeasurementResponse)
def get_latest_measurements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    measurement = (
        db.query(BodyMeasurement)
        .filter(BodyMeasurement.owner_id == current_user.id)
        .order_by(BodyMeasurement.date.desc())
        .first()
    )
    if not measurement:
        raise HTTPException(status_code=404, detail="No measurements found")
    return measurement


@router.get("/achievements", response_model=List[AchievementBadgeCard])
def get_user_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    achievements = (
        db.query(UserAchievement)
        .filter(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.unlocked_at.desc())
        .all()
    )
    return [achievement_to_badge_card(a) for a in achievements]


@router.get("/comprehensive", response_model=ComprehensiveProgressResponse)
def get_comprehensive_progress(
    timeframe: str = Query(
        "1_month", description="Valid options: '1_month', '3_months', '6_months', '1_year'"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive progress tracking across all metrics:
    - Weight & body measurements
    - Workout sessions, duration, calories burned
    - Diet (calories, macros)
    - Hydration
    - Goal completions
    """
    valid_timeframes = ["1_month", "3_months", "6_months", "1_year"]
    if timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Must be one of: {valid_timeframes}",
        )
    return progress_service.get_comprehensive_progress(
        db=db, user_id=current_user.id, timeframe=timeframe
    )
