"use client";

import React from "react";
import Image from "next/image";
import { Dumbbell, Heart, Moon, Target, Utensils, Zap } from "lucide-react";
import AiIcon from "@/assets/AI_icon.svg";
import type { QuickTopic } from "./types";

/* ─────────────────────────────────────────────
   QUICK TOPICS DATA
───────────────────────────────────────────── */
export const QUICK_TOPICS: QuickTopic[] = [
  {
    icon: <Dumbbell size={14} />,
    label: "Form Check",
    prompt:
      "Can you help me check my squat form? What are the most common mistakes to avoid?",
    color: "from-brand-soft to-brand-purple",
  },
  {
    icon: <Target size={14} />,
    label: "Workout Plan",
    prompt:
      "Build me a 4-day workout split for muscle gain as an intermediate lifter.",
    color: "from-brand-purple to-brand-deep",
  },
  {
    icon: <Utensils size={14} />,
    label: "Diet Advice",
    prompt:
      "What should I eat before and after a workout to maximise muscle growth?",
    color: "from-brand-gold to-[#e6a800]",
  },
  {
    icon: <Zap size={14} />,
    label: "Reps & Sets",
    prompt:
      "How many reps and sets should I do for hypertrophy vs strength training?",
    color: "from-[#C98CE8] to-brand-deep",
  },
  {
    icon: <Heart size={14} />,
    label: "Recovery",
    prompt:
      "How long should I rest between sets and between workout days for optimal recovery?",
    color: "from-[#F97316] to-[#EF4444]",
  },
  {
    icon: <Moon size={14} />,
    label: "Sleep & Rest",
    prompt:
      "How does sleep affect muscle growth and what can I do to optimise my sleep?",
    color: "from-brand-deep to-[#4C1D95]",
  },
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function EmptyState({
  onTopicClick,
}: {
  onTopicClick: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 py-10">
      {/* hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          {/* pulse glow */}
          <div className="absolute inset-0 animate-ping rounded-3xl bg-brand-purple opacity-10" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-brand-deep shadow-xl">
            <Image src={AiIcon} alt="AI Trainer" width={40} height={40} />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-slate">
            Your AI Fitness Trainer
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-brand-slate/55">
            Ask me anything — form checks, workout plans, diet advice, recovery
            tips, and more.
          </p>
        </div>
      </div>

      {/* quick topic grid */}
      <div className="w-full max-w-xl">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
          Quick Topics
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => onTopicClick(topic.prompt)}
              className="group flex items-center gap-2.5 rounded-2xl border border-brand-pale bg-white px-3.5 py-3 text-left shadow-sm transition-all hover:border-brand-mauve hover:shadow-md"
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${topic.color} text-white shadow-sm`}
              >
                {topic.icon}
              </div>
              <span className="text-xs font-semibold text-brand-slate transition-colors group-hover:text-brand-purple">
                {topic.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* disclaimer */}
      <p className="max-w-sm text-center text-[10px] text-brand-slate/30">
        AI Trainer gives general fitness guidance. Always consult a professional
        before starting any new exercise or diet program.
      </p>
    </div>
  );
}
