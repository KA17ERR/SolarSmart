import { describe, expect, it } from "vitest";
import { isValidGeocodeQuery, parseGeocodeResults } from "./map-search";

describe("optional map search boundaries", () => {
  it("accepts trimmed city names while bounding query size", () => {
    expect(isValidGeocodeQuery(" Austin, TX ")).toBe(true);
    expect(isValidGeocodeQuery(" ")).toBe(false);
    expect(isValidGeocodeQuery("a" )).toBe(false);
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
    expect(result[0]).toEqual({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431 });
    expect(result.some(hit => hit.displayName === "Off earth")).toBe(false);
  });

  it("does not accept non-array payloads or non-string labels", () => {
    expect(parseGeocodeResults({ results: [] })).toEqual([]);
    expect(parseGeocodeResults([{ display_name: {}, lat: 10, lon: 20 }])).toEqual([]);
  });
});
