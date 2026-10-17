import { describe, expect, it } from "vitest";
import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
  geoPollDictionaryInputLabel,
  geoPollDictionaryLabel,
  isGeoPollDictionary,
} from "./geoPollDictionaries.js";

describe("geoPollDictionaries", () => {
  it("recognizes known dictionary ids", () => {
    expect(isGeoPollDictionary(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe(true);
    expect(isGeoPollDictionary(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe(true);
    expect(isGeoPollDictionary("other")).toBe(false);
    expect(isGeoPollDictionary(null)).toBe(false);
  });

  it("returns Russian labels", () => {
    expect(geoPollDictionaryLabel(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe("Города России");
    expect(geoPollDictionaryLabel(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe("Страны мира");
    expect(geoPollDictionaryInputLabel(GEO_POLL_DICTIONARY_WORLD_CITIES)).toBe("Город");
    expect(geoPollDictionaryInputLabel(GEO_POLL_DICTIONARY_WORLD_COUNTRIES)).toBe("Страна");
  });
});
