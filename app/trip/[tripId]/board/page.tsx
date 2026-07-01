"use client";

import { useMemo, useState } from "react";
import { useTrip } from "@/components/TripProvider";
import { PlaceCard } from "@/components/PlaceCard";
import { PlaceFormModal } from "@/components/PlaceFormModal";
import { Button, EmptyState } from "@/components/ui";
import { desireMeta, categoryMeta, CATEGORIES } from "@/lib/constants";
import type { Place } from "@/lib/types";

type GroupMode = "neighborhood" | "person" | "desire" | "category";

const DESIRE_ORDER = ["must_go", "would_like", "if_time"] as const;
const CATEGORY_ORDER = CATEGORIES.map((c) => c.value);

export default function BoardPage() {
  const { trip, places, members, reload } = useTrip();
  const [mode, setMode] = useState<GroupMode>("neighborhood");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Place[]>();
    const keyFor = (p: Place): string => {
      if (mode === "neighborhood") return p.neighborhood || "Unspecified";
      if (mode === "person")
        return members.find((m) => m.id === p.added_by_member_id)?.name ?? "Unassigned";
      if (mode === "category") {
        const m = categoryMeta(p.category);
        const label = p.category === "other" && p.category_other ? p.category_other : m.label;
        return `${m.emoji} ${label}`;
      }
      return desireMeta(p.desire_level).label;
    };
    for (const p of places) {
      const k = keyFor(p);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    const entries = Array.from(map.entries());
    if (mode === "desire") {
      const rank = (label: string) =>
        DESIRE_ORDER.findIndex((d) => desireMeta(d).label === label);
      entries.sort((a, b) => rank(a[0]) - rank(b[0]));
    } else if (mode === "category") {
      const rank = (label: string) =>
        CATEGORY_ORDER.findIndex((c) => label.startsWith(categoryMeta(c).emoji));
      entries.sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [places, members, mode]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => p.neighborhood && set.add(p.neighborhood));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [places]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Place) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="inline-flex rounded-xl border border-line bg-white p-1">
            {(["neighborhood", "person", "desire", "category"] as GroupMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  mode === m ? "bg-river text-white" : "text-ink-soft hover:bg-black/5"
                }`}
              >
                {m === "neighborhood" ? "Neighborhood" : m}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={openNew} className="shrink-0 whitespace-nowrap">
          <span className="sm:hidden">+ Add</span>
          <span className="hidden sm:inline">+ Add place</span>
        </Button>
      </div>

      {places.length === 0 ? (
        <EmptyState
          title="No places yet"
          subtitle="Add the spots everyone wants to hit. They'll show up here grouped, on the map, and ready to drag into your day plan."
          action={<Button onClick={openNew}>+ Add the first place</Button>}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {groups.map(([groupKey, items]) => (
            <section key={groupKey} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  {groupKey}
                </h2>
                <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink-soft">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <PlaceCard key={p.id} place={p} members={members} onEdit={openEdit} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PlaceFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          reload();
        }}
        tripId={trip!.id}
        members={members}
        neighborhoods={neighborhoods}
        onMembersChange={reload}
        editing={editing}
      />
    </div>
  );
}
