import redis
import json
import logging
import os
from typing import Any, Optional, Union
from datetime import timedelta

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "redis")
        self.port = int(os.getenv("REDIS_PORT", "6379"))
        self.db = int(os.getenv("REDIS_DB", "0"))
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Establish Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        try:
            if self.redis_client:
                self.redis_client.ping()
                return True
        except Exception:
            pass
        return False
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a key-value pair in Redis"""
        try:
            if not self.is_connected():
                self._connect()
                if not self.is_connected():
                    return False
            
            # Serialize value to JSON if it's not a string
            if not isinstance(value, str):
                value = json.dumps(value)
            
            if expire:
                self.redis_client.setex(key, expire, value)
            else:
                self.redis_client.set(key, value)
            
            logger.debug(f"Set Redis key: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set Redis key {key}: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from Redis"""
        try:
            if not self.is_connected():
                self._connect()
                if not self.is_connected():
                    return None
            
            value = self.redis_client.get(key)
            if value is None:
                return None
            
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
                
        except Exception as e:
            logger.error(f"Failed to get Redis key {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key from Redis"""
        try:
            if not self.is_connected():
                self._connect()
                if not self.is_connected():
                    return False
            
            result = self.redis_client.delete(key)
            logger.debug(f"Deleted Redis key: {key}")
            return result > 0
            
        except Exception as e:
            logger.error(f"Failed to delete Redis key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if a key exists in Redis"""
        try:
            if not self.is_connected():
                self._connect()
                if not self.is_connected():
                    return False
            
            return self.redis_client.exists(key) > 0
            
        except Exception as e:
            logger.error(f"Failed to check Redis key existence {key}: {e}")
            return False
    
    def set_workout_cache(self, user_id: int, workout_data: dict, expire_hours: int = 24) -> bool:
        """Cache workout data for a user"""
        key = f"workout:user:{user_id}:latest"
        return self.set(key, workout_data, expire_hours * 3600)
    
    def get_workout_cache(self, user_id: int) -> Optional[dict]:
        """Get cached workout data for a user"""
        key = f"workout:user:{user_id}:latest"
        return self.get(key)
    
    def set_user_metrics(self, user_id: int, metrics: dict, expire_hours: int = 6) -> bool:
        """Cache user fitness metrics"""
        key = f"metrics:user:{user_id}"
        return self.set(key, metrics, expire_hours * 3600)
    
    def get_user_metrics(self, user_id: int) -> Optional[dict]:
        """Get cached user fitness metrics"""
        key = f"metrics:user:{user_id}"
        return self.get(key)
    
    def set_progress_calculation(self, user_id: int, period: str, calculation: dict, expire_hours: int = 12) -> bool:
        """Cache progress calculation results"""
        key = f"progress:user:{user_id}:{period}"
        return self.set(key, calculation, expire_hours * 3600)
    
    def get_progress_calculation(self, user_id: int, period: str) -> Optional[dict]:
        """Get cached progress calculation results"""
        key = f"progress:user:{user_id}:{period}"
        return self.get(key)
    
    def invalidate_user_cache(self, user_id: int) -> bool:
        """Invalidate all cache entries for a user"""
        try:
            if not self.is_connected():
                self._connect()
                if not self.is_connected():
                    return False
            
            # Get all keys for the user
            pattern = f"*:user:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries for user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate user cache {user_id}: {e}")
            return False

# Global instance
redis_service = RedisService()
