from celery import Celery
import os
from kombu import Queue

# Celery configuration
CELERY_BROKER_URL = os.getenv("RABBITMQ_URL", "amqp://fitbuddy:fitbuddy123@rabbitmq:5672/")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Create Celery app
celery_app = Celery(
    "fitbuddy_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "celery_worker.tasks.workout_tasks",
        "celery_worker.tasks.progress_tasks", 
        "celery_worker.tasks.report_tasks",
        "celery_worker.tasks.goal_tasks",
        "celery_worker.tasks.batch_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        'celery_worker.tasks.workout_tasks.*': {'queue': 'workout.processing.queue'},
        'celery_worker.tasks.progress_tasks.*': {'queue': 'progress.analysis.queue'},
        'celery_worker.tasks.report_tasks.*': {'queue': 'report.generation.queue'},
        'celery_worker.tasks.goal_tasks.*': {'queue': 'goal.reminder.queue'},
        'celery_worker.tasks.batch_tasks.*': {'queue': 'batch.processing.queue'},
    },
    
    # Queue configuration
    task_default_queue='default',
    task_queues=(
        Queue('workout.processing.queue', routing_key='workout.processing.*'),
        Queue('progress.analysis.queue', routing_key='progress.analysis.*'),
        Queue('report.generation.queue', routing_key='report.generation.*'),
        Queue('goal.reminder.queue', routing_key='goal.reminder.*'),
        Queue('batch.processing.queue', routing_key='batch.processing.*'),
        Queue('default'),
    ),
    
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task retry settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'weekly-progress-analysis': {
            'task': 'celery_worker.tasks.progress_tasks.analyze_weekly_progress_all_users',
            'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Every week
        },
        'monthly-progress-analysis': {
            'task': 'celery_worker.tasks.progress_tasks.analyze_monthly_progress_all_users',
            'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Every month
        },
        'goal-deadline-check': {
            'task': 'celery_worker.tasks.goal_tasks.check_goal_deadlines',
            'schedule': 60.0 * 60.0 * 24.0,  # Daily
        },
        'generate-weekly-reports': {
            'task': 'celery_worker.tasks.report_tasks.generate_weekly_reports_all_users',
            'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Every week
        },
        'generate-monthly-reports': {
            'task': 'celery_worker.tasks.report_tasks.generate_monthly_reports_all_users',
            'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Every month
        },
    },
)

if __name__ == '__main__':
    celery_app.start()
