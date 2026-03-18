# React Frontend Development - Comprehensive Learning Guide

## Table of Contents
1. [Introduction to React](#introduction-to-react)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Authentication](#authentication)
7. [Routing & Navigation](#routing--navigation)
8. [Styling & UI](#styling--ui)
9. [Performance Optimization](#performance-optimization)
10. [Testing](#testing)
11. [Build & Deployment](#build--deployment)

## Introduction to React

### What is React?
React is a JavaScript library for building user interfaces, particularly web applications. It's developed by Facebook and focuses on creating reusable UI components and managing application state efficiently.

### Key Features
- **Component-Based**: Build encapsulated components that manage their own state
- **Virtual DOM**: Efficient updates and rendering
- **Unidirectional Data Flow**: Predictable data flow from parent to child
- **JSX**: JavaScript syntax extension for writing HTML-like code
- **Hooks**: Modern way to use state and lifecycle features in functional components

### Why React for FitBuddy?
- **Component Reusability**: Fitness components can be reused across different pages
- **State Management**: Complex fitness data requires efficient state handling
- **Performance**: Virtual DOM ensures smooth user experience
- **Ecosystem**: Rich ecosystem of libraries and tools
- **Developer Experience**: Great tooling and debugging capabilities

## Project Structure

```
frontend/
├── public/
│   └── index.html                 # HTML template
├── src/
│   ├── components/               # Reusable components
│   │   ├── DashboardHome.jsx     # Main dashboard component
│   │   ├── Sidebar.jsx           # Navigation sidebar
│   │   ├── WorkoutForm.jsx       # Workout creation form
│   │   ├── ProgressChart.jsx     # Progress visualization
│   │   ├── GoalTracker.jsx      # Goal tracking component
│   │   ├── ExerciseSelector.jsx  # Exercise selection component
│   │   ├── ProgressForm.jsx      # Progress entry form
│   │   └── TimerWidget.jsx       # Workout timer component
│   ├── pages/                    # Page components
│   │   ├── GoalsPage.jsx         # Goals management page
│   │   ├── PlansPage.jsx         # Workout plans page
│   │   ├── ProgressPage.jsx      # Progress tracking page
│   │   └── WorkoutPage.jsx       # Workout logging page
│   ├── App.jsx                   # Main app component
│   ├── AuthPage.jsx              # Authentication page
│   ├── Dashboard.jsx             # Dashboard layout
│   ├── main.jsx                  # Application entry point
│   └── index.css                 # Global styles
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── Dockerfile                    # Docker configuration
└── nginx.conf                    # Nginx configuration
```

## Core Components

### 1. Application Entry Point (`main.jsx`)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 2. Main App Component (`App.jsx`)

```jsx
import React, { useState, useEffect } from 'react'
import AuthPage from './AuthPage.jsx'
import Dashboard from './Dashboard.jsx'

const API_BASE_URL = 'http://localhost:8000'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }

  const handleLogin = (token) => {
    localStorage.setItem('access_token', token)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App
```

### 3. Dashboard Layout (`Dashboard.jsx`)

```jsx
import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import DashboardHome from './components/DashboardHome.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import PlansPage from './pages/PlansPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import WorkoutPage from './pages/WorkoutPage.jsx'

function Dashboard({ onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardHome />
      case 'goals':
        return <GoalsPage />
      case 'plans':
        return <PlansPage />
      case 'progress':
        return <ProgressPage />
      case 'workouts':
        return <WorkoutPage />
      default:
        return <DashboardHome />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
```

## State Management

### 1. Local State with useState

```jsx
import React, { useState } from 'react'

function WorkoutForm() {
  const [formData, setFormData] = useState({
    title: '',
    duration_minutes: '',
    notes: '',
    exercises: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/workouts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Reset form
        setFormData({
          title: '',
          duration_minutes: '',
          notes: '',
          exercises: []
        })
        // Show success message
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create workout')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Workout Title
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          required
        />
      </div>
      
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Workout'}
      </button>
    </form>
  )
}
```

### 2. Complex State Management

```jsx
import React, { useState, useEffect, useCallback } from 'react'

function DashboardHome() {
  const [goals, setGoals] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dailyCalories, setDailyCalories] = useState(0)

  // Memoized function to calculate total calories
  const calculateTotalCalories = useCallback((workouts) => {
    if (!workouts || !Array.isArray(workouts)) return 0
    
    return workouts.reduce((sum, workout) => {
      return sum + (workout.calories_burned || 0)
    }, 0)
  }, [])

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('access_token')

      // Fetch user data
      const userRes = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
      }

      // Fetch goals data
      const goalsRes = await fetch(`${API_BASE_URL}/api/goals/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        setGoals(Array.isArray(goalsData) ? goalsData.slice(0, 3) : [])
      }

      // Fetch workouts data
      const workoutsRes = await fetch(`${API_BASE_URL}/api/workouts/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json()
        const sortedWorkouts = Array.isArray(workoutsData)
          ? workoutsData
              .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
              .slice(0, 3)
          : []
        setWorkouts(sortedWorkouts)

        // Calculate total calories
        const allWorkouts = Array.isArray(workoutsData) ? workoutsData : []
        const totalCalories = calculateTotalCalories(allWorkouts)
        setDailyCalories(totalCalories)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [calculateTotalCalories])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Dashboard content */}
    </div>
  )
}
```

## API Integration

### 1. API Service Module

```jsx
// utils/api.js
const API_BASE_URL = 'http://localhost:8000'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  getAuthHeaders() {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // User endpoints
  async getCurrentUser() {
    return this.request('/api/users/me')
  }

  // Workout endpoints
  async getWorkouts() {
    return this.request('/api/workouts/')
  }

  async createWorkout(workoutData) {
    return this.request('/api/workouts/', {
      method: 'POST',
      body: JSON.stringify(workoutData)
    })
  }

  async updateWorkout(id, workoutData) {
    return this.request(`/api/workouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(workoutData)
    })
  }

  async deleteWorkout(id) {
    return this.request(`/api/workouts/${id}`, {
      method: 'DELETE'
    })
  }

  // Goals endpoints
  async getGoals() {
    return this.request('/api/goals/')
  }

  async createGoal(goalData) {
    return this.request('/api/goals/', {
      method: 'POST',
      body: JSON.stringify(goalData)
    })
  }

  // Progress endpoints
  async getProgressEntries() {
    return this.request('/api/progress/')
  }

  async createProgressEntry(progressData) {
    return this.request('/api/progress/', {
      method: 'POST',
      body: JSON.stringify(progressData)
    })
  }
}

export const apiService = new ApiService()
```

### 2. Custom Hooks for API Calls

```jsx
// hooks/useApi.js
import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../utils/api'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getWorkouts()
      setWorkouts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkout = useCallback(async (workoutData) => {
    try {
      setLoading(true)
      setError(null)
      const newWorkout = await apiService.createWorkout(workoutData)
      setWorkouts(prev => [newWorkout, ...prev])
      return newWorkout
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateWorkout = useCallback(async (id, workoutData) => {
    try {
      setLoading(true)
      setError(null)
      const updatedWorkout = await apiService.updateWorkout(id, workoutData)
      setWorkouts(prev => prev.map(workout => 
        workout.id === id ? updatedWorkout : workout
      ))
      return updatedWorkout
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteWorkout = useCallback(async (id) => {
    try {
      setLoading(true)
      setError(null)
      await apiService.deleteWorkout(id)
      setWorkouts(prev => prev.filter(workout => workout.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  return {
    workouts,
    loading,
    error,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    refetch: fetchWorkouts
  }
}
```

## Authentication

### 1. Authentication Page (`AuthPage.jsx`)

```jsx
import React, { useState } from 'react'

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/token' : '/api/users/'
      const method = isLogin ? 'POST' : 'POST'
      
      const body = isLogin 
        ? new URLSearchParams({
            username: formData.email,
            password: formData.password,
            grant_type: 'password'
          })
        : JSON.stringify(formData)

      const headers = isLogin
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : { 'Content-Type': 'application/json' }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body
      })

      if (response.ok) {
        const data = await response.json()
        if (isLogin) {
          onLogin(data.access_token)
        } else {
          // After registration, automatically log in
          const loginResponse = await fetch(`${API_BASE_URL}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: formData.email,
              password: formData.password,
              grant_type: 'password'
            })
          })
          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            onLogin(loginData.access_token)
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Authentication failed')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to FitBuddy' : 'Create your FitBuddy account'}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-500"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuthPage
```

## Routing & Navigation

### 1. Sidebar Navigation (`components/Sidebar.jsx`)

```jsx
import React from 'react'
import { 
  Home, 
  Target, 
  Calendar, 
  BarChart3, 
  Dumbbell, 
  LogOut,
  User
} from 'lucide-react'

function Sidebar({ activePage, onPageChange, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'plans', label: 'Plans', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell }
  ]

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600">FitBuddy</h1>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                activePage === item.id 
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' 
                  : 'text-gray-700'
              }`}
            >
              <Icon size={20} className="mr-3" />
              {item.label}
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-0 w-64 p-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-6 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar
```

## Styling & UI

### 1. Tailwind CSS Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### 2. Component Styling Examples

```jsx
// Progress Chart Component
function ProgressChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Progress Overview</h2>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100 transition-colors">
            7 Days
          </button>
          <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            30 Days
          </button>
        </div>
      </div>
      
      <div className="h-64 flex items-end justify-between space-x-2">
        {[65, 70, 68, 75, 80, 78, 85].map((value, index) => (
          <div key={index} className="flex flex-col items-center space-y-2">
            <div 
              className="w-8 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all duration-500 hover:from-primary-600 hover:to-primary-500"
              style={{ height: `${value}%` }}
            ></div>
            <span className="text-xs text-gray-500">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3. Responsive Design

```jsx
function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Steps', value: '2,500' },
          { label: 'Water', value: '1.25 Liters' },
          { label: 'Calories Burned', value: '450 cal' },
          { label: 'Heart Rate', value: '110 Bpm' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-primary-700">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProgressChart />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Goals</h3>
            {/* Goals content */}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Performance Optimization

### 1. React.memo for Component Memoization

```jsx
import React, { memo } from 'react'

const WorkoutCard = memo(function WorkoutCard({ workout, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{workout.title}</h3>
          <p className="text-sm text-gray-500">
            {new Date(workout.performed_at).toLocaleDateString()}
          </p>
          {workout.duration_minutes && (
            <p className="text-sm text-gray-500">
              {workout.duration_minutes} minutes
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(workout)}
            className="text-primary-600 hover:text-primary-700"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(workout.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
})

export default WorkoutCard
```

### 2. useMemo for Expensive Calculations

```jsx
import React, { useMemo } from 'react'

function DashboardHome({ workouts, goals }) {
  const workoutStats = useMemo(() => {
    if (!workouts || !Array.isArray(workouts)) {
      return { totalWorkouts: 0, totalCalories: 0, avgDuration: 0 }
    }

    const totalWorkouts = workouts.length
    const totalCalories = workouts.reduce((sum, workout) => 
      sum + (workout.calories_burned || 0), 0
    )
    const avgDuration = workouts.reduce((sum, workout) => 
      sum + (workout.duration_minutes || 0), 0
    ) / totalWorkouts

    return { totalWorkouts, totalCalories, avgDuration }
  }, [workouts])

  const goalProgress = useMemo(() => {
    if (!goals || !Array.isArray(goals)) return []

    return goals.map(goal => ({
      ...goal,
      progressPercentage: Math.min((goal.current_value / goal.target_value) * 100, 100)
    }))
  }, [goals])

  return (
    <div className="space-y-6">
      {/* Use calculated stats */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {workoutStats.totalWorkouts} Workouts Completed
        </h2>
        <p className="text-lg text-gray-600">
          {Math.round(workoutStats.totalCalories)} calories burned
        </p>
      </div>
    </div>
  )
}
```

### 3. Lazy Loading Components

```jsx
import React, { lazy, Suspense } from 'react'

// Lazy load heavy components
const ProgressChart = lazy(() => import('./components/ProgressChart'))
const GoalTracker = lazy(() => import('./components/GoalTracker'))

function Dashboard() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>}>
        <ProgressChart />
      </Suspense>
      
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>}>
        <GoalTracker />
      </Suspense>
    </div>
  )
}
```

## Testing

### 1. Component Testing with React Testing Library

```jsx
// __tests__/WorkoutForm.test.jsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutForm from '../components/WorkoutForm'

// Mock fetch
global.fetch = jest.fn()

describe('WorkoutForm', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('renders form fields', () => {
    render(<WorkoutForm />)
    
    expect(screen.getByLabelText(/workout title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create workout/i })).toBeInTheDocument()
  })

  test('submits form with valid data', async () => {
    const mockResponse = {
      id: 1,
      title: 'Test Workout',
      duration_minutes: 30,
      notes: 'Test notes'
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(<WorkoutForm />)

    fireEvent.change(screen.getByLabelText(/workout title/i), {
      target: { value: 'Test Workout' }
    })
    fireEvent.change(screen.getByLabelText(/duration/i), {
      target: { value: '30' }
    })
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: 'Test notes' }
    })

    fireEvent.click(screen.getByRole('button', { name: /create workout/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/workouts/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            title: 'Test Workout',
            duration_minutes: '30',
            notes: 'Test notes'
          })
        })
      )
    })
  })

  test('displays error message on failed submission', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WorkoutForm />)

    fireEvent.change(screen.getByLabelText(/workout title/i), {
      target: { value: 'Test Workout' }
    })
    fireEvent.click(screen.getByRole('button', { name: /create workout/i }))

    await waitFor(() => {
      expect(screen.getByText(/network error occurred/i)).toBeInTheDocument()
    })
  })
})
```

### 2. Custom Hook Testing

```jsx
// __tests__/useWorkouts.test.js
import { renderHook, waitFor } from '@testing-library/react'
import { useWorkouts } from '../hooks/useApi'
import { apiService } from '../utils/api'

// Mock API service
jest.mock('../utils/api')

describe('useWorkouts', () => {
  beforeEach(() => {
    apiService.getWorkouts.mockClear()
    apiService.createWorkout.mockClear()
  })

  test('fetches workouts on mount', async () => {
    const mockWorkouts = [
      { id: 1, title: 'Workout 1' },
      { id: 2, title: 'Workout 2' }
    ]

    apiService.getWorkouts.mockResolvedValueOnce(mockWorkouts)

    const { result } = renderHook(() => useWorkouts())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.workouts).toEqual(mockWorkouts)
    expect(apiService.getWorkouts).toHaveBeenCalledTimes(1)
  })

  test('creates workout successfully', async () => {
    const newWorkout = { id: 3, title: 'New Workout' }
    const existingWorkouts = [{ id: 1, title: 'Workout 1' }]

    apiService.getWorkouts.mockResolvedValueOnce(existingWorkouts)
    apiService.createWorkout.mockResolvedValueOnce(newWorkout)

    const { result } = renderHook(() => useWorkouts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.createWorkout({ title: 'New Workout' })

    expect(result.current.workouts).toHaveLength(2)
    expect(result.current.workouts[0]).toEqual(newWorkout)
  })
})
```

## Build & Deployment

### 1. Build Configuration (`package.json`)

```json
{
  "name": "fitbuddy-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext js,jsx --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "vite": "^4.4.5",
    "vitest": "^0.34.1"
  }
}
```

### 2. Vite Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  }
})
```

### 3. Production Dockerfile

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

## Best Practices

### 1. Component Design
- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Use composition to build complex UIs
- **Props Interface**: Define clear prop interfaces
- **Default Props**: Provide sensible defaults
- **Error Boundaries**: Implement error boundaries for graceful error handling

### 2. State Management
- **Local State**: Use local state for component-specific data
- **Lifting State Up**: Move shared state to common parent
- **Custom Hooks**: Extract reusable stateful logic
- **Context API**: Use for global state that doesn't change often

### 3. Performance
- **Memoization**: Use React.memo, useMemo, and useCallback appropriately
- **Code Splitting**: Implement lazy loading for large components
- **Bundle Analysis**: Regularly analyze bundle size
- **Image Optimization**: Optimize images and use appropriate formats

### 4. Code Quality
- **ESLint**: Use ESLint for code quality
- **Prettier**: Use Prettier for code formatting
- **TypeScript**: Consider using TypeScript for better type safety
- **Testing**: Write comprehensive tests

### 5. Accessibility
- **Semantic HTML**: Use semantic HTML elements
- **ARIA Labels**: Add ARIA labels for screen readers
- **Keyboard Navigation**: Ensure keyboard accessibility
- **Color Contrast**: Maintain proper color contrast ratios

This comprehensive guide covers all aspects of React frontend development used in the FitBuddy project, from basic concepts to advanced patterns and best practices.
