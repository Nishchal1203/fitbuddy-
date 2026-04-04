from datetime import date, datetime, timedelta, timezone
from typing import Any, List

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.workout import WorkoutSession
from app.models.progress import BodyMeasurement
from app.models.nutrition import MealLog, HydrationLog
from app.models.goal import Goal
from app.schemas.progress import (
    AchievementBadgeCard,
    MonthlySummaryCardResponse,
    StreakResponse,
    WeightDataPoint,
    WeightTrendResponse,
    ComprehensiveProgressPoint,
    ComprehensiveProgressResponse,
)


def _prev_month_year(month: int, year: int) -> tuple[int, int]:
    if month == 1:
        return 12, year - 1
    return month - 1, year


class ProgressService:
    @staticmethod
    def _workout_days_desc(db: Session, user_id: int) -> List[date]:
        rows = (
            db.query(func.date(WorkoutSession.performed_at))
            .filter(WorkoutSession.owner_id == user_id)
            .distinct()
            .order_by(func.date(WorkoutSession.performed_at).desc())
            .all()
        )
        return [r[0] for r in rows if r[0] is not None]

    @staticmethod
    def get_user_streak(db: Session, user_id: int) -> StreakResponse:
        dates = ProgressService._workout_days_desc(db, user_id)

        last_performed = db.query(func.max(WorkoutSession.performed_at)).filter(
            WorkoutSession.owner_id == user_id
        ).scalar()
        if isinstance(last_performed, datetime):
            dt = last_performed
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            last_workout_iso = dt.isoformat()
        elif dates:
            last_workout_iso = datetime.combine(
                dates[0], datetime.min.time(), tzinfo=timezone.utc
            ).isoformat()
        else:
            last_workout_iso = datetime.now(timezone.utc).isoformat()

        if not dates:
            return StreakResponse(
                current_streak=0,
                longest_streak=0,
                total_workout_days=0,
                last_workout_date=last_workout_iso,
                weekly_activity=[False] * 7,
            )

        today = date.today()
        last_activity = dates[0]

        current_streak = 0
        longest_streak = 0
        temp_streak = 1

        if last_activity == today or last_activity == today - timedelta(days=1):
            current_streak = 1
            check_date = last_activity
            for d in dates[1:]:
                if d == check_date - timedelta(days=1):
                    current_streak += 1
                    check_date = d
                else:
                    break

        for i in range(len(dates) - 1):
            if dates[i] - timedelta(days=1) == dates[i + 1]:
                temp_streak += 1
            else:
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
                temp_streak = 1
        if temp_streak > longest_streak:
            longest_streak = temp_streak
        longest_streak = max(longest_streak, current_streak)

        workout_set = set(dates)
        monday = today - timedelta(days=today.weekday())
        weekly_activity = [(monday + timedelta(days=i)) in workout_set for i in range(7)]

        return StreakResponse(
            current_streak=current_streak,
            longest_streak=longest_streak,
            total_workout_days=len(workout_set),
            last_workout_date=last_workout_iso,
            weekly_activity=weekly_activity,
        )

    @staticmethod
    def _aggregate_month(
        db: Session, user_id: int, month: int, year: int
    ) -> tuple[int, int, float]:
        summary = (
            db.query(
                func.count(WorkoutSession.id).label("total_workouts"),
                func.sum(WorkoutSession.duration_minutes).label("total_minutes"),
                func.sum(WorkoutSession.calories_burned).label("total_calories"),
            )
            .filter(
                WorkoutSession.owner_id == user_id,
                extract("month", WorkoutSession.performed_at) == month,
                extract("year", WorkoutSession.performed_at) == year,
            )
            .first()
        )
        w = summary.total_workouts or 0
        m = int(summary.total_minutes or 0)
        c = float(summary.total_calories or 0.0)
        return w, m, c

    @staticmethod
    def get_monthly_summary_card(
        db: Session, user_id: int, month: int, year: int
    ) -> MonthlySummaryCardResponse:
        w, mins, cal = ProgressService._aggregate_month(db, user_id, month, year)
        pm, py = _prev_month_year(month, year)
        pw, pmins, pcal = ProgressService._aggregate_month(db, user_id, pm, py)
        return MonthlySummaryCardResponse(
            month=month,
            year=year,
            workouts_completed=w,
            total_distance_km=0.0,
            calories_burned=cal,
            active_minutes=mins,
            prev_workouts_completed=pw,
            prev_total_distance_km=0.0,
            prev_calories_burned=pcal,
            prev_active_minutes=pmins,
        )

    @staticmethod
    def get_weight_trend(db: Session, user_id: int, timeframe: str) -> WeightTrendResponse:
        today = date.today()
        if timeframe == "6_months":
            start_date = today - timedelta(days=180)
        elif timeframe == "1_year":
            start_date = today - timedelta(days=365)
        else:
            start_date = today - timedelta(days=30)

        measurements = (
            db.query(BodyMeasurement)
            .filter(
                BodyMeasurement.owner_id == user_id,
                BodyMeasurement.date >= start_date,
                BodyMeasurement.weight.isnot(None),
            )
            .order_by(BodyMeasurement.date.asc())
            .all()
        )

        data_points = [WeightDataPoint(date=m.date, weight=m.weight) for m in measurements]

        current_weight = data_points[-1].weight if data_points else None
        weight_change = None
        if len(data_points) >= 2 and current_weight is not None:
            weight_change = round(current_weight - data_points[0].weight, 2)

        return WeightTrendResponse(
            timeframe=timeframe,
            data=data_points,
            current_weight=current_weight,
            weight_change=weight_change,
        )

    @staticmethod
    def weight_history_for_chart(db: Session, user_id: int) -> List[dict[str, Any]]:
        trend = ProgressService.get_weight_trend(db, user_id, "1_month")
        return [{"date": p.date.isoformat(), "weight": p.weight} for p in trend.data]

    @staticmethod
    def get_body_measurements_card(db: Session, user_id: int) -> dict[str, Any]:
        rows = (
            db.query(BodyMeasurement)
            .filter(BodyMeasurement.owner_id == user_id)
            .order_by(BodyMeasurement.date.desc())
            .limit(2)
            .all()
        )
        if not rows:
            return {}
        latest = rows[0]
        prev = rows[1] if len(rows) > 1 else latest

        def delta(attr: str) -> dict[str, float] | None:
            cur = getattr(latest, attr)
            if cur is None:
                return None
            p = getattr(prev, attr)
            if p is None:
                p = cur
            return {"current": float(cur), "previous": float(p)}

        out: dict[str, Any] = {}
        for api_key, attr in (
            ("chest", "chest"),
            ("waist", "waist"),
            ("biceps", "arms"),
            ("thighs", "legs"),
        ):
            d = delta(attr)
            if d:
                out[api_key] = d
        out["updated_at"] = datetime.combine(
            latest.date, datetime.min.time(), tzinfo=timezone.utc
        ).isoformat()
        return out

    @staticmethod
    def get_comprehensive_progress(
        db: Session, user_id: int, timeframe: str = "1_month"
    ) -> ComprehensiveProgressResponse:
        """
        Aggregate all progress metrics (workouts, diet, goals, measurements) by date.
        Returns a comprehensive timeseries for the given timeframe.
        """
        today = date.today()
        if timeframe == "3_months":
            start_date = today - timedelta(days=90)
        elif timeframe == "6_months":
            start_date = today - timedelta(days=180)
        elif timeframe == "1_year":
            start_date = today - timedelta(days=365)
        else:  # default to 1_month
            start_date = today - timedelta(days=30)

        # Fetch all relevant data
        workouts = (
            db.query(WorkoutSession)
            .filter(
                WorkoutSession.owner_id == user_id,
                func.date(WorkoutSession.performed_at) >= start_date,
            )
            .all()
        )

        meal_logs = (
            db.query(MealLog)
            .filter(
                MealLog.owner_id == user_id,
                MealLog.date >= start_date,
            )
            .all()
        )

        hydration_logs = (
            db.query(HydrationLog)
            .filter(
                HydrationLog.owner_id == user_id,
                HydrationLog.date >= start_date,
            )
            .all()
        )

        measurements = (
            db.query(BodyMeasurement)
            .filter(
                BodyMeasurement.owner_id == user_id,
                BodyMeasurement.date >= start_date,
            )
            .all()
        )

        goals = (
            db.query(Goal)
            .filter(Goal.owner_id == user_id)
            .all()
        )

        # Build day-by-day aggregation
        date_map: dict[date, dict[str, Any]] = {}

        # Aggregate workouts
        for ws in workouts:
            ws_date = func.date(ws.performed_at).compile(compile_kwargs={"literal_binds": True})
            d = ws.performed_at.date()
            if d not in date_map:
                date_map[d] = {
                    "workout_sessions": 0,
                    "workout_calories": 0.0,
                    "workout_duration_minutes": 0,
                }
            date_map[d]["workout_sessions"] += 1
            if ws.calories_burned:
                date_map[d]["workout_calories"] += ws.calories_burned
            if ws.duration_minutes:
                date_map[d]["workout_duration_minutes"] += ws.duration_minutes

        # Aggregate meals
        for meal in meal_logs:
            if meal.date not in date_map:
                date_map[meal.date] = {}
            if "diet_calories_consumed" not in date_map[meal.date]:
                date_map[meal.date]["diet_calories_consumed"] = 0.0
                date_map[meal.date]["diet_macros_protein"] = 0.0
                date_map[meal.date]["diet_macros_carbs"] = 0.0
                date_map[meal.date]["diet_macros_fat"] = 0.0
            date_map[meal.date]["diet_calories_consumed"] += meal.kcal
            date_map[meal.date]["diet_macros_protein"] += meal.protein_g
            date_map[meal.date]["diet_macros_carbs"] += meal.carbs_g
            date_map[meal.date]["diet_macros_fat"] += meal.fat_g

        # Aggregate hydration
        for hydration in hydration_logs:
            if hydration.date not in date_map:
                date_map[hydration.date] = {"hydration_ml": 0}
            if "hydration_ml" not in date_map[hydration.date]:
                date_map[hydration.date]["hydration_ml"] = 0
            date_map[hydration.date]["hydration_ml"] += hydration.amount_ml

        # Add measurement data
        for meas in measurements:
            if meas.date not in date_map:
                date_map[meas.date] = {}
            date_map[meas.date]["weight"] = meas.weight
            date_map[meas.date]["measurement_logged"] = True

        # Count completed goals (filtered to dates when they were completed)
        total_goals = len(goals)
        for goal in goals:
            if goal.is_completed and goal.completed_at:
                goal_date = goal.completed_at.date()
                if goal_date >= start_date:
                    if goal_date not in date_map:
                        date_map[goal_date] = {}
                    if "goals_completed" not in date_map[goal_date]:
                        date_map[goal_date]["goals_completed"] = 0
                    date_map[goal_date]["goals_completed"] += 1

        # Build result list, sorted by date
        result_data = []
        for d in sorted(date_map.keys()):
            point_data = date_map[d]
            point = ComprehensiveProgressPoint(
                date=d.isoformat(),
                weight=point_data.get("weight"),
                workout_sessions=point_data.get("workout_sessions", 0),
                workout_calories=point_data.get("workout_calories", 0.0),
                workout_duration_minutes=point_data.get("workout_duration_minutes", 0),
                diet_calories_consumed=point_data.get("diet_calories_consumed", 0.0),
                diet_macros_protein=point_data.get("diet_macros_protein", 0.0),
                diet_macros_carbs=point_data.get("diet_macros_carbs", 0.0),
                diet_macros_fat=point_data.get("diet_macros_fat", 0.0),
                hydration_ml=point_data.get("hydration_ml", 0),
                goals_completed=point_data.get("goals_completed", 0),
                goals_total=total_goals,
                measurement_logged=point_data.get("measurement_logged", False),
            )
            result_data.append(point)

        # Compute summary stats
        summary = {
            "total_workouts": sum(p.workout_sessions for p in result_data),
            "total_workout_calories": sum(p.workout_calories for p in result_data),
            "total_workout_minutes": sum(p.workout_duration_minutes for p in result_data),
            "total_calories_consumed": sum(p.diet_calories_consumed for p in result_data),
            "total_protein": sum(p.diet_macros_protein for p in result_data),
            "total_carbs": sum(p.diet_macros_carbs for p in result_data),
            "total_fat": sum(p.diet_macros_fat for p in result_data),
            "total_hydration_ml": sum(p.hydration_ml for p in result_data),
            "days_with_measurements": sum(1 for p in result_data if p.measurement_logged),
            "goals_completed_in_period": sum(p.goals_completed for p in result_data),
        }

        return ComprehensiveProgressResponse(
            timeframe=timeframe,
            data=result_data,
            summary=summary,
        )


progress_service = ProgressService()
