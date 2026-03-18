'use client'

import React from 'react'
import GoalTracker from '@/components/GoalTracker'

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Goals</h1>
        <p className="text-gray-500">Set and track your fitness goals to stay motivated.</p>
      </div>

      <GoalTracker />
    </div>
  )
}


