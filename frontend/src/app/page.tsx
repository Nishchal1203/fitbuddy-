"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bootstrapAuthSession } from "@/Utils/api";

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveDestination = async () => {
      setIsMounted(true);
      const token = await bootstrapAuthSession();
      if (cancelled) {
        return;
      }

      router.replace(token ? "/dashboard" : "/login");
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
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
