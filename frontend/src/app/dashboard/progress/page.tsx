"use client";

import React, { Suspense } from "react";
import {
  WeightTrendChart,
  BodyMeasurementsCard,
  MonthlySummaryCard,
  StreakCounter,
  AchievementBadges,
  WeightTrendSkeleton,
  BodyMeasurementsSkeleton,
  MonthlySummarySkeleton,
  StreakCounterSkeleton,
  AchievementBadgesSkeleton,
} from "@/components/progress";

export default function ProgressPage() {
  return (
    <div className="space-y-6 p-6">
      {/* ── Page heading ── */}
      <div>
        <h1 className="text-2xl font-bold text-brand-slate">
          Fitness Progress &amp; Achievements
        </h1>
        <p className="mt-1 text-sm text-brand-slate/55">
          Workouts and monthly stats come from your sessions. Weight and
          measurements use your logged body data. Achievements appear when
          your account unlocks them.
        </p>
      </div>

      {/* ── Weight Trend ── */}
      <Suspense fallback={<WeightTrendSkeleton />}>
        <WeightTrendChart />
      </Suspense>

      {/* ── Body Measurements ── */}
      <Suspense fallback={<BodyMeasurementsSkeleton />}>
        <BodyMeasurementsCard />
      </Suspense>

      {/* ── Monthly Summary ── */}
      <Suspense fallback={<MonthlySummarySkeleton />}>
        <MonthlySummaryCard />
      </Suspense>

      {/* ── Streak + Achievements side by side on large screens ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <Suspense fallback={<StreakCounterSkeleton />}>
          <StreakCounter />
        </Suspense>

        <Suspense fallback={<AchievementBadgesSkeleton />}>
          <AchievementBadges />
        </Suspense>
      </div>
    </div>
  );
}
