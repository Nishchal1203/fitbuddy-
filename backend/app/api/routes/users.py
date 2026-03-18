from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workout import Workout, SavedPlan
from app.schemas.user import UserRead, UserUpdate
from app.schemas.workout import WorkoutRead


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
	return current_user


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	data = payload.model_dump(exclude_unset=True)
	for key, value in data.items():
		setattr(current_user, key, value)
	db.add(current_user)
	db.commit()
	db.refresh(current_user)
	return current_user


# Saved plans: /users/me/saved-plans

@router.post("/me/saved-plans", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def save_plan(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	plan = db.get(Workout, workout_id)
	if not plan:
		raise HTTPException(status_code=404, detail="Plan not found")
	# prevent duplicates
	exists = db.execute(
		select(SavedPlan).where(SavedPlan.user_id == current_user.id, SavedPlan.workout_id == workout_id)
	).scalars().first()
	if not exists:
		db.add(SavedPlan(user_id=current_user.id, workout_id=workout_id))
		db.commit()
	return plan


@router.get("/me/saved-plans", response_model=list[WorkoutRead])
def list_saved_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	stmt = (
		select(Workout)
		.join(SavedPlan, SavedPlan.workout_id == Workout.id)
		.where(SavedPlan.user_id == current_user.id)
		.order_by(Workout.title)
	)
	rows = db.execute(stmt).scalars().all()
	return rows


@router.delete("/me/saved-plans/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_plan(workout_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	result = db.execute(
		delete(SavedPlan).where(SavedPlan.user_id == current_user.id, SavedPlan.workout_id == workout_id)
	)
	if result.rowcount:
		db.commit()
	return None

