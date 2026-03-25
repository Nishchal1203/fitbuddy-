"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("access_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!isMounted) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-brand-bg px-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep" />
      </div>
    );
  }

  return null;
}
