import { describe, expect, it } from "vitest";
import { buildGeoapifyAutocompleteUrl, geocodeFailureMessage, isValidGeocodeQuery, parseGeocodeResults } from "./map-search";

describe("optional map search boundaries", () => {
  it("accepts trimmed city names while bounding query size", () => {
    expect(isValidGeocodeQuery(" Austin, TX ")).toBe(true);
    expect(isValidGeocodeQuery(" ")).toBe(false);
    expect(isValidGeocodeQuery("ab" )).toBe(false);
    expect(isValidGeocodeQuery("x".repeat(121))).toBe(false);
  });

  it("keeps only bounded, finite coordinates and limits suggestions", () => {
    const input = [
      { display_name: "Austin, Texas", lat: "30.2672", lon: "-97.7431" },
      { display_name: "Off earth", lat: "91", lon: "0" },
      { display_name: "Not numeric", lat: "south", lon: "west" },
      null,
      ...Array.from({ length: 7 }, (_, index) => ({ display_name: `Place ${index}`, lat: 1, lon: 2 })),
    ];
    const result = parseGeocodeResults(input);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, zoom: 14 });
    expect(result.some(hit => hit.displayName === "Off earth")).toBe(false);
  });

  it("does not accept non-array payloads or non-string labels", () => {
    expect(parseGeocodeResults({ results: [] })).toEqual([]);
    expect(parseGeocodeResults([{ display_name: {}, lat: 10, lon: 20 }])).toEqual([]);
  });

  it("parses MapTiler GeoJSON autocomplete results as longitude/latitude points", () => {
    const result = parseGeocodeResults({
      type: "FeatureCollection",
      features: [{
        place_name: "1 Infinite Loop, Cupertino, California, United States",
        center: [-122.0322, 37.323],
        geometry: { type: "Point", coordinates: [-122.0322, 37.323] },
      }],
    });
    expect(result).toEqual([{ displayName: "1 Infinite Loop, Cupertino, California, United States", lat: 37.323, lng: -122.0322, zoom: 14 }]);
  });

  it("builds a Geoapify autocomplete request with an India soft bias", () => {
    const url = buildGeoapifyAutocompleteUrl("560035", "public-test-key");
    expect(url.hostname).toBe("api.geoapify.com");
    expect(url.pathname).toBe("/v1/geocode/autocomplete");
    expect(url.searchParams.get("text")).toBe("560035");
    expect(url.searchParams.get("bias")).toBe("countrycode:in");
    expect(url.searchParams.get("filter")).toBeNull();
    expect(url.searchParams.get("apiKey")).toBe("public-test-key");
  });

  it("uses Geoapify's returned Indian PIN code coordinates and zoom precision directly", () => {
    const result = parseGeocodeResults({ results: [{
      formatted: "560035, Bengaluru, Karnataka, India",
      lat: 12.9234,
      lon: 77.6762,
      result_type: "postcode",
      postcode: "560035",
      city: "Bengaluru",
      state: "Karnataka",
      country_code: "in",
    }] });
    expect(result).toEqual([{ displayName: "560035, Bengaluru, Karnataka, India", lat: 12.9234, lng: 77.6762, zoom: 14 }]);
  });

  it("parses Indian locality and city suggestions with their locality context", () => {
    const query = buildGeoapifyAutocompleteUrl("Indiranagar, Bengaluru", "public-test-key");
    const result = parseGeocodeResults({ results: [{
      formatted: "Indiranagar, Bengaluru, Karnataka, India",
      lat: 12.9784,
      lon: 77.6408,
      result_type: "suburb",
      city: "Bengaluru",
      state: "Karnataka",
      country_code: "in",
    }, {
      formatted: "Bengaluru, Karnataka, India",
      lat: 12.9716,
      lon: 77.5946,
      result_type: "city",
      country_code: "in",
    }] });
    expect(query.searchParams.get("text")).toBe("Indiranagar, Bengaluru");
    expect(result.map(hit => hit.displayName)).toEqual([
      "Indiranagar, Bengaluru, Karnataka, India",
      "Bengaluru, Karnataka, India",
    ]);
    expect(result.map(hit => hit.zoom)).toEqual([12, 12]);
  });

  it("uses rooftop zoom only for building-level results", () => {
    const result = parseGeocodeResults({ results: [{
      formatted: "Example Road 12, Bengaluru, Karnataka, India",
      lat: 12.9,
      lon: 77.6,
      result_type: "building",
      housenumber: "12",
    }] });
    expect(result[0]?.zoom).toBe(18);
  });

  it("parses international Geoapify suggestions without applying an India-only filter", () => {
    const url = buildGeoapifyAutocompleteUrl("Times Square, New York", "public-test-key");
    const results = parseGeocodeResults({ results: [{
      formatted: "Times Square, Manhattan, New York, United States",
      lat: 40.758,
      lon: -73.9855,
      result_type: "amenity",
    }] });
    expect(url.searchParams.get("bias")).toBe("countrycode:in");
    expect(url.searchParams.has("filter")).toBe(false);
    expect(results[0]).toMatchObject({ lat: 40.758, lng: -73.9855, zoom: 16 });
  });

  it("supports empty provider results without fabricating locations", () => {
    expect(parseGeocodeResults({ results: [] })).toEqual([]);
  });

  it("provides separate messages for provider throttling, rejected keys, timeouts, and network errors", () => {
    expect(geocodeFailureMessage(429)).toContain("usage limit");
    expect(geocodeFailureMessage(403)).toContain("rejected this key");
    expect(geocodeFailureMessage(null, true)).toContain("timed out");
    expect(geocodeFailureMessage(null)).toContain("temporarily unavailable");
  });
});
