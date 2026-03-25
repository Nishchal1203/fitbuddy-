"use client";

import Image from "next/image";
import AiIcon from "@/assets/AI_icon.svg";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 px-4 py-1">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep shadow-sm">
        <Image src={AiIcon} alt="AI" width={18} height={18} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-brand-pale bg-white px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-brand-purple/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
