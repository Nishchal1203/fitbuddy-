from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate


router = APIRouter(prefix="/users", tags=["users"])

AVATAR_DIR = Path("uploads") / "profile_images"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


def _avatar_file_candidates(user_id: int) -> list[Path]:
	return list(AVATAR_DIR.glob(f"user_{user_id}.*"))


def _delete_existing_avatars(user_id: int) -> None:
	for file_path in _avatar_file_candidates(user_id):
		try:
			file_path.unlink(missing_ok=True)
		except Exception:
			# Best-effort cleanup; upload path has its own validation and write step.
			pass


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


@router.post("/me/avatar")
async def upload_my_avatar(
	avatar: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
):
	ext = ALLOWED_MIME_TYPES.get((avatar.content_type or "").lower())
	if ext is None:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Unsupported image type. Use JPG, PNG, or WEBP.",
		)

	content = await avatar.read()
	if not content:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
	if len(content) > MAX_AVATAR_BYTES:
		raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds 5MB limit.")

	_delete_existing_avatars(current_user.id)

	target_path = AVATAR_DIR / f"user_{current_user.id}{ext}"
	try:
		target_path.write_bytes(content)
	except Exception:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to save avatar image.",
		)

	return {
		"message": "Avatar uploaded successfully.",
		"avatar_url": "/api/users/me/avatar",
	}


@router.get("/me/avatar")
def get_my_avatar(current_user: User = Depends(get_current_user)):
	candidates = _avatar_file_candidates(current_user.id)
	if not candidates:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found.")

	latest_file = max(candidates, key=lambda p: p.stat().st_mtime)
	return FileResponse(path=latest_file)


@router.delete("/me/avatar")
def delete_my_avatar(current_user: User = Depends(get_current_user)):
	candidates = _avatar_file_candidates(current_user.id)
	if not candidates:
		return {"message": "No avatar found."}

	for file_path in candidates:
		file_path.unlink(missing_ok=True)

	return {"message": "Avatar deleted successfully."}

