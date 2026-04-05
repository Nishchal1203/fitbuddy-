"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, TrendingDown, TrendingUp, Minus, Ruler } from "lucide-react";
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
  updated_at?: string;
};

type MeasurementHistoryItem = {
  id: number;
  date: string;
  weight?: number | null;
  body_fat_percentage?: number | null;
  chest?: number | null;
  waist?: number | null;
  arms?: number | null;
  legs?: number | null;
  notes?: string | null;
};

type MeasurementFormState = {
  date: string;
  weight: string;
  body_fat_percentage: string;
  chest: string;
  waist: string;
  arms: string;
  legs: string;
  notes: string;
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
  const [history, setHistory] = useState<MeasurementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [form, setForm] = useState<MeasurementFormState>({
    date: new Date().toISOString().slice(0, 10),
    weight: "",
    body_fat_percentage: "",
    chest: "",
    waist: "",
    arms: "",
    legs: "",
    notes: "",
  });

  const toOptionalNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/measurements/card`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load measurements"));
        setMeasurements([]);
        setLastUpdated(null);
        return;
      }
      const json: ApiMeasurements = await res.json();
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

      const historyRes = await fetch(`${API_BASE_URL}/api/progress/measurements/history?limit=6`, {
        headers: buildAuthHeaders(),
      });
      if (historyRes.ok) {
        const historyJson = (await historyRes.json()) as MeasurementHistoryItem[];
        setHistory(historyJson);
      } else {
        setHistory([]);
      }
    } catch {
      setError("Network error while loading measurements");
      setMeasurements([]);
      setHistory([]);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setSelectedMeasurementId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      weight: "",
      body_fat_percentage: "",
      chest: "",
      waist: "",
      arms: "",
      legs: "",
      notes: "",
    });
  }, []);

  const fillFormFromMeasurement = useCallback((item: MeasurementHistoryItem) => {
    setSelectedMeasurementId(item.id);
    setForm({
      date: item.date,
      weight: item.weight?.toString() || "",
      body_fat_percentage: item.body_fat_percentage?.toString() || "",
      chest: item.chest?.toString() || "",
      waist: item.waist?.toString() || "",
      arms: item.arms?.toString() || "",
      legs: item.legs?.toString() || "",
      notes: item.notes || "",
    });
    setShowForm(true);
    setSubmitMessage(null);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);

    const payload = {
      date: form.date,
      weight: toOptionalNumber(form.weight),
      body_fat_percentage: toOptionalNumber(form.body_fat_percentage),
      chest: toOptionalNumber(form.chest),
      waist: toOptionalNumber(form.waist),
      arms: toOptionalNumber(form.arms),
      legs: toOptionalNumber(form.legs),
      notes: form.notes.trim() || null,
    };

    const hasAtLeastOneMetric = [
      payload.weight,
      payload.body_fat_percentage,
      payload.chest,
      payload.waist,
      payload.arms,
      payload.legs,
    ].some((v) => v !== null);

    if (!hasAtLeastOneMetric) {
      setSubmitMessage("Please enter at least one measurement value.");
      setSubmitting(false);
      return;
    }

    try {
      const isEditing = selectedMeasurementId !== null;
      const res = await fetch(
        isEditing
          ? `${API_BASE_URL}/api/progress/measurements/${selectedMeasurementId}`
          : `${API_BASE_URL}/api/progress/measurements`,
        {
        method: isEditing ? "PATCH" : "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        setSubmitMessage(await readErrorMessage(res, "Could not save measurement"));
        setSubmitting(false);
        return;
      }

      setSubmitMessage(isEditing ? "Measurement updated successfully." : "Measurement logged successfully.");
      resetForm();
      await fetchData();
    } catch {
      setSubmitMessage("Network error while saving measurement");
    } finally {
      setSubmitting(false);
    }
  };

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

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg border border-brand-pale bg-brand-bg px-3 py-1.5 text-xs font-semibold text-brand-deep hover:bg-brand-pale"
        >
          {showForm ? "Hide logger" : "Log measurement"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 rounded-2xl border border-brand-pale bg-brand-bg p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-brand-slate/70">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
                required
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Weight (kg)
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Body Fat (%)
              <input
                type="number"
                step="0.1"
                value={form.body_fat_percentage}
                onChange={(e) => setForm((prev) => ({ ...prev, body_fat_percentage: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Chest (cm)
              <input
                type="number"
                step="0.1"
                value={form.chest}
                onChange={(e) => setForm((prev) => ({ ...prev, chest: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Waist (cm)
              <input
                type="number"
                step="0.1"
                value={form.waist}
                onChange={(e) => setForm((prev) => ({ ...prev, waist: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Arms (cm)
              <input
                type="number"
                step="0.1"
                value={form.arms}
                onChange={(e) => setForm((prev) => ({ ...prev, arms: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70">
              Legs (cm)
              <input
                type="number"
                step="0.1"
                value={form.legs}
                onChange={(e) => setForm((prev) => ({ ...prev, legs: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
              />
            </label>

            <label className="text-xs text-brand-slate/70 sm:col-span-2 lg:col-span-1">
              Notes
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-pale bg-white px-2 py-1.5 text-sm"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : selectedMeasurementId
                  ? "Update measurement"
                  : "Save measurement"}
            </button>
            {selectedMeasurementId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-brand-pale bg-white px-3 py-1.5 text-xs font-semibold text-brand-slate hover:bg-brand-bg"
              >
                Cancel edit
              </button>
            )}
            {submitMessage && (
              <p className="text-xs text-brand-slate/70">{submitMessage}</p>
            )}
          </div>
        </form>
      )}

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

      {!loading && !error && history.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-brand-pale bg-white">
          <div className="border-b border-brand-pale px-4 py-3">
            <p className="text-sm font-semibold text-brand-slate">Recent logs</p>
            <p className="text-xs text-brand-slate/50">Latest measurement entries you saved</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-pale text-left text-sm">
              <thead className="bg-brand-bg text-xs uppercase tracking-wider text-brand-slate/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Weight</th>
                  <th className="px-4 py-3 font-semibold">Body fat</th>
                  <th className="px-4 py-3 font-semibold">Chest</th>
                  <th className="px-4 py-3 font-semibold">Waist</th>
                  <th className="px-4 py-3 font-semibold">Arms</th>
                  <th className="px-4 py-3 font-semibold">Legs</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-pale bg-white text-brand-slate">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-bg/60">
                    <td className="px-4 py-3 font-medium">
                      {new Date(item.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">{item.weight ?? "-"}</td>
                    <td className="px-4 py-3">{item.body_fat_percentage ?? "-"}</td>
                    <td className="px-4 py-3">{item.chest ?? "-"}</td>
                    <td className="px-4 py-3">{item.waist ?? "-"}</td>
                    <td className="px-4 py-3">{item.arms ?? "-"}</td>
                    <td className="px-4 py-3">{item.legs ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fillFormFromMeasurement(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-pale bg-white px-2 py-1 text-xs font-semibold text-brand-deep hover:bg-brand-bg"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Delete this measurement entry?",
                            );
                            if (!confirmed) return;

                            try {
                              const response = await fetch(
                                `${API_BASE_URL}/api/progress/measurements/${item.id}`,
                                {
                                  method: "DELETE",
                                  headers: buildAuthHeaders(),
                                },
                              );

                              if (!response.ok) {
                                setSubmitMessage(
                                  await readErrorMessage(
                                    response,
                                    "Could not delete measurement",
                                  ),
                                );
                                return;
                              }

                              if (selectedMeasurementId === item.id) {
                                resetForm();
                              }

                              setSubmitMessage("Measurement deleted successfully.");
                              await fetchData();
                            } catch {
                              setSubmitMessage("Network error while deleting measurement");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
