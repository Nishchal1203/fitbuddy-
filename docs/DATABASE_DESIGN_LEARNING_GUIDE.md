# Database Design & Management - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to Database Design](#introduction-to-database-design)
2. [PostgreSQL Fundamentals](#postgresql-fundamentals)
3. [Database Schema Design](#database-schema-design)
4. [SQLAlchemy ORM](#sqlalchemy-orm)
5. [Database Migrations](#database-migrations)
6. [Query Optimization](#query-optimization)
7. [Database Security](#database-security)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Monitoring](#performance-monitoring)
10. [Best Practices](#best-practices)

## Introduction to Database Design

### What is Database Design?
Database design is the process of creating a detailed data model of a database. It involves defining the structure, relationships, constraints, and indexes that will be used to store and retrieve data efficiently.

### Key Principles
- **Normalization**: Organize data to reduce redundancy
- **Referential Integrity**: Maintain consistency between related tables
- **Performance**: Design for efficient queries and operations
- **Scalability**: Plan for future growth and changes
- **Security**: Protect sensitive data and control access

### Database Design for FitBuddy
- **User Management**: User profiles, authentication, and preferences
- **Workout Tracking**: Exercise sessions, routines, and progress
- **Goal Setting**: Objectives, milestones, and achievements
- **Analytics**: Performance metrics and reporting
- **Social Features**: Sharing, following, and community

## PostgreSQL Fundamentals

### 1. PostgreSQL Configuration

```sql
-- Database creation
CREATE DATABASE fitbuddy
    WITH 
    OWNER = fitbuddy
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- User creation and permissions
CREATE USER fitbuddy WITH PASSWORD 'fitbuddy123';
GRANT ALL PRIVILEGES ON DATABASE fitbuddy TO fitbuddy;
GRANT ALL PRIVILEGES ON SCHEMA public TO fitbuddy;

-- Connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### 2. Data Types and Constraints

```sql
-- Custom data types
CREATE TYPE workout_intensity AS ENUM ('low', 'moderate', 'high', 'very_high');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- Example table with various data types
CREATE TABLE workout_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
    intensity workout_intensity DEFAULT 'moderate',
    calories_burned DECIMAL(8,2) CHECK (calories_burned >= 0),
    exercises JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    CONSTRAINT valid_calories CHECK (calories_burned IS NULL OR calories_burned >= 0)
);

-- Indexes for performance
CREATE INDEX idx_workout_sessions_owner_id ON workout_sessions(owner_id);
CREATE INDEX idx_workout_sessions_performed_at ON workout_sessions(performed_at);
CREATE INDEX idx_workout_sessions_duration ON workout_sessions(duration_minutes);
CREATE INDEX idx_workout_sessions_calories ON workout_sessions(calories_burned);
CREATE INDEX idx_workout_sessions_exercises ON workout_sessions USING GIN(exercises);
```

## Database Schema Design

### 1. Core Tables Design

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    role user_role DEFAULT 'user',
    date_of_birth DATE,
    height_cm INTEGER CHECK (height_cm > 0 AND height_cm <= 300),
    weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg <= 1000),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    activity_level INTEGER CHECK (activity_level >= 1 AND activity_level <= 5),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_height CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 300)),
    CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 1000))
);

-- Goals table
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(100) NOT NULL,
    target_value DECIMAL(10,2) NOT NULL CHECK (target_value > 0),
    current_value DECIMAL(10,2) DEFAULT 0 CHECK (current_value >= 0),
    unit VARCHAR(50) NOT NULL,
    status goal_status DEFAULT 'active',
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_target_date CHECK (target_date IS NULL OR target_date >= start_date),
    CONSTRAINT valid_completion CHECK (is_completed = FALSE OR completed_at IS NOT NULL)
);

-- Exercises table
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    muscle_groups TEXT[],
    equipment VARCHAR(255),
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    met_value DECIMAL(4,2) CHECK (met_value > 0),
    instructions TEXT,
    tips TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_exercise_name UNIQUE (name)
);

-- Progress entries table
CREATE TABLE progress_entries (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_progress_value CHECK (value >= 0)
);
```

### 2. Relationships and Foreign Keys

```sql
-- Add foreign key constraints
ALTER TABLE workout_sessions 
ADD CONSTRAINT fk_workout_sessions_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE goals 
ADD CONSTRAINT fk_goals_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE progress_entries 
ADD CONSTRAINT fk_progress_entries_goal 
FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;

ALTER TABLE progress_entries 
ADD CONSTRAINT fk_progress_entries_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Junction table for workout-exercise many-to-many relationship
CREATE TABLE workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    sets INTEGER CHECK (sets > 0),
    reps INTEGER CHECK (reps > 0),
    weight_kg DECIMAL(6,2) CHECK (weight_kg >= 0),
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    distance_km DECIMAL(8,3) CHECK (distance_km >= 0),
    calories_burned DECIMAL(8,2) CHECK (calories_burned >= 0),
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT unique_workout_exercise UNIQUE (workout_id, exercise_id, order_index)
);
```

### 3. Views and Functions

```sql
-- User workout summary view
CREATE VIEW user_workout_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    COUNT(ws.id) as total_workouts,
    COALESCE(SUM(ws.duration_minutes), 0) as total_duration_minutes,
    COALESCE(SUM(ws.calories_burned), 0) as total_calories_burned,
    COALESCE(AVG(ws.duration_minutes), 0) as avg_duration_minutes,
    COALESCE(AVG(ws.calories_burned), 0) as avg_calories_per_workout,
    MAX(ws.performed_at) as last_workout_date,
    MIN(ws.performed_at) as first_workout_date
FROM users u
LEFT JOIN workout_sessions ws ON u.id = ws.owner_id
GROUP BY u.id, u.full_name;

-- Goal progress view
CREATE VIEW goal_progress AS
SELECT 
    g.id as goal_id,
    g.title,
    g.goal_type,
    g.target_value,
    g.current_value,
    g.unit,
    g.status,
    CASE 
        WHEN g.target_value > 0 THEN (g.current_value / g.target_value) * 100
        ELSE 0
    END as progress_percentage,
    g.target_date,
    CASE 
        WHEN g.target_date IS NOT NULL THEN g.target_date - CURRENT_DATE
        ELSE NULL
    END as days_remaining,
    g.created_at,
    g.owner_id
FROM goals g;

-- Function to calculate workout calories
CREATE OR REPLACE FUNCTION calculate_workout_calories(
    p_duration_minutes INTEGER,
    p_met_value DECIMAL,
    p_weight_kg DECIMAL DEFAULT 70.0
) RETURNS DECIMAL AS $$
BEGIN
    IF p_duration_minutes IS NULL OR p_met_value IS NULL OR p_weight_kg IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND((p_met_value * p_weight_kg * (p_duration_minutes / 60.0))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update workout calories
CREATE OR REPLACE FUNCTION update_workout_calories()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.duration_minutes IS NOT NULL AND NEW.duration_minutes > 0 THEN
        -- Calculate calories based on workout title and duration
        NEW.calories_burned := calculate_workout_calories(
            NEW.duration_minutes,
            CASE 
                WHEN LOWER(NEW.title) LIKE '%run%' THEN 8.0
                WHEN LOWER(NEW.title) LIKE '%cycle%' THEN 6.0
                WHEN LOWER(NEW.title) LIKE '%swim%' THEN 7.0
                WHEN LOWER(NEW.title) LIKE '%strength%' THEN 3.5
                WHEN LOWER(NEW.title) LIKE '%yoga%' THEN 2.5
                WHEN LOWER(NEW.title) LIKE '%walk%' THEN 3.0
                ELSE 3.0
            END,
            70.0  -- Default weight
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate calories
CREATE TRIGGER trigger_update_workout_calories
    BEFORE INSERT OR UPDATE ON workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_calories();
```

## SQLAlchemy ORM

### 1. Base Model Configuration

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, JSON, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM
from datetime import datetime
import uuid

Base = declarative_base()

class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True))

class BaseModel(Base, TimestampMixin):
    """Base model with common fields"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
```

### 2. User Model

```python
from sqlalchemy import Enum
from app.db.base import BaseModel
from app.core.enums import UserRole

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    
    # Profile information
    date_of_birth = Column(DateTime)
    height_cm = Column(Integer)
    weight_kg = Column(DECIMAL(5, 2))
    gender = Column(String(10))
    activity_level = Column(Integer)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    workouts = relationship("WorkoutSession", back_populates="owner", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="owner", cascade="all, delete-orphan")
    progress_entries = relationship("ProgressEntry", back_populates="owner", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('height_cm IS NULL OR (height_cm > 0 AND height_cm <= 300)', name='valid_height'),
        CheckConstraint('weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 1000)', name='valid_weight'),
        CheckConstraint('activity_level IS NULL OR (activity_level >= 1 AND activity_level <= 5)', name='valid_activity_level'),
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', full_name='{self.full_name}')>"
```

### 3. Workout Model

```python
from sqlalchemy import JSON, CheckConstraint
from app.db.base import BaseModel

class WorkoutSession(BaseModel):
    __tablename__ = "workout_sessions"

    title = Column(String(255), nullable=False)
    description = Column(Text)
    notes = Column(Text)
    performed_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    duration_minutes = Column(Integer)
    intensity = Column(String(20), default="moderate")
    calories_burned = Column(DECIMAL(8, 2))
    exercises = Column(JSON)
    metadata = Column(JSON)
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Relationships
    owner = relationship("User", back_populates="workouts")
    workout_exercises = relationship("WorkoutExercise", back_populates="workout", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('duration_minutes IS NULL OR duration_minutes > 0', name='valid_duration'),
        CheckConstraint('calories_burned IS NULL OR calories_burned >= 0', name='valid_calories'),
        CheckConstraint('duration_minutes IS NULL OR duration_minutes <= 1440', name='max_duration'),
    )
    
    def __repr__(self):
        return f"<WorkoutSession(id={self.id}, title='{self.title}', owner_id={self.owner_id})>"
```

### 4. Goal Model

```python
from sqlalchemy import Date, CheckConstraint
from app.core.enums import GoalStatus
from app.db.base import BaseModel

class Goal(BaseModel):
    __tablename__ = "goals"

    title = Column(String(255), nullable=False)
    description = Column(Text)
    goal_type = Column(String(100), nullable=False)
    target_value = Column(DECIMAL(10, 2), nullable=False)
    current_value = Column(DECIMAL(10, 2), default=0)
    unit = Column(String(50), nullable=False)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    priority = Column(Integer, default=3)
    start_date = Column(Date, nullable=False, default=func.current_date())
    target_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))
    is_completed = Column(Boolean, default=False)
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Relationships
    owner = relationship("User", back_populates="goals")
    progress_entries = relationship("ProgressEntry", back_populates="goal", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('target_value > 0', name='valid_target_value'),
        CheckConstraint('current_value >= 0', name='valid_current_value'),
        CheckConstraint('priority >= 1 AND priority <= 5', name='valid_priority'),
        CheckConstraint('target_date IS NULL OR target_date >= start_date', name='valid_target_date'),
        CheckConstraint('is_completed = FALSE OR completed_at IS NOT NULL', name='valid_completion'),
    )
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.target_value > 0:
            return min((self.current_value / self.target_value) * 100, 100)
        return 0
    
    @property
    def days_remaining(self):
        """Calculate days remaining to target date"""
        if self.target_date:
            delta = self.target_date - datetime.now().date()
            return delta.days
        return None
    
    def __repr__(self):
        return f"<Goal(id={self.id}, title='{self.title}', status='{self.status}')>"
```

## Database Migrations

### 1. Alembic Configuration

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from app.db.base import Base
from app.core.config import settings

# Import all models to ensure they're registered
from app.models.user import User
from app.models.workout import WorkoutSession
from app.models.goal import Goal
from app.models.exercise import Exercise
from app.models.progress import ProgressEntry

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### 2. Migration Examples

```python
# alembic/versions/001_initial_migration.py
"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('role', sa.Enum('USER', 'ADMIN', 'MODERATOR', name='userrole'), nullable=True),
        sa.Column('date_of_birth', sa.DateTime(), nullable=True),
        sa.Column('height_cm', sa.Integer(), nullable=True),
        sa.Column('weight_kg', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('gender', sa.String(length=10), nullable=True),
        sa.Column('activity_level', sa.Integer(), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # Create workout_sessions table
    op.create_table('workout_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('performed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('intensity', sa.String(length=20), nullable=True),
        sa.Column('calories_burned', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('exercises', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for workout_sessions
    op.create_index(op.f('ix_workout_sessions_id'), 'workout_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_workout_sessions_owner_id'), 'workout_sessions', ['owner_id'], unique=False)
    op.create_index('idx_workout_sessions_performed_at', 'workout_sessions', ['performed_at'], unique=False)
    op.create_index('idx_workout_sessions_duration', 'workout_sessions', ['duration_minutes'], unique=False)
    op.create_index('idx_workout_sessions_calories', 'workout_sessions', ['calories_burned'], unique=False)

def downgrade():
    op.drop_index('idx_workout_sessions_calories', table_name='workout_sessions')
    op.drop_index('idx_workout_sessions_duration', table_name='workout_sessions')
    op.drop_index('idx_workout_sessions_performed_at', table_name='workout_sessions')
    op.drop_index(op.f('ix_workout_sessions_owner_id'), table_name='workout_sessions')
    op.drop_index(op.f('ix_workout_sessions_id'), table_name='workout_sessions')
    op.drop_table('workout_sessions')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
```

### 3. Data Migration

```python
# alembic/versions/002_add_calories_burned.py
"""Add calories_burned to workout_sessions

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    # Add calories_burned column
    op.add_column('workout_sessions', sa.Column('calories_burned', sa.Numeric(precision=8, scale=2), nullable=True))
    
    # Create index for calories_burned
    op.create_index('idx_workout_sessions_calories_burned', 'workout_sessions', ['calories_burned'], unique=False)
    
    # Update existing records with calculated calories
    op.execute("""
        UPDATE workout_sessions 
        SET calories_burned = CASE 
            WHEN LOWER(title) LIKE '%run%' THEN duration_minutes * 8.0 * 70.0 / 60.0
            WHEN LOWER(title) LIKE '%cycle%' THEN duration_minutes * 6.0 * 70.0 / 60.0
            WHEN LOWER(title) LIKE '%swim%' THEN duration_minutes * 7.0 * 70.0 / 60.0
            WHEN LOWER(title) LIKE '%strength%' THEN duration_minutes * 3.5 * 70.0 / 60.0
            WHEN LOWER(title) LIKE '%yoga%' THEN duration_minutes * 2.5 * 70.0 / 60.0
            WHEN LOWER(title) LIKE '%walk%' THEN duration_minutes * 3.0 * 70.0 / 60.0
            ELSE duration_minutes * 3.0 * 70.0 / 60.0
        END
        WHERE duration_minutes IS NOT NULL AND duration_minutes > 0
    """)

def downgrade():
    op.drop_index('idx_workout_sessions_calories_burned', table_name='workout_sessions')
    op.drop_column('workout_sessions', 'calories_burned')
```

## Query Optimization

### 1. Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_workout_sessions_owner_performed_at 
ON workout_sessions(owner_id, performed_at DESC);

CREATE INDEX idx_workout_sessions_owner_duration 
ON workout_sessions(owner_id, duration_minutes);

CREATE INDEX idx_goals_owner_status 
ON goals(owner_id, status);

CREATE INDEX idx_goals_owner_target_date 
ON goals(owner_id, target_date);

-- Partial indexes for specific conditions
CREATE INDEX idx_active_goals 
ON goals(owner_id, target_date) 
WHERE status = 'active';

CREATE INDEX idx_recent_workouts 
ON workout_sessions(owner_id, performed_at DESC) 
WHERE performed_at >= CURRENT_DATE - INTERVAL '30 days';

-- GIN indexes for JSON columns
CREATE INDEX idx_workout_sessions_exercises_gin 
ON workout_sessions USING GIN(exercises);

CREATE INDEX idx_workout_sessions_metadata_gin 
ON workout_sessions USING GIN(metadata);

-- Expression indexes
CREATE INDEX idx_workout_sessions_date_trunc 
ON workout_sessions(date_trunc('day', performed_at));

CREATE INDEX idx_goals_progress_percentage 
ON goals((current_value / target_value * 100)) 
WHERE target_value > 0;
```

### 2. Query Optimization Examples

```python
from sqlalchemy import func, and_, or_, desc, asc
from sqlalchemy.orm import joinedload, selectinload
from app.models.workout import WorkoutSession
from app.models.goal import Goal
from app.models.user import User

class OptimizedQueries:
    def __init__(self, db_session):
        self.db = db_session
    
    def get_user_workouts_with_exercises(self, user_id: int, limit: int = 10):
        """Optimized query to get user workouts with exercises"""
        return self.db.query(WorkoutSession)\
            .options(joinedload(WorkoutSession.workout_exercises))\
            .filter(WorkoutSession.owner_id == user_id)\
            .order_by(desc(WorkoutSession.performed_at))\
            .limit(limit)\
            .all()
    
    def get_user_workout_stats(self, user_id: int, days: int = 30):
        """Get user workout statistics for the last N days"""
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        return self.db.query(
            func.count(WorkoutSession.id).label('total_workouts'),
            func.sum(WorkoutSession.duration_minutes).label('total_duration'),
            func.sum(WorkoutSession.calories_burned).label('total_calories'),
            func.avg(WorkoutSession.duration_minutes).label('avg_duration'),
            func.avg(WorkoutSession.calories_burned).label('avg_calories')
        ).filter(
            and_(
                WorkoutSession.owner_id == user_id,
                WorkoutSession.performed_at >= start_date
            )
        ).first()
    
    def get_user_goals_with_progress(self, user_id: int):
        """Get user goals with progress information"""
        return self.db.query(Goal)\
            .options(selectinload(Goal.progress_entries))\
            .filter(Goal.owner_id == user_id)\
            .order_by(desc(Goal.created_at))\
            .all()
    
    def get_workouts_by_date_range(self, user_id: int, start_date, end_date):
        """Get workouts within a date range"""
        return self.db.query(WorkoutSession)\
            .filter(
                and_(
                    WorkoutSession.owner_id == user_id,
                    WorkoutSession.performed_at >= start_date,
                    WorkoutSession.performed_at <= end_date
                )
            )\
            .order_by(desc(WorkoutSession.performed_at))\
            .all()
    
    def get_user_dashboard_data(self, user_id: int):
        """Get all data needed for user dashboard in one query"""
        # Use raw SQL for complex dashboard query
        query = """
        SELECT 
            u.id as user_id,
            u.full_name,
            COUNT(ws.id) as total_workouts,
            COALESCE(SUM(ws.duration_minutes), 0) as total_duration,
            COALESCE(SUM(ws.calories_burned), 0) as total_calories,
            COUNT(g.id) as total_goals,
            COUNT(CASE WHEN g.status = 'active' THEN 1 END) as active_goals,
            COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_goals,
            MAX(ws.performed_at) as last_workout_date
        FROM users u
        LEFT JOIN workout_sessions ws ON u.id = ws.owner_id
        LEFT JOIN goals g ON u.id = g.owner_id
        WHERE u.id = :user_id
        GROUP BY u.id, u.full_name
        """
        
        result = self.db.execute(query, {'user_id': user_id})
        return result.fetchone()
```

### 3. Database Connection Pooling

```python
from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Configure connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,  # Number of connections to maintain
    max_overflow=30,  # Additional connections when pool is exhausted
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=False,  # Set to True for SQL logging
    connect_args={
        "options": "-c timezone=utc"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Context manager for database sessions
class DatabaseSession:
    def __init__(self):
        self.db = SessionLocal()
    
    def __enter__(self):
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
        else:
            self.db.commit()
        self.db.close()
```

## Database Security

### 1. User Permissions

```sql
-- Create application user with limited permissions
CREATE USER fitbuddy_app WITH PASSWORD 'secure_password_here';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE fitbuddy TO fitbuddy_app;
GRANT USAGE ON SCHEMA public TO fitbuddy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitbuddy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitbuddy_app;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fitbuddy_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO fitbuddy_app;

-- Create read-only user for analytics
CREATE USER fitbuddy_analytics WITH PASSWORD 'analytics_password_here';
GRANT CONNECT ON DATABASE fitbuddy TO fitbuddy_analytics;
GRANT USAGE ON SCHEMA public TO fitbuddy_analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fitbuddy_analytics;

-- Create backup user
CREATE USER fitbuddy_backup WITH PASSWORD 'backup_password_here';
GRANT CONNECT ON DATABASE fitbuddy TO fitbuddy_backup;
GRANT USAGE ON SCHEMA public TO fitbuddy_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fitbuddy_backup;
```

### 2. Row Level Security

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY user_own_data ON users
    FOR ALL TO fitbuddy_app
    USING (id = current_setting('app.current_user_id')::integer);

-- Create policies for workout_sessions table
CREATE POLICY workout_own_data ON workout_sessions
    FOR ALL TO fitbuddy_app
    USING (owner_id = current_setting('app.current_user_id')::integer);

-- Create policies for goals table
CREATE POLICY goal_own_data ON goals
    FOR ALL TO fitbuddy_app
    USING (owner_id = current_setting('app.current_user_id')::integer);

-- Create policies for progress_entries table
CREATE POLICY progress_own_data ON progress_entries
    FOR ALL TO fitbuddy_app
    USING (owner_id = current_setting('app.current_user_id')::integer);

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Data Encryption

```python
from cryptography.fernet import Fernet
from sqlalchemy import TypeDecorator, String
import base64

class EncryptedString(TypeDecorator):
    """Encrypted string type for sensitive data"""
    impl = String
    cache_ok = True
    
    def __init__(self, key=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.key = key or Fernet.generate_key()
        self.cipher = Fernet(self.key)
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return self.cipher.encrypt(value.encode()).decode()
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            return self.cipher.decrypt(value.encode()).decode()
        return value

# Usage in models
class User(BaseModel):
    __tablename__ = "users"
    
    # Regular fields
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    
    # Encrypted sensitive fields
    phone_number = Column(EncryptedString(255))
    emergency_contact = Column(EncryptedString(255))
    medical_notes = Column(EncryptedString(Text))
```

## Backup & Recovery

### 1. Automated Backup Script

```bash
#!/bin/bash
# backup_database.sh

# Configuration
DB_NAME="fitbuddy"
DB_USER="fitbuddy"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/fitbuddy_$(date +%Y%m%d_%H%M%S).sql"

# Perform backup
echo "Starting backup of database $DB_NAME..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --verbose \
    --clean \
    --create \
    --if-exists \
    --format=plain \
    --file=$BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Compress backup file
    gzip $BACKUP_FILE
    echo "Backup compressed: $BACKUP_FILE.gz"
    
    # Remove old backups
    find $BACKUP_DIR -name "fitbuddy_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned up (older than $RETENTION_DAYS days)"
else
    echo "Backup failed!"
    exit 1
fi
```

### 2. Point-in-Time Recovery

```bash
#!/bin/bash
# restore_database.sh

# Configuration
DB_NAME="fitbuddy"
DB_USER="fitbuddy"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_FILE="$1"
TARGET_TIME="$2"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [target_time]"
    echo "Example: $0 /backups/fitbuddy_20240115_120000.sql.gz '2024-01-15 11:30:00'"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting database restore..."

# Drop and recreate database
echo "Dropping existing database..."
dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

echo "Creating new database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Restore from backup
echo "Restoring from backup: $BACKUP_FILE"
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE
fi

if [ $? -eq 0 ]; then
    echo "Database restore completed successfully"
    
    # If target time is specified, perform point-in-time recovery
    if [ ! -z "$TARGET_TIME" ]; then
        echo "Performing point-in-time recovery to: $TARGET_TIME"
        # This would require WAL archiving to be configured
        # pg_recovery -t "$TARGET_TIME" $DB_NAME
        echo "Point-in-time recovery completed"
    fi
else
    echo "Database restore failed!"
    exit 1
fi
```

### 3. Database Monitoring

```python
import psycopg2
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DatabaseMonitor:
    def __init__(self, connection_string):
        self.connection_string = connection_string
    
    def check_connection(self):
        """Check database connection"""
        try:
            conn = psycopg2.connect(self.connection_string)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return result[0] == 1
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False
    
    def check_disk_space(self):
        """Check available disk space"""
        try:
            conn = psycopg2.connect(self.connection_string)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as db_size,
                    pg_size_pretty(pg_tablespace_size('pg_default')) as tablespace_size
            """)
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return {
                'database_size': result[0],
                'tablespace_size': result[1]
            }
        except Exception as e:
            logger.error(f"Disk space check failed: {e}")
            return None
    
    def check_active_connections(self):
        """Check active database connections"""
        try:
            conn = psycopg2.connect(self.connection_string)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    count(*) as active_connections,
                    max_conn.setting as max_connections
                FROM pg_stat_activity 
                CROSS JOIN pg_settings max_conn 
                WHERE max_conn.name = 'max_connections'
            """)
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return {
                'active_connections': result[0],
                'max_connections': result[1]
            }
        except Exception as e:
            logger.error(f"Active connections check failed: {e}")
            return None
    
    def check_slow_queries(self):
        """Check for slow queries"""
        try:
            conn = psycopg2.connect(self.connection_string)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    query,
                    state,
                    query_start,
                    now() - query_start as duration
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND now() - query_start > interval '30 seconds'
                ORDER BY duration DESC
            """)
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            return results
        except Exception as e:
            logger.error(f"Slow queries check failed: {e}")
            return None
    
    def get_database_stats(self):
        """Get comprehensive database statistics"""
        stats = {
            'timestamp': datetime.utcnow().isoformat(),
            'connection_status': self.check_connection(),
            'disk_space': self.check_disk_space(),
            'active_connections': self.check_active_connections(),
            'slow_queries': self.check_slow_queries()
        }
        return stats
```

## Performance Monitoring

### 1. Query Performance Analysis

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries taking > 1 second
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();

-- Query to find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Query to find most frequently executed queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY calls DESC 
LIMIT 10;

-- Query to find queries with highest I/O
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    shared_blks_read,
    shared_blks_written,
    temp_blks_read,
    temp_blks_written
FROM pg_stat_statements 
ORDER BY (shared_blks_read + shared_blks_written) DESC 
LIMIT 10;
```

### 2. Index Usage Analysis

```sql
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_tup_read = 0 THEN 'NO_READS'
        ELSE 'USED'
    END as status
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate indexes
SELECT 
    pg_size_pretty(sum(pg_relation_size(idx))::bigint) as size,
    (array_agg(idx))[1] as idx1, 
    (array_agg(idx))[2] as idx2,
    (array_agg(idx))[3] as idx3,
    (array_agg(idx))[4] as idx4
FROM (
    SELECT 
        indexrelid::regclass as idx, 
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'|| 
         coalesce(indexprs::text,'')||E'\n' || coalesce(indpred::text,'')) as key
    FROM pg_index
) sub
GROUP BY key 
HAVING count(*)>1
ORDER BY sum(pg_relation_size(idx)) DESC;
```

## Best Practices

### 1. Database Design Best Practices

```python
# Use proper data types
class GoodExample(BaseModel):
    __tablename__ = "good_example"
    
    # Use appropriate data types
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)  # Not TEXT for emails
    created_at = Column(DateTime(timezone=True), nullable=False)  # Always use timezone
    is_active = Column(Boolean, default=True, nullable=False)  # Not VARCHAR(1)
    price = Column(DECIMAL(10, 2), nullable=False)  # Not FLOAT for money
    
    # Add constraints
    __table_args__ = (
        CheckConstraint('price >= 0', name='valid_price'),
        CheckConstraint('email ~* \'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$\'', name='valid_email'),
    )

# Use proper relationships
class User(BaseModel):
    __tablename__ = "users"
    
    # One-to-many relationship
    workouts = relationship("WorkoutSession", back_populates="owner", cascade="all, delete-orphan")
    
    # Many-to-many relationship
    followers = relationship("User", secondary="user_follows", primaryjoin="User.id == user_follows.c.follower_id")
    following = relationship("User", secondary="user_follows", primaryjoin="User.id == user_follows.c.following_id")
```

### 2. Query Best Practices

```python
# Use proper joins instead of N+1 queries
def get_user_with_workouts_bad(user_id: int):
    """BAD: N+1 query problem"""
    user = db.query(User).filter(User.id == user_id).first()
    workouts = db.query(WorkoutSession).filter(WorkoutSession.owner_id == user_id).all()
    # This creates N+1 queries
    
def get_user_with_workouts_good(user_id: int):
    """GOOD: Single query with join"""
    return db.query(User)\
        .options(joinedload(User.workouts))\
        .filter(User.id == user_id)\
        .first()

# Use proper pagination
def get_workouts_paginated(user_id: int, page: int = 1, size: int = 20):
    """Proper pagination"""
    offset = (page - 1) * size
    return db.query(WorkoutSession)\
        .filter(WorkoutSession.owner_id == user_id)\
        .order_by(desc(WorkoutSession.performed_at))\
        .offset(offset)\
        .limit(size)\
        .all()

# Use transactions properly
def create_workout_with_exercises(workout_data: dict, exercises_data: list):
    """Use transaction for data consistency"""
    try:
        # Start transaction
        workout = WorkoutSession(**workout_data)
        db.add(workout)
        db.flush()  # Get the ID without committing
        
        # Add exercises
        for exercise_data in exercises_data:
            exercise = WorkoutExercise(workout_id=workout.id, **exercise_data)
            db.add(exercise)
        
        # Commit transaction
        db.commit()
        return workout
        
    except Exception as e:
        db.rollback()
        raise e
```

### 3. Migration Best Practices

```python
# Always test migrations
def test_migration():
    """Test migration before applying"""
    # Create test database
    # Apply migration
    # Verify data integrity
    # Rollback if needed
    pass

# Use reversible migrations
def upgrade():
    """Forward migration"""
    op.add_column('users', sa.Column('phone_number', sa.String(20)))
    op.create_index('idx_users_phone', 'users', ['phone_number'])

def downgrade():
    """Reverse migration"""
    op.drop_index('idx_users_phone', 'users')
    op.drop_column('users', 'phone_number')

# Use data migrations carefully
def upgrade():
    """Data migration with validation"""
    # Add new column
    op.add_column('users', sa.Column('full_name', sa.String(255)))
    
    # Migrate data
    connection = op.get_bind()
    connection.execute("""
        UPDATE users 
        SET full_name = COALESCE(first_name || ' ' || last_name, first_name, last_name, 'Unknown')
        WHERE full_name IS NULL
    """)
    
    # Make column non-nullable
    op.alter_column('users', 'full_name', nullable=False)
```

This comprehensive guide covers all aspects of database design and management used in the FitBuddy project, from basic concepts to advanced optimization and monitoring techniques.
