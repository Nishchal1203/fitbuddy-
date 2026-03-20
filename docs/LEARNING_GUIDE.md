## FitBuddy Backend – Learning Guide

This guide explains how the backend is structured, what each file does, and how requests flow through the system. Use it to learn fast and enhance features confidently.

### High-level architecture
- **FastAPI app** exposes REST endpoints (under `/api`).
- **Pydantic schemas** validate request/response bodies.
- **SQLAlchemy models** represent database tables.
- **Dependency layer** provides DB sessions and authentication.
- **Security** handles password hashing and JWT token creation/validation.
- **Config** centralizes environment/configuration such as `DATABASE_URL` and JWT settings.

### How a request flows
1) Client calls an endpoint (e.g., `POST /api/workouts`).
2) FastAPI parses and validates the payload using a Pydantic schema.
3) Dependency `get_current_user` validates the Bearer token and loads the user.
4) Route handler uses a SQLAlchemy session (`get_db`) to read/write the database.
5) Response is returned as a schema (with `model_config = {"from_attributes": True}` so ORM models serialize cleanly).

---

## Files and their roles

### App entrypoint
- `app/main.py`
  - Creates the FastAPI app instance.
  - Includes all routers under the `/api` prefix.
  - On startup: creates tables (metadata) and safely adds missing columns (e.g., `duration_minutes` on `workout_sessions`).

### Configuration
- `app/core/config.py`
  - Defines `Settings` (via `pydantic_settings.BaseSettings`).
  - Key fields:
    - `database_url` (alias `DATABASE_URL`), defaulting to PostgreSQL.
    - `jwt_secret_key`, `jwt_algorithm`, `access_token_expire_minutes`.
  - `get_settings()` to access a singleton settings object.

### Database
- `app/db/session.py`
  - Creates the SQLAlchemy `engine` from `settings.database_url`.
  - Provides `SessionLocal` (session factory) and the base class `Base` (DeclarativeBase).
  - Handles SQLite-specific `connect_args` when needed.

- `app/db/base.py`
  - Imports all model classes so `Base.metadata` knows all tables.
  - Ensures Alembic/metadata can see models.

### Models (SQLAlchemy)
- `app/models/user.py`
  - `User` table: `id`, `email`, `full_name`, `password_hash`.
  - Relationships:
    - `exercises` (to `Exercise`)
    - `workouts` (to `WorkoutSession`)
    - `workout_plans` (to `Workout`)
    - `goals` (to `Goal`)
    - `progress_entries` (to `Progress`)

- `app/models/exercise.py`
  - `Exercise` table: `id`, `name`, `category`, `description`, `owner_id`.
  - Linked to the `User` who owns the exercise entry.

- `app/models/workout.py`
  - `WorkoutSession` table (a performed/logged session):
    - `title`, `notes`, `performed_at`, `duration_minutes`, `owner_id`.
  - `Workout` table (a plan/template):
    - `title`, `description`, `created_at`, `owner_id`.

- `app/models/goal.py`
  - `Goal` table: `title`, `description`, `target_date`, `is_completed`, `owner_id`.

- `app/models/progress.py`
  - `Progress` table: `date`, `metric_name`, `metric_value`, `unit`, `owner_id`.

### Schemas (Pydantic)
- `app/schemas/user.py`
  - `UserCreate` (email, password, full_name) and `UserRead` (id + user fields).

- `app/schemas/auth.py`
  - `Token` for JWT responses (`access_token`, `token_type`).

- `app/schemas/exercise.py`
  - `ExerciseBase` enforces `category` via `Literal["Cardio", "Strength", "Flexibility"]`.
  - `ExerciseCreate`, `ExerciseUpdate`, `ExerciseRead` (with `id`).

- `app/schemas/workout.py`
  - `WorkoutBase`: `title`, `notes?`, `performed_at?`, `duration_minutes?`.
  - `WorkoutCreate`, `WorkoutUpdate`, `WorkoutRead`.

- `app/schemas/goal.py`
  - `GoalBase`: `title`, `description?`, `target_date?`, `is_completed`.
  - `GoalCreate`, `GoalUpdate`, `GoalRead`.

- `app/schemas/progress.py`
  - `ProgressBase`: `date`, `metric_name`, `metric_value`, `unit?`.
  - `ProgressCreate`, `ProgressUpdate`, `ProgressRead`.

### Dependencies and Security
- `app/api/deps.py`
  - `get_db()`: yields a SQLAlchemy session per request.
  - `oauth2_scheme`: FastAPI OAuth2 bearer token extractor.
  - `get_current_user()`: validates JWT, loads `User`, raises 401 if invalid.

- `app/security.py`
  - Password hashing/verification using Passlib (bcrypt).
  - JWT creation and decoding using `python-jose`.

### Routes (FastAPI routers)
- `app/api/routes/auth.py`
  - `POST /api/auth/register`: create user.
  - `POST /api/auth/token`: obtain JWT using username (email) + password.

- `app/api/routes/exercises.py`
  - CRUD under `/api/exercises` for your exercise library.
  - Category is validated (Cardio/Strength/Flexibility) at schema level.

- `app/api/routes/workouts.py`
  - CRUD under `/api/workouts` for performed workout sessions.
  - Supports `duration_minutes` tracking.

- `app/api/routes/goals.py`
  - CRUD under `/api/goals`.

