"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Plus, Sparkles } from "lucide-react";
import {
  CALORIE_DATA,
  FILLED_CUPS,
  INITIAL_MEALS,
  MACRO_DATA,
  TOTAL_CUPS,
  type MacroData,
  type MealItem,
  type MealSection,
} from "@/lib/constants";
import WaterGlass from "@/assets/water glass.png";
import AiIcon from "@/assets/AI_icon.svg";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Add_Meal, { AddMealItem } from "@/components/diet-plan/Add_Meal";
import AIGoalAssistant from "@/components/diet-plan/AI_chat";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ─────────────────────────────────────────────
   CALORIE DONUT  (Recharts PieChart)
   Segments: consumed | remaining | over-limit
───────────────────────────────────────────── */
function CalorieDonut({
  consumed,
  total,
}: {
  consumed: number;
  total: number;
}) {
  const remaining = Math.max(total - consumed, 0);
  const overLimit = Math.max(consumed - total, 0);
  const isOver = consumed > total;

  // Build pie slices dynamically
  const slices = isOver
    ? [
        { name: "Consumed", value: total, fill: "var(--color-brand-purple)" },
        { name: "Over", value: overLimit, fill: "var(--color-brand-gold)" },
      ]
    : [
        {
          name: "Consumed",
          value: consumed,
          fill: "var(--color-brand-purple)",
        },
        {
          name: "Remaining",
          value: remaining,
          fill: "var(--color-brand-pale)",
        },
      ];

  const kcalLabel = consumed.toLocaleString() + " Kcal";
  const totalLabel = "/ " + total.toLocaleString() + " Kcal";
  const remLabel = (isOver ? overLimit : remaining).toLocaleString() + " Kcal";
  const remSub = isOver ? "Over Limit" : "Remaining";

  return (
    <div className="relative flex h-[184px] w-[184px] items-center justify-center flex-shrink-0">
      <ResponsiveContainer width={184} height={184}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={82}
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {slices.map((s, i) => (
              <Cell key={i} fill={s.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} Kcal`, name]}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid var(--color-brand-pale)",
              fontSize: "12px",
              color: "var(--color-brand-slate)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label — absolutely positioned over the hole */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[15px] font-bold leading-tight text-brand-slate">
          {kcalLabel}
        </p>
        <p className="text-[10px] text-brand-purple">{totalLabel}</p>
        <p className="mt-1 text-[12px] font-semibold text-brand-slate">
          {remLabel}
        </p>
        <p className="text-[10px] text-brand-purple">{remSub}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MACRO BAR ROW  (native div — Recharts bar
   would be overkill for single rows)
   But we expose the data via Recharts tooltip
───────────────────────────────────────────── */
function MacroRow({ label, current, target, cssColor }: MacroData) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-slate">{label}</span>
        <span className="text-xs text-brand-slate/60">
          {current}g / {target}g
        </span>
      </div>
      {/* track */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-brand-pale">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: cssColor }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MEAL ITEM ROW
───────────────────────────────────────────── */
function MealItemRow({ item }: { item: MealItem }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-brand-slate">
        {item.name},{" "}
        <span className="font-normal text-brand-slate/55">
          {item.kcal} Kcal
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {item.macros.map((m) => (
          <span
            key={m.label}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.color}`}
          >
            {m.label} {m.value}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MEAL SECTION CARD
───────────────────────────────────────────── */
function MealCard({ section }: { section: MealSection }) {
  return (
    <Card className="p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-brand-slate">{section.title}</h3>
        <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div className="space-y-3.5">
        {section.items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <hr className="border-brand-pale" />}
            <MealItemRow item={item} />
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   WATER CUP IMAGE
───────────────────────────────────────────── */
function WaterCup({ filled }: { filled: boolean }) {
  return (
    <Image
      src={WaterGlass}
      alt={filled ? "Filled water glass" : "Empty water glass"}
      width={30}
      height={38}
      className={filled ? "opacity-100" : "opacity-40 grayscale"}
    />
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DietPlanPage() {
  const [waterCups, setWaterCups] = useState(FILLED_CUPS);
  const [mealSections, setMealSections] =
    useState<MealSection[]>(INITIAL_MEALS);
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const { consumed, total } = CALORIE_DATA;
  const remaining = total - consumed;

  function toggleCup(i: number) {
    // click filled cup → reduce; click empty cup → fill up to that cup
    setWaterCups(i < waterCups ? i : i + 1);
  }

  function handleAddMeals(sectionTitle: string, meals: AddMealItem[]) {
    setMealSections((prev) =>
      prev.map((section) =>
        section.title === sectionTitle
          ? { ...section, items: [...section.items, ...meals] }
          : section,
      ),
    );
  }

  return (
    <div className="relative space-y-6 pb-24">
      {/* ── Page heading ── */}
      <div>
        {/* <p className="text-lg text-brand-slate/55">Good Morning, Welcome Back 🎉</p> */}
        <h1 className="text-2xl font-bold text-brand-slate">
          Nutrition and Diet Tracker
        </h1>
      </div>

      {/* ── TOP: Donut + Macro Bars ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr]">
        {/* Donut card */}
        <Card className="flex flex-col items-center gap-6 p-6 shadow-lg sm:flex-row sm:items-start">
          <CalorieDonut consumed={consumed} total={total} />

          {/* Legend */}
          <div className="flex flex-col justify-center gap-3 text-sm">
            {[
              {
                dotClass: "bg-brand-purple",
                label: "Consumed",
                extra: `${consumed.toLocaleString()} Kcal`,
              },
              {
                dotClass: "bg-brand-pale border border-brand-mauve",
                label: "Remaining",
                extra: `${Math.max(remaining, 0).toLocaleString()} Kcal`,
              },
              {
                dotClass: "bg-brand-gold",
                label: "Over-Limit",
                extra: remaining < 0 ? `${Math.abs(remaining)} Kcal` : "-",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span
                  className={`h-3.5 w-3.5 flex-shrink-0 rounded-sm ${item.dotClass}`}
                />
                <div>
                  <p className="text-xs font-semibold text-brand-slate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-brand-slate/50">
                    {item.extra}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Macro bars card */}
        <Card className="flex flex-col justify-center gap-6 p-6 shadow-lg">
          {MACRO_DATA.map((m) => (
            <MacroRow key={m.label} {...m} />
          ))}
        </Card>
      </div>

      {/* ── MEAL CARDS ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mealSections.map((section) => (
          <MealCard key={section.title} section={section} />
        ))}
      </div>

      {/* ── BOTTOM ROW: Water + AI Suggestion ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Water Tracker */}
        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">Water Tracker</h3>
            <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: TOTAL_CUPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => toggleCup(i)}
                title={`${i + 1} cup${i + 1 > 1 ? "s" : ""}`}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <WaterCup filled={i < waterCups} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-brand-slate/60">
            {waterCups} / {TOTAL_CUPS} Cups (1 Liter)
          </p>
        </Card>

        {/* AI Suggestion */}
        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">AI Suggestion</h3>
            <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="flex items-start gap-4">
            {/* AI icon box — uses your custom SVG */}
            <button
              type="button"
              aria-label="Open AI assistant"
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep shadow-md transition-transform hover:scale-105"
            >
              <Image src={AiIcon} alt="AI" width={30} height={30} />
            </button>

            <div className="space-y-1.5">
              <p className="font-semibold text-brand-slate">Smart Swap</p>
              <p className="text-sm text-brand-slate/60">
                Try swapping white rice with quinoa for more fiber and
                nutrients.
              </p>
              <div className="pt-1">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => setIsAIAssistantOpen(true)}
                  className="rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                >
                  Try This
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── FAB: Add Meal ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="gold"
          onClick={() => setIsAddMealOpen(true)}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl"
        >
          <Plus size={18} />
          Add Meal
        </Button>
      </div>

      <Add_Meal
        isOpen={isAddMealOpen}
        sections={mealSections.map((section) => section.title)}
        onClose={() => setIsAddMealOpen(false)}
        onAddMeals={handleAddMeals}
      />

      <AIGoalAssistant
        isOpen={isAIAssistantOpen}
        mode="diet"
        onClose={() => setIsAIAssistantOpen(false)}
        onApply={() => setIsAIAssistantOpen(false)}
      />
    </div>
  );
}
