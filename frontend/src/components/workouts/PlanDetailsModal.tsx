import React from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { getLevelVariant } from "./helpers";
import { PlanExercise, PlanExercisePayload, WorkoutPlan } from "./types";

type PlanDetailsModalProps = {
  isOpen: boolean;
  loading: boolean;
  details: PlanExercisePayload | null;
  selectedPlan: WorkoutPlan | null;
  isSubscribed: boolean;
  onFollowPlan: (plan: WorkoutPlan) => void;
  onClose: () => void;
};

function getTimeLabel(exercise: PlanExercise): string {
  if (exercise.time !== undefined && exercise.time !== null)
    return String(exercise.time);
  if (exercise.duration !== undefined && exercise.duration !== null)
    return String(exercise.duration);
  if (
    exercise.duration_minutes !== undefined &&
    exercise.duration_minutes !== null
  )
    return `${exercise.duration_minutes} min`;
  return "-";
}

export default function PlanDetailsModal({
  isOpen,
  loading,
  details,
  selectedPlan,
  isSubscribed,
  onFollowPlan,
  onClose,
}: PlanDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={details?.plan_title || "Plan Exercises"}
      onClose={onClose}
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Loading plan details...
        </div>
      ) : !details ? (
        <div className="py-10 text-center text-sm text-gray-500">
          No plan details available right now.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={getLevelVariant(details.plan_level) as any}>
              {details.plan_level || "General"}
            </Badge>
            <Badge variant="upcoming">{details.plan_duration || 30} Days</Badge>
          </div>

          <div className="space-y-3">
            {details.exercises.map((exercise, index) => (
              <div
                key={`${exercise.name}-${index}`}
                className="rounded-lg border border-brand-pale p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900">
                    {exercise.name}
                  </h4>
                  <Badge variant="muted">{exercise.category}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-4">
                  <span>Sets: {exercise.sets || "-"}</span>
                  <span>Reps: {exercise.reps || "-"}</span>
                  <span>Time: {getTimeLabel(exercise)}</span>
                  <span>Rest: {exercise.rest || "-"}</span>
                </div>
                {exercise.notes || exercise.instructions ? (
                  <p className="mt-2 text-xs text-gray-500">
                    {exercise.notes || exercise.instructions}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              variant={isSubscribed ? "secondary" : "primary"}
              disabled={!selectedPlan || isSubscribed}
              onClick={() => {
                if (selectedPlan && !isSubscribed) {
                  onFollowPlan(selectedPlan);
                }
              }}
            >
              {isSubscribed ? "Already in My Active Plans" : "Follow This Plan"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
