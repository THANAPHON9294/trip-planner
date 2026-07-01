import L from "leaflet";

// react-leaflet's default marker icons point at bundler-broken relative paths.
// Pin them to the CDN so markers render everywhere.
const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images";

export const defaultIcon = L.icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** A simple colored teardrop pin as an SVG divIcon, tinted per category/desire. */
export function coloredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "tp-pin",
    html: `
      <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 26 14 26s14-16.5 14-26C28 6.27 21.73 0 14 0z"
          fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="5" fill="white"/>
      </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

// Default center: Bangkok, since the spec leans Thai-trip.
export const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
