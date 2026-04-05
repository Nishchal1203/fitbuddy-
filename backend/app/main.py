from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.db.session import engine, Base, SessionLocal
from sqlalchemy import text
from app.api.routes import auth as auth_routes
from app.api.routes import exercises as exercises_routes
from app.api.routes import workouts as workouts_routes
from app.api.routes import goals as goals_routes
from app.api.routes import users as users_routes
from app.api.routes import workout_plans as workout_plans_routes
from app.api.routes import progress as progress_routes
from app.api.routes import user_dashboard as user_dashboard_routes
from app.api.routes import health as health_routes
from app.api.routes import reports as reports_routes
from app.api.routes import nutrition as nutrition_routes
from app.api.routes import trainer_chat as trainer_chat_routes
from app.services.system_seed_service import ensure_default_seed_data
import app.db.base  # noqa: F401  # ensure models are imported


settings = get_settings()
app = FastAPI(title=settings.app_name)

origins = [
    "http://localhost:3000",  # Your current React port
    "http://localhost",
    "http://127.0.0.1:3000",  # Alternative localhost format  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    # Safe compatibility upgrades for legacy databases.
    # Uses IF NOT EXISTS (PostgreSQL 9.6+) and individual try/except per statement
    # so a single failure never blocks the remaining patches.
    _ddl_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'local'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS calories_burned NUMERIC",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS level VARCHAR(50)",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration_days INTEGER",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS goal_id INTEGER",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE NOT NULL",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS exercises JSON",
        "ALTER TABLE workouts ALTER COLUMN owner_id DROP NOT NULL",
        "ALTER TABLE exercises ALTER COLUMN owner_id DROP NOT NULL",
    ]
    with engine.execution_options(isolation_level="AUTOCOMMIT").connect() as conn:
        for stmt in _ddl_statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass

    # Ensure system plans and exercises exist for workout/plans pages.
    try:
        with SessionLocal() as db:
            ensure_default_seed_data(db)
    except Exception:
        # Startup should remain resilient if seed step fails.
        pass


@app.options("/{path:path}")
def options_handler(path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

@app.get("/api/health")
def health_check():
    """Health check endpoint for Docker"""
    return {"status": "healthy", "message": "FitBuddy API is running"}

app.include_router(auth_routes.router, prefix="/api")
app.include_router(exercises_routes.router, prefix="/api")
app.include_router(workouts_routes.router, prefix="/api")
app.include_router(goals_routes.router, prefix="/api")
app.include_router(progress_routes.router, prefix="/api")
app.include_router(user_dashboard_routes.router, prefix="/api")
app.include_router(users_routes.router, prefix="/api")
app.include_router(workout_plans_routes.router, prefix="/api")
app.include_router(health_routes.router, prefix="/api")
app.include_router(reports_routes.router, prefix="/api")
app.include_router(nutrition_routes.router, prefix="/api")
app.include_router(trainer_chat_routes.router, prefix="/api")
