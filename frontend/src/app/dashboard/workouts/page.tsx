"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui";
import {
  API_BASE_URL,
  buildAuthHeaders,
  getAuthToken,
  readErrorMessage,
} from "@/lib/api";
import {
  CustomPlanBuilder,
  MyPlanRecord,
  PlanDetailsModal,
  PlanExercisePayload,
  WorkoutPlan,
} from "@/components/workouts";
import { getProgressPercent } from "@/components/workouts/helpers";

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
   PLAN CARD  (recommended grid)
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
      {/* image placeholder area */}
      <div className="flex h-44 items-center justify-center bg-brand-bg">
        {/* icon slot – user manages their own icons */}
        <span className="text-4xl text-brand-mauve ">🏋️</span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* title + badge row */}
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

  // compute "Day X of Y" label
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
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-brand-slate">{plan.title}</p>
          <p className="mt-0.5 text-xs text-brand-slate/50">{dayLabel}</p>
        </div>
        <span className="text-sm font-bold text-brand-purple">{progress}%</span>
      </div>

      {/* progress bar */}
      <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-brand-pale">
        <div
          className="h-full rounded-full bg-brand-purple transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* bottom row */}
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
  const [remoteActivePlans, setRemoteActivePlans] = useState<ActivePlanEntry[]>(
    [],
  );
  const [localSubscribedPlanIds, setLocalSubscribedPlanIds] = useState<
    number[]
  >([]);
  const [draftPlans, setDraftPlans] = useState<WorkoutPlan[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedPlanDetails, setSelectedPlanDetails] =
    useState<PlanExercisePayload | null>(null);

  /* ── load ── */
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedRecommended: WorkoutPlan[] = FALLBACK_RECOMMENDED;

      const recommendedResponse = await fetch(`${API_BASE_URL}/api/plans/`, {
        headers: buildAuthHeaders(),
      });
      if (recommendedResponse.ok) {
        const data = await recommendedResponse.json();
        if (Array.isArray(data) && data.length > 0) resolvedRecommended = data;
      }

      setRecommendedPlans(resolvedRecommended);

      const token = getAuthToken();
      if (!token) {
        setRemoteActivePlans([]);
        return;
      }

      const myPlansResponse = await fetch(
        `${API_BASE_URL}/api/plans/my-plans`,
        {
          headers: buildAuthHeaders(),
        },
      );
      if (!myPlansResponse.ok) {
        setRemoteActivePlans([]);
        return;
      }

      const myPlansData: MyPlanRecord[] = await myPlansResponse.json();

      const detailsEntries = await Promise.all(
        myPlansData.map(async (myPlan) => {
          try {
            const detailsResponse = await fetch(
              `${API_BASE_URL}/api/plans/plan/${myPlan.workout_id}`,
              {
                headers: buildAuthHeaders(),
              },
            );
            if (!detailsResponse.ok) return null;
            const plan = (await detailsResponse.json()) as WorkoutPlan;
            return { plan, start_date: myPlan.start_date };
          } catch {
            return null;
          }
        }),
      );

      setRemoteActivePlans(
        detailsEntries.filter((item): item is ActivePlanEntry => Boolean(item)),
      );
    } catch {
      setRecommendedPlans(FALLBACK_RECOMMENDED);
      setRemoteActivePlans([]);
      showToast({
        title: "Using fallback plans",
        description: "Backend plans are currently unavailable.",
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  /* ── derived ── */
  const subscribedIds = useMemo(() => {
    const remoteIds = remoteActivePlans.map((e) => e.plan.id);
    return new Set([...remoteIds, ...localSubscribedPlanIds]);
  }, [remoteActivePlans, localSubscribedPlanIds]);

  const mergedActivePlans = useMemo<ActivePlanEntry[]>(() => {
    const combined: ActivePlanEntry[] = [...remoteActivePlans];
    const existingIds = new Set(remoteActivePlans.map((e) => e.plan.id));

    recommendedPlans.forEach((plan) => {
      if (localSubscribedPlanIds.includes(plan.id) && !existingIds.has(plan.id))
        combined.push({ plan, start_date: null });
    });
    draftPlans.forEach((draft) => {
      if (!existingIds.has(draft.id))
        combined.push({ plan: draft, start_date: null });
    });
    return combined;
  }, [draftPlans, localSubscribedPlanIds, recommendedPlans, remoteActivePlans]);

  /* ── handlers ── */
  const handleViewPlanDetails = async (planId: number) => {
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    setSelectedPlanDetails(null);
    const selectedPlan = [...recommendedPlans, ...draftPlans].find(
      (p) => p.id === planId,
    );
    setSelectedPlan(selectedPlan || null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/plan/${planId}/exercises`,
        {
          headers: buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        setSelectedPlanDetails(
          selectedPlan ? buildFallbackPlanDetails(selectedPlan) : null,
        );
        return;
      }
      setSelectedPlanDetails(await response.json());
    } catch {
      setSelectedPlanDetails(
        selectedPlan ? buildFallbackPlanDetails(selectedPlan) : null,
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const subscribePlan = async (plan: WorkoutPlan) => {
    const token = getAuthToken();
    if (!token) {
      setLocalSubscribedPlanIds((prev) =>
        prev.includes(plan.id) ? prev : [...prev, plan.id],
      );
      showToast({
        title: "Saved locally",
        description: "Sign in to sync.",
        variant: "info",
      });
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/subscribe/${plan.id}`,
        {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        },
      );
      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Saved locally as preview.",
        );
        setLocalSubscribedPlanIds((prev) =>
          prev.includes(plan.id) ? prev : [...prev, plan.id],
        );
        showToast({
          title: "Preview follow applied",
          description: message,
          variant: "warning",
        });
        return;
      }
      showToast({
        title: "Plan followed",
        description: `${plan.title} added to active plans.`,
        variant: "success",
      });
      await loadPlans();
    } catch {
      setLocalSubscribedPlanIds((prev) =>
        prev.includes(plan.id) ? prev : [...prev, plan.id],
      );
      showToast({
        title: "Saved locally",
        description: "Backend sync pending.",
        variant: "warning",
      });
    }
  };

  const unsubscribePlan = async (plan: WorkoutPlan) => {
    setLocalSubscribedPlanIds((prev) => prev.filter((id) => id !== plan.id));
    if (plan.isDraft) {
      setDraftPlans((prev) => prev.filter((item) => item.id !== plan.id));
      showToast({
        title: "Draft removed",
        description: "Custom draft deleted.",
        variant: "info",
      });
      return;
    }
    const token = getAuthToken();
    if (!token) {
      showToast({
        title: "Removed",
        description: `${plan.title} removed locally.`,
        variant: "info",
      });
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/unsubscribe/${plan.id}`,
        {
          method: "DELETE",
          headers: buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Removed from frontend only.",
        );
        showToast({
          title: "Removed locally",
          description: message,
          variant: "warning",
        });
        return;
      }
      showToast({
        title: "Plan removed",
        description: `${plan.title} removed.`,
        variant: "success",
      });
      await loadPlans();
    } catch {
      showToast({
        title: "Removed locally",
        description: "Backend sync failed.",
        variant: "warning",
      });
    }
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
    if (input.generation_mode === "ai") {
      const aiDraft: WorkoutPlan = {
        id: Date.now(),
        title: input.title || "AI Workout Plan (Pending)",
        description: `${input.description} AI Prompt: ${input.ai_prompt || "No prompt provided yet."}`,
        level: input.level,
        duration_days: input.duration_days,
        isDraft: true,
      };
      setDraftPlans((prev) => [aiDraft, ...prev]);
      showToast({
        title: "AI draft created",
        description:
          "Your goal prompt is saved. Backend AI generation will be connected next.",
        variant: "achievement",
      });
      return;
    }

    const token = getAuthToken();
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans/custom`, {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: input.title,
            description: `${input.description} Focus: ${input.focus || "general conditioning"}`,
            level: input.level,
            duration_days: input.duration_days,
            exercises: input.exercises,
          }),
        });

        if (!response.ok) {
          const message = await readErrorMessage(
            response,
            "Plan saved locally as draft.",
          );
          showToast({
            title: "Backend save failed",
            description: message,
            variant: "warning",
          });
        } else {
          showToast({
            title: "Plan created",
            description: "Custom plan added to active plans.",
            variant: "success",
          });
          await loadPlans();
          return;
        }
      } catch {
        showToast({
          title: "Backend save failed",
          description: "Saved locally as draft instead.",
          variant: "warning",
        });
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
    setDraftPlans((prev) => [draft, ...prev]);
    showToast({
      title: "Draft created",
      description: "Custom plan saved as pending sync.",
      variant: "achievement",
    });
  };

  /* ── render ── */
  return (
    <div className="space-y-8 p-6">
      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold text-brand-slate">Workout Plans</h1>
        <p className="mt-1 text-sm text-brand-slate/55">
          Browse AI recommended plans, build your own, and manage active
          routines.
        </p>
      </div>

      {/* ── Create your own — dashed banner ── */}
      <button
        type="button"
        onClick={() => setShowBuilder(true)}
        className="w-full rounded-2xl border-2 border-dashed border-brand-mauve bg-brand-bg py-8 text-center transition hover:bg-brand-pale/40"
      >
        {/* circle + icon */}
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

      {/* ── AI Recommended Plans ── */}
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

      {/* ── My Active Plans ── */}
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

      {/* ── Modals ── */}
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
          await subscribePlan(plan);
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
