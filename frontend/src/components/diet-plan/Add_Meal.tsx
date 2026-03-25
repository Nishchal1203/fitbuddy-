"use client";

import React, { useMemo, useState } from "react";
import {
  Filter,
  Plus,
  UtensilsCrossed,
  X,
  Search,
  Leaf,
  Drumstick,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  CATEGORIES,
  FOOD_CATALOG,
  RECENT_ITEMS,
  type DietType,
  type FoodCatalogItem,
  type MealItem,
  type FoodCategory,
} from "@/lib/constants";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export type AddMealItem = MealItem;

type DraftMealEntry = {
  item: FoodCatalogItem;
  grams: number;
};

type AddMealModalProps = {
  isOpen: boolean;
  sections: string[];
  onClose: () => void;
  onAddMeals: (section: string, meals: AddMealItem[]) => void;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function VegDot({ type }: { type: "veg" | "non-veg" }) {
  return (
    <span
      title={type === "veg" ? "Vegetarian" : "Non-Vegetarian"}
      className={`inline-block h-2.5 w-2.5 rounded-full border-2 flex-shrink-0 ${
        type === "veg"
          ? "border-green-500 bg-green-400"
          : "border-red-400 bg-red-400"
      }`}
    />
  );
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function Add_Meal({
  isOpen,
  sections,
  onClose,
  onAddMeals,
}: AddMealModalProps) {
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState("Breakfast");
  const [draftEntries, setDraftEntries] = useState<DraftMealEntry[]>([]);
  const [dietFilter, setDietFilter] = useState<DietType>("all");
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory>("All");
  const [showFilters, setShowFilters] = useState(false);

  const sectionOptions =
    sections.length > 0 ? sections : ["Breakfast", "Lunch", "Dinner", "Snacks"];

  /* ── filter + search logic ── */
  const isSearching =
    search.trim().length > 0 ||
    categoryFilter !== "All" ||
    dietFilter !== "all";

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return FOOD_CATALOG.filter((food) => {
      const matchesSearch = !q || food.name.toLowerCase().includes(q);
      const matchesDiet = dietFilter === "all" || food.type === dietFilter;
      const matchesCategory =
        categoryFilter === "All" || food.category === categoryFilter;
      return matchesSearch && matchesDiet && matchesCategory;
    });
  }, [search, dietFilter, categoryFilter]);

  /* Show recent (max 5) when not searching, else show filtered results */
  const displayItems = isSearching ? filteredItems : RECENT_ITEMS.slice(0, 5);

  /* ── macro preview ── */
  const macroTotals = useMemo(() => {
    return draftEntries.reduce(
      (acc, entry) => {
        const r = entry.grams / 100;
        acc.kcal += entry.item.kcalPer100g * r;
        acc.protein += entry.item.proteinPer100g * r;
        acc.carbs += entry.item.carbsPer100g * r;
        acc.fat += entry.item.fatPer100g * r;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [draftEntries]);

  const macroEnergy = {
    protein: macroTotals.protein * 4,
    carbs: macroTotals.carbs * 4,
    fat: macroTotals.fat * 9,
  };
  const totalMacroEnergy = Math.max(
    macroEnergy.protein + macroEnergy.carbs + macroEnergy.fat,
    1,
  );

  /* ── draft helpers ── */
  function addDraftEntry(item: FoodCatalogItem) {
    setDraftEntries((prev) => {
      if (prev.find((e) => e.item.id === item.id)) return prev;
      return [...prev, { item, grams: 100 }];
    });
  }

  function removeDraftEntry(id: string) {
    setDraftEntries((prev) => prev.filter((e) => e.item.id !== id));
  }

  function setDraftGrams(id: string, grams: number) {
    const safe = Number.isFinite(grams) ? Math.max(1, grams) : 1;
    setDraftEntries((prev) =>
      prev.map((e) => (e.item.id === id ? { ...e, grams: safe } : e)),
    );
  }

  function resetModal() {
    setSearch("");
    setDraftEntries([]);
    setDietFilter("all");
    setCategoryFilter("All");
    setShowFilters(false);
    setSelectedSection(sectionOptions[0] || "Breakfast");
    onClose();
  }

  function handleAddMeal() {
    if (draftEntries.length === 0) return;

    const meals: AddMealItem[] = draftEntries.map((entry) => {
      const r = entry.grams / 100;
      const protein = entry.item.proteinPer100g * r;
      const carbs = entry.item.carbsPer100g * r;
      const fat = entry.item.fatPer100g * r;
      const kcal = entry.item.kcalPer100g * r;

      return {
        name: `${entry.item.name} (${entry.grams}g)`,
        kcal: Math.round(kcal),
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
    });

    onAddMeals(selectedSection, meals);
    resetModal();
  }

  /* ── active filter count badge ── */
  const activeFilterCount =
    (dietFilter !== "all" ? 1 : 0) + (categoryFilter !== "All" ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title="Add Meal"
      className="max-w-[540px] bg-brand-bg"
    >
      <div className="space-y-4">
        {/* ── Section selector ── */}
        <div className="flex flex-wrap gap-2">
          {sectionOptions.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setSelectedSection(section)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedSection === section
                  ? "border-brand-purple bg-brand-purple text-white"
                  : "border-brand-pale bg-white text-brand-slate hover:bg-brand-bg"
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* ── Search bar + Filter toggle ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate/45"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food items…"
              className="w-full rounded-xl border border-brand-mauve/60 bg-white py-2.5 pl-9 pr-3 text-sm text-brand-slate placeholder:text-brand-slate/45 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate/40 hover:text-brand-slate"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border transition ${
              showFilters || activeFilterCount > 0
                ? "border-brand-purple bg-brand-purple text-white"
                : "border-brand-pale bg-white text-brand-slate hover:bg-brand-bg"
            }`}
          >
            <Filter size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter panel (collapsible) ── */}
        {showFilters && (
          <div className="space-y-3 rounded-2xl border border-brand-pale bg-white p-4">
            {/* Diet type */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-slate/55">
                Diet Type
              </p>
              <div className="flex gap-2">
                {(["all", "veg", "non-veg"] as DietType[]).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setDietFilter(dt)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      dietFilter === dt
                        ? dt === "veg"
                          ? "border-green-400 bg-green-50 text-green-700"
                          : dt === "non-veg"
                            ? "border-red-400 bg-red-50 text-red-600"
                            : "border-brand-purple bg-brand-purple text-white"
                        : "border-brand-pale bg-brand-bg text-brand-slate hover:border-brand-mauve"
                    }`}
                  >
                    {dt === "veg" && <Leaf size={11} />}
                    {dt === "non-veg" && <Drumstick size={11} />}
                    {dt === "all"
                      ? "All"
                      : dt === "veg"
                        ? "Vegetarian"
                        : "Non-Veg"}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-slate/55">
                Category
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                      categoryFilter === cat
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-brand-pale bg-brand-bg text-brand-slate hover:border-brand-mauve"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDietFilter("all");
                  setCategoryFilter("All");
                }}
                className="text-xs font-semibold text-brand-purple hover:text-brand-deep"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Food list ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-slate/55">
              {isSearching
                ? `${filteredItems.length} result${filteredItems.length !== 1 ? "s" : ""}`
                : "Recent Items"}
            </p>
            {isSearching && filteredItems.length === 0 && (
              <span className="text-xs text-brand-slate/40">
                No matches found
              </span>
            )}
          </div>

          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-medium text-brand-slate/60">
                  No food items found
                </p>
                <p className="text-xs text-brand-slate/40">
                  Try a different search or filter
                </p>
              </div>
            ) : (
              displayItems.map((item) => {
                const draft = draftEntries.find((e) => e.item.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                      draft
                        ? "border-brand-mauve bg-white shadow-sm"
                        : "border-transparent bg-white/80 hover:border-brand-pale hover:bg-white"
                    }`}
                  >
                    {/* Left: emoji + info */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-goldLight/40 to-brand-soft/30 text-lg">
                        {item.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <VegDot type={item.type} />
                          <p className="truncate text-sm font-semibold text-brand-slate">
                            {item.name}
                          </p>
                        </div>
                        <p className="text-xs text-brand-slate/55">
                          {item.kcalPer100g} kcal · {item.category}
                        </p>
                      </div>
                    </div>

                    {/* Right: grams input or add button */}
                    {draft ? (
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={draft.grams}
                          onChange={(e) =>
                            setDraftGrams(item.id, Number(e.target.value))
                          }
                          className="w-16 rounded-lg border border-brand-pale bg-brand-bg px-2 py-1 text-right text-sm font-semibold text-brand-slate focus:border-brand-purple focus:outline-none"
                        />
                        <span className="text-xs font-semibold text-brand-slate/60">
                          g
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDraftEntry(item.id)}
                          className="rounded-full p-1 text-brand-slate/45 hover:bg-brand-pale hover:text-brand-deep"
                          aria-label={`Remove ${item.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addDraftEntry(item)}
                        className="flex-shrink-0 rounded-full p-1 text-brand-slate/45 hover:bg-brand-pale hover:text-brand-deep"
                        aria-label={`Add ${item.name}`}
                      >
                        <Plus size={17} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Draft basket (selected items summary) ── */}
        {draftEntries.length > 0 && (
          <div className="rounded-xl border border-brand-pale bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-brand-slate">
                Macro Preview
                <span className="ml-2 rounded-full bg-brand-purple px-2 py-0.5 text-[10px] text-white">
                  {draftEntries.length} item{draftEntries.length > 1 ? "s" : ""}
                </span>
              </p>
              <p className="text-sm font-semibold text-brand-slate/65">
                {Math.round(macroTotals.kcal)} Kcal
              </p>
            </div>

            {/* Stacked macro bar */}
            <div className="h-3 overflow-hidden rounded-full bg-brand-pale">
              <div className="flex h-full w-full">
                <div
                  className="bg-brand-purple transition-all"
                  style={{
                    width: `${(macroEnergy.protein / totalMacroEnergy) * 100}%`,
                  }}
                />
                <div
                  className="bg-brand-gold transition-all"
                  style={{
                    width: `${(macroEnergy.carbs / totalMacroEnergy) * 100}%`,
                  }}
                />
                <div
                  className="bg-brand-mauve transition-all"
                  style={{
                    width: `${(macroEnergy.fat / totalMacroEnergy) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-semibold text-brand-slate/65">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-purple" />
                {macroTotals.protein.toFixed(1)}g PROT
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-gold" />
                {macroTotals.carbs.toFixed(1)}g CARB
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-mauve" />
                {macroTotals.fat.toFixed(1)}g FAT
              </span>
            </div>

            {/* Selected items chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {draftEntries.map((e) => (
                <span
                  key={e.item.id}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-pale bg-brand-bg px-2 py-0.5 text-[11px] font-semibold text-brand-slate"
                >
                  {e.item.emoji} {e.item.name} · {e.grams}g
                  <button
                    onClick={() => removeDraftEntry(e.item.id)}
                    className="ml-0.5 text-brand-slate/40 hover:text-brand-deep"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Add Meal CTA ── */}
        <Button
          variant="gold"
          size="lg"
          onClick={handleAddMeal}
          disabled={draftEntries.length === 0}
          className="w-full rounded-2xl text-base font-bold text-white disabled:opacity-50"
        >
          <UtensilsCrossed size={18} />
          Add to {selectedSection}
        </Button>
      </div>
    </Modal>
  );
}
