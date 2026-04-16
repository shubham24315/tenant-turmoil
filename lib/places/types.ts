import type { PhotonPlaceSuggestion } from "@/lib/places/photon";

export type PlaceSuggestionPhoton = {
  kind: "photon";
  label: string;
  latitude: number;
  longitude: number;
  osmId: number;
  osmType: string;
};

export type PlaceSuggestionCommunity = {
  kind: "community";
  label: string;
  latitude: number;
  longitude: number;
  communityPlaceId: string;
};

export type PlaceSuggestionMapPin = {
  kind: "map_pin";
  label: string;
  latitude: number;
  longitude: number;
  mapPinId: string;
};

export type PlaceSuggestion =
  | PlaceSuggestionPhoton
  | PlaceSuggestionCommunity
  | PlaceSuggestionMapPin;

export function placeSuggestionFromPhoton(p: PhotonPlaceSuggestion): PlaceSuggestionPhoton {
  return {
    kind: "photon",
    label: p.label,
    latitude: p.latitude,
    longitude: p.longitude,
    osmId: p.osmId,
    osmType: p.osmType,
  };
}

export type CommunityPlaceRow = {
  id: string;
  display_label: string;
  latitude: number;
  longitude: number;
};

export function placeSuggestionFromCommunityRow(row: CommunityPlaceRow): PlaceSuggestionCommunity {
  return {
    kind: "community",
    label: row.display_label.trim(),
    latitude: row.latitude,
    longitude: row.longitude,
    communityPlaceId: row.id,
  };
}

export function parsePlaceSuggestion(item: unknown): PlaceSuggestion | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const kind = o.kind;
  const label = o.label;
  const lat = o.latitude;
  const lon = o.longitude;
  if (typeof label !== "string" || typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  if (kind === "photon") {
    const osmId = o.osmId;
    const osmType = o.osmType;
    if (typeof osmId !== "number" || !Number.isFinite(osmId)) return null;
    if (typeof osmType !== "string" || osmType.length < 1) return null;
    return { kind: "photon", label, latitude: lat, longitude: lon, osmId, osmType };
  }
  if (kind === "community") {
    const communityPlaceId = o.communityPlaceId;
    if (typeof communityPlaceId !== "string" || communityPlaceId.length < 1) return null;
    return { kind: "community", label, latitude: lat, longitude: lon, communityPlaceId };
  }
  if (kind === "map_pin") {
    const mapPinId = o.mapPinId;
    if (typeof mapPinId !== "string" || mapPinId.length < 1) return null;
    return { kind: "map_pin", label, latitude: lat, longitude: lon, mapPinId };
  }
  return null;
}

export function parsePlaceSuggestionsFromApi(json: unknown): PlaceSuggestion[] | null {
  if (!json || typeof json !== "object") return null;
  const suggestions = (json as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) return null;
  const out: PlaceSuggestion[] = [];
  for (const item of suggestions) {
    const p = parsePlaceSuggestion(item);
    if (p === null) return null;
    out.push(p);
  }
  return out;
}
