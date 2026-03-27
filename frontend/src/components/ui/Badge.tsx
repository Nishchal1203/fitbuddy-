import React from "react";
import { cn } from "./utils";

type BadgeVariant =
  | "active"
  | "completed"
  | "upcoming"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "custom"
  | "muted";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  active: "bg-brand-soft/25 text-brand-deep",
  completed: "bg-green-100 text-green-700",
  upcoming: "bg-brand-gold/25 text-yellow-700",
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-brand-pale text-brand-deep",
  advanced: "bg-red-100 text-red-700",
  custom: "bg-blue-100 text-blue-700",
  muted: "bg-gray-100 text-gray-600",
};

export function Badge({ className, variant = "muted", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
