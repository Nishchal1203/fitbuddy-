# Calorie Burn Calculation Microservice - Complete Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Spring Boot Analytics Service](#spring-boot-analytics-service)
4. [FastAPI Backend Integration](#fastapi-backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [Database Changes](#database-changes)
7. [API Endpoints](#api-endpoints)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Overview

This guide documents the complete implementation of a calorie burn calculation microservice that integrates with the FitBuddy application. The system calculates calories burned during workouts using MET (Metabolic Equivalent of Task) values and displays them on the dashboard.

### Key Features
- ✅ Real-time calorie calculation for workout sessions
- ✅ Asynchronous processing using FastAPI BackgroundTasks
- ✅ Spring Boot microservice for analytics
- ✅ Frontend dashboard integration
- ✅ Database schema updates
- ✅ RESTful API endpoints

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI        │    │  Spring Boot    │
│   (React)       │◄──►│   Backend        │◄──►│  Analytics      │
│                 │    │                  │    │  Service        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   PostgreSQL     │    │   PostgreSQL    │
│   Display       │    │   (Main DB)      │    │   (Analytics)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow Diagram

```
User Logs Workout
        │
        ▼
┌─────────────────┐
│  FastAPI POST   │
│  /workouts/     │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  Save Workout   │
│  to Database    │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Background Task │
│ Triggers        │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  HTTP Call to   │
│  Spring Boot    │
│  Analytics      │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Calculate       │
│ Calories        │
│ (MET × Weight   │
│  × Duration)    │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Update Database │
│ with Calories   │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Frontend        │
│ Displays        │
│ Calories        │
└─────────────────┘
```

## Spring Boot Analytics Service

### 1. Service Implementation

**File**: `analytics-service/src/main/java/com/fitbuddy/analytics/service/SimpleCalorieService.java`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class SimpleCalorieService {
    
    private final WorkoutRepository workoutRepository;
    
    // Default MET values for common exercises
    private static final Map<String, Double> DEFAULT_MET_VALUES = new HashMap<>();
    static {
        DEFAULT_MET_VALUES.put("running", 8.0);
        DEFAULT_MET_VALUES.put("cycling", 6.0);
        DEFAULT_MET_VALUES.put("swimming", 7.0);
        DEFAULT_MET_VALUES.put("strength training", 3.5);
        // ... more MET values
    }
    
    // Simplified calorie calculation: MET * Weight(kg) * Duration(hours)
    private static final double AVERAGE_WEIGHT_KG = 70.0; // Default average weight
    
    public Map<String, Object> calculateCaloriesForWorkout(Long workoutId, Integer durationMinutes) {
        Workout workout = workoutRepository.findById(workoutId)
                .orElseThrow(() -> new RuntimeException("Workout not found with ID: " + workoutId));
        
        double metValue = getMetValueForWorkout(workout.getTitle());
        double durationHours = durationMinutes / 60.0;
        double caloriesBurned = metValue * AVERAGE_WEIGHT_KG * durationHours;
        
        Map<String, Object> result = new HashMap<>();
        result.put("workoutId", workoutId);
        result.put("workoutTitle", workout.getTitle());
        result.put("durationMinutes", durationMinutes);
        result.put("metValue", metValue);
        result.put("caloriesBurned", Math.round(caloriesBurned * 100.0) / 100.0);
        
        return result;
    }
    
    private double getMetValueForWorkout(String workoutTitle) {
        String lowerTitle = workoutTitle.toLowerCase();
        return DEFAULT_MET_VALUES.entrySet().stream()
                .filter(entry -> lowerTitle.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(3.0); // Default MET for unknown activities
    }
}
```

### 2. REST Controller

**File**: `analytics-service/src/main/java/com/fitbuddy/analytics/controller/SimpleCalorieController.java`

```java
@RestController
@RequestMapping("/api/analytics/calories")
@RequiredArgsConstructor
@Slf4j
public class SimpleCalorieController {

    private final SimpleCalorieService simpleCalorieService;

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateCalories(
            @RequestParam Long workoutId,
            @RequestParam Integer durationMinutes) {
        
        try {
            Map<String, Object> result = simpleCalorieService.calculateCaloriesForWorkout(workoutId, durationMinutes);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error calculating calories for workout {}: {}", workoutId, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to calculate calories");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> healthResponse = new HashMap<>();
        healthResponse.put("status", "healthy");
        healthResponse.put("service", "simple-calorie-service");
        return ResponseEntity.ok(healthResponse);
    }
}
```

### 3. Configuration Files

**File**: `analytics-service/src/main/resources/application.properties`

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://db:5432/fitbuddy_analytics
spring.datasource.username=fitbuddy
spring.datasource.password=fitbuddy123

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.physical_naming_strategy=org.hibernate.boot.model.naming.SnakeCasePhysicalNamingStrategy

# Server Configuration
server.port=8081

# FastAPI Integration
fitbuddy.fastapi.base-url=http://backend:8000
```

**File**: `analytics-service/src/main/java/com/fitbuddy/analytics/config/CorsConfig.java`

```java
@Configuration
@EnableWebMvc
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "http://frontend:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

## FastAPI Backend Integration

### 1. Database Model Updates

**File**: `app/models/workout.py`

```python
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exercises: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    # NEW: Calories burned during this workout session
    calories_burned: Mapped[float | None] = mapped_column(nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    owner: Mapped[User] = relationship(back_populates="workouts")
```

### 2. Schema Updates

**File**: `app/schemas/workout.py`

```python
class WorkoutBase(BaseModel):
    title: str
    notes: str | None = None
    performed_at: datetime | None = None
    duration_minutes: int | None = None
    exercises: List[Dict[str, Any]] | None = None
    # NEW: Calories burned field
    calories_burned: float | None = None

    model_config = {"from_attributes": True}

class WorkoutCreate(WorkoutBase):
    pass

class WorkoutUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None
    performed_at: datetime | None = None
    duration_minutes: int | None = None
    exercises: List[Dict[str, Any]] | None = None
    # NEW: Calories burned field
    calories_burned: float | None = None

class WorkoutRead(WorkoutBase):
    id: int
```

### 3. Analytics Service Client

**File**: `app/services/analytics_service.py`

```python
class AnalyticsServiceClient:
    def __init__(self, base_url: str = "http://analytics:8081"):
        self.base_url = base_url
    
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
                    
        except Exception as e:
            logger.error(f"Unexpected error calculating calories: {e}")
            return None

# Global instance
analytics_client = AnalyticsServiceClient()
```

### 4. Workout Routes Integration

**File**: `app/api/routes/workouts.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.services.analytics_service import analytics_client

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
    background_tasks.add_task(calculate_workout_calories_sync, workout.id, workout.duration_minutes)
    
    return workout

def calculate_workout_calories_sync(workout_id: int, duration_minutes: int):
    """
    Synchronous background task for calorie calculation.
    Creates a new database session and calculates calories.
    """
    try:
        # Create a new database session for the background task
        from app.db.session import SessionLocal
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

## Frontend Integration

### 1. Dashboard Component Updates

**File**: `frontend/src/components/DashboardHome.jsx`

```javascript
// Calculate total calories from workout data
const calculateTotalCalories = (workouts) => {
  if (!workouts || !Array.isArray(workouts)) return 0
  
  // Sum up calories from all workouts
  const totalCalories = workouts.reduce((sum, workout) => {
    return sum + (workout.calories_burned || 0)
  }, 0)
  
  return totalCalories
}

// In fetchData function
if (workoutsRes.ok) {
  const workoutsData = await workoutsRes.json()
  // Sort by performed_at date (most recent first) and take first 3
  const sortedWorkouts = Array.isArray(workoutsData) 
    ? workoutsData
        .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
        .slice(0, 3)
    : []
  setWorkouts(sortedWorkouts)
  
  // Calculate total calories from all workouts (not just recent ones)
  const allWorkouts = Array.isArray(workoutsData) ? workoutsData : []
  const totalCalories = calculateTotalCalories(allWorkouts)
  setDailyCalories(totalCalories)
}

// In the JSX - Calories Burned Card
{ 
  label: 'Calories Burned', 
  value: dailyCalories > 0 ? `${Math.round(dailyCalories)} cal` : 'No data',
  subtitle: 'Based on workout data'
}

// In Recent Workouts section
{workout.calories_burned && (
  <div className="text-xs text-orange-600 font-medium">
    {Math.round(workout.calories_burned)} cal
  </div>
)}
```

## Database Changes

### 1. Migration File

**File**: `alembic/versions/8e506b62392c_add_calories_burned_to_workout_sessions.py`

```python
"""add_calories_burned_to_workout_sessions

Revision ID: 8e506b62392c
Revises: 01cc5a0f7e47
Create Date: 2025-10-13 10:03:54.645540

"""
from typing import Sequence, Union
from alembic import op 
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8e506b62392c'
down_revision: Union[str, None] = '01cc5a0f7e47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('workout_sessions', sa.Column('calories_burned', sa.Float(), nullable=True))
    # ### end Alembic commands ###

def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('workout_sessions', 'calories_burned')
    # ### end Alembic commands ###
```

### 2. Migration Commands

```bash
# Create migration
alembic revision --autogenerate -m "add_calories_burned_to_workout_sessions"

# Apply migration
alembic upgrade head
```

## API Endpoints

### Spring Boot Analytics Service

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| POST | `/api/analytics/calories/calculate` | Calculate calories for a workout | `workoutId`, `durationMinutes` |
| GET | `/api/analytics/calories/health` | Health check endpoint | None |

### FastAPI Backend

| Method | Endpoint | Description | Changes |
|--------|----------|-------------|---------|
| POST | `/api/workouts/` | Create workout session | Added background calorie calculation |
| GET | `/api/workouts/` | List workouts | Returns `calories_burned` field |
| GET | `/api/workouts/{id}` | Get workout | Returns `calories_burned` field |
| PATCH | `/api/workouts/{id}` | Update workout | Can update `calories_burned` field |

## Testing

### 1. Test Analytics Service

```bash
# Health check
curl http://localhost:8081/api/analytics/calories/health

# Calculate calories
curl -X POST "http://localhost:8081/api/analytics/calories/calculate?workoutId=1&durationMinutes=30"
```

### 2. Test FastAPI Integration

```bash
# Get access token
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=rohit@gmail.com&password=rohit123&grant_type=password"

# Create workout (replace TOKEN with actual token)
curl -X POST "http://localhost:8000/api/workouts/" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Workout",
    "duration_minutes": 30,
    "notes": "Testing calorie calculation"
  }'

# List workouts to see calories
curl -X GET "http://localhost:8000/api/workouts/" \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

### Common Issues

1. **RuntimeError: no running event loop**
   - **Cause**: Using `asyncio.create_task()` in synchronous FastAPI endpoint
   - **Solution**: Use `BackgroundTasks` instead

2. **Column "calories_burned" does not exist**
   - **Cause**: Migration not applied
   - **Solution**: Run `alembic upgrade head`

3. **CORS errors**
   - **Cause**: Frontend can't access analytics service
   - **Solution**: Configure CORS in `CorsConfig.java`

4. **Calories showing as null**
   - **Cause**: Background task failed or still running
   - **Solution**: Check backend logs, ensure analytics service is running

### Debugging Steps

1. **Check service health**:
   ```bash
   curl http://localhost:8081/api/analytics/calories/health
   ```

2. **Check backend logs**:
   ```bash
   docker-compose logs backend --tail=20
   ```

3. **Check analytics service logs**:
   ```bash
   docker-compose logs analytics --tail=20
   ```

4. **Test API directly**:
   ```bash
   # Test calorie calculation
   curl -X POST "http://localhost:8081/api/analytics/calories/calculate?workoutId=1&durationMinutes=30"
   ```

## Future Enhancements

### 1. User Profile Integration
- Add user weight, height, age fields
- Use actual user data for more accurate calculations
- Create user profile management endpoints

### 2. Advanced MET Values
- Create `ExerciseMetValue` entity
- Store MET values in database
- Allow dynamic MET value updates

### 3. Workout Type Detection
- Implement AI/ML to detect workout types from exercise lists
- Map exercises to specific MET values
- Improve accuracy of calorie calculations

### 4. Real-time Updates
- Use WebSockets for real-time calorie updates
- Show calculation progress to users
- Implement push notifications

### 5. Analytics Dashboard
- Create comprehensive analytics dashboard
- Show calorie trends over time
- Implement goal tracking and recommendations

## Key Learnings

### 1. Microservice Architecture
- **Separation of Concerns**: Analytics service handles only calorie calculations
- **Async Communication**: FastAPI calls Spring Boot service asynchronously
- **Database Isolation**: Each service has its own database concerns

### 2. FastAPI Background Tasks
- **Use BackgroundTasks**: For async operations in sync endpoints
- **Database Sessions**: Create new sessions for background tasks
- **Error Handling**: Proper logging and error handling in background tasks

### 3. Spring Boot Best Practices
- **Service Layer**: Business logic in service classes
- **Controller Layer**: Handle HTTP requests and responses
- **Configuration**: Proper CORS and database configuration

### 4. Frontend Integration
- **Data Flow**: Calculate totals from API data
- **Real-time Updates**: Refresh data to show latest calculations
- **Error Handling**: Graceful fallbacks for missing data

This guide provides a complete understanding of the calorie burn calculation microservice implementation. Use it as a reference for similar microservice integrations in the future.
