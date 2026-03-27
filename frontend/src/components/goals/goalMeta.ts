import type { GoalLabel } from "./types";

export const GOAL_META_PREFIX = "[[fitbuddy_meta]]";

export type GoalMetadata = {
  category: GoalLabel;
  currentValue: number;
  targetValue: number;
  unit: string;
  steps: string[];
};

export function normalizeGoalCategory(input?: string): GoalLabel {
  const lower = String(input || "").toLowerCase();
  if (lower.includes("nutri") || lower.includes("diet")) return "Nutrition";
  if (lower.includes("sleep") || lower.includes("rest")) return "Sleep";
  if (lower.includes("weight") || lower.includes("fat") || lower.includes("bulk")) {
    return "Weight";
  }
  return "Fitness";
}

export function defaultUnitByCategory(category: GoalLabel): string {
  if (category === "Nutrition") return "g";
  if (category === "Sleep") return "hrs avg";
  if (category === "Weight") return "kg";
  return "km";
}

export function inferFollowSteps(category: GoalLabel, title: string): string[] {
  if (category === "Nutrition") {
    return [
      "Plan meals for the next 3 days.",
      "Track calories and macros daily.",
      "Review nutrition progress every Sunday.",
    ];
  }

  if (category === "Sleep") {
    return [
      "Set a fixed bedtime and wake-up time.",
      "Avoid screens 45 minutes before sleep.",
      "Track average sleep hours weekly.",
    ];
  }

  if (category === "Weight") {
    return [
      "Log body weight at the same time each week.",
      "Keep workouts and nutrition consistent.",
      "Adjust plan based on 2-week trend.",
    ];
  }

  return [
    `Break "${title}" into weekly milestones.`,
    "Complete planned workouts before increasing intensity.",
    "Review progress and adjust load every week.",
  ];
}

export function toDueLabel(targetDate?: string | null): string {
  if (!targetDate) return "Ongoing";
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) return "Ongoing";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toProgress(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));
}

export function buildGoalDescription(
  description: string | undefined,
  metadata: GoalMetadata,
): string {
  const base = String(description || "").trim();
  const metaText = `${GOAL_META_PREFIX}${JSON.stringify(metadata)}`;
  return base ? `${base}\n\n${metaText}` : metaText;
}

export function parseGoalDescription(description: string | null | undefined): {
  cleanDescription: string;
  metadata: GoalMetadata | null;
} {
  const raw = String(description || "");
  const idx = raw.indexOf(GOAL_META_PREFIX);

  if (idx === -1) {
    return {
      cleanDescription: raw.trim(),
      metadata: null,
    };
  }

  const cleanDescription = raw.slice(0, idx).trim();
  const metaRaw = raw.slice(idx + GOAL_META_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(metaRaw) as Partial<GoalMetadata>;
    const category = normalizeGoalCategory(String(parsed.category || "Fitness"));
    const currentValue = Number(parsed.currentValue ?? 0);
    const targetValue = Math.max(1, Number(parsed.targetValue ?? 100));
    const unit = String(parsed.unit || defaultUnitByCategory(category));
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0)
      : [];

    return {
      cleanDescription,
      metadata: {
        category,
        currentValue: Number.isFinite(currentValue) ? Math.max(0, currentValue) : 0,
        targetValue: Number.isFinite(targetValue) ? targetValue : 100,
        unit,
        steps,
      },
    };
  } catch {
    return {
      cleanDescription,
      metadata: null,
    };
  }
}
