"use client";

import React, { useRef } from "react";
import { ImagePlus, Mic, Send, X } from "lucide-react";
import { QUICK_TOPICS } from "./emptystate";

type Props = {
  input: string;
  imagePreview: string | null;
  isTyping: boolean;
  showQuickPills: boolean; // show when chat is empty
  onChange: (val: string) => void;
  onSend: () => void;
  onImageChange: (file: File) => void;
  onImageRemove: () => void;
  onTopicClick: (prompt: string) => void;
};

export default function ChatInput({
  input,
  imagePreview,
  isTyping,
  showQuickPills,
  onChange,
  onSend,
  onImageChange,
  onImageRemove,
  onTopicClick,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (input.trim().length > 0 || !!imagePreview) && !isTyping;

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    onImageChange(file);
  }

  return (
    <div className="border-t border-brand-pale bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl space-y-2.5">
        {/* image preview strip */}
        {imagePreview && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-pale bg-brand-bg px-3 py-2">
            <img
              src={imagePreview}
              alt="Attached"
              className="h-12 w-12 rounded-lg border border-brand-pale object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-slate">
                Image attached
              </p>
              <p className="text-[10px] text-brand-slate/45">
                AI will analyse this photo
              </p>
            </div>
            <button
              onClick={() => {
                onImageRemove();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded-lg p-1 text-brand-slate/40 transition-colors hover:bg-brand-pale hover:text-brand-slate"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* quick topic pills — only when chat is empty 
        {showQuickPills && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {QUICK_TOPICS.map((t) => (
              <button
                key={t.label}
                onClick={() => onTopicClick(t.prompt)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-brand-pale bg-brand-bg px-3 py-1.5 text-xs font-semibold text-brand-slate/70 transition hover:border-brand-purple hover:text-brand-purple"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white`}>
                  {React.cloneElement(t.icon as React.ReactElement, { size: 9 })}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        )}
*/}
        {/* main input row */}
        <div className="flex items-end gap-2">
          {/* image upload btn */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-pale bg-brand-bg text-brand-slate/50 transition hover:border-brand-mauve hover:text-brand-purple"
            title="Attach photo"
          >
            <ImagePlus size={17} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* textarea */}
          <div className="relative flex-1 rounded-2xl border border-brand-pale bg-brand-bg transition-all focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-brand-purple/15">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your trainer anything — form, diet, reps, recovery…"
              rows={1}
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 text-sm text-brand-slate outline-none placeholder:text-brand-slate/35"
              style={{ minHeight: "42px", maxHeight: "140px" }}
            />
            {input.length > 0 && (
              <span className="absolute bottom-2 right-3 text-[9px] text-brand-slate/25">
                Shift+Enter for new line
              </span>
            )}
          </div>

          {/* mic */}
          <button
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-pale bg-brand-bg text-brand-slate/50 transition hover:border-brand-mauve hover:text-brand-purple"
            title="Voice input (coming soon)"
          >
            <Mic size={17} />
          </button>

          {/* send */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-deep text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>

        {/* footer note */}
        <p className="text-center text-[10px] text-brand-slate/30">
          AI Trainer · Powered by FitBuddy AI · Not a substitute for
          professional medical advice
        </p>
      </div>
    </div>
  );
}