- `app/api/routes/progress.py`
  - CRUD under `/api/progress` for metrics like weight/measurements/performance.

---

## Concepts: Exercise vs Workout vs Workout Session
- **Exercise**: a library item (definition) with a name, category, description. Think of it as a reusable building block.
- **Workout (Plan/Template)**: a routine to follow (reusable plan). Model exists; endpoints can be added later.
- **Workout Session (Performed Log)**: what you actually did on a given date, with notes and duration.

Typical lifecycle:
1) Build exercises in your library (enforced categories).
2) (Optional) Create a `Workout` plan that references multiple exercises.
3) Log a `WorkoutSession` when you perform a workout (duration, notes, date/time).

---

## Running and testing
1) Activate venv and run server from project root:
   - Windows PowerShell: `venv\Scripts\activate; uvicorn app.main:app --reload`
2) Swagger UI: open `http://127.0.0.1:8000/docs`.
3) Authorize (JWT):
   - Register via `POST /api/auth/register`.
   - Get token via `POST /api/auth/token` (form fields `username`, `password`).
   - Click Authorize in Swagger and paste the `access_token`.

---

## Database configuration
- Configured to use PostgreSQL by default: `postgresql+psycopg2://postgres:root123@localhost:5432/fitbuddy`.
- On startup, tables are created if missing. A small safe migration adds `duration_minutes` column if it doesn't exist.

---

## Advanced Python Concepts Used

### Forward References and Type Annotations
The project uses modern Python patterns for handling forward references in SQLAlchemy models:

#### `from __future__ import annotations`
- **Purpose**: Makes all type annotations lazy-evaluated (treated as strings at runtime)
- **Location**: Added to all model files (`app/models/*.py`)
- **Benefit**: Allows forward references without circular import issues
- **Example**:
  ```python
  from __future__ import annotations
  
  class User(Base):
      exercises: Mapped[list[Exercise]] = relationship(...)  # Exercise not imported yet!
  ```

#### `TYPE_CHECKING` Pattern
- **Purpose**: Provides type hints for static analysis without runtime imports
- **Location**: Used in all model files for forward references
- **Benefit**: Eliminates linter warnings while preventing circular imports
- **Example**:
  ```python
  from typing import TYPE_CHECKING
  
  if TYPE_CHECKING:
      from app.models.exercise import Exercise
      from app.models.workout import WorkoutSession, Workout
      from app.models.goal import Goal
      from app.models.progress import Progress
  
  class User(Base):
      exercises: Mapped[list[Exercise]] = relationship(...)
  ```

#### Why This Pattern?
1. **No Circular Imports**: `TYPE_CHECKING` imports only exist during static analysis
2. **Clean Runtime**: No unnecessary imports at runtime
3. **Perfect Type Hints**: IDEs and linters understand all relationships
4. **Industry Standard**: Used by major Python projects and frameworks

### Virtual Environment Best Practices
- **Activation**: Always activate venv before running commands
- **PowerShell**: `.\venv\Scripts\Activate.ps1` (may require `Set-ExecutionPolicy RemoteSigned`)
- **Dependencies**: Install with `.\venv\Scripts\pip.exe install -r requirements.txt`
- **IDE Configuration**: Select venv Python interpreter in VS Code/Cursor

### Email Validation
- **Package**: `email-validator` (required for Pydantic's `EmailStr`)
- **Usage**: Used in schemas for email validation
- **Installation**: `pip install email-validator`

---

## Troubleshooting Common Issues

### Import Errors
- **Problem**: "Import could not be resolved" warnings in IDE
- **Solution**: Configure IDE to use virtual environment Python interpreter
- **Steps**: `Ctrl+Shift+P` → `Python: Select Interpreter` → Choose venv path

### PowerShell Execution Policy
- **Problem**: "Cannot be loaded because running scripts is disabled"
- **Solution**: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **Then**: `.\venv\Scripts\Activate.ps1`

### Forward Reference Errors
- **Problem**: "NameError: name 'Exercise' is not defined"
- **Solution**: Ensure `from __future__ import annotations` is at the top of model files
- **Check**: All model files should have this import

### Email Validation Errors
- **Problem**: "email-validator is not installed"
- **Solution**: `pip install email-validator`
- **Note**: Required for Pydantic's `EmailStr` type

### Virtual Environment Issues
- **Problem**: Packages not found despite installation
- **Solution**: Always activate venv first: `.\venv\Scripts\Activate.ps1`
- **Verify**: Check `python -c "import sys; print(sys.executable)"` shows venv path

---

## What to build next (suggestions)
- CRUD endpoints for `Workout` (plan/template).
- Relations: Workout ↔ Exercises (with target sets/reps), Session ↔ Exercises (with performed sets/reps/weights) to enable detailed logging and analytics.
- Alembic migrations for schema changes across environments.

---

## Quick endpoint cheat sheet
- Auth: `POST /api/auth/register`, `POST /api/auth/token`.
- Exercises: `GET/POST /api/exercises`, `GET/PATCH/DELETE /api/exercises/{id}`.
- Workouts (sessions): `GET/POST /api/workouts`, `GET/PATCH/DELETE /api/workouts/{id}`.
- Progress: `GET/POST /api/progress`, `GET/PATCH/DELETE /api/progress/{id}`.
- Goals: `GET/POST /api/goals`, `GET/PATCH/DELETE /api/goals/{id}`.

Use this guide as your map of the project. As we add features, we can expand this document.

