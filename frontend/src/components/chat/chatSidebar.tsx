"use client";

import React, { useState } from "react";
import {
  MessageSquarePlus,
  Pin,
  Trash2,
  Search,
  X,
  Dumbbell,
  PanelLeftClose,
} from "lucide-react";
import Image from "next/image";
//import AiIcon from '@/assets/AI_icon.svg'
import type { Conversation } from "./types";
import { Button } from "../ui";
import Collapser from "@/assets/Collapser.svg";
import Plusicon from "@/assets/plus.svg";
import logofull from "@/assets/Logo_full.svg";
import arrow from "@/assets/leftarrow.svg";
import { useRouter } from "next/navigation";
type Props = {
  conversations: Conversation[];
  activeConversationId: string | null;
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
   SINGLE CONVERSATION ROW
───────────────────────────────────────────── */
function ConvRow({
  conv,
  isActive,
  onSelect,
  onDelete,
  onPin,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        isActive
          ? "bg-brand-pale/80 text-brand-slate"
          : "hover:bg-brand-bg text-brand-slate/70"
      }`}
    >
      {/* icon */}
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
          isActive
            ? "bg-brand-purple text-white"
            : "bg-brand-pale text-brand-slate/50"
        }`}
      >
        <Dumbbell size={13} />
      </div>

      {/* text */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-md font-semibold ${isActive ? "text-brand-slate" : "text-brand-slate/75"}`}
        >
          {conv.title}
        </p>
        <p className="truncate text-[10px] text-brand-slate/40">
          {conv.preview}
        </p>
      </div>

      {/* time or action buttons */}
      <div className="flex-shrink-0 text-right">
        {hovered || isActive ? (
          <div className="flex items-center gap-1">
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
          <p className="text-[9px] text-brand-slate/35">
            {formatRelativeTime(conv.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

// SECTION LABEL

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-3 px-3 text-[9px] font-bold uppercase tracking-widest text-brand-slate/35">
      {label}
    </p>
  );
}

//SIDEBAR

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onPinConversation,
  onToggleSidebar,
  isOpen,
}: Props & { isOpen: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase()),
  );

  const { pinned, today, week, older } = groupConversations(filtered);

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col border-r border-brand-pale bg-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-14"
      }`}
    >
      {/* ── Brand header ── */}
      <div className="flex items-center justify-between border-b border-brand-pale px-3 py-4">
        {isOpen && (
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="!h-8 !w-8 shrink-0 !min-h-0 !p-0 shadow-sm"
              aria-label="Back to dashboard"
            >
              <Image src={arrow} alt="" width={18} height={18} />
            </Button>
            <p className="text-md font-semibold text-brand-slate">
              Back to Dashboard
            </p>
          </div>
        )}

        {/* Toggle button — flips SVG based on isOpen */}
        <Button
          onClick={onToggleSidebar}
          title={isOpen ? "Close sidebar" : "Open sidebar"}
          className={`!p-0 bg-transparent border-none shadow-none hover:bg-transparent ${
            !isOpen ? "mx-auto" : ""
          }`}
        >
          <Image
            src={Collapser}
            alt="toggle sidebar"
            width={20}
            height={20}
            className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}
          />
        </Button>
      </div>

      {/* ── New chat button ── */}
      <div className="px-3 pt-3">
        <Button
          onClick={onNewChat}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-deep px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 ${
            !isOpen ? "px-0" : ""
          }`}
        >
          {" "}
          <Image
            src={Plusicon}
            alt="New chat"
            width={20}
            height={20}
            style={{
              filter: "brightness(0) invert(1)",
            }}
          />
          New Chat
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-brand-pale bg-brand-bg px-3 py-2">
          <Search size={13} className="flex-shrink-0 text-brand-slate/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-xs text-brand-slate outline-none placeholder:text-brand-slate/35"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-brand-slate/30 hover:text-brand-slate"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conversations list ── */}
      <div className="flex-1 overflow-y-auto px-1 pb-4 pt-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-2xl font-bold ">💬</span>
            <p className="text-xs font-semibold text-brand-slate/50">
              No chats yet
            </p>
            <p className="text-[10px] text-brand-slate/35">
              Start a new chat to begin
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-xs text-brand-slate/40">
              No results for "{search}"
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-brand-pale px-4 py-3">
        <p className="text-center text-[9px] text-brand-slate/30">
          FitBuddy AI · All chats stored locally
        </p>
      </div>
    </aside>
  );
}
