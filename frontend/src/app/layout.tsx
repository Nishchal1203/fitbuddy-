import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "Fitbuddy",
  description: "Your personal fitness tracking companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
