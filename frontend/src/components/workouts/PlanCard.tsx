import React from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui'
import { getLevelVariant } from './helpers'
import { WorkoutPlan } from './types'

type PlanCardProps = {
  plan: WorkoutPlan
  subscribed?: boolean
  onToggleSubscribe: (plan: WorkoutPlan) => void
  onViewDetails: (planId: number) => void
}

export default function PlanCard({ plan, subscribed, onToggleSubscribe, onViewDetails }: PlanCardProps) {
  return (
    <Card className="h-full transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="items-start">
        <div className="space-y-2">
          <CardTitle>{plan.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getLevelVariant(plan.level) as any}>{plan.level || 'All levels'}</Badge>
            {plan.isDraft ? <Badge variant="custom">Draft</Badge> : <Badge variant="upcoming">AI Recommended</Badge>}
          </div>
        </div>
        {subscribed ? <CheckCircle2 size={18} className="text-green-600" /> : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="min-h-12 text-sm text-gray-600">{plan.description || 'A structured plan designed to keep you consistent.'}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={15} />
          <span>{plan.duration_days || 30} days</span>
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => onViewDetails(plan.id)}>
          View Plan
        </Button>
        <Button type="button" variant={subscribed ? 'secondary' : 'primary'} onClick={() => onToggleSubscribe(plan)}>
          {subscribed ? 'Unfollow' : 'Follow'}
        </Button>
      </CardFooter>
    </Card>
  )
}
