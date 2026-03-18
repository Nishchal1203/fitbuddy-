from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.security import decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_db() -> Session:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)
	payload = decode_token(token)
	if payload is None:
		raise credentials_exception
	user_id: str | None = payload.get("sub") if isinstance(payload, dict) else None
	if user_id is None:
		raise credentials_exception
	user = db.get(User, int(user_id))
	if user is None:
		raise credentials_exception
	return user
