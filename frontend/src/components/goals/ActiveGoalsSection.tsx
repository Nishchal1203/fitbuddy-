"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { ActiveGoal, GoalCategory } from "./types";
import ActiveGoalCard from "./ActiveGoalCard";

type ActiveGoalsSectionProps = {
  goals: ActiveGoal[];
  activeCategory: GoalCategory;
  onMarkComplete: (goal: ActiveGoal) => void;
  onAddGoal: () => void;
};

export default function ActiveGoalsSection({
  goals,
  activeCategory,
  onMarkComplete,
  onAddGoal,
}: ActiveGoalsSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-brand-slate">
        Active Goals
        <span className="ml-2 rounded-full bg-brand-pale px-2 py-0.5 text-xs font-semibold text-brand-purple">
          {goals.length}
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {goals.map((goal) => (
          <ActiveGoalCard
            key={goal.id}
            goal={goal}
            onMarkComplete={onMarkComplete}
          />
        ))}

        <Button
          type="button"
          onClick={onAddGoal}
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-mauve bg-transparent p-5 text-center transition hover:bg-brand-pale/30"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple text-white shadow-md">
            <Plus size={20} />
          </div>
          <p className="text-sm font-semibold text-brand-slate/70">
            Add New Goal
          </p>
        </Button>
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-12 text-center shadow-[0_4px_20px_-4px_#9567B920]">
          <span className="text-3xl">Target</span>
          <p className="font-semibold text-brand-slate">
            No {activeCategory} goals yet
          </p>
          <p className="text-sm text-brand-slate/50">
            Add a new goal to get started.
          </p>
          <Button type="button" size="sm" onClick={onAddGoal}>
            Create your first goal
          </Button>
        </div>
      )}
    </section>
  );
}
