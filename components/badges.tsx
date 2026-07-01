"use client";

import { categoryMeta, desireMeta } from "@/lib/constants";
import type { Category, DesireLevel, Place } from "@/lib/types";

export function DesireBadge({ level }: { level: DesireLevel }) {
  const m = desireMeta(level);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: m.tintVar, color: m.colorVar }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.colorVar }} />
      {m.label}
    </span>
  );
}

export function CategoryBadge({ place }: { place: Pick<Place, "category" | "category_other"> }) {
  const m = categoryMeta(place.category);
  const label = place.category === "other" && place.category_other ? place.category_other : m.label;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-river-soft px-2 py-0.5 text-xs font-medium text-river">
      <span>{m.emoji}</span>
      {label}
    </span>
  );
}

export function categoryColor(category: Category): string {
  switch (category) {
    case "cafe":
      return "#8B5E3C";
    case "food":
      return "#E2574C";
    case "attraction":
      return "#2F6BE3";
    case "shopping":
      return "#A347C9";
    default:
      return "#5C6378";
  }
}
