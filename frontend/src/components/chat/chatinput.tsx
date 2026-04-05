"use client";

import React, { useRef } from "react";
import { ImagePlus, Send, X, Paperclip } from "lucide-react";

type Props = {
  input: string;
  imagePreview: string | null;
  isTyping: boolean;
  showQuickPills: boolean;
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
  onChange,
  onSend,
  onImageChange,
  onImageRemove,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (input.trim().length > 0 || !!imagePreview) && !isTyping;

  /* ── auto-grow textarea ── */
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }

  /* ── send on Enter, newline on Shift+Enter ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    onImageChange(file);
    // reset so same file can be re-attached
    e.target.value = "";
  }

  function handleRemoveImage() {
    onImageRemove();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex-shrink-0 border-t border-brand-pale bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {/* ── outer container — single rounded card ── */}
        <div
          className={`flex flex-col rounded-2xl border bg-brand-bg transition-all ${
            input.length > 0 || imagePreview
              ? "border-brand-purple ring-2 ring-brand-purple/10"
              : "border-brand-pale"
          }`}
        >
          {/* ── image preview strip (inside the card) ── */}
          {imagePreview && (
            <div className="flex items-center gap-3 border-b border-brand-pale px-4 py-2.5">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Attached"
                  className="h-10 w-10 rounded-lg border border-brand-pale object-cover"
                />
                {/* remove image */}
                <button
                  onClick={handleRemoveImage}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-slate text-white transition hover:bg-red-400"
                >
                  <X size={9} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-brand-slate">
                  Image attached
                </p>
                <p className="text-[10px] text-brand-slate/45">
                  AI will analyse this photo
                </p>
              </div>
            </div>
          )}

          {/* ── textarea row ── */}
          <div className="flex items-end gap-2 px-3 py-2">
            {/* attach button — left of textarea */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo"
              className={`mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                imagePreview
                  ? "bg-brand-purple/10 text-brand-purple"
                  : "text-brand-slate/40 hover:bg-brand-pale hover:text-brand-purple"
              }`}
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* dynamic textarea — grows up to 160px then scrolls */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your trainer anything — form, diet, reps, recovery…"
              rows={1}
              className="flex-1 resize-none bg-transparent py-1.5 text-sm text-brand-slate outline-none placeholder:text-brand-slate/35"
              style={{ minHeight: "32px", maxHeight: "160px" }}
            />

            {/* send button — right of textarea */}
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              title="Send"
              className={`mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                canSend
                  ? "bg-gradient-to-br from-brand-purple to-brand-deep text-white shadow-sm hover:opacity-90"
                  : "bg-brand-pale text-brand-slate/30 cursor-not-allowed"
              }`}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* ── helper text row ── */}
        <div className="mt-2 flex items-center justify-between px-1">
          <p className="text-[10px] text-brand-slate/30">
            {input.length > 0 ? "Shift+Enter for new line" : ""}
          </p>
          <p className="text-[10px] text-brand-slate/30">
            FitBuddy AI · Not a substitute for professional medical advice
          </p>
        </div>
      </div>
    </div>
  );
}
