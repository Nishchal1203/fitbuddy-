"use client";

import React, { useState } from "react";
import { Pin, Trash2, Search, X, Dumbbell } from "lucide-react";
import Image from "next/image";
import type { Conversation } from "./types";
import { Button } from "../ui";
import Collapser from "@/assets/Collapser.svg";
import Plusicon from "@/assets/plus.svg";
import arrow from "@/assets/leftarrow.svg";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Props = {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onPinConversation: (id: string) => void;
  onToggleSidebar: () => void;
  isOpen: boolean;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function groupConversations(convs: Conversation[]) {
  const pinned: Conversation[] = [];
  const today: Conversation[] = [];
  const week: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const sod = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const sowk = sod - 6 * 86400000;

  convs.forEach((c) => {
    if (c.pinned) {
      pinned.push(c);
      return;
    }
    const t = c.timestamp.getTime();
    if (t >= sod) today.push(c);
    else if (t >= sowk) week.push(c);
    else older.push(c);
  });

  return { pinned, today, week, older };
}

/* ─────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-3 px-2 text-[9px] font-bold uppercase tracking-widest text-brand-slate/35">
      {label}
    </p>
  );
}

/* ─────────────────────────────────────────────
   CONVERSATION ROW
   — expanded: icon + title + preview + actions
   — compact:  icon only, centered, full tooltip
───────────────────────────────────────────── */
function ConvRow({
  conv,
  isActive,
  isCompact = false,
  onSelect,
  onDelete,
  onPin,
}: {
  conv: Conversation;
  isActive: boolean;
  isCompact?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  /* ── Compact (sidebar collapsed) ── */
  if (isCompact) {
    return (
      <div
        onClick={onSelect}
        title={conv.title}
        className={`mx-auto my-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-colors ${
          isActive
            ? "bg-brand-purple text-white"
            : "text-brand-slate/50 hover:bg-brand-bg hover:text-brand-purple"
        }`}
      >
        <Dumbbell size={15} />
      </div>
    );
  }

  /* ── Expanded ── */
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      title={conv.title}
      className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition-colors ${
        isActive ? "bg-brand-pale/80" : "hover:bg-brand-bg"
      }`}
    >
      {/* icon */}
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
          isActive
            ? "bg-brand-purple text-white"
            : "bg-brand-pale text-brand-slate/50"
        }`}
      >
        <Dumbbell size={13} />
      </div>

      {/* text — takes remaining space, truncates cleanly */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-semibold leading-tight ${
            isActive ? "text-brand-slate" : "text-brand-slate/75"
          }`}
        >
          {conv.title}
        </p>
        <p className="truncate text-[10px] text-brand-slate/40 leading-tight">
          {conv.preview}
        </p>
      </div>

      {/* action buttons (hover/active) OR timestamp */}
      <div className="flex-shrink-0">
        {hovered || isActive ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              className={`rounded-md p-1 transition-colors ${
                conv.pinned
                  ? "text-brand-gold"
                  : "text-brand-slate/30 hover:text-brand-gold"
              }`}
              title={conv.pinned ? "Unpin" : "Pin"}
            >
              <Pin size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-md p-1 text-brand-slate/30 transition-colors hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ) : (
          <p className="text-[9px] text-brand-slate/35 whitespace-nowrap">
            {formatRelativeTime(conv.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
export default function ChatSidebar({
  conversations,
  activeConversationId,
  searchTerm = "",
  onSearchChange,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onPinConversation,
  onToggleSidebar,
  isOpen,
}: Props) {
  const router = useRouter();

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.preview.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const { pinned, today, week, older } = groupConversations(filtered);

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col border-r border-brand-pale bg-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-[60px]"
      }`}
    >
      {/* ── Header: back button + collapse toggle ── */}
      <div
        className={`flex h-14 flex-shrink-0 items-center border-b border-brand-pale ${
          isOpen ? "justify-between px-3" : "justify-center px-0"
        }`}
      >
        {isOpen && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="!h-8 !w-8 !min-h-0 !p-0 shrink-0 shadow-sm"
              aria-label="Back to dashboard"
            >
              <Image src={arrow} alt="" width={18} height={18} />
            </Button>
            <p className="text-xs font-semibold text-brand-slate">
              Back to Dashboard
            </p>
          </div>
        )}

        {/* Collapse / expand toggle */}
        <button
          onClick={onToggleSidebar}
          title={isOpen ? "Close sidebar" : "Open sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-slate/45 transition-colors hover:bg-brand-bg hover:text-brand-slate"
        >
          <Image
            src={Collapser}
            alt="toggle sidebar"
            width={20}
            height={20}
            className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* ── New Chat ── */}
      <div
        className={`flex-shrink-0 pt-3 ${isOpen ? "px-3" : "flex justify-center px-0"}`}
      >
        {isOpen ? (
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-deep px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Image src={Plusicon} alt="" width={18} height={18} />
            New Chat
          </button>
        ) : (
          <button
            onClick={onNewChat}
            title="New Chat"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-brand-purple to-brand-deep text-white shadow-sm transition hover:opacity-90"
          >
            <Image src={Plusicon} alt="" width={18} height={18} />
          </button>
        )}
      </div>

      {/* ── Search ── */}
      <div
        className={`flex-shrink-0 pt-2 ${isOpen ? "px-3" : "flex justify-center px-0"}`}
      >
        {isOpen ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand-pale bg-brand-bg px-3 py-2">
            <Search size={13} className="flex-shrink-0 text-brand-slate/40" />
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search chats…"
              className="flex-1 bg-transparent text-xs text-brand-slate outline-none placeholder:text-brand-slate/35"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.("")}
                className="text-brand-slate/30 hover:text-brand-slate"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            title="Search"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-pale bg-brand-bg text-brand-slate/45 transition-colors hover:border-brand-mauve hover:text-brand-purple"
          >
            <Search size={15} />
          </button>
        )}
      </div>

      {/* ── Conversation list
            KEY FIX: min-h-0 + flex-1 + overflow-y-auto
            This is what stops the list from jumping when a conv is selected.
            Without min-h-0 the flex child grows with content instead of scrolling.
      ── */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {/* empty state */}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            {isOpen ? (
              <>
                <p className="text-xs font-semibold text-brand-slate/50">
                  No chats yet
                </p>
                <p className="text-[10px] text-brand-slate/35">
                  Start a new chat to begin
                </p>
              </>
            ) : (
              <span className="text-[10px] text-brand-slate/40">–</span>
            )}
          </div>
        )}

        {/* no search results */}
        {conversations.length > 0 && filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-brand-slate/40">
              {isOpen ? `No results for "${searchTerm}"` : "–"}
            </p>
          </div>
        )}

        {/* ── EXPANDED view: grouped sections ── */}
        {isOpen && filtered.length > 0 && (
          <div className="px-1">
            {pinned.length > 0 && (
              <>
                <SectionLabel label="📌 Pinned" />
                {pinned.map((c) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    isActive={c.id === activeConversationId}
                    onSelect={() => onSelectConversation(c.id)}
                    onDelete={() => onDeleteConversation(c.id)}
                    onPin={() => onPinConversation(c.id)}
                  />
                ))}
              </>
            )}
            {today.length > 0 && (
              <>
                <SectionLabel label="Today" />
                {today.map((c) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    isActive={c.id === activeConversationId}
                    onSelect={() => onSelectConversation(c.id)}
                    onDelete={() => onDeleteConversation(c.id)}
                    onPin={() => onPinConversation(c.id)}
                  />
                ))}
              </>
            )}
            {week.length > 0 && (
              <>
                <SectionLabel label="This Week" />
                {week.map((c) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    isActive={c.id === activeConversationId}
                    onSelect={() => onSelectConversation(c.id)}
                    onDelete={() => onDeleteConversation(c.id)}
                    onPin={() => onPinConversation(c.id)}
                  />
                ))}
              </>
            )}
            {older.length > 0 && (
              <>
                <SectionLabel label="Older" />
                {older.map((c) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    isActive={c.id === activeConversationId}
                    onSelect={() => onSelectConversation(c.id)}
                    onDelete={() => onDeleteConversation(c.id)}
                    onPin={() => onPinConversation(c.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── COMPACT view: icon-only list, no sections ── */}
        {!isOpen && filtered.length > 0 && (
          <div className="flex flex-col items-center gap-0.5 px-1.5">
            {filtered.map((c) => (
              <ConvRow
                key={c.id}
                conv={c}
                isActive={c.id === activeConversationId}
                isCompact
                onSelect={() => onSelectConversation(c.id)}
                onDelete={() => onDeleteConversation(c.id)}
                onPin={() => onPinConversation(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer — only when expanded ── */}
      {isOpen && (
        <div className="flex-shrink-0 border-t border-brand-pale px-4 py-3">
          <p className="text-center text-[10px] text-brand-slate/30">
            FitBuddy AI · Chats synced to your account
          </p>
        </div>
      )}
    </aside>
  );
}
