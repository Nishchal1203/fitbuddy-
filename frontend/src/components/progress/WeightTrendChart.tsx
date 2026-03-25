"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { API_BASE_URL, buildAuthHeaders } from "@/lib/api";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type WeightEntry = {
  date: string; // ISO string from API  e.g. "2024-01-15"
  weight: number; // kg
};

type ChartPoint = {
  label: string; // "Jan", "Feb" …  displayed on x-axis
  weight: number;
  fullDate: string; // shown in tooltip
};

/* ─────────────────────────────────────────────
   FALLBACK DATA  (shown when API unavailable)
───────────────────────────────────────────── */
const FALLBACK_DATA: WeightEntry[] = [
  { date: "2024-01-01", weight: 80 },
  { date: "2024-02-01", weight: 79.2 },
  { date: "2024-03-01", weight: 78.5 },
  { date: "2024-04-01", weight: 75.8 },
  { date: "2024-05-01", weight: 76.2 },
  { date: "2024-06-01", weight: 74.5 },
  { date: "2024-07-01", weight: 72.0 },
  { date: "2024-08-01", weight: 69.5 },
  { date: "2024-09-01", weight: 67.8 },
  { date: "2024-10-01", weight: 66.0 },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toChartPoints(entries: WeightEntry[]): ChartPoint[] {
  return entries.map((e) => {
    const d = new Date(e.date);
    return {
      label: MONTH_SHORT[d.getMonth()],
      weight: e.weight,
      fullDate: d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  });
}

function calcDelta(points: ChartPoint[]): number | null {
  if (points.length < 2) return null;
  return +(points[points.length - 1].weight - points[0].weight).toFixed(1);
}

/* ─────────────────────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────────────────────── */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { weight, fullDate } = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-xl border border-brand-pale bg-white px-3 py-2 shadow-lg">
      <p className="text-xs text-brand-slate/55">{fullDate}</p>
      <p className="text-sm font-bold text-brand-slate">{weight} kg</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function WeightTrendChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/weight-history`, {
        headers: buildAuthHeaders(),
      });

      if (!res.ok) throw new Error("API error");

      const json: WeightEntry[] = await res.json();
      setData(toChartPoints(json.length ? json : FALLBACK_DATA));
    } catch {
      // silently fall back — no error banner, just use fallback
      setData(toChartPoints(FALLBACK_DATA));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── derived stats ── */
  const delta = calcDelta(data);
  const isLoss = delta !== null && delta < 0;
  const isGain = delta !== null && delta > 0;
  const currentWeight = data.length ? data[data.length - 1].weight : null;
  const startWeight = data.length ? data[0].weight : null;

  /* ── y-axis domain with padding ── */
  const weights = data.map((d) => d.weight);
  const minWeight = weights.length ? Math.floor(Math.min(...weights)) - 2 : 60;
  const maxWeight = weights.length ? Math.ceil(Math.max(...weights)) + 2 : 90;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand-slate">Weight Trend</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Auto-updated from your workout logs
          </p>
        </div>

        {/* Stats row */}
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-4">
            {/* Current weight pill */}
            <div className="rounded-xl bg-brand-bg px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/50">
                Current
              </p>
              <p className="text-sm font-bold text-brand-slate">
                {currentWeight} kg
              </p>
            </div>

            {/* Delta pill */}
            {delta !== null && (
              <div
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${
                  isLoss
                    ? "bg-green-50 text-green-600"
                    : isGain
                      ? "bg-red-50 text-red-500"
                      : "bg-brand-bg text-brand-slate/60"
                }`}
              >
                {isLoss && <TrendingDown size={14} />}
                {isGain && <TrendingUp size={14} />}
                {!isLoss && !isGain && <Minus size={14} />}
                <span className="text-sm font-bold">
                  {isLoss ? "" : "+"}
                  {delta} kg
                </span>
                <span className="text-[10px] font-medium opacity-70">
                  since start
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chart or skeleton ── */}
      {loading ? (
        <div className="flex h-[220px] items-center justify-center">
          <div className="space-y-3 w-full">
            <div className="h-3 w-1/3 animate-pulse rounded bg-brand-pale" />
            <div className="h-[180px] animate-pulse rounded-xl bg-brand-pale" />
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
          >
            <defs>
              {/* purple gradient fill matching brand-purple → transparent */}
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BE70E7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#BE70E7" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#E9D3F2"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#515A6A", opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={[minWeight, maxWeight]}
              tickFormatter={(v) => `${v}kg`}
              tick={{ fontSize: 11, fill: "#515A6A", opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#D9AAE3", strokeWidth: 1.5 }}
            />

            <Area
              type="monotone"
              dataKey="weight"
              stroke="#BE70E7" /* brand-purple */
              strokeWidth={2.5}
              fill="url(#weightGradient)"
              dot={{ r: 3.5, fill: "#BE70E7", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{
                r: 5,
                fill: "#9567B9",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* ── Fallback notice (subtle, not alarming) ── */}
      {error && !loading && (
        <p className="mt-2 text-center text-[11px] text-brand-slate/35">
          Showing sample data — connect your account to see real progress
        </p>
      )}
    </div>
  );
}
