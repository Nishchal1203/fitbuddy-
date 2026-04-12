import type {
  ActiveGoal,
  CompletedGoal,
  GoalCategory,
  GoalLabel,
} from "./types";

export const CATEGORIES: GoalCategory[] = [
  "All",
  "Fitness",
  "Nutrition",
  "Sleep",
  "Weight",
];

export const ACTIVE_GOALS: ActiveGoal[] = [
  {
    id: 1,
    title: "Run a Marathon",
    category: "Fitness",
    progress: 65,
    currentValue: 20,
    targetValue: 42.2,
    unit: "km",
    dueLabel: "Dec 31, 2024",
    description: "Build endurance and complete a full marathon by year end.",
    targetDate: "2024-12-31",
    steps: ["Increase weekly long run", "Add speed sessions", "Track recovery"],
  },
  {
    id: 2,
    title: "Build Muscle Mass",
    category: "Fitness",
    progress: 40,
    currentValue: 72,
    targetValue: 80,
    unit: "kg",
    dueLabel: "Nov 15, 2024",
    description: "Progressively gain lean muscle with strength training.",
    targetDate: "2024-11-15",
    steps: ["Follow a 4-day split", "Eat a calorie surplus", "Track weekly weight"],
  },
  {
    id: 3,
    title: "Improve Sleep Quality",
    category: "Sleep",
    progress: 85,
    currentValue: 7.5,
    targetValue: 8,
    unit: "hrs avg",
    dueLabel: "Oct 31, 2024",
    description: "Improve sleep consistency and average nightly duration.",
    targetDate: "2024-10-31",
    steps: ["Set fixed bedtime", "Limit caffeine after noon", "Reduce screen time"],
  },
  {
    id: 4,
    title: "Daily Protein Goal",
    category: "Nutrition",
    progress: 55,
    currentValue: 110,
    targetValue: 180,
    unit: "g",
    dueLabel: "Ongoing",
    description: "Hit a daily protein target to support training goals.",
    targetDate: null,
    steps: ["Plan high-protein meals", "Add post-workout shake", "Log meals daily"],
  },
];

export const COMPLETED_GOALS: CompletedGoal[] = [
  {
    id: 1,
    title: "Complete 5k Run",
    achievedLabel: "5k Run - Achieved Aug 20, 2024",
    category: "Fitness",
  },
  {
    id: 2,
    title: "Drink 3L Water Daily",
    achievedLabel: "Drink 3L Water - Aug 20, 2024",
    category: "Nutrition",
  },
];

export const CATEGORY_COLOR: Record<GoalLabel, string> = {
  Fitness: "bg-brand-purple text-white",
  Nutrition: "bg-brand-gold text-white",
  Sleep: "bg-brand-deep text-white",
  Weight: "bg-brand-soft text-white",
};

export const RING_STROKE: Record<GoalLabel, string> = {
  Fitness: "#BE70E7",
  Nutrition: "#FCB60F",
  Sleep: "#9567B9",
  Weight: "#C98CE8",
};
