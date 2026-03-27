import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Trainer · FitBuddy",
  description: "Chat with your AI Fitness Trainer",
};

/*
 * This layout intentionally does NOT include the dashboard sidebar/navbar.
 * It gives the chat page 100% of the viewport — exactly like ChatGPT.
 * The root layout.tsx still applies (fonts, globals, providers).
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-brand-bg">{children}</div>
  );
}
