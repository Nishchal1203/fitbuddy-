"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  Activity,
  Utensils,
  Droplets,
  Trophy,
  Target,
  Flame,
  Zap,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  Apple,
} from "lucide-react";
import { ComprehensiveProgressChart } from "@/components/progress";
import { API_BASE_URL, buildAuthHeaders } from "@/Utils/api";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface ComprehensiveProgressResponse {
  timeframe: string;
  data: Array<{
    date: string;
    weight?: number;
    workout_sessions: number;
    workout_calories: number;
    workout_duration_minutes: number;
    diet_calories_consumed: number;
    diet_macros_protein: number;
    diet_macros_carbs: number;
    diet_macros_fat: number;
    hydration_ml: number;
    goals_completed: number;
    measurement_logged: boolean;
  }>;
  summary: {
    total_workouts: number;
    total_workout_calories: number;
    total_workout_minutes: number;
    total_calories_consumed: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    total_hydration_ml: number;
    days_with_measurements: number;
    goals_completed_in_period: number;
  };
}

interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  total_workout_days: number;
  last_workout_date: string;
  weekly_activity: boolean[];
}

interface MonthlySummaryResponse {
  month: number;
  year: number;
  workouts_completed: number;
  total_distance_km: number;
  calories_burned: number;
  active_minutes: number;
  prev_workouts_completed: number;
  prev_total_distance_km: number;
  prev_calories_burned: number;
  prev_active_minutes: number;
}

