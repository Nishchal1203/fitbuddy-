'use client'

import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import ProgressChart from '@/components/ProgressChart'
const API_BASE_URL = 'http://localhost:8000'
const ANALYTICS_API_URL = 'http://localhost:8081'

export default function DashboardHome() {
  const [goals, setGoals] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentQuote, setCurrentQuote] = useState('')
  const [dailyCalories, setDailyCalories] = useState(0)

  // Motivational quotes array
  const motivationalQuotes = [
    "Every workout counts. Every rep matters. Every step forward is progress.",
    "The only bad workout is the one that didn't happen.",
    "Your body can do it. It's your mind you have to convince.",
    "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Fitness is not about being better than someone else. It's about being better than you used to be.",
    "Don't wish for it, work for it.",
    "The hardest part of any workout is showing up.",
    "You are stronger than you think, more capable than you imagine.",
    "Progress, not perfection, is the goal.",
    "Every expert was once a beginner. Every pro was once an amateur.",
    "The body achieves what the mind believes.",
    "Success isn't always about greatness. It's about consistency.",
    "You don't have to be great to get started, but you have to get started to be great.",
    "The only impossible journey is the one you never begin."
  ]

  // Calculate total calories from workout data
  const calculateTotalCalories = (workouts) => {
    if (!workouts || !Array.isArray(workouts)) return 0
    
    // Sum up calories from all workouts
    const totalCalories = workouts.reduce((sum, workout) => {
      return sum + (workout.calories_burned || 0)
    }, 0)
    
    return totalCalories
  }


  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('access_token')
      
      // Fetch user data
      const userRes = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
      }

      // Fetch goals data
      const goalsRes = await fetch(`${API_BASE_URL}/api/goals/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        setGoals(Array.isArray(goalsData) ? goalsData.slice(0, 3) : [])
      }

      // Fetch recent workouts
      const workoutsRes = await fetch(`${API_BASE_URL}/api/workouts/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json()
        // Sort by performed_at date (most recent first) and take first 3
        const sortedWorkouts = Array.isArray(workoutsData) 
          ? workoutsData
              .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
              .slice(0, 3)
          : []
        setWorkouts(sortedWorkouts)
        
        // Calculate total calories from all workouts (not just recent ones)
        const allWorkouts = Array.isArray(workoutsData) ? workoutsData : []
        const totalCalories = calculateTotalCalories(allWorkouts)
        setDailyCalories(totalCalories)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Get random motivational quote
  const getRandomQuote = () => {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
  }

  // Set initial quote
  useEffect(() => {
    setCurrentQuote(getRandomQuote())
  }, [])

  // Refresh quote function
  const refreshQuote = () => {
    setCurrentQuote(getRandomQuote())
  }

  // Refresh all data function
  const refreshData = () => {
    setLoading(true)
    fetchData()
  }

  // Get user's first name
  const getFirstName = () => {
    if (!user?.full_name) return 'Champion'
    return user.full_name.split(' ')[0]
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl p-6 border border-primary-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {getFirstName()}! 👋
            </h1>
            <p className="text-lg text-primary-700 font-medium italic">
              "{currentQuote}"
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Here's your fitness overview for today.
            </p>
          </div>
          <button
            onClick={refreshQuote}
            className="ml-4 p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
            title="Get new motivational quote"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Steps', value: '2,500' },
          { label: 'Water', value: '1.25 Liters' },
          { 
            label: 'Calories Burned', 
            value: dailyCalories > 0 ? `${Math.round(dailyCalories)} cal` : 'No data',
            subtitle: 'Based on workout data'
          },
          { label: 'Heart Rate', value: '110 Bpm' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-primary-700">{card.value}</div>
            {card.subtitle && (
              <div className="text-xs text-gray-400 mt-1">{card.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProgressChart />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Today's Goals</h2>
          </div>
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <ul className="space-y-2">
              {goals.length === 0 ? (
                <li className="text-sm text-gray-500">No goals yet.</li>
              ) : (
                goals.map((g) => (
                  <li key={g.id || g.title} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <span className="font-medium text-gray-800">{g.title || g.name}</span>
                    <span className="text-xs text-gray-500">{g.status || ''}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded bg-blue-100 grid place-items-center">
              <span className="text-blue-600 text-sm font-bold">💪</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Workouts</h3>
          </div>
          <div className="space-y-2">
            {workouts.length === 0 ? (
              <>
                <div className="text-sm text-gray-500">No recent workouts logged</div>
                <div className="text-xs text-gray-400">Start logging your workouts to see them here</div>
              </>
            ) : (
              workouts.map((workout) => (
                <div key={workout.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{workout.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(workout.performed_at).toLocaleDateString()} 
                      {workout.duration_minutes && ` • ${workout.duration_minutes} min`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      {workout.exercises?.length || 0} exercises
                    </div>
                    {workout.calories_burned && (
                      <div className="text-xs text-orange-600 font-medium">
                        {Math.round(workout.calories_burned)} cal
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded bg-green-100 grid place-items-center">
              <span className="text-green-600 text-sm font-bold">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium">{workouts.length} workouts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Progress</span>
              <span className="font-medium">4 metrics</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Goals</span>
              <span className="font-medium">{goals.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded bg-purple-100 grid place-items-center">
              <span className="text-purple-600 text-sm font-bold">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left p-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Log New Workout
            </button>
            <button className="w-full text-left p-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Add Progress Entry
            </button>
            <button className="w-full text-left p-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Set New Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


