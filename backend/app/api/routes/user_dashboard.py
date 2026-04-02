from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.progress import BodyMeasurementsCardResponse
from app.services.progress_service import progress_service

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/measurements", response_model=BodyMeasurementsCardResponse)
def get_body_measurements_for_card(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = progress_service.get_body_measurements_card(db, current_user.id)
    return BodyMeasurementsCardResponse.model_validate(data)
