"use client";

import React, { useState } from "react";
import GoalsDashboard from "@/components/goals/GoalsDashboard";
import FloatingAiButton from "@/components/goals/FloatingAiButton";
import AIGoalAssistant from "@/components/diet-plan/AI_chat";

export default function GoalsPage() {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  return (
    <div className="relative space-y-6 pb-24">
      <GoalsDashboard />
      <FloatingAiButton onClick={() => setIsAIAssistantOpen(true)} />

      <AIGoalAssistant
        isOpen={isAIAssistantOpen}
        mode="goal"
        onClose={() => setIsAIAssistantOpen(false)}
        onApply={() => setIsAIAssistantOpen(false)}
      />
    </div>
  );
}
