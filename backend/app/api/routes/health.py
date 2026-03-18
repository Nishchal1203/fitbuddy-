from fastapi import APIRouter, HTTPException
from app.services.rabbitmq_service import rabbitmq_service
from app.services.redis_service import redis_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "FitBuddy API"}

@router.get("/rabbitmq")
def rabbitmq_health():
    """Check RabbitMQ connectivity"""
    try:
        with rabbitmq_service.get_connection() as connection:
            if connection.is_open:
                return {
                    "status": "healthy",
                    "service": "RabbitMQ",
                    "host": rabbitmq_service.host,
                    "port": rabbitmq_service.port
                }
            else:
                raise HTTPException(status_code=503, detail="RabbitMQ connection is closed")
    except Exception as e:
        logger.error(f"RabbitMQ health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"RabbitMQ is unavailable: {str(e)}")

@router.get("/redis")
def redis_health():
    """Check Redis connectivity"""
    try:
        if redis_service.is_connected():
            return {
                "status": "healthy",
                "service": "Redis",
                "host": redis_service.host,
                "port": redis_service.port
            }
        else:
            raise HTTPException(status_code=503, detail="Redis is not connected")
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Redis is unavailable: {str(e)}")

@router.get("/infrastructure")
def infrastructure_health():
    """Check all infrastructure components"""
    rabbitmq_status = "healthy"
    redis_status = "healthy"
    
    # Check RabbitMQ
    try:
        with rabbitmq_service.get_connection() as connection:
            if not connection.is_open:
                rabbitmq_status = "unhealthy"
    except Exception:
        rabbitmq_status = "unhealthy"
    
    # Check Redis
    try:
        if not redis_service.is_connected():
            redis_status = "unhealthy"
    except Exception:
        redis_status = "unhealthy"
    
    overall_status = "healthy" if rabbitmq_status == "healthy" and redis_status == "healthy" else "degraded"
    
    return {
        "status": overall_status,
        "components": {
            "rabbitmq": rabbitmq_status,
            "redis": redis_status
        }
    }
