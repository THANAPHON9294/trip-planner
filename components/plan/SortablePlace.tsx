"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Place, TripMember } from "@/lib/types";
import { DesireBadge, CategoryBadge } from "@/components/badges";
import { desireMeta } from "@/lib/constants";

export function SortablePlace({
  place,
  members,
  time,
  onTimeChange,
  onRemove,
}: {
  place: Place;
  members: TripMember[];
  time?: string | null;
  onTimeChange?: (value: string) => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeft: `4px solid ${desireMeta(place.desire_level).colorVar}`,
  };
  const addedBy = members.find((m) => m.id === place.added_by_member_id)?.name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-line bg-white p-2.5 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="dnd-grab mt-0.5 select-none text-ink-soft"
          aria-label="Drag"
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold leading-tight">{place.name}</p>
          <p className="truncate text-xs text-ink-soft">📍 {place.neighborhood}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <DesireBadge level={place.desire_level} />
            <CategoryBadge place={place} />
          </div>
          {onTimeChange && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={time ?? ""}
                onChange={(e) => onTimeChange(e.target.value)}
                placeholder="HH:MM"
                className="w-20 rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-river"
              />
              {addedBy && <span className="text-xs text-ink-soft">by {addedBy}</span>}
              {onRemove && (
                <button onClick={onRemove} className="ml-auto text-xs text-ink-soft hover:text-coral">
                  remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
