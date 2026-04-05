"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Flame, Calendar, Award, TrendingUp } from "lucide-react";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

type StreakData = {
  current_streak: number;
  longest_streak: number;
  total_workout_days: number;
  last_workout_date: string;
  weekly_activity: boolean[];
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function normalizeWeeklyActivity(raw: unknown): boolean[] {
  if (!Array.isArray(raw))
    return [false, false, false, false, false, false, false];
  const booleans = raw.map((v) => Boolean(v));
  const last7 = booleans.slice(-7);
  while (last7.length < 7) last7.unshift(false);
  return last7.slice(-7);
}

function parseStreakPayload(json: unknown): StreakData | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.current_streak !== "number" ||
    typeof o.longest_streak !== "number"
  )
    return null;
  return {
    current_streak: o.current_streak,
    longest_streak: o.longest_streak,
    total_workout_days:
      typeof o.total_workout_days === "number" ? o.total_workout_days : 0,
    last_workout_date:
      typeof o.last_workout_date === "string"
        ? o.last_workout_date
        : new Date().toISOString(),
    weekly_activity: normalizeWeeklyActivity(o.weekly_activity),
  };
}

function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your streak today! 💪";
  if (streak < 3) return "Good start! Keep going 🌱";
  if (streak < 7) return "You're building momentum! 🔥";
  if (streak < 14) return "One week+ streak! Incredible 🚀";
  if (streak < 30) return "Two weeks strong! You're unstoppable 💥";
  return "Elite consistency! Legendary 🏆";
}

function getFlameColor(streak: number): string {
  if (streak === 0) return "#D9AAE3";
  if (streak < 7) return "#FCB60F";
  if (streak < 14) return "#F97316";
  return "#EF4444";
}

function formatLastWorkout(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function FlameRing({ streak }: { streak: number }) {
  const flameColor = getFlameColor(streak);
  const isActive = streak > 0;

  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div
          className="absolute h-28 w-28 animate-ping rounded-full opacity-20"
          style={{ backgroundColor: flameColor }}
        />
      )}
      <div
        className="absolute h-24 w-24 rounded-full opacity-15"
        style={{ backgroundColor: isActive ? flameColor : "#E9D3F2" }}
      />
      <div
        className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full text-white shadow-lg"
        style={{
          background: isActive
            ? `radial-gradient(circle at 40% 40%, ${flameColor}cc, ${flameColor})`
            : "linear-gradient(135deg, #D9AAE3, #9567B9)",
        }}
      >
        <Flame
          size={22}
          className="mb-0.5"
          style={{ color: isActive ? "#fff" : "#fff8" }}
        />
        <span className="text-xl font-bold leading-none">{streak}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
          days
        </span>
      </div>
    </div>
  );
}

function WeeklyDots({ activity }: { activity: boolean[] }) {
  const days = normalizeWeeklyActivity(activity);

  return (
    <div className="flex items-end gap-1.5">
      {days.map((active, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`h-8 w-6 rounded-lg transition-all ${
              active
                ? "bg-gradient-to-t from-brand-deep to-brand-soft shadow-sm"
                : "bg-brand-pale"
            }`}
          />
          <span className="text-[9px] font-medium text-brand-slate/50">
            {DAY_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
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
  );
}

function StreakSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-brand-pale" />
        <div className="flex-1 space-y-2">
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
  );
}

export default function StreakCounter() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/streak`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load streak data"));
        setData(null);
        return;
      }
      const json = await res.json();
      const parsed = parseStreakPayload(json);
      if (!parsed) {
        setError("Unexpected response from server");
        setData(null);
        return;
      }
      setData(parsed);
    } catch {
      setError("Network error while loading streak");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-brand-slate">Workout Streak</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Auto-tracked from completed workouts
          </p>
        </div>
        {data && !loading && !error && (
          <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-brand-purple">
            Last: {formatLastWorkout(data.last_workout_date)}
          </span>
        )}
      </div>

      {loading ? (
        <StreakSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <p className="text-sm font-medium text-brand-slate">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <FlameRing streak={data.current_streak} />

            <div className="flex-1 text-center sm:text-left">
              <p className="text-lg font-bold text-brand-slate">
                {data.current_streak > 0
                  ? `${data.current_streak}-Day Streak! 🔥`
                  : "No active streak"}
              </p>
              <p className="mt-1 text-sm text-brand-slate/60">
                {getStreakMessage(data.current_streak)}
              </p>

              {data.current_streak > 0 && data.longest_streak > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-brand-slate/50">
                    <span>Progress to best ({data.longest_streak} days)</span>
                    <span>
                      {Math.min(
                        Math.round(
                          (data.current_streak / data.longest_streak) * 100,
                        ),
                        100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-pale">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand-deep transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          (data.current_streak / data.longest_streak) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-brand-slate/45">
              This Week
            </p>
            <WeeklyDots activity={data.weekly_activity} />
          </div>

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
                  ? "🏆 New Best!"
                  : `${data.longest_streak - data.current_streak}d`
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
