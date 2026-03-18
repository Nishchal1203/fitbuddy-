'use client'

import React, { useState } from 'react'
import { Plus, X, Clock, FileText, Dumbbell } from 'lucide-react'
import ExerciseSelector from './ExerciseSelector'

const API_BASE_URL = 'http://localhost:8000'

export default function WorkoutForm() {
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    duration_minutes: '',
    performed_at: new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM format
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/workouts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          performed_at: formData.performed_at ? new Date(formData.performed_at).toISOString() : null,
          exercises: selectedExercises
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create workout')
      }

      const workoutData = await response.json()
      setSuccess(`Workout "${workoutData.title}" logged successfully!`)
      
      // Reset form
      setFormData({
        title: '',
        notes: '',
        duration_minutes: '',
        performed_at: new Date().toISOString().slice(0, 16)
      })
      setSelectedExercises([])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleExerciseSelect = (exercise) => {
    setSelectedExercises(prev => [...prev, exercise])
  }

  const handleRemoveExercise = (exerciseId) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== exerciseId))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-primary-600 grid place-items-center text-white">
          <Plus size={18} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Log New Workout</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" data-lpignore="true">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Workout Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Morning Cardio, Upper Body Strength"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          />
        </div>

        {/* Exercise Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Exercises
            </label>
            <button
              type="button"
              onClick={() => setShowExerciseSelector(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Dumbbell size={14} />
              Add Exercise
            </button>
          </div>
          
          {selectedExercises.length === 0 ? (
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              <Dumbbell size={24} className="mx-auto mb-2" />
              <p className="text-sm">No exercises selected</p>
              <p className="text-xs">Click "Add Exercise" to include exercises in your workout</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedExercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                    <p className="text-sm text-gray-600">{exercise.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exercise.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="performed_at" className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <div className="relative">
              <input
                id="performed_at"
                name="performed_at"
                type="datetime-local"
                value={formData.performed_at}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              />
              <Clock size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min="1"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              placeholder="45"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <div className="relative">
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="How did the workout feel? Any observations or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 resize-none"
            />
            <FileText size={16} className="absolute right-3 top-3 text-gray-400" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              loading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
            }`}
          >
            {loading ? 'Logging Workout...' : 'Log Workout'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setFormData({
                title: '',
                notes: '',
                duration_minutes: '',
                performed_at: new Date().toISOString().slice(0, 16)
              })
              setError('')
              setSuccess('')
            }}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
          >
            <X size={18} />
          </button>
        </div>
      </form>

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        isOpen={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleExerciseSelect}
      />
    </div>
  )
}
