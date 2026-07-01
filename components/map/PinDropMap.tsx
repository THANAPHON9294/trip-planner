"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { defaultIcon, DEFAULT_CENTER } from "./leafletSetup";
import type { LatLng } from "@/lib/mapsUrl";

function ClickCatcher({ onPick }: { onPick: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PinDropMap({
  value,
  onPick,
}: {
  value: LatLng | null;
  onPick: (ll: LatLng) => void;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
  return (
    <MapContainer
      center={center}
      zoom={value ? 15 : 11}
      style={{ height: "320px", width: "100%", borderRadius: "0.75rem" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onPick={onPick} />
      {value && <Marker position={[value.lat, value.lng]} icon={defaultIcon} />}
    </MapContainer>
  );
}
