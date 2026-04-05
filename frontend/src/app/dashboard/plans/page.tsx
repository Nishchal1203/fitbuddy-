"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  INITIAL_MEALS,
  type MacroData,
  type MealItem,
  type MealSection,
} from "@/Utils/constants";
import WaterGlass from "@/assets/water glass.png";
import AiIcon from "@/assets/AI_icon.svg";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Add_Meal, {
  AddMealLogTarget,
  AddMealLogItem,
} from "@/components/diet-plan/Add_Meal";
import AIGoalAssistant from "@/components/diet-plan/AI_chat";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type NutritionGoalResponse = {
  id: number;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  hydration_ml: number;
};

type NutritionSummaryResponse = {
  date: string;
  consumed: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meals_count: number;
  };
};

type HydrationSummaryResponse = {
  date: string;
  consumed_ml: number;
  goal_ml: number;
  cup_size_ml: number;
  cups_count: number;
  adherence_percentage: number;
};

type MealApiItem = {
  id: number;
  date: string;
  section: string;
  logged_at: string;
  food_name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type MacroTotals = {
  protein: number;
  carbs: number;
  fat: number;
};

type LoggedMeal = {
  id: string;
  remoteId?: number;
  section: string;
  loggedAt: string;
  item: AddMealLogItem;
};

type CoachInsight = {
  score: number;
  verdict: string;
  actions: string[];
};

type PlannedMealApplyPayload = {
  calorie_target?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_count?: number;
  diet_type?: string;
  restrictions?: string[];
  meal_breakdown?: Record<string, Array<Record<string, unknown>>>;
};

const DEFAULT_SECTIONS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function getDateKey(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function buildAuthHeaders(extra?: Record<string, string>) {
  const token = getAccessToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapApiMealToLoggedMeal(row: MealApiItem): LoggedMeal {
  return {
    id: String(row.id),
    remoteId: row.id,
    section: row.section,
    loggedAt: row.logged_at,
    item: {
      name: row.food_name,
      kcal: row.kcal,
      grams: row.grams,
      protein_g: row.protein_g,
      carbs_g: row.carbs_g,
      fat_g: row.fat_g,
      macros: [
        {
          label: "Protein",
          value: `${row.protein_g.toFixed(1)}g`,
          color: "bg-brand-purple text-white",
        },
        {
          label: "Carbs",
          value: `${row.carbs_g.toFixed(1)}g`,
          color: "bg-brand-gold text-white",
        },
        {
          label: "Fat",
          value: `${row.fat_g.toFixed(1)}g`,
          color: "bg-brand-mauve text-white",
        },
      ],
    },
  };
}

/* ─────────────────────────────────────────────
   CALORIE DONUT
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
   MACRO BAR ROW
───────────────────────────────────────────── */
function MacroRow({ label, current, target, cssColor }: MacroData) {
  const pct = Math.min((current / Math.max(target, 1)) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-slate">{label}</span>
        <span className="text-xs text-brand-slate/60">
          {current.toFixed(1)}g / {target}g
        </span>
      </div>
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
   MEAL ROWS
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

function PlannedMealCard({ section }: { section: MealSection }) {
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

function LoggedMealRow({
  meal,
  onDelete,
}: {
  meal: LoggedMeal;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-brand-pale bg-white px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-purple">
            {meal.section}
          </span>
          <span className="text-[11px] text-brand-slate/50">
            {formatTime(meal.loggedAt)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(meal.id)}
          className="rounded-full p-1 text-brand-slate/35 transition hover:bg-brand-pale hover:text-brand-deep"
          aria-label="Remove meal entry"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <p className="text-sm font-semibold text-brand-slate">{meal.item.name}</p>
      <p className="text-xs text-brand-slate/55">
        {meal.item.kcal} kcal · P {meal.item.protein_g}g · C {meal.item.carbs_g}
        g · F {meal.item.fat_g}g
      </p>
    </div>
  );
}

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

export default function DietPlanPage() {
  const todayKey = getDateKey(new Date());

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [plannedSectionsByDate, setPlannedSectionsByDate] = useState<
    Record<string, MealSection[]>
  >({
    [todayKey]: INITIAL_MEALS.map((section) => ({
      ...section,
      items: [...section.items],
    })),
  });
  const [logsByDate, setLogsByDate] = useState<Record<string, LoggedMeal[]>>(
    {},
  );
  const [waterByDateMl, setWaterByDateMl] = useState<Record<string, number>>(
    {},
  );
  const [isSyncingDate, setIsSyncingDate] = useState(false);
  const [goalCalories, setGoalCalories] = useState(2200);
  const [goalMacros, setGoalMacros] = useState({
    protein: 180,
    carbs: 300,
    fat: 70,
  });
  const [goalHydrationMl, setGoalHydrationMl] = useState(2500);
  const [cupSizeMl, setCupSizeMl] = useState(250);
  const [weightKg, setWeightKg] = useState(70);
  const [workoutMinutes, setWorkoutMinutes] = useState(45);
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);

  const plannedSections = useMemo(
    () =>
      plannedSectionsByDate[selectedDate] ||
      INITIAL_MEALS.map((section) => ({
        ...section,
        items: [...section.items],
      })),
    [plannedSectionsByDate, selectedDate],
  );

  const selectedLogs = useMemo(
    () =>
      [...(logsByDate[selectedDate] || [])].sort((a, b) =>
        a.loggedAt.localeCompare(b.loggedAt),
      ),
    [logsByDate, selectedDate],
  );

  const macroTargets = useMemo(
    () => ({
      protein: goalMacros.protein,
      carbs: goalMacros.carbs,
      fat: goalMacros.fat,
    }),
    [goalMacros],
  );

  useEffect(() => {
    async function loadNutritionGoals() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/nutrition/goals`, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) return;

        const data = (await response.json()) as NutritionGoalResponse;
        setGoalCalories(data.daily_calories);
        setGoalMacros({
          protein: Number(data.protein_g),
          carbs: Number(data.carbs_g),
          fat: Number(data.fat_g),
        });
        setGoalHydrationMl(data.hydration_ml);
      } catch {
        // Keep defaults if backend goals are unavailable.
      }
    }

    loadNutritionGoals();
  }, []);

  useEffect(() => {
    async function syncDateData() {
      const token = getAccessToken();
      if (!token) return;

      setIsSyncingDate(true);
      try {
        const [mealsResponse, hydrationResponse, summaryResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/api/nutrition/meals?date=${selectedDate}`, {
              headers: buildAuthHeaders(),
            }),
            fetch(
              `${API_BASE_URL}/api/nutrition/hydration?date=${selectedDate}&cup_size_ml=${cupSizeMl}&goal_ml=${goalHydrationMl}`,
              {
                headers: buildAuthHeaders(),
              },
            ),
            fetch(
              `${API_BASE_URL}/api/nutrition/summary?date=${selectedDate}`,
              {
                headers: buildAuthHeaders(),
              },
            ),
          ]);

        if (mealsResponse.ok) {
          const mealsData = (await mealsResponse.json()) as {
            meals: MealApiItem[];
          };
          setLogsByDate((prev) => ({
            ...prev,
            [selectedDate]: mealsData.meals.map(mapApiMealToLoggedMeal),
          }));
        }

        if (hydrationResponse.ok) {
          const hydration =
            (await hydrationResponse.json()) as HydrationSummaryResponse;
          setWaterByDateMl((prev) => ({
            ...prev,
            [selectedDate]: hydration.consumed_ml,
          }));
        }

        if (summaryResponse.ok) {
          const summary =
            (await summaryResponse.json()) as NutritionSummaryResponse;
          setGoalCalories((prev) =>
            prev > 0 ? prev : Math.round(summary.consumed.calories),
          );
        }
      } catch {
        // Keep current local values when sync fails.
      } finally {
        setIsSyncingDate(false);
      }
    }

    syncDateData();
  }, [selectedDate, cupSizeMl, goalHydrationMl]);

  const totals = useMemo(() => {
    return selectedLogs.reduce(
      (acc, row) => {
        acc.kcal += row.item.kcal;
        acc.macros.protein += row.item.protein_g;
        acc.macros.carbs += row.item.carbs_g;
        acc.macros.fat += row.item.fat_g;
        return acc;
      },
      {
        kcal: 0,
        macros: { protein: 0, carbs: 0, fat: 0 } as MacroTotals,
      },
    );
  }, [selectedLogs]);

  const consumed = Math.round(totals.kcal);
  const total = goalCalories;
  const remaining = total - consumed;

  const macroRows: MacroData[] = useMemo(
    () => [
      {
        label: "Protein",
        current: Number(totals.macros.protein.toFixed(1)),
        target: macroTargets.protein,
        color: "bg-brand-purple",
        cssColor: "var(--color-brand-purple)",
      },
      {
        label: "Carbs",
        current: Number(totals.macros.carbs.toFixed(1)),
        target: macroTargets.carbs,
        color: "bg-brand-gold",
        cssColor: "var(--color-brand-gold)",
      },
      {
        label: "Fat",
        current: Number(totals.macros.fat.toFixed(1)),
        target: macroTargets.fat,
        color: "bg-brand-mauve",
        cssColor: "var(--color-brand-mauve)",
      },
    ],
    [macroTargets, totals.macros],
  );

  const plannedKcal = useMemo(
    () =>
      plannedSections.reduce(
        (sAcc, section) =>
          sAcc + section.items.reduce((iAcc, item) => iAcc + item.kcal, 0),
        0,
      ),
    [plannedSections],
  );

  const adherencePct = plannedKcal
    ? clamp(Math.round((consumed / plannedKcal) * 100), 0, 200)
    : 0;

  const formulaHydrationMl = Math.round(weightKg * 35 + workoutMinutes * 12);
  const hydrationGoalMl = Math.max(goalHydrationMl, formulaHydrationMl);
  const hydratedMl = waterByDateMl[selectedDate] || 0;
  const totalCups = Math.max(1, Math.ceil(hydrationGoalMl / cupSizeMl));
  const waterCups = clamp(Math.round(hydratedMl / cupSizeMl), 0, totalCups);

  async function toggleCup(i: number) {
    if (i < waterCups) return;

    const nextCups = i < waterCups ? i : i + 1;
    const nextMl = nextCups * cupSizeMl;
    const deltaMl = nextMl - hydratedMl;

    if (deltaMl <= 0) return;

    setWaterByDateMl((prev) => ({
      ...prev,
      [selectedDate]: nextMl,
    }));

    const token = getAccessToken();
    if (!token) return;

    try {
      await fetch(
        `${API_BASE_URL}/api/nutrition/hydration?cup_size_ml=${cupSizeMl}`,
        {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            date: selectedDate,
            amount_ml: deltaMl,
            logged_at: new Date().toISOString(),
          }),
        },
      );
    } catch {
      // Preserve optimistic hydration value on request failure.
    }
  }

  async function handleAddMeals(
    sectionTitle: string,
    meals: AddMealLogItem[],
    loggedAt: string,
    target: AddMealLogTarget,
  ) {
    const dateKey = getDateKey(loggedAt);

    if (target === "planned") {
      setPlannedSectionsByDate((prev) => {
        const existing =
          prev[dateKey] ||
          INITIAL_MEALS.map((section) => ({
            ...section,
            items: [...section.items],
          }));

        return {
          ...prev,
          [dateKey]: existing.map((section) =>
            section.title === sectionTitle
              ? {
                  ...section,
                  items: [
                    ...section.items,
                    ...meals.map((meal) => ({
                      name: meal.name,
                      kcal: meal.kcal,
                      macros: meal.macros,
                    })),
                  ],
                }
              : section,
          ),
        };
      });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setLogsByDate((prev) => ({
        ...prev,
        [dateKey]: [
          ...(prev[dateKey] || []),
          ...meals.map((item, idx) => ({
            id: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 7)}`,
            section: sectionTitle,
            loggedAt,
            item,
          })),
        ],
      }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/nutrition/meals`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          date: dateKey,
          section: sectionTitle,
          logged_at: loggedAt,
          meals: meals.map((meal) => ({
            food_name: meal.name,
            grams: meal.grams,
            kcal: meal.kcal,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fat_g: meal.fat_g,
          })),
        }),
      });

      if (!response.ok) throw new Error("meal-create-failed");

      const createdMeals = (await response.json()) as MealApiItem[];
      setLogsByDate((prev) => ({
        ...prev,
        [dateKey]: [
          ...(prev[dateKey] || []),
          ...createdMeals.map(mapApiMealToLoggedMeal),
        ].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
      }));
    } catch {
      // Keep local fallback even if backend save fails.
      setLogsByDate((prev) => ({
        ...prev,
        [dateKey]: [
          ...(prev[dateKey] || []),
          ...meals.map((item, idx) => ({
            id: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 7)}`,
            section: sectionTitle,
            loggedAt,
            item,
          })),
        ],
      }));
    }
  }

  function applyAIMealPlan(data: Record<string, unknown>) {
    const payload = data as PlannedMealApplyPayload;

    if (typeof payload.calorie_target === "number") {
      setGoalCalories(Math.max(800, Math.round(payload.calorie_target)));
    }
    if (
      typeof payload.protein_g === "number" ||
      typeof payload.carbs_g === "number" ||
      typeof payload.fat_g === "number"
    ) {
      setGoalMacros({
        protein: Math.max(0, Number(payload.protein_g || 0)),
        carbs: Math.max(0, Number(payload.carbs_g || 0)),
        fat: Math.max(0, Number(payload.fat_g || 0)),
      });
    }

    const calorieTarget = Math.max(
      1200,
      Number(payload.calorie_target || goalCalories),
    );
    const proteinTarget = Math.max(
      0,
      Number(payload.protein_g || goalMacros.protein),
    );
    const carbsTarget = Math.max(
      0,
      Number(payload.carbs_g || goalMacros.carbs),
    );
    const fatTarget = Math.max(0, Number(payload.fat_g || goalMacros.fat));

    const mealBreakdown =
      payload.meal_breakdown && typeof payload.meal_breakdown === "object"
        ? payload.meal_breakdown
        : null;

    if (mealBreakdown) {
      const aiSections = ["Breakfast", "Lunch", "Dinner"].map((sectionName) => {
        const rawItems = Array.isArray(mealBreakdown[sectionName.toLowerCase()])
          ? mealBreakdown[sectionName.toLowerCase()]
          : Array.isArray(mealBreakdown[sectionName])
            ? mealBreakdown[sectionName]
            : [];

        const items = rawItems
          .map((raw) => {
            const name = String(raw.name || raw.food || "").trim();
            if (!name) return null;

            const kcal = Math.max(0, Math.round(Number(raw.kcal || 0)));
            const protein = Math.max(
              0,
              Number(raw.protein_g || raw.protein || 0),
            );
            const carbs = Math.max(0, Number(raw.carbs_g || raw.carbs || 0));
            const fat = Math.max(0, Number(raw.fat_g || raw.fat || 0));

            return {
              name,
              kcal,
              macros: [
                {
                  label: "Protein",
                  value: `${protein.toFixed(1)}g`,
                  color: "bg-brand-purple text-white",
                },
                {
                  label: "Carbs",
                  value: `${carbs.toFixed(1)}g`,
                  color: "bg-brand-gold text-white",
                },
                {
                  label: "Fat",
                  value: `${fat.toFixed(1)}g`,
                  color: "bg-brand-mauve text-white",
                },
              ],
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        return {
          title: sectionName,
          items,
        } as MealSection;
      });

      aiSections.push({ title: "Snacks", items: [] });

      setPlannedSectionsByDate((prev) => ({
        ...prev,
        [selectedDate]: aiSections,
      }));
      return;
    }

    const sectionTemplate: Array<{ title: string; ratio: number }> = [
      { title: "Breakfast", ratio: 0.26 },
      { title: "Lunch", ratio: 0.34 },
      { title: "Dinner", ratio: 0.3 },
    ];

    const planned = sectionTemplate.map((section) => {
      const kcal = Math.round(calorieTarget * section.ratio);
      const protein = Number((proteinTarget * section.ratio).toFixed(1));
      const carbs = Number((carbsTarget * section.ratio).toFixed(1));
      const fat = Number((fatTarget * section.ratio).toFixed(1));

      return {
        title: section.title,
        items: [
          {
            name: `AI ${section.title} Plan`,
            kcal,
            macros: [
              {
                label: "Protein",
                value: `${protein}g`,
                color: "bg-brand-purple text-white",
              },
              {
                label: "Carbs",
                value: `${carbs}g`,
                color: "bg-brand-gold text-white",
              },
              {
                label: "Fat",
                value: `${fat}g`,
                color: "bg-brand-mauve text-white",
              },
            ],
          },
        ],
      } as MealSection;
    });

    planned.push({ title: "Snacks", items: [] });

    setPlannedSectionsByDate((prev) => ({
      ...prev,
      [selectedDate]: planned,
    }));
  }

  async function removeLogEntry(id: string) {
    const existing = (logsByDate[selectedDate] || []).find(
      (entry) => entry.id === id,
    );
    setLogsByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter(
        (entry) => entry.id !== id,
      ),
    }));

    if (!existing?.remoteId) return;
    const token = getAccessToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/nutrition/meals/${existing.remoteId}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });
    } catch {
      // Keep local deletion if backend call fails.
    }
  }

  async function generateCoachInsight() {
    setCoachLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/nutrition/ai/coach-insight`,
        {
          method: "POST",
          headers: buildAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            date: selectedDate,
            current_calories: consumed,
            target_calories: total,
            macros: {
              protein_g: Number(totals.macros.protein.toFixed(1)),
              carbs_g: Number(totals.macros.carbs.toFixed(1)),
              fat_g: Number(totals.macros.fat.toFixed(1)),
            },
            macro_targets: {
              protein_g: macroTargets.protein,
              carbs_g: macroTargets.carbs,
              fat_g: macroTargets.fat,
            },
            hydration_ml: hydratedMl,
            hydration_goal_ml: hydrationGoalMl,
          }),
        },
      );

      if (!response.ok) throw new Error("insight-failed");

      const data = (await response.json()) as CoachInsight;
      setCoachInsight({
        score: data.score,
        verdict: data.verdict,
        actions: data.actions,
      });
    } catch {
      const proteinGap = Math.max(
        macroTargets.protein - totals.macros.protein,
        0,
      );
      const waterGap = Math.max(hydrationGoalMl - hydratedMl, 0);
      const kcalDiffPct = Math.abs(total - consumed) / Math.max(total, 1);

      const score = clamp(
        Math.round(
          100 -
            kcalDiffPct * 40 -
            (proteinGap / Math.max(macroTargets.protein, 1)) * 35 -
            (waterGap / Math.max(hydrationGoalMl, 1)) * 25,
        ),
        35,
        99,
      );

      const actions: string[] = [];

      if (proteinGap > 20) {
        actions.push(
          `Add a high-protein meal today: +${Math.round(proteinGap)}g protein still remaining.`,
        );
      } else {
        actions.push(
          "Protein intake is on track. Keep meal timing consistent around training.",
        );
      }

      if (remaining > 250) {
        actions.push(
          `You can still eat ~${remaining} kcal. Prioritize whole-food carbs + lean protein.`,
        );
      } else if (remaining < -150) {
        actions.push(
          `You are over by ${Math.abs(remaining)} kcal. Keep dinner light and avoid calorie-dense snacks.`,
        );
      } else {
        actions.push(
          "Calories are close to target. Stay consistent and avoid random late-night extras.",
        );
      }

      if (waterGap > 0) {
        actions.push(
          `Hydration is low by ${waterGap} ml. Spread it across ${Math.ceil(waterGap / cupSizeMl)} more cups.`,
        );
      } else {
        actions.push(
          "Hydration target is complete. Great recovery support for training.",
        );
      }

      const verdict =
        score >= 85
          ? "Excellent day for your goal."
          : score >= 70
            ? "Solid day with small adjustments needed."
            : "You need a stronger close to hit today's nutrition target.";

      setCoachInsight({
        score,
        verdict,
        actions,
      });
    } finally {
      setCoachLoading(false);
    }
  }

  const sectionNames = useMemo(() => {
    const fromPlan = plannedSections.map((s) => s.title);
    return [...new Set([...DEFAULT_SECTIONS, ...fromPlan])];
  }, [plannedSections]);

  return (
    <div className="relative space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-slate">
            Nutrition and Diet Tracker
          </h1>
          <p className="mt-1 text-sm text-brand-slate/55">
            Log what you actually eat. Compare against your plan and get smart
            daily coaching.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-pale bg-white px-3 py-2.5 shadow-sm">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-slate/45">
            Tracking Date
          </p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-brand-pale bg-brand-bg px-2.5 py-1.5 text-sm text-brand-slate focus:border-brand-purple focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center gap-6 p-6 shadow-lg sm:flex-row sm:items-start">
          <CalorieDonut consumed={consumed} total={total} />

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

            <div className="mt-1 rounded-lg bg-brand-bg px-2.5 py-1.5 text-[11px] font-semibold text-brand-slate/70">
              Plan vs Actual: {plannedKcal} / {consumed} kcal ({adherencePct}%)
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center gap-6 p-6 shadow-lg">
          {macroRows.map((m) => (
            <MacroRow key={m.label} {...m} />
          ))}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">
              Actual Intake Timeline
            </h3>
            <span className="rounded-full bg-brand-bg px-2.5 py-1 text-[10px] font-semibold text-brand-purple">
              {isSyncingDate ? "Syncing..." : `${selectedLogs.length} entries`}
            </span>
          </div>

          <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
            {selectedLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-pale bg-brand-bg p-5 text-center">
                <p className="text-sm font-semibold text-brand-slate/65">
                  No meals logged for this date.
                </p>
                <p className="mt-1 text-xs text-brand-slate/45">
                  Tap Add Meal and log by section + time.
                </p>
              </div>
            ) : (
              selectedLogs.map((meal) => (
                <LoggedMealRow
                  key={meal.id}
                  meal={meal}
                  onDelete={removeLogEntry}
                />
              ))
            )}
          </div>
        </Card>

        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">AI Day Verdict</h3>
            <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-pale/70 to-brand-bg p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep">
                <Image src={AiIcon} alt="AI" width={24} height={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-slate/45">
                  Analyze Today
                </p>
                <p className="text-sm font-semibold text-brand-slate">
                  One tap feedback from your real intake
                </p>
              </div>
            </div>

            {coachInsight ? (
              <div className="space-y-2.5">
                <p className="text-sm font-bold text-brand-slate">
                  Score {coachInsight.score}/100 · {coachInsight.verdict}
                </p>
                <ul className="space-y-1.5">
                  {coachInsight.actions.map((action, i) => (
                    <li key={i} className="text-xs text-brand-slate/70">
                      • {action}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-brand-slate/60">
                Run analysis to see if today’s meals support your fitness goal.
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={generateCoachInsight}
                disabled={coachLoading || selectedLogs.length === 0}
                className="rounded-xl px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {coachLoading ? "Analyzing..." : "Analyze My Day"}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAIAssistantOpen(true)}
                className="rounded-xl px-4 py-1.5 text-xs font-bold"
              >
                <Sparkles size={13} />
                AI Chat
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-slate/45">
          Planned Meals
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plannedSections.map((section) => (
            <PlannedMealCard key={section.title} section={section} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">Water Tracker</h3>
            <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/45">
                Weight
              </span>
              <input
                type="number"
                min={30}
                max={220}
                value={weightKg}
                onChange={(e) =>
                  setWeightKg(Math.max(30, Number(e.target.value) || 30))
                }
                className="w-full rounded-lg border border-brand-pale bg-brand-bg px-2.5 py-1.5 text-sm text-brand-slate focus:border-brand-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/45">
                Workout Min
              </span>
              <input
                type="number"
                min={0}
                max={300}
                value={workoutMinutes}
                onChange={(e) =>
                  setWorkoutMinutes(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-lg border border-brand-pale bg-brand-bg px-2.5 py-1.5 text-sm text-brand-slate focus:border-brand-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/45">
                Cup ml
              </span>
              <input
                type="number"
                min={100}
                max={1000}
                step={50}
                value={cupSizeMl}
                onChange={(e) =>
                  setCupSizeMl(Math.max(100, Number(e.target.value) || 100))
                }
                className="w-full rounded-lg border border-brand-pale bg-brand-bg px-2.5 py-1.5 text-sm text-brand-slate focus:border-brand-purple focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: totalCups }).map((_, i) => (
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
            {hydratedMl} / {hydrationGoalMl} ml ({waterCups} / {totalCups} cups)
          </p>
          <p className="mt-1 text-[11px] text-brand-slate/45">
            Goal formula: 35 ml × kg + 12 ml × workout minute
          </p>
        </Card>

        <Card className="p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-slate">
              Plan Compliance Snapshot
            </h3>
            <button className="text-brand-slate/40 hover:text-brand-slate transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-slate/45">
                Daily Adherence
              </p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-brand-pale">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand-deep transition-all"
                  style={{ width: `${Math.min(adherencePct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-brand-slate/60">
                {adherencePct}% of planned calories logged for selected date.
              </p>
            </div>

            {sectionNames.map((name) => {
              const sectionPlan =
                plannedSections
                  .find((s) => s.title === name)
                  ?.items.reduce((acc, item) => acc + item.kcal, 0) || 0;
              const sectionActual = selectedLogs
                .filter((l) => l.section === name)
                .reduce((acc, l) => acc + l.item.kcal, 0);
              const pct = sectionPlan
                ? clamp(Math.round((sectionActual / sectionPlan) * 100), 0, 200)
                : sectionActual > 0
                  ? 100
                  : 0;

              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-slate">
                      {name}
                    </span>
                    <span className="text-brand-slate/55">
                      {sectionActual} / {sectionPlan || "-"} kcal
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-pale">
                    <div
                      className="h-full rounded-full bg-brand-purple/80 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

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
        sections={sectionNames}
        onClose={() => setIsAddMealOpen(false)}
        onAddMeals={handleAddMeals}
      />

      <AIGoalAssistant
        isOpen={isAIAssistantOpen}
        mode="diet"
        onClose={() => setIsAIAssistantOpen(false)}
        onApply={(data) => {
          applyAIMealPlan(data);
          setIsAIAssistantOpen(false);
        }}
      />
    </div>
  );
}
