# FitBuddy - Comprehensive Fitness Tracking Platform

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/FastAPI-0.104+-green.svg" alt="FastAPI Version">
  <img src="https://img.shields.io/badge/React-18+-61dafb.svg" alt="React Version">
  <img src="https://img.shields.io/badge/Docker-Supported-2496ed.svg" alt="Docker Support">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</div>

## 🏋️ Overview

FitBuddy is a modern, comprehensive fitness tracking platform that combines the power of microservices architecture with real-time analytics and personalized workout recommendations. Built with cutting-edge technologies, it provides users with a complete fitness management solution.

### 🎯 Key Features

- **📊 Real-time Analytics**: Advanced calorie burn calculation using MET values
- **🎯 Goal Tracking**: Set and monitor fitness objectives with progress visualization
- **💪 Workout Management**: Log exercises, track performance, and analyze trends
- **📈 Progress Monitoring**: Comprehensive progress tracking with detailed insights
- **🤖 AI-Powered Plans**: Personalized workout plan generation based on user goals
- **📱 Modern UI**: Responsive React frontend with beautiful, intuitive design
- **🔒 Enterprise Security**: JWT authentication, role-based access control, and data encryption
- **⚡ High Performance**: Asynchronous processing with background tasks and caching

## 🏗️ Architecture

FitBuddy follows a service-oriented architecture pattern with the following components:

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │   FastAPI        │
│   (React)       │◄──►│   Backend        │
└─────────────────┘    └──────────────────┘
                                │
                                │
                                ▼
                     ┌──────────────────┐
                     │ PostgreSQL / MQ  │
                     │ Redis / Celery   │
                     └──────────────────┘
```

### 🔧 Technology Stack

**Backend Services:**
- **FastAPI**: Modern Python web framework for the main API
- **PostgreSQL**: Primary database with advanced indexing
- **Redis**: Caching and session management
- **RabbitMQ**: Message queuing for asynchronous processing
- **Celery**: Background task processing

**Frontend:**
- **React 18**: Modern JavaScript framework
- **Tailwind CSS**: Utility-first CSS framework
- **Next.js 15**: Full-stack React framework

**Infrastructure:**
- **Docker**: Containerization for all services
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### 🐳 Docker Deployment (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/fitbuddy.git
   cd fitbuddy
   ```

2. **Start all services (frontend + backend + infra):**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend App: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### 🛠️ Local Development

#### Backend Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://fitbuddy:fitbuddy123@localhost:5432/fitbuddy"
   export SECRET_KEY="your-secret-key-here"
   export REDIS_URL="redis://localhost:6379"
   export RABBITMQ_URL="amqp://guest:guest@localhost:5672/"
   ```

4. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend:**
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Backend Development Guide](docs/BACKEND_LEARNING_GUIDE.md)** - FastAPI, SQLAlchemy, and Python best practices
- **[Frontend Development Guide](docs/FRONTEND_LEARNING_GUIDE.md)** - React, Tailwind CSS, and modern JavaScript
- **[Docker & Containerization](docs/DOCKERIZATION_LEARNING_GUIDE.md)** - Docker, Docker Compose, and deployment
- **[Messaging & Queues](docs/MESSAGING_QUEUES_LEARNING_GUIDE.md)** - RabbitMQ, Redis, and Celery integration
- **[API Documentation](docs/API_DOCUMENTATION_LEARNING_GUIDE.md)** - OpenAPI, Swagger, and API design
- **[Database Design](docs/DATABASE_DESIGN_LEARNING_GUIDE.md)** - PostgreSQL, SQLAlchemy, and data modeling
- **[Security & Testing](docs/SECURITY_TESTING_LEARNING_GUIDE.md)** - Authentication, authorization, and testing strategies
- **[Calorie Burn Microservice](docs/CALORIE_BURN_MICROSERVICE_GUIDE.md)** - Complete implementation guide
- **[Implementation Checklist](docs/MICROSERVICE_IMPLEMENTATION_CHECKLIST.md)** - Step-by-step development guide

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/token` - User login
- `POST /api/users/` - User registration
- `GET /api/users/me` - Get current user profile

### Workouts
- `GET /api/workouts/` - List user workouts
- `POST /api/workouts/` - Create new workout
- `GET /api/workouts/{id}` - Get specific workout
- `PATCH /api/workouts/{id}` - Update workout
- `DELETE /api/workouts/{id}` - Delete workout

### Goals
- `GET /api/goals/` - List user goals
- `POST /api/goals/` - Create new goal
- `GET /api/goals/{id}` - Get specific goal
- `PATCH /api/goals/{id}` - Update goal
- `DELETE /api/goals/{id}` - Delete goal

## 🧪 Testing

### Run Tests

```bash
# Backend tests
pytest tests/

# Frontend tests
cd frontend && npm test

# Integration tests
pytest tests/integration/

# Security tests
pytest tests/security/
```

### Test Coverage

```bash
# Generate coverage report
pytest --cov=app tests/
coverage html
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing
- **Role-Based Access Control**: Granular permission system
- **Rate Limiting**: API rate limiting and abuse prevention
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Cross-origin resource sharing configuration
- **Security Headers**: Comprehensive security headers
- **Data Encryption**: Sensitive data encryption at rest

## 📊 Performance Features

- **Asynchronous Processing**: Background task processing
- **Database Optimization**: Advanced indexing and query optimization
- **Caching**: Redis-based caching for improved performance
- **Connection Pooling**: Database connection pooling
- **Load Balancing**: Horizontal scaling support
- **Monitoring**: Comprehensive performance monitoring

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI team for the excellent web framework
- React team for the powerful frontend library
- PostgreSQL team for the reliable database system
- All contributors and the open-source community

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/fitbuddy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/fitbuddy/discussions)
- **Email**: support@fitbuddy.com

---

<div align="center">
  <p>Built with ❤️ by the FitBuddy Team</p>
  <p>⭐ Star this repository if you found it helpful!</p>
</div>

