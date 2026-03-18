"""
Calorie calculation service for workout sessions.
This service calculates calories burned based on workout data using MET values.
"""

import logging
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)

class CalorieService:
    """Service for calculating calories burned during workouts."""
    
    # MET values for different exercises and activities
    MET_VALUES = {
        # Cardio exercises
        "running": 8.0,
        "jogging": 7.0,
        "cycling": 6.0,
        "biking": 6.0,
        "swimming": 7.0,
        "jumping": 8.5,
        "jump rope": 8.5,
        "rowing": 7.0,
        "elliptical": 5.0,
        "stairs": 8.0,
        "stair climbing": 8.0,
        "dancing": 4.5,
        "boxing": 8.0,
        "hiit": 9.0,
        "high intensity": 9.0,
        "sprinting": 10.0,
        "walking": 3.5,
        "hiking": 6.0,
        
        # Strength exercises
        "push": 3.5,
        "push up": 3.5,
        "pushup": 3.5,
        "pull": 4.0,
        "pull up": 4.0,
        "pullup": 4.0,
        "squat": 4.0,
        "squats": 4.0,
        "deadlift": 5.0,
        "deadlifts": 5.0,
        "bench": 3.5,
        "bench press": 3.5,
        "press": 3.5,
        "overhead press": 3.5,
        "row": 4.0,
        "rowing": 4.0,
        "lunge": 4.0,
        "lunges": 4.0,
        "plank": 3.0,
        "dip": 4.0,
        "dips": 4.0,
        "curl": 3.5,
        "bicep curl": 3.5,
        "tricep": 3.5,
        "shoulder": 3.5,
        "chest": 3.5,
        "back": 4.0,
        "leg": 4.5,
        "abs": 3.0,
        "core": 3.0,
        
        # Flexibility exercises
        "yoga": 2.5,
        "stretch": 2.0,
        "stretching": 2.0,
        "pilates": 3.0,
        "tai": 2.5,
        "tai chi": 2.5,
        "dynamic": 3.0,
        "static": 2.0,
        "foam": 2.0,
        "foam rolling": 2.0,
        "mobility": 2.5,
        "breathing": 1.5,
        "meditation": 1.0,
        
        # Sports
        "basketball": 6.5,
        "football": 8.0,
        "soccer": 7.0,
        "tennis": 7.0,
        "volleyball": 3.0,
        "golf": 4.5,
        "baseball": 5.0,
        "hockey": 8.0,
        "rugby": 8.0,
        "cricket": 5.0,
    }
    
    def calculate_calories(self, workout_title: str, duration_minutes: int, 
                          user_weight_kg: float = 70.0) -> Dict[str, Any]:
        """
        Calculate calories burned for a workout.
        
        Args:
            workout_title: Title/name of the workout
            duration_minutes: Duration of the workout in minutes
            user_weight_kg: User's weight in kilograms (default: 70kg)
            
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
        
        # Get MET value for the workout
        met_value = self._get_met_value(workout_title)
        
        # Convert duration to hours
        duration_hours = duration_minutes / 60.0
        
        # Calculate calories: MET × Weight(kg) × Duration(hours)
        calories_burned = met_value * user_weight_kg * duration_hours
        
        result = {
            "calories_burned": round(calories_burned, 1),
            "met_value": met_value,
            "duration_hours": round(duration_hours, 2),
            "weight_kg": user_weight_kg,
            "workout_title": workout_title,
            "matched_keywords": self._get_matched_keywords(workout_title)
        }
        
        logger.info(f"Calculated {calories_burned:.1f} calories for '{workout_title}' "
                   f"({duration_minutes}min, MET: {met_value}, Weight: {user_weight_kg}kg)")
        
        return result
    
    def _get_met_value(self, workout_title: str) -> float:
        """Get MET value for a workout based on its title."""
        if not workout_title:
            return 4.0  # Default moderate intensity
        
        title_lower = workout_title.lower()
        
        # Check for exact matches first
        for keyword, met_value in self.MET_VALUES.items():
            if keyword in title_lower:
                return met_value
        
        # Check for partial matches and patterns
        if any(word in title_lower for word in ["cardio", "aerobic", "endurance"]):
            return 6.0
        elif any(word in title_lower for word in ["strength", "weight", "resistance", "muscle"]):
            return 4.0
        elif any(word in title_lower for word in ["flexibility", "mobility", "stretch"]):
            return 2.5
        elif any(word in title_lower for word in ["beginner", "easy", "light"]):
            return 3.0
        elif any(word in title_lower for word in ["advanced", "intense", "hard", "heavy"]):
            return 6.0
        elif any(word in title_lower for word in ["workout", "exercise", "training"]):
            return 4.0  # Default moderate intensity
        
        # Default moderate intensity
        return 4.0
    
    def _get_matched_keywords(self, workout_title: str) -> list:
        """Get list of matched keywords from the workout title."""
        if not workout_title:
            return []
        
        title_lower = workout_title.lower()
        matched = []
        
        for keyword in self.MET_VALUES.keys():
            if keyword in title_lower:
                matched.append(keyword)
        
        return matched
    
    def get_exercise_suggestions(self, partial_name: str) -> list:
        """Get exercise suggestions based on partial name."""
        if not partial_name:
            return []
        
        partial_lower = partial_name.lower()
        suggestions = []
        
        for exercise in self.MET_VALUES.keys():
            if partial_lower in exercise.lower():
                suggestions.append(exercise)
        
        return suggestions[:10]  # Return top 10 matches

# Global instance
calorie_service = CalorieService()
