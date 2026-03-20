# FastAPI Backend Development - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to FastAPI](#introduction-to-fastapi)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Database Integration](#database-integration)
5. [Authentication & Security](#authentication--security)
6. [API Development](#api-development)
7. [Background Tasks](#background-tasks)
8. [Microservice Integration](#microservice-integration)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Best Practices](#best-practices)

## Introduction to FastAPI

### What is FastAPI?
FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints. It's designed to be easy to use and learn, fast to code, ready for production.

### Key Features
- **High Performance**: One of the fastest Python frameworks available
- **Type Safety**: Built-in support for Python type hints
- **Automatic Documentation**: Interactive API docs with Swagger UI
- **Data Validation**: Automatic request/response validation using Pydantic
- **Async Support**: Native support for async/await
- **Standards Based**: Based on OpenAPI and JSON Schema

### Why FastAPI for FitBuddy?
- **Rapid Development**: Quick to build and iterate
- **Type Safety**: Reduces bugs with compile-time type checking
- **Auto Documentation**: Self-documenting APIs
- **Performance**: Handles high concurrent requests
- **Modern Python**: Uses latest Python features

## Project Structure

```
app/
├── __init__.py                 # Package initialization
├── main.py                     # Application entry point
├── core/                       # Core configuration
│   ├── __init__.py
│   └── config.py              # Settings and configuration
├── db/                        # Database related
│   ├── __init__.py
│   ├── base.py               # Base model class
│   └── session.py            # Database session management
├── models/                    # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py              # User model
│   ├── workout.py           # Workout model
│   ├── goal.py              # Goal model
│   ├── exercise.py          # Exercise model
│   └── progress.py          # Progress model
├── schemas/                  # Pydantic schemas
│   ├── __init__.py
│   ├── auth.py              # Authentication schemas
│   ├── user.py              # User schemas
│   ├── workout.py           # Workout schemas
│   ├── goal.py              # Goal schemas
│   ├── exercise.py          # Exercise schemas
│   ├── progress.py          # Progress schemas
│   └── plan.py              # Plan schemas
├── api/                      # API routes
│   ├── __init__.py
│   ├── deps.py              # Dependencies
│   └── routes/              # Route handlers
│       ├── __init__.py
│       ├── auth.py          # Authentication routes
│       ├── users.py         # User routes
│       ├── workouts.py      # Workout routes
│       ├── goals.py         # Goal routes
│       ├── exercises.py     # Exercise routes
│       ├── progress.py      # Progress routes
│       ├── plans.py         # Plan routes
│       ├── admin.py         # Admin routes
│       ├── health.py        # Health check routes
│       └── reports.py       # Report routes
├── services/                 # Business logic services
│   ├── __init__.py
│   ├── analytics_service.py # Analytics microservice client
│   ├── calorie_service.py   # Calorie calculation service
│   ├── enhanced_calorie_service.py # Enhanced calorie service
│   ├── rabbitmq_service.py  # RabbitMQ service
│   └── redis_service.py     # Redis service
└── security.py              # Security utilities
```

## Core Components

### 1. Application Entry Point (`main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, workouts, goals, exercises, progress, plans, admin, health, reports
from app.core.config import settings

app = FastAPI(
    title="FitBuddy API",
    description="A comprehensive fitness tracking application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/")
async def root():
    return {"message": "Welcome to FitBuddy API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 2. Configuration Management (`core/config.py`)

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://fitbuddy:fitbuddy123@localhost:5432/fitbuddy"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Microservices
    ANALYTICS_SERVICE_URL: str = "http://analytics:8081"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379"
    
    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 3. Database Session Management (`db/session.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Database Integration

### 1. SQLAlchemy Models

**Example: User Model (`models/user.py`)**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workouts: Mapped[List["WorkoutSession"]] = relationship(back_populates="owner")
    goals: Mapped[List["Goal"]] = relationship(back_populates="owner")
    progress_entries: Mapped[List["ProgressEntry"]] = relationship(back_populates="owner")
```

### 2. Pydantic Schemas

**Example: User Schemas (`schemas/user.py`)**

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
```

### 3. Database Migrations with Alembic

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add user table"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Authentication & Security

### 1. JWT Token Management (`security.py`)

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
```

### 2. Authentication Routes (`api/routes/auth.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.api.deps import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.security import verify_password, create_access_token
from app.core.config import settings

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
```

## API Development

### 1. CRUD Operations Example (`api/routes/workouts.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workout import WorkoutSession
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.services.analytics_service import analytics_client

router = APIRouter(prefix="/workouts", tags=["workouts"])

@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = WorkoutSession(
        title=payload.title,
        notes=payload.notes,
        performed_at=payload.performed_at,
        duration_minutes=payload.duration_minutes,
        exercises=payload.exercises,
        owner_id=current_user.id,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    
    # Calculate calories in background task
    if workout.duration_minutes:
        background_tasks.add_task(
            calculate_workout_calories_sync, 
            workout.id, 
            workout.duration_minutes
        )
    
    return workout

@router.get("/", response_model=List[WorkoutRead])
def get_workouts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workouts = db.query(WorkoutSession).filter(
        WorkoutSession.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return workouts

@router.get("/{workout_id}", response_model=WorkoutRead)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(WorkoutSession).filter(
        WorkoutSession.id == workout_id,
        WorkoutSession.owner_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    
    return workout

@router.patch("/{workout_id}", response_model=WorkoutRead)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(WorkoutSession).filter(
        WorkoutSession.id == workout_id,
        WorkoutSession.owner_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(workout, field, value)
    
    db.add(workout)
    db.commit()
    db.refresh(workout)
    
    return workout

@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(WorkoutSession).filter(
        WorkoutSession.id == workout_id,
        WorkoutSession.owner_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    
    db.delete(workout)
    db.commit()
```

## Background Tasks

### 1. Background Task Implementation

```python
import asyncio
import logging
from app.db.session import SessionLocal
from app.models.workout import WorkoutSession
from app.services.analytics_service import analytics_client

logger = logging.getLogger(__name__)

def calculate_workout_calories_sync(workout_id: int, duration_minutes: int):
    """
    Synchronous background task for calorie calculation.
    Creates a new database session and calculates calories.
    """
    try:
        # Create a new database session for the background task
        db = SessionLocal()
        
        try:
            # Get the workout from database
            workout = db.get(WorkoutSession, workout_id)
            if not workout:
                logger.error(f"Workout {workout_id} not found for calorie calculation")
                return
            
            # Calculate calories using asyncio.run since we're in a sync function
            if duration_minutes and duration_minutes > 0:
                calories = asyncio.run(analytics_client.calculate_calories(1, duration_minutes))
                if calories is not None:
                    workout.calories_burned = calories
                    db.add(workout)
                    db.commit()
                    logger.info(f"Successfully updated workout {workout_id} with calories: {calories}")
                else:
                    logger.warning(f"Failed to calculate calories for workout {workout_id}")
            else:
                logger.warning(f"No duration provided for workout {workout_id}")
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in background calorie calculation for workout {workout_id}: {e}")
```

### 2. Using Background Tasks in Routes

```python
from fastapi import BackgroundTasks

@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate,
    background_tasks: BackgroundTasks,  # Add BackgroundTasks dependency
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ... create workout logic ...
    
    # Add background task
    background_tasks.add_task(
        calculate_workout_calories_sync, 
        workout.id, 
        workout.duration_minutes
    )
    
    return workout
```

## Microservice Integration

### 1. Analytics Service Client (`services/analytics_service.py`)

```python
import httpx
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class AnalyticsServiceClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or settings.ANALYTICS_SERVICE_URL
    
    async def calculate_calories(self, workout_id: int, duration_minutes: int) -> Optional[float]:
        """
        Calculate calories burned for a workout session.
        Returns the calories burned or None if calculation failed.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/analytics/calories/calculate",
                    params={
                        "workoutId": workout_id,
                        "durationMinutes": duration_minutes
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    calories = data.get("caloriesBurned")
                    logger.info(f"Calculated {calories} calories for workout {workout_id}")
                    return calories
                else:
                    logger.error(f"Calorie calculation failed: {response.status_code} - {response.text}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error("Timeout while calculating calories")
            return None
        except httpx.ConnectError:
            logger.error("Could not connect to analytics service for calorie calculation")
            return None
        except Exception as e:
            logger.error(f"Unexpected error calculating calories: {e}")
            return None

# Global instance
analytics_client = AnalyticsServiceClient()
```

### 2. Redis Service (`services/redis_service.py`)

```python
import redis
import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async def set_cache(self, key: str, value: Any, expire: int = 3600) -> bool:
        """Set a value in Redis cache with expiration"""
        try:
            serialized_value = json.dumps(value)
            return self.redis_client.setex(key, expire, serialized_value)
        except Exception as e:
            logger.error(f"Error setting cache for key {key}: {e}")
            return False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """Get a value from Redis cache"""
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Error getting cache for key {key}: {e}")
            return None
    
    async def delete_cache(self, key: str) -> bool:
        """Delete a value from Redis cache"""
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Error deleting cache for key {key}: {e}")
            return False

# Global instance
redis_service = RedisService()
```

## Testing

### 1. Unit Testing Example

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_create_workout():
    # Test data
    workout_data = {
        "title": "Test Workout",
        "duration_minutes": 30,
        "notes": "Test workout for unit testing"
    }
    
    # Create workout
    response = client.post("/api/workouts/", json=workout_data)
    assert response.status_code == 201
    
    # Verify response
    data = response.json()
    assert data["title"] == workout_data["title"]
    assert data["duration_minutes"] == workout_data["duration_minutes"]
```

### 2. Integration Testing

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_workout_calorie_calculation():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Create workout
        workout_data = {
            "title": "Running",
            "duration_minutes": 30,
            "notes": "Test running workout"
        }
        
        response = await ac.post("/api/workouts/", json=workout_data)
        assert response.status_code == 201
        
        # Wait for background task to complete
        import asyncio
        await asyncio.sleep(2)
        
        # Get workout to check calories
        workout_id = response.json()["id"]
        get_response = await ac.get(f"/api/workouts/{workout_id}")
        assert get_response.status_code == 200
        
        workout = get_response.json()
        assert workout["calories_burned"] is not None
        assert workout["calories_burned"] > 0
```

## Deployment

### 1. Docker Configuration

**Dockerfile.backend**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Docker Compose Integration

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://fitbuddy:fitbuddy123@db:5432/fitbuddy
      - ANALYTICS_SERVICE_URL=http://analytics:8081
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
      - analytics
    volumes:
      - .:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Best Practices

### 1. Code Organization
- **Separation of Concerns**: Keep models, schemas, and routes separate
- **Service Layer**: Use services for business logic
- **Dependency Injection**: Use FastAPI's dependency system
- **Type Hints**: Always use type hints for better code quality

### 2. Error Handling
- **HTTP Exceptions**: Use appropriate HTTP status codes
- **Logging**: Implement comprehensive logging
- **Validation**: Use Pydantic for request/response validation
- **Graceful Degradation**: Handle service failures gracefully

### 3. Performance
- **Database Optimization**: Use proper indexing and queries
- **Caching**: Implement Redis caching for frequently accessed data
- **Background Tasks**: Use for non-blocking operations
- **Connection Pooling**: Configure database connection pools

### 4. Security
- **Authentication**: Implement JWT-based authentication
- **Authorization**: Check user permissions for each request
- **Input Validation**: Validate all input data
- **CORS**: Configure CORS properly
- **Rate Limiting**: Implement rate limiting for API endpoints

### 5. Testing
- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints
- **Test Database**: Use separate test database
- **Mocking**: Mock external services in tests

### 6. Documentation
- **API Documentation**: Use FastAPI's automatic documentation
- **Code Comments**: Document complex business logic
- **README**: Maintain comprehensive project documentation
- **Type Hints**: Use type hints for better IDE support

## Common Patterns

### 1. Repository Pattern
```python
class WorkoutRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, workout: WorkoutSession) -> WorkoutSession:
        self.db.add(workout)
        self.db.commit()
        self.db.refresh(workout)
        return workout
    
    def get_by_id(self, workout_id: int) -> Optional[WorkoutSession]:
        return self.db.query(WorkoutSession).filter(WorkoutSession.id == workout_id).first()
    
    def get_by_user(self, user_id: int) -> List[WorkoutSession]:
        return self.db.query(WorkoutSession).filter(WorkoutSession.owner_id == user_id).all()
```

### 2. Service Pattern
```python
class WorkoutService:
    def __init__(self, repository: WorkoutRepository):
        self.repository = repository
    
    def create_workout(self, workout_data: WorkoutCreate, user_id: int) -> WorkoutSession:
        workout = WorkoutSession(
            **workout_data.model_dump(),
            owner_id=user_id
        )
        return self.repository.create(workout)
    
    def get_user_workouts(self, user_id: int) -> List[WorkoutSession]:
        return self.repository.get_by_user(user_id)
```

### 3. Dependency Injection
```python
def get_workout_service(db: Session = Depends(get_db)) -> WorkoutService:
    repository = WorkoutRepository(db)
    return WorkoutService(repository)

@router.post("/")
def create_workout(
    payload: WorkoutCreate,
    service: WorkoutService = Depends(get_workout_service),
    current_user: User = Depends(get_current_user)
):
    return service.create_workout(payload, current_user.id)
```

This comprehensive guide covers all aspects of FastAPI backend development used in the FitBuddy project. It provides both theoretical knowledge and practical examples that can be applied to similar projects.
