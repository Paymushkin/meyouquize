import { describe, expect, it } from "vitest";
import {
  GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES,
  GEO_POLL_DICTIONARY_OPTIONS,
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
  geoPollDictionaryInputLabel,
  geoPollDictionaryLabel,
  isGeoPollDictionary,
  normalizeGeoPollDictionaryId,
} from "./geoPollDictionaries.js";

describe("geoPollDictionaries", () => {
  it("recognizes known dictionary ids", () => {
    expect(isGeoPollDictionary(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe(true);
    expect(isGeoPollDictionary(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe(true);
    expect(isGeoPollDictionary(GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES)).toBe(true);
    expect(isGeoPollDictionary("central_asia_cities")).toBe(true);
    expect(isGeoPollDictionary("other")).toBe(false);
    expect(isGeoPollDictionary(null)).toBe(false);
  });

  it("normalizes legacy central asia cities id to countries", () => {
    expect(normalizeGeoPollDictionaryId("central_asia_cities")).toBe(
      GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES,
    );
  });

  it("returns Russian labels", () => {
    expect(geoPollDictionaryLabel(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe("Города России");
    expect(geoPollDictionaryLabel(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe("Страны мира");
    expect(geoPollDictionaryLabel(GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES)).toBe(
      "Центральная Азия",
    );
    expect(geoPollDictionaryInputLabel(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe("Город");
    expect(geoPollDictionaryInputLabel(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe("Страна");
    expect(geoPollDictionaryInputLabel(GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES)).toBe("Страна");
  });

  it("lists all dictionary options for admin select", () => {
    expect(GEO_POLL_DICTIONARY_OPTIONS.map((row) => row.id)).toEqual([
      GEO_POLL_DICTIONARY_WORLD_CITIES,
      GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
      GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES,
    ]);
  });
});
