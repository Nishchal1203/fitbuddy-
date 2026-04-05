"use client";

import Image from "next/image";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import AiIcon from "@/assets/AI_icon.svg";
import UserIcon from "@/assets/user.svg";
import type { Message } from "./types";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Minimal markdown renderer — bold + bullets + numbered + blank lines */
function renderMarkdown(text: string) {
  const renderInline = (value: string, keyPrefix: string) =>
    value.split(/(\*\*[^*]+\*\*)/).map((part, idx) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong
          key={`${keyPrefix}-${idx}`}
          className="font-bold text-brand-slate"
        >
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={`${keyPrefix}-${idx}`}>{part}</span>
      ),
    );

  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();

    if (trimmed === "") return <div key={i} className="h-1.5" />;

    if (/^\*\*[^*]+:\*\*$/.test(trimmed)) {
      return (
        <p
          key={i}
          className="text-sm font-semibold leading-relaxed text-brand-slate"
        >
          {trimmed.slice(2, -2)}
        </p>
      );
    }

    if (
      trimmed.startsWith("• ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("- ")
    )
      return (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-purple" />
          <span>
            {renderInline(trimmed.replace(/^[•*-]\s+/, ""), `bullet-${i}`)}
          </span>
        </div>
      );

    if (/^\d+\.\s+/.test(trimmed)) {
      const marker = trimmed.match(/^\d+\./)?.[0] ?? "1.";
      const content = trimmed.replace(/^\d+\.\s+/, "");
      return (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="font-semibold text-brand-purple">{marker}</span>
          <span>{renderInline(content, `num-${i}`)}</span>
        </div>
      );
    }

    return (
      <p key={i} className="text-sm leading-relaxed">
        {renderInline(trimmed, `line-${i}`)}
      </p>
    );
  });
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
type Props = {
  message: Message;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
};

export default function MessageBubble({ message, onLike, onDislike }: Props) {
  const isUser = message.role === "user";

  /* ── User bubble ── */
  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5 px-4">
        <div className="max-w-[82%] space-y-1 md:max-w-[84%]">
          {message.image && (
            <div className="overflow-hidden rounded-2xl rounded-br-sm border border-brand-pale">
              <img
                src={message.image}
                alt="Uploaded"
                className="max-h-48 w-full object-cover"
              />
            </div>
          )}
          {message.text && (
            <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-brand-soft to-brand-deep px-4 py-3.5 text-white shadow-md">
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          )}
          <p className="text-right text-[10px] text-brand-slate/40">
            {formatTime(message.timestamp)}
          </p>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-bg shadow-sm">
          <Image src={UserIcon} alt="User" width={20} height={20} />
        </div>
      </div>
    );
  }

  /* ── Assistant bubble ── */
  return (
    <div className="flex items-end gap-2.5 px-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-bg shadow-sm">
        <Image src={AiIcon} alt="AI Trainer" width={20} height={20} />
      </div>

      <div className="max-w-[84%] space-y-1 md:max-w-[86%]">
        <div className="rounded-2xl rounded-bl-sm border border-brand-pale bg-white px-4 py-4 shadow-sm">
          <div className="space-y-1 text-brand-slate">
            {renderMarkdown(message.text)}
          </div>
        </div>

        {/* timestamp + feedback */}
        <div className="flex items-center gap-3 pl-1">
          <p className="text-[10px] text-brand-slate/40">
            {formatTime(message.timestamp)}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onLike(message.id)}
              className={`rounded-lg p-1 transition-colors ${
                message.liked === true
                  ? "bg-green-50 text-green-500"
                  : "text-brand-slate/30 hover:bg-green-50 hover:text-green-500"
              }`}
            >
              <ThumbsUp size={11} />
            </button>
            <button
              onClick={() => onDislike(message.id)}
              className={`rounded-lg p-1 transition-colors ${
                message.liked === false
                  ? "bg-red-50 text-red-400"
                  : "text-brand-slate/30 hover:bg-red-50 hover:text-red-400"
              }`}
            >
              <ThumbsDown size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
