/** Greater Bengaluru bbox for Photon `bbox` bias (minLon, minLat, maxLon, maxLat). */
export const BENGALURU_BBOX = {
  minLon: 77.37,
  minLat: 12.73,
  maxLon: 77.88,
  maxLat: 13.17,
} as const;

export const PHOTON_AUTOCOMPLETE_LIMIT = 8;

const PHOTON_BASE = "https://photon.komoot.io/api/";

export type PhotonPlaceSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
  osmId: number;
  osmType: string;
};

type PhotonFeatureProperties = {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  type?: string;
};

type PhotonFeature = {
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: PhotonFeatureProperties;
};

type PhotonGeoJson = {
  type?: string;
  features?: PhotonFeature[];
};

export function buildPhotonAutocompleteUrl(query: string): string {
  const { minLon, minLat, maxLon, maxLat } = BENGALURU_BBOX;
  const params = new URLSearchParams({
    q: query,
    limit: String(PHOTON_AUTOCOMPLETE_LIMIT),
    lang: "en",
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
  });
  return `${PHOTON_BASE}?${params.toString()}`;
}

export function formatPhotonFeatureLabel(props: PhotonFeatureProperties): string {
  const line1 = [props.housenumber, props.street].filter(Boolean).join(" ").trim();
  const name = props.name?.trim() ?? "";
  const locality = props.locality?.trim() ?? "";
  const district = props.district?.trim() ?? "";
  const city = props.city?.trim() ?? "";
  const state = props.state?.trim() ?? "";
  const postcode = props.postcode?.trim() ?? "";
  const country = props.country?.trim() ?? "";

  const segments: string[] = [];
  if (line1) segments.push(line1);
  if (name && name !== line1 && !line1.includes(name)) segments.push(name);

  const area = [locality, district].filter(Boolean).join(", ");
  if (area) segments.push(area);

  const cityLine = [postcode, city, state].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (cityLine) segments.push(cityLine);
  else if (city || state) segments.push([city, state].filter(Boolean).join(", "));

  if (country) segments.push(country);

  const joined = segments.filter(Boolean).join(", ");
  return joined || name || "Unknown place";
}

export function parsePhotonGeoJson(json: unknown): PhotonPlaceSuggestion[] {
  if (!json || typeof json !== "object") return [];
  const root = json as PhotonGeoJson;
  const features = root.features;
  if (!Array.isArray(features)) return [];

  const out: PhotonPlaceSuggestion[] = [];

  for (const f of features) {
    if (!f || typeof f !== "object") continue;
    const coords = f.geometry?.coordinates;
    if (
      !Array.isArray(coords) ||
      coords.length < 2 ||
      typeof coords[0] !== "number" ||
      typeof coords[1] !== "number"
    ) {
      continue;
    }
    const [lon, lat] = coords;
    const props = f.properties ?? {};
    const osmId = props.osm_id;
    const osmTypeRaw = props.osm_type;
    if (typeof osmId !== "number" || !Number.isFinite(osmId)) continue;
    if (typeof osmTypeRaw !== "string" || osmTypeRaw.length < 1) continue;

    const label = formatPhotonFeatureLabel(props);
    out.push({
      label,
      latitude: lat,
      longitude: lon,
      osmId,
      osmType: osmTypeRaw,
    });
  }

  return out;
}
