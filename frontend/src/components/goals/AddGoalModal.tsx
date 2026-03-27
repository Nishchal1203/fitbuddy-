"use client";

import React, { useMemo, useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import type { ActiveGoal, GoalLabel } from "./types";

type AddGoalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (goal: ActiveGoal) => void;
};

type FormState = {
  title: string;
  category: GoalLabel;
  currentValue: string;
  targetValue: string;
  unit: string;
  targetDate: string;
};

const defaultForm: FormState = {
  title: "",
  category: "Fitness",
  currentValue: "0",
  targetValue: "",
  unit: "",
  targetDate: "",
};

const categoryOptions = [
  { value: "Fitness", label: "Fitness" },
  { value: "Nutrition", label: "Nutrition" },
  { value: "Sleep", label: "Sleep" },
  { value: "Weight", label: "Weight" },
];

const unitSuggestions: Record<GoalLabel, string> = {
  Fitness: "km",
  Nutrition: "g",
  Sleep: "hrs avg",
  Weight: "kg",
};

function toDueLabel(targetDate: string) {
  if (!targetDate) return "Ongoing";
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) return "Ongoing";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toProgress(currentValue: number, targetValue: number) {
  if (targetValue <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((currentValue / targetValue) * 100)),
  );
}

export default function AddGoalModal({
  isOpen,
  onClose,
  onCreateGoal,
}: AddGoalModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const computedProgress = useMemo(() => {
    const current = Number(form.currentValue);
    const target = Number(form.targetValue);
    if (!Number.isFinite(current) || !Number.isFinite(target)) return 0;
    return toProgress(current, target);
  }, [form.currentValue, form.targetValue]);

  const resetAndClose = () => {
    setForm(defaultForm);
    setErrors({});
    onClose();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleCategoryChange = (value: string) => {
    const category = value as GoalLabel;
    setForm((prev) => ({
      ...prev,
      category,
      unit: unitSuggestions[category],
    }));
    setErrors((prev) => ({ ...prev, category: "" }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const trimmedTitle = form.title.trim();
    const current = Number(form.currentValue);
    const target = Number(form.targetValue);

    if (!trimmedTitle) nextErrors.title = "Goal title is required.";
    if (!Number.isFinite(current) || current < 0)
      nextErrors.currentValue = "Current value must be 0 or higher.";
    if (!Number.isFinite(target) || target <= 0)
      nextErrors.targetValue = "Target value must be greater than 0.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onCreateGoal({
      id: Date.now(),
      title: trimmedTitle,
      category: form.category,
      progress: toProgress(current, target),
      currentValue: current,
      targetValue: target,
      unit: form.unit,
      dueLabel: toDueLabel(form.targetDate),
    });

    resetAndClose();
  };

  return (
    <Modal isOpen={isOpen} title="Add New Goal" onClose={resetAndClose}>
      <form onSubmit={handleSubmit} className="space-y-4" data-lpignore="true">
        <Input
          id="goal-title"
          name="goal-title"
          label="Goal Title"
          placeholder="e.g., Run a half marathon"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          error={errors.title}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="goal-category"
            name="goal-category"
            label="Category"
            value={form.category}
            onChange={(event) => handleCategoryChange(event.target.value)}
            options={categoryOptions}
          />

          <Input
            id="goal-unit"
            name="goal-unit"
            label="Unit (auto-set)"
            placeholder="km, kg, g, hrs avg"
            value={form.unit}
            readOnly
            disabled
            error={errors.unit}
            hint={`Auto-set based on ${form.category}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="goal-current"
            name="goal-current"
            type="number"
            min="0"
            step="0.1"
            label="Current Value"
            value={form.currentValue}
            onChange={(event) =>
              updateField("currentValue", event.target.value)
            }
            error={errors.currentValue}
            required
          />

          <Input
            id="goal-target"
            name="goal-target"
            type="number"
            min="0.1"
            step="0.1"
            label="Target Value"
            value={form.targetValue}
            onChange={(event) => updateField("targetValue", event.target.value)}
            error={errors.targetValue}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="goal-date"
            name="goal-date"
            type="date"
            label="Target Date (optional)"
            value={form.targetDate}
            onChange={(event) => updateField("targetDate", event.target.value)}
          />

          <div className="rounded-xl border border-brand-pale bg-brand-bg/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-slate/60">
              Preview
            </p>
            <p className="mt-1 text-sm text-brand-slate">
              Estimated progress:{" "}
              <span className="font-bold">{computedProgress}%</span>
            </p>
            <p className="text-xs text-brand-slate/60">
              Due: {toDueLabel(form.targetDate)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="submit">Create Goal</Button>
        </div>
      </form>
    </Modal>
  );
}
