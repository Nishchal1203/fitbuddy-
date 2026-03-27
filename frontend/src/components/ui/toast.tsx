"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";
import { cn } from "./utils";

type ToastVariant = "success" | "error" | "warning" | "achievement" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<ToastItem, "id">;

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: "border-brand-soft/50 bg-brand-soft/15 text-brand-deep",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-brand-gold/50 bg-brand-gold/20 text-yellow-800",
  achievement:
    "border-brand-gold/50 bg-gradient-to-r from-brand-gold/35 to-brand-goldLight/20 text-yellow-900",
  info: "border-brand-pale bg-brand-bg text-brand-deep",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,360px)] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-lg border px-3 py-2 shadow-md backdrop-blur-sm",
              variantClasses[toast.variant],
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs opacity-90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded p-1 opacity-70 transition hover:opacity-100"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
