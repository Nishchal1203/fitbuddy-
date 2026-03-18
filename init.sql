-- Initialize the database
-- Note: PostgreSQL doesn't support "IF NOT EXISTS" for CREATE DATABASE
-- The database 'fitbuddy' is already created by the POSTGRES_DB environment variable

-- Create a user for the application (optional, using postgres user for simplicity)
-- CREATE USER fitbuddy_user WITH PASSWORD 'fitbuddy_password';
-- GRANT ALL PRIVILEGES ON DATABASE fitbuddy TO fitbuddy_user;

-- The database will be initialized by Alembic migrations
-- This file can be used for any initial setup if needed
