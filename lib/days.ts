import type { DayPlan, Trip } from "./types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Aug 1" from an ISO date string (date-only, no timezone shift). */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Day 1 · Aug 1" or "Day 1" depending on whether the day has a date. */
export function dayLabel(day: DayPlan): string {
  if (day.date) return `Day ${day.day_number} · ${formatShortDate(day.date)}`;
  return `Day ${day.day_number}`;
}

/** Inclusive list of ISO date strings between start and end. */
export function datesBetween(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  const cur = new Date(start);
  // Guard against runaway loops on bad input.
  for (let i = 0; i < 366 && cur <= end; i++) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * The day_plans a trip *should* have based on its dates.
 * Returns the desired (day_number, date) pairs; the caller reconciles
 * these against what's already in the DB.
 */
export function desiredDatedDays(trip: Trip): { day_number: number; date: string }[] {
  if (!trip.start_date || !trip.end_date) return [];
  return datesBetween(trip.start_date, trip.end_date).map((date, i) => ({
    day_number: i + 1,
    date,
  }));
}
