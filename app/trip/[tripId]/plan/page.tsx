"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTrip } from "@/components/TripProvider";
import { SortablePlace } from "@/components/plan/SortablePlace";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui";
import { dayLabel } from "@/lib/days";
import {
  unassignPlace,
  persistDayOrder,
  updateAssignment,
  addDayPlan,
  removeDayPlan,
} from "@/lib/api";
import type { Place } from "@/lib/types";

const UNPLANNED = "unplanned";

export default function PlanPage() {
  const { trip, places, members, days, assignments, reload } = useTrip();

  const placeById = useMemo(() => {
    const m = new Map<string, Place>();
    places.forEach((p) => m.set(p.id, p));
    return m;
  }, [places]);

  const timeByPlace = useMemo(() => {
    const m = new Map<string, string | null>();
    assignments.forEach((a) => m.set(a.place_id, a.time));
    return m;
  }, [assignments]);

  // containerId -> ordered placeIds
  const buildItems = useCallback((): Record<string, string[]> => {
    const out: Record<string, string[]> = { [UNPLANNED]: [] };
    days.forEach((d) => (out[d.id] = []));
    const assignedDay = new Map<string, string>();
    const sortOf = new Map<string, number>();
    assignments.forEach((a) => {
      assignedDay.set(a.place_id, a.day_plan_id);
      sortOf.set(a.place_id, a.sort_order);
    });
    for (const p of places) {
      const dayId = assignedDay.get(p.id);
      if (dayId && out[dayId]) out[dayId].push(p.id);
      else out[UNPLANNED].push(p.id);
    }
    // order day columns by sort_order; unplanned by created_at (places already sorted)
    for (const d of days) {
      out[d.id].sort((a, b) => (sortOf.get(a) ?? 0) - (sortOf.get(b) ?? 0));
    }
    return out;
  }, [places, days, assignments]);

  const [items, setItems] = useState<Record<string, string[]>>(buildItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragging = useRef(false);

  // Re-sync from server data when not mid-drag.
  useEffect(() => {
    if (!dragging.current) setItems(buildItems());
  }, [buildItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in items) return id; // id is a container
      return Object.keys(items).find((c) => items[c].includes(id));
    },
    [items],
  );

  function onDragStart(e: DragStartEvent) {
    dragging.current = true;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setItems((prev) => {
      const activeItems = prev[activeC];
      const overItems = prev[overC];
      const activeIndex = activeItems.indexOf(String(active.id));
      const overIndex = overItems.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeC]: activeItems.filter((id) => id !== String(active.id)),
        [overC]: [...overItems.slice(0, insertAt), String(active.id), ...overItems.slice(insertAt)],
      };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    const movedId = String(active.id);
    if (!over) {
      dragging.current = false;
      setItems(buildItems());
      return;
    }

    const activeC = findContainer(movedId);
    const overC = findContainer(String(over.id));
    if (!activeC || !overC) {
      dragging.current = false;
      return;
    }

    // Reorder within the destination container.
    let next = items;
    if (activeC === overC) {
      const list = items[activeC];
      const from = list.indexOf(movedId);
      const to = list.indexOf(String(over.id));
      if (from !== to && to >= 0) {
        next = { ...items, [activeC]: arrayMove(list, from, to) };
        setItems(next);
      }
    }

    // Persist.
    try {
      if (overC === UNPLANNED) {
        await unassignPlace(movedId);
      }
      const touched = activeC === overC ? [activeC] : [activeC, overC];
      for (const cid of touched) {
        if (cid === UNPLANNED) continue;
        const ids = next[cid] ?? [];
        await persistDayOrder(
          ids.map((pid, i) => ({ place_id: pid, day_plan_id: cid, sort_order: i })),
        );
      }
    } catch {
      // realtime reload will reconcile; rebuild from server as fallback
    } finally {
      dragging.current = false;
      reload();
    }
  }

  async function handleTimeChange(placeId: string, value: string) {
    try {
      await updateAssignment(placeId, { time: value || null });
    } catch {
      /* ignore */
    }
  }

  async function handleRemoveFromDay(placeId: string) {
    setItems((prev) => {
      const fromC = Object.keys(prev).find((c) => c !== UNPLANNED && prev[c].includes(placeId));
      if (!fromC) return prev;
      return {
        ...prev,
        [fromC]: prev[fromC].filter((id) => id !== placeId),
        [UNPLANNED]: [placeId, ...prev[UNPLANNED]],
      };
    });
    try {
      await unassignPlace(placeId);
    } finally {
      reload();
    }
  }

  async function handleAddDay() {
    const nextNum = (days[days.length - 1]?.day_number ?? 0) + 1;
    await addDayPlan(trip!.id, nextNum, null);
    reload();
  }

  async function handleRemoveDay(dayId: string) {
    if (!window.confirm("Remove this day? Places in it move back to Unplanned.")) return;
    // Unassign places first so they return to the pool, then delete the day.
    const ids = items[dayId] ?? [];
    for (const pid of ids) await unassignPlace(pid);
    await removeDayPlan(dayId);
    reload();
  }

  const hasDates = !!(trip!.start_date && trip!.end_date);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Day plan</h2>
          <p className="text-sm text-ink-soft">Drag places from Unplanned into a day. Reorder by dragging.</p>
        </div>
        {!hasDates && <Button variant="outline" onClick={handleAddDay}>+ Add day</Button>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Unplanned pool */}
          <Column id={UNPLANNED} title="Unplanned" count={items[UNPLANNED]?.length ?? 0} tint="var(--river-soft)">
            <SortableContext items={items[UNPLANNED] ?? []} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {(items[UNPLANNED] ?? []).map((pid) => {
                  const p = placeById.get(pid);
                  if (!p) return null;
                  return <SortablePlace key={pid} place={p} members={members} />;
                })}
                {(items[UNPLANNED]?.length ?? 0) === 0 && <EmptyHint text="Everything's planned 🎉" />}
              </div>
            </SortableContext>
          </Column>

          {/* Day columns */}
          {days.map((d) => (
            <Column
              key={d.id}
              id={d.id}
              title={dayLabel(d)}
              count={items[d.id]?.length ?? 0}
              tint="white"
              onRemove={!hasDates ? () => handleRemoveDay(d.id) : undefined}
            >
              <SortableContext items={items[d.id] ?? []} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {(items[d.id] ?? []).map((pid) => {
                    const p = placeById.get(pid);
                    if (!p) return null;
                    return (
                      <SortablePlace
                        key={pid}
                        place={p}
                        members={members}
                        time={timeByPlace.get(pid)}
                        onTimeChange={(v) => handleTimeChange(pid, v)}
                        onRemove={() => handleRemoveFromDay(pid)}
                      />
                    );
                  })}
                  {(items[d.id]?.length ?? 0) === 0 && <EmptyHint text="Drop places here" />}
                </div>
              </SortableContext>
            </Column>
          ))}
        </div>

        <DragOverlay>
          {activeId && placeById.get(activeId) ? (
            <PlaceCard place={placeById.get(activeId)!} members={[]} compact />
          ) : null}
        </DragOverlay>
      </DndContext>

      {days.length === 0 && hasDates && (
        <p className="text-sm text-ink-soft">Generating days from your trip dates…</p>
      )}
    </div>
  );
}

function Column({
  id,
  title,
  count,
  tint,
  onRemove,
  children,
}: {
  id: string;
  title: string;
  count: number;
  tint: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className="w-72 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink-soft">{count}</span>
          {onRemove && (
            <button onClick={onRemove} className="text-xs text-ink-soft hover:text-coral" aria-label="Remove day">
              ✕
            </button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className="min-h-[120px] rounded-2xl border border-line p-2 transition"
        style={{ background: tint, outline: isOver ? "2px solid var(--river)" : "none" }}
      >
        {children}
      </div>
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-8 text-center text-xs text-ink-soft">
      {text}
    </div>
  );
}
