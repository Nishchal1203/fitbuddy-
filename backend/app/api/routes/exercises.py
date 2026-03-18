from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate
from app.services.system_seed_service import seed_system_exercises

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.post("/", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
def create_exercise(payload: ExerciseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	ex = Exercise(
		name=payload.name,
		category=payload.category,
		description=payload.description,
		owner_id=current_user.id,
	)
	db.add(ex)
	db.commit()
	db.refresh(ex)
	return ex


@router.get("/", response_model=list[ExerciseRead])
def list_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	exercises = db.execute(
		select(Exercise)
		.where(or_(Exercise.owner_id.is_(None), Exercise.owner_id == current_user.id))
		.order_by(Exercise.name.asc())
	).scalars().all()

	# Self-heal if startup seed step was skipped or failed.
	if not exercises:
		seed_system_exercises(db)
		exercises = db.execute(
			select(Exercise)
			.where(or_(Exercise.owner_id.is_(None), Exercise.owner_id == current_user.id))
			.order_by(Exercise.name.asc())
		).scalars().all()

	return exercises


@router.get("/{exercise_id}", response_model=ExerciseRead)
def get_exercise(exercise_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	ex = db.get(Exercise, exercise_id)
	if not ex or (ex.owner_id is not None and ex.owner_id != current_user.id):
		raise HTTPException(status_code=404, detail="Exercise not found")
	return ex


@router.patch("/{exercise_id}", response_model=ExerciseRead)
def update_exercise(exercise_id: int, payload: ExerciseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	ex = db.get(Exercise, exercise_id)
	if not ex or ex.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Exercise not found")
	data = payload.model_dump(exclude_unset=True) # .model_dump is used to convert the pydantic model to a dictionary and the exclude_unset = True is used to ignore everything else that has been default value or was not provided
	for key, value in data.items():
		setattr(ex, key, value)
	db.add(ex)
	db.commit()
	db.refresh(ex)
	return ex


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(exercise_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	ex = db.get(Exercise, exercise_id)
	if not ex or ex.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Exercise not found")
	db.delete(ex)
	db.commit()
	return None


