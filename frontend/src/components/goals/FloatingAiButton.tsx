"use client";

import React from "react";
import Image from "next/image";
import AiIcon from "@/assets/AI_icon.svg";
import { Button } from "@/components/ui";

type FloatingAiButtonProps = {
  onClick?: () => void;
};

export default function FloatingAiButton({ onClick }: FloatingAiButtonProps) {
  return (
    <Button
      type="button"
      aria-label="Open AI assistant"
      size="icon"
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-40 !h-14 !w-14 rounded-full bg-white p-0 shadow-[0_8px_24px_-8px_rgba(149,103,185,0.65)] transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:rotate-3"
    >
      <span className="absolute inset-0 animate-pulse rounded-full bg-primary-300/40 blur-sm" />
      <Image
        src={AiIcon}
        alt="AI"
        width={30}
        height={30}
        className="relative z-10 transition-transform duration-300 group-hover:scale-105"
      />
    </Button>
  );
}
