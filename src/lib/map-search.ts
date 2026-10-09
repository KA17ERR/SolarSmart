export type GeocodeResult = { displayName: string; lat: number; lng: number };

/** Accept only bounded, finite geographic results from an untrusted geocoder. */
export function parseGeocodeResults(value: unknown): GeocodeResult[] {
  if (!Array.isArray(value)) return [];
  const results: GeocodeResult[] = [];
  for (const entry of value) {
    if (results.length >= 5) break;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.display_name !== "string" || typeof record.lat !== "string" && typeof record.lat !== "number" || typeof record.lon !== "string" && typeof record.lon !== "number") continue;
    const displayName = record.display_name.trim();
    const lat = Number(record.lat);
    const lng = Number(record.lon);
    if (!displayName || displayName.length > 500 || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    results.push({ displayName, lat, lng });
  }
  return results;
}

export function isValidGeocodeQuery(value: string) {
  const query = value.trim();
  return query.length >= 2 && query.length <= 120;
}