/* ─────────────────────────────────────────────
   MOTIVATIONAL QUOTES
───────────────────────────────────────────── */
const QUOTES = [
  "Every rep is a vote for the person you want to become.",
  "The only bad workout is the one that didn't happen.",
  "Your body can do it. It's your mind you have to convince.",
  "Strength comes from overcoming the things you once thought you couldn't.",
  "The pain you feel today is the strength you'll feel tomorrow.",
  "Fitness is not about being better than someone else — it's about being better than you used to be.",
  "Don't wish for it. Work for it.",
  "Progress, not perfection, is the goal.",
  "The body achieves what the mind believes.",
  "Success isn't always about greatness. It's about consistency.",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function deltaPercent(current: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/** Thin coloured progress bar */
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-pale">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

/** Delta badge — green up, red down */
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
      }`}
    >
      {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {Math.abs(delta)}%
    </span>
  );
}

/** Single KPI stat card */
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  gradient,
  barPct = 65,
  barColor = "bg-white/60",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  gradient: string;
  barPct?: number;
  barColor?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-[0_4px_24px_-6px_rgba(0,0,0,0.18)]`}
    >
      {/* decorative circles */}
      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -right-2 h-12 w-12 rounded-full bg-white/10" />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {label}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            <Icon size={16} />
          </div>
        </div>

        <p className="text-3xl font-bold leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit && (
            <span className="ml-1 text-base font-medium text-white/60">
              {unit}
            </span>
          )}
        </p>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${Math.min(barPct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DashboardHome() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(QUOTES[0]);
  const [progressData, setProgressData] =
    useState<ComprehensiveProgressResponse | null>(null);
  const [streakData, setStreakData] = useState<StreakResponse | null>(null);
  const [monthlySummary, setMonthlySummary] =
    useState<MonthlySummaryResponse | null>(null);

  /* ── fetch ── */
  async function fetchAll() {
    setLoading(true);
    try {
      const [userRes, progressRes, streakRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/me`, { headers: buildAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/progress/comprehensive?timeframe=1_month`, {
          headers: buildAuthHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/progress/streak`, {
          headers: buildAuthHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/progress/monthly-summary`, {
          headers: buildAuthHeaders(),
        }),
      ]);
      if (userRes.ok) setUser(await userRes.json());
      if (progressRes.ok) setProgressData(await progressRes.json());
      if (streakRes.ok) setStreakData(await streakRes.json());
      if (monthlyRes.ok) setMonthlySummary(await monthlyRes.json());
    } catch {
      /* silently continue with nulls */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "Champion";
  const s = progressData?.summary;
  const now = new Date();

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="space-y-6 p-6">
      {/* ══════════════════════════════════════════
          HERO — Welcome + Quote
      ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-deep via-brand-purple to-brand-soft p-7 shadow-[0_8px_32px_-8px_#9567B960]">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-white/10" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* greeting */}
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
            </p>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {firstName} 💪
            </h1>

            {/* quote */}
            <p className="mt-3 max-w-lg text-sm font-medium italic leading-relaxed text-white/75">
              "{quote}"
            </p>
          </div>

          {/* refresh quote */}
          <button
            onClick={() =>
              setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
            }
            title="New quote"
            className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* quick action pills */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {[
            {
              label: "Log Workout",
              icon: Dumbbell,
              href: "/dashboard/workouts",
            },
            { label: "Log Meal", icon: Apple, href: "/dashboard/plans" },
            { label: "View Goals", icon: Target, href: "/dashboard/goals" },
          ].map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <a.icon size={13} />
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          KPI CARDS  (4 across)
      ══════════════════════════════════════════ */}
      {s && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Workouts"
            value={s.total_workouts}
            icon={Activity}
            gradient="from-brand-soft to-brand-deep"
            barPct={(s.total_workouts / 30) * 100}
          />
          <StatCard
            label="Calories Burned"
            value={Math.round(s.total_workout_calories)}
            unit="kcal"
            icon={Flame}
            gradient="from-brand-gold to-[#e6a800]"
            barPct={70}
            barColor="bg-white/50"
          />
          <StatCard
            label="Active Hours"
            value={Math.round(s.total_workout_minutes / 60)}
            unit="hrs"
            icon={Zap}
            gradient="from-[#C98CE8] to-brand-deep"
            barPct={60}
          />
          <StatCard
            label="Diet Calories"
            value={Math.round(s.total_calories_consumed)}
            unit="kcal"
            icon={Utensils}
            gradient="from-brand-purple to-[#4C1D95]"
            barPct={75}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════
          PROGRESS CHART
      ══════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-2xl border border-brand-pale bg-white shadow-[0_4px_20px_-4px_#9567B920]">
        <ComprehensiveProgressChart />
      </div>

      {/* ══════════════════════════════════════════
          SECONDARY ROW — Streak | Monthly Performance
          side-by-side on large screens
        ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Streak card ── */}
        {streakData && (
          <div className="flex flex-col gap-4 rounded-2xl border border-brand-pale bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
            {/* header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold to-[#e6a800] text-white shadow-sm">
                  <Trophy size={15} />
                </div>
                <p className="text-sm font-bold text-brand-slate">Streak</p>
              </div>
              <span className="rounded-full bg-brand-gold/10 px-2.5 py-0.5 text-xs font-bold text-brand-gold">
                🔥 Active
              </span>
            </div>

            {/* big number */}
            <div className="text-center">
              <p className="text-5xl font-bold text-brand-slate">
                {streakData.current_streak}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-brand-slate/45">
                Day Streak
              </p>
            </div>

            {/* sub stats */}
            <div className="grid grid-cols-2 divide-x divide-brand-pale rounded-xl border border-brand-pale">
              <div className="px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-brand-slate">
                  {streakData.longest_streak}
                </p>
                <p className="text-[10px] text-brand-slate/45">Best</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-brand-slate">
                  {streakData.total_workout_days}
                </p>
                <p className="text-[10px] text-brand-slate/45">Total Days</p>
              </div>
            </div>

            {/* weekly activity bars */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
                This Week
              </p>
              <div className="flex items-end gap-1">
                {(streakData.weekly_activity.length === 7
                  ? streakData.weekly_activity
                  : [...Array(7)].map(
                      (_, i) => streakData.weekly_activity[i] ?? false,
                    )
                ).map((active, i) => (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-md transition-all ${
                        active
                          ? "bg-gradient-to-t from-brand-deep to-brand-purple h-7"
                          : "bg-brand-pale h-4"
                      }`}
                    />
                    <p className="text-[8px] font-semibold text-brand-slate/40">
                      {DAYS[i]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Monthly performance card ── */}
        {monthlySummary && (
          <div className="rounded-2xl border border-brand-pale bg-white p-6 shadow-[0_4px_20px_-4px_#9567B920]">
            {/* header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-brand-deep text-white shadow-sm">
                  <TrendingUp size={15} />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-slate">
                    Monthly Performance
                  </p>
                  <p className="text-[10px] text-brand-slate/45">
                    {MONTHS[monthlySummary.month - 1]} {monthlySummary.year}
                  </p>
                </div>
              </div>
            </div>

            {/* 4-col stat grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Workouts",
                  value: monthlySummary.workouts_completed,
                  prev: monthlySummary.prev_workouts_completed,
                  unit: "",
                  icon: Activity,
                },
                {
                  label: "Active Min",
                  value: monthlySummary.active_minutes,
                  prev: monthlySummary.prev_active_minutes,
                  unit: "min",
                  icon: Zap,
                },
                {
                  label: "Calories",
                  value: Math.round(monthlySummary.calories_burned),
                  prev: Math.round(monthlySummary.prev_calories_burned),
                  unit: "kcal",
                  icon: Flame,
                },
                {
                  label: "Distance",
                  value: monthlySummary.total_distance_km.toFixed(1),
                  prev: monthlySummary.prev_total_distance_km,
                  unit: "km",
                  icon: TrendingUp,
                },
              ].map((stat) => {
                const delta =
                  typeof stat.value === "number" &&
                  typeof stat.prev === "number"
                    ? deltaPercent(stat.value, stat.prev)
                    : null;
                return (
                  <div
                    key={stat.label}
                    className="flex flex-col gap-2 rounded-xl border border-brand-pale bg-brand-bg px-4 py-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate/45">
                        {stat.label}
                      </p>
                      <stat.icon size={13} className="text-brand-slate/30" />
                    </div>
                    <p className="text-2xl font-bold text-brand-slate">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : stat.value}
                      <span className="ml-1 text-xs font-normal text-brand-slate/40">
                        {stat.unit}
                      </span>
                    </p>
                    <DeltaBadge delta={delta} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          THIRD ROW — Nutrition | Hydration+Goals
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── Nutrition card ── */}
        {s && (
          <div className="flex flex-col gap-4 rounded-2xl border border-brand-pale bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-brand-purple text-white shadow-sm">
                <Utensils size={15} />
              </div>
              <p className="text-sm font-bold text-brand-slate">Nutrition</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Protein",
                  value: Math.round(s.total_protein),
                  unit: "g",
                  color: "bg-brand-purple",
                  pct: 72,
                },
                {
                  label: "Carbs",
                  value: Math.round(s.total_carbs),
                  unit: "g",
                  color: "bg-brand-gold",
                  pct: 65,
                },
                {
                  label: "Fat",
                  value: Math.round(s.total_fat),
                  unit: "g",
                  color: "bg-brand-mauve",
                  pct: 58,
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-brand-slate/65">
                      {m.label}
                    </p>
                    <p className="text-xs font-bold text-brand-slate">
                      {m.value.toLocaleString()}
                      <span className="ml-0.5 font-normal text-brand-slate/45">
                        {m.unit}
                      </span>
                    </p>
                  </div>
                  <MiniBar pct={m.pct} color={m.color} />
                </div>
              ))}
            </div>

            {/* total calories consumed */}
            <div className="mt-auto rounded-xl border border-brand-pale bg-brand-bg px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
                Total Consumed
              </p>
              <p className="mt-0.5 text-xl font-bold text-brand-slate">
                {Math.round(s.total_calories_consumed).toLocaleString()}
                <span className="ml-1 text-sm font-normal text-brand-slate/45">
                  kcal
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ── Hydration + Goals card ── */}
        {s && (
          <div className="flex flex-col gap-4 rounded-2xl border border-brand-pale bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-white shadow-sm">
                <Droplets size={15} />
              </div>
              <p className="text-sm font-bold text-brand-slate">
                Hydration &amp; Goals
              </p>
            </div>

            {/* hydration ring-style stat */}
            <div className="flex items-center gap-4 rounded-xl border border-brand-pale bg-brand-bg px-4 py-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-slate">
                  {(s.total_hydration_ml / 1000).toFixed(1)}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-slate/45">
                  Litres
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                <MiniBar pct={58} color="bg-[#38BDF8]" />
                <p className="text-[10px] text-brand-slate/45">
                  58% of hydration target
                </p>
              </div>
            </div>

            {/* cup icons */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
                Daily Average
              </p>
              <div className="flex gap-1.5">
                {[...Array(8)].map((_, i) => {
                  const dailyAvg = s.total_hydration_ml / 1000 / 30;
                  const cups = Math.round(dailyAvg / 0.25);
                  return (
                    <div
                      key={i}
                      className={`h-7 flex-1 rounded-md transition-all ${
                        i < cups ? "bg-[#38BDF8]" : "bg-brand-pale"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* goals completed */}
            <div className="mt-auto flex items-center justify-between rounded-xl border border-brand-pale bg-brand-bg px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
                  Goals Completed
                </p>
                <p className="mt-0.5 text-xl font-bold text-brand-slate">
                  {s.goals_completed_in_period}
                  <span className="ml-1 text-xs font-normal text-brand-slate/45">
                    this period
                  </span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold to-[#e6a800] text-white shadow-sm">
                <Trophy size={18} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
