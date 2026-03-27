"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui";
import {
  CustomPlanBuilder,
  PlanDetailsModal,
  PlanExercisePayload,
  WorkoutPlan,
} from "@/components/workouts";
import { getProgressPercent } from "@/components/workouts/helpers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ActivePlanApiEntry = {
  plan: WorkoutPlan;
  start_date: string | null;
};

type AIWorkoutDraftApiResponse = {
  plan: WorkoutPlan;
  ai_status: string;
  ai_message: string;
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

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (payload?.detail && typeof payload.detail === "string") {
      return payload.detail;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/* ─────────────────────────────────────────────
   FALLBACK DATA
───────────────────────────────────────────── */
const FALLBACK_RECOMMENDED: WorkoutPlan[] = [
  {
    id: 901,
    title: "Fat Loss",
    description: "Focus on high intensity cardio and calorie burn.",
    level: "beginner",
    duration_days: 30,
  },
  {
    id: 902,
    title: "Muscle Gain",
    description: "Hypertrophy training for volume and strength.",
    level: "intermediate",
    duration_days: 42,
  },
  {
    id: 903,
    title: "Endurance",
    description: "Build stamina with long-duration functional sets.",
    level: "advanced",
    duration_days: 56,
  },
  {
    id: 904,
    title: "Flexibility",
    description: "Improve range of motion and joint health.",
    level: "beginner",
    duration_days: 21,
  },
];

function buildFallbackPlanDetails(plan: WorkoutPlan): PlanExercisePayload {
  return {
    plan_title: plan.title,
    plan_level: plan.level,
    plan_duration: plan.duration_days,
    exercises: [
      {
        name: "Warm-up Mobility",
        category: "Mobility",
        sets: 2,
        reps: "45 sec",
        rest: "30 sec",
      },
      {
        name: "Main Strength Block",
        category: "Strength",
        sets: 4,
        reps: "8-12",
        rest: "90 sec",
      },
      {
        name: "Conditioning Finisher",
        category: "Cardio",
        sets: 3,
        reps: "60 sec",
        rest: "45 sec",
      },
    ],
  };
}

type ActivePlanEntry = {
  plan: WorkoutPlan;
  start_date: string | null;
};

async function loadPlanExercises(planId: number): Promise<PlanExercisePayload | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/workout-plans/${planId}/exercises`,
      { headers: buildAuthHeaders() },
    );
    if (!response.ok) return null;
    return (await response.json()) as PlanExercisePayload;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────
   LEVEL BADGE
───────────────────────────────────────────── */
function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    beginner: "bg-brand-gold     text-white",
    intermediate: "bg-brand-purple   text-white",
    advanced: "bg-brand-deep     text-white",
  };
  const cls = map[level.toLowerCase()] ?? "bg-brand-mauve text-white";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {level}
    </span>
  );
}

/* ─────────────────────────────────────────────
   PLAN CARD
───────────────────────────────────────────── */
function RecommendedPlanCard({
  plan,
  onViewDetails,
}: {
  plan: WorkoutPlan;
  onViewDetails: (id: number) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white overflow-hidden shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="flex h-44 items-center justify-center bg-brand-bg">
        <span className="text-4xl text-brand-mauve ">🏋️</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-brand-slate">{plan.title}</h3>
          <LevelBadge level={plan.level} />
        </div>

        <p className="flex-1 text-xs leading-relaxed text-brand-slate/60">
          {plan.description}
        </p>

        <button
          onClick={() => onViewDetails(plan.id)}
          className="mt-2 w-full rounded-xl bg-brand-purple py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          View Plan
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVE PLAN CARD
───────────────────────────────────────────── */
const ACCENT_COLORS = [
  "border-brand-purple",
  "border-brand-gold",
  "border-brand-mauve",
];

function ActivePlanCardLocal({
  entry,
  index,
  onViewDetails,
}: {
  entry: ActivePlanEntry;
  index: number;
  onViewDetails: (id: number) => void;
}) {
  const { plan, start_date } = entry;
  const progress = getProgressPercent(start_date, plan.duration_days);
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  let dayLabel = `0 of ${plan.duration_days}`;
  if (start_date) {
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(start_date).getTime()) / 86_400_000),
    );
    dayLabel = `Day ${Math.min(elapsed, plan.duration_days)} of ${plan.duration_days}`;
  }

  return (
    <div
      className={`rounded-2xl border-l-4 ${accent} bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-brand-slate">{plan.title}</p>
          <p className="mt-0.5 text-xs text-brand-slate/50">{dayLabel}</p>
        </div>
        <span className="text-sm font-bold text-brand-purple">{progress}%</span>
      </div>

      <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-brand-pale">
        <div
          className="h-full rounded-full bg-brand-purple transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-brand-slate/60">
        <span>
          Next: {plan.isDraft ? "Custom session" : "Scheduled workout"}
        </span>
        <button
          onClick={() => onViewDetails(plan.id)}
          className="font-semibold text-brand-purple hover:text-brand-deep"
        >
          Resume
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */
function SkeletonPlanCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="h-44 rounded-t-2xl bg-brand-pale" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-brand-pale" />
        <div className="h-3 rounded bg-brand-pale" />
        <div className="h-3 w-3/4 rounded bg-brand-pale" />
        <div className="h-9 rounded bg-brand-pale" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function WorkoutPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recommendedPlans, setRecommendedPlans] = useState<WorkoutPlan[]>([]);
  const [remoteActivePlans, setRemoteActivePlans] = useState<ActivePlanEntry[]>([]);
  const [localActivePlanIds, setLocalActivePlanIds] = useState<number[]>([]);
  const [localDraftPlans, setLocalDraftPlans] = useState<WorkoutPlan[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedPlanDetails, setSelectedPlanDetails] =
    useState<PlanExercisePayload | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedRecommended: WorkoutPlan[] = FALLBACK_RECOMMENDED;

      const token = getAccessToken();
      if (token) {
        const recommendedResponse = await fetch(
          `${API_BASE_URL}/api/workout-plans/recommended`,
          { headers: buildAuthHeaders() },
        );
        if (recommendedResponse.ok) {
          const data = await recommendedResponse.json();
          if (Array.isArray(data) && data.length > 0) {
            resolvedRecommended = data;
          }
        }

        const activeResponse = await fetch(`${API_BASE_URL}/api/workout-plans/active`, {
          headers: buildAuthHeaders(),
        });

        if (activeResponse.ok) {
          const activeData = (await activeResponse.json()) as ActivePlanApiEntry[];
          setRemoteActivePlans(
            activeData.map((entry) => ({
              plan: entry.plan,
              start_date: entry.start_date,
            })),
          );
        } else {
          setRemoteActivePlans([]);
        }
      } else {
        setRemoteActivePlans([]);
      }

      setRecommendedPlans(resolvedRecommended);
    } catch {
      setRecommendedPlans(FALLBACK_RECOMMENDED);
      setRemoteActivePlans([]);
      showToast({
        title: "Using fallback plans",
        description: "Backend workout plans are currently unavailable.",
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const subscribedIds = useMemo(() => {
    const remoteIds = remoteActivePlans.map((entry) => entry.plan.id);
    return new Set([...remoteIds, ...localActivePlanIds]);
  }, [remoteActivePlans, localActivePlanIds]);

  const mergedActivePlans = useMemo<ActivePlanEntry[]>(() => {
    const combined: ActivePlanEntry[] = [...remoteActivePlans];
    const existingIds = new Set(remoteActivePlans.map((entry) => entry.plan.id));

    recommendedPlans.forEach((plan) => {
      if (localActivePlanIds.includes(plan.id) && !existingIds.has(plan.id)) {
        combined.push({
          plan,
          start_date: new Date().toISOString(),
        });
      }
    });

    localDraftPlans.forEach((draft) => {
      if (!combined.some((entry) => entry.plan.id === draft.id)) {
        combined.push({ plan: draft, start_date: new Date().toISOString() });
      }
    });

    return combined;
  }, [localDraftPlans, localActivePlanIds, recommendedPlans, remoteActivePlans]);

  const handleViewPlanDetails = async (planId: number) => {
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    setSelectedPlanDetails(null);

    const plan = [...recommendedPlans, ...localDraftPlans, ...remoteActivePlans.map((entry) => entry.plan)].find(
      (p) => p.id === planId,
    );
    setSelectedPlan(plan || null);

    try {
      const token = getAccessToken();
      if (!token) {
        setSelectedPlanDetails(plan ? buildFallbackPlanDetails(plan) : null);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/workout-plans/${planId}/exercises`,
        { headers: buildAuthHeaders() },
      );

      if (!response.ok) {
        setSelectedPlanDetails(plan ? buildFallbackPlanDetails(plan) : null);
        return;
      }

      const payload = (await response.json()) as PlanExercisePayload;
      setSelectedPlanDetails(payload);
    } catch {
      setSelectedPlanDetails(plan ? buildFallbackPlanDetails(plan) : null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const subscribePlan = async (plan: WorkoutPlan) => {
    const token = getAccessToken();
    if (!token) {
      setLocalActivePlanIds((prev) =>
        prev.includes(plan.id) ? prev : [...prev, plan.id],
      );
      showToast({
        title: "Saved locally",
        description: "Sign in to sync follows with backend.",
        variant: "info",
      });
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/workout-plans/${plan.id}/follow`,
        {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to follow plan."));
      }

      await loadPlans();
    } catch {
      setLocalActivePlanIds((prev) =>
        prev.includes(plan.id) ? prev : [...prev, plan.id],
      );
      showToast({
        title: "Saved locally",
        description: "Backend sync failed. Plan followed locally.",
        variant: "warning",
      });
      return;
    }

    setLocalActivePlanIds((prev) =>
      prev.includes(plan.id) ? prev : [...prev, plan.id],
    );

    showToast({
      title: "Plan followed",
      description: `${plan.title} added to active plans.`,
      variant: "success",
    });
  };

  const unsubscribePlan = async (plan: WorkoutPlan) => {
    setLocalActivePlanIds((prev) => prev.filter((id) => id !== plan.id));

    const token = getAccessToken();
    if (!token) {
      if (plan.isDraft) {
        setLocalDraftPlans((prev) => prev.filter((item) => item.id !== plan.id));
      }
      showToast({
        title: "Removed locally",
        description: `${plan.title} removed from your local active plans.`,
        variant: "info",
      });
      return;
    }

    try {
      if (plan.owner_id) {
        const deleteResp = await fetch(
          `${API_BASE_URL}/api/workout-plans/${plan.id}`,
          {
            method: "DELETE",
            headers: buildAuthHeaders(),
          },
        );
        if (!deleteResp.ok) {
          throw new Error(await readErrorMessage(deleteResp, "Failed to remove custom plan."));
        }
      } else {
        const unfollowResp = await fetch(
          `${API_BASE_URL}/api/workout-plans/${plan.id}/follow`,
          {
            method: "DELETE",
            headers: buildAuthHeaders(),
          },
        );
        if (!unfollowResp.ok) {
          throw new Error(await readErrorMessage(unfollowResp, "Failed to unfollow plan."));
        }
      }
      await loadPlans();
    } catch {
      showToast({
        title: "Removed locally",
        description: "Backend sync failed.",
        variant: "warning",
      });
    }

    if (plan.isDraft) {
      setLocalDraftPlans((prev) => prev.filter((item) => item.id !== plan.id));
      showToast({
        title: "Draft removed",
        description: "Custom draft deleted.",
        variant: "info",
      });
      return;
    }

    showToast({
      title: "Plan removed",
      description: `${plan.title} removed from active plans.`,
      variant: "info",
    });
  };

  const handleToggleSubscribe = (plan: WorkoutPlan) => {
    subscribedIds.has(plan.id) ? unsubscribePlan(plan) : subscribePlan(plan);
  };

  const handleCreateDraft = async (input: {
    title: string;
    description: string;
    level: string;
    duration_days: number;
    focus: string;
    exercises: PlanExercisePayload["exercises"];
    generation_mode?: "manual" | "ai";
    ai_prompt?: string;
  }) => {
    const token = getAccessToken();

    if (input.generation_mode === "ai") {
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/workout-plans/ai-draft`, {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              title: input.title,
              description: input.description,
              level: input.level,
              duration_days: input.duration_days,
              focus: input.focus,
              ai_prompt: input.ai_prompt || "Generate a balanced workout plan",
            }),
          });

          if (response.ok) {
            const payload = (await response.json()) as AIWorkoutDraftApiResponse;
            const createdPlan = payload.plan;

            setLocalDraftPlans((prev) => {
              const withoutDuplicate = prev.filter((item) => item.id !== createdPlan.id);
              return [{ ...createdPlan, isDraft: true }, ...withoutDuplicate];
            });
            setLocalActivePlanIds((prev) =>
              prev.includes(createdPlan.id) ? prev : [...prev, createdPlan.id],
            );

            setSelectedPlan({ ...createdPlan, isDraft: true });
            setIsDetailsOpen(true);
            setLoadingDetails(true);
            const exercises = await loadPlanExercises(createdPlan.id);
            setSelectedPlanDetails(
              exercises || buildFallbackPlanDetails({ ...createdPlan, isDraft: true }),
            );
            setLoadingDetails(false);

            await loadPlans();
            showToast({
              title: "AI draft created",
              description:
                payload.ai_message || "AI workout draft saved and added to your active plans.",
              variant: "achievement",
            });
            return;
          }
        } catch {
          // Fall back to local draft if backend AI draft fails.
        }
      }

      const aiDraft: WorkoutPlan = {
        id: Date.now(),
        title: input.title || "AI Workout Plan (Pending)",
        description: `${input.description} AI Prompt: ${input.ai_prompt || "No prompt provided yet."}`,
        level: input.level,
        duration_days: input.duration_days,
        isDraft: true,
      };
      setLocalDraftPlans((prev) => [aiDraft, ...prev]);
      showToast({
        title: "AI draft created",
        description:
          "Prompt saved locally. Connect backend AI service provider next for real generation.",
        variant: "achievement",
      });
      return;
    }

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/workout-plans/custom`, {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            level: input.level,
            duration_days: input.duration_days,
            focus: input.focus,
            exercises: input.exercises,
          }),
        });

        if (response.ok) {
          await loadPlans();
          showToast({
            title: "Plan created",
            description: "Custom workout plan saved to backend.",
            variant: "success",
          });
          return;
        }
      } catch {
        // Fall back to local draft if backend custom creation fails.
      }
    }

    const draft: WorkoutPlan = {
      id: Date.now(),
      title: input.title,
      description: `${input.description} Focus: ${input.focus || "general conditioning"}`,
      level: input.level,
      duration_days: input.duration_days,
      isDraft: true,
    };

    setLocalDraftPlans((prev) => [draft, ...prev]);
    showToast({
      title: "Draft created",
      description: "Custom plan saved locally as fallback.",
      variant: "achievement",
    });
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate">Workout Plans</h1>
        <p className="mt-1 text-sm text-brand-slate/55">
          Browse recommendations, build your own drafts, and manage active
          routines.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowBuilder(true)}
        className="w-full rounded-2xl border-2 border-dashed border-brand-mauve bg-brand-bg py-8 text-center transition hover:bg-brand-pale/40"
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple text-white shadow-md">
          <Plus size={22} />
        </div>
        <p className="text-base font-bold text-brand-purple">
          Create Your Own Plan
        </p>
        <p className="mt-1 text-sm text-brand-slate/55">
          Tailor exercises, sets, and reps to your goals.
        </p>
      </button>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-brand-slate">
          AI Recommended Plans
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? [...Array(4)].map((_, idx) => <SkeletonPlanCard key={idx} />)
            : recommendedPlans.map((plan) => (
                <RecommendedPlanCard
                  key={plan.id}
                  plan={plan}
                  onViewDetails={handleViewPlanDetails}
                />
              ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-brand-slate">My Active Plans</h2>

        {mergedActivePlans.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-10 text-center text-sm text-brand-slate/50 shadow-[0_4px_20px_-4px_#9567B920]">
            Follow a recommended plan or create a custom draft to see it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mergedActivePlans.map((entry, idx) => (
              <ActivePlanCardLocal
                key={entry.plan.id}
                entry={entry}
                index={idx}
                onViewDetails={handleViewPlanDetails}
              />
            ))}
          </div>
        )}
      </section>

      <CustomPlanBuilder
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        onCreateDraft={handleCreateDraft}
      />

      <PlanDetailsModal
        isOpen={isDetailsOpen}
        loading={loadingDetails}
        selectedPlan={selectedPlan}
        isSubscribed={selectedPlan ? subscribedIds.has(selectedPlan.id) : false}
        onFollowPlan={async (plan) => {
          if (subscribedIds.has(plan.id)) {
            await unsubscribePlan(plan);
          } else {
            await subscribePlan(plan);
          }
          setIsDetailsOpen(false);
        }}
        details={selectedPlanDetails}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedPlan(null);
        }}
      />
    </div>
  );
}
