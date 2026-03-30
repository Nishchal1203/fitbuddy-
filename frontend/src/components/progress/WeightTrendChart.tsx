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
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

type WeightEntry = {
  date: string;
  weight: number;
};

type ChartPoint = {
  label: string;
  weight: number;
  fullDate: string;
};

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

export default function WeightTrendChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/weight-history`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load weight history"));
        setData([]);
        return;
      }
      const json: WeightEntry[] = await res.json();
      setData(toChartPoints(Array.isArray(json) ? json : []));
    } catch {
      setError("Network error while loading weight history");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const delta = calcDelta(data);
  const isLoss = delta !== null && delta < 0;
  const isGain = delta !== null && delta > 0;
  const currentWeight = data.length ? data[data.length - 1].weight : null;

  const weights = data.map((d) => d.weight);
  const minWeight = weights.length
    ? Math.floor(Math.min(...weights)) - 2
    : 0;
  const maxWeight = weights.length
    ? Math.ceil(Math.max(...weights)) + 2
    : 100;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand-slate">Weight Trend</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Last 30 days from your logged measurements
          </p>
        </div>

        {!loading && data.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-brand-bg px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/50">
                Current
              </p>
              <p className="text-sm font-bold text-brand-slate">
                {currentWeight} kg
              </p>
            </div>

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

      {loading ? (
        <div className="flex h-[220px] items-center justify-center">
          <div className="w-full space-y-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-brand-pale" />
            <div className="h-[180px] animate-pulse rounded-xl bg-brand-pale" />
          </div>
        </div>
      ) : error ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-medium text-brand-slate">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            Try again
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-medium text-brand-slate">
            No weight entries yet
          </p>
          <p className="max-w-sm text-xs text-brand-slate/50">
            Log a body measurement that includes your weight. Points from the last
            30 days appear on this chart.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
          >
            <defs>
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
              stroke="#BE70E7"
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
    </div>
  );
}
