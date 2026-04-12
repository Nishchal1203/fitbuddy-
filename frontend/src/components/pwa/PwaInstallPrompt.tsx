"use client";

import { useEffect, useMemo, useState } from "react";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "fitbuddy_pwa_prompt_dismissed_at";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone;
}

export default function PwaInstallPrompt() {
  const [canShow, setCanShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);

  const iosMode = useMemo(() => isIos(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch {
          // Ignore registration failures; app still works as a website.
        }
      }
    };

    void registerServiceWorker();

    const mq = window.matchMedia("(max-width: 900px)");
    const updateMobile = () => setIsMobile(mq.matches);
    updateMobile();

    const dismissedAtRaw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = dismissedAtRaw ? Number(dismissedAtRaw) : 0;
    const dismissActive = Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;

    if (!dismissActive && !isStandalone()) {
      setCanShow(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };

    const handleInstalled = () => {
      setCanShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mq.addEventListener("change", updateMobile);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mq.removeEventListener("change", updateMobile);
    };
  }, []);

  if (!canShow || !isMobile || isStandalone()) {
    return null;
  }

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCanShow(false);
  };

  const onInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome !== "accepted") {
      onDismiss();
      return;
    }

    setCanShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] rounded-2xl border border-brand-pale bg-white/95 p-3 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:w-[360px]">
      <p className="text-sm font-semibold text-brand-slate">Install Fitbuddy App</p>
      <p className="mt-1 text-xs text-brand-slate/70">
        Add Fitbuddy to your home screen for faster access and an app-like experience.
      </p>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-slate/70 hover:bg-brand-bg"
        >
          Not now
        </button>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={onInstall}
            className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
          >
            Install
          </button>
        ) : iosMode ? (
          <p className="text-[11px] font-semibold text-brand-slate/80">
            Safari: Share - Add to Home Screen
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-brand-slate/80">Install option appears when ready</p>
        )}
      </div>
    </div>
  );
}
