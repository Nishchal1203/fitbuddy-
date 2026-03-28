export type GoalCategory = "All" | "Fitness" | "Nutrition" | "Sleep" | "Weight";

export type GoalLabel = Exclude<GoalCategory, "All">;

export type ActiveGoal = {
  id: number;
  title: string;
  category: GoalLabel;
  progress: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  dueLabel: string;
  description: string;
  targetDate: string | null;
  steps: string[];
};

export type CompletedGoal = {
  id: number;
  title: string;
  achievedLabel: string;
  category: GoalLabel;
};

export type GoalFormValues = {
  title: string;
  category: GoalLabel;
  currentValue: number;
  targetValue: number;
  unit: string;
  targetDate: string;
  description: string;
  steps: string[];
};
