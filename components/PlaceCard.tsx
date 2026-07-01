"use client";

import { useState } from "react";
import Image from "next/image";
import type { Place, TripMember } from "@/lib/types";
import { desireMeta } from "@/lib/constants";
import { CategoryBadge, DesireBadge } from "./badges";
import { Lightbox } from "./Lightbox";

export function PlaceCard({
  place,
  members,
  onEdit,
  compact = false,
  dragHandle,
}: {
  place: Place;
  members: TripMember[];
  onEdit?: (place: Place) => void;
  compact?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const addedBy = members.find((m) => m.id === place.added_by_member_id)?.name;
  const accent = desireMeta(place.desire_level).colorVar;
  const [lightbox, setLightbox] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-line bg-white shadow-sm"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      {place.photo_url && !compact && (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group/photo relative block h-28 w-full cursor-zoom-in bg-line"
          aria-label="View full photo"
        >
          <Image
            src={place.photo_url}
            alt={place.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-ink/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover/photo:opacity-100">
            ⤢ View
          </span>
        </button>
      )}
      {place.photo_url && lightbox && (
        <Lightbox src={place.photo_url} alt={place.name} onClose={() => setLightbox(false)} />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-base font-semibold leading-tight">{place.name}</h3>
          {dragHandle}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">📍 {place.neighborhood}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <DesireBadge level={place.desire_level} />
          <CategoryBadge place={place} />
          {place.lat != null && place.lng != null && (
            <span className="inline-flex items-center rounded-full bg-mint-soft px-2 py-0.5 text-xs font-medium text-mint">
              pinned
            </span>
          )}
        </div>

        {place.notes && !compact && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{place.notes}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-soft">{addedBy ? `by ${addedBy}` : " "}</span>
          {onEdit && (
            <button
              onClick={() => onEdit(place)}
              className="text-xs font-medium text-river opacity-0 transition group-hover:opacity-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
