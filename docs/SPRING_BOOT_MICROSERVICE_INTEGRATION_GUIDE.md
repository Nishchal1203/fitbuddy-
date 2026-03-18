# Spring Boot Microservice Integration Guide

## Overview
This guide documents the complete process of integrating a Spring Boot microservice (Analytics Service) for automated workout plan generation with a FastAPI application. This integration allows the system to automatically create personalized workout plans when users create fitness goals.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Spring Boot Service Setup](#spring-boot-service-setup)
4. [Database Integration](#database-integration)
5. [API Communication](#api-communication)
6. [Frontend Integration](#frontend-integration)
7. [Common Problems & Solutions](#common-problems--solutions)
8. [Testing & Validation](#testing--validation)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │ Spring Boot     │
│                 │    │                 │    │ Analytics       │
│ - Plans Page    │◄──►│ - Plans API     │◄──►│ Service         │
│ - Goals Page    │    │ - Goals API     │    │                 │
│ - My Plans      │    │ - Auth API      │    │ - Plan Gen      │
└─────────────────┘    └─────────────────┘    │ - Database      │
                                              │   Operations    │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   PostgreSQL    │
                                              │   Database      │
                                              └─────────────────┘
```

## Prerequisites

### Required Knowledge
- **FastAPI**: Python web framework
- **Spring Boot**: Java framework (basic understanding)
- **PostgreSQL**: Database management
- **Docker**: Containerization
- **REST APIs**: HTTP communication
- **React**: Frontend framework

### Tools & Technologies
- Java 8+ (for Spring Boot)
- Python 3.11+ (for FastAPI)
- Node.js 18+ (for React)
- PostgreSQL 15+
- Docker & Docker Compose
- Maven (for Spring Boot)
- npm (for React)

## Spring Boot Service Setup

### 1. Project Structure
```
analytics-service/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── fitbuddy/
│       │           └── analytics/
│       │               ├── AnalyticsServiceApplication.java
│       │               ├── controller/
│       │               │   └── PlanController.java
│       │               ├── entity/
│       │               │   ├── Goal.java
│       │               │   ├── User.java
│       │               │   └── Workout.java
│       │               ├── repository/
│       │               │   ├── GoalRepository.java
│       │               │   ├── UserRepository.java
│       │               │   └── WorkoutRepository.java
│       │               └── service/
│       │                   └── PlanGenerationService.java
│       └── resources/
│           └── application.properties
├── pom.xml
└── Dockerfile
```

### 2. Key Dependencies (pom.xml)
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 3. Database Configuration (application.properties)
```properties
# Server Configuration
server.port=8081

# Database Configuration
spring.datasource.url=jdbc:postgresql://db:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=root123
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

## Database Integration

### 1. Entity Mapping
The Spring Boot service uses JPA entities that mirror the FastAPI models:

```java
@Entity
@Table(name = "goals")
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "title", nullable = false, length = 255)
    private String title;
    
    @Column(name = "owner_id", nullable = false)
    private Long ownerId;
    
    // ... other fields
}
```

### 2. Repository Layer
```java
@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {
    @Query("SELECT g FROM Goal g WHERE g.ownerId = :ownerId ORDER BY g.id DESC")
    List<Goal> findByOwnerIdOrderByIdDesc(Long ownerId);
}
```

### 3. Database Verification Service
```java
@Service
@RequiredArgsConstructor
public class DatabaseVerificationService implements CommandLineRunner {
    private final UserRepository userRepository;
    
    @Override
    public void run(String... args) throws Exception {
        List<User> users = userRepository.findAll();
        log.info("Successfully connected to FitBuddy database!");
        log.info("Total users found: {}", users.size());
    }
}
```

## API Communication

### 1. FastAPI Service Client
```python
class AnalyticsServiceClient:
    def __init__(self, base_url: str = "http://analytics:8081"):
        self.base_url = base_url
        
    async def notify_new_goal(self, goal_id: int = None, user_id: int = None) -> bool:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self.base_url}/api/analytics/generate-plans",
                json={"goal_id": goal_id, "user_id": user_id}
            )
            return response.status_code == 200
```

### 2. Goal Creation Integration
```python
@router.post("/", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = Goal(
        title=payload.title,
        description=payload.description,
        target_date=payload.target_date,
        is_completed=payload.is_completed,
        owner_id=current_user.id,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Notify analytics service about new goal
    asyncio.create_task(notify_analytics_task(goal.id, current_user.id))
    return goal
```

### 3. Spring Boot Plan Generation
```java
@PostMapping("/generate-plans")
public ResponseEntity<String> generatePlans(@RequestBody(required = false) GoalNotificationRequest request) {
    if (request != null && request.getGoalId() != null) {
        planGenerationService.generatePlanForSpecificGoal(request.getGoalId());
        return ResponseEntity.ok("Plan generated for goal " + request.getGoalId());
    } else {
        planGenerationService.generatePlansForNewGoals();
        return ResponseEntity.ok("Plan generation completed successfully");
    }
}
```

## Frontend Integration

### 1. Plans API Integration
```javascript
const fetchPlansForMyPlans = async () => {
    const myPlansResponse = await fetch(`${API_BASE_URL}/api/plans/my-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })

    if (myPlansResponse.ok) {
        const myPlans = await myPlansResponse.json()
        const planDetails = []
        
        // Fetch details for each plan
        for (const myPlan of myPlans) {
            const planResponse = await fetch(`${API_BASE_URL}/api/plans/plan/${myPlan.workout_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (planResponse.ok) {
                const plan = await planResponse.json()
                planDetails.push(plan)
            }
        }
        
        setPlans(planDetails)
    }
}
```

### 2. Custom Plan Display
```javascript
{myPlans.map((myPlan) => {
    const plan = plans.find(p => p.id === myPlan.workout_id)
    if (!plan) {
        // Show placeholder for custom plans
        return (
            <div key={myPlan.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading plan details...</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Custom Plan
                </span>
            </div>
        )
    }
    
    const isCustomPlan = myPlan.id > 1000000 // Custom plans have high IDs
    // ... render plan details
})}
```

## Common Problems & Solutions

### Problem 1: Database Connection Issues
**Symptoms:**
- Spring Boot service can't connect to database
- "Connection refused" errors
- Service starts but can't find data

**Root Causes:**
- Wrong database URL in application.properties
- Database not ready when service starts
- Network connectivity issues between containers

**Solutions:**
```properties
# Use container name instead of localhost
spring.datasource.url=jdbc:postgresql://db:5432/postgres

# Add connection pool settings
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.maximum-pool-size=5
```

```yaml
# Add health checks in docker-compose.yml
depends_on:
  db:
    condition: service_healthy
```

### Problem 2: API Communication Failures
**Symptoms:**
- FastAPI can't reach Spring Boot service
- HTTP timeout errors
- Service discovery issues

**Root Causes:**
- Wrong service URL
- Network isolation between containers
- Service not ready when called

**Solutions:**
```python
# Use container name in service URL
class AnalyticsServiceClient:
    def __init__(self, base_url: str = "http://analytics:8081"):
        self.base_url = base_url

# Add retry logic
async def notify_analytics_task(goal_id: int, user_id: int):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            success = await analytics_client.notify_new_goal(goal_id, user_id)
            if success:
                break
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to notify analytics service: {e}")
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

### Problem 3: Data Synchronization Issues
**Symptoms:**
- Spring Boot service can't find goals created by FastAPI
- Inconsistent data between services
- Plan generation fails silently

**Root Causes:**
- Different database schemas
- Transaction isolation issues
- Timing problems

**Solutions:**
```java
// Add database verification on startup
@Service
public class DatabaseVerificationService implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        Thread.sleep(2000); // Wait for database to be ready
        List<User> users = userRepository.findAll();
        log.info("Total users found: {}", users.size());
    }
}
```

### Problem 4: Frontend Display Issues
**Symptoms:**
- Custom plans not showing in UI
- White screen when clicking "My Plans"
- API calls returning empty responses

**Root Causes:**
- Frontend not fetching plan details for custom plans
- Wrong API endpoints
- Missing error handling

**Solutions:**
```javascript
// Fetch plan details for custom plans
for (const myPlan of myPlans) {
    const planResponse = await fetch(`${API_BASE_URL}/api/plans/plan/${myPlan.workout_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (planResponse.ok) {
        const plan = await planResponse.json()
        planDetails.push(plan)
    }
}

// Add fallback display
if (!plan) {
    return (
        <div key={myPlan.id}>
            <h3>Loading plan details...</h3>
            <span className="custom-plan-badge">Custom Plan</span>
        </div>
    )
}
```

### Problem 5: Docker Build Issues
**Symptoms:**
- Changes not reflected in running containers
- "File not found" errors
- Outdated code running

**Root Causes:**
- Docker caching issues
- Volume mounts not working
- Build context problems

**Solutions:**
```bash
# Rebuild containers after code changes
docker-compose build backend
docker-compose build frontend
docker-compose up -d

# Or rebuild specific service
docker-compose build analytics
docker-compose up -d analytics
```

## Testing & Validation

### 1. Backend API Testing
```bash
# Test goal creation
curl -X POST "http://localhost:8000/api/goals/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Lose 10 pounds", "description": "Weight loss goal", "target_date": "2024-12-31"}'

# Test plan generation
curl -X POST "http://localhost:8081/api/analytics/generate-plans" \
  -H "Content-Type: application/json" \
  -d '{"goal_id": 1, "user_id": 1}'

# Test my plans endpoint
curl -X GET "http://localhost:8000/api/plans/my-plans" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Database Verification
```sql
-- Check if goals exist
SELECT id, title, owner_id FROM goals WHERE owner_id = 1;

-- Check if custom plans exist
SELECT id, title, owner_id FROM workouts WHERE owner_id = 1;

-- Check plan generation
SELECT w.id, w.title, w.owner_id, g.title as goal_title 
FROM workouts w 
JOIN goals g ON w.owner_id = g.owner_id 
WHERE w.owner_id = 1;
```

### 3. Frontend Testing
1. Open browser developer tools
2. Check Network tab for API calls
3. Verify console for errors
4. Test plan display in UI

## Best Practices

### 1. Error Handling
```python
# FastAPI - Async error handling
async def notify_analytics_task(goal_id: int, user_id: int):
    try:
        success = await analytics_client.notify_new_goal(goal_id, user_id)
        if success:
            logger.info(f"✅ Analytics service notified successfully for goal {goal_id}")
        else:
            logger.warning(f"⚠️ Analytics service responded but did not confirm success for goal {goal_id}")
    except Exception as e:
        logger.error(f"❌ Error while notifying analytics service for goal {goal_id}: {e}")
```

```java
// Spring Boot - Exception handling
@PostMapping("/generate-plans")
public ResponseEntity<String> generatePlans(@RequestBody(required = false) GoalNotificationRequest request) {
    try {
        if (request != null && request.getGoalId() != null) {
            planGenerationService.generatePlanForSpecificGoal(request.getGoalId());
            return ResponseEntity.ok("Plan generated for goal " + request.getGoalId());
        } else {
            planGenerationService.generatePlansForNewGoals();
            return ResponseEntity.ok("Plan generation completed successfully");
        }
    } catch (Exception e) {
        log.error("Error during plan generation: {}", e.getMessage());
        return ResponseEntity.internalServerError()
            .body("Error during plan generation: " + e.getMessage());
    }
}
```

### 2. Logging
```python
# FastAPI - Structured logging
import logging
logger = logging.getLogger(__name__)

logger.info(f"Goal {goal.id} created for user {current_user.id}, analytics service notification scheduled")
logger.error(f"Failed to schedule analytics service notification: {e}")
```

```java
// Spring Boot - Lombok logging
@Slf4j
public class PlanGenerationService {
    public void generatePlanForGoal(Goal goal) {
        log.info("Generating plan for goal: {} (User: {})", goal.getTitle(), goal.getOwnerId());
        // ... implementation
        log.info("Generated plan: {} for user: {}", savedPlan.getTitle(), user.getEmail());
    }
}
```

### 3. Configuration Management
```yaml
# docker-compose.yml - Environment variables
services:
  analytics:
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/postgres
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: root123
    depends_on:
      db:
        condition: service_healthy
```

### 4. Health Checks
```yaml
# Docker health checks
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8081/api/analytics/system-plans"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Troubleshooting

### Common Debug Commands
```bash
# Check container logs
docker logs fitbuddy_analytics --tail=50
docker logs fitbuddy_backend --tail=50
docker logs fitbuddy_frontend --tail=50

# Check container status
docker-compose ps

# Check database connection
docker exec -it fitbuddy_db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"

# Test API endpoints
curl -X GET "http://localhost:8081/api/analytics/system-plans"
curl -X GET "http://localhost:8000/api/health"
```

### Debug Checklist
1. ✅ All containers are running
2. ✅ Database is accessible from both services
3. ✅ API endpoints are responding
4. ✅ Network connectivity between containers
5. ✅ Data is being created and retrieved
6. ✅ Frontend is making correct API calls
7. ✅ Error logs are being monitored

### Performance Considerations
- Use connection pooling for database connections
- Implement caching for frequently accessed data
- Add rate limiting for API endpoints
- Monitor memory usage and garbage collection
- Use async/await for non-blocking operations

## Conclusion

This integration demonstrates how to connect a Spring Boot microservice with a FastAPI application for automated plan generation. The key challenges include:

1. **Database Integration**: Ensuring both services can access the same data
2. **API Communication**: Reliable service-to-service communication
3. **Error Handling**: Graceful failure handling and recovery
4. **Frontend Integration**: Properly displaying dynamically generated content
5. **Docker Orchestration**: Managing multi-service deployments

By following this guide and understanding the common pitfalls, you can successfully implement similar microservice integrations in your projects.

## Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)

---

**Note**: This guide is based on real implementation experience and includes solutions to actual problems encountered during development. Keep this as a reference for future microservice integrations!
