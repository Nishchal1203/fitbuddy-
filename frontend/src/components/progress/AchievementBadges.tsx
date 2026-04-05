"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Lock,
  Trophy,
  Star,
  Zap,
  Flame,
  Target,
  Dumbbell,
  Heart,
  Moon,
  Droplets,
  Award,
  Medal,
} from "lucide-react";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

type BadgeCategory =
  | "All"
  | "Fitness"
  | "Nutrition"
  | "Sleep"
  | "Streak"
  | "Milestones";

type Badge = {
  id: string;
  title: string;
  description: string;
  category: Exclude<BadgeCategory, "All">;
  unlocked: boolean;
  unlocked_at?: string;
  progress?: number;
  icon_key: BadgeIconKey;
  rarity: "common" | "rare" | "epic" | "legendary";
};

type BadgeIconKey =
  | "trophy"
  | "star"
  | "zap"
  | "flame"
  | "target"
  | "dumbbell"
  | "heart"
  | "moon"
  | "droplets"
  | "award"
  | "medal";

const ICON_MAP: Record<BadgeIconKey, React.ReactNode> = {
  trophy: <Trophy size={20} />,
  star: <Star size={20} />,
  zap: <Zap size={20} />,
  flame: <Flame size={20} />,
  target: <Target size={20} />,
  dumbbell: <Dumbbell size={20} />,
  heart: <Heart size={20} />,
  moon: <Moon size={20} />,
  droplets: <Droplets size={20} />,
  award: <Award size={20} />,
  medal: <Medal size={20} />,
};

const RARITY_STYLES: Record<
  Badge["rarity"],
  { ring: string; bg: string; icon: string; label: string; labelColor: string }
> = {
  common: {
    ring: "ring-brand-mauve/60",
    bg: "bg-gradient-to-br from-brand-pale to-[#E9D3F2]",
    icon: "bg-gradient-to-br from-brand-soft to-brand-purple text-white",
    label: "Common",
    labelColor: "text-brand-slate/50",
  },
  rare: {
    ring: "ring-brand-purple",
    bg: "bg-gradient-to-br from-[#F0E4F9] to-[#E0C8F5]",
    icon: "bg-gradient-to-br from-brand-purple to-brand-deep text-white",
    label: "Rare",
    labelColor: "text-brand-purple",
  },
  epic: {
    ring: "ring-brand-gold",
    bg: "bg-gradient-to-br from-[#FFF5DC] to-[#FFE89A]",
    icon: "bg-gradient-to-br from-brand-gold to-[#e6a800] text-white",
    label: "Epic",
    labelColor: "text-[#b07d00]",
  },
  legendary: {
    ring: "ring-[#EF4444]",
    bg: "bg-gradient-to-br from-[#FFF0F0] to-[#FDDADA]",
    icon: "bg-gradient-to-br from-[#F97316] to-[#EF4444] text-white",
    label: "Legendary",
    labelColor: "text-[#EF4444]",
  },
};

const CATEGORIES: BadgeCategory[] = [
  "All",
  "Fitness",
  "Nutrition",
  "Sleep",
  "Streak",
  "Milestones",
];

const ICON_KEYS = new Set<string>([
  "trophy",
  "star",
  "zap",
  "flame",
  "target",
  "dumbbell",
  "heart",
  "moon",
  "droplets",
  "award",
  "medal",
]);

const RARITIES = new Set<string>(["common", "rare", "epic", "legendary"]);

const CATEGORIES_EXCEPT_ALL = new Set<string>([
  "Fitness",
  "Nutrition",
  "Sleep",
  "Streak",
  "Milestones",
]);

function parseBadges(json: unknown): Badge[] {
  if (!Array.isArray(json)) return [];
  const out: Badge[] = [];
  for (const row of json) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : String(r.id ?? "");
    const title = typeof r.title === "string" ? r.title : "";
    const description = typeof r.description === "string" ? r.description : "";
    const cat = typeof r.category === "string" ? r.category : "Milestones";
    const category = CATEGORIES_EXCEPT_ALL.has(cat)
      ? (cat as Badge["category"])
      : "Milestones";
    const icon_key = ICON_KEYS.has(String(r.icon_key))
      ? (r.icon_key as BadgeIconKey)
      : "trophy";
    const rarity = RARITIES.has(String(r.rarity))
      ? (r.rarity as Badge["rarity"])
      : "common";
    const unlocked = Boolean(r.unlocked);
    const unlocked_at =
      typeof r.unlocked_at === "string" ? r.unlocked_at : undefined;
    const progress = typeof r.progress === "number" ? r.progress : undefined;
    if (!id || !title) continue;
    out.push({
      id,
      title,
      description,
      category,
      unlocked,
      unlocked_at,
      progress,
      icon_key,
      rarity,
    });
  }
  return out;
}

function formatUnlockDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BadgeCard({ badge }: { badge: Badge }) {
  const styles = RARITY_STYLES[badge.rarity];
  const isUnlocked = badge.unlocked;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl p-4 ring-2 transition-transform hover:scale-[1.02] ${
        isUnlocked
          ? `${styles.ring} ${styles.bg} shadow-[0_4px_16px_-4px_#9567B930]`
          : "ring-brand-pale bg-white opacity-70"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            isUnlocked ? styles.labelColor : "text-brand-slate/30"
          }`}
        >
          {styles.label}
        </span>
        {isUnlocked && (
          <span className="text-[10px] font-semibold text-brand-slate/45">
            ✓ Unlocked
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${
            isUnlocked ? styles.icon : "bg-brand-pale text-brand-slate/30"
          }`}
        >
          {isUnlocked ? ICON_MAP[badge.icon_key] : <Lock size={18} />}
        </div>

        <div className="min-w-0">
          <p
            className={`truncate text-sm font-bold ${
              isUnlocked ? "text-brand-slate" : "text-brand-slate/40"
            }`}
          >
            {badge.title}
          </p>
          <p
            className={`mt-0.5 text-[11px] leading-snug ${
              isUnlocked ? "text-brand-slate/60" : "text-brand-slate/30"
            }`}
          >
            {badge.description}
          </p>
        </div>
      </div>

      {isUnlocked && badge.unlocked_at ? (
        <p className="text-[10px] text-brand-slate/45">
          🏅 {formatUnlockDate(badge.unlocked_at)}
        </p>
      ) : !isUnlocked && badge.progress !== undefined ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-brand-slate/40">
            <span>Progress</span>
            <span className="font-semibold">{badge.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-pale">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand-deep transition-all duration-700"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BadgeSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 ring-2 ring-brand-pale">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-brand-pale" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded bg-brand-pale" />
          <div className="h-2.5 w-full rounded bg-brand-pale" />
        </div>
      </div>
      <div className="h-2 rounded-full bg-brand-pale" />
    </div>
  );
}

export default function AchievementBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>("All");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/achievements`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Could not load achievements"));
        setBadges([]);
        return;
      }
      const data = await res.json();
      setBadges(parseBadges(data));
    } catch {
      setError("Network error while loading achievements");
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

  const filtered = badges
    .filter((b) => activeCategory === "All" || b.category === activeCategory)
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    });

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_#9567B920]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand-slate">Achievements</h2>
          <p className="mt-0.5 text-xs text-brand-slate/50">
            Unlocked achievements from your account
          </p>
        </div>

        {!loading && !error && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-bg px-3 py-1.5">
            <Trophy size={13} className="text-brand-gold" />
            <span className="text-xs font-bold text-brand-slate">
              {totalCount === 0 ? (
                "No achievements yet"
              ) : (
                <>
                  {unlockedCount}
                  <span className="font-normal text-brand-slate/50">
                    {" "}
                    / {totalCount} unlocked
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {loading ? null : error ? (
        <div className="mb-4 flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-brand-slate">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && totalCount > 0 && (
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-pale">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand-deep transition-all duration-700"
              style={{
                width: `${(unlockedCount / totalCount) * 100}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-right text-[10px] text-brand-slate/40">
            {Math.round((unlockedCount / totalCount) * 100)}% complete
          </p>
        </div>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeCategory === cat
                  ? "border-brand-purple bg-brand-purple text-white"
                  : "border-brand-pale bg-brand-bg text-brand-slate hover:border-brand-mauve"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => <BadgeSkeleton key={i} />)
        ) : error ? null : totalCount === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">🏅</span>
            <p className="font-semibold text-brand-slate">
              No achievements unlocked yet
            </p>
            <p className="max-w-sm text-xs text-brand-slate/45">
              When your account earns badges (for example from workouts, goals,
              or streaks), they will show up here automatically.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">🏅</span>
            <p className="font-semibold text-brand-slate">
              No {activeCategory} badges yet
            </p>
            <p className="text-xs text-brand-slate/45">
              Try another category or keep training to unlock more.
            </p>
          </div>
        ) : (
          filtered.map((badge) => <BadgeCard key={badge.id} badge={badge} />)
        )}
      </div>

      {!loading && !error && totalCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-brand-pale pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate/40">
            Rarity
          </span>
          {(
            Object.entries(RARITY_STYLES) as [
              Badge["rarity"],
              (typeof RARITY_STYLES)[keyof typeof RARITY_STYLES],
            ][]
          ).map(([key, val]) => (
            <span
              key={key}
              className={`text-[10px] font-bold ${val.labelColor}`}
            >
              ● {val.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
