'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Flame, Calendar, Award, TrendingUp } from 'lucide-react'
import { API_BASE_URL, buildAuthHeaders } from '@/lib/api'
import flame from '@/assets/Fire.svg'

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type StreakData = {
  current_streak: number       // consecutive days with a workout
  longest_streak: number       // all-time best
  total_workout_days: number   // total days ever worked out
  last_workout_date: string    // ISO date
  weekly_activity: boolean[]   // last 7 days — true = worked out
}

/* ─────────────────────────────────────────────
   FALLBACK
───────────────────────────────────────────── */
const FALLBACK: StreakData = {
  current_streak:    12,
  longest_streak:    21,
  total_workout_days: 87,
  last_workout_date: new Date().toISOString(),
  weekly_activity:   [true, true, false, true, true, true, true],
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getStreakMessage(streak: number): string {
  if (streak === 0)  return "Start your streak today! 💪"
  if (streak < 3)    return "Good start! Keep going 🌱"
  if (streak < 7)    return "You're building momentum! 🔥"
  if (streak < 14)   return "One week+ streak! Incredible 🚀"
  if (streak < 30)   return "Two weeks strong! You're unstoppable 💥"
  return "Elite consistency! Legendary 🏆"
}

function getFlameColor(streak: number): string {
  if (streak === 0) return '#D9AAE3'   // brand-mauve — inactive
  if (streak < 7)   return '#FCB60F'   // brand-gold
  if (streak < 14)  return '#F97316'   // orange
  return '#EF4444'                     // red-hot
}

function formatLastWorkout(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

/* ─────────────────────────────────────────────
   FLAME ANIMATION (pure CSS rings)
───────────────────────────────────────────── */
function FlameRing({ streak }: { streak: number }) {
  const flameColor = getFlameColor(streak)
  const isActive   = streak > 0

  return (
    <div className="relative flex items-center justify-center">
      {/* outer glow ring */}
      {isActive && (
        <div
          className="absolute h-28 w-28 rounded-full opacity-20 animate-ping"
          style={{ backgroundColor: flameColor }}
        />
      )}
      {/* mid ring */}
      <div
        className="absolute h-24 w-24 rounded-full opacity-15"
        style={{ backgroundColor: isActive ? flameColor : '#E9D3F2' }}
      />
      {/* inner circle */}
      <div
        className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full text-white shadow-lg"
        style={{
          background: isActive
            ? `radial-gradient(circle at 40% 40%, ${flameColor}cc, ${flameColor})`
            : 'linear-gradient(135deg, #D9AAE3, #9567B9)',
        }}
      >
        <Flame
          size={22}
          className="mb-0.5"
          style={{ color: isActive ? '#fff' : '#fff8' }}
        />
        <span className="text-xl font-bold leading-none">{streak}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
          days
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   WEEKLY ACTIVITY DOTS
───────────────────────────────────────────── */
function WeeklyDots({ activity }: { activity: boolean[] }) {
  // align to Mon–Sun — pad if needed
  const days = [...activity].slice(-7)
  while (days.length < 7) days.unshift(false)

  return (
    <div className="flex items-end gap-1.5">
      {days.map((active, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`h-8 w-6 rounded-lg transition-all ${
              active
                ? 'bg-gradient-to-t from-brand-deep to-brand-soft shadow-sm'
                : 'bg-brand-pale'
            }`}
          />
          <span className="text-[9px] font-medium text-brand-slate/50">
            {DAY_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAT PILL
───────────────────────────────────────────── */
function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-pale bg-brand-bg px-4 py-3 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-brand-deep text-white">
        {icon}
      </div>
      <span className="text-lg font-bold text-brand-slate">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-slate/45">
        {label}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */
function StreakSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-brand-pale" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/2 rounded bg-brand-pale" />
          <div className="h-3 w-2/3 rounded bg-brand-pale" />
        </div>
      </div>
      <div className="flex gap-1.5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-8 w-6 rounded-lg bg-brand-pale" />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function StreakCounter() {
  const [data,       setData]       = useState<StreakData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/streak`, {
        headers: buildAuthHeaders(),
      })
      if (!res.ok) throw new Error('API error')
      setData(await res.json())
      setIsFallback(false)
    } catch {
      setData(FALLBACK)
      setIsFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-brand-slate">Workout Streak</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Auto-tracked from completed workouts
          </p>
        </div>
        {data && !loading && (
          <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-brand-purple">
            Last: {formatLastWorkout(data.last_workout_date)}
          </span>
        )}
      </div>

      {loading || !data ? (
        <StreakSkeleton />
      ) : (
        <div className="space-y-5">

          {/* ── Main streak display ── */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <FlameRing streak={data.current_streak} />

            <div className="flex-1 text-center sm:text-left">
              <p className="text-lg font-bold text-brand-slate">
                {data.current_streak > 0
                  ? `${data.current_streak}-Day Streak! 🔥`
                  : 'No active streak'}
              </p>
              <p className="mt-1 text-sm text-brand-slate/60">
                {getStreakMessage(data.current_streak)}
              </p>

              {/* streak progress bar toward longest */}
              {data.current_streak > 0 && data.longest_streak > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-brand-slate/50">
                    <span>Progress to best ({data.longest_streak} days)</span>
                    <span>
                      {Math.min(
                        Math.round((data.current_streak / data.longest_streak) * 100),
                        100
                      )}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-pale">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand-deep transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          (data.current_streak / data.longest_streak) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Weekly activity bars ── */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-brand-slate/45">
              This Week
            </p>
            <WeeklyDots activity={data.weekly_activity} />
          </div>

          {/* ── Stat pills ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatPill
              icon={<Award size={15} />}
              label="Best Streak"
              value={`${data.longest_streak}d`}
            />
            <StatPill
              icon={<TrendingUp size={15} />}
              label="Total Days"
              value={data.total_workout_days}
            />
            <StatPill
              icon={<Calendar size={15} />}
              label="This Streak"
              value={`${data.current_streak}d`}
            />
            <StatPill
              icon={<Flame size={15} />}
              label="To Beat Best"
              value={
                data.current_streak >= data.longest_streak
                  ? '🏆 New Best!'
                  : `${data.longest_streak - data.current_streak}d`
              }
            />
          </div>

        </div>
      )}

      {/* ── Fallback note ── */}
      {isFallback && !loading && (
        <p className="mt-3 text-center text-[11px] text-brand-slate/35">
          Showing sample data · complete workouts to track your real streak
        </p>
      )}

    </div>
  )
}