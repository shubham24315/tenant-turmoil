import { NextResponse } from "next/server";
import {
  buildPhotonAutocompleteUrl,
  parsePhotonGeoJson,
} from "@/lib/places/photon";

const MIN_Q = 2;
const MAX_Q = 200;
const USER_AGENT = "TenantTurmoil/1.0 (address autocomplete; contact via repo)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const q = raw.trim();

  if (q.length < MIN_Q || q.length > MAX_Q) {
    return NextResponse.json(
      { error: `Query must be between ${MIN_Q} and ${MAX_Q} characters.` },
      { status: 400 },
    );
  }

  const url = buildPhotonAutocompleteUrl(q);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 },
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return NextResponse.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 },
    );
  }

  const suggestions = parsePhotonGeoJson(body);
  return NextResponse.json({ suggestions });
}
