import type { Category, DesireLevel } from "./types";

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: "cafe", label: "Cafe", emoji: "☕" },
  { value: "food", label: "Food", emoji: "🍜" },
  { value: "attraction", label: "Attraction", emoji: "📸" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "other", label: "Other", emoji: "📍" },
];

export const DESIRE_LEVELS: {
  value: DesireLevel;
  label: string;
  colorVar: string;
  tintVar: string;
}[] = [
  { value: "must_go", label: "Must go", colorVar: "var(--coral)", tintVar: "var(--coral-soft)" },
  { value: "would_like", label: "Would like", colorVar: "var(--gold)", tintVar: "#FCEFD6" },
  { value: "if_time", label: "If time", colorVar: "var(--mint)", tintVar: "var(--mint-soft)" },
];

export function categoryMeta(value: Category) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function desireMeta(value: DesireLevel) {
  return DESIRE_LEVELS.find((d) => d.value === value) ?? DESIRE_LEVELS[0];
}
