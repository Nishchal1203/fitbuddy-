# this file is for hashing the password and creating the access token and decoding the access token automatically taking from the config.py file
from datetime import datetime, timedelta, timezone
import secrets
from typing import Any, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def get_password_hash(password: str) -> str:
	# bcrypt has a 72-byte limit, so we need to truncate longer passwords
	# Convert to bytes and truncate to 72 bytes, then convert back to string
	password_bytes = password.encode('utf-8')
	if len(password_bytes) > 72:
		password_bytes = password_bytes[:72]
		password = password_bytes.decode('utf-8', errors='ignore')
	return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
	# Apply the same truncation logic as in get_password_hash for consistency
	password_bytes = plain_password.encode('utf-8')
	if len(password_bytes) > 72:
		password_bytes = password_bytes[:72]
		plain_password = password_bytes.decode('utf-8', errors='ignore')
	return pwd_context.verify(plain_password, password_hash)


def _create_token(subject: str | int, token_use: str, expires_delta: timedelta) -> str:
	expire = datetime.now(timezone.utc) + expires_delta
	to_encode: dict[str, Any] = {"sub": str(subject), "exp": expire, "token_use": token_use}
	encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
	return encoded_jwt


def create_access_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
	if expires_delta is None:
		expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
	return _create_token(subject, "access", expires_delta)


def create_refresh_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
	if expires_delta is None:
		expires_delta = timedelta(days=settings.refresh_token_expire_days)
	return _create_token(subject, "refresh", expires_delta)


def create_unusable_password_hash() -> str:
	return get_password_hash(secrets.token_urlsafe(48))


def decode_token(token: str) -> dict[str, Any] | None:
	try:
		payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
		return payload
	except JWTError:
		return None

