# Security & Testing - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to Application Security](#introduction-to-application-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Testing Strategies](#testing-strategies)
7. [Unit Testing](#unit-testing)
8. [Integration Testing](#integration-testing)
9. [Security Testing](#security-testing)
10. [Performance Testing](#performance-testing)

## Introduction to Application Security

### What is Application Security?
Application security encompasses measures taken to protect applications from threats and vulnerabilities. It includes authentication, authorization, data protection, input validation, and secure communication.

### Security Principles
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Users and systems have minimum necessary access
- **Fail Secure**: System fails to a secure state
- **Security by Design**: Security built into the system from the start
- **Regular Updates**: Keep systems and dependencies updated

### Security Threats for FitBuddy
- **Data Breaches**: Unauthorized access to user fitness data
- **Account Takeover**: Compromised user accounts
- **API Abuse**: Unauthorized API usage and rate limiting bypass
- **Injection Attacks**: SQL injection, NoSQL injection
- **Cross-Site Scripting (XSS)**: Malicious scripts in user input
- **Cross-Site Request Forgery (CSRF)**: Unauthorized actions

## Authentication & Authorization

### 1. JWT Authentication Implementation

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

class SecurityManager:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    def create_refresh_token(self, data: dict) -> str:
        """Create refresh token with longer expiration"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=30)  # 30 days
        to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

security_manager = SecurityManager()

# Authentication dependencies
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = security_manager.verify_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, 
            detail="The user doesn't have enough privileges"
        )
    return current_user
```

### 2. Role-Based Access Control (RBAC)

```python
from enum import Enum
from typing import List
from functools import wraps

class Permission(str, Enum):
    """User permissions"""
    READ_WORKOUTS = "read:workouts"
    WRITE_WORKOUTS = "write:workouts"
    DELETE_WORKOUTS = "delete:workouts"
    READ_GOALS = "read:goals"
    WRITE_GOALS = "write:goals"
    DELETE_GOALS = "delete:goals"
    ADMIN_USERS = "admin:users"
    ADMIN_SYSTEM = "admin:system"
    READ_ANALYTICS = "read:analytics"
    WRITE_ANALYTICS = "write:analytics"

class Role(str, Enum):
    """User roles"""
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPERUSER = "superuser"

# Role-permission mapping
ROLE_PERMISSIONS = {
    Role.USER: [
        Permission.READ_WORKOUTS,
        Permission.WRITE_WORKOUTS,
        Permission.DELETE_WORKOUTS,
        Permission.READ_GOALS,
        Permission.WRITE_GOALS,
        Permission.DELETE_GOALS,
    ],
    Role.MODERATOR: [
        Permission.READ_WORKOUTS,
        Permission.WRITE_WORKOUTS,
        Permission.DELETE_WORKOUTS,
        Permission.READ_GOALS,
        Permission.WRITE_GOALS,
        Permission.DELETE_GOALS,
        Permission.READ_ANALYTICS,
    ],
    Role.ADMIN: [
        Permission.READ_WORKOUTS,
        Permission.WRITE_WORKOUTS,
        Permission.DELETE_WORKOUTS,
        Permission.READ_GOALS,
        Permission.WRITE_GOALS,
        Permission.DELETE_GOALS,
        Permission.READ_ANALYTICS,
        Permission.WRITE_ANALYTICS,
        Permission.ADMIN_USERS,
    ],
    Role.SUPERUSER: list(Permission),  # All permissions
}

def has_permission(user: User, permission: Permission) -> bool:
    """Check if user has specific permission"""
    user_role = Role(user.role)
    return permission in ROLE_PERMISSIONS.get(user_role, [])

def require_permission(permission: Permission):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(required_role: Role):
    """Decorator to require specific role"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_role = Role(current_user.role)
            role_hierarchy = [Role.USER, Role.MODERATOR, Role.ADMIN, Role.SUPERUSER]
            
            if role_hierarchy.index(user_role) < role_hierarchy.index(required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{required_role}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage examples
@router.get("/admin/users")
@require_role(Role.ADMIN)
async def get_all_users(current_user: User = Depends(get_current_user)):
    """Get all users - admin only"""
    pass

@router.delete("/workouts/{workout_id}")
@require_permission(Permission.DELETE_WORKOUTS)
async def delete_workout(workout_id: int, current_user: User = Depends(get_current_user)):
    """Delete workout - requires delete permission"""
    pass
```

### 3. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "auth": "5/minute",  # Authentication attempts
    "api": "100/minute",  # General API calls
    "upload": "10/minute",  # File uploads
    "admin": "1000/minute",  # Admin operations
}

def get_rate_limit_for_user(user: Optional[User] = None) -> str:
    """Get rate limit based on user role"""
    if not user:
        return RATE_LIMITS["api"]
    
    if user.is_superuser:
        return "unlimited"
    elif user.role == Role.ADMIN:
        return RATE_LIMITS["admin"]
    elif user.role == Role.MODERATOR:
        return "500/minute"
    else:
        return RATE_LIMITS["api"]

# Custom rate limit key function
def get_user_rate_limit_key(request: Request) -> str:
    """Get rate limit key based on user ID if authenticated"""
    # Try to get user from token
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if token:
            payload = security_manager.verify_token(token)
            if payload:
                user_id = payload.get("sub")
                return f"user:{user_id}"
    except:
        pass
    
    # Fallback to IP address
    return get_remote_address(request)

# Apply rate limiting
@router.post("/auth/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with rate limiting"""
    pass

@router.post("/workouts/")
@limiter.limit(get_rate_limit_for_user)
async def create_workout(request: Request, current_user: User = Depends(get_current_user)):
    """Create workout with user-based rate limiting"""
    pass
```

## Data Protection

### 1. Input Validation and Sanitization

```python
from pydantic import BaseModel, validator, Field
from typing import Optional
import re
import html

class SecureWorkoutCreate(BaseModel):
    """Secure workout creation model with validation"""
    title: str = Field(..., min_length=1, max_length=255, description="Workout title")
    notes: Optional[str] = Field(None, max_length=2000, description="Workout notes")
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Duration in minutes")
    exercises: Optional[List[dict]] = Field(None, description="Exercise data")
    
    @validator('title')
    def validate_title(cls, v):
        """Validate and sanitize title"""
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        
        # Remove HTML tags
        v = re.sub(r'<[^>]+>', '', v)
        
        # Escape HTML entities
        v = html.escape(v)
        
        # Remove excessive whitespace
        v = re.sub(r'\s+', ' ', v).strip()
        
        return v
    
    @validator('notes')
    def validate_notes(cls, v):
        """Validate and sanitize notes"""
        if v is None:
            return v
        
        # Remove HTML tags
        v = re.sub(r'<[^>]+>', '', v)
        
        # Escape HTML entities
        v = html.escape(v)
        
        # Remove excessive whitespace
        v = re.sub(r'\s+', ' ', v).strip()
        
        return v
    
    @validator('exercises')
    def validate_exercises(cls, v):
        """Validate exercise data"""
        if v is None:
            return v
        
        if len(v) > 50:  # Limit number of exercises
            raise ValueError('Too many exercises')
        
        for exercise in v:
            if not isinstance(exercise, dict):
                raise ValueError('Exercise must be a dictionary')
            
            # Validate required fields
            if 'name' not in exercise:
                raise ValueError('Exercise name is required')
            
            # Sanitize exercise name
            exercise['name'] = re.sub(r'<[^>]+>', '', exercise['name'])
            exercise['name'] = html.escape(exercise['name'])
            
            # Validate numeric fields
            if 'sets' in exercise and exercise['sets'] is not None:
                if not isinstance(exercise['sets'], int) or exercise['sets'] < 0:
                    raise ValueError('Sets must be a positive integer')
            
            if 'reps' in exercise and exercise['reps'] is not None:
                if not isinstance(exercise['reps'], int) or exercise['reps'] < 0:
                    raise ValueError('Reps must be a positive integer')
        
        return v

class SecureUserUpdate(BaseModel):
    """Secure user update model"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    date_of_birth: Optional[datetime] = None
    height_cm: Optional[int] = Field(None, ge=50, le=300)
    weight_kg: Optional[float] = Field(None, ge=20, le=500)
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Validate and sanitize full name"""
        if v is None:
            return v
        
        # Remove HTML tags
        v = re.sub(r'<[^>]+>', '', v)
        
        # Escape HTML entities
        v = html.escape(v)
        
        # Remove excessive whitespace
        v = re.sub(r'\s+', ' ', v).strip()
        
        # Check for valid characters (letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[a-zA-Z\s\-']+$", v):
            raise ValueError('Full name contains invalid characters')
        
        return v
```

### 2. SQL Injection Prevention

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

class SecureDatabaseOperations:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_email_secure(self, email: str) -> Optional[User]:
        """Secure user lookup by email"""
        # Use parameterized query
        return self.db.query(User).filter(User.email == email).first()
    
    def get_workouts_by_date_range_secure(self, user_id: int, start_date: datetime, end_date: datetime):
        """Secure workout lookup by date range"""
        # Use parameterized query
        return self.db.query(WorkoutSession).filter(
            WorkoutSession.owner_id == user_id,
            WorkoutSession.performed_at >= start_date,
            WorkoutSession.performed_at <= end_date
        ).all()
    
    def search_workouts_secure(self, user_id: int, search_term: str):
        """Secure workout search"""
        # Use parameterized query with LIKE
        return self.db.query(WorkoutSession).filter(
            WorkoutSession.owner_id == user_id,
            WorkoutSession.title.ilike(f"%{search_term}%")
        ).all()
    
    def execute_raw_query_secure(self, query: str, params: dict):
        """Execute raw SQL query securely"""
        # Use parameterized query
        return self.db.execute(text(query), params)
    
    # BAD EXAMPLES - DO NOT USE
    def get_user_by_email_insecure(self, email: str):
        """INSECURE - vulnerable to SQL injection"""
        # DON'T DO THIS - vulnerable to SQL injection
        query = f"SELECT * FROM users WHERE email = '{email}'"
        return self.db.execute(text(query))
    
    def search_workouts_insecure(self, user_id: int, search_term: str):
        """INSECURE - vulnerable to SQL injection"""
        # DON'T DO THIS - vulnerable to SQL injection
        query = f"SELECT * FROM workout_sessions WHERE owner_id = {user_id} AND title LIKE '%{search_term}%'"
        return self.db.execute(text(query))
```

### 3. Data Encryption

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class DataEncryption:
    def __init__(self, password: str = None):
        if password:
            self.key = self._derive_key(password)
        else:
            self.key = Fernet.generate_key()
        
        self.cipher = Fernet(self.key)
    
    def _derive_key(self, password: str) -> bytes:
        """Derive encryption key from password"""
        password_bytes = password.encode()
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        return key
    
    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        if not data:
            return data
        
        encrypted_data = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        if not encrypted_data:
            return encrypted_data
        
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception:
            raise ValueError("Invalid encrypted data")
    
    def encrypt_dict(self, data: dict) -> dict:
        """Encrypt dictionary values"""
        encrypted_dict = {}
        for key, value in data.items():
            if isinstance(value, str):
                encrypted_dict[key] = self.encrypt(value)
            else:
                encrypted_dict[key] = value
        return encrypted_dict
    
    def decrypt_dict(self, encrypted_data: dict) -> dict:
        """Decrypt dictionary values"""
        decrypted_dict = {}
        for key, value in encrypted_data.items():
            if isinstance(value, str):
                try:
                    decrypted_dict[key] = self.decrypt(value)
                except ValueError:
                    decrypted_dict[key] = value  # Keep original if decryption fails
            else:
                decrypted_dict[key] = value
        return decrypted_dict

# Usage in models
class SensitiveUserData(BaseModel):
    __tablename__ = "sensitive_user_data"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Encrypted fields
    phone_number = Column(Text)  # Store encrypted
    emergency_contact = Column(Text)  # Store encrypted
    medical_notes = Column(Text)  # Store encrypted
    
    def set_phone_number(self, phone_number: str):
        """Set encrypted phone number"""
        if phone_number:
            encryption = DataEncryption()
            self.phone_number = encryption.encrypt(phone_number)
    
    def get_phone_number(self) -> str:
        """Get decrypted phone number"""
        if self.phone_number:
            encryption = DataEncryption()
            return encryption.decrypt(self.phone_number)
        return None
```

## API Security

### 1. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

# Secure CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fitbuddy.com",
        "https://www.fitbuddy.com",
        "https://app.fitbuddy.com",
        # Development origins
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
    ],
    expose_headers=["X-Total-Count", "X-Page-Count"],
    max_age=3600,  # Cache preflight requests for 1 hour
)
```

### 2. Security Headers

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["fitbuddy.com", "*.fitbuddy.com", "localhost", "127.0.0.1"]
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.fitbuddy.com; "
        "frame-ancestors 'none';"
    )
    
    return response
```

### 3. Input Validation Middleware

```python
import re
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

class SecurityMiddleware:
    def __init__(self):
        # Patterns for malicious input
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+'.*'\s*=\s*'.*')",
            r"(\b(OR|AND)\s+\".*\"\s*=\s*\".*\")",
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
        ]
        
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
        ]
    
    async def __call__(self, request: Request, call_next):
        # Check request body for malicious content
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
            if body:
                body_str = body.decode('utf-8', errors='ignore')
                
                # Check for SQL injection
                if self._check_patterns(body_str, self.sql_injection_patterns):
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid input detected"}
                    )
                
                # Check for XSS
                if self._check_patterns(body_str, self.xss_patterns):
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid input detected"}
                    )
        
        # Check URL for path traversal
        if self._check_patterns(request.url.path, self.path_traversal_patterns):
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid path"}
            )
        
        response = await call_next(request)
        return response
    
    def _check_patterns(self, text: str, patterns: list) -> bool:
        """Check if text matches any of the patterns"""
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

# Add security middleware
app.add_middleware(SecurityMiddleware)
```

## Infrastructure Security

### 1. Docker Security

```dockerfile
# Secure Dockerfile
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Environment Security

```python
# app/core/security_config.py
from pydantic_settings import BaseSettings
from typing import List

class SecuritySettings(BaseSettings):
    # JWT Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Password Settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = True
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 100
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "https://fitbuddy.com",
        "https://www.fitbuddy.com",
        "https://app.fitbuddy.com"
    ]
    
    # Database Settings
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    
    # Redis Settings
    REDIS_URL: str
    REDIS_PASSWORD: str = ""
    
    # Encryption Settings
    ENCRYPTION_KEY: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True

security_settings = SecuritySettings()
```

### 3. Secrets Management

```python
import os
from cryptography.fernet import Fernet
import base64

class SecretsManager:
    def __init__(self):
        self.encryption_key = os.getenv("ENCRYPTION_KEY")
        if not self.encryption_key:
            raise ValueError("ENCRYPTION_KEY environment variable is required")
        
        self.cipher = Fernet(self.encryption_key.encode())
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt a secret"""
        encrypted_secret = self.cipher.encrypt(secret.encode())
        return base64.urlsafe_b64encode(encrypted_secret).decode()
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt a secret"""
        decoded_secret = base64.urlsafe_b64decode(encrypted_secret.encode())
        decrypted_secret = self.cipher.decrypt(decoded_secret)
        return decrypted_secret.decode()
    
    def get_database_url(self) -> str:
        """Get decrypted database URL"""
        encrypted_url = os.getenv("ENCRYPTED_DATABASE_URL")
        if encrypted_url:
            return self.decrypt_secret(encrypted_url)
        return os.getenv("DATABASE_URL")
    
    def get_redis_url(self) -> str:
        """Get decrypted Redis URL"""
        encrypted_url = os.getenv("ENCRYPTED_REDIS_URL")
        if encrypted_url:
            return self.decrypt_secret(encrypted_url)
        return os.getenv("REDIS_URL")

# Usage
secrets_manager = SecretsManager()

# In configuration
class SecureConfig(BaseSettings):
    DATABASE_URL: str = secrets_manager.get_database_url()
    REDIS_URL: str = secrets_manager.get_redis_url()
    SECRET_KEY: str = secrets_manager.decrypt_secret(os.getenv("ENCRYPTED_SECRET_KEY"))
```

## Testing Strategies

### 1. Test Configuration

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine"""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create test database session"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with database session"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """Create test user"""
    from app.models.user import User
    from app.security import security_manager
    
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=security_manager.get_password_hash("testpassword"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers"""
    from app.security import security_manager
    
    token = security_manager.create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}
```

### 2. Unit Testing

```python
# tests/test_auth.py
import pytest
from fastapi import status
from app.models.user import User
from app.security import security_manager

class TestAuthentication:
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "testpassword123"
        hashed = security_manager.get_password_hash(password)
        
        assert hashed != password
        assert security_manager.verify_password(password, hashed)
        assert not security_manager.verify_password("wrongpassword", hashed)
    
    def test_token_creation_and_verification(self):
        """Test JWT token creation and verification"""
        data = {"sub": "test@example.com"}
        token = security_manager.create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        
        payload = security_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test@example.com"
    
    def test_invalid_token(self):
        """Test invalid token handling"""
        invalid_token = "invalid.token.here"
        payload = security_manager.verify_token(invalid_token)
        assert payload is None

class TestUserEndpoints:
    def test_create_user(self, client):
        """Test user creation"""
        user_data = {
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "newpassword123"
        }
        
        response = client.post("/api/users/", json=user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["full_name"] == user_data["full_name"]
        assert "password" not in data  # Password should not be returned
    
    def test_create_user_duplicate_email(self, client, test_user):
        """Test user creation with duplicate email"""
        user_data = {
            "email": test_user.email,
            "full_name": "Another User",
            "password": "password123"
        }
        
        response = client.post("/api/users/", json=user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user"""
        response = client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "email" in data
        assert "full_name" in data
        assert "password" not in data
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without authentication"""
        response = client.get("/api/users/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### 3. Integration Testing

```python
# tests/test_workouts.py
import pytest
from fastapi import status
from app.models.workout import WorkoutSession

class TestWorkoutEndpoints:
    def test_create_workout(self, client, auth_headers):
        """Test workout creation"""
        workout_data = {
            "title": "Morning Run",
            "notes": "Great run in the park",
            "duration_minutes": 30,
            "exercises": [
                {
                    "name": "Running",
                    "duration": 30,
                    "intensity": "moderate"
                }
            ]
        }
        
        response = client.post("/api/workouts/", json=workout_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == workout_data["title"]
        assert data["duration_minutes"] == workout_data["duration_minutes"]
        assert len(data["exercises"]) == 1
    
    def test_get_workouts(self, client, auth_headers, test_user, db_session):
        """Test getting user workouts"""
        # Create test workouts
        workout1 = WorkoutSession(
            title="Workout 1",
            duration_minutes=30,
            owner_id=test_user.id
        )
        workout2 = WorkoutSession(
            title="Workout 2",
            duration_minutes=45,
            owner_id=test_user.id
        )
        
        db_session.add_all([workout1, workout2])
        db_session.commit()
        
        response = client.get("/api/workouts/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] in ["Workout 1", "Workout 2"]
    
    def test_get_workout_by_id(self, client, auth_headers, test_user, db_session):
        """Test getting specific workout"""
        workout = WorkoutSession(
            title="Test Workout",
            duration_minutes=30,
            owner_id=test_user.id
        )
        
        db_session.add(workout)
        db_session.commit()
        db_session.refresh(workout)
        
        response = client.get(f"/api/workouts/{workout.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == "Test Workout"
        assert data["duration_minutes"] == 30
    
    def test_update_workout(self, client, auth_headers, test_user, db_session):
        """Test updating workout"""
        workout = WorkoutSession(
            title="Original Title",
            duration_minutes=30,
            owner_id=test_user.id
        )
        
        db_session.add(workout)
        db_session.commit()
        db_session.refresh(workout)
        
        update_data = {
            "title": "Updated Title",
            "duration_minutes": 45
        }
        
        response = client.patch(f"/api/workouts/{workout.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["duration_minutes"] == 45
    
    def test_delete_workout(self, client, auth_headers, test_user, db_session):
        """Test deleting workout"""
        workout = WorkoutSession(
            title="To Be Deleted",
            duration_minutes=30,
            owner_id=test_user.id
        )
        
        db_session.add(workout)
        db_session.commit()
        db_session.refresh(workout)
        
        response = client.delete(f"/api/workouts/{workout.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify workout is deleted
        deleted_workout = db_session.get(WorkoutSession, workout.id)
        assert deleted_workout is None
```

## Security Testing

### 1. Authentication Testing

```python
# tests/test_security.py
import pytest
from fastapi import status
from app.security import security_manager

class TestSecurity:
    def test_sql_injection_protection(self, client):
        """Test SQL injection protection"""
        malicious_input = "'; DROP TABLE users; --"
        
        response = client.post("/api/workouts/", json={
            "title": malicious_input,
            "duration_minutes": 30
        })
        
        # Should not crash or return sensitive data
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_xss_protection(self, client, auth_headers):
        """Test XSS protection"""
        xss_payload = "<script>alert('XSS')</script>"
        
        response = client.post("/api/workouts/", json={
            "title": xss_payload,
            "duration_minutes": 30
        }, headers=auth_headers)
        
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        # XSS payload should be escaped
        assert "<script>" not in data["title"]
        assert "&lt;script&gt;" in data["title"]
    
    def test_rate_limiting(self, client, auth_headers):
        """Test rate limiting"""
        # Make multiple requests quickly
        for i in range(10):
            response = client.post("/api/workouts/", json={
                "title": f"Workout {i}",
                "duration_minutes": 30
            }, headers=auth_headers)
            
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                break
        
        # Should eventually hit rate limit
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to protected endpoints"""
        response = client.get("/api/users/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        response = client.post("/api/workouts/", json={
            "title": "Test Workout",
            "duration_minutes": 30
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_invalid_token(self, client):
        """Test access with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.get("/api/users/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_expired_token(self, client):
        """Test access with expired token"""
        # Create expired token
        expired_token = security_manager.create_access_token(
            data={"sub": "test@example.com"},
            expires_delta=timedelta(seconds=-1)  # Expired
        )
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/users/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### 2. Input Validation Testing

```python
# tests/test_validation.py
import pytest
from fastapi import status

class TestInputValidation:
    def test_workout_title_validation(self, client, auth_headers):
        """Test workout title validation"""
        # Empty title
        response = client.post("/api/workouts/", json={
            "title": "",
            "duration_minutes": 30
        }, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Title too long
        long_title = "a" * 300
        response = client.post("/api/workouts/", json={
            "title": long_title,
            "duration_minutes": 30
        }, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_duration_validation(self, client, auth_headers):
        """Test duration validation"""
        # Negative duration
        response = client.post("/api/workouts/", json={
            "title": "Test Workout",
            "duration_minutes": -10
        }, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Duration too long
        response = client.post("/api/workouts/", json={
            "title": "Test Workout",
            "duration_minutes": 2000
        }, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_email_validation(self, client):
        """Test email validation"""
        # Invalid email format
        response = client.post("/api/users/", json={
            "email": "invalid-email",
            "full_name": "Test User",
            "password": "password123"
        })
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Valid email
        response = client.post("/api/users/", json={
            "email": "valid@example.com",
            "full_name": "Test User",
            "password": "password123"
        })
        assert response.status_code == status.HTTP_201_CREATED
```

## Performance Testing

### 1. Load Testing

```python
# tests/test_performance.py
import pytest
import time
from concurrent.futures import ThreadPoolExecutor
from fastapi import status

class TestPerformance:
    def test_concurrent_requests(self, client, auth_headers):
        """Test handling of concurrent requests"""
        def make_request():
            response = client.post("/api/workouts/", json={
                "title": "Concurrent Workout",
                "duration_minutes": 30
            }, headers=auth_headers)
            return response.status_code
        
        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # All requests should succeed
        assert all(status_code == status.HTTP_201_CREATED for status_code in results)
    
    def test_response_time(self, client, auth_headers):
        """Test API response time"""
        start_time = time.time()
        
        response = client.get("/api/workouts/", headers=auth_headers)
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == status.HTTP_200_OK
        assert response_time < 1.0  # Should respond within 1 second
    
    def test_large_dataset(self, client, auth_headers, test_user, db_session):
        """Test handling of large datasets"""
        # Create 1000 test workouts
        workouts = []
        for i in range(1000):
            workout = WorkoutSession(
                title=f"Workout {i}",
                duration_minutes=30,
                owner_id=test_user.id
            )
            workouts.append(workout)
        
        db_session.add_all(workouts)
        db_session.commit()
        
        # Test pagination
        response = client.get("/api/workouts/?page=1&size=100", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data) == 100
        assert data["total"] == 1000
```

### 2. Memory Testing

```python
# tests/test_memory.py
import pytest
import psutil
import os
from app.main import app

class TestMemoryUsage:
    def test_memory_leak_prevention(self, client, auth_headers):
        """Test for memory leaks"""
        initial_memory = psutil.Process(os.getpid()).memory_info().rss
        
        # Make many requests
        for i in range(100):
            response = client.post("/api/workouts/", json={
                "title": f"Memory Test Workout {i}",
                "duration_minutes": 30
            }, headers=auth_headers)
            assert response.status_code == status.HTTP_201_CREATED
        
        final_memory = psutil.Process(os.getpid()).memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB)
        assert memory_increase < 50 * 1024 * 1024
```

This comprehensive guide covers all aspects of security and testing used in the FitBuddy project, from basic authentication to advanced security testing and performance optimization.
