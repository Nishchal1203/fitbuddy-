import type { Metadata } from "next";
import type { Viewport } from "next";
import "../index.css";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "Fitbuddy",
  description: "Your personal fitness tracking companion",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fitbuddy",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#BE70E7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
