"use client";

import { ToastProvider } from "@/components/ui";

export default function ChatProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
