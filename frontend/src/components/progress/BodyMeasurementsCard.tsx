"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus, Ruler } from "lucide-react";
import { API_BASE_URL, buildAuthHeaders } from "@/lib/api";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type MeasurementKey =
  | "chest"
  | "waist"
  | "hips"
  | "biceps"
  | "thighs"
  | "shoulders";

type MeasurementEntry = {
  key: MeasurementKey;
  label: string;
  current: number; // cm
  previous: number; // cm  — last recorded value for delta
  unit: string;
  emoji: string;
};

type ApiMeasurements = {
  chest?: { current: number; previous: number };
  waist?: { current: number; previous: number };
  hips?: { current: number; previous: number };
  biceps?: { current: number; previous: number };
  thighs?: { current: number; previous: number };
  shoulders?: { current: number; previous: number };
};

/* ─────────────────────────────────────────────
   FALLBACK DATA
───────────────────────────────────────────── */
const FALLBACK: MeasurementEntry[] = [
  {
    key: "chest",
    label: "Chest",
    current: 95,
    previous: 97,
    unit: "cm",
    emoji: "",
  },
  {
    key: "waist",
    label: "Waist",
    current: 80,
    previous: 83,
    unit: "cm",
    emoji: "",
  },
  {
    key: "hips",
    label: "Hips",
    current: 102,
    previous: 103,
    unit: "cm",
    emoji: "",
  },
  {
    key: "biceps",
    label: "Biceps",
    current: 30,
    previous: 29,
    unit: "cm",
    emoji: "",
  },
  {
    key: "thighs",
    label: "Thighs",
    current: 55,
    previous: 56,
    unit: "cm",
    emoji: "",
  },
  {
    key: "shoulders",
    label: "Shoulders",
    current: 112,
    previous: 112,
    unit: "cm",
    emoji: "",
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function parseMeasurements(api: ApiMeasurements): MeasurementEntry[] {
  const map: { key: MeasurementKey; label: string; emoji: string }[] = [
    { key: "chest", label: "Chest", emoji: "💪" },
    { key: "waist", label: "Waist", emoji: "🎯" },
    { key: "hips", label: "Hips", emoji: "📐" },
    { key: "biceps", label: "Biceps", emoji: "🦾" },
    { key: "thighs", label: "Thighs", emoji: "🦵" },
    { key: "shoulders", label: "Shoulders", emoji: "🏋️" },
  ];

  return map
    .filter((m) => api[m.key] !== undefined)
    .map((m) => ({
      ...m,
      current: api[m.key]!.current,
      previous: api[m.key]!.previous,
      unit: "cm",
    }));
}

/* ─────────────────────────────────────────────
   SINGLE MEASUREMENT TILE
───────────────────────────────────────────── */
function MeasurementTile({ entry }: { entry: MeasurementEntry }) {
  const delta = +(entry.current - entry.previous).toFixed(1);
  const isDown = delta < 0;
  const isUp = delta > 0;
  const same = delta === 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-pale bg-white p-4 shadow-[0_2px_12px_-4px_#9567B920]">
      {/* label + emoji */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-slate/50">
          {entry.label}
        </p>
        <span className="text-base">{entry.emoji}</span>
      </div>

      {/* current value */}
      <div>
        <span className="text-2xl font-bold text-brand-slate">
          {entry.current}
        </span>
        <span className="ml-1 text-sm font-medium text-brand-slate/50">
          {entry.unit}
        </span>
      </div>

      {/* delta indicator */}
      <div
        className={`flex items-center gap-1 rounded-lg px-2 py-1 w-fit text-xs font-semibold ${
          isDown
            ? "bg-green-50 text-green-600" // shrinking = good (waist/hips)
            : isUp
              ? "bg-[#FCB60F]/10 text-[#FCB60F]" // growing = good (biceps/chest)
              : "bg-brand-bg text-brand-slate/45"
        }`}
      >
        {isDown && <TrendingDown size={12} />}
        {isUp && <TrendingUp size={12} />}
        {same && <Minus size={12} />}
        <span>{same ? "No change" : `${isUp ? "+" : ""}${delta} cm`}</span>
      </div>

      {/* previous value note */}
      <p className="text-[10px] text-brand-slate/35">
        Previous: {entry.previous} {entry.unit}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETON TILE
───────────────────────────────────────────── */
function SkeletonTile() {
  return (
    <div className="animate-pulse rounded-2xl border border-brand-pale bg-white p-4">
      <div className="mb-3 h-3 w-1/2 rounded bg-brand-pale" />
      <div className="mb-3 h-7 w-2/3 rounded bg-brand-pale" />
      <div className="h-5 w-1/3 rounded bg-brand-pale" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function BodyMeasurementsCard() {
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/measurements`, {
        headers: buildAuthHeaders(),
      });

      if (!res.ok) throw new Error("API error");

      const json: ApiMeasurements & { updated_at?: string } = await res.json();

      const parsed = parseMeasurements(json);
      setMeasurements(parsed.length ? parsed : FALLBACK);
      setIsFallback(!parsed.length);

      if (json.updated_at) {
        setLastUpdated(
          new Date(json.updated_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        );
      }
    } catch {
      setMeasurements(FALLBACK);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-brand-deep text-white">
              <Ruler size={15} />
            </div>
            <h2 className="font-bold text-brand-slate">Body Measurements</h2>
          </div>
          <p className="mt-1 text-xs text-brand-slate/50">
            {lastUpdated
              ? `Last updated ${lastUpdated} · auto-synced from profile`
              : "Auto-synced from your profile"}
          </p>
        </div>

        {/* overall summary pill */}
        {!loading &&
          measurements.length > 0 &&
          (() => {
            const improved = measurements.filter(
              (m) => m.current < m.previous,
            ).length;
            return improved > 0 ? (
              <div className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                <TrendingDown size={13} />
                {improved} measurement{improved > 1 ? "s" : ""} improved
              </div>
            ) : null;
          })()}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonTile key={i} />)
          : measurements.map((entry) => (
              <MeasurementTile key={entry.key} entry={entry} />
            ))}
      </div>

      {/* ── Fallback note ── */}
      {isFallback && !loading && (
        <p className="mt-3 text-center text-[11px] text-brand-slate/35">
          Showing sample data · log a workout to auto-update measurements
        </p>
      )}
    </div>
  );
}
