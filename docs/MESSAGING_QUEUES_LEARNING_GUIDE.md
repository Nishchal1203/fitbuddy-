# Messaging Queues & Asynchronous Processing - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to Messaging Systems](#introduction-to-messaging-systems)
2. [RabbitMQ Fundamentals](#rabbitmq-fundamentals)
3. [Redis for Caching & Pub/Sub](#redis-for-caching--pubsub)
4. [Celery for Background Tasks](#celery-for-background-tasks)
5. [Integration Patterns](#integration-patterns)
6. [Error Handling & Retry Logic](#error-handling--retry-logic)
7. [Monitoring & Observability](#monitoring--observability)
8. [Performance Optimization](#performance-optimization)
9. [Testing Messaging Systems](#testing-messaging-systems)
10. [Production Deployment](#production-deployment)

## Introduction to Messaging Systems

### What are Messaging Systems?
Messaging systems enable asynchronous communication between different parts of an application or between different applications. They provide a way to decouple components, improve scalability, and handle high-volume data processing.

### Key Concepts
- **Message**: A unit of data sent between applications
- **Queue**: A buffer that stores messages until they are processed
- **Producer**: Application that sends messages
- **Consumer**: Application that receives and processes messages
- **Broker**: Middleware that manages message routing and delivery

### Benefits for FitBuddy
- **Asynchronous Processing**: Handle time-consuming tasks without blocking users
- **Scalability**: Scale different components independently
- **Reliability**: Ensure message delivery and processing
- **Decoupling**: Loose coupling between services
- **Performance**: Improve application responsiveness

## RabbitMQ Fundamentals

### 1. RabbitMQ Service Implementation (`app/services/rabbitmq_service.py`)

```python
import pika
import json
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class RabbitMQService:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.url = settings.RABBITMQ_URL
        self.connect()

    def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            parameters = pika.URLParameters(self.url)
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Declare exchanges and queues
            self._declare_exchanges()
            self._declare_queues()
            
            logger.info("Successfully connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise

    def _declare_exchanges(self):
        """Declare RabbitMQ exchanges"""
        # Main exchange for general messages
        self.channel.exchange_declare(
            exchange='fitbuddy.main',
            exchange_type='topic',
            durable=True
        )
        
        # Exchange for workout-related messages
        self.channel.exchange_declare(
            exchange='fitbuddy.workouts',
            exchange_type='topic',
            durable=True
        )
        
        # Exchange for goal-related messages
        self.channel.exchange_declare(
            exchange='fitbuddy.goals',
            exchange_type='topic',
            durable=True
        )
        
        # Exchange for analytics messages
        self.channel.exchange_declare(
            exchange='fitbuddy.analytics',
            exchange_type='topic',
            durable=True
        )

    def _declare_queues(self):
        """Declare RabbitMQ queues"""
        # Workout processing queues
        self.channel.queue_declare(queue='workout.processing', durable=True)
        self.channel.queue_declare(queue='workout.notifications', durable=True)
        
        # Goal processing queues
        self.channel.queue_declare(queue='goal.processing', durable=True)
        self.channel.queue_declare(queue='goal.notifications', durable=True)
        
        # Analytics queues
        self.channel.queue_declare(queue='analytics.calorie_calculation', durable=True)
        self.channel.queue_declare(queue='analytics.report_generation', durable=True)
        
        # Dead letter queue for failed messages
        self.channel.queue_declare(queue='fitbuddy.dlq', durable=True)

    def publish_message(self, exchange: str, routing_key: str, message: Dict[str, Any]) -> bool:
        """Publish a message to RabbitMQ"""
        try:
            message_body = json.dumps(message)
            
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    content_type='application/json',
                    timestamp=int(time.time())
                )
            )
            
            logger.info(f"Published message to {exchange}:{routing_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
            return False

    def consume_messages(self, queue: str, callback, auto_ack: bool = False):
        """Consume messages from a queue"""
        try:
            def message_handler(ch, method, properties, body):
                try:
                    message = json.loads(body)
                    callback(message)
                    
                    if not auto_ack:
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                        
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    if not auto_ack:
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            self.channel.basic_consume(
                queue=queue,
                on_message_callback=message_handler,
                auto_ack=auto_ack
            )
            
            logger.info(f"Started consuming messages from queue: {queue}")
            self.channel.start_consuming()
            
        except Exception as e:
            logger.error(f"Failed to consume messages: {e}")
            raise

    def stop_consuming(self):
        """Stop consuming messages"""
        if self.channel and self.channel.is_consuming:
            self.channel.stop_consuming()

    def close_connection(self):
        """Close RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()

# Global instance
rabbitmq_service = RabbitMQService()
```

### 2. Message Publishing Examples

```python
# Publishing workout completion message
def publish_workout_completion(workout_id: int, user_id: int, calories_burned: float):
    message = {
        "event_type": "workout_completed",
        "workout_id": workout_id,
        "user_id": user_id,
        "calories_burned": calories_burned,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    rabbitmq_service.publish_message(
        exchange='fitbuddy.workouts',
        routing_key='workout.completed',
        message=message
    )

# Publishing goal achievement message
def publish_goal_achievement(goal_id: int, user_id: int, achievement_data: dict):
    message = {
        "event_type": "goal_achieved",
        "goal_id": goal_id,
        "user_id": user_id,
        "achievement_data": achievement_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    rabbitmq_service.publish_message(
        exchange='fitbuddy.goals',
        routing_key='goal.achieved',
        message=message
    )

# Publishing analytics request
def publish_calorie_calculation_request(workout_id: int, duration_minutes: int):
    message = {
        "event_type": "calorie_calculation_request",
        "workout_id": workout_id,
        "duration_minutes": duration_minutes,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    rabbitmq_service.publish_message(
        exchange='fitbuddy.analytics',
        routing_key='analytics.calorie_calculation',
        message=message
    )
```

## Redis for Caching & Pub/Sub

### 1. Redis Service Implementation (`app/services/redis_service.py`)

```python
import redis
import json
import logging
from typing import Any, Optional, Dict, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()

    async def set_cache(self, key: str, value: Any, expire: int = 3600) -> bool:
        """Set a value in Redis cache with expiration"""
        try:
            serialized_value = json.dumps(value)
            result = self.redis_client.setex(key, expire, serialized_value)
            logger.debug(f"Set cache for key: {key}")
            return bool(result)
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
            result = self.redis_client.delete(key)
            logger.debug(f"Deleted cache for key: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Error deleting cache for key {key}: {e}")
            return False

    async def get_multiple_cache(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from Redis cache"""
        try:
            values = self.redis_client.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value:
                    result[key] = json.loads(value)
            return result
        except Exception as e:
            logger.error(f"Error getting multiple cache values: {e}")
            return {}

    async def set_multiple_cache(self, data: Dict[str, Any], expire: int = 3600) -> bool:
        """Set multiple values in Redis cache"""
        try:
            pipe = self.redis_client.pipeline()
            for key, value in data.items():
                serialized_value = json.dumps(value)
                pipe.setex(key, expire, serialized_value)
            pipe.execute()
            logger.debug(f"Set multiple cache values: {list(data.keys())}")
            return True
        except Exception as e:
            logger.error(f"Error setting multiple cache values: {e}")
            return False

    # Pub/Sub functionality
    async def publish_message(self, channel: str, message: Dict[str, Any]) -> bool:
        """Publish a message to a Redis channel"""
        try:
            message_body = json.dumps(message)
            result = self.redis_client.publish(channel, message_body)
            logger.info(f"Published message to channel {channel}")
            return bool(result)
        except Exception as e:
            logger.error(f"Error publishing message to channel {channel}: {e}")
            return False

    async def subscribe_to_channel(self, channel: str, callback):
        """Subscribe to a Redis channel"""
        try:
            self.pubsub.subscribe(channel)
            logger.info(f"Subscribed to channel: {channel}")
            
            for message in self.pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        await callback(data)
                    except Exception as e:
                        logger.error(f"Error processing message from channel {channel}: {e}")
                        
        except Exception as e:
            logger.error(f"Error subscribing to channel {channel}: {e}")

    async def unsubscribe_from_channel(self, channel: str):
        """Unsubscribe from a Redis channel"""
        try:
            self.pubsub.unsubscribe(channel)
            logger.info(f"Unsubscribed from channel: {channel}")
        except Exception as e:
            logger.error(f"Error unsubscribing from channel {channel}: {e}")

    # Session management
    async def set_session(self, session_id: str, user_data: Dict[str, Any], expire: int = 86400) -> bool:
        """Set user session data"""
        key = f"session:{session_id}"
        return await self.set_cache(key, user_data, expire)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get user session data"""
        key = f"session:{session_id}"
        return await self.get_cache(key)

    async def delete_session(self, session_id: str) -> bool:
        """Delete user session"""
        key = f"session:{session_id}"
        return await self.delete_cache(key)

    # Rate limiting
    async def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if rate limit is exceeded"""
        try:
            current_count = self.redis_client.get(key)
            if current_count is None:
                self.redis_client.setex(key, window, 1)
                return True
            elif int(current_count) < limit:
                self.redis_client.incr(key)
                return True
            else:
                return False
        except Exception as e:
            logger.error(f"Error checking rate limit for key {key}: {e}")
            return True  # Allow request if Redis is down

# Global instance
redis_service = RedisService()
```

### 2. Redis Caching Patterns

```python
# Cache decorator for API responses
def cache_response(expire: int = 3600):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache first
            cached_result = await redis_service.get_cache(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await redis_service.set_cache(cache_key, result, expire)
            logger.debug(f"Cached result for key: {cache_key}")
            
            return result
        return wrapper
    return decorator

# Usage example
@cache_response(expire=1800)  # Cache for 30 minutes
async def get_user_workouts(user_id: int, limit: int = 10):
    # Expensive database query
    workouts = await get_workouts_from_db(user_id, limit)
    return workouts

# Cache invalidation
async def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    pattern = f"get_user_workouts:*{user_id}*"
    keys = redis_service.redis_client.keys(pattern)
    if keys:
        redis_service.redis_client.delete(*keys)
        logger.info(f"Invalidated {len(keys)} cache entries for user {user_id}")
```

## Celery for Background Tasks

### 1. Celery Configuration (`celery_worker/celery_app.py`)

```python
from celery import Celery
from celery.schedules import crontab
import os

# Celery configuration
CELERY_BROKER_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://redis:6379')

# Create Celery instance
celery_app = Celery(
    'fitbuddy',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        'celery_worker.tasks.workout_tasks',
        'celery_worker.tasks.goal_tasks',
        'celery_worker.tasks.progress_tasks',
        'celery_worker.tasks.report_tasks',
        'celery_worker.tasks.batch_tasks'
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    result_expires=3600,  # 1 hour
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    task_store_eager_result=True,
    task_always_eager=False,
    task_eager_propagates=True,
    task_send_sent_event=True,
    worker_send_task_events=True,
    task_send_sent_event=True,
    worker_hijack_root_logger=False,
    worker_log_color=False,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    task_routes={
        'celery_worker.tasks.workout_tasks.*': {'queue': 'workout_queue'},
        'celery_worker.tasks.goal_tasks.*': {'queue': 'goal_queue'},
        'celery_worker.tasks.progress_tasks.*': {'queue': 'progress_queue'},
        'celery_worker.tasks.report_tasks.*': {'queue': 'report_queue'},
        'celery_worker.tasks.batch_tasks.*': {'queue': 'batch_queue'},
    },
    beat_schedule={
        'daily-report-generation': {
            'task': 'celery_worker.tasks.report_tasks.generate_daily_reports',
            'schedule': crontab(hour=6, minute=0),  # Run at 6 AM daily
        },
        'weekly-analytics': {
            'task': 'celery_worker.tasks.batch_tasks.generate_weekly_analytics',
            'schedule': crontab(hour=2, minute=0, day_of_week=1),  # Run Monday at 2 AM
        },
        'cleanup-old-data': {
            'task': 'celery_worker.tasks.batch_tasks.cleanup_old_data',
            'schedule': crontab(hour=3, minute=0, day_of_month=1),  # Run 1st of month at 3 AM
        },
    }
)

# Task result backend configuration
celery_app.conf.result_backend_transport_options = {
    'master_name': 'mymaster',
    'visibility_timeout': 3600,
}

if __name__ == '__main__':
    celery_app.start()
```

### 2. Workout Tasks (`celery_worker/tasks/workout_tasks.py`)

```python
from celery import current_task
from celery_worker.celery_app import celery_app
from app.services.analytics_service import analytics_client
from app.services.redis_service import redis_service
from app.db.session import SessionLocal
from app.models.workout import WorkoutSession
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='workout_tasks.process_workout_completion')
def process_workout_completion(self, workout_id: int, user_id: int, duration_minutes: int):
    """Process workout completion and calculate calories"""
    try:
        logger.info(f"Processing workout completion for workout {workout_id}")
        
        # Update task progress
        self.update_state(state='PROGRESS', meta={'current': 0, 'total': 100, 'status': 'Starting'})
        
        # Calculate calories using analytics service
        self.update_state(state='PROGRESS', meta={'current': 25, 'total': 100, 'status': 'Calculating calories'})
        
        calories = analytics_client.calculate_calories(workout_id, duration_minutes)
        
        if calories is not None:
            # Update database
            self.update_state(state='PROGRESS', meta={'current': 50, 'total': 100, 'status': 'Updating database'})
            
            db = SessionLocal()
            try:
                workout = db.get(WorkoutSession, workout_id)
                if workout:
                    workout.calories_burned = calories
                    db.add(workout)
                    db.commit()
                    
                    # Update cache
                    self.update_state(state='PROGRESS', meta={'current': 75, 'total': 100, 'status': 'Updating cache'})
                    
                    cache_key = f"user_workouts:{user_id}"
                    redis_service.delete_cache(cache_key)
                    
                    # Send notification
                    self.update_state(state='PROGRESS', meta={'current': 90, 'total': 100, 'status': 'Sending notification'})
                    
                    send_workout_completion_notification.delay(user_id, workout_id, calories)
                    
                    logger.info(f"Successfully processed workout {workout_id} with {calories} calories")
                    
                    return {
                        'status': 'success',
                        'workout_id': workout_id,
                        'calories_burned': calories,
                        'message': 'Workout processed successfully'
                    }
                else:
                    logger.error(f"Workout {workout_id} not found")
                    return {'status': 'error', 'message': 'Workout not found'}
                    
            finally:
                db.close()
        else:
            logger.error(f"Failed to calculate calories for workout {workout_id}")
            return {'status': 'error', 'message': 'Failed to calculate calories'}
            
    except Exception as e:
        logger.error(f"Error processing workout completion: {e}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise

@celery_app.task(name='workout_tasks.send_workout_completion_notification')
def send_workout_completion_notification(user_id: int, workout_id: int, calories_burned: float):
    """Send notification about workout completion"""
    try:
        logger.info(f"Sending workout completion notification for user {user_id}")
        
        # Here you would integrate with notification service
        # For now, we'll just log the notification
        
        notification_data = {
            'user_id': user_id,
            'workout_id': workout_id,
            'calories_burned': calories_burned,
            'message': f'Great job! You burned {calories_burned:.0f} calories in your workout.',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Publish to Redis for real-time notifications
        redis_service.publish_message(f'user_notifications:{user_id}', notification_data)
        
        logger.info(f"Notification sent for workout {workout_id}")
        
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise

@celery_app.task(name='workout_tasks.generate_workout_summary')
def generate_workout_summary(user_id: int, date_range: dict):
    """Generate workout summary for a user"""
    try:
        logger.info(f"Generating workout summary for user {user_id}")
        
        db = SessionLocal()
        try:
            # Get workouts for date range
            start_date = date_range['start_date']
            end_date = date_range['end_date']
            
            workouts = db.query(WorkoutSession).filter(
                WorkoutSession.owner_id == user_id,
                WorkoutSession.performed_at.between(start_date, end_date)
            ).all()
            
            # Calculate summary statistics
            total_workouts = len(workouts)
            total_duration = sum(w.duration_minutes or 0 for w in workouts)
            total_calories = sum(w.calories_burned or 0 for w in workouts)
            avg_duration = total_duration / total_workouts if total_workouts > 0 else 0
            avg_calories = total_calories / total_workouts if total_workouts > 0 else 0
            
            summary = {
                'user_id': user_id,
                'date_range': date_range,
                'total_workouts': total_workouts,
                'total_duration_minutes': total_duration,
                'total_calories_burned': total_calories,
                'average_duration_minutes': avg_duration,
                'average_calories_per_workout': avg_calories,
                'generated_at': datetime.utcnow().isoformat()
            }
            
            # Cache the summary
            cache_key = f"workout_summary:{user_id}:{start_date}:{end_date}"
            redis_service.set_cache(cache_key, summary, expire=3600)
            
            logger.info(f"Generated workout summary for user {user_id}")
            return summary
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error generating workout summary: {e}")
        raise
```

### 3. Goal Tasks (`celery_worker/tasks/goal_tasks.py`)

```python
from celery_worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.goal import Goal
from app.models.progress import ProgressEntry
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name='goal_tasks.check_goal_progress')
def check_goal_progress(goal_id: int):
    """Check progress towards a specific goal"""
    try:
        logger.info(f"Checking progress for goal {goal_id}")
        
        db = SessionLocal()
        try:
            goal = db.get(Goal, goal_id)
            if not goal:
                logger.error(f"Goal {goal_id} not found")
                return {'status': 'error', 'message': 'Goal not found'}
            
            # Get recent progress entries
            progress_entries = db.query(ProgressEntry).filter(
                ProgressEntry.goal_id == goal_id
            ).order_by(ProgressEntry.recorded_at.desc()).limit(10).all()
            
            if not progress_entries:
                logger.info(f"No progress entries found for goal {goal_id}")
                return {'status': 'success', 'message': 'No progress entries found'}
            
            # Calculate progress
            latest_progress = progress_entries[0]
            progress_percentage = (latest_progress.value / goal.target_value) * 100
            
            # Check if goal is achieved
            is_achieved = latest_progress.value >= goal.target_value
            
            result = {
                'goal_id': goal_id,
                'current_value': latest_progress.value,
                'target_value': goal.target_value,
                'progress_percentage': progress_percentage,
                'is_achieved': is_achieved,
                'last_updated': latest_progress.recorded_at.isoformat()
            }
            
            # If goal is achieved, send notification
            if is_achieved and not goal.is_completed:
                send_goal_achievement_notification.delay(goal_id, goal.owner_id)
                
                # Mark goal as completed
                goal.is_completed = True
                goal.completed_at = datetime.utcnow()
                db.add(goal)
                db.commit()
            
            logger.info(f"Goal {goal_id} progress checked: {progress_percentage:.1f}%")
            return result
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error checking goal progress: {e}")
        raise

@celery_app.task(name='goal_tasks.send_goal_achievement_notification')
def send_goal_achievement_notification(goal_id: int, user_id: int):
    """Send notification when a goal is achieved"""
    try:
        logger.info(f"Sending goal achievement notification for goal {goal_id}")
        
        db = SessionLocal()
        try:
            goal = db.get(Goal, goal_id)
            if not goal:
                logger.error(f"Goal {goal_id} not found")
                return
            
            notification_data = {
                'user_id': user_id,
                'goal_id': goal_id,
                'goal_title': goal.title,
                'message': f'Congratulations! You achieved your goal: {goal.title}',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Publish to Redis for real-time notifications
            redis_service.publish_message(f'user_notifications:{user_id}', notification_data)
            
            logger.info(f"Goal achievement notification sent for goal {goal_id}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error sending goal achievement notification: {e}")
        raise

@celery_app.task(name='goal_tasks.generate_goal_recommendations')
def generate_goal_recommendations(user_id: int):
    """Generate personalized goal recommendations for a user"""
    try:
        logger.info(f"Generating goal recommendations for user {user_id}")
        
        db = SessionLocal()
        try:
            # Get user's recent activity
            recent_workouts = db.query(WorkoutSession).filter(
                WorkoutSession.owner_id == user_id
            ).order_by(WorkoutSession.performed_at.desc()).limit(10).all()
            
            # Get user's current goals
            current_goals = db.query(Goal).filter(
                Goal.owner_id == user_id,
                Goal.is_completed == False
            ).all()
            
            # Analyze patterns and generate recommendations
            recommendations = []
            
            # Analyze workout frequency
            if len(recent_workouts) < 3:
                recommendations.append({
                    'type': 'frequency',
                    'title': 'Increase Workout Frequency',
                    'description': 'Try to work out at least 3 times per week',
                    'priority': 'high'
                })
            
            # Analyze workout types
            workout_types = [w.title.lower() for w in recent_workouts]
            if not any('cardio' in wt for wt in workout_types):
                recommendations.append({
                    'type': 'variety',
                    'title': 'Add Cardio Workouts',
                    'description': 'Include cardio exercises for better cardiovascular health',
                    'priority': 'medium'
                })
            
            # Analyze goal completion
            completed_goals = db.query(Goal).filter(
                Goal.owner_id == user_id,
                Goal.is_completed == True
            ).count()
            
            if completed_goals > 0:
                recommendations.append({
                    'type': 'achievement',
                    'title': 'Set New Goals',
                    'description': f'You\'ve completed {completed_goals} goals! Set new ones to keep progressing',
                    'priority': 'medium'
                })
            
            result = {
                'user_id': user_id,
                'recommendations': recommendations,
                'generated_at': datetime.utcnow().isoformat()
            }
            
            # Cache recommendations
            cache_key = f"goal_recommendations:{user_id}"
            redis_service.set_cache(cache_key, result, expire=86400)  # Cache for 24 hours
            
            logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            return result
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error generating goal recommendations: {e}")
        raise
```

## Integration Patterns

### 1. Event-Driven Architecture

```python
# Event publisher
class EventPublisher:
    def __init__(self):
        self.rabbitmq_service = rabbitmq_service
        self.redis_service = redis_service
    
    async def publish_workout_event(self, event_type: str, workout_data: dict):
        """Publish workout-related events"""
        event = {
            'event_type': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': workout_data
        }
        
        # Publish to RabbitMQ for reliable processing
        self.rabbitmq_service.publish_message(
            exchange='fitbuddy.workouts',
            routing_key=f'workout.{event_type}',
            message=event
        )
        
        # Publish to Redis for real-time updates
        await self.redis_service.publish_message(
            channel=f'workout_events:{workout_data["user_id"]}',
            message=event
        )

# Event handler
class EventHandler:
    def __init__(self):
        self.redis_service = redis_service
    
    async def handle_workout_completion(self, event_data: dict):
        """Handle workout completion event"""
        workout_id = event_data['data']['workout_id']
        user_id = event_data['data']['user_id']
        
        # Trigger background task
        process_workout_completion.delay(workout_id, user_id, event_data['data']['duration_minutes'])
        
        # Update real-time dashboard
        await self.update_user_dashboard(user_id)
    
    async def update_user_dashboard(self, user_id: int):
        """Update user dashboard with latest data"""
        # Get latest workout data
        latest_workouts = await get_user_recent_workouts(user_id)
        
        # Publish dashboard update
        await self.redis_service.publish_message(
            channel=f'dashboard_updates:{user_id}',
            message={'type': 'workout_update', 'data': latest_workouts}
        )
```

### 2. Message Queue Patterns

```python
# Request-Reply Pattern
@celery_app.task(name='analytics_tasks.calculate_calories_request')
def calculate_calories_request(workout_id: int, duration_minutes: int):
    """Handle calorie calculation request"""
    try:
        # Calculate calories
        calories = analytics_client.calculate_calories(workout_id, duration_minutes)
        
        # Send reply
        reply_data = {
            'workout_id': workout_id,
            'calories_burned': calories,
            'status': 'success'
        }
        
        # Publish reply to specific channel
        redis_service.publish_message(f'calorie_calculation_reply:{workout_id}', reply_data)
        
        return reply_data
        
    except Exception as e:
        error_reply = {
            'workout_id': workout_id,
            'error': str(e),
            'status': 'error'
        }
        
        redis_service.publish_message(f'calorie_calculation_reply:{workout_id}', error_reply)
        raise

# Publish-Subscribe Pattern
class NotificationService:
    def __init__(self):
        self.redis_service = redis_service
    
    async def subscribe_to_user_notifications(self, user_id: int, callback):
        """Subscribe to user-specific notifications"""
        channel = f'user_notifications:{user_id}'
        await self.redis_service.subscribe_to_channel(channel, callback)
    
    async def send_notification(self, user_id: int, notification: dict):
        """Send notification to user"""
        await self.redis_service.publish_message(
            channel=f'user_notifications:{user_id}',
            message=notification
        )

# Dead Letter Queue Pattern
@celery_app.task(bind=True, name='error_handling.handle_failed_message')
def handle_failed_message(self, message_data: dict, error: str):
    """Handle messages that failed processing"""
    try:
        logger.error(f"Processing failed message: {error}")
        
        # Log the failure
        failure_log = {
            'message_data': message_data,
            'error': error,
            'failed_at': datetime.utcnow().isoformat(),
            'retry_count': self.request.retries
        }
        
        # Store in dead letter queue
        rabbitmq_service.publish_message(
            exchange='fitbuddy.main',
            routing_key='fitbuddy.dlq',
            message=failure_log
        )
        
        # Send alert to administrators
        send_admin_alert.delay(failure_log)
        
    except Exception as e:
        logger.error(f"Error handling failed message: {e}")
        raise
```

## Error Handling & Retry Logic

### 1. Retry Configuration

```python
from celery.exceptions import Retry

@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def process_with_retry(self, data: dict):
    """Task with automatic retry logic"""
    try:
        # Process data
        result = process_data(data)
        return result
        
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        
        # Check if we should retry
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60, exc=exc)
        else:
            logger.error(f"Task failed after {self.max_retries} retries")
            # Send to dead letter queue
            handle_failed_message.delay(data, str(exc))
            raise

# Custom retry logic
@celery_app.task(bind=True)
def process_with_custom_retry(self, data: dict):
    """Task with custom retry logic"""
    try:
        result = process_data(data)
        return result
        
    except ConnectionError as exc:
        # Retry immediately for connection errors
        logger.warning(f"Connection error, retrying immediately: {exc}")
        raise self.retry(countdown=5, exc=exc)
        
    except ValidationError as exc:
        # Don't retry validation errors
        logger.error(f"Validation error, not retrying: {exc}")
        raise
        
    except Exception as exc:
        # Retry with exponential backoff for other errors
        retry_countdown = 60 * (2 ** self.request.retries)  # Exponential backoff
        logger.error(f"Unexpected error, retrying in {retry_countdown}s: {exc}")
        raise self.retry(countdown=retry_countdown, exc=exc)
```

### 2. Circuit Breaker Pattern

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise e
    
    def on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage with Celery tasks
analytics_circuit_breaker = CircuitBreaker(failure_threshold=3, timeout=300)

@celery_app.task(bind=True)
def process_with_circuit_breaker(self, data: dict):
    """Task with circuit breaker protection"""
    try:
        result = analytics_circuit_breaker.call(process_analytics_data, data)
        return result
    except Exception as e:
        logger.error(f"Circuit breaker prevented execution: {e}")
        raise
```

## Monitoring & Observability

### 1. Task Monitoring

```python
from celery.events import EventReceiver
from celery.events.state import State

class TaskMonitor:
    def __init__(self):
        self.state = State()
        self.receiver = EventReceiver(celery_app, handlers={'*': self.state.event})
    
    def start_monitoring(self):
        """Start monitoring Celery tasks"""
        self.receiver.start()
    
    def get_task_stats(self):
        """Get task statistics"""
        return {
            'active_tasks': len(self.state.active_tasks),
            'completed_tasks': len(self.state.tasks),
            'failed_tasks': len([t for t in self.state.tasks.values() if t.state == 'FAILURE']),
            'pending_tasks': len([t for t in self.state.tasks.values() if t.state == 'PENDING'])
        }
    
    def get_worker_stats(self):
        """Get worker statistics"""
        return {
            'active_workers': len(self.state.workers),
            'worker_info': {name: worker.info() for name, worker in self.state.workers.items()}
        }

# Health check endpoint
@celery_app.task(name='monitoring.health_check')
def health_check():
    """Comprehensive health check"""
    try:
        # Check RabbitMQ connection
        rabbitmq_healthy = rabbitmq_service.connection.is_open
        
        # Check Redis connection
        redis_healthy = redis_service.redis_client.ping()
        
        # Check database connection
        db = SessionLocal()
        db_healthy = True
        try:
            db.execute("SELECT 1")
        except Exception:
            db_healthy = False
        finally:
            db.close()
        
        health_status = {
            'status': 'healthy' if all([rabbitmq_healthy, redis_healthy, db_healthy]) else 'unhealthy',
            'components': {
                'rabbitmq': 'healthy' if rabbitmq_healthy else 'unhealthy',
                'redis': 'healthy' if redis_healthy else 'unhealthy',
                'database': 'healthy' if db_healthy else 'unhealthy'
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
```

### 2. Metrics Collection

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Metrics
task_counter = Counter('celery_tasks_total', 'Total number of tasks', ['task_name', 'status'])
task_duration = Histogram('celery_task_duration_seconds', 'Task duration in seconds', ['task_name'])
active_tasks = Gauge('celery_active_tasks', 'Number of active tasks')
queue_length = Gauge('celery_queue_length', 'Queue length', ['queue_name'])

class MetricsCollector:
    def __init__(self):
        self.start_metrics_server()
    
    def start_metrics_server(self):
        """Start Prometheus metrics server"""
        start_http_server(8001)
    
    def record_task_start(self, task_name: str):
        """Record task start"""
        active_tasks.inc()
    
    def record_task_completion(self, task_name: str, duration: float, status: str):
        """Record task completion"""
        task_counter.labels(task_name=task_name, status=status).inc()
        task_duration.labels(task_name=task_name).observe(duration)
        active_tasks.dec()
    
    def update_queue_length(self, queue_name: str, length: int):
        """Update queue length metric"""
        queue_length.labels(queue_name=queue_name).set(length)

# Decorator for automatic metrics collection
def track_metrics(task_name: str):
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            metrics_collector.record_task_start(task_name)
            
            try:
                result = func(*args, **kwargs)
                metrics_collector.record_task_completion(task_name, time.time() - start_time, 'success')
                return result
            except Exception as e:
                metrics_collector.record_task_completion(task_name, time.time() - start_time, 'failure')
                raise
        return wrapper
    return decorator

# Usage
@celery_app.task(name='workout_tasks.process_workout_with_metrics')
@track_metrics('process_workout')
def process_workout_with_metrics(workout_id: int):
    """Process workout with metrics tracking"""
    # Task implementation
    pass
```

## Performance Optimization

### 1. Connection Pooling

```python
from celery import Celery
from kombu import Connection, Queue

# Configure connection pooling
celery_app.conf.update(
    broker_pool_limit=10,
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
        'retry_policy': {
            'timeout': 5.0
        }
    }
)

# Redis connection pooling
import redis.connection

class RedisPool:
    def __init__(self, max_connections=20):
        self.pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=max_connections,
            retry_on_timeout=True
        )
        self.redis_client = redis.Redis(connection_pool=self.pool)
    
    def get_client(self):
        return self.redis_client

redis_pool = RedisPool()
```

### 2. Batch Processing

```python
@celery_app.task(name='batch_tasks.process_workout_batch')
def process_workout_batch(workout_ids: list):
    """Process multiple workouts in batch"""
    try:
        logger.info(f"Processing batch of {len(workout_ids)} workouts")
        
        results = []
        for workout_id in workout_ids:
            try:
                result = process_single_workout(workout_id)
                results.append({'workout_id': workout_id, 'status': 'success', 'result': result})
            except Exception as e:
                results.append({'workout_id': workout_id, 'status': 'error', 'error': str(e)})
        
        # Update batch progress
        update_batch_progress.delay(len(workout_ids), len([r for r in results if r['status'] == 'success']))
        
        return results
        
    except Exception as e:
        logger.error(f"Error processing workout batch: {e}")
        raise

@celery_app.task(name='batch_tasks.update_batch_progress')
def update_batch_progress(total: int, completed: int):
    """Update batch processing progress"""
    progress = (completed / total) * 100
    
    # Publish progress update
    redis_service.publish_message('batch_progress', {
        'total': total,
        'completed': completed,
        'progress': progress,
        'timestamp': datetime.utcnow().isoformat()
    })
```

## Testing Messaging Systems

### 1. Unit Testing

```python
import pytest
from unittest.mock import Mock, patch
from celery_worker.tasks.workout_tasks import process_workout_completion

class TestWorkoutTasks:
    @pytest.fixture
    def mock_analytics_client(self):
        with patch('celery_worker.tasks.workout_tasks.analytics_client') as mock:
            yield mock
    
    @pytest.fixture
    def mock_db_session(self):
        with patch('celery_worker.tasks.workout_tasks.SessionLocal') as mock:
            yield mock
    
    def test_process_workout_completion_success(self, mock_analytics_client, mock_db_session):
        # Given
        workout_id = 1
        user_id = 1
        duration_minutes = 30
        expected_calories = 250.0
        
        mock_analytics_client.calculate_calories.return_value = expected_calories
        
        mock_db = Mock()
        mock_db_session.return_value.__enter__.return_value = mock_db
        
        mock_workout = Mock()
        mock_db.get.return_value = mock_workout
        
        # When
        result = process_workout_completion(workout_id, user_id, duration_minutes)
        
        # Then
        assert result['status'] == 'success'
        assert result['calories_burned'] == expected_calories
        mock_analytics_client.calculate_calories.assert_called_once_with(workout_id, duration_minutes)
        mock_db.commit.assert_called_once()
    
    def test_process_workout_completion_workout_not_found(self, mock_analytics_client, mock_db_session):
        # Given
        workout_id = 999
        user_id = 1
        duration_minutes = 30
        
        mock_db = Mock()
        mock_db_session.return_value.__enter__.return_value = mock_db
        mock_db.get.return_value = None
        
        # When
        result = process_workout_completion(workout_id, user_id, duration_minutes)
        
        # Then
        assert result['status'] == 'error'
        assert result['message'] == 'Workout not found'
```

### 2. Integration Testing

```python
import pytest
from celery import Celery
from celery.result import AsyncResult

class TestMessagingIntegration:
    @pytest.fixture
    def celery_app(self):
        return Celery('test', broker='memory://', backend='memory://')
    
    def test_workout_processing_integration(self, celery_app):
        # Given
        workout_data = {
            'workout_id': 1,
            'user_id': 1,
            'duration_minutes': 30
        }
        
        # When
        result = celery_app.send_task('workout_tasks.process_workout_completion', args=[1, 1, 30])
        
        # Then
        assert isinstance(result, AsyncResult)
        assert result.state in ['PENDING', 'SUCCESS', 'FAILURE']
    
    def test_message_publishing_integration(self):
        # Given
        test_message = {'test': 'data'}
        
        # When
        success = rabbitmq_service.publish_message('test.exchange', 'test.routing.key', test_message)
        
        # Then
        assert success is True
```

## Production Deployment

### 1. Docker Configuration

```dockerfile
# Celery Worker Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' celeryuser \
    && chown -R celeryuser:celeryuser /app
USER celeryuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD celery -A celery_worker.celery_app inspect ping || exit 1

# Run Celery worker
CMD ["celery", "-A", "celery_worker.celery_app", "worker", "--loglevel=info"]
```

### 2. Docker Compose Configuration

```yaml
version: '3.8'

services:
  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Celery Worker
  celery-worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=postgresql://fitbuddy:fitbuddy123@db:5432/fitbuddy
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped
    command: celery -A celery_worker.celery_app worker --loglevel=info --concurrency=4

  # Celery Beat Scheduler
  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=postgresql://fitbuddy:fitbuddy123@db:5432/fitbuddy
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped
    command: celery -A celery_worker.celery_app beat --loglevel=info

volumes:
  rabbitmq_data:
  redis_data:
```

### 3. Production Configuration

```python
# Production Celery configuration
CELERY_CONFIG = {
    'task_serializer': 'json',
    'accept_content': ['json'],
    'result_serializer': 'json',
    'timezone': 'UTC',
    'enable_utc': True,
    'task_track_started': True,
    'task_time_limit': 30 * 60,
    'task_soft_time_limit': 25 * 60,
    'worker_prefetch_multiplier': 1,
    'worker_max_tasks_per_child': 1000,
    'result_expires': 3600,
    'task_acks_late': True,
    'worker_disable_rate_limits': False,
    'task_reject_on_worker_lost': True,
    'task_ignore_result': False,
    'task_store_eager_result': True,
    'task_always_eager': False,
    'task_eager_propagates': True,
    'task_send_sent_event': True,
    'worker_send_task_events': True,
    'task_send_sent_event': True,
    'worker_hijack_root_logger': False,
    'worker_log_color': False,
    'worker_log_format': '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    'worker_task_log_format': '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    'broker_pool_limit': 10,
    'broker_connection_retry_on_startup': True,
    'broker_connection_retry': True,
    'broker_connection_max_retries': 10,
}
```

This comprehensive guide covers all aspects of messaging systems and asynchronous processing used in the FitBuddy project, from basic concepts to advanced patterns and production deployment.
