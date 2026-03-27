"use client";

import React from "react";
import { Button } from "@/components/ui";
import type { GoalCategory } from "./types";

type GoalCategoryFilterProps = {
  categories: GoalCategory[];
  activeCategory: GoalCategory;
  onChange: (category: GoalCategory) => void;
};

export default function GoalCategoryFilter({
  categories,
  activeCategory,
  onChange,
}: GoalCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const isActive = activeCategory === category;

        return (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={isActive ? "primary" : "outline"}
            onClick={() => onChange(category)}
            className={
              isActive
                ? "rounded-full px-4 py-1.5 text-sm"
                : "rounded-full px-4 py-1.5 text-sm"
            }
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
}
