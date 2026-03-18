"""
Enhanced calorie calculation service that integrates with the exercises table.
This service provides more accurate calorie calculations by using the actual exercise database.
"""

import logging
from typing import Optional, Dict, Any, List
from sqlalchemy import text
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

class EnhancedCalorieService:
    """Enhanced service for calculating calories using the exercises table."""
    
    def __init__(self):
        self.fallback_service = None  # Will import the original calorie service as fallback
    
    def calculate_calories_from_exercise_id(self, exercise_id: int, duration_minutes: int, 
                                          user_weight_kg: float = 70.0) -> Dict[str, Any]:
        """
        Calculate calories using exercise ID from the exercises table.
        
        Args:
            exercise_id: ID of the exercise from exercises table
            duration_minutes: Duration of the exercise in minutes
            user_weight_kg: User's weight in kilograms
            
        Returns:
            Dictionary with calculation details
        """
        if duration_minutes <= 0:
            return {
                "calories_burned": 0.0,
                "met_value": 0.0,
                "duration_hours": 0.0,
                "weight_kg": user_weight_kg,
                "error": "Invalid duration"
            }
        
        with SessionLocal() as db:
            # Get exercise details from database
            result = db.execute(text("""
                SELECT name, category, description 
                FROM exercises 
                WHERE id = :exercise_id
            """), {"exercise_id": exercise_id})
            
            exercise = result.fetchone()
            
            if not exercise:
                return {
                    "calories_burned": 0.0,
                    "met_value": 0.0,
                    "duration_hours": 0.0,
                    "weight_kg": user_weight_kg,
                    "error": "Exercise not found"
                }
            
            name, category, description = exercise
            
            # Get MET value based on exercise name and category
            met_value = self._get_met_value_for_exercise(name, category, description)
            
            # Convert duration to hours
            duration_hours = duration_minutes / 60.0
            
            # Calculate calories: MET × Weight(kg) × Duration(hours)
            calories_burned = met_value * user_weight_kg * duration_hours
            
            result_dict = {
                "exercise_id": exercise_id,
                "exercise_name": name,
                "exercise_category": category,
                "calories_burned": round(calories_burned, 1),
                "met_value": met_value,
                "duration_hours": round(duration_hours, 2),
                "weight_kg": user_weight_kg,
                "matched_method": "exercise_database"
            }
            
            logger.info(f"Calculated {calories_burned:.1f} calories for exercise {name} "
                       f"({duration_minutes}min, MET: {met_value}, Weight: {user_weight_kg}kg)")
            
            return result_dict
    
    def calculate_calories_from_exercise_name(self, exercise_name: str, duration_minutes: int, 
                                            user_weight_kg: float = 70.0) -> Dict[str, Any]:
        """
        Calculate calories by finding exercise in the database by name.
        
        Args:
            exercise_name: Name of the exercise to search for
            duration_minutes: Duration of the exercise in minutes
            user_weight_kg: User's weight in kilograms
            
        Returns:
            Dictionary with calculation details
        """
        if duration_minutes <= 0:
            return {
                "calories_burned": 0.0,
                "met_value": 0.0,
                "duration_hours": 0.0,
                "weight_kg": user_weight_kg,
                "error": "Invalid duration"
            }
        
        with SessionLocal() as db:
            # Search for exercise by name (case insensitive)
            result = db.execute(text("""
                SELECT id, name, category, description 
                FROM exercises 
                WHERE LOWER(name) = LOWER(:exercise_name)
                LIMIT 1
            """), {"exercise_name": exercise_name})
            
            exercise = result.fetchone()
            
            if exercise:
                exercise_id, name, category, description = exercise
                return self.calculate_calories_from_exercise_id(exercise_id, duration_minutes, user_weight_kg)
            else:
                # Fallback to original calorie service
                return self._fallback_calculation(exercise_name, duration_minutes, user_weight_kg)
    
    def get_exercises_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get all exercises in a specific category."""
        with SessionLocal() as db:
            result = db.execute(text("""
                SELECT id, name, category, description 
                FROM exercises 
                WHERE LOWER(category) = LOWER(:category)
                ORDER BY name
            """), {"category": category})
            
            exercises = []
            for row in result.fetchall():
                exercises.append({
                    "id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "description": row[3]
                })
            
            return exercises
    
    def search_exercises(self, query: str) -> List[Dict[str, Any]]:
        """Search exercises by name or description."""
        with SessionLocal() as db:
            result = db.execute(text("""
                SELECT id, name, category, description 
                FROM exercises 
                WHERE LOWER(name) LIKE LOWER(:query) 
                   OR LOWER(description) LIKE LOWER(:query)
                ORDER BY name
                LIMIT 20
            """), {"query": f"%{query}%"})
            
            exercises = []
            for row in result.fetchall():
                exercises.append({
                    "id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "description": row[3]
                })
            
            return exercises
    
    def get_all_categories(self) -> List[str]:
        """Get all exercise categories."""
        with SessionLocal() as db:
            result = db.execute(text("""
                SELECT DISTINCT category 
                FROM exercises 
                ORDER BY category
            """))
            
            return [row[0] for row in result.fetchall()]
    
    def _get_met_value_for_exercise(self, name: str, category: str, description: str = None) -> float:
        """Get MET value for an exercise from the database."""
        # Enhanced MET values based on the exercises in our database
        met_values = {
            # Cardio exercises
            "running": 8.0,
            "cycling": 6.0,
            "swimming": 7.0,
            "jump rope": 8.5,
            "rowing": 7.0,
            "elliptical": 5.0,
            "stair climbing": 8.0,
            "dancing": 4.5,
            "boxing": 8.0,
            "hiit": 9.0,
            
            # Strength exercises
            "push-ups": 3.5,
            "pushups": 3.5,
            "pull-ups": 4.0,
            "pullups": 4.0,
            "squats": 4.0,
            "deadlift": 5.0,
            "deadlifts": 5.0,
            "benchpress": 3.5,
            "bench press": 3.5,
            "overhead press": 3.5,
            "lunges": 4.0,
            "plank": 3.0,
            "dips": 4.0,
            "bicep curls": 3.5,
            "tricep extensions": 3.5,
            "shoulder press": 3.5,
            
            # Flexibility exercises
            "yoga": 2.5,
            "stretching": 2.0,
            "pilates": 3.0,
            "tai chi": 2.5,
            "dynamic stretching": 3.0,
            "static stretching": 2.0,
            "foam rolling": 2.0,
            "mobility work": 2.5,
            "breathing exercises": 1.5,
            "meditation": 1.0,
        }
        
        name_lower = name.lower()
        
        # Direct name match
        if name_lower in met_values:
            return met_values[name_lower]
        
        # Partial name matching
        for key, value in met_values.items():
            if key in name_lower or name_lower in key:
                return value
        
        # Category-based defaults
        if category.lower() == "cardio":
            return 6.0
        elif category.lower() == "strength":
            return 4.0
        elif category.lower() == "flexibility":
            return 2.5
        
        # Default moderate intensity
        return 4.0
    
    def _fallback_calculation(self, exercise_name: str, duration_minutes: int, user_weight_kg: float) -> Dict[str, Any]:
        """Fallback to original calorie service if exercise not found in database."""
        try:
            # Import here to avoid circular imports
            from app.services.calorie_service import calorie_service
            
            result = calorie_service.calculate_calories(exercise_name, duration_minutes, user_weight_kg)
            result["matched_method"] = "fallback_service"
            return result
            
        except Exception as e:
            logger.error(f"Fallback calorie calculation failed: {e}")
            # Ultimate fallback
            met_value = 4.0
            duration_hours = duration_minutes / 60.0
            calories_burned = met_value * user_weight_kg * duration_hours
            
            return {
                "exercise_name": exercise_name,
                "calories_burned": round(calories_burned, 1),
                "met_value": met_value,
                "duration_hours": round(duration_hours, 2),
                "weight_kg": user_weight_kg,
                "matched_method": "ultimate_fallback",
                "error": "Exercise not found and fallback failed"
            }

# Global instance
enhanced_calorie_service = EnhancedCalorieService()


