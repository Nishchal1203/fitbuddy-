"use client";

import React, { useCallback, useState } from "react";
import { ChatSidebar, ChatMessages, ChatInput } from "@/components/chat";
import type { Conversation, Message } from "@/components/chat";
import Collapser from "@/assets/Collapser.svg";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import Navbar from "@/components/Navbar";
/* ─────────────────────────────────────────────
   MOCK REPLIES  (replace with real API later)
───────────────────────────────────────────── */
const MOCK_REPLIES: Record<string, string> = {
  default: `Great question! Here's what I recommend based on your fitness profile:

**Key Points:**
• Focus on progressive overload — increase weight or reps every 1–2 weeks
• Compound movements (squat, deadlift, bench, row) should be your foundation
• Aim for 7–9 hours of sleep — this is when your muscles actually grow
• Protein intake: 1.6–2.2g per kg of bodyweight daily

Want me to go deeper on any of these? I can also build you a personalised plan. 💪`,

  form: `**Squat Form Checklist ✅**

**Setup:**
• Feet shoulder-width apart, toes slightly out (15–30°)
• Bar on upper traps (high bar) or rear delts (low bar)
• Core braced like you're about to take a punch

**The Descent:**
• Hinge hips back first, then bend knees
• Knees track over toes — don't cave inward
• Chest tall, spine neutral throughout

**Common mistakes I see most:**
1. Butt wink (pelvis tucks under at the bottom)
2. Heels rising — may need ankle mobility work
3. Forward lean — check hip flexor tightness`,

  diet: `**Pre & Post Workout Nutrition 🍽️**

**Pre-Workout (1–2 hrs before):**
• Complex carbs: oats, rice, sweet potato
• Moderate protein: chicken, Greek yogurt, eggs
• Example: 100g oats + 30g whey + banana

**Post-Workout (within 30–60 mins):**
• Fast carbs: white rice, potato, fruit
• High protein: 30–40g to maximise muscle protein synthesis
• Example: rice + chicken breast + veggies

**The real truth:** Total daily intake matters more than timing. Hit your protein goal first. 📊`,
};

function getMockReply(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (
    lower.includes("squat") ||
    lower.includes("form") ||
    lower.includes("deadlift")
  )
    return MOCK_REPLIES.form;
  if (
    lower.includes("eat") ||
    lower.includes("diet") ||
    lower.includes("protein") ||
    lower.includes("macro")
  )
    return MOCK_REPLIES.diet;
  return MOCK_REPLIES.default;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildTitle(text: string): string {
  return text.length > 40 ? text.slice(0, 40).trim() + "…" : text;
}

function buildPreview(text: string): string {
  return (
    text.replace(/\*\*/g, "").slice(0, 60).trim() +
    (text.length > 60 ? "…" : "")
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ── active conversation messages ── */
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  /* ── new chat ── */
  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setInput("");
    setImagePreview(null);
  }, []);

  /* ── select conversation ── */
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setInput("");
    setImagePreview(null);
  }, []);

  /* ── delete conversation ── */
  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((curr) => (curr === id ? null : curr));
  }, []);

  /* ── pin conversation ── */
  const handlePinConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    );
  }, []);

  /* ── clear current chat ── */
  const handleClearChat = useCallback(() => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, messages: [] } : c,
      ),
    );
  }, [activeConversationId]);

  /* ── like / dislike ── */
  const handleLike = useCallback(
    (msgId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeConversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId
                    ? { ...m, liked: m.liked === true ? null : true }
                    : m,
                ),
              },
        ),
      );
    },
    [activeConversationId],
  );

  const handleDislike = useCallback(
    (msgId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeConversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId
                    ? { ...m, liked: m.liked === false ? null : false }
                    : m,
                ),
              },
        ),
      );
    },
    [activeConversationId],
  );

  /* ── image upload ── */
  const handleImageChange = useCallback((file: File) => {
    setImagePreview(URL.createObjectURL(file));
  }, []);

  /* ── send message ── */
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && !imagePreview) return;

      const userMsg: Message = {
        id: genId(),
        role: "user",
        text,
        image: imagePreview ?? undefined,
        timestamp: new Date(),
      };

      setInput("");
      setImagePreview(null);

      /* create new conversation if none active */
      let convId = activeConversationId;
      if (!convId) {
        const newConv: Conversation = {
          id: genId(),
          title: buildTitle(text),
          preview: buildPreview(text),
          timestamp: new Date(),
          messages: [userMsg],
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        convId = newConv.id;
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  messages: [...c.messages, userMsg],
                  preview: buildPreview(text),
                  timestamp: new Date(),
                },
          ),
        );
      }

      /* simulate AI response */
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 1400 + Math.random() * 800));
      setIsTyping(false);

      const aiReply = getMockReply(text);
      const aiMsg: Message = {
        id: genId(),
        role: "assistant",
        text: aiReply,
        timestamp: new Date(),
        liked: null,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                messages: [...c.messages, aiMsg],
                preview: buildPreview(aiReply),
                timestamp: new Date(),
              },
        ),
      );
    },
    [input, imagePreview, activeConversationId],
  );

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Navbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
            onToggleSidebar={() => setSidebarOpen(false)}
            isOpen={sidebarOpen}
          />
        )}
        {!sidebarOpen && (
          <div className="border-b border-brand-pale bg-white px-4 py-3">
            <Button
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              //className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-pale bg-white text-brand-slate/45 transition hover:border-brand-mauve hover:text-brand-purple"
            >
              <Image
                src={Collapser}
                alt="open sidebar"
                width={18}
                height={18}
              />
            </Button>
          </div>
        )}

        {/* ── Main chat area ── */}
        <div className="flex min-w-xl flex-1 flex-col overflow-hidden">
          {/* <ChatHeader
          hasMessages={messages.length > 0}
          sidebarOpen={sidebarOpen}
          onClearChat={handleClearChat}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        /> */}

          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            onLike={handleLike}
            onDislike={handleDislike}
            onTopicClick={sendMessage}
          />

          <ChatInput
            input={input}
            imagePreview={imagePreview}
            isTyping={isTyping}
            showQuickPills={messages.length === 0}
            onChange={setInput}
            onSend={() => sendMessage()}
            onImageChange={handleImageChange}
            onImageRemove={() => setImagePreview(null)}
            onTopicClick={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
