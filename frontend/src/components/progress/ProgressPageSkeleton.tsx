"use client";

/* ─────────────────────────────────────────────
   REUSABLE PULSE PRIMITIVES
───────────────────────────────────────────── */
function Pulse({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-brand-pale ${className}`}
      style={style}
    />
  );
}

function PulseCircle({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-full bg-brand-pale ${className}`}
      style={style}
    />
  );
}

/* ─────────────────────────────────────────────
   WEIGHT TREND SKELETON
───────────────────────────────────────────── */
function WeightTrendSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-48" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-12 w-20 rounded-xl" />
          <Pulse className="h-12 w-28 rounded-xl" />
        </div>
      </div>
      {/* chart bars simulation */}
      <div className="flex h-[220px] items-end gap-2 px-2">
        {[65, 85, 70, 90, 60, 80, 75, 88, 72, 68, 78, 63].map((h, i) => (
          <div
            key={i}
            className="animate-pulse flex-1 rounded-t-lg bg-brand-pale"
            style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      {/* x-axis labels */}
      <div className="mt-2 flex justify-between px-2">
        {[
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ].map((m) => (
          <Pulse key={m} className="h-2.5 w-5" />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BODY MEASUREMENTS SKELETON
───────────────────────────────────────────── */
function BodyMeasurementsSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-4 flex items-center gap-3">
        <PulseCircle className="h-8 w-8 rounded-xl" />
        <div className="space-y-1.5">
          <Pulse className="h-4 w-40" />
          <Pulse className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse space-y-3 rounded-2xl border border-brand-pale bg-white p-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <Pulse className="h-2.5 w-12" />
              <Pulse className="h-5 w-5 rounded" />
            </div>
            <Pulse className="h-7 w-16" />
            <Pulse className="h-5 w-14 rounded-lg" />
            <Pulse className="h-2.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MONTHLY SUMMARY SKELETON
───────────────────────────────────────────── */
function MonthlySummarySkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <Pulse className="h-4 w-36" />
          <Pulse className="h-3 w-52" />
        </div>
        {/* month nav */}
        <div className="flex items-center gap-2">
          <Pulse className="h-7 w-7 rounded-lg" />
          <Pulse className="h-4 w-28 rounded-lg" />
          <Pulse className="h-7 w-7 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse relative overflow-hidden rounded-2xl bg-brand-pale p-5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* decorative circles */}
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-mauve/20" />
            <div className="mb-4 flex items-center gap-2">
              <Pulse className="h-8 w-8 rounded-xl bg-brand-mauve/30" />
              <Pulse className="h-3 w-24 bg-brand-mauve/20" />
            </div>
            <Pulse className="mb-2 h-9 w-28 bg-brand-mauve/30" />
            <Pulse className="h-5 w-32 rounded-full bg-brand-mauve/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STREAK COUNTER SKELETON
───────────────────────────────────────────── */
function StreakCounterSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-48" />
        </div>
        <Pulse className="h-6 w-24 rounded-full" />
      </div>

      {/* flame ring + text */}
      <div className="mb-5 flex items-center gap-6">
        <PulseCircle className="h-20 w-20 flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Pulse className="h-5 w-40" />
          <Pulse className="h-3.5 w-56" />
          <Pulse className="mt-1 h-2 w-full rounded-full" />
        </div>
      </div>

      {/* weekly bars */}
      <div className="mb-5 space-y-2">
        <Pulse className="h-3 w-20" />
        <div className="flex items-end gap-1.5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="animate-pulse w-6 rounded-lg bg-brand-pale"
                style={{
                  height: `${32 + (i % 3) * 8}px`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
              <Pulse className="h-2 w-5" />
            </div>
          ))}
        </div>
      </div>

      {/* stat pills */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse space-y-2 rounded-2xl border border-brand-pale bg-brand-bg p-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <PulseCircle className="mx-auto h-8 w-8 rounded-xl" />
            <Pulse className="mx-auto h-5 w-10" />
            <Pulse className="mx-auto h-2.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACHIEVEMENT BADGES SKELETON
───────────────────────────────────────────── */
function AchievementBadgesSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      {/* header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="space-y-1.5">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-56" />
        </div>
        <Pulse className="h-8 w-28 rounded-xl" />
      </div>

      {/* overall progress bar */}
      <div className="mb-4 space-y-1.5">
        <Pulse className="h-2 w-full rounded-full" />
        <Pulse className="ml-auto h-2.5 w-16" />
      </div>

      {/* category pills */}
      <div className="mb-4 flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Pulse
            key={i}
            className="h-7 w-16 rounded-full"
            style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
          />
        ))}
      </div>

      {/* badge cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse space-y-3 rounded-2xl p-4 ring-2 ring-brand-pale"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <Pulse className="h-2.5 w-14" />
              <Pulse className="h-2.5 w-16" />
            </div>
            <div className="flex items-center gap-3">
              <Pulse className="h-12 w-12 flex-shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-1.5">
                <Pulse className="h-3.5 w-3/4" />
                <Pulse className="h-2.5 w-full" />
                <Pulse className="h-2.5 w-2/3" />
              </div>
            </div>
            <Pulse className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FULL PAGE SKELETON  (exported)
───────────────────────────────────────────── */
export default function ProgressPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* page header */}
      <div className="space-y-2">
        <Pulse className="h-7 w-64" />
        <Pulse className="h-4 w-80" />
      </div>

      <WeightTrendSkeleton />
      <BodyMeasurementsSkeleton />
      <MonthlySummarySkeleton />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StreakCounterSkeleton />
        {/* achievement badges takes 2 cols on large screens */}
        <div className="lg:col-span-1">
          <AchievementBadgesSkeleton />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAMED EXPORTS  (for partial use)
───────────────────────────────────────────── */
export {
  WeightTrendSkeleton,
  BodyMeasurementsSkeleton,
  MonthlySummarySkeleton,
  StreakCounterSkeleton,
  AchievementBadgesSkeleton,
};
