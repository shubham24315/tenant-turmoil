import type { SupabaseClient } from "@supabase/supabase-js";

export const PROPERTIES_PAGE_SIZE = 20;

/** Minimum trimmed query length before calling search_properties. */
export const PROPERTY_SEARCH_MIN_QUERY_LENGTH = 2;

/** Maximum raw search query length (aligned with Photon autocomplete cap). */
export const PROPERTY_SEARCH_MAX_QUERY_LENGTH = 200;

export function normalizePropertySearchQuery(raw: string): string | null {
  const t = raw.trim();
  if (t.length < PROPERTY_SEARCH_MIN_QUERY_LENGTH) return null;
  if (t.length > PROPERTY_SEARCH_MAX_QUERY_LENGTH) return null;
  return t;
}

type SearchPropertiesRpcRow = {
  id: string;
  owner_id: string;
  address: string;
  city: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  osm_id: number | null;
  osm_type: string | null;
  location_source: string | null;
  note_count: number | string;
  avg_rating: number | string | null;
  count_1: number | string;
  count_2: number | string;
  count_3: number | string;
  count_4: number | string;
  count_5: number | string;
  rank: number | null;
};

function rpcBigintToNumber(v: number | string): number {
  if (typeof v === "number") return v;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

function rpcNumericToNumberOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function rowToPropertyListItem(row: SearchPropertiesRpcRow): PropertyListItem {
  const id = row.id;
  const noteCount = rpcBigintToNumber(row.note_count);
  const stats: PropertyRatingStatsRow = {
    property_id: id,
    note_count: noteCount,
    avg_rating: rpcNumericToNumberOrNull(row.avg_rating),
    count_1: rpcBigintToNumber(row.count_1),
    count_2: rpcBigintToNumber(row.count_2),
    count_3: rpcBigintToNumber(row.count_3),
    count_4: rpcBigintToNumber(row.count_4),
    count_5: rpcBigintToNumber(row.count_5),
  };
  const osmId =
    row.osm_id == null
      ? null
      : typeof row.osm_id === "number"
        ? row.osm_id
        : Number.parseInt(String(row.osm_id), 10);
  const osmIdNorm =
    osmId != null && Number.isFinite(osmId) ? osmId : null;

  return {
    id,
    owner_id: row.owner_id,
    address: row.address,
    city: row.city,
    created_at: row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    osm_id: osmIdNorm,
    osm_type: row.osm_type,
    location_source: row.location_source,
    stats,
  };
}

export type PropertyRow = {
  id: string;
  owner_id: string;
  address: string;
  city: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  osm_id: number | null;
  osm_type: string | null;
  location_source: string | null;
};

export type PropertyRatingStatsRow = {
  property_id: string;
  note_count: number;
  avg_rating: number | null;
  count_1: number;
  count_2: number;
  count_3: number;
  count_4: number;
  count_5: number;
};

export type PropertyListItem = PropertyRow & {
  stats: PropertyRatingStatsRow | null;
};

export async function fetchPropertiesPage(
  supabase: SupabaseClient,
  page: number,
): Promise<PropertyListItem[]> {
  const from = page * PROPERTIES_PAGE_SIZE;
  const to = from + PROPERTIES_PAGE_SIZE - 1;

  const { data: properties, error: pErr } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (pErr || !properties?.length) {
    if (pErr) console.error(pErr);
    return [];
  }

  const ids = properties.map((p) => (p as PropertyRow).id);
  const { data: statsRows, error: sErr } = await supabase
    .from("property_rating_stats")
    .select("*")
    .in("property_id", ids);

  if (sErr) console.error(sErr);

  const statsById = new Map(
    (statsRows as PropertyRatingStatsRow[] | null)?.map((s) => [s.property_id, s]) ??
      [],
  );

  return (properties as PropertyRow[]).map((p) => ({
    ...p,
    stats: statsById.get(p.id) ?? null,
  }));
}

export async function fetchPropertiesSearchPage(
  supabase: SupabaseClient,
  query: string,
  page: number,
): Promise<PropertyListItem[]> {
  const normalized = normalizePropertySearchQuery(query);
  if (!normalized) {
    return [];
  }

  const offset = Math.max(0, page) * PROPERTIES_PAGE_SIZE;

  const { data, error } = await supabase.rpc("search_properties", {
    search_query: normalized,
    result_limit: PROPERTIES_PAGE_SIZE,
    result_offset: offset,
  });

  if (error) {
    console.error(error);
    return [];
  }

  const rows = (data ?? []) as SearchPropertiesRpcRow[];
  return rows.map(rowToPropertyListItem);
}

export async function userHasProperty(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return data != null;
}

/** Most recently created listing for this user, if any. */
export async function propertyIdForOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}
