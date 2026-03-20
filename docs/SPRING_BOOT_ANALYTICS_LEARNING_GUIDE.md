# Spring Boot Analytics Microservice - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to Spring Boot](#introduction-to-spring-boot)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Data Access Layer](#data-access-layer)
5. [Business Logic Layer](#business-logic-layer)
6. [REST API Layer](#rest-api-layer)
7. [Configuration & Security](#configuration--security)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Best Practices](#best-practices)

## Introduction to Spring Boot

### What is Spring Boot?
Spring Boot is a framework that simplifies the development of Spring-based applications by providing auto-configuration, starter dependencies, and embedded servers. It follows the "convention over configuration" principle, reducing boilerplate code and configuration.

### Key Features
- **Auto-Configuration**: Automatically configures Spring and third-party libraries
- **Starter Dependencies**: Pre-configured dependency sets for common use cases
- **Embedded Servers**: Built-in Tomcat, Jetty, or Undertow servers
- **Production-Ready**: Built-in monitoring, metrics, and health checks
- **Microservices Ready**: Perfect for building microservices

### Why Spring Boot for Analytics?
- **Rapid Development**: Quick setup and development
- **Enterprise Features**: Built-in security, monitoring, and management
- **Scalability**: Easy to scale horizontally
- **Integration**: Seamless integration with databases and messaging systems
- **Production Ready**: Built-in production features

## Project Structure

```
analytics-service/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── fitbuddy/
│   │   │           └── analytics/
│   │   │               ├── AnalyticsServiceApplication.java
│   │   │               ├── config/
│   │   │               │   └── CorsConfig.java
│   │   │               ├── controller/
│   │   │               │   ├── PlanController.java
│   │   │               │   └── SimpleCalorieController.java
│   │   │               ├── entity/
│   │   │               │   ├── Exercise.java
│   │   │               │   ├── Goal.java
│   │   │               │   ├── User.java
│   │   │               │   └── Workout.java
│   │   │               ├── repository/
│   │   │               │   ├── ExerciseRepository.java
│   │   │               │   ├── GoalRepository.java
│   │   │               │   ├── UserRepository.java
│   │   │               │   └── WorkoutRepository.java
│   │   │               └── service/
│   │   │                   ├── PlanGenerationService.java
│   │   │                   ├── SimpleCalorieService.java
│   │   │                   └── DatabaseVerificationService.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
│       └── java/
│           └── com/
│               └── fitbuddy/
│                   └── analytics/
├── pom.xml
└── Dockerfile
```

## Core Components

### 1. Main Application Class (`AnalyticsServiceApplication.java`)

```java
package com.fitbuddy.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Autowired;
import com.fitbuddy.analytics.service.DatabaseVerificationService;

@SpringBootApplication
public class AnalyticsServiceApplication {

    @Autowired
    private DatabaseVerificationService databaseVerificationService;

    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            databaseVerificationService.verifyDatabaseConnection();
            System.out.println("✅ Analytics Service started successfully!");
        } catch (Exception e) {
            System.err.println("❌ Failed to start Analytics Service: " + e.getMessage());
            System.exit(1);
        }
    }
}
```

### 2. Configuration Properties (`application.properties`)

```properties
# Server Configuration
server.port=8081
server.servlet.context-path=/

# Database Configuration
spring.datasource.url=jdbc:postgresql://db:5432/fitbuddy_analytics
spring.datasource.username=fitbuddy
spring.datasource.password=fitbuddy123
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.physical_naming_strategy=org.hibernate.boot.model.naming.SnakeCasePhysicalNamingStrategy
spring.jpa.properties.hibernate.format_sql=true

# Logging Configuration
logging.level.com.fitbuddy.analytics=INFO
logging.level.org.springframework.web=INFO
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# FastAPI Integration
fitbuddy.fastapi.base-url=http://backend:8000

# Management Endpoints
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always
```

## Data Access Layer

### 1. Entity Classes

**User Entity (`entity/User.java`)**

```java
package com.fitbuddy.analytics.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    
    @Column(name = "full_name", nullable = false)
    private String fullName;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relationships
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Workout> workouts;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Goal> goals;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**Workout Entity (`entity/Workout.java`)**

```java
package com.fitbuddy.analytics.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "workouts", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Workout {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "title", nullable = false)
    private String title;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "duration_minutes")
    private Integer durationMinutes;
    
    @Column(name = "difficulty_level")
    private String difficultyLevel;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### 2. Repository Interfaces

**Base Repository Pattern**

```java
package com.fitbuddy.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;
import java.util.List;
import java.util.Optional;

@NoRepositoryBean
public interface BaseRepository<T, ID> extends JpaRepository<T, ID> {
    
    List<T> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    Optional<T> findByIdAndIsActive(ID id, Boolean isActive);
    
    List<T> findByIsActive(Boolean isActive);
}
```

**Workout Repository (`repository/WorkoutRepository.java`)**

```java
package com.fitbuddy.analytics.repository;

import com.fitbuddy.analytics.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, Long> {
    
    // Find workouts by user
    List<Workout> findByUserId(Long userId);
    
    // Find workouts by user and date range
    @Query("SELECT w FROM Workout w WHERE w.user.id = :userId AND w.createdAt BETWEEN :startDate AND :endDate")
    List<Workout> findByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // Find workouts by difficulty level
    List<Workout> findByDifficultyLevel(String difficultyLevel);
    
    // Find workouts by duration range
    @Query("SELECT w FROM Workout w WHERE w.durationMinutes BETWEEN :minDuration AND :maxDuration")
    List<Workout> findByDurationRange(
        @Param("minDuration") Integer minDuration,
        @Param("maxDuration") Integer maxDuration
    );
    
    // Count workouts by user
    @Query("SELECT COUNT(w) FROM Workout w WHERE w.user.id = :userId")
    Long countByUserId(@Param("userId") Long userId);
    
    // Find most recent workouts
    @Query("SELECT w FROM Workout w WHERE w.user.id = :userId ORDER BY w.createdAt DESC")
    List<Workout> findRecentWorkoutsByUserId(@Param("userId") Long userId);
}
```

## Business Logic Layer

### 1. Calorie Calculation Service (`service/SimpleCalorieService.java`)

```java
package com.fitbuddy.analytics.service;

import com.fitbuddy.analytics.entity.Workout;
import com.fitbuddy.analytics.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimpleCalorieService {

    private final WorkoutRepository workoutRepository;

    // Default MET values for common exercises (simplified)
    private static final Map<String, Double> MET_VALUES = new HashMap<>();
    static {
        MET_VALUES.put("running", 8.0);
        MET_VALUES.put("cycling", 6.0);
        MET_VALUES.put("swimming", 7.0);
        MET_VALUES.put("strength training", 3.5);
        MET_VALUES.put("yoga", 2.5);
        MET_VALUES.put("walking", 3.0);
        MET_VALUES.put("jumping", 10.0);
        MET_VALUES.put("rowing", 7.0);
        MET_VALUES.put("elliptical", 5.0);
        MET_VALUES.put("dancing", 4.5);
        MET_VALUES.put("hiking", 6.0);
        MET_VALUES.put("basketball", 6.5);
        MET_VALUES.put("tennis", 7.0);
        MET_VALUES.put("soccer", 7.0);
        MET_VALUES.put("volleyball", 3.0);
    }

    // Default average weight in kg for calorie calculation (simplified)
    private static final double AVERAGE_WEIGHT_KG = 70.0;

    /**
     * Calculate calories burned for a specific workout.
     * This is a simplified calculation using a default MET value and average weight.
     */
    public Map<String, Object> calculateCaloriesForWorkout(Long workoutId, Integer durationMinutes) {
        log.info("Calculating calories for workout ID: {} with duration: {} minutes", workoutId, durationMinutes);

        // Fetch workout details from the repository
        Workout workout = workoutRepository.findById(workoutId)
                .orElseThrow(() -> new RuntimeException("Workout not found with ID: " + workoutId));

        // Determine MET value based on workout title
        double metValue = getMetValueForWorkout(workout.getTitle());

        // Calorie calculation formula: MET * Weight (kg) * Duration (hours)
        double durationHours = durationMinutes / 60.0;
        double caloriesBurned = metValue * AVERAGE_WEIGHT_KG * durationHours;

        Map<String, Object> result = new HashMap<>();
        result.put("workoutId", workoutId);
        result.put("workoutTitle", workout.getTitle());
        result.put("durationMinutes", durationMinutes);
        result.put("metValue", metValue);
        result.put("caloriesBurned", Math.round(caloriesBurned * 100.0) / 100.0);
        result.put("assumptions", new HashMap<String, Object>() {{
            put("weight", AVERAGE_WEIGHT_KG);
            put("intensity", "moderate");
        }});

        log.info("Calculated {} calories for workout: {}", caloriesBurned, workout.getTitle());
        return result;
    }

    /**
     * Get MET value for a workout based on its title.
     * Uses keyword matching to determine the appropriate MET value.
     */
    private double getMetValueForWorkout(String workoutTitle) {
        if (workoutTitle == null) {
            return 3.0; // Default moderate activity
        }

        String lowerTitle = workoutTitle.toLowerCase();
        
        // Check for exact matches first
        for (Map.Entry<String, Double> entry : MET_VALUES.entrySet()) {
            if (lowerTitle.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        // Check for partial matches
        if (lowerTitle.contains("run")) return MET_VALUES.get("running");
        if (lowerTitle.contains("cycle") || lowerTitle.contains("bike")) return MET_VALUES.get("cycling");
        if (lowerTitle.contains("swim")) return MET_VALUES.get("swimming");
        if (lowerTitle.contains("strength") || lowerTitle.contains("weight")) return MET_VALUES.get("strength training");
        if (lowerTitle.contains("yoga")) return MET_VALUES.get("yoga");
        if (lowerTitle.contains("walk")) return MET_VALUES.get("walking");
        if (lowerTitle.contains("jump")) return MET_VALUES.get("jumping");
        if (lowerTitle.contains("row")) return MET_VALUES.get("rowing");
        if (lowerTitle.contains("elliptical")) return MET_VALUES.get("elliptical");
        if (lowerTitle.contains("dance")) return MET_VALUES.get("dancing");
        if (lowerTitle.contains("hike")) return MET_VALUES.get("hiking");
        if (lowerTitle.contains("basketball")) return MET_VALUES.get("basketball");
        if (lowerTitle.contains("tennis")) return MET_VALUES.get("tennis");
        if (lowerTitle.contains("soccer") || lowerTitle.contains("football")) return MET_VALUES.get("soccer");
        if (lowerTitle.contains("volleyball")) return MET_VALUES.get("volleyball");

        // Default to moderate activity if no match found
        return 3.0;
    }

    /**
     * Get daily calorie summary for a user.
     * This is a placeholder and would typically integrate with FastAPI workout logs.
     */
    public Map<String, Object> getDailyCalorieSummary(Long userId, LocalDate date) {
        log.info("Getting daily calorie summary for user: {} on date: {}", userId, date);

        Map<String, Object> summary = new HashMap<>();
        summary.put("userId", userId);
        summary.put("date", date.toString());
        summary.put("totalCaloriesBurned", 0.0);
        summary.put("totalWorkoutMinutes", 0);
        summary.put("workoutCount", 0);
        summary.put("message", "No workout data available - this would integrate with FastAPI workout logs");

        return summary;
    }

    /**
     * Get MET values for all supported exercises.
     */
    public Map<String, Double> getAllMetValues() {
        return new HashMap<>(MET_VALUES);
    }

    /**
     * Add or update MET value for an exercise.
     */
    public void updateMetValue(String exercise, Double metValue) {
        MET_VALUES.put(exercise.toLowerCase(), metValue);
        log.info("Updated MET value for {} to {}", exercise, metValue);
    }
}
```

### 2. Plan Generation Service (`service/PlanGenerationService.java`)

```java
package com.fitbuddy.analytics.service;

import com.fitbuddy.analytics.entity.Exercise;
import com.fitbuddy.analytics.entity.Goal;
import com.fitbuddy.analytics.entity.User;
import com.fitbuddy.analytics.repository.ExerciseRepository;
import com.fitbuddy.analytics.repository.GoalRepository;
import com.fitbuddy.analytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlanGenerationService {

    private final ExerciseRepository exerciseRepository;
    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    /**
     * Generate a workout plan based on user goals and preferences.
     */
    public Map<String, Object> generateWorkoutPlan(Long userId, Map<String, Object> preferences) {
        log.info("Generating workout plan for user: {} with preferences: {}", userId, preferences);

        try {
            // Get user information
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            // Get user goals
            List<Goal> userGoals = goalRepository.findByUserId(userId);
            
            // Get available exercises
            List<Exercise> availableExercises = exerciseRepository.findAll();

            // Generate plan based on goals and preferences
            Map<String, Object> plan = createWorkoutPlan(user, userGoals, availableExercises, preferences);

            log.info("Successfully generated workout plan for user: {}", userId);
            return plan;

        } catch (Exception e) {
            log.error("Error generating workout plan for user {}: {}", userId, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate workout plan");
            errorResponse.put("message", e.getMessage());
            return errorResponse;
        }
    }

    /**
     * Create a workout plan based on user goals and available exercises.
     */
    private Map<String, Object> createWorkoutPlan(User user, List<Goal> goals, 
                                                 List<Exercise> exercises, 
                                                 Map<String, Object> preferences) {
        
        Map<String, Object> plan = new HashMap<>();
        plan.put("userId", user.getId());
        plan.put("generatedAt", LocalDateTime.now());
        plan.put("planType", preferences.getOrDefault("planType", "balanced"));
        plan.put("duration", preferences.getOrDefault("duration", "4 weeks"));
        plan.put("frequency", preferences.getOrDefault("frequency", "3 times per week"));

        // Analyze goals to determine focus areas
        List<String> focusAreas = analyzeGoals(goals);
        plan.put("focusAreas", focusAreas);

        // Generate workout sessions
        List<Map<String, Object>> workoutSessions = generateWorkoutSessions(
            exercises, focusAreas, preferences
        );
        plan.put("workoutSessions", workoutSessions);

        // Add recommendations
        Map<String, Object> recommendations = generateRecommendations(goals, focusAreas);
        plan.put("recommendations", recommendations);

        return plan;
    }

    /**
     * Analyze user goals to determine focus areas.
     */
    private List<String> analyzeGoals(List<Goal> goals) {
        List<String> focusAreas = new ArrayList<>();
        
        for (Goal goal : goals) {
            String goalType = goal.getGoalType().toLowerCase();
            
            if (goalType.contains("weight") || goalType.contains("muscle")) {
                focusAreas.add("strength");
            }
            if (goalType.contains("cardio") || goalType.contains("endurance")) {
                focusAreas.add("cardio");
            }
            if (goalType.contains("flexibility") || goalType.contains("mobility")) {
                focusAreas.add("flexibility");
            }
            if (goalType.contains("weight loss") || goalType.contains("fat")) {
                focusAreas.add("weight_loss");
            }
        }

        // Default focus areas if none specified
        if (focusAreas.isEmpty()) {
            focusAreas.add("strength");
            focusAreas.add("cardio");
        }

        return focusAreas;
    }

    /**
     * Generate workout sessions based on focus areas and exercises.
     */
    private List<Map<String, Object>> generateWorkoutSessions(List<Exercise> exercises, 
                                                            List<String> focusAreas, 
                                                            Map<String, Object> preferences) {
        
        List<Map<String, Object>> sessions = new ArrayList<>();
        
        // Group exercises by category
        Map<String, List<Exercise>> exerciseCategories = groupExercisesByCategory(exercises);
        
        // Generate sessions for each focus area
        for (String focusArea : focusAreas) {
            Map<String, Object> session = createWorkoutSession(focusArea, exerciseCategories, preferences);
            sessions.add(session);
        }

        return sessions;
    }

    /**
     * Group exercises by category.
     */
    private Map<String, List<Exercise>> groupExercisesByCategory(List<Exercise> exercises) {
        Map<String, List<Exercise>> categories = new HashMap<>();
        
        for (Exercise exercise : exercises) {
            String category = exercise.getCategory();
            categories.computeIfAbsent(category, k -> new ArrayList<>()).add(exercise);
        }
        
        return categories;
    }

    /**
     * Create a workout session for a specific focus area.
     */
    private Map<String, Object> createWorkoutSession(String focusArea, 
                                                   Map<String, List<Exercise>> exerciseCategories, 
                                                   Map<String, Object> preferences) {
        
        Map<String, Object> session = new HashMap<>();
        session.put("focusArea", focusArea);
        session.put("estimatedDuration", getEstimatedDuration(focusArea));
        session.put("difficulty", preferences.getOrDefault("difficulty", "intermediate"));
        
        // Select exercises for this focus area
        List<Map<String, Object>> selectedExercises = selectExercisesForFocusArea(
            focusArea, exerciseCategories
        );
        session.put("exercises", selectedExercises);
        
        return session;
    }

    /**
     * Select exercises for a specific focus area.
     */
    private List<Map<String, Object>> selectExercisesForFocusArea(String focusArea, 
                                                               Map<String, List<Exercise>> exerciseCategories) {
        
        List<Map<String, Object>> selectedExercises = new ArrayList<>();
        
        switch (focusArea.toLowerCase()) {
            case "strength":
                selectStrengthExercises(exerciseCategories, selectedExercises);
                break;
            case "cardio":
                selectCardioExercises(exerciseCategories, selectedExercises);
                break;
            case "flexibility":
                selectFlexibilityExercises(exerciseCategories, selectedExercises);
                break;
            case "weight_loss":
                selectWeightLossExercises(exerciseCategories, selectedExercises);
                break;
            default:
                selectBalancedExercises(exerciseCategories, selectedExercises);
        }
        
        return selectedExercises;
    }

    /**
     * Select strength training exercises.
     */
    private void selectStrengthExercises(Map<String, List<Exercise>> exerciseCategories, 
                                       List<Map<String, Object>> selectedExercises) {
        
        List<Exercise> strengthExercises = exerciseCategories.getOrDefault("strength", new ArrayList<>());
        
        for (Exercise exercise : strengthExercises) {
            Map<String, Object> exerciseData = new HashMap<>();
            exerciseData.put("id", exercise.getId());
            exerciseData.put("name", exercise.getName());
            exerciseData.put("sets", 3);
            exerciseData.put("reps", "8-12");
            exerciseData.put("rest", "60-90 seconds");
            selectedExercises.add(exerciseData);
        }
    }

    /**
     * Select cardio exercises.
     */
    private void selectCardioExercises(Map<String, List<Exercise>> exerciseCategories, 
                                     List<Map<String, Object>> selectedExercises) {
        
        List<Exercise> cardioExercises = exerciseCategories.getOrDefault("cardio", new ArrayList<>());
        
        for (Exercise exercise : cardioExercises) {
            Map<String, Object> exerciseData = new HashMap<>();
            exerciseData.put("id", exercise.getId());
            exerciseData.put("name", exercise.getName());
            exerciseData.put("duration", "20-30 minutes");
            exerciseData.put("intensity", "moderate to high");
            selectedExercises.add(exerciseData);
        }
    }

    /**
     * Select flexibility exercises.
     */
    private void selectFlexibilityExercises(Map<String, List<Exercise>> exerciseCategories, 
                                          List<Map<String, Object>> selectedExercises) {
        
        List<Exercise> flexibilityExercises = exerciseCategories.getOrDefault("flexibility", new ArrayList<>());
        
        for (Exercise exercise : flexibilityExercises) {
            Map<String, Object> exerciseData = new HashMap<>();
            exerciseData.put("id", exercise.getId());
            exerciseData.put("name", exercise.getName());
            exerciseData.put("duration", "30-60 seconds per stretch");
            exerciseData.put("repetitions", "2-3");
            selectedExercises.add(exerciseData);
        }
    }

    /**
     * Select weight loss exercises.
     */
    private void selectWeightLossExercises(Map<String, List<Exercise>> exerciseCategories, 
                                        List<Map<String, Object>> selectedExercises) {
        
        // Combine cardio and strength for weight loss
        selectCardioExercises(exerciseCategories, selectedExercises);
        selectStrengthExercises(exerciseCategories, selectedExercises);
    }

    /**
     * Select balanced exercises.
     */
    private void selectBalancedExercises(Map<String, List<Exercise>> exerciseCategories, 
                                      List<Map<String, Object>> selectedExercises) {
        
        selectStrengthExercises(exerciseCategories, selectedExercises);
        selectCardioExercises(exerciseCategories, selectedExercises);
        selectFlexibilityExercises(exerciseCategories, selectedExercises);
    }

    /**
     * Get estimated duration for a focus area.
     */
    private String getEstimatedDuration(String focusArea) {
        switch (focusArea.toLowerCase()) {
            case "strength":
                return "45-60 minutes";
            case "cardio":
                return "30-45 minutes";
            case "flexibility":
                return "20-30 minutes";
            case "weight_loss":
                return "60-75 minutes";
            default:
                return "45-60 minutes";
        }
    }

    /**
     * Generate recommendations based on goals and focus areas.
     */
    private Map<String, Object> generateRecommendations(List<Goal> goals, List<String> focusAreas) {
        Map<String, Object> recommendations = new HashMap<>();
        
        recommendations.put("nutrition", "Maintain a balanced diet with adequate protein for muscle building");
        recommendations.put("hydration", "Drink at least 8 glasses of water per day");
        recommendations.put("rest", "Allow 48 hours between strength training sessions for muscle recovery");
        recommendations.put("progression", "Gradually increase intensity and duration over time");
        
        if (focusAreas.contains("weight_loss")) {
            recommendations.put("calorie_deficit", "Create a moderate calorie deficit for sustainable weight loss");
        }
        
        if (focusAreas.contains("strength")) {
            recommendations.put("protein", "Consume 1.6-2.2g protein per kg body weight for muscle building");
        }
        
        return recommendations;
    }
}
```

## REST API Layer

### 1. Calorie Controller (`controller/SimpleCalorieController.java`)

```java
package com.fitbuddy.analytics.controller;

import com.fitbuddy.analytics.service.SimpleCalorieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics/calories")
@RequiredArgsConstructor
@Slf4j
public class SimpleCalorieController {

    private final SimpleCalorieService simpleCalorieService;

    /**
     * Calculate calories burned for a specific workout.
     * This endpoint is called by FastAPI asynchronously.
     */
    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateCalories(
            @RequestParam Long workoutId,
            @RequestParam Integer durationMinutes
    ) {
        log.info("Received calorie calculation request for workoutId: {} with duration: {} minutes", 
                workoutId, durationMinutes);
        
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

    /**
     * Get daily calorie summary for a user.
     * This endpoint is called by the frontend.
     */
    @GetMapping("/daily-summary/{userId}")
    public ResponseEntity<Map<String, Object>> getDailyCalorieSummary(
            @PathVariable Long userId,
            @RequestParam(required = false) LocalDate date
    ) {
        if (date == null) {
            date = LocalDate.now();
        }
        
        try {
            Map<String, Object> summary = simpleCalorieService.getDailyCalorieSummary(userId, date);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error getting daily calorie summary for user {}: {}", userId, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get daily calorie summary");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Get all available MET values.
     */
    @GetMapping("/met-values")
    public ResponseEntity<Map<String, Double>> getMetValues() {
        try {
            Map<String, Double> metValues = simpleCalorieService.getAllMetValues();
            return ResponseEntity.ok(metValues);
        } catch (Exception e) {
            log.error("Error getting MET values: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new HashMap<>());
        }
    }

    /**
     * Update MET value for an exercise.
     */
    @PutMapping("/met-values/{exercise}")
    public ResponseEntity<Map<String, Object>> updateMetValue(
            @PathVariable String exercise,
            @RequestParam Double metValue
    ) {
        try {
            simpleCalorieService.updateMetValue(exercise, metValue);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "MET value updated successfully");
            response.put("exercise", exercise);
            response.put("metValue", metValue);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating MET value for {}: {}", exercise, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to update MET value");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> healthResponse = new HashMap<>();
        healthResponse.put("status", "healthy");
        healthResponse.put("service", "simple-calorie-service");
        healthResponse.put("timestamp", LocalDate.now().toString());
        return ResponseEntity.ok(healthResponse);
    }
}
```

### 2. Plan Controller (`controller/PlanController.java`)

```java
package com.fitbuddy.analytics.controller;

import com.fitbuddy.analytics.service.PlanGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics/plans")
@RequiredArgsConstructor
@Slf4j
public class PlanController {

    private final PlanGenerationService planGenerationService;

    /**
     * Generate a workout plan for a user.
     */
    @PostMapping("/generate/{userId}")
    public ResponseEntity<Map<String, Object>> generateWorkoutPlan(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, Object> preferences
    ) {
        log.info("Received plan generation request for user: {} with preferences: {}", userId, preferences);
        
        try {
            if (preferences == null) {
                preferences = new HashMap<>();
            }
            
            Map<String, Object> plan = planGenerationService.generateWorkoutPlan(userId, preferences);
            return ResponseEntity.ok(plan);
        } catch (Exception e) {
            log.error("Error generating workout plan for user {}: {}", userId, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate workout plan");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Health check endpoint for plan service.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> healthResponse = new HashMap<>();
        healthResponse.put("status", "healthy");
        healthResponse.put("service", "plan-generation-service");
        return ResponseEntity.ok(healthResponse);
    }
}
```

## Configuration & Security

### 1. CORS Configuration (`config/CorsConfig.java`)

```java
package com.fitbuddy.analytics.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.lang.NonNull;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "http://frontend:3000", "http://127.0.0.1:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

### 2. Database Configuration

```java
package com.fitbuddy.analytics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(basePackages = "com.fitbuddy.analytics.repository")
@EnableTransactionManagement
public class DatabaseConfig {

    // Additional database configuration can be added here
    // Connection pooling, transaction management, etc.
}
```

## Testing

### 1. Unit Testing

```java
package com.fitbuddy.analytics.service;

import com.fitbuddy.analytics.entity.Workout;
import com.fitbuddy.analytics.repository.WorkoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SimpleCalorieServiceTest {

    @Mock
    private WorkoutRepository workoutRepository;

    @InjectMocks
    private SimpleCalorieService simpleCalorieService;

    private Workout testWorkout;

    @BeforeEach
    void setUp() {
        testWorkout = new Workout();
        testWorkout.setId(1L);
        testWorkout.setTitle("Running");
        testWorkout.setDescription("Morning run");
    }

    @Test
    void calculateCaloriesForWorkout_Success() {
        // Given
        Long workoutId = 1L;
        Integer durationMinutes = 30;
        
        when(workoutRepository.findById(workoutId)).thenReturn(Optional.of(testWorkout));

        // When
        Map<String, Object> result = simpleCalorieService.calculateCaloriesForWorkout(workoutId, durationMinutes);

        // Then
        assertNotNull(result);
        assertEquals(workoutId, result.get("workoutId"));
        assertEquals("Running", result.get("workoutTitle"));
        assertEquals(durationMinutes, result.get("durationMinutes"));
        assertEquals(8.0, result.get("metValue")); // Running MET value
        assertTrue((Double) result.get("caloriesBurned") > 0);

        verify(workoutRepository).findById(workoutId);
    }

    @Test
    void calculateCaloriesForWorkout_WorkoutNotFound() {
        // Given
        Long workoutId = 999L;
        Integer durationMinutes = 30;
        
        when(workoutRepository.findById(workoutId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> {
            simpleCalorieService.calculateCaloriesForWorkout(workoutId, durationMinutes);
        });

        verify(workoutRepository).findById(workoutId);
    }

    @Test
    void getMetValueForWorkout_Running() {
        // Given
        String workoutTitle = "Running";

        // When
        double metValue = simpleCalorieService.getMetValueForWorkout(workoutTitle);

        // Then
        assertEquals(8.0, metValue);
    }

    @Test
    void getMetValueForWorkout_UnknownExercise() {
        // Given
        String workoutTitle = "Unknown Exercise";

        // When
        double metValue = simpleCalorieService.getMetValueForWorkout(workoutTitle);

        // Then
        assertEquals(3.0, metValue); // Default MET value
    }
}
```

### 2. Integration Testing

```java
package com.fitbuddy.analytics.controller;

import com.fitbuddy.analytics.entity.Workout;
import com.fitbuddy.analytics.repository.WorkoutRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
class SimpleCalorieControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutRepository workoutRepository;

    @Test
    void calculateCalories_Success() throws Exception {
        // Given
        Workout workout = new Workout();
        workout.setId(1L);
        workout.setTitle("Running");
        
        when(workoutRepository.findById(1L)).thenReturn(Optional.of(workout));

        // When & Then
        mockMvc.perform(post("/api/analytics/calories/calculate")
                .param("workoutId", "1")
                .param("durationMinutes", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workoutId").value(1))
                .andExpect(jsonPath("$.workoutTitle").value("Running"))
                .andExpect(jsonPath("$.durationMinutes").value(30))
                .andExpect(jsonPath("$.metValue").value(8.0))
                .andExpect(jsonPath("$.caloriesBurned").exists());
    }

    @Test
    void healthCheck_Success() throws Exception {
        mockMvc.perform(post("/api/analytics/calories/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("healthy"))
                .andExpect(jsonPath("$.service").value("simple-calorie-service"));
    }
}
```

## Deployment

### 1. Docker Configuration

```dockerfile
# Build stage
FROM maven:3.8.6-openjdk-11-slim AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM openjdk:11-jre-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy jar from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/api/analytics/calories/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 2. Maven Configuration (`pom.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.18</version>
        <relativePath/>
    </parent>

    <groupId>com.fitbuddy</groupId>
    <artifactId>analytics-service</artifactId>
    <version>1.0.0</version>
    <name>analytics-service</name>
    <description>FitBuddy Analytics Microservice</description>

    <properties>
        <java.version>11</java.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

## Best Practices

### 1. Service Layer Design
- **Single Responsibility**: Each service should have one clear purpose
- **Dependency Injection**: Use constructor injection for dependencies
- **Exception Handling**: Implement proper exception handling
- **Logging**: Use structured logging for debugging and monitoring

### 2. Repository Pattern
- **Custom Queries**: Use @Query for complex database operations
- **Method Naming**: Follow Spring Data JPA naming conventions
- **Pagination**: Implement pagination for large datasets
- **Transaction Management**: Use @Transactional appropriately

### 3. API Design
- **RESTful**: Follow REST principles
- **Error Handling**: Return consistent error responses
- **Validation**: Validate input parameters
- **Documentation**: Use Swagger/OpenAPI for API documentation

### 4. Performance
- **Caching**: Implement caching for frequently accessed data
- **Database Optimization**: Use proper indexing and queries
- **Connection Pooling**: Configure database connection pools
- **Monitoring**: Use Spring Boot Actuator for monitoring

### 5. Security
- **Input Validation**: Validate all input data
- **CORS Configuration**: Configure CORS properly
- **Error Messages**: Don't expose sensitive information in errors
- **Authentication**: Implement proper authentication if needed

This comprehensive guide covers all aspects of Spring Boot microservice development used in the FitBuddy analytics service, from basic concepts to advanced patterns and best practices.
