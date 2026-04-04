"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import {
  Activity,
  Utensils,
  Droplets,
  Trophy,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type MetricType =
  | "weight"
  | "workoutSessions"
  | "workoutCalories"
  | "workoutDuration"
  | "dietCalories"
  | "hydration"
  | "goalsCompleted";

type TimeframeType = "1_month" | "3_months" | "6_months" | "1_year";

interface ComprehensivePoint {
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
}

interface ComprehensiveProgressResponse {
  timeframe: string;
  data: ComprehensivePoint[];
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

/* ─────────────────────────────────────────────
   METRIC CONFIG — all brand palette
───────────────────────────────────────────── */
const METRIC_CONFIG: Record<
  MetricType,
  {
    label: string
    shortLabel: string
    color: string          // hex for recharts
    twColor: string        // tailwind bg class for dots/pills
    icon: React.ReactNode
    dataKey: string
    type: "line" | "bar"
    category: "Fitness" | "Diet" | "Hydration" | "Goals" | "Measurements"
    unit: string
  }
> = {
  weight: {
    label: "Weight", shortLabel: "Weight",
    color: "#BE70E7", twColor: "bg-brand-purple",
    icon: <TrendingUp size={13} />,
    dataKey: "weight", type: "line",
    category: "Measurements", unit: "kg",
  },
  workoutSessions: {
    label: "Workout Sessions", shortLabel: "Sessions",
    color: "#9567B9", twColor: "bg-brand-deep",
    icon: <Activity size={13} />,
    dataKey: "workout_sessions", type: "bar",
    category: "Fitness", unit: "",
  },
  workoutCalories: {
    label: "Workout Calories", shortLabel: "W.Calories",
    color: "#FCB60F", twColor: "bg-brand-gold",
    icon: <Activity size={13} />,
    dataKey: "workout_calories", type: "line",
    category: "Fitness", unit: "kcal",
  },
  workoutDuration: {
    label: "Duration (min)", shortLabel: "Duration",
    color: "#C98CE8", twColor: "bg-brand-soft",
    icon: <Activity size={13} />,
    dataKey: "workout_duration_minutes", type: "line",
    category: "Fitness", unit: "min",
  },
  dietCalories: {
    label: "Diet Calories", shortLabel: "D.Calories",
    color: "#D9AAE3", twColor: "bg-brand-mauve",
    icon: <Utensils size={13} />,
    dataKey: "diet_calories_consumed", type: "line",
    category: "Diet", unit: "kcal",
  },
  hydration: {
    label: "Hydration (ml)", shortLabel: "Hydration",
    color: "#515A6A", twColor: "bg-brand-slate",
    icon: <Droplets size={13} />,
    dataKey: "hydration_ml", type: "line",
    category: "Hydration", unit: "ml",
  },
  goalsCompleted: {
    label: "Goals Completed", shortLabel: "Goals",
    color: "#E9D3F2", twColor: "bg-brand-pale",
    icon: <Trophy size={13} />,
    dataKey: "goals_completed", type: "bar",
    category: "Goals", unit: "",
  },
};

const CATEGORIES = ["Measurements", "Fitness", "Diet", "Hydration", "Goals"] as const;

const DEFAULT_METRICS: Set<MetricType> = new Set([
  "weight", "workoutSessions", "workoutCalories", "dietCalories",
]);

/* ─────────────────────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const dateStr = d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div className="rounded-2xl border border-brand-pale bg-white px-4 py-3 shadow-xl">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-slate/45">
        {dateStr}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-brand-slate/65">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-brand-slate">
              {typeof entry.value === "number"
                ? entry.value % 1 === 0
                  ? entry.value.toLocaleString()
                  : entry.value.toFixed(1)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIMEFRAME SELECTOR
───────────────────────────────────────────── */
function TimeframeSelector({
  value,
  onChange,
}: {
  value: TimeframeType;
  onChange: (t: TimeframeType) => void;
}) {
  const options: { label: string; value: TimeframeType }[] = [
    { label: "1M",  value: "1_month"   },
    { label: "3M",  value: "3_months"  },
    { label: "6M",  value: "6_months"  },
    { label: "1Y",  value: "1_year"    },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-brand-pale bg-brand-bg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            value === opt.value
              ? "bg-brand-purple text-white shadow-sm"
              : "text-brand-slate/55 hover:text-brand-slate"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   METRIC TOGGLE PILLS
───────────────────────────────────────────── */
function MetricToggles({
  selected,
  onChange,
}: {
  selected: Set<MetricType>;
  onChange: (m: Set<MetricType>) => void;
}) {
  function toggle(metric: MetricType) {
    const next = new Set(selected);
    next.has(metric) ? next.delete(metric) : next.add(metric);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(METRIC_CONFIG) as MetricType[]).map((metric) => {
        const cfg     = METRIC_CONFIG[metric];
        const active  = selected.has(metric);
        return (
          <button
            key={metric}
            onClick={() => toggle(metric)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
              active
                ? "border-transparent text-white shadow-sm"
                : "border-brand-pale bg-white text-brand-slate/55 hover:border-brand-mauve hover:text-brand-slate"
            }`}
            style={active ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
          >
            {cfg.icon}
            {cfg.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUMMARY STATS STRIP
───────────────────────────────────────────── */
function SummaryStrip({
  data,
}: {
  data: ComprehensiveProgressResponse["summary"];
}) {
  const stats = [
    { label: "Workouts",     value: data.total_workouts,                           unit: "",   color: "#BE70E7", icon: <Activity size={14} />  },
    { label: "W. Calories",  value: Math.round(data.total_workout_calories),       unit: "kcal",color:"#FCB60F", icon: <Activity size={14} />  },
    { label: "Diet Cal",     value: Math.round(data.total_calories_consumed),      unit: "kcal",color:"#D9AAE3", icon: <Utensils size={14} />  },
    { label: "Hydration",    value: (data.total_hydration_ml / 1000).toFixed(1),   unit: "L",  color: "#515A6A", icon: <Droplets size={14} />  },
    { label: "Goals Done",   value: data.goals_completed_in_period,                unit: "",   color: "#9567B9", icon: <Trophy size={14} />    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-xl border border-brand-pale bg-brand-bg px-3 py-2.5"
        >
          <div className="flex items-center gap-1.5" style={{ color: s.color }}>
            {s.icon}
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-slate/50">
              {s.label}
            </p>
          </div>
          <p className="text-lg font-bold text-brand-slate">
            {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            {s.unit && (
              <span className="ml-1 text-xs font-normal text-brand-slate/40">{s.unit}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */
function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/4 rounded bg-brand-pale" />
      <div className="h-[360px] w-full rounded-xl bg-brand-pale" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ComprehensiveProgressChart() {
  const [chartData,       setChartData]       = useState<ComprehensivePoint[]>([]);
  const [summary,         setSummary]         = useState<ComprehensiveProgressResponse["summary"] | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [timeframe,       setTimeframe]       = useState<TimeframeType>("1_month");
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricType>>(DEFAULT_METRICS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/progress/comprehensive?timeframe=${timeframe}`,
        { headers: buildAuthHeaders() }
      );
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load progress data"));
        setChartData([]);
        setSummary(null);
        return;
      }
      const json: ComprehensiveProgressResponse = await res.json();
      setChartData(json.data);
      setSummary(json.summary);
    } catch {
      setError("Network error while loading progress data.");
      setChartData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── which metrics need which Y axis ──
     KEY INSIGHT: instead of showing 5 overlapping Y-axes (which clutters
     the chart badly), we normalise everything to a single left Y-axis using
     percentage of max value. The tooltip shows real values.
     For metrics with very different scales (e.g. weight vs calories),
     we group them into 2 axes max: "small" (0-100 range) and "large" (100+).
  */
  const activeMetrics = (Object.keys(METRIC_CONFIG) as MetricType[]).filter(
    (m) => selectedMetrics.has(m)
  );

  const hasLargeScale = activeMetrics.some((m) =>
    ["workoutCalories", "dietCalories", "hydration"].includes(m)
  );
  const hasSmallScale = activeMetrics.some((m) =>
    ["weight", "workoutSessions", "workoutDuration", "goalsCompleted"].includes(m)
  );

  function getYAxisId(metric: MetricType): string {
    return ["workoutCalories", "dietCalories", "hydration"].includes(metric)
      ? "large"
      : "small";
  }

  return (
    <div className="space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-brand-deep text-white shadow-sm">
            <TrendingUp size={15} />
          </div>
          <div>
            <h2 className="font-bold text-brand-slate">Comprehensive Progress</h2>
            <p className="text-[11px] text-brand-slate/45">
              Workouts · Diet · Hydration · Goals · Measurements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          <button
            onClick={fetchData}
            title="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-pale text-brand-slate/45 transition hover:border-brand-mauve hover:text-brand-purple"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      {!loading && summary && <SummaryStrip data={summary} />}

      {/* ── Metric toggles ── */}
      {!loading && chartData.length > 0 && (
        <MetricToggles selected={selectedMetrics} onChange={setSelectedMetrics} />
      )}

      {/* ── Loading ── */}
      {loading && <ChartSkeleton />}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-10 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Chart ── */}
      {!loading && !error && chartData.length > 0 && activeMetrics.length > 0 && (
        <div className="rounded-2xl border border-brand-pale bg-brand-bg/40 p-4">
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: hasLargeScale ? 16 : 8, left: 0, bottom: 0 }}
            >
              <defs>
                {activeMetrics.filter(m => METRIC_CONFIG[m].type === "line").map((m) => (
                  <linearGradient key={m} id={`grad-${m}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={METRIC_CONFIG[m].color} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={METRIC_CONFIG[m].color} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="4 4" stroke="#E9D3F2" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#515A6A", opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />

              {/* Small scale axis (weight, sessions, duration, goals) */}
              {hasSmallScale && (
                <YAxis
                  yAxisId="small"
                  orientation="left"
                  tick={{ fontSize: 11, fill: "#515A6A", opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
              )}

              {/* Large scale axis (calories, hydration) */}
              {hasLargeScale && (
                <YAxis
                  yAxisId="large"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#515A6A", opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                  }
                />
              )}

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#D9AAE3", strokeWidth: 1 }} />

              {/* Render active metrics */}
              {activeMetrics.map((metric) => {
                const cfg     = METRIC_CONFIG[metric];
                const yAxisId = getYAxisId(metric);

                if (cfg.type === "bar") {
                  return (
                    <Bar
                      key={metric}
                      dataKey={cfg.dataKey}
                      name={cfg.label}
                      fill={cfg.color}
                      yAxisId={yAxisId}
                      radius={[4, 4, 0, 0]}
                      opacity={0.75}
                      maxBarSize={24}
                    />
                  );
                }

                return (
                  <React.Fragment key={metric}>
                    {/* soft gradient fill under line */}
                    <Area
                      type="monotone"
                      dataKey={cfg.dataKey}
                      name={cfg.label}
                      stroke="none"
                      fill={`url(#grad-${metric})`}
                      yAxisId={yAxisId}
                      isAnimationActive={false}
                      dot={false}
                      legendType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey={cfg.dataKey}
                      name={cfg.label}
                      stroke={cfg.color}
                      strokeWidth={2}
                      yAxisId={yAxisId}
                      isAnimationActive={false}
                      dot={false}
                      activeDot={{ r: 4, fill: cfg.color, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </React.Fragment>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && chartData.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-pale bg-brand-bg py-14 text-center">
          <TrendingUp size={28} className="text-brand-mauve" />
          <p className="text-sm font-semibold text-brand-slate">No data yet</p>
          <p className="max-w-xs text-xs text-brand-slate/45">
            Start logging workouts, meals, and measurements to see your progress here.
          </p>
        </div>
      )}

    </div>
  );
}