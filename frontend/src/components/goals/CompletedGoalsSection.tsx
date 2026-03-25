'use client'

import React from 'react'
import type { CompletedGoal } from './types'
import CompletedGoalCard from './CompletedGoalCard'

type CompletedGoalsSectionProps = {
  goals: CompletedGoal[]
}

export default function CompletedGoalsSection({ goals }: CompletedGoalsSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-brand-slate">
        Completed Goals
        <span className="ml-2 rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-semibold text-brand-gold">{goals.length}</span>
      </h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {goals.map((goal) => (
          <CompletedGoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </section>
  )
}
