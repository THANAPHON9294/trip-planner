import { NextRequest, NextResponse } from "next/server";
import { parseLatLng } from "@/lib/mapsUrl";

export const runtime = "nodejs";

/**
 * Resolves a Google Maps short link (maps.app.goo.gl / goo.gl/maps) by following
 * the redirect server-side, then parses lat/lng from the resolved URL.
 * GET /api/resolve-maps?url=...
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }

  try {
    // `redirect: manual` lets us read the Location header without auto-following,
    // but fetch following the chain is simpler and gives us the final URL.
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        // A desktop UA tends to yield a URL with @lat,lng or !3d/!4d coords.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });
    const resolved = res.url || target.toString();
    const coords = parseLatLng(resolved);
    return NextResponse.json({ resolved, coords });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch failed" },
      { status: 502 },
    );
  }
}
