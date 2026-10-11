export type GeocodeResult = { displayName: string; lat: number; lng: number; zoom: number };

/** Build a browser request for Geoapify's autocomplete endpoint with a soft India bias. */
export function buildGeoapifyAutocompleteUrl(query: string, apiKey: string) {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", query.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  // A bias prioritizes Indian matches without restricting international searches.
  url.searchParams.set("bias", "countrycode:in");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

function resultZoom(resultType: string, matchType: string, hasHouseNumber: boolean): number {
  if (hasHouseNumber || resultType === "building") return 18;
  if (resultType === "amenity") return 16;
  if (resultType === "street" || matchType === "match_by_street") return 16;
  if (resultType === "postcode" || matchType === "match_by_postcode") return 14;
  if (["suburb", "district", "city", "county"].includes(resultType)) return 12;
  if (["state", "country"].includes(resultType) || matchType === "match_by_country_or_state") return 7;
  return 14;
}

/** Normalize Geoapify JSON, GeoJSON, and legacy MapTiler/Nominatim payloads. */
export function parseGeocodeResults(value: unknown): GeocodeResult[] {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "results" in value && Array.isArray((value as { results?: unknown }).results)
      ? (value as { results: unknown[] }).results
      : typeof value === "object" && value !== null && "features" in value && Array.isArray((value as { features?: unknown }).features)
        ? (value as { features: unknown[] }).features
        : [];
  const results: GeocodeResult[] = [];
  for (const entry of entries) {
    if (results.length >= 5) break;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const props = typeof record.properties === "object" && record.properties !== null
      ? record.properties as Record<string, unknown>
      : record;
    const geometry = typeof record.geometry === "object" && record.geometry !== null ? record.geometry as Record<string, unknown> : null;
    const coordinates = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    const center = Array.isArray(record.center) ? record.center : null;
    const locationName = props.formatted ?? props.place_name ?? props.display_name ?? record.place_name ?? record.display_name;
    const rawLng = props.lon ?? coordinates?.[0] ?? center?.[0];
    const rawLat = props.lat ?? coordinates?.[1] ?? center?.[1];
    if (typeof locationName !== "string" || typeof rawLat !== "string" && typeof rawLat !== "number" || typeof rawLng !== "string" && typeof rawLng !== "number") continue;
    const displayName = locationName.trim();
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!displayName || displayName.length > 500 || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const resultType = typeof props.result_type === "string" ? props.result_type : "";
    const rank = typeof props.rank === "object" && props.rank !== null ? props.rank as Record<string, unknown> : null;
    const matchType = typeof rank?.match_type === "string" ? rank.match_type : "";
    const hasHouseNumber = typeof props.housenumber === "string" && Boolean(props.housenumber.trim());
    results.push({ displayName, lat, lng, zoom: resultZoom(resultType, matchType, hasHouseNumber) });
  }
  return results;
}

export function isValidGeocodeQuery(value: string) {
  const query = value.trim();
  return query.length >= 3 && query.length <= 120;
}

export function geocodeFailureMessage(status: number | null, timedOut = false) {
  if (timedOut) return "Location search timed out. Retry, try a broader place name, or continue with the sample property.";
  if (status === 401 || status === 403) return "Geoapify rejected this key. Check that the API key is enabled and its website-origin restriction includes this site.";
  if (status === 429) return "Location search has reached its current usage limit. Try again later or continue with the sample property.";
  return "Location search is temporarily unavailable. Check your connection and retry, or continue with the sample property.";
}
