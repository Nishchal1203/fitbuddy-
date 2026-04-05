"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "./data";
import type {
  ActiveGoal,
  CompletedGoal,
  GoalCategory,
  GoalFormValues,
} from "./types";
import GoalsHeader from "./GoalsHeader";
import GoalCategoryFilter from "./GoalCategoryFilter";
import ActiveGoalsSection from "./ActiveGoalsSection";
import CompletedGoalsSection from "./CompletedGoalsSection";
import AddGoalModal from "./AddGoalModal";
import GoalDetailsModal from "./GoalDetailsModal";
import {
  buildGoalDescription,
  defaultUnitByCategory,
  inferFollowSteps,
  parseGoalDescription,
  toDueLabel,
  toProgress,
} from "./goalMeta";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";
import { useToast } from "@/components/ui";

type GoalsDashboardProps = {
  aiCreatedGoal?: ActiveGoal | null;
};

const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ aiCreatedGoal }) => {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<GoalCategory>("All");
  const [activeGoals, setActiveGoals] = useState<ActiveGoal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ActiveGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState<ActiveGoal | null>(null);

  const mapGoalRecord = useCallback(
    (goal: {
      id: number;
      title: string;
      description: string | null;
      target_date: string | null;
      is_completed: boolean;
    }) => {
      const parsed = parseGoalDescription(goal.description);
      const category = parsed.metadata?.category || "Fitness";
      const targetValue = parsed.metadata?.targetValue ?? 100;
      const currentValue = parsed.metadata?.currentValue ?? 0;
      const unit = parsed.metadata?.unit || defaultUnitByCategory(category);
      const steps = parsed.metadata?.steps.length
        ? parsed.metadata.steps
        : inferFollowSteps(category, goal.title);

      return {
        id: goal.id,
        title: goal.title,
        category,
        progress: goal.is_completed
          ? 100
          : toProgress(currentValue, targetValue),
        currentValue,
        targetValue,
        unit,
        dueLabel: toDueLabel(goal.target_date),
        description: parsed.cleanDescription,
        targetDate: goal.target_date,
        steps,
      } as ActiveGoal;
    },
    [],
  );

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/goals/?include_completed=true`,
        {
          method: "GET",
          headers: buildAuthHeaders(),
        },
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to load goals.",
        );
        throw new Error(message);
      }

      const rows = (await response.json()) as Array<{
        id: number;
        title: string;
        description: string | null;
        target_date: string | null;
        is_completed: boolean;
      }>;

      setActiveGoals(
        rows.filter((goal) => !goal.is_completed).map(mapGoalRecord),
      );
      setCompletedGoals(
        rows
          .filter((goal) => goal.is_completed)
          .map((goal) => {
            const mappedGoal = mapGoalRecord(goal);
            return {
              id: mappedGoal.id,
              title: mappedGoal.title,
              category: mappedGoal.category,
              achievedLabel: `${mappedGoal.currentValue} / ${mappedGoal.targetValue} ${mappedGoal.unit} - Completed`,
            } as CompletedGoal;
          }),
      );
    } catch (error) {
      showToast({
        title: "Could not load goals",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [mapGoalRecord, showToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (!aiCreatedGoal) return;
    fetchGoals();
    setActiveCategory("All");
  }, [aiCreatedGoal, fetchGoals]);

  const filteredGoals = useMemo(() => {
    if (activeCategory === "All") return activeGoals;
    return activeGoals.filter((goal) => goal.category === activeCategory);
  }, [activeCategory, activeGoals]);

  const handleMarkComplete = async (goal: ActiveGoal) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_completed: true }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to mark goal complete.",
        );
        throw new Error(message);
      }

      showToast({
        title: "Goal completed",
        description: "Great work. Your goal was moved to completed goals.",
        variant: "success",
      });
      setSelectedGoal(null);
      await fetchGoals();
    } catch (error) {
      showToast({
        title: "Completion failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    }
  };

  const handleCreateOrEditGoal = async (values: GoalFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        title: values.title,
        description: buildGoalDescription(values.description, {
          category: values.category,
          currentValue: values.currentValue,
          targetValue: values.targetValue,
          unit: values.unit,
          steps: values.steps.length
            ? values.steps
            : inferFollowSteps(values.category, values.title),
        }),
        target_date: values.targetDate || null,
        is_completed: false,
      };

      const url = editingGoal
        ? `${API_BASE_URL}/api/goals/${editingGoal.id}`
        : `${API_BASE_URL}/api/goals/`;
      const method = editingGoal ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to save goal.",
        );
        throw new Error(message);
      }

      showToast({
        title: editingGoal ? "Goal updated" : "Goal created",
        description: editingGoal
          ? "Your goal changes have been saved."
          : "New goal saved successfully.",
        variant: "success",
      });

      setIsAddGoalOpen(false);
      setEditingGoal(null);
      setSelectedGoal(null);
      setActiveCategory("All");
      await fetchGoals();
    } catch (error) {
      showToast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (goal: ActiveGoal) => {
    const shouldDelete = window.confirm("Delete this goal permanently?");
    if (!shouldDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/${goal.id}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to delete goal.",
        );
        throw new Error(message);
      }

      showToast({
        title: "Goal deleted",
        description: "The goal has been removed.",
        variant: "success",
      });
      setSelectedGoal(null);
      await fetchGoals();
    } catch (error) {
      showToast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    }
  };

  const handleOpenEdit = (goal: ActiveGoal) => {
    setEditingGoal(goal);
    setIsAddGoalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <GoalsHeader onAddGoal={() => setIsAddGoalOpen(true)} />
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-brand-slate/60 shadow-[0_4px_20px_-4px_#9567B920]">
          Loading your goals...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <GoalsHeader
        onAddGoal={() => {
          setEditingGoal(null);
          setIsAddGoalOpen(true);
        }}
      />

      <GoalCategoryFilter
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onChange={setActiveCategory}
      />

      <ActiveGoalsSection
        goals={filteredGoals}
        activeCategory={activeCategory}
        onMarkComplete={handleMarkComplete}
        onOpenDetails={setSelectedGoal}
        onEditGoal={handleOpenEdit}
        onDeleteGoal={handleDeleteGoal}
        onAddGoal={() => {
          setEditingGoal(null);
          setIsAddGoalOpen(true);
        }}
      />

      <CompletedGoalsSection goals={completedGoals} />

      <AddGoalModal
        isOpen={isAddGoalOpen}
        onClose={() => {
          setIsAddGoalOpen(false);
          setEditingGoal(null);
        }}
        onSubmitGoal={handleCreateOrEditGoal}
        initialGoal={editingGoal}
        isSubmitting={isSaving}
      />

      <GoalDetailsModal
        isOpen={Boolean(selectedGoal)}
        goal={selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onEdit={(goal) => {
          setSelectedGoal(null);
          handleOpenEdit(goal);
        }}
        onDelete={handleDeleteGoal}
        onMarkComplete={handleMarkComplete}
      />
    </div>
  );
};

export default GoalsDashboard;
