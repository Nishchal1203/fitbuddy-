"use client";

import React from "react";

type ProgressRingProps = {
  percent: number;
  color?: string;
};

export default function ProgressRing({
  percent,
  color = "#BE70E7",
}: ProgressRingProps) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative h-20 w-20">
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-transparent stroke-brand-pale"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-lg font-bold text-brand-slate">{percent}%</span>
      </div>
    </div>
  );
}
