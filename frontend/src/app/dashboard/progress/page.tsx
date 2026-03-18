'use client'

import React, { useState } from 'react'
import ProgressChart from '@/components/ProgressChart'
import ProgressForm from '@/components/ProgressForm'

export default function ProgressPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleProgressAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Progress</h1>
        <p className="text-gray-500">Track your fitness journey with detailed progress charts and log your metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressForm onProgressAdded={handleProgressAdded} />
        <ProgressChart refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}


