import { describe, expect, it } from "vitest";
import { buildGeoPollMapMarkers, geoPollMapKind, projectGeoLatLon } from "./geoPollMapLayout.js";
import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
} from "./geoPollDictionaries.js";

describe("geoPollMapLayout", () => {
  it("maps dictionary to map kind", () => {
    expect(geoPollMapKind(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe("russia");
    expect(geoPollMapKind(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe("world");
  });

  it("projects coordinates", () => {
    const point = projectGeoLatLon(55.75, 37.62, "russia");
    expect(point.x).toBeGreaterThan(0);
    expect(point.y).toBeGreaterThan(0);
  });

  it("builds markers from stats with lat/lon", () => {
    const markers = buildGeoPollMapMarkers(GEO_POLL_DICTIONARY_WORLD_CITIES, [
      { text: "Москва", count: 2, lat: 55.75, lon: 37.62 },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.count).toBe(2);
  });
});
