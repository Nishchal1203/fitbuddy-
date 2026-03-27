import React from "react";
import { Calendar, ChevronRight } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { getLevelVariant, getNextSessionText } from "./helpers";
import { WorkoutPlan } from "./types";

type ActivePlanCardProps = {
  plan: WorkoutPlan;
  progress: number;
  startDate?: string | null;
  onViewDetails: (planId: number) => void;
  onUnsubscribe?: (plan: WorkoutPlan) => void;
};

export default function ActivePlanCard({
  plan,
  progress,
  startDate,
  onViewDetails,
  onUnsubscribe,
}: ActivePlanCardProps) {
  const progressLabel = plan.isDraft ? "Pending sync" : `${progress}%`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getLevelVariant(plan.level) as any}>
              {plan.level || "General"}
            </Badge>
            {plan.isDraft ? <Badge variant="custom">Pending Sync</Badge> : null}
          </div>
        </div>
        <p className="text-sm font-semibold text-primary-700">
          {progressLabel}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-brand-pale">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>{getNextSessionText(plan, progress)}</p>
          {startDate ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={12} />
              {new Date(startDate).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails(plan.id)}
          >
            Open <ChevronRight size={14} />
          </Button>
          {onUnsubscribe ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onUnsubscribe(plan)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
