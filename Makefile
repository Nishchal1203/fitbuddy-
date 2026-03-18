# FitBuddy Docker Makefile

.PHONY: help build up down logs clean restart dev prod

# Default target
help:
	@echo "Available commands:"
	@echo "  build    - Build all Docker images"
	@echo "  up       - Start all services"
	@echo "  down     - Stop all services"
	@echo "  logs     - Show logs for all services"
	@echo "  clean    - Remove all containers, networks, and volumes"
	@echo "  restart  - Restart all services"
	@echo "  dev      - Start development environment"
	@echo "  prod     - Start production environment"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Clean everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Restart services
restart: down up

# Development environment
dev:
	docker-compose -f docker-compose.yml up -d

# Production environment
prod:
	docker-compose -f docker-compose.prod.yml up -d

# Individual service commands
backend-logs:
	docker-compose logs -f backend

frontend-logs:
	docker-compose logs -f frontend

db-logs:
	docker-compose logs -f db

# Database operations
db-shell:
	docker-compose exec db psql -U postgres -d fitbuddy

# Backend operations
backend-shell:
	docker-compose exec backend /bin/bash

# Run migrations
migrate:
	docker-compose exec backend alembic upgrade head
