"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTrip } from "@/components/TripProvider";
import { CATEGORIES, DESIRE_LEVELS } from "@/lib/constants";
import { categoryColor } from "@/components/badges";
import { dayLabel } from "@/lib/days";
import type { Category, DesireLevel, Place } from "@/lib/types";

const TripMap = dynamic(() => import("@/components/map/TripMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-ink-soft">Loading map…</div>,
});

export default function MapPage() {
  const { places, members, days, assignments } = useTrip();

  const [day, setDay] = useState<string>("all"); // "all" | "unplanned" | dayPlanId
  const [person, setPerson] = useState<string>("all");
  const [desire, setDesire] = useState<DesireLevel | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");

  const assignmentByPlace = useMemo(() => {
    const m = new Map<string, string>(); // place_id -> day_plan_id
    assignments.forEach((a) => m.set(a.place_id, a.day_plan_id));
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    return places.filter((p: Place) => {
      if (person !== "all" && p.added_by_member_id !== person) return false;
      if (desire !== "all" && p.desire_level !== desire) return false;
      if (category !== "all" && p.category !== category) return false;
      if (day !== "all") {
        const assigned = assignmentByPlace.get(p.id);
        if (day === "unplanned") {
          if (assigned) return false;
        } else if (assigned !== day) {
          return false;
        }
      }
      return true;
    });
  }, [places, person, desire, category, day, assignmentByPlace]);

  const pinnedCount = filtered.filter((p) => p.lat != null && p.lng != null).length;
  const selectClass =
    "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-river";

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-3 sm:h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="all">All days</option>
          <option value="unplanned">Unplanned</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {dayLabel(d)}
            </option>
          ))}
        </select>
        <select className={selectClass} value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="all">Everyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={desire} onChange={(e) => setDesire(e.target.value as DesireLevel | "all")}>
          <option value="all">Any tier</option>
          {DESIRE_LEVELS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}>
          <option value="all">Any category</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-ink-soft">{pinnedCount} pinned</span>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-line">
        <TripMap places={filtered} />
        {/* Category legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl border border-line bg-paper/90 p-2 text-xs shadow">
          {CATEGORIES.map((c) => (
            <div key={c.value} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(c.value) }} />
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {pinnedCount === 0 && (
        <p className="text-center text-sm text-ink-soft">
          No pinned places match these filters. Add a Google Maps URL or drop a pin when adding a place.
        </p>
      )}
    </div>
  );
}
