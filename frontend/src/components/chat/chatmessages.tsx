"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import MessageBubble from "./messagebubble";
import TypingIndicator from "./typingindicator";
import EmptyState from "./emptystate";
import type { Message } from "./types";

type Props = {
  messages: Message[];
  isTyping: boolean;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onTopicClick: (prompt: string) => void;
};

export default function ChatMessages({
  messages,
  isTyping,
  onLike,
  onDislike,
  onTopicClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBtn, setShowBtn] = useState(false);

  /* auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }

  const isEmpty = messages.length === 0 && !isTyping;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-brand-bg"
    >
      {isEmpty ? (
        <EmptyState onTopicClick={onTopicClick} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-5 py-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onLike={onLike}
              onDislike={onDislike}
            />
          ))}
          {isTyping && (
            <div className="px-4">
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* scroll-to-bottom pill */}
      {showBtn && (
        <button
          onClick={() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-brand-pale bg-white px-4 py-2 text-xs font-semibold text-brand-slate shadow-lg transition hover:border-brand-purple hover:text-brand-purple"
        >
          <ChevronDown size={13} />
          Scroll to latest
        </button>
      )}
    </div>
  );
}
