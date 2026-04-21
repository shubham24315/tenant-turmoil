import type { SupabaseClient } from "@supabase/supabase-js";

export const PROPERTIES_PAGE_SIZE = 20;

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
