export interface LatLng {
  lat: number;
  lng: number;
}

const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl"];

/** True for Google short links that need a server-side redirect resolve. */
export function isShortMapsLink(url: string): boolean {
  try {
    const u = new URL(url);
    return SHORT_LINK_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

function valid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/**
 * Parse `lat,lng` out of a (already-resolved) Google Maps URL.
 * Handles: `@lat,lng,zoom`, `?q=lat,lng`, `?ll=lat,lng`,
 * `!3dLAT!4dLNG`, and `/place/.../data=...!3dLAT!4dLNG`.
 */
export function parseLatLng(url: string): LatLng | null {
  if (!url) return null;

  // Order matters: most accurate (the actual pin) first.
  // `@lat,lng` is only the *viewport center* and is usually offset from the
  // real place, so it's the last resort — not the first.

  // 1. !3dLAT!4dLNG — the exact placed-pin coords embedded in the data param.
  const bang = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang) {
    const lat = parseFloat(bang[1]);
    const lng = parseFloat(bang[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  // 2. ?q=lat,lng / ?ll= / ?query= / ?destination= — explicit place coords.
  try {
    const u = new URL(url);
    for (const key of ["q", "query", "ll", "destination"]) {
      const v = u.searchParams.get(key);
      if (v) {
        const m = v.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (m) {
          const lat = parseFloat(m[1]);
          const lng = parseFloat(m[2]);
          if (valid(lat, lng)) return { lat, lng };
        }
      }
    }
  } catch {
    // not a parseable URL; fall through
  }

  // 3. @lat,lng,zoom — viewport center. Approximate; used only if nothing
  //    better was found above.
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  return null;
}

/**
 * Best-effort: parse coords directly; if it's a short link, ask the server to
 * resolve the redirect first. Returns null if coords can't be determined.
 */
export async function resolveCoords(url: string): Promise<LatLng | null> {
  if (!url) return null;
  const direct = parseLatLng(url);
  if (direct) return direct;
  if (isShortMapsLink(url)) {
    try {
      const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { coords: LatLng | null };
      return data.coords ?? null;
    } catch {
      return null;
    }
  }
  return null;
}
