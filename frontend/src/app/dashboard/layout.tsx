"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui";
import EnterpriseTopNav from "@/components/Navbar";
import {
  bootstrapAuthSession,
  clearAuthToken,
  getAuthToken,
  isTokenExpired,
  logoutUser,
  refreshAccessToken,
  setAuthToken,
} from "@/Utils/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const fragment =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.hash.slice(1))
          : null;
      const redirectedAccessToken = fragment?.get("access_token");
      if (redirectedAccessToken) {
        setAuthToken(redirectedAccessToken);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }

      const token = getAuthToken();

      if (token && !isTokenExpired(token)) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      const refreshedToken = await bootstrapAuthSession();
      if (cancelled) {
        return;
      }

      if (!refreshedToken) {
        clearAuthToken();
        router.replace("/login");
        return;
      }

      setAuthReady(true);
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;
    const refreshInterval = window.setInterval(
      () => {
        void (async () => {
          const refreshedToken = await refreshAccessToken();
          if (cancelled) {
            return;
          }

          if (!refreshedToken) {
            await logoutUser();
            router.replace("/login");
          }
        })();
      },
      45 * 60 * 1000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, [authReady, router]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  if (!authReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 text-gray-500">
        Restoring session...
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
        <EnterpriseTopNav />
        <div
          className={`grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ${
            isCollapsed ? "grid-cols-[5.25rem_1fr]" : "grid-cols-[16rem_1fr]"
          }`}
        >
          <Sidebar
            activePath={pathname}
            onLogout={handleLogout}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
          <main className="min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
