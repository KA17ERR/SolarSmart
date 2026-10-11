export type GeocodeResult = { displayName: string; lat: number; lng: number };

/** Accept MapTiler GeoJSON results and legacy Nominatim results safely. */
export function parseGeocodeResults(value: unknown): GeocodeResult[] {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "features" in value && Array.isArray((value as { features?: unknown }).features)
      ? (value as { features: unknown[] }).features
      : [];
  const results: GeocodeResult[] = [];
  for (const entry of entries) {
    if (results.length >= 5) break;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const geometry = typeof record.geometry === "object" && record.geometry !== null ? record.geometry as Record<string, unknown> : null;
    const coordinates = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    const center = Array.isArray(record.center) ? record.center : null;
    const locationName = typeof record.place_name === "string" ? record.place_name : record.display_name;
    const rawLng = coordinates?.[0] ?? center?.[0] ?? record.lon;
    const rawLat = coordinates?.[1] ?? center?.[1] ?? record.lat;
    if (typeof locationName !== "string" || typeof rawLat !== "string" && typeof rawLat !== "number" || typeof rawLng !== "string" && typeof rawLng !== "number") continue;
    const displayName = locationName.trim();
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!displayName || displayName.length > 500 || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    results.push({ displayName, lat, lng });
  }
  return results;
}

export function isValidGeocodeQuery(value: string) {
  const query = value.trim();
  return query.length >= 2 && query.length <= 120;
}
