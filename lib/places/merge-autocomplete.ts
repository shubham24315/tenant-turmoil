import type { PhotonPlaceSuggestion } from "@/lib/places/photon";
import {
  placeSuggestionFromCommunityRow,
  placeSuggestionFromPhoton,
  type CommunityPlaceRow,
  type PlaceSuggestion,
} from "@/lib/places/types";

export const COMMUNITY_AUTOCOMPLETE_LIMIT = 8;

function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

function roundCoord(n: number): number {
  return Math.round(n * 100_000) / 100_000;
}

function suggestionDedupeKey(s: PlaceSuggestion): string {
  return `${roundCoord(s.latitude)}|${roundCoord(s.longitude)}|${normLabel(s.label)}`;
}

/** Escape `%` and `_` for PostgreSQL ILIKE patterns (backslash escape). */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Photon results first, then community rows that are not duplicates of an existing suggestion
 * (same rounded coordinates + normalized label).
 */
export function mergePhotonAndCommunity(
  photon: PhotonPlaceSuggestion[],
  communityRows: CommunityPlaceRow[],
): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];

  for (const p of photon) {
    const s = placeSuggestionFromPhoton(p);
    const key = suggestionDedupeKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  let communityCount = 0;
  for (const row of communityRows) {
    if (communityCount >= COMMUNITY_AUTOCOMPLETE_LIMIT) break;
    const s = placeSuggestionFromCommunityRow(row);
    const key = suggestionDedupeKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    communityCount += 1;
  }

  return out;
}
