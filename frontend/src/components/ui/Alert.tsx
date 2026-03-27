import React from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "./utils";

type AlertVariant = "success" | "error" | "warning" | "info";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
};

const variantClasses: Record<AlertVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-brand-pale bg-brand-bg text-brand-deep",
};

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = iconMap[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Icon size={16} className="mt-0.5" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
