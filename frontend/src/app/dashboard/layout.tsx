"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui";
import EnterpriseTopNav from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/login");
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
        <EnterpriseTopNav />
        <div
          className={`grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ${
            isCollapsed ? "grid-cols-[5.25rem_1fr]" : "grid-cols-[16rem_1fr]"
          }`}
        >
          <Sidebar
            activePath={pathname}
            onLogout={handleLogout}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
          <main className="min-h-0 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
