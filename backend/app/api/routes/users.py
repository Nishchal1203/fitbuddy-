from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate


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

