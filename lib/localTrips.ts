"use client";

import type { LocalTrip } from "./types";

const KEY = "tp.trips";

export function getLocalTrips(): LocalTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Add or update a trip in this browser's list (dedup by id). Most recent first. */
export function rememberTrip(trip: LocalTrip): void {
  if (typeof window === "undefined") return;
  const existing = getLocalTrips().filter((t) => t.id !== trip.id);
  const next = [trip, ...existing];
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function forgetTrip(id: string): void {
  if (typeof window === "undefined") return;
  const next = getLocalTrips().filter((t) => t.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
