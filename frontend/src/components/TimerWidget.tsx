'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, RotateCcw, Clock } from 'lucide-react'

export default function TimerWidget() {
  const [time, setTime] = useState(0) // time in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [laps, setLaps] = useState([])
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1)
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, isPaused])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const handlePause = () => {
    setIsPaused(true)
    setIsRunning(false)
  }

  const handleResume = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    setTime(0)
    setLaps([])
  }

  const handleReset = () => {
    setTime(0)
    setLaps([])
    setIsRunning(false)
    setIsPaused(false)
  }

  const handleLap = () => {
    if (isRunning || isPaused) {
      setLaps(prevLaps => [...prevLaps, {
        id: Date.now(),
        time: time,
        formattedTime: formatTime(time)
      }])
    }
  }

  const getTimerColor = () => {
    if (time === 0) return 'text-gray-400'
    if (time < 60) return 'text-green-600'
    if (time < 300) return 'text-blue-600' // 5 minutes
    if (time < 900) return 'text-orange-600' // 15 minutes
    return 'text-red-600'
  }

  const getTimerSize = () => {
    if (time === 0) return 'text-4xl'
    if (time < 60) return 'text-5xl'
    if (time < 300) return 'text-6xl'
    return 'text-7xl'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-primary-600 grid place-items-center text-white">
          <Clock size={18} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Workout Timer</h2>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className={`font-mono font-bold ${getTimerSize()} ${getTimerColor()} mb-2 transition-all duration-300`}>
          {formatTime(time)}
        </div>
        <div className="text-sm text-gray-500">
          {time === 0 ? 'Ready to start' : 
           isRunning ? 'Running' : 
           isPaused ? 'Paused' : 'Stopped'}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-3 mb-6">
        {!isRunning && !isPaused && (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            <Play size={18} />
            Start
          </button>
        )}

        {isRunning && !isPaused && (
          <>
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
            >
              <Pause size={18} />
              Pause
            </button>
            <button
              onClick={handleLap}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Square size={18} />
              Lap
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={handleResume}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <Play size={18} />
              Resume
            </button>
            <button
              onClick={handleLap}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Square size={18} />
              Lap
            </button>
          </>
        )}

        {(isRunning || isPaused) && (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            <Square size={18} />
            Stop
          </button>
        )}

        {!isRunning && !isPaused && time > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        )}
      </div>

      {/* Lap Times */}
      {laps.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lap Times</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {laps.map((lap, index) => (
              <div key={lap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Lap {index + 1}</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{lap.formattedTime}</span>
              </div>
            ))}
          </div>
          
          {laps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Laps:</span>
                <span className="font-semibold text-gray-900">{laps.length}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTime(300)} // 5 minutes
            className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set 5 min
          </button>
          <button
            onClick={() => setTime(600)} // 10 minutes
            className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set 10 min
          </button>
          <button
            onClick={() => setTime(900)} // 15 minutes
            className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set 15 min
          </button>
          <button
            onClick={() => setTime(1800)} // 30 minutes
            className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set 30 min
          </button>
        </div>
      </div>
    </div>
  )
}
