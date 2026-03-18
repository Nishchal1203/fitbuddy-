from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.progress import Progress
from app.schemas.progress import ProgressCreate, ProgressRead, ProgressUpdate

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("/", response_model=ProgressRead, status_code=status.HTTP_201_CREATED)
def create_progress(payload: ProgressCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	entry = Progress(
		date=payload.date,
		metric_name=payload.metric_name,
		metric_value=payload.metric_value,
		unit=payload.unit,
		owner_id=current_user.id,
	)
	db.add(entry)
	db.commit()
	db.refresh(entry)
	return entry


@router.get("/", response_model=list[ProgressRead])
def list_progress(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	rows = db.execute(select(Progress).where(Progress.owner_id == current_user.id).order_by(Progress.date.desc())).scalars().all()
	return rows


@router.get("/{entry_id}", response_model=ProgressRead)
def get_progress(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	entry = db.get(Progress, entry_id)
	if not entry or entry.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Progress entry not found")
	return entry


@router.patch("/{entry_id}", response_model=ProgressRead)
def update_progress(entry_id: int, payload: ProgressUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	entry = db.get(Progress, entry_id)
	if not entry or entry.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Progress entry not found")
	data = payload.model_dump(exclude_unset=True)
	for k, v in data.items():
		setattr(entry, k, v)
	db.add(entry)
	db.commit()
	db.refresh(entry)
	return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_progress(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	entry = db.get(Progress, entry_id)
	if not entry or entry.owner_id != current_user.id:
		raise HTTPException(status_code=404, detail="Progress entry not found")
	db.delete(entry)
	db.commit()
	return None
