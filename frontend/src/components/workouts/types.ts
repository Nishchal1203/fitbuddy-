export type WorkoutPlan = {
  id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  duration_days?: number | null;
  is_completed?: boolean;
  owner_id?: number | null;
  goal_id?: number | null;
  isDraft?: boolean;
};

export type MyPlanRecord = {
  id: number;
  user_id: number;
  workout_id: number;
  start_date?: string | null;
};

export type PlanExercise = {
  exercise_id?: number;
  name: string;
  category: string;
  sets?: string | number;
  reps?: string | number;
  rest?: string;
  time?: string | number;
  duration?: string | number;
  duration_minutes?: number;
  notes?: string;
  instructions?: string;
};

export type PlanExercisePayload = {
  plan_title: string;
  plan_level?: string | null;
  plan_duration?: number | null;
  exercises: PlanExercise[];
};

export type CustomPlanDraftInput = {
  title: string;
  description: string;
  level: string;
  duration_days: number;
  focus: string;
  exercises: PlanExercise[];
  generation_mode?: "manual" | "ai";
  ai_prompt?: string;
};
