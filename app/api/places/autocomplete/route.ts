import { NextResponse } from "next/server";
import {
  buildPhotonAutocompleteCacheKey,
  buildPhotonAutocompleteUrl,
  normalizePhotonAutocompleteQuery,
  parsePhotonGeoJson,
  parsePhotonPlaceSuggestionsFromCache,
  PHOTON_AUTOCOMPLETE_MAX_RAW_QUERY_LENGTH,
  PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH,
} from "@/lib/places/photon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const USER_AGENT = "TenantTurmoil/1.0 (address autocomplete; contact via repo)";

const DEFAULT_CACHE_TTL_SECONDS = 86_400;

function getCacheTtlSeconds(): number {
  const raw = process.env.PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS;
  if (raw === undefined || raw === "") return DEFAULT_CACHE_TTL_SECONDS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 60 || n > 60 * 60 * 24 * 30) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }
  return n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const q = raw.trim();

  if (
    q.length < PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH ||
    q.length > PHOTON_AUTOCOMPLETE_MAX_RAW_QUERY_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Query must be between ${PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH} and ${PHOTON_AUTOCOMPLETE_MAX_RAW_QUERY_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const normalized = normalizePhotonAutocompleteQuery(q);
  if (normalized.length < PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return NextResponse.json(
      {
        error: `Query must be between ${PHOTON_AUTOCOMPLETE_MIN_QUERY_LENGTH} and ${PHOTON_AUTOCOMPLETE_MAX_RAW_QUERY_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const cacheKey = buildPhotonAutocompleteCacheKey(normalized);
  const supabase = createServiceRoleClient();

  if (supabase) {
    const { data: row, error } = await supabase
      .from("place_autocomplete_cache")
      .select("suggestions")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!error && row?.suggestions != null) {
      const cached = parsePhotonPlaceSuggestionsFromCache(row.suggestions);
      if (cached !== null) {
        return NextResponse.json({ suggestions: cached });
      }
    }
  }

  const url = buildPhotonAutocompleteUrl(normalized);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
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

  if (supabase) {
    const ttlSec = getCacheTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
    const nowIso = new Date().toISOString();
    await supabase.from("place_autocomplete_cache").upsert(
      {
        cache_key: cacheKey,
        suggestions,
        expires_at: expiresAt,
        updated_at: nowIso,
      },
      { onConflict: "cache_key" },
    );
  }

  return NextResponse.json({ suggestions });
}
