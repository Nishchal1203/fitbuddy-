import secrets
from urllib.parse import quote, urlencode

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserRead
from app.security import (
	create_access_token,
	create_refresh_token,
	create_unusable_password_hash,
	decode_token,
	get_password_hash,
	verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
	response.set_cookie(
		key="refresh_token",
		value=refresh_token,
		httponly=True,
		secure=settings.auth_cookie_secure,
		samesite="lax",
		max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
		path="/",
	)


def _set_google_state_cookie(response: Response, state: str) -> None:
	response.set_cookie(
		key="google_oauth_state",
		value=state,
		httponly=True,
		secure=settings.auth_cookie_secure,
		samesite="lax",
		max_age=10 * 60,
		path="/",
	)


def _clear_google_state_cookie(response: Response) -> None:
	response.delete_cookie(key="google_oauth_state", path="/")


def _redirect_google_error(detail: str) -> RedirectResponse:
	params = urlencode({"google_error": detail})
	response = RedirectResponse(
		url=f"{settings.frontend_base_url.rstrip('/')}/login?{params}",
		status_code=status.HTTP_302_FOUND,
	)
	_clear_google_state_cookie(response)
	return response


def _build_google_authorize_url(state: str) -> str:
	if not settings.google_client_id or not settings.google_redirect_uri:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Google sign-in is not configured",
		)

	params = urlencode(
		{
			"client_id": settings.google_client_id,
			"redirect_uri": settings.google_redirect_uri,
			"response_type": "code",
			"scope": "openid email profile",
			"prompt": "select_account",
			"access_type": "offline",
			"state": state,
		}
	)
	return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"


def _exchange_google_code(code: str) -> dict[str, str]:
	if not settings.google_client_id or not settings.google_client_secret:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Google sign-in is not configured",
		)

	response = requests.post(
		"https://oauth2.googleapis.com/token",
		data={
			"code": code,
			"client_id": settings.google_client_id,
			"client_secret": settings.google_client_secret,
			"redirect_uri": settings.google_redirect_uri,
			"grant_type": "authorization_code",
		},
		timeout=15,
	)
	if not response.ok:
		detail = "Google authorization failed"
		try:
			error_payload = response.json()
			message = error_payload.get("error_description") or error_payload.get("error")
			if isinstance(message, str) and message.strip():
				detail = f"Google authorization failed: {message.strip()}"
		except ValueError:
			pass
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

	payload = response.json()
	access_token = payload.get("access_token")
	if not access_token:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google authorization failed")
	return payload


def _fetch_google_profile(access_token: str) -> dict[str, str | bool]:
	response = requests.get(
		"https://openidconnect.googleapis.com/v1/userinfo",
		headers={"Authorization": f"Bearer {access_token}"},
		timeout=15,
	)
	if not response.ok:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google profile lookup failed")
	return response.json()

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
	existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")
	user = User(email=payload.email, full_name=payload.full_name, password_hash=get_password_hash(payload.password), experience_level=payload.experience_level)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


@router.post("/token", response_model=Token)
def login_for_access_token(
	response: Response,
	form_data: OAuth2PasswordRequestForm = Depends(),
	db: Session = Depends(get_db),
):
	user = db.execute(select(User).where(User.email == form_data.username)).scalar_one_or_none()
	if not user or not verify_password(form_data.password, user.password_hash):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
	access_token = create_access_token(subject=user.id)
	refresh_token = create_refresh_token(subject=user.id)
	_set_refresh_cookie(response, refresh_token)
	return Token(access_token=access_token)


@router.get("/google/start")
def start_google_auth():
	state = secrets.token_urlsafe(32)
	response = RedirectResponse(url=_build_google_authorize_url(state), status_code=status.HTTP_302_FOUND)
	_set_google_state_cookie(response, state)
	return response


@router.get("/google/callback")
def google_auth_callback(
	request: Request,
	code: str | None = None,
	state: str | None = None,
	error: str | None = None,
	db: Session = Depends(get_db),
):
	if error:
		return _redirect_google_error(f"Google sign-in failed: {error}")
	if not code or not state:
		return _redirect_google_error("Missing Google authorization code")

	state_cookie = request.cookies.get("google_oauth_state")
	if not state_cookie or state_cookie != state:
		return _redirect_google_error("Invalid Google OAuth state")

	try:
		token_payload = _exchange_google_code(code)
		profile = _fetch_google_profile(token_payload["access_token"])
	except HTTPException as exc:
		detail = exc.detail if isinstance(exc.detail, str) else "Google authorization failed"
		return _redirect_google_error(detail)

	email = profile.get("email")
	google_sub = profile.get("sub")
	full_name = profile.get("name") or email or "Google User"
	email_verified = profile.get("email_verified")

	if not email or not google_sub:
		return _redirect_google_error("Google account information is incomplete")
	if email_verified is False:
		return _redirect_google_error("Google email is not verified")

	user = db.execute(select(User).where((User.google_sub == google_sub) | (User.email == email))).scalar_one_or_none()
	if user is None:
		user = User(
			email=email,
			full_name=full_name,
			password_hash=create_unusable_password_hash(),
			experience_level="Beginner",
			auth_provider="google",
			google_sub=google_sub,
		)
		db.add(user)
	else:
		user.email = email
		user.full_name = user.full_name or full_name
		user.auth_provider = "google"
		user.google_sub = google_sub

	db.commit()
	db.refresh(user)

	access_token = create_access_token(subject=user.id)
	refresh_token = create_refresh_token(subject=user.id)
	redirect_response = RedirectResponse(
		url=f"{settings.frontend_base_url.rstrip('/')}/dashboard#access_token={quote(access_token, safe='')}",
		status_code=status.HTTP_302_FOUND,
	)
	_set_refresh_cookie(redirect_response, refresh_token)
	_clear_google_state_cookie(redirect_response)
	return redirect_response


@router.post("/refresh", response_model=Token)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
	refresh_token = request.cookies.get("refresh_token")
	if not refresh_token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

	payload = decode_token(refresh_token)
	if payload is None or payload.get("token_use") != "refresh":
		response.delete_cookie(key="refresh_token", path="/")
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

	user_id = payload.get("sub") if isinstance(payload, dict) else None
	if user_id is None:
		response.delete_cookie(key="refresh_token", path="/")
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

	user = db.get(User, int(user_id))
	if user is None:
		response.delete_cookie(key="refresh_token", path="/")
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

	access_token = create_access_token(subject=user.id)
	new_refresh_token = create_refresh_token(subject=user.id)
	_set_refresh_cookie(response, new_refresh_token)
	return Token(access_token=access_token)


@router.post("/logout")
def logout(response: Response):
	response.delete_cookie(key="refresh_token", path="/")
	response.delete_cookie(key="google_oauth_state", path="/")
	return {"detail": "Logged out"}


