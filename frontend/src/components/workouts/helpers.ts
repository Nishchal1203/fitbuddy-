import { WorkoutPlan } from './types'

export function getLevelVariant(level?: string | null) {
  const normalized = level?.toLowerCase()
  if (normalized === 'beginner') return 'beginner'
  if (normalized === 'intermediate') return 'intermediate'
  if (normalized === 'advanced') return 'advanced'
  return 'muted'
}

export function getProgressPercent(startDate?: string | null, durationDays?: number | null) {
  if (!startDate || !durationDays || durationDays <= 0) return 0

  const start = new Date(startDate)
  const now = new Date()
  const elapsedMs = now.getTime() - start.getTime()
  const totalMs = durationDays * 24 * 60 * 60 * 1000

  if (elapsedMs <= 0) return 0
  return Math.max(1, Math.min(100, Math.round((elapsedMs / totalMs) * 100)))
}

export function getNextSessionText(plan: WorkoutPlan, progress: number) {
  if (plan.isDraft) return 'Pending backend sync'
  if (progress >= 100) return 'Plan completed'
  const level = plan.level?.toLowerCase()
  if (level === 'beginner') return 'Next: Foundation Flow'
  if (level === 'intermediate') return 'Next: Strength Circuit'
  if (level === 'advanced') return 'Next: Peak Performance Day'
  return 'Next: Core Session'
}
