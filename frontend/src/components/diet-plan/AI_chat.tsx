"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ChevronRight,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { API_BASE_URL, buildAuthHeaders } from "@/Utils/api";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export type AIMode = "goal" | "diet";

export type AIActionData = Record<string, unknown>;

export type AIGoalAssistantProps = {
  isOpen: boolean;
  mode: AIMode;
  onClose: () => void;
  /** called with the parsed action payload when user clicks Apply */
  onApply: (data: AIActionData) => void;
  /** optional — pre-fill user stats into the prompt */
  userContext?: {
    name?: string;
    age?: number;
    weight?: number;
    height?: number;
    currentGoals?: string[];
  };
};

type AIResponse = {
  summary: string;
  suggestions: string[];
  action_label: string;
  action_data: AIActionData;
};

/* ─────────────────────────────────────────────
   MODE CONFIG
───────────────────────────────────────────── */
const MODE_CONFIG = {
  goal: {
    title: "AI Goal Assistant",
    subtitle:
      "Describe your fitness vision and AI will build a smart goal for you",
    placeholder:
      "e.g. I want to get shredded like a sprinter, lose 10kg before summer, run a 5K…",
    imageLabel: "Physique Inspiration",
    imageHint:
      "Upload a photo for reference — AI will tailor your goal to match it",
    applyLabel: "Apply Goal Plan",
    examplePrompts: [
      "Lose 8kg in 3 months",
      "Build lean muscle like a swimmer",
      "Run a 5K without stopping",
      "Improve sleep to 8 hrs avg",
    ],
  },
  diet: {
    title: "AI Diet Planner",
    subtitle: "Tell AI your food preferences and it will design your meal plan",
    placeholder:
      "e.g. High protein vegetarian diet, I am lactose intolerant, want to bulk…",
    imageLabel: "Meal / Food Label",
    imageHint: "Upload a meal or food label — AI will suggest healthier swaps",
    applyLabel: "Apply Meal Plan",
    examplePrompts: [
      "High protein veg diet under 1800 kcal",
      "Keto plan for weight loss",
      "Eat like an athlete",
      "Low carb with no gluten",
    ],
  },
} satisfies Record<AIMode, object>;

/* ─────────────────────────────────────────────
   MOCK RESPONSES  (replace with real API later)
───────────────────────────────────────────── */
const MOCK_RESPONSES = {
  goal: {
    summary:
      "Great vision! Based on what you've shared, I've designed a progressive plan targeting body composition and endurance. We'll combine strength training with HIIT phases to get you there in 90 days.",
    suggestions: [
      "4 strength sessions per week with progressive overload",
      "HIIT cardio 3× weekly — 20 min sessions",
      "Calorie deficit of 300–400 kcal/day for fat loss",
      "Track weekly measurements every Monday morning",
    ],
    action_label: "Start Fat Loss Plan",
    action_data: {
      title: "Fat Loss & Shred",
      category: "Fitness",
      target_value: 12,
      target_unit: "%",
      duration_days: 90,
      difficulty: "intermediate",
      focus_areas: ["HIIT", "Strength", "Nutrition"],
    },
  },
  diet: {
    summary:
      "Perfect — I've built a high-protein plan around your preferences. This balances macros to support muscle retention while keeping calories in check. Meal timing is optimised for your training schedule.",
    suggestions: [
      "Target 180g protein daily across 4 meals",
      "Carbs timed around workouts for energy",
      "Healthy fats from nuts, avocado and olive oil",
      "Hydration goal: 3L water + 1 electrolyte drink",
    ],
    action_label: "Apply High Protein Plan",
    action_data: {
      calorie_target: 2100,
      protein_g: 180,
      carbs_g: 210,
      fat_g: 65,
      meal_count: 4,
      diet_type: "high-protein",
      restrictions: [],
    },
  },
};

type NutritionAIGenerateResponse = {
  plan_id: number;
  summary: string;
  suggestions: string[];
  recommended_plan: Record<string, unknown>;
  created_at: string;
};

type GoalAIGenerateResponse = {
  summary: string;
  suggestions: string[];
  recommended_goal: Record<string, unknown>;
  source: string;
};

