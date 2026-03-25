'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, MapPin, Trophy, Zap } from 'lucide-react'
import { API_BASE_URL, buildAuthHeaders } from '@/lib/api'

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type MonthlySummary = {
  month: number               // 1–12
  year: number
  workouts_completed: number
  total_distance_km: number
  calories_burned: number
  active_minutes: number
  prev_workouts_completed: number
  prev_total_distance_km: number
  prev_calories_burned: number
  prev_active_minutes: number
}

type StatConfig = {
  key: keyof Pick<
    MonthlySummary,
    'workouts_completed' | 'total_distance_km' | 'calories_burned' | 'active_minutes'
  >
  prevKey: keyof Pick<
    MonthlySummary,
    | 'prev_workouts_completed'
    | 'prev_total_distance_km'
    | 'prev_calories_burned'
    | 'prev_active_minutes'
  >
  label: string
  unit: string
  icon: React.ReactNode
  gradient: string   // tailwind gradient classes
}

/* ─────────────────────────────────────────────
   STAT CARD CONFIG
───────────────────────────────────────────── */
const STAT_CONFIGS: StatConfig[] = [
  {
    key:      'workouts_completed',
    prevKey:  'prev_workouts_completed',
    label:    'Workouts Completed',
    unit:     '',
    icon:     <Trophy  size={18} />,
    gradient: 'from-brand-soft to-brand-deep',
  },
  {
    key:      'total_distance_km',
    prevKey:  'prev_total_distance_km',
    label:    'Total Distance',
    unit:     'km',
    icon:     <MapPin  size={18} />,
    gradient: 'from-brand-gold to-[#e6a800]',
  },
  {
    key:      'calories_burned',
    prevKey:  'prev_calories_burned',
    label:    'Calories Burned',
    unit:     'kcal',
    icon:     <Flame   size={18} />,
    gradient: 'from-[#C98CE8] to-brand-deep',
  },
  {
    key:      'active_minutes',
    prevKey:  'prev_active_minutes',
    label:    'Active Minutes',
    unit:     'min',
    icon:     <Zap     size={18} />,
    gradient: 'from-brand-gold to-brand-soft',
  },
]

/* ─────────────────────────────────────────────
   FALLBACK DATA
───────────────────────────────────────────── */
function buildFallback(month: number, year: number): MonthlySummary {
  return {
    month,
    year,
    workouts_completed:      22,
    total_distance_km:       120,
    calories_burned:         15000,
    active_minutes:          660,
    prev_workouts_completed: 18,
    prev_total_distance_km:  98,
    prev_calories_burned:    12400,
    prev_active_minutes:     540,
  }
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function formatValue(value: number, unit: string): string {
  if (unit === 'kcal') return value.toLocaleString()
  if (unit === 'km')   return value % 1 === 0 ? `${value}` : value.toFixed(1)
  return `${value}`
}

function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null
  return +((( current - previous) / previous) * 100).toFixed(1)
}

/* ─────────────────────────────────────────────
   SINGLE STAT CARD
───────────────────────────────────────────── */
function StatCard({
  config,
  summary,
}: {
  config: StatConfig
  summary: MonthlySummary
}) {
  const current  = summary[config.key]  as number
  const previous = summary[config.prevKey] as number
  const pct      = deltaPercent(current, previous)
  const isUp     = pct !== null && pct > 0
  const isDown   = pct !== null && pct < 0

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-[0_4px_20px_-6px_#9567B940]"
      style={{ background: undefined }}
    >
      {/* gradient bg via inline style so Tailwind JIT doesn't purge dynamic classes */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-100 rounded-2xl`} />

      {/* decorative circle */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-2 h-14 w-14 rounded-full bg-white/10" />

      <div className="relative space-y-3">
        {/* icon + label */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            {config.icon}
          </div>
          <p className="text-xs font-semibold text-white/80">{config.label}</p>
        </div>

        {/* main value */}
        <div>
          <span className="text-3xl font-bold leading-none">
            {formatValue(current, config.unit)}
          </span>
          {config.unit && (
            <span className="ml-1.5 text-sm font-medium text-white/70">{config.unit}</span>
          )}
        </div>

        {/* delta vs last month */}
        {pct !== null && (
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isUp
                  ? 'bg-white/25 text-white'
                  : isDown
                  ? 'bg-black/15 text-white/80'
                  : 'bg-white/15 text-white/70'
              }`}
            >
              {isUp ? '▲' : isDown ? '▼' : '—'}{' '}
              {Math.abs(pct)}% vs last month
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-brand-pale p-5">
      <div className="mb-3 h-8 w-8 rounded-xl bg-brand-mauve/40" />
      <div className="mb-2 h-3 w-1/2 rounded bg-brand-mauve/30" />
      <div className="h-8 w-2/3 rounded bg-brand-mauve/30" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   MONTH NAVIGATOR
───────────────────────────────────────────── */
function MonthNav({
  month, year,
  onPrev, onNext,
  disableNext,
}: {
  month: number
  year: number
  onPrev: () => void
  onNext: () => void
  disableNext: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-pale bg-white text-brand-slate/60 transition hover:border-brand-mauve hover:text-brand-purple"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[120px] text-center text-sm font-semibold text-brand-slate">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={onNext}
        disabled={disableNext}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-pale bg-white text-brand-slate/60 transition hover:border-brand-mauve hover:text-brand-purple disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function MonthlySummaryCard() {
  const now = new Date()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [summary,    setSummary]    = useState<MonthlySummary | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  const fetchSummary = useCallback(async (m: number, y: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/progress/monthly-summary?month=${m}&year=${y}`,
        { headers: buildAuthHeaders() }
      )
      if (!res.ok) throw new Error('API error')
      const data: MonthlySummary = await res.json()
      setSummary(data)
      setIsFallback(false)
    } catch {
      setSummary(buildFallback(m, y))
      setIsFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSummary(month, year) }, [fetchSummary, month, year])

  /* ── month navigation ── */
  function goToPrev() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else             { setMonth((m) => m - 1) }
  }

  function goToNext() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else              { setMonth((m) => m + 1) }
  }

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand-slate">Monthly Summary</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Auto-calculated from workouts &amp; diet logs
          </p>
        </div>

        <MonthNav
          month={month}
          year={year}
          onPrev={goToPrev}
          onNext={goToNext}
          disableNext={isCurrentMonth}
        />
      </div>

      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !summary
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : STAT_CONFIGS.map((config) => (
              <StatCard key={config.key} config={config} summary={summary} />
            ))}
      </div>

      {/* ── Fallback note ── */}
      {isFallback && !loading && (
        <p className="mt-3 text-center text-[11px] text-brand-slate/35">
          Showing sample data · complete workouts to see real monthly stats
        </p>
      )}

    </div>
  )
}