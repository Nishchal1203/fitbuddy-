from app.db.session import Base

# Import models here so Alembic and metadata can see them
from app.models.user import User  # noqa: F401
from app.models.exercise import Exercise  # noqa: F401
from app.models.workout import WorkoutSession, Workout  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.progress import Progress  # noqa: F401
