"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { API_BASE_URL, buildAuthHeaders, getAuthToken } from "@/lib/api";
import { CustomPlanDraftInput, PlanExercise } from "./types";
import aiIcon from "../../assets/AI_icon.svg";

type CustomPlanBuilderProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateDraft: (input: CustomPlanDraftInput) => Promise<void>;
};

type ExerciseOption = {
  id: number;
  name: string;
  category: string;
};

const FALLBACK_EXERCISE_OPTIONS: ExerciseOption[] = [
  { id: 1, name: "Running", category: "Cardio" },
  { id: 2, name: "Cycling", category: "Cardio" },
  { id: 3, name: "Swimming", category: "Cardio" },
  { id: 4, name: "Jump Rope", category: "Cardio" },
  { id: 5, name: "Rowing", category: "Cardio" },
  { id: 6, name: "Elliptical", category: "Cardio" },
  { id: 7, name: "Stair Climbing", category: "Cardio" },
  { id: 8, name: "Dancing", category: "Cardio" },
  { id: 9, name: "Boxing", category: "Cardio" },
  { id: 10, name: "HIIT", category: "Cardio" },
  { id: 11, name: "Push-ups", category: "Strength" },
  { id: 12, name: "Pull-ups", category: "Strength" },
  { id: 13, name: "Squats", category: "Strength" },
  { id: 14, name: "Deadlifts", category: "Strength" },
  { id: 15, name: "Bench Press", category: "Strength" },
  { id: 16, name: "Overhead Press", category: "Strength" },
  { id: 17, name: "Rows", category: "Strength" },
  { id: 18, name: "Lunges", category: "Strength" },
  { id: 19, name: "Planks", category: "Strength" },
  { id: 20, name: "Dips", category: "Strength" },
  { id: 21, name: "Yoga", category: "Flexibility" },
  { id: 22, name: "Stretching", category: "Flexibility" },
  { id: 23, name: "Pilates", category: "Flexibility" },
  { id: 24, name: "Tai Chi", category: "Flexibility" },
  { id: 25, name: "Dynamic Stretching", category: "Flexibility" },
  { id: 26, name: "Static Stretching", category: "Flexibility" },
  { id: 27, name: "Foam Rolling", category: "Flexibility" },
  { id: 28, name: "Mobility Work", category: "Flexibility" },
  { id: 29, name: "Breathing Exercises", category: "Flexibility" },
  { id: 30, name: "Meditation", category: "Flexibility" },
];

type DraftExerciseRow = {
  key: string;
  exercise_id: number | null;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
};

const levelOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CustomPlanBuilder({
  isOpen,
  onClose,
  onCreateDraft,
}: CustomPlanBuilderProps) {
  const [builderMode, setBuilderMode] = useState<"manual" | "ai">("manual");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "beginner",
    duration_days: "30",
    focus: "",
    ai_prompt: "",
  });
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>(
    FALLBACK_EXERCISE_OPTIONS,
  );
  const [exerciseRows, setExerciseRows] = useState<DraftExerciseRow[]>([
    {
      key: "row-1",
      exercise_id: null,
      sets: "3",
      reps: "10",
      rest: "60 sec",
      notes: "",
    },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadExercises = async () => {
      const token = getAuthToken();
      if (!token) {
        setExerciseOptions(FALLBACK_EXERCISE_OPTIONS);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/exercises/`, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) {
          setExerciseOptions(FALLBACK_EXERCISE_OPTIONS);
          return;
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          setExerciseOptions(FALLBACK_EXERCISE_OPTIONS);
          return;
        }
        const normalized = data
          .filter((item) => item?.id && item?.name && item?.category)
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
          }));
        if (normalized.length === 0) {
          setExerciseOptions(FALLBACK_EXERCISE_OPTIONS);
          return;
        }

        const merged = [...normalized];
        const existingIds = new Set(normalized.map((item) => item.id));
        FALLBACK_EXERCISE_OPTIONS.forEach((item) => {
          if (!existingIds.has(item.id)) merged.push(item);
        });

        setExerciseOptions(merged);
      } catch {
        setExerciseOptions(FALLBACK_EXERCISE_OPTIONS);
      }
    };

    loadExercises();
  }, [isOpen]);

  const exerciseSelectOptions = useMemo(
    () => [
      { value: "", label: "Select exercise" },
      ...exerciseOptions.map((item) => ({
        value: String(item.id),
        label: `${item.name} (${item.category})`,
      })),
    ],
    [exerciseOptions],
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetAndClose = () => {
    setBuilderMode("manual");
    setFormData({
      title: "",
      description: "",
      level: "beginner",
      duration_days: "30",
      focus: "",
      ai_prompt: "",
    });
    setExerciseRows([
      {
        key: "row-1",
        exercise_id: null,
        sets: "3",
        reps: "10",
        rest: "60 sec",
        notes: "",
      },
    ]);
    onClose();
  };

  const updateExerciseRow = (key: string, patch: Partial<DraftExerciseRow>) => {
    setExerciseRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addExerciseRow = () => {
    const nextIndex = exerciseRows.length + 1;
    setExerciseRows((prev) => [
      ...prev,
      {
        key: `row-${nextIndex}-${Date.now()}`,
        exercise_id: null,
        sets: "3",
        reps: "10",
        rest: "60 sec",
        notes: "",
      },
    ]);
  };

  const removeExerciseRow = (key: string) => {
    setExerciseRows((prev) =>
      prev.length > 1 ? prev.filter((row) => row.key !== key) : prev,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedExercises: PlanExercise[] = exerciseRows
        .filter((row) => row.exercise_id !== null)
        .map((row) => {
          const selected = exerciseOptions.find(
            (item) => item.id === row.exercise_id,
          );
          return {
            exercise_id: row.exercise_id || undefined,
            name: selected?.name || "Exercise",
            category: selected?.category || "Strength",
            sets: row.sets,
            reps: row.reps,
            rest: row.rest,
            notes: row.notes,
          };
        });

      await onCreateDraft({
        title: formData.title.trim(),
        description: formData.description.trim(),
        level: formData.level,
        duration_days: Number(formData.duration_days) || 30,
        focus: formData.focus.trim(),
        exercises: selectedExercises,
        generation_mode: builderMode,
        ai_prompt: formData.ai_prompt.trim(),
      });

      resetAndClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Create Your Own Plan">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setBuilderMode("manual")}
            className={`rounded-lg border p-3 text-left transition ${
              builderMode === "manual"
                ? "border-brand-purple bg-brand-bg"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800">
              Manual Builder
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Pick exercises, sets, reps, and rest yourself.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setBuilderMode("ai")}
            className={`rounded-lg border p-3 text-left transition ${
              builderMode === "ai"
                ? "border-brand-purple bg-brand-bg"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Image
                src={aiIcon}
                alt="AI icon"
                width={18}
                height={18}
                className="h-[18px] w-[18px]"
              />
              <p className="text-sm font-semibold text-gray-800">
                Create Workout with AI
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Describe your goals and generate a plan from prompt.
            </p>
          </button>
        </div>

        <Input
          name="title"
          label="Plan Title"
          placeholder="e.g. Summer Body Shred"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <Textarea
          name="description"
          label="Description"
          placeholder="Define your target outcomes and constraints"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            name="level"
            label="Experience"
            options={levelOptions}
            value={formData.level}
            onChange={handleChange}
          />

          <Input
            name="duration_days"
            label="Duration (days)"
            type="number"
            min={7}
            max={120}
            value={formData.duration_days}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          name="focus"
          label="Primary Focus"
          placeholder="e.g. fat loss, hypertrophy, mobility"
          value={formData.focus}
          onChange={handleChange}
        />

        {builderMode === "ai" ? (
          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <Image
                src={aiIcon}
                alt="AI icon"
                width={18}
                height={18}
                className="h-[18px] w-[18px]"
              />
              <p className="text-sm font-semibold text-gray-800">
                Define Your Goals for AI
              </p>
            </div>
            <Textarea
              name="ai_prompt"
              label="Prompt"
              placeholder="Example: I want to lose fat in 8 weeks, 5 days/week, beginner level, no knee-impact exercises."
              rows={5}
              value={formData.ai_prompt}
              onChange={handleChange}
              required={builderMode === "ai"}
            />
            <p className="text-xs text-gray-500">
              This is frontend-only for now. Backend AI generation will be
              connected later.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                Plan Exercises
              </p>
              <Button type="button" variant="outline" onClick={addExerciseRow}>
                Add Exercise
              </Button>
            </div>

            {exerciseRows.map((row, index) => (
              <div
                key={row.key}
                className="rounded-md border border-gray-100 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">
                    Exercise {index + 1}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 disabled:opacity-40"
                    disabled={exerciseRows.length <= 1}
                    onClick={() => removeExerciseRow(row.key)}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label="Exercise"
                    name={`exercise-${row.key}`}
                    options={exerciseSelectOptions}
                    value={row.exercise_id ? String(row.exercise_id) : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateExerciseRow(row.key, {
                        exercise_id: value ? Number(value) : null,
                      });
                    }}
                    required
                  />

                  <Input
                    label="Rest"
                    value={row.rest}
                    onChange={(e) =>
                      updateExerciseRow(row.key, { rest: e.target.value })
                    }
                    placeholder="e.g. 60 sec"
                  />

                  <Input
                    label="Sets"
                    value={row.sets}
                    onChange={(e) =>
                      updateExerciseRow(row.key, { sets: e.target.value })
                    }
                    placeholder="e.g. 3"
                  />

                  <Input
                    label="Reps"
                    value={row.reps}
                    onChange={(e) =>
                      updateExerciseRow(row.key, { reps: e.target.value })
                    }
                    placeholder="e.g. 10-12"
                  />
                </div>

                <Input
                  className="mt-3"
                  label="Notes"
                  value={row.notes}
                  onChange={(e) =>
                    updateExerciseRow(row.key, { notes: e.target.value })
                  }
                  placeholder="Optional cue, tempo, or intensity note"
                />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-yellow-800">
          <p className="inline-flex items-center gap-2 font-medium">
            <Sparkles size={14} />{" "}
            {builderMode === "ai" ? "AI Plan Draft" : "Custom Plan Builder"}
          </p>
          <p className="mt-1 text-xs">
            {builderMode === "ai"
              ? "AI prompt plans are created as frontend drafts for now, then we can connect backend generation."
              : "Your selected exercises with sets/reps will be saved and added to active plans immediately."}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {builderMode === "ai" ? "Create with AI" : "Save Plan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
