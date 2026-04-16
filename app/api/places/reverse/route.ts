import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { buildPhotonReverseUrl, isInBengaluruBbox, parsePhotonReverseLabel } from "@/lib/places/photon";

const USER_AGENT = "TenantTurmoil/1.0 (reverse geocode; contact via repo)";

const REVERSE_CACHE_SECONDS = 86_400;

function parseCoord(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

async function photonReverseLabel(latitude: number, longitude: number): Promise<string | null> {
  const url = buildPhotonReverseUrl(latitude, longitude);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  return parsePhotonReverseLabel(body);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoord(searchParams.get("lat"));
  const lon = parseCoord(searchParams.get("lon"));

  if (lat === null || lon === null) {
    return NextResponse.json({ error: "Invalid lat or lon." }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordinates out of range." }, { status: 400 });
  }

  if (!isInBengaluruBbox(lat, lon)) {
    return NextResponse.json({ error: "Location must be within Bengaluru." }, { status: 400 });
  }

  const latKey = lat.toFixed(5);
  const lonKey = lon.toFixed(5);

  const label = await unstable_cache(
    async () => photonReverseLabel(lat, lon),
    ["photon-reverse", latKey, lonKey],
    { revalidate: REVERSE_CACHE_SECONDS },
  )();

  if (label === null || label.length < 1) {
    return NextResponse.json(
      { error: "No address found for this point." },
      { status: 404 },
    );
  }

  return NextResponse.json({ label });
}
