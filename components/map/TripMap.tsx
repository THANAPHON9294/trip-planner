"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { coloredIcon, DEFAULT_CENTER } from "./leafletSetup";
import { categoryColor } from "../badges";
import type { Place } from "@/lib/types";

function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = places
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [p.lat as number, p.lng as number] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    }
  }, [places, map]);
  return null;
}

export default function TripMap({ places }: { places: Place[] }) {
  const pinned = places.filter((p) => p.lat != null && p.lng != null);
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds places={pinned} />
      {pinned.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat as number, p.lng as number]}
          icon={coloredIcon(categoryColor(p.category))}
        >
          <Popup>
            <div className="min-w-[180px]">
              {p.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="mb-1.5 h-24 w-full rounded-md object-cover"
                />
              )}
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-ink-soft">{p.neighborhood}</p>
              {p.notes && <p className="mt-1 text-xs">{p.notes}</p>}
              {p.google_maps_url && (
                <a
                  href={p.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-river"
                >
                  Open in Google Maps →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
