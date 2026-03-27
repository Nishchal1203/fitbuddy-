"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";

type GoalsHeaderProps = {
  onAddGoal: () => void;
};

export default function GoalsHeader({ onAddGoal }: GoalsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate">
          Fitness &amp; Health Goals
        </h1>
        <p className="mt-0.5 text-sm text-brand-slate/55">
          Track your progress and stay on target.
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className="rounded-xl"
        onClick={onAddGoal}
      >
        <Plus size={16} />
        New Goal
      </Button>
    </div>
  );
}
