"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ACTIVE_GOALS, CATEGORIES, COMPLETED_GOALS } from "./data";
import type { ActiveGoal, CompletedGoal, GoalCategory } from "./types";
import GoalsHeader from "./GoalsHeader";
import GoalCategoryFilter from "./GoalCategoryFilter";
import ActiveGoalsSection from "./ActiveGoalsSection";
import CompletedGoalsSection from "./CompletedGoalsSection";
import AddGoalModal from "./AddGoalModal";

type GoalsDashboardProps = {
  aiCreatedGoal?: ActiveGoal | null;
};

const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ aiCreatedGoal }) => {
  const [activeCategory, setActiveCategory] = useState<GoalCategory>("All");
  const [activeGoals, setActiveGoals] = useState<ActiveGoal[]>(ACTIVE_GOALS);
  const [completedGoals, setCompletedGoals] =
    useState<CompletedGoal[]>(COMPLETED_GOALS);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  useEffect(() => {
    if (!aiCreatedGoal) return;

    setActiveGoals((prev) => {
      const exists = prev.some((goal) => goal.id === aiCreatedGoal.id);
      if (exists) {
        return prev.map((goal) => (goal.id === aiCreatedGoal.id ? aiCreatedGoal : goal));
      }
      return [aiCreatedGoal, ...prev];
    });
    setActiveCategory("All");
  }, [aiCreatedGoal]);

  const filteredGoals = useMemo(() => {
    if (activeCategory === "All") return activeGoals;
    return activeGoals.filter((goal) => goal.category === activeCategory);
  }, [activeCategory, activeGoals]);

  const handleMarkComplete = (goal: ActiveGoal) => {
    setActiveGoals((prev) => prev.filter((item) => item.id !== goal.id));
    setCompletedGoals((prev) => [
      {
        id: prev.some((item) => item.id === goal.id)
          ? Math.max(goal.id, ...prev.map((item) => item.id)) + 1
          : goal.id,
        title: goal.title,
        category: goal.category,
        achievedLabel: `${goal.currentValue} / ${goal.targetValue} ${goal.unit} - Completed ${new Date().toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
        )}`,
      },
      ...prev,
    ]);
  };

  const handleCreateGoal = (goal: ActiveGoal) => {
    setActiveGoals((prev) => [goal, ...prev]);
    setActiveCategory("All");
  };

  return (
    <div className="space-y-8 p-6">
      <GoalsHeader onAddGoal={() => setIsAddGoalOpen(true)} />

      <GoalCategoryFilter
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onChange={setActiveCategory}
      />

      <ActiveGoalsSection
        goals={filteredGoals}
        activeCategory={activeCategory}
        onMarkComplete={handleMarkComplete}
        onAddGoal={() => setIsAddGoalOpen(true)}
      />

      <CompletedGoalsSection goals={completedGoals} />

      <AddGoalModal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        onCreateGoal={handleCreateGoal}
      />
    </div>
  );
};

export default GoalsDashboard;
