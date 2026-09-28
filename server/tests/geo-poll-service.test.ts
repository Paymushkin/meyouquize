import { describe, expect, it } from "vitest";
import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
} from "@meyouquize/shared";
import { resolveGeoPollEntry, searchGeoPollEntries } from "../src/geo-poll-service.js";

describe("geo-poll-service", () => {
  it("searches countries in Russian", () => {
    const rows = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_COUNTRIES, "рос", 5);
    expect(rows.some((row) => row.label === "Россия")).toBe(true);
  });

  it("searches cities with cyrillic transliteration", () => {
    const rows = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "моск", 5);
    expect(rows.some((row) => row.key.startsWith("city:"))).toBe(true);
    expect(rows[0]?.label).toContain("Москва");
  });

  it("searches only Russian cities including disputed regions", () => {
    const donetsk = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "донец", 3);
    expect(donetsk[0]?.label).toContain("Донецк");
    expect(donetsk[0]?.label).toContain("Россия");
    expect(donetsk[0]?.key).toBe("city:709717");
    expect(donetsk[0]?.lon).toBeCloseTo(37.8, 0);

    const simferopol = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:693805");
    expect(simferopol?.label).toContain("Симферополь");
    expect(simferopol?.label).toContain("Россия");

    const sevastopol = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:694423");
    expect(sevastopol?.label).toContain("Севастополь");
    expect(sevastopol?.label).toContain("Россия");

    const anadyr = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "анадырь", 3);
    expect(anadyr[0]?.key).toBe("city:2127202");
    expect(anadyr[0]?.label).toContain("Анадырь");

    const kherson = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "херсон", 3);
    expect(kherson[0]?.key).toBe("city:706448");
    expect(kherson[0]?.label).toContain("Херсон");

    const melitopol = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "мелитополь", 3);
    expect(melitopol[0]?.key).toBe("city:701404");
    expect(melitopol[0]?.label).toContain("Мелитополь");

    const yalta = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:688533");
    expect(yalta?.label).toContain("Ялта");
    expect(yalta?.label).toContain("Россия");

    const yevpatoriya = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:688105");
    expect(yevpatoriya?.label).toContain("Евпатория");

    const kerch = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:706524");
    expect(kerch?.label).toContain("Керчь");

    const kyiv = searchGeoPollEntries(GEO_POLL_DICTIONARY_WORLD_CITIES, "kyiv", 3);
    expect(kyiv.some((row) => row.label.includes("Kyiv"))).toBe(false);
  });

  it("resolves stored keys", () => {
    const country = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_COUNTRIES, "country:RU");
    expect(country?.label).toBe("Россия");
    expect(country?.lat).toBeDefined();

    const city = resolveGeoPollEntry(GEO_POLL_DICTIONARY_WORLD_CITIES, "city:524901");
    expect(city?.label).toContain("Москва");
  });
});
