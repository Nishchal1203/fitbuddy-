"use client";

import React, { useState } from "react";
import GoalsDashboard from "@/components/goals/GoalsDashboard";
import FloatingAiButton from "@/components/goals/FloatingAiButton";
import AIGoalAssistant from "@/components/diet-plan/AI_chat";
import type { ActiveGoal, GoalLabel } from "@/components/goals/types";
import { useToast } from "@/components/ui";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type GoalApplyPayload = {
  title?: string;
  category?: string;
  target_value?: number;
  current_value?: number;
  target_unit?: string;
  unit?: string;
  duration_days?: number;
  description?: string;
};

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function buildAuthHeaders(extra?: Record<string, string>) {
  const token = getAccessToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeGoalCategory(input?: string): GoalLabel {
  const lower = String(input || "").toLowerCase();
  if (lower.includes("nutri") || lower.includes("diet")) return "Nutrition";
  if (lower.includes("sleep") || lower.includes("rest")) return "Sleep";
  if (lower.includes("weight") || lower.includes("fat") || lower.includes("bulk")) return "Weight";
  return "Fitness";
}

function defaultUnitByCategory(category: GoalLabel): string {
  if (category === "Nutrition") return "g";
  if (category === "Sleep") return "hrs avg";
  if (category === "Weight") return "kg";
  return "km";
}

function toDueLabel(targetDate: string) {
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) return "Ongoing";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    const unit = String(payload.target_unit || payload.unit || defaultUnitByCategory(category));
    const durationDays = Math.max(7, Number(payload.duration_days || 30));
    const targetDate = new Date(Date.now() + durationDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const description = String(payload.description || `AI vision goal for ${category.toLowerCase()} improvement.`);

    let goalId = Date.now();
    const token = getAccessToken();

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/goals/`, {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title,
            description,
            target_date: targetDate,
            is_completed: false,
          }),
        });

        if (response.ok) {
          const created = (await response.json()) as { id?: number };
          if (typeof created.id === "number") {
            goalId = created.id;
          }
        }
      } catch {
        // Keep local fallback goal creation when API fails.
      }
    }

    const progress = Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));

    setAiCreatedGoal({
      id: goalId,
      title,
      category,
      progress,
      currentValue,
      targetValue,
      unit,
      dueLabel: toDueLabel(targetDate),
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
