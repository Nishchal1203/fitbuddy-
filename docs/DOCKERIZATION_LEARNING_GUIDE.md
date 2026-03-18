# Docker & Containerization - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to Docker](#introduction-to-docker)
2. [Docker Fundamentals](#docker-fundamentals)
3. [Dockerfile Best Practices](#dockerfile-best-practices)
4. [Docker Compose](#docker-compose)
5. [Multi-Stage Builds](#multi-stage-builds)
6. [Container Orchestration](#container-orchestration)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Introduction to Docker

### What is Docker?
Docker is a containerization platform that allows you to package applications and their dependencies into lightweight, portable containers. Containers run consistently across different environments, solving the "it works on my machine" problem.

### Key Concepts
- **Container**: A lightweight, standalone executable package
- **Image**: A read-only template used to create containers
- **Dockerfile**: A text file with instructions to build an image
- **Registry**: A storage and distribution system for Docker images
- **Docker Compose**: A tool for defining and running multi-container applications

### Benefits for FitBuddy Project
- **Consistency**: Same environment across development, testing, and production
- **Scalability**: Easy to scale individual services
- **Isolation**: Each service runs in its own container
- **Portability**: Run anywhere Docker is installed
- **Resource Efficiency**: Containers share the host OS kernel

## Docker Fundamentals

### 1. Basic Docker Commands

```bash
# Build an image
docker build -t fitbuddy-backend .

# Run a container
docker run -p 8000:8000 fitbuddy-backend

# List running containers
docker ps

# List all containers
docker ps -a

# Stop a container
docker stop container_id

# Remove a container
docker rm container_id

# List images
docker images

# Remove an image
docker rmi image_id

# View container logs
docker logs container_id

# Execute command in running container
docker exec -it container_id /bin/bash
```

### 2. Dockerfile Structure

```dockerfile
# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Dockerfile Best Practices

### 1. Backend Dockerfile (`Dockerfile.backend`)

```dockerfile
# Use official Python runtime as base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        curl \
        && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Spring Boot Analytics Dockerfile (`analytics-service/Dockerfile`)

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

## Docker Compose

### 1. Development Configuration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fitbuddy
      POSTGRES_USER: fitbuddy
      POSTGRES_PASSWORD: fitbuddy123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fitbuddy -d fitbuddy"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
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

  # RabbitMQ Message Broker
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

  # FastAPI Backend
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://fitbuddy:fitbuddy123@db:5432/fitbuddy
      - ANALYTICS_SERVICE_URL=http://analytics:8081
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - .:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Spring Boot Analytics Service
  analytics:
    build:
      context: ./analytics-service
      dockerfile: Dockerfile
    ports:
      - "8081:8081"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/fitbuddy_analytics
      - SPRING_DATASOURCE_USERNAME=fitbuddy
      - SPRING_DATASOURCE_PASSWORD=fitbuddy123
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/api/analytics/calories/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

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
    volumes:
      - .:/app
    command: celery -A celery_worker.celery_app worker --loglevel=info
    healthcheck:
      test: ["CMD", "celery", "-A", "celery_worker.celery_app", "inspect", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

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
    volumes:
      - .:/app
    command: celery -A celery_worker.celery_app beat --loglevel=info
    healthcheck:
      test: ["CMD", "celery", "-A", "celery_worker.celery_app", "inspect", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:

networks:
  default:
    name: fitbuddy-network
```

### 2. Production Configuration (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ Message Broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # FastAPI Backend
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ANALYTICS_SERVICE_URL=http://analytics:8081
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Spring Boot Analytics Service
  analytics:
    build:
      context: ./analytics-service
      dockerfile: Dockerfile
    environment:
      - SPRING_DATASOURCE_URL=${ANALYTICS_DATABASE_URL}
      - SPRING_DATASOURCE_USERNAME=${POSTGRES_USER}
      - SPRING_DATASOURCE_PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/api/analytics/calories/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Celery Worker
  celery-worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped
    command: celery -A celery_worker.celery_app worker --loglevel=info

  # Celery Beat Scheduler
  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
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
  postgres_data:
  redis_data:
  rabbitmq_data:

networks:
  default:
    name: fitbuddy-network
```

## Multi-Stage Builds

### 1. Frontend Multi-Stage Build

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN adduser -D -s /bin/sh nginx-user

# Set ownership
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html

# Switch to non-root user
USER nginx-user

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Spring Boot Multi-Stage Build

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

## Container Orchestration

### 1. Docker Swarm

```yaml
version: '3.8'

services:
  backend:
    image: fitbuddy-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - fitbuddy-network

  frontend:
    image: fitbuddy-frontend:latest
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
    networks:
      - fitbuddy-network

networks:
  fitbuddy-network:
    driver: overlay
```

### 2. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fitbuddy-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fitbuddy-backend
  template:
    metadata:
      labels:
        app: fitbuddy-backend
    spec:
      containers:
      - name: backend
        image: fitbuddy-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fitbuddy-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fitbuddy-backend-service
spec:
  selector:
    app: fitbuddy-backend
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

## Production Deployment

### 1. Environment Variables (`docker.env`)

```bash
# Database Configuration
POSTGRES_DB=fitbuddy
POSTGRES_USER=fitbuddy
POSTGRES_PASSWORD=your_secure_password_here

# Application Configuration
DATABASE_URL=postgresql://fitbuddy:your_secure_password_here@db:5432/fitbuddy
ANALYTICS_DATABASE_URL=jdbc:postgresql://db:5432/fitbuddy_analytics
SECRET_KEY=your_secret_key_here

# Redis Configuration
REDIS_URL=redis://redis:6379

# RabbitMQ Configuration
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# CORS Configuration
ALLOWED_HOSTS=http://localhost:3000,https://yourdomain.com
```

### 2. Production Deployment Script

```bash
#!/bin/bash

# Production deployment script for FitBuddy

set -e

echo "Starting FitBuddy production deployment..."

# Load environment variables
if [ -f docker.env ]; then
    export $(cat docker.env | xargs)
else
    echo "Error: docker.env file not found"
    exit 1
fi

# Build images
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Check service health
echo "Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "Deployment completed successfully!"
```

### 3. Nginx Configuration (`frontend/nginx.conf`)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## Monitoring & Logging

### 1. Logging Configuration

```python
# app/core/logging.py
import logging
import sys
from logging.handlers import RotatingFileHandler

def setup_logging():
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Create formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler
    file_handler = RotatingFileHandler(
        'logs/fitbuddy.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
```

### 2. Health Check Endpoints

```python
# app/api/routes/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.redis_service import redis_service
from app.services.rabbitmq_service import rabbitmq_service

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "service": "fitbuddy-backend"}

@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with dependencies"""
    health_status = {
        "status": "healthy",
        "service": "fitbuddy-backend",
        "dependencies": {}
    }

    # Check database
    try:
        db.execute("SELECT 1")
        health_status["dependencies"]["database"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check Redis
    try:
        await redis_service.set_cache("health_check", "test", 1)
        health_status["dependencies"]["redis"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check RabbitMQ
    try:
        await rabbitmq_service.publish_message("health_check", {"test": "message"})
        health_status["dependencies"]["rabbitmq"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["rabbitmq"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    return health_status
```

### 3. Monitoring with Prometheus

```python
# app/middleware/metrics.py
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, generate_latest
import time

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).inc()
    
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response

@router.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

## Security Best Practices

### 1. Container Security

```dockerfile
# Use specific version tags
FROM python:3.11.6-slim

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser

# Set proper permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Use read-only filesystem where possible
# Add security scanning
RUN pip install safety && safety check
```

### 2. Network Security

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    # ... other config
    networks:
      - internal
      - external

networks:
  internal:
    driver: bridge
    internal: true
  external:
    driver: bridge
```

### 3. Secrets Management

```yaml
# docker-compose.yml
services:
  backend:
    # ... other config
    secrets:
      - db_password
      - secret_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  secret_key:
    file: ./secrets/secret_key.txt
```

## Troubleshooting

### 1. Common Issues

**Container won't start:**
```bash
# Check logs
docker logs container_name

# Check container status
docker ps -a

# Inspect container
docker inspect container_name
```

**Database connection issues:**
```bash
# Check database container
docker exec -it db_container psql -U fitbuddy -d fitbuddy

# Test connection
docker exec backend_container python -c "from app.db.session import engine; print(engine.execute('SELECT 1').fetchone())"
```

**Memory issues:**
```bash
# Check memory usage
docker stats

# Limit memory usage
docker run --memory=512m your_image
```

### 2. Debugging Commands

```bash
# Enter running container
docker exec -it container_name /bin/bash

# Check container processes
docker exec container_name ps aux

# Check container network
docker exec container_name netstat -tulpn

# Check container logs in real-time
docker logs -f container_name

# Check resource usage
docker stats container_name

# Inspect container configuration
docker inspect container_name
```

### 3. Performance Optimization

```dockerfile
# Use multi-stage builds
FROM node:18-alpine AS builder
# ... build steps
FROM nginx:alpine AS production
# ... production steps

# Use .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
```

This comprehensive guide covers all aspects of Docker and containerization used in the FitBuddy project, from basic concepts to production deployment and troubleshooting.
