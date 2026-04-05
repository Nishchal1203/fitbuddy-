"use client";

import React, { useState } from "react";
import GoalsDashboard from "@/components/goals/GoalsDashboard";
import FloatingAiButton from "@/components/goals/FloatingAiButton";
import AIGoalAssistant from "@/components/diet-plan/AI_chat";
import type { ActiveGoal } from "@/components/goals/types";
import { useToast } from "@/components/ui";
import {
  API_BASE_URL,
  buildAuthHeaders,
  getAuthToken,
  readErrorMessage,
} from "@/Utils/api";
import {
  buildGoalDescription,
  defaultUnitByCategory,
  inferFollowSteps,
  normalizeGoalCategory,
  toDueLabel,
} from "@/components/goals/goalMeta";

type GoalApplyPayload = {
  title?: string;
  category?: string;
  target_value?: number;
  current_value?: number;
  target_unit?: string;
  unit?: string;
  duration_days?: number;
  description?: string;
  ai_suggestions?: string[];
};

export default function GoalsPage() {
  const { showToast } = useToast();
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiCreatedGoal, setAiCreatedGoal] = useState<ActiveGoal | null>(null);

  const handleApplyAIGoal = async (data: Record<string, unknown>) => {
    const payload = data as GoalApplyPayload;

    const title = String(payload.title || "AI Goal").trim() || "AI Goal";
    const category = normalizeGoalCategory(payload.category);
    const targetValue = Math.max(1, Number(payload.target_value || 100));
    const currentValue = Math.max(0, Number(payload.current_value || 0));
    const unit = String(
      payload.target_unit || payload.unit || defaultUnitByCategory(category),
    );
    const durationDays = Math.max(7, Number(payload.duration_days || 30));
    const targetDate = new Date(Date.now() + durationDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const description = String(
      payload.description ||
        `AI vision goal for ${category.toLowerCase()} improvement.`,
    );
    const steps = Array.isArray(payload.ai_suggestions)
      ? payload.ai_suggestions.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : inferFollowSteps(category, title);

    let goalId = Date.now();
    const token = getAuthToken();

    if (!token) {
      showToast({
        title: "Not authenticated",
        description: "Please login again before creating goals.",
        variant: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title,
          description: buildGoalDescription(description, {
            category,
            currentValue,
            targetValue,
            unit,
            steps,
          }),
          target_date: targetDate,
          is_completed: false,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to save goal.",
        );
        throw new Error(message);
      }

      const created = (await response.json()) as { id?: number };
      if (typeof created.id === "number") {
        goalId = created.id;
      }
    } catch (error) {
      showToast({
        title: "Goal save failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
      return;
    }

    const progress = Math.max(
      0,
      Math.min(100, Math.round((currentValue / targetValue) * 100)),
    );

    setAiCreatedGoal({
      id: goalId,
      title,
      category,
      progress,
      currentValue,
      targetValue,
      unit,
      dueLabel: toDueLabel(targetDate),
      description,
      targetDate,
      steps,
    });

    setIsAIAssistantOpen(false);
    showToast({
      title: "Goal created",
      description: "AI goal added to your Goals page.",
      variant: "success",
    });
  };

  return (
    <div className="relative space-y-6 pb-24">
      <GoalsDashboard aiCreatedGoal={aiCreatedGoal} />
      <FloatingAiButton onClick={() => setIsAIAssistantOpen(true)} />

      <AIGoalAssistant
        isOpen={isAIAssistantOpen}
        mode="goal"
        onClose={() => setIsAIAssistantOpen(false)}
        onApply={handleApplyAIGoal}
      />
    </div>
  );
}
