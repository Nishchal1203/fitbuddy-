# API Documentation & Integration - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to API Documentation](#introduction-to-api-documentation)
2. [FastAPI Auto-Documentation](#fastapi-auto-documentation)
3. [OpenAPI/Swagger Integration](#openapiswagger-integration)
4. [API Design Principles](#api-design-principles)
5. [Authentication & Authorization](#authentication--authorization)
6. [Error Handling & Status Codes](#error-handling--status-codes)
7. [API Versioning](#api-versioning)
8. [Testing APIs](#testing-apis)
9. [API Monitoring](#api-monitoring)
10. [Production Best Practices](#production-best-practices)

## Introduction to API Documentation

### What is API Documentation?
API documentation is a comprehensive guide that explains how to use an API (Application Programming Interface). It includes information about endpoints, request/response formats, authentication methods, error codes, and examples.

### Key Components
- **Endpoint Descriptions**: What each API endpoint does
- **Request/Response Schemas**: Data structures and formats
- **Authentication**: How to authenticate requests
- **Error Codes**: Possible error responses and their meanings
- **Examples**: Real-world usage examples
- **Rate Limiting**: Usage limits and restrictions

### Benefits for FitBuddy
- **Developer Experience**: Easy integration for frontend developers
- **Microservice Communication**: Clear contracts between services
- **Testing**: Automated testing based on API specifications
- **Maintenance**: Easier to maintain and update APIs
- **Onboarding**: Faster onboarding for new team members

## FastAPI Auto-Documentation

### 1. Basic FastAPI Documentation Setup

```python
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from app.core.config import settings

app = FastAPI(
    title="FitBuddy API",
    description="""
    ## FitBuddy - Comprehensive Fitness Tracking Application
    
    A modern fitness tracking application that helps users:
    
    * **Track Workouts** - Log and monitor exercise sessions
    * **Set Goals** - Create and track fitness objectives
    * **Monitor Progress** - Visualize fitness journey
    * **Generate Plans** - Get personalized workout recommendations
    * **Calculate Calories** - Real-time calorie burn calculation
    
    ### Features
    - User authentication and management
    - Workout logging and tracking
    - Goal setting and progress monitoring
    - Personalized workout plan generation
    - Real-time calorie calculation
    - Progress analytics and reporting
    
    ### Authentication
    This API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:
    ```
    Authorization: Bearer <your-token>
    ```
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "FitBuddy Support",
        "email": "support@fitbuddy.com",
        "url": "https://fitbuddy.com/support"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    }
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="FitBuddy API",
        version="1.0.0",
        description=app.description,
        routes=app.routes,
    )
    
    # Add custom tags
    openapi_schema["tags"] = [
        {
            "name": "authentication",
            "description": "User authentication and authorization operations"
        },
        {
            "name": "users",
            "description": "User management operations"
        },
        {
            "name": "workouts",
            "description": "Workout logging and tracking operations"
        },
        {
            "name": "goals",
            "description": "Goal setting and progress tracking operations"
        },
        {
            "name": "exercises",
            "description": "Exercise database and management operations"
        },
        {
            "name": "progress",
            "description": "Progress tracking and analytics operations"
        },
        {
            "name": "plans",
            "description": "Workout plan generation and management operations"
        },
        {
            "name": "admin",
            "description": "Administrative operations"
        },
        {
            "name": "health",
            "description": "Health check and monitoring operations"
        },
        {
            "name": "reports",
            "description": "Report generation and analytics operations"
        }
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### 2. Detailed Endpoint Documentation

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from typing import List, Optional
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workout import WorkoutSession

router = APIRouter(prefix="/workouts", tags=["workouts"])

@router.post(
    "/",
    response_model=WorkoutRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workout session",
    description="""
    Create a new workout session for the authenticated user.
    
    This endpoint allows users to log their workout sessions with details such as:
    - Workout title and description
    - Duration in minutes
    - Exercises performed
    - Notes and observations
    
    The system will automatically:
    - Calculate calories burned (asynchronously)
    - Update user's workout history
    - Trigger progress tracking updates
    """,
    responses={
        201: {
            "description": "Workout session created successfully",
            "model": WorkoutRead,
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Morning Run",
                        "notes": "Great run in the park",
                        "performed_at": "2024-01-15T08:30:00Z",
                        "duration_minutes": 30,
                        "exercises": [
                            {
                                "name": "Running",
                                "duration": 30,
                                "intensity": "moderate"
                            }
                        ],
                        "calories_burned": 250.5,
                        "owner_id": 1
                    }
                }
            }
        },
        400: {
            "description": "Invalid input data",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid workout data provided"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "title"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        }
    }
)
def create_workout(
    payload: WorkoutCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new workout session.
    
    Args:
        payload: Workout creation data
        background_tasks: FastAPI background tasks for async processing
        db: Database session
        current_user: Authenticated user
    
    Returns:
        WorkoutRead: Created workout session data
    
    Raises:
        HTTPException: If workout creation fails
    """
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

@router.get(
    "/",
    response_model=List[WorkoutRead],
    summary="Get user's workout sessions",
    description="""
    Retrieve a paginated list of workout sessions for the authenticated user.
    
    This endpoint supports:
    - Pagination with skip and limit parameters
    - Filtering by date range
    - Sorting by performance date
    - Optional exercise details inclusion
    
    The response includes all workout sessions owned by the authenticated user,
    ordered by performance date (most recent first).
    """,
    responses={
        200: {
            "description": "List of workout sessions retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "title": "Morning Run",
                            "notes": "Great run in the park",
                            "performed_at": "2024-01-15T08:30:00Z",
                            "duration_minutes": 30,
                            "exercises": [
                                {
                                    "name": "Running",
                                    "duration": 30,
                                    "intensity": "moderate"
                                }
                            ],
                            "calories_burned": 250.5,
                            "owner_id": 1
                        }
                    ]
                }
            }
        },
        401: {
            "description": "Authentication required"
        }
    }
)
def get_workouts(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated list of user's workout sessions.
    
    Args:
        skip: Number of records to skip for pagination
        limit: Maximum number of records to return (1-1000)
        db: Database session
        current_user: Authenticated user
    
    Returns:
        List[WorkoutRead]: List of workout sessions
    """
    workouts = db.query(WorkoutSession).filter(
        WorkoutSession.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return workouts

@router.get(
    "/{workout_id}",
    response_model=WorkoutRead,
    summary="Get specific workout session",
    description="""
    Retrieve details of a specific workout session by ID.
    
    This endpoint returns the complete workout session data including:
    - Workout details (title, notes, duration)
    - Exercise information
    - Calorie calculations
    - Performance metrics
    
    The workout must belong to the authenticated user.
    """,
    responses={
        200: {
            "description": "Workout session retrieved successfully"
        },
        404: {
            "description": "Workout session not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Workout not found"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required"
        }
    }
)
def get_workout(
    workout_id: int = Path(..., description="ID of the workout session to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get specific workout session by ID.
    
    Args:
        workout_id: ID of the workout session
        db: Database session
        current_user: Authenticated user
    
    Returns:
        WorkoutRead: Workout session data
    
    Raises:
        HTTPException: If workout not found or doesn't belong to user
    """
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
```

### 3. Schema Documentation

```python
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class WorkoutIntensity(str, Enum):
    """Workout intensity levels"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"

class ExerciseData(BaseModel):
    """Exercise data within a workout session"""
    name: str = Field(..., description="Name of the exercise", example="Running")
    duration: Optional[int] = Field(None, description="Duration in minutes", example=30)
    sets: Optional[int] = Field(None, description="Number of sets", example=3)
    reps: Optional[int] = Field(None, description="Number of repetitions", example=12)
    weight: Optional[float] = Field(None, description="Weight used in kg", example=20.5)
    intensity: Optional[WorkoutIntensity] = Field(None, description="Exercise intensity level")
    notes: Optional[str] = Field(None, description="Additional exercise notes")

    class Config:
        schema_extra = {
            "example": {
                "name": "Running",
                "duration": 30,
                "intensity": "moderate",
                "notes": "Outdoor run in the park"
            }
        }

class WorkoutBase(BaseModel):
    """Base workout session model"""
    title: str = Field(..., description="Workout session title", example="Morning Run")
    notes: Optional[str] = Field(None, description="Additional workout notes", example="Great workout today!")
    performed_at: Optional[datetime] = Field(None, description="When the workout was performed")
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Total workout duration in minutes", example=30)
    exercises: Optional[List[ExerciseData]] = Field(None, description="List of exercises performed")
    calories_burned: Optional[float] = Field(None, ge=0, description="Calories burned during workout")

    @validator('performed_at', pre=True, always=True)
    def set_performed_at(cls, v):
        return v or datetime.utcnow()

    class Config:
        schema_extra = {
            "example": {
                "title": "Morning Run",
                "notes": "Great run in the park",
                "performed_at": "2024-01-15T08:30:00Z",
                "duration_minutes": 30,
                "exercises": [
                    {
                        "name": "Running",
                        "duration": 30,
                        "intensity": "moderate"
                    }
                ],
                "calories_burned": 250.5
            }
        }

class WorkoutCreate(WorkoutBase):
    """Workout creation model"""
    pass

class WorkoutUpdate(BaseModel):
    """Workout update model"""
    title: Optional[str] = Field(None, description="Updated workout title")
    notes: Optional[str] = Field(None, description="Updated workout notes")
    performed_at: Optional[datetime] = Field(None, description="Updated performance date")
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Updated duration in minutes")
    exercises: Optional[List[ExerciseData]] = Field(None, description="Updated exercise list")
    calories_burned: Optional[float] = Field(None, ge=0, description="Updated calories burned")

    class Config:
        schema_extra = {
            "example": {
                "title": "Updated Morning Run",
                "notes": "Updated notes",
                "duration_minutes": 35
            }
        }

class WorkoutRead(WorkoutBase):
    """Workout read model with additional fields"""
    id: int = Field(..., description="Unique workout session ID")
    owner_id: int = Field(..., description="ID of the user who owns this workout")
    created_at: datetime = Field(..., description="When the workout was created")
    updated_at: Optional[datetime] = Field(None, description="When the workout was last updated")

    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": 1,
                "title": "Morning Run",
                "notes": "Great run in the park",
                "performed_at": "2024-01-15T08:30:00Z",
                "duration_minutes": 30,
                "exercises": [
                    {
                        "name": "Running",
                        "duration": 30,
                        "intensity": "moderate"
                    }
                ],
                "calories_burned": 250.5,
                "owner_id": 1,
                "created_at": "2024-01-15T08:30:00Z",
                "updated_at": "2024-01-15T08:30:00Z"
            }
        }
```

## OpenAPI/Swagger Integration

### 1. Custom OpenAPI Schema

```python
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.docs import get_redoc_html

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="FitBuddy API",
        version="1.0.0",
        description="""
        # FitBuddy API Documentation
        
        Welcome to the FitBuddy API! This comprehensive fitness tracking API provides
        everything you need to build fitness applications.
        
        ## Getting Started
        
        1. **Authentication**: Obtain a JWT token by logging in
        2. **Make Requests**: Include the token in the Authorization header
        3. **Explore**: Use the interactive documentation below
        
        ## Rate Limiting
        
        - **Free Tier**: 1000 requests per hour
        - **Premium Tier**: 10000 requests per hour
        
        ## Support
        
        - **Documentation**: [https://docs.fitbuddy.com](https://docs.fitbuddy.com)
        - **Support**: [support@fitbuddy.com](mailto:support@fitbuddy.com)
        - **Status**: [https://status.fitbuddy.com](https://status.fitbuddy.com)
        """,
        routes=app.routes,
    )
    
    # Add server information
    openapi_schema["servers"] = [
        {
            "url": "https://api.fitbuddy.com",
            "description": "Production server"
        },
        {
            "url": "https://staging-api.fitbuddy.com",
            "description": "Staging server"
        },
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        }
    ]
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token"
        }
    }
    
    # Add global security
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    # Add custom tags with detailed descriptions
    openapi_schema["tags"] = [
        {
            "name": "authentication",
            "description": "User authentication and authorization operations",
            "externalDocs": {
                "description": "Authentication Guide",
                "url": "https://docs.fitbuddy.com/auth"
            }
        },
        {
            "name": "users",
            "description": "User management operations including profile management",
            "externalDocs": {
                "description": "User Management Guide",
                "url": "https://docs.fitbuddy.com/users"
            }
        },
        {
            "name": "workouts",
            "description": "Workout logging, tracking, and management operations",
            "externalDocs": {
                "description": "Workout Guide",
                "url": "https://docs.fitbuddy.com/workouts"
            }
        },
        {
            "name": "goals",
            "description": "Goal setting, tracking, and progress monitoring operations",
            "externalDocs": {
                "description": "Goals Guide",
                "url": "https://docs.fitbuddy.com/goals"
            }
        },
        {
            "name": "analytics",
            "description": "Analytics and reporting operations",
            "externalDocs": {
                "description": "Analytics Guide",
                "url": "https://docs.fitbuddy.com/analytics"
            }
        }
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
            "filter": True,
            "tryItOutEnabled": True
        }
    )

# Custom ReDoc
@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"
    )
```

### 2. API Response Models

```python
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from datetime import datetime

class APIResponse(BaseModel):
    """Standard API response model"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Any] = Field(None, description="Response data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

class PaginatedResponse(BaseModel):
    """Paginated response model"""
    items: List[Any] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = Field(False, description="Always false for error responses")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

class ValidationErrorDetail(BaseModel):
    """Validation error detail model"""
    field: str = Field(..., description="Field name that failed validation")
    message: str = Field(..., description="Validation error message")
    value: Any = Field(..., description="Value that failed validation")

class ValidationErrorResponse(ErrorResponse):
    """Validation error response model"""
    error: str = Field("validation_error", description="Error type")
    details: List[ValidationErrorDetail] = Field(..., description="List of validation errors")
```

## API Design Principles

### 1. RESTful Design

```python
# Resource-based URLs
@router.get("/workouts", tags=["workouts"])
def get_workouts():
    """GET /workouts - List all workouts"""
    pass

@router.post("/workouts", tags=["workouts"])
def create_workout():
    """POST /workouts - Create a new workout"""
    pass

@router.get("/workouts/{workout_id}", tags=["workouts"])
def get_workout(workout_id: int):
    """GET /workouts/{id} - Get specific workout"""
    pass

@router.put("/workouts/{workout_id}", tags=["workouts"])
def update_workout(workout_id: int):
    """PUT /workouts/{id} - Update entire workout"""
    pass

@router.patch("/workouts/{workout_id}", tags=["workouts"])
def partial_update_workout(workout_id: int):
    """PATCH /workouts/{id} - Partial update workout"""
    pass

@router.delete("/workouts/{workout_id}", tags=["workouts"])
def delete_workout(workout_id: int):
    """DELETE /workouts/{id} - Delete workout"""
    pass

# Nested resources
@router.get("/workouts/{workout_id}/exercises", tags=["workouts"])
def get_workout_exercises(workout_id: int):
    """GET /workouts/{id}/exercises - Get exercises for a workout"""
    pass

@router.post("/workouts/{workout_id}/exercises", tags=["workouts"])
def add_workout_exercise(workout_id: int):
    """POST /workouts/{id}/exercises - Add exercise to workout"""
    pass
```

### 2. Consistent Response Format

```python
from fastapi.responses import JSONResponse

def create_success_response(data: Any = None, message: str = "Success", status_code: int = 200):
    """Create a consistent success response"""
    response_data = {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }
    return JSONResponse(content=response_data, status_code=status_code)

def create_error_response(
    message: str, 
    error_type: str = "error", 
    details: Dict[str, Any] = None, 
    status_code: int = 400
):
    """Create a consistent error response"""
    response_data = {
        "success": False,
        "error": error_type,
        "message": message,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    }
    return JSONResponse(content=response_data, status_code=status_code)

# Usage in endpoints
@router.post("/workouts/")
def create_workout(payload: WorkoutCreate, current_user: User = Depends(get_current_user)):
    try:
        workout = create_workout_in_db(payload, current_user.id)
        return create_success_response(
            data=workout,
            message="Workout created successfully",
            status_code=201
        )
    except Exception as e:
        return create_error_response(
            message="Failed to create workout",
            error_type="creation_error",
            details={"error": str(e)},
            status_code=500
        )
```

### 3. Query Parameters and Filtering

```python
from fastapi import Query
from typing import Optional, List
from datetime import datetime

class WorkoutFilters(BaseModel):
    """Workout filtering parameters"""
    start_date: Optional[datetime] = Field(None, description="Filter workouts from this date")
    end_date: Optional[datetime] = Field(None, description="Filter workouts until this date")
    min_duration: Optional[int] = Field(None, ge=1, description="Minimum duration in minutes")
    max_duration: Optional[int] = Field(None, ge=1, description="Maximum duration in minutes")
    exercise_types: Optional[List[str]] = Field(None, description="Filter by exercise types")
    min_calories: Optional[float] = Field(None, ge=0, description="Minimum calories burned")
    max_calories: Optional[float] = Field(None, ge=0, description="Maximum calories burned")

@router.get("/workouts/", response_model=PaginatedResponse)
def get_workouts(
    # Pagination parameters
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    
    # Sorting parameters
    sort_by: str = Query("performed_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    
    # Filtering parameters
    start_date: Optional[datetime] = Query(None, description="Filter workouts from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter workouts until this date"),
    min_duration: Optional[int] = Query(None, ge=1, description="Minimum duration in minutes"),
    max_duration: Optional[int] = Query(None, ge=1, description="Maximum duration in minutes"),
    exercise_types: Optional[str] = Query(None, description="Comma-separated exercise types"),
    min_calories: Optional[float] = Query(None, ge=0, description="Minimum calories burned"),
    max_calories: Optional[float] = Query(None, ge=0, description="Maximum calories burned"),
    
    # Include parameters
    include_exercises: bool = Query(False, description="Include exercise details"),
    include_calories: bool = Query(True, description="Include calorie calculations"),
    
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated and filtered list of workout sessions.
    
    Supports advanced filtering, sorting, and pagination options.
    """
    # Build query
    query = db.query(WorkoutSession).filter(WorkoutSession.owner_id == current_user.id)
    
    # Apply filters
    if start_date:
        query = query.filter(WorkoutSession.performed_at >= start_date)
    if end_date:
        query = query.filter(WorkoutSession.performed_at <= end_date)
    if min_duration:
        query = query.filter(WorkoutSession.duration_minutes >= min_duration)
    if max_duration:
        query = query.filter(WorkoutSession.duration_minutes <= max_duration)
    if min_calories:
        query = query.filter(WorkoutSession.calories_burned >= min_calories)
    if max_calories:
        query = query.filter(WorkoutSession.calories_burned <= max_calories)
    
    # Apply sorting
    if sort_by == "performed_at":
        if sort_order == "desc":
            query = query.order_by(WorkoutSession.performed_at.desc())
        else:
            query = query.order_by(WorkoutSession.performed_at.asc())
    elif sort_by == "duration_minutes":
        if sort_order == "desc":
            query = query.order_by(WorkoutSession.duration_minutes.desc())
        else:
            query = query.order_by(WorkoutSession.duration_minutes.asc())
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    workouts = query.offset(offset).limit(size).all()
    
    # Calculate pagination info
    pages = (total + size - 1) // size
    has_next = page < pages
    has_prev = page > 1
    
    return PaginatedResponse(
        items=workouts,
        total=total,
        page=page,
        size=size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev
    )
```

## Authentication & Authorization

### 1. JWT Authentication Documentation

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status

security = HTTPBearer()

class AuthResponse(BaseModel):
    """Authentication response model"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: UserRead = Field(..., description="User information")

@router.post(
    "/auth/token",
    response_model=AuthResponse,
    summary="Authenticate user and get access token",
    description="""
    Authenticate a user with email and password to receive a JWT access token.
    
    The token can be used to authenticate subsequent API requests by including
    it in the Authorization header:
    
    ```
    Authorization: Bearer <your-token>
    ```
    
    **Token Expiration**: Tokens expire after 30 minutes by default.
    **Refresh**: Use the refresh token endpoint to get a new access token.
    """,
    responses={
        200: {
            "description": "Authentication successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 1800,
                        "user": {
                            "id": 1,
                            "email": "user@example.com",
                            "full_name": "John Doe",
                            "is_active": True
                        }
                    }
                }
            }
        },
        401: {
            "description": "Invalid credentials",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "error": "authentication_error",
                        "message": "Invalid email or password"
                    }
                }
            }
        }
    }
)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT access token.
    
    Args:
        form_data: Login form data (username=email, password)
        db: Database session
    
    Returns:
        AuthResponse: Authentication response with token and user info
    
    Raises:
        HTTPException: If authentication fails
    """
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )
```

### 2. Permission-Based Authorization

```python
from enum import Enum
from typing import List

class Permission(str, Enum):
    """User permissions"""
    READ_WORKOUTS = "read:workouts"
    WRITE_WORKOUTS = "write:workouts"
    DELETE_WORKOUTS = "delete:workouts"
    READ_GOALS = "read:goals"
    WRITE_GOALS = "write:goals"
    DELETE_GOALS = "delete:goals"
    ADMIN_USERS = "admin:users"
    ADMIN_SYSTEM = "admin:system"

def require_permission(permission: Permission):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage in endpoints
@router.delete(
    "/workouts/{workout_id}",
    summary="Delete workout session",
    description="Delete a workout session. Requires 'delete:workouts' permission."
)
@require_permission(Permission.DELETE_WORKOUTS)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete workout session with permission check"""
    pass
```

## Error Handling & Status Codes

### 1. Custom Exception Classes

```python
class FitBuddyException(Exception):
    """Base exception for FitBuddy API"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code
        self.details = details
        super().__init__(self.message)

class ValidationError(FitBuddyException):
    """Validation error exception"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details={"field": field, "value": value}
        )

class NotFoundError(FitBuddyException):
    """Resource not found exception"""
    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            message=f"{resource} with ID {resource_id} not found",
            error_code="NOT_FOUND",
            details={"resource": resource, "resource_id": resource_id}
        )

class PermissionError(FitBuddyException):
    """Permission denied exception"""
    def __init__(self, permission: str):
        super().__init__(
            message=f"Permission '{permission}' required",
            error_code="PERMISSION_DENIED",
            details={"required_permission": permission}
        )

class RateLimitError(FitBuddyException):
    """Rate limit exceeded exception"""
    def __init__(self, limit: int, window: int):
        super().__init__(
            message=f"Rate limit exceeded: {limit} requests per {window} seconds",
            error_code="RATE_LIMIT_EXCEEDED",
            details={"limit": limit, "window": window}
        )
```

### 2. Global Exception Handler

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(FitBuddyException)
async def fitbuddy_exception_handler(request: Request, exc: FitBuddyException):
    """Handle custom FitBuddy exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request: Request, exc: NotFoundError):
    """Handle not found exceptions"""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "NOT_FOUND",
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(PermissionError)
async def permission_exception_handler(request: Request, exc: PermissionError):
    """Handle permission errors"""
    return JSONResponse(
        status_code=403,
        content={
            "success": False,
            "error": "PERMISSION_DENIED",
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(RateLimitError)
async def rate_limit_exception_handler(request: Request, exc: RateLimitError):
    """Handle rate limit errors"""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "RATE_LIMIT_EXCEEDED",
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
            "value": error.get("input")
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {"validation_errors": errors},
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

## API Versioning

### 1. URL-Based Versioning

```python
from fastapi import APIRouter

# Version 1 API
v1_router = APIRouter(prefix="/api/v1")

@v1_router.get("/workouts/")
def get_workouts_v1():
    """Version 1 workout endpoint"""
    pass

# Version 2 API
v2_router = APIRouter(prefix="/api/v2")

@v2_router.get("/workouts/")
def get_workouts_v2():
    """Version 2 workout endpoint with enhanced features"""
    pass

# Include both versions
app.include_router(v1_router, tags=["v1"])
app.include_router(v2_router, tags=["v2"])
```

### 2. Header-Based Versioning

```python
from fastapi import Header, Depends
from typing import Optional

def get_api_version(api_version: Optional[str] = Header(None, alias="API-Version")):
    """Get API version from header"""
    if not api_version:
        api_version = "1.0"  # Default version
    
    return api_version

@router.get("/workouts/")
def get_workouts(
    version: str = Depends(get_api_version),
    current_user: User = Depends(get_current_user)
):
    """Get workouts with version-specific behavior"""
    if version.startswith("1."):
        return get_workouts_v1(current_user)
    elif version.startswith("2."):
        return get_workouts_v2(current_user)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported API version: {version}"
        )
```

## Testing APIs

### 1. API Testing with pytest

```python
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from app.main import app

client = TestClient(app)

class TestWorkoutAPI:
    def test_create_workout_success(self):
        """Test successful workout creation"""
        workout_data = {
            "title": "Test Workout",
            "duration_minutes": 30,
            "notes": "Test workout"
        }
        
        response = client.post("/api/workouts/", json=workout_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == workout_data["title"]
        assert data["data"]["duration_minutes"] == workout_data["duration_minutes"]
    
    def test_create_workout_validation_error(self):
        """Test workout creation with validation error"""
        invalid_data = {
            "title": "",  # Empty title should fail validation
            "duration_minutes": -5  # Negative duration should fail
        }
        
        response = client.post("/api/workouts/", json=invalid_data)
        
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "VALIDATION_ERROR"
        assert "validation_errors" in data["details"]
    
    def test_get_workouts_pagination(self):
        """Test workout listing with pagination"""
        response = client.get("/api/workouts/?page=1&size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert data["page"] == 1
        assert data["size"] == 10
    
    def test_get_workouts_filtering(self):
        """Test workout filtering"""
        response = client.get("/api/workouts/?min_duration=20&max_duration=60")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned workouts meet the duration criteria
        for workout in data["items"]:
            if workout["duration_minutes"]:
                assert 20 <= workout["duration_minutes"] <= 60
    
    @pytest.mark.asyncio
    async def test_async_endpoint(self):
        """Test async endpoint"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/workouts/")
            assert response.status_code == 200
```

### 2. API Contract Testing

```python
import json
from jsonschema import validate, ValidationError

def test_api_response_schema():
    """Test API response matches expected schema"""
    response = client.get("/api/workouts/")
    data = response.json()
    
    # Define expected schema
    schema = {
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "data": {"type": "array"},
            "timestamp": {"type": "string"}
        },
        "required": ["success", "message", "data", "timestamp"]
    }
    
    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        pytest.fail(f"Response schema validation failed: {e}")

def test_workout_schema():
    """Test workout object schema"""
    response = client.get("/api/workouts/1")
    data = response.json()
    
    workout_schema = {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "string"},
            "notes": {"type": ["string", "null"]},
            "performed_at": {"type": "string"},
            "duration_minutes": {"type": ["integer", "null"]},
            "calories_burned": {"type": ["number", "null"]},
            "owner_id": {"type": "integer"}
        },
        "required": ["id", "title", "performed_at", "owner_id"]
    }
    
    try:
        validate(instance=data["data"], schema=workout_schema)
    except ValidationError as e:
        pytest.fail(f"Workout schema validation failed: {e}")
```

## API Monitoring

### 1. Request/Response Logging

```python
import logging
import time
from fastapi import Request
from fastapi.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class APILoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request
        start_time = time.time()
        
        logger.info(f"Request: {request.method} {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
            logger.info(f"Body: {body.decode()}")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(f"Response: {response.status_code}")
        logger.info(f"Process time: {process_time:.4f}s")
        
        return response

app.add_middleware(APILoggingMiddleware)
```

### 2. Performance Metrics

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Metrics
request_count = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('api_request_duration_seconds', 'API request duration', ['method', 'endpoint'])
active_requests = Gauge('api_active_requests', 'Number of active requests')

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Increment active requests
        active_requests.inc()
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Record metrics
            duration = time.time() - start_time
            request_count.labels(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code
            ).inc()
            
            request_duration.labels(
                method=request.method,
                endpoint=request.url.path
            ).observe(duration)
            
            return response
            
        finally:
            # Decrement active requests
            active_requests.dec()

app.add_middleware(MetricsMiddleware)

# Start metrics server
start_http_server(8001)
```

## Production Best Practices

### 1. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/workouts/")
@limiter.limit("10/minute")  # 10 requests per minute
def create_workout(request: Request, payload: WorkoutCreate):
    """Create workout with rate limiting"""
    pass

@router.get("/workouts/")
@limiter.limit("100/minute")  # 100 requests per minute
def get_workouts(request: Request):
    """Get workouts with rate limiting"""
    pass
```

### 2. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fitbuddy.com",
        "https://www.fitbuddy.com",
        "https://app.fitbuddy.com",
        "http://localhost:3000",  # Development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page-Count"],
)
```

### 3. Security Headers

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["fitbuddy.com", "*.fitbuddy.com", "localhost"]
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response
```

This comprehensive guide covers all aspects of API documentation and integration used in the FitBuddy project, from basic documentation to advanced patterns and production best practices.
