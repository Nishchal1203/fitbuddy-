'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui'
import type { CompletedGoal } from './types'

type CompletedGoalCardProps = {
  goal: CompletedGoal
}

export default function CompletedGoalCard({ goal }: CompletedGoalCardProps) {
  return (
    <Card className="flex items-center justify-between gap-4 rounded-2xl bg-[#F0E4F9] px-5 py-4 shadow-none">
      <div className="space-y-0.5">
        <h3 className="font-bold text-brand-slate">{goal.title}</h3>
        <p className="text-sm text-brand-slate/55 line-through">{goal.achievedLabel}</p>
      </div>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-gold text-white shadow-sm">
        <Check size={18} />
      </div>
    </Card>
  )
}
