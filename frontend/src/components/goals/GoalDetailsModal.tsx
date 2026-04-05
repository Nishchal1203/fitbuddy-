"use client";

import React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import type { ActiveGoal } from "./types";
import { CATEGORY_COLOR } from "./data";

type GoalDetailsModalProps = {
  isOpen: boolean;
  goal: ActiveGoal | null;
  onClose: () => void;
  onEdit: (goal: ActiveGoal) => void;
  onDelete: (goal: ActiveGoal) => void;
  onMarkComplete: (goal: ActiveGoal) => void;
};

export default function GoalDetailsModal({
  isOpen,
  goal,
  onClose,
  onEdit,
  onDelete,
  onMarkComplete,
}: GoalDetailsModalProps) {
  if (!goal) {
    return null;
  }

  const badgeCls = CATEGORY_COLOR[goal.category];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Goal Details">
      <div className="space-y-4">
        <div className="space-y-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}
          >
            {goal.category}
          </span>
          <h3 className="text-lg font-bold text-brand-slate">{goal.title}</h3>
          <p className="text-sm text-brand-slate/70">
            {goal.description || "No description provided."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand-pale bg-brand-bg/40 p-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-slate/50">
              Current
            </p>
            <p className="text-sm font-bold text-brand-slate">
              {goal.currentValue} {goal.unit}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-slate/50">
              Target
            </p>
            <p className="text-sm font-bold text-brand-slate">
              {goal.targetValue} {goal.unit}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-slate/50">
              Due
            </p>
            <p className="text-sm font-bold text-brand-slate">
              {goal.dueLabel}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-brand-pale bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-slate/60">
            What to Follow to Achieve This Goal
          </p>
          <ul className="space-y-2">
            {goal.steps.map((step, index) => (
              <li
                key={`${goal.id}-${index}`}
                className="flex items-start gap-2 text-sm text-brand-slate/80"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-pale text-xs font-bold text-brand-purple">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onEdit(goal)}>
            <Pencil size={14} />
            Edit
          </Button>
          <Button type="button" variant="danger" onClick={() => onDelete(goal)}>
            <Trash2 size={14} />
            Delete
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onMarkComplete(goal)}
          >
            <Check size={14} />
            Mark Complete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
