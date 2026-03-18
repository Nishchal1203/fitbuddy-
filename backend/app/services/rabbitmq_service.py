import pika
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class RabbitMQService:
    def __init__(self):
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.username = os.getenv("RABBITMQ_USER", "fitbuddy")
        self.password = os.getenv("RABBITMQ_PASSWORD", "fitbuddy123")
        self.virtual_host = "/"
        
    def get_connection_params(self) -> pika.ConnectionParameters:
        """Get RabbitMQ connection parameters"""
        credentials = pika.PlainCredentials(self.username, self.password)
        return pika.ConnectionParameters(
            host=self.host,
            port=self.port,
            virtual_host=self.virtual_host,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
    
    @contextmanager
    def get_connection(self):
        """Context manager for RabbitMQ connection"""
        connection = None
        try:
            connection = pika.BlockingConnection(self.get_connection_params())
            yield connection
        except Exception as e:
            logger.error(f"RabbitMQ connection error: {e}")
            raise
        finally:
            if connection and not connection.is_closed:
                connection.close()
    
    def publish_message(self, exchange: str, routing_key: str, message: Dict[str, Any]) -> bool:
        """Publish a message to RabbitMQ"""
        try:
            with self.get_connection() as connection:
                channel = connection.channel()
                
                # Declare exchange
                channel.exchange_declare(
                    exchange=exchange,
                    exchange_type='topic',
                    durable=True
                )
                
                # Publish message
                channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=json.dumps(message),
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # Make message persistent
                        content_type='application/json'
                    )
                )
                
                logger.info(f"Message published to {exchange} with routing key {routing_key}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
            return False
    
    def publish_workout_processing(self, workout_id: int, user_id: int) -> bool:
        """Publish workout processing message"""
        message = {
            "workout_id": workout_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "type": "workout_processing"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="workout.processing.new",
            message=message
        )
    
    def publish_progress_analysis(self, user_id: int, analysis_type: str, period: str) -> bool:
        """Publish progress analysis message"""
        message = {
            "user_id": user_id,
            "analysis_type": analysis_type,  # "weekly" or "monthly"
            "period": period,
            "timestamp": datetime.now().isoformat(),
            "type": "progress_analysis"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="progress.analysis.request",
            message=message
        )
    
    def publish_report_generation(self, user_id: int, report_type: str) -> bool:
        """Publish report generation message"""
        message = {
            "user_id": user_id,
            "report_type": report_type,  # "weekly", "monthly", "goal_progress"
            "timestamp": datetime.now().isoformat(),
            "type": "report_generation"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="report.generation.request",
            message=message
        )
    
    def publish_goal_reminder(self, user_id: int, goal_id: int, reminder_type: str) -> bool:
        """Publish goal reminder message"""
        message = {
            "user_id": user_id,
            "goal_id": goal_id,
            "reminder_type": reminder_type,  # "deadline_approaching", "deadline_passed"
            "timestamp": datetime.now().isoformat(),
            "type": "goal_reminder"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="goal.reminder.send",
            message=message
        )
    
    def publish_plan_generation(self, user_id: int, goal_id: int = None) -> bool:
        """Publish plan generation message"""
        message = {
            "user_id": user_id,
            "goal_id": goal_id,
            "timestamp": datetime.now().isoformat(),
            "type": "plan_generation"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="plan.generation.request",
            message=message
        )
    
    def publish_batch_processing(self, user_id: int, start_date: str, end_date: str) -> bool:
        """Publish batch processing message"""
        message = {
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date,
            "timestamp": datetime.now().isoformat(),
            "type": "batch_processing"
        }
        return self.publish_message(
            exchange="fitness.exchange",
            routing_key="batch.processing.request",
            message=message
        )

# Global instance
rabbitmq_service = RabbitMQService()
