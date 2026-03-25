"use client";

import React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { CATEGORY_COLOR, RING_STROKE } from "./data";
import type { ActiveGoal } from "./types";
import ProgressRing from "./ProgressRing";

type ActiveGoalCardProps = {
  goal: ActiveGoal;
  onMarkComplete: (goal: ActiveGoal) => void;
};

export default function ActiveGoalCard({
  goal,
  onMarkComplete,
}: ActiveGoalCardProps) {
  const ringColor = RING_STROKE[goal.category];
  const badgeCls = CATEGORY_COLOR[goal.category];

  return (
    <Card className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}
          >
            {goal.category}
          </span>
          <h3 className="text-base font-bold leading-snug text-brand-slate">
            {goal.title}
          </h3>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          <button
            className="rounded-lg p-1.5 text-brand-slate/40 transition-colors hover:bg-brand-bg hover:text-brand-purple"
            aria-label="Edit goal"
          >
            <Pencil size={14} />
          </button>
          <button
            className="rounded-lg p-1.5 text-brand-slate/40 transition-colors hover:bg-red-50 hover:text-red-400"
            aria-label="Delete goal"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ProgressRing percent={goal.progress} color={ringColor} />
        <div>
          <p className="text-xl font-bold text-brand-slate">
            {goal.currentValue}
            <span className="text-sm font-medium text-brand-slate/50">
              {" "}
              / {goal.targetValue} {goal.unit}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-brand-slate/50">Target</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-brand-pale pt-3">
        <span className="text-xs text-brand-slate/50">Due</span>
        <span className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-slate">
          {goal.dueLabel}
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full rounded-xl"
        onClick={() => onMarkComplete(goal)}
      >
        <Check size={14} />
        Mark as complete
      </Button>
    </Card>
  );
}