/* ─────────────────────────────────────────────
   TYPING DOTS
───────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-brand-purple animate-bounce"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RESPONSE CARD
───────────────────────────────────────────── */
function AIResponseCard({
  response,
  onApply,
  onReset,
}: {
  response: AIResponse;
  onApply: (data: AIActionData) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* summary bubble */}
      <div className="rounded-2xl bg-gradient-to-br from-[#F0E4F9] to-[#E8D4F5] p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-soft to-brand-deep">
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="text-xs font-bold text-brand-purple">
            AI Recommendation
          </span>
        </div>
        <p className="text-sm leading-relaxed text-brand-slate">
          {response.summary}
        </p>
      </div>

      {/* action plan chips */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate/45">
          Your Action Plan
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {response.suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-xl border border-brand-pale bg-white px-3 py-2.5 shadow-sm"
            >
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-purple text-[9px] font-bold text-white">
                {i + 1}
              </span>
              <p className="text-xs leading-snug text-brand-slate">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-brand-pale px-3 py-2.5 text-xs font-semibold text-brand-slate/55 transition hover:border-brand-mauve hover:text-brand-slate"
        >
          <RotateCcw size={12} />
          Try Again
        </button>
        <Button
          onClick={() => onApply(response.action_data)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-deep py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Zap size={14} />
          {response.action_label}
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AIGoalAssistant({
  isOpen,
  mode,
  onClose,
  onApply,
  userContext,
}: AIGoalAssistantProps) {
  const cfg = MODE_CONFIG[mode];

  const [prompt, setPrompt] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── image handling ── */
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setSelectedImageFile(file);
    setError("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function removeImage() {
    setImagePreview(null);
    setSelectedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function fileToBase64(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("image-read-failed"));
      reader.readAsDataURL(file);
    });
  }

  /* ── textarea auto-grow ── */
  function handlePromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }

  /* ── use example prompt ── */
  function useExample(ex: string) {
    setPrompt(ex);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  /* ── generate ── */
  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Please describe your vision first.");
      return;
    }
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      if (mode === "diet") {
        const imageBase64 = selectedImageFile
          ? await fileToBase64(selectedImageFile)
          : null;

        const response = await fetch(
          `${API_BASE_URL}/api/nutrition/ai/generate-plan`,
          {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              prompt,
              image_base64: imageBase64,
              user_context: userContext || {},
            }),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as NutritionAIGenerateResponse;
          setResponse({
            summary: data.summary,
            suggestions: Array.isArray(data.suggestions)
              ? data.suggestions
              : [],
            action_label: "Apply Meal Plan",
            action_data: data.recommended_plan || {},
          });
        } else {
          setResponse(MOCK_RESPONSES[mode]);
          setError(
            "AI service is unavailable right now, showing fallback recommendation.",
          );
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/goals/ai-draft`, {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            prompt,
            user_context: userContext || {},
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as GoalAIGenerateResponse;
          setResponse({
            summary: data.summary,
            suggestions: Array.isArray(data.suggestions)
              ? data.suggestions
              : [],
            action_label: "Apply Goal Plan",
            action_data: data.recommended_goal || {},
          });
        } else {
          setResponse(MOCK_RESPONSES[mode]);
          setError(
            "AI service is unavailable right now, showing fallback recommendation.",
          );
        }
      }
    } catch {
      setResponse(MOCK_RESPONSES[mode]);
      setError("AI request failed, fallback recommendation shown.");
    } finally {
      setLoading(false);
    }
  }

  /* ── reset ── */
  function handleReset() {
    setResponse(null);
    setError("");
  }

  /* ── close + cleanup ── */
  function handleClose() {
    setPrompt("");
    setImagePreview(null);
    setSelectedImageFile(null);
    setLoading(false);
    setError("");
    setResponse(null);
    onClose();
  }

  function handleApply(data: AIActionData) {
    onApply({
      ...data,
      ai_summary: response?.summary,
      ai_suggestions: response?.suggestions,
    });
    handleClose();
  }

  const canGenerate = prompt.trim().length > 3 && !loading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      hideHeader
      className="max-w-[540px] overflow-hidden !p-0 bg-white"
    >
      <div className="flex flex-col">
        {/* ── Gradient header ── */}
        <div
          className={`relative bg-gradient-to-br from-brand-soft via-brand-purple to-brand-deep px-6 pb-6 pt-5`}
        >
          {/* close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={14} />
          </button>

          {/* icon + title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{cfg.title}</h2>
              <p className="text-xs text-white/75">{cfg.subtitle}</p>
            </div>
          </div>

          {/* user context chip */}
          {userContext?.name && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white/85">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
              Personalised for {userContext.name}
              {userContext.weight ? ` · ${userContext.weight}kg` : ""}
              {userContext.age ? ` · ${userContext.age}y` : ""}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div
          className="space-y-4 overflow-y-auto p-5"
          style={{ maxHeight: "70vh" }}
        >
          {!response ? (
            <>
              {/* prompt input */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-brand-slate/50">
                  Your Vision
                </label>
                <div className="relative rounded-2xl border border-brand-pale bg-brand-bg focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-brand-purple/15 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={handlePromptChange}
                    placeholder={cfg.placeholder}
                    rows={3}
                    className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-brand-slate outline-none placeholder:text-brand-slate/35"
                    style={{ minHeight: "80px", maxHeight: "160px" }}
                  />
                  {prompt && (
                    <button
                      onClick={() => setPrompt("")}
                      className="absolute right-3 top-3 text-brand-slate/30 hover:text-brand-slate transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* char counter */}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-brand-slate/35">
                    {prompt.length} characters
                  </span>
                  {prompt.length > 0 && prompt.length < 10 && (
                    <span className="text-[10px] text-brand-gold">
                      Add more detail for better results
                    </span>
                  )}
                </div>
              </div>

              {/* example prompts */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
                  Quick Examples
                </p>
                <div className="flex flex-wrap gap-2">
                  {cfg.examplePrompts.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => useExample(ex)}
                      className="rounded-full border border-brand-pale bg-white px-3 py-1 text-xs font-medium text-brand-slate/70 transition hover:border-brand-purple hover:bg-brand-pale/40 hover:text-brand-purple"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* image upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-brand-slate/50">
                  {cfg.imageLabel}{" "}
                  <span className="font-normal normal-case text-brand-slate/30">
                    (optional)
                  </span>
                </label>

                {imagePreview ? (
                  /* preview */
                  <div className="relative overflow-hidden rounded-2xl border border-brand-pale">
                    <img
                      src={imagePreview}
                      alt="Inspiration"
                      className="h-40 w-full object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X size={13} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                      <p className="text-[10px] font-semibold text-white/80">
                        ✓ Image attached — AI will analyse this
                      </p>
                    </div>
                  </div>
                ) : (
                  /* drop zone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                      dragOver
                        ? "border-brand-purple bg-brand-pale/50 scale-[1.01]"
                        : "border-brand-mauve/60 bg-brand-bg hover:border-brand-purple hover:bg-brand-pale/30"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep text-white shadow-sm">
                      {dragOver ? (
                        <Upload size={18} />
                      ) : (
                        <ImagePlus size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-brand-slate/70">
                        {dragOver
                          ? "Drop it here!"
                          : "Drag & drop or click to upload"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-brand-slate/40">
                        {cfg.imageHint}
                      </p>
                      <p className="mt-0.5 text-[10px] text-brand-slate/30">
                        JPG, PNG, WEBP · max 5MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* generate button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="rounded-xl border border-brand-pale px-4 py-2.5 text-sm font-semibold text-brand-slate/60 transition hover:border-brand-mauve hover:text-brand-slate"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-deep py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Generate {mode === "goal" ? "Goal" : "Meal Plan"}
                      <Zap size={13} />
                    </>
                  )}
                </Button>
              </div>

              {/* thinking state */}
              {loading && (
                <div className="flex items-center gap-3 rounded-2xl border border-brand-pale bg-brand-bg px-4 py-3">
                  <TypingDots />
                  <p className="text-xs text-brand-slate/55 animate-pulse">
                    AI is analysing your vision
                    {imagePreview ? " and photo" : ""}…
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ── Response view ── */
            <AIResponseCard
              response={response}
              onApply={handleApply}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
