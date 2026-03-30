"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus, Ruler } from "lucide-react";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

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
  current: number;
  previous: number;
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

function MeasurementTile({ entry }: { entry: MeasurementEntry }) {
  const delta = +(entry.current - entry.previous).toFixed(1);
  const isDown = delta < 0;
  const isUp = delta > 0;
  const same = delta === 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-pale bg-white p-4 shadow-[0_2px_12px_-4px_#9567B920]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-slate/50">
          {entry.label}
        </p>
        <span className="text-base">{entry.emoji}</span>
      </div>

      <div>
        <span className="text-2xl font-bold text-brand-slate">
          {entry.current}
        </span>
        <span className="ml-1 text-sm font-medium text-brand-slate/50">
          {entry.unit}
        </span>
      </div>

      <div
        className={`flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
          isDown
            ? "bg-green-50 text-green-600"
            : isUp
              ? "bg-[#FCB60F]/10 text-[#FCB60F]"
              : "bg-brand-bg text-brand-slate/45"
        }`}
      >
        {isDown && <TrendingDown size={12} />}
        {isUp && <TrendingUp size={12} />}
        {same && <Minus size={12} />}
        <span>{same ? "No change" : `${isUp ? "+" : ""}${delta} cm`}</span>
      </div>

      <p className="text-[10px] text-brand-slate/35">
        Previous: {entry.previous} {entry.unit}
      </p>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="animate-pulse rounded-2xl border border-brand-pale bg-white p-4">
      <div className="mb-3 h-3 w-1/2 rounded bg-brand-pale" />
      <div className="mb-3 h-7 w-2/3 rounded bg-brand-pale" />
      <div className="h-5 w-1/3 rounded bg-brand-pale" />
    </div>
  );
}

export default function BodyMeasurementsCard() {
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/measurements`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load measurements"));
        setMeasurements([]);
        setLastUpdated(null);
        return;
      }
      const json: ApiMeasurements & { updated_at?: string } = await res.json();
      const parsed = parseMeasurements(json);
      setMeasurements(parsed);
      if (json.updated_at) {
        setLastUpdated(
          new Date(json.updated_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        );
      } else {
        setLastUpdated(null);
      }
    } catch {
      setError("Network error while loading measurements");
      setMeasurements([]);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
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
              ? `Last updated ${lastUpdated} · from your measurement history`
              : "Compared to your previous logged entry"}
          </p>
        </div>

        {!loading &&
          !error &&
          measurements.length > 0 &&
          (() => {
            const improved = measurements.filter(
              (m) => m.current < m.previous,
            ).length;
            return improved > 0 ? (
              <div className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                <TrendingDown size={13} />
                {improved} measurement{improved > 1 ? "s" : ""} down vs last log
              </div>
            ) : null;
          })()}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm font-medium text-brand-slate">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            Try again
          </button>
        </div>
      ) : measurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm font-medium text-brand-slate">
            No measurements to show
          </p>
          <p className="max-w-md text-xs text-brand-slate/50">
            Log chest, waist, arms, or legs on two different days to see current
            values and change vs your previous entry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {measurements.map((entry) => (
            <MeasurementTile key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
