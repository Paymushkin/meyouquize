import allCities from "all-the-cities";
import countries from "i18n-iso-countries";
import ruLocale from "i18n-iso-countries/langs/ru.json" with { type: "json" };
import { transliterate as toLatin } from "transliteration";
import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import countries110m from "world-atlas/countries-110m.json" with { type: "json" };
import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
  isGeoPollDictionary,
} from "@meyouquize/shared";
import cityRuNamesJson from "./data/geo-ru-names.json" with { type: "json" };

countries.registerLocale(ruLocale);

const cityRuNames = cityRuNamesJson as Record<string, string[]>;

/** Русские названия для городов, у которых в GeoNames нет RU-имени (Крым/новые территории и т.п.). */
const CITY_RU_NAME_OVERRIDES: Record<string, string[]> = {
  "2127202": ["Анадырь"],
  "616743": ["Дружковка"],
  "686729": ["Васильевка"],
  "686818": ["Зугрэс"],
  "687700": ["Запорожье"],
  "688105": ["Евпатория"],
  "688148": ["Енакиево"],
  "688373": ["Ясиноватая"],
  "688533": ["Ялта"],
  "689198": ["Волноваха"],
  "691037": ["Алёшки"],
  "691374": ["Чистяково"],
  "691469": ["Токмак"],
  "691999": ["Северодонецк"],
  "692105": ["Свердловск"],
  "692118": ["Сватово"],
  "692315": ["Судак"],
  "692832": ["Старобельск"],
  "692975": ["Кадиевка"],
  "693381": ["Снежное"],
  "693468": ["Славянск"],
  "693709": ["Скадовск"],
  "693805": ["Симферополь"],
  "694382": ["Шахтёрск"],
  "694423": ["Севастополь"],
  "694677": ["Селидово"],
  "694910": ["Саки"],
  "695274": ["Рубежное"],
  "695379": ["Ровеньки"],
  "696566": ["Попасная"],
  "696677": ["Пологи"],
  "697592": ["Первомайск"],
  "697650": ["Перевальск"],
  "698428": ["Орехов"],
  "699839": ["Новая Каховка"],
  "700829": ["Молодогвардейск"],
  "701404": ["Мелитополь"],
  "701822": ["Мариуполь"],
  "702320": ["Макеевка"],
  "702563": ["Лутугино"],
  "702658": ["Луганск"],
  "702972": ["Лисичанск"],
  "703646": ["Курахово"],
  "704138": ["Кременная"],
  "704202": ["Красный Луч"],
  "704204": ["Лиман"],
  "704362": ["Красноперекопск"],
  "704403": ["Сорокино"],
  "704422": ["Покровск"],
  "704508": ["Краматорск"],
  "705104": ["Константиновка"],
  "705809": ["Кировск"],
  "706448": ["Херсон"],
  "706466": ["Харцызск"],
  "706524": ["Керчь"],
  "707244": ["Каховка"],
  "707679": ["Иловайск"],
  "707753": ["Горловка"],
  "707898": ["Гуляйполе"],
  "708632": ["Голая Пристань"],
  "708878": ["Геническ"],
  "709161": ["Феодосия"],
  "709276": ["Энергодар"],
  "709334": ["Джанкой"],
  "709354": ["Торецк"],
  "709717": ["Донецк"],
  "709835": ["Докучаевск"],
  "709900": ["Доброполье"],
  "709960": ["Днепрорудное"],
  "710035": ["Мирноград"],
  "710229": ["Дебальцево"],
  "710548": ["Червонопартизанск"],
  "711369": ["Брянка"],
  "712451": ["Бердянск"],
  "712587": ["Белогорск"],
  "712930": ["Балаклава"],
  "712969": ["Бахчисарай"],
  "713122": ["Авдеевка"],
  "713174": ["Бахмут"],
  "713203": ["Армянск"],
  "713259": ["Антрацит"],
  "713504": ["Амвросиевка"],
  "713513": ["Алушта"],
  "713716": ["Алчевск"],
};

export type GeoPollEntry = {
  key: string;
  label: string;
  lat: number;
  lon: number;
};

type CityRow = (typeof allCities)[number];

const MIN_CITY_POPULATION = 15_000;
/**
 * Города ниже порога населения, но нужные для карты субъектов
 * (например Анадырь — столица Чукотки, ~10k).
 */
const FORCE_INCLUDE_CITY_IDS = new Set<number>([
  2127202, // Анадырь
]);
/**
 * GeoNames admin1 для UA-территорий в словаре «города России»:
 * 05 Донецкая, 08 Херсонская, 11 Крым, 14 Луганская, 20 Севастополь, 26 Запорожская.
 */
const RUSSIA_GEO_POLL_UA_ADMIN_CODES = new Set(["05", "08", "11", "14", "20", "26"]);

function isRussiaGeoPollCity(city: CityRow): boolean {
  if (city.country === "RU") return true;
  return city.country === "UA" && RUSSIA_GEO_POLL_UA_ADMIN_CODES.has(city.adminCode ?? "");
}

const citiesById = new Map<number, CityRow>();
const russiaCitiesById = new Map<number, CityRow>();
const russiaCitiesSearchPool: CityRow[] = [];

for (const city of allCities) {
  const forceInclude = FORCE_INCLUDE_CITY_IDS.has(city.cityId);
  if (!forceInclude && city.population < MIN_CITY_POPULATION) continue;
  citiesById.set(city.cityId, city);
  if (!isRussiaGeoPollCity(city)) continue;
  russiaCitiesById.set(city.cityId, city);
  russiaCitiesSearchPool.push(city);
}

russiaCitiesSearchPool.sort((a, b) => b.population - a.population);

function countryKey(alpha2: string): string {
  return `country:${alpha2.toUpperCase()}`;
}

function cityKey(cityId: number): string {
  return `city:${cityId}`;
}

function buildCountryCentroids(): Map<string, [number, number]> {
  const topology = countries110m as unknown as {
    objects: { countries: unknown };
  };
  const world = feature(
    topology as unknown as Parameters<typeof feature>[0],
    topology.objects.countries as Parameters<typeof feature>[1],
  ) as FeatureCollection<Geometry>;

  const out = new Map<string, [number, number]>();
  for (const f of world.features) {
    const alpha2 = countries.numericToAlpha2(String(f.id ?? ""));
    if (!alpha2) continue;
    const [lon, lat] = geoCentroid(f);
    out.set(alpha2, [lon, lat]);
  }
  return out;
}

const countryCentroids = buildCountryCentroids();

const countryNamesRu = countries.getNames("ru", { select: "alias" });
const countryEntries: GeoPollEntry[] = Object.entries(countryNamesRu)
  .map(([alpha2, label]) => {
    const centroid = countryCentroids.get(alpha2);
    if (!centroid) return null;
    return {
      key: countryKey(alpha2),
      label,
      lat: centroid[1]!,
      lon: centroid[0]!,
    };
  })
  .filter((row): row is GeoPollEntry => row != null)
  .sort((a, b) => a.label.localeCompare(b.label, "ru"));

const countryByKey = new Map(countryEntries.map((row) => [row.key, row]));
const countryByLabelLower = new Map<string, GeoPollEntry>();
for (const row of countryEntries) {
  countryByLabelLower.set(normalizeSearch(row.label), row);
  const alpha2 = row.key.slice("country:".length);
  const official = countries.getName(alpha2, "ru", { select: "official" });
  if (official) countryByLabelLower.set(normalizeSearch(official), row);
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}

function searchTokens(value: string): string[] {
  const base = normalizeSearch(value);
  const latin = normalizeSearch(toLatin(value));
  return base === latin ? [base] : [base, latin];
}

function countryLabelRu(alpha2: string): string {
  return (
    countries.getName(alpha2, "ru", { select: "alias" }) ??
    countries.getName(alpha2, "ru") ??
    alpha2
  );
}

function cityPrimaryName(city: CityRow): string {
  return (
    CITY_RU_NAME_OVERRIDES[String(city.cityId)]?.[0] ??
    cityRuNames[String(city.cityId)]?.[0] ??
    city.name
  );
}

function cityLabel(city: CityRow): string {
  const countryCode = isRussiaGeoPollCity(city) ? "RU" : city.country;
  return `${cityPrimaryName(city)}, ${countryLabelRu(countryCode)}`;
}

function cityRuSearchNames(city: CityRow): string[] {
  const overrides = CITY_RU_NAME_OVERRIDES[String(city.cityId)];
  const fromIndex = cityRuNames[String(city.cityId)] ?? [];
  if (!overrides) return fromIndex;
  return [...overrides, ...fromIndex.filter((name) => !overrides.includes(name))];
}

function citySearchScore(city: CityRow, tokens: string[]): number {
  const displayName = cityPrimaryName(city);
  const nameLower = normalizeSearch(displayName);
  const nameLatin = normalizeSearch(toLatin(displayName));
  const englishLower = normalizeSearch(city.name);
  const englishLatin = normalizeSearch(toLatin(city.name));
  let score = 0;

  for (const token of tokens) {
    if (token.length === 0) continue;
    const tokenLatin = normalizeSearch(toLatin(token));
    const ruNames = cityRuSearchNames(city);

    for (const ruName of ruNames) {
      const ruLower = normalizeSearch(ruName);
      if (ruLower.startsWith(token)) {
        score += 120;
        continue;
      }
      if (ruLower.includes(token)) {
        score += 80;
      }
    }

    if (
      nameLower.startsWith(token) ||
      nameLatin.startsWith(tokenLatin) ||
      nameLatin.startsWith(token) ||
      englishLower.startsWith(token) ||
      englishLatin.startsWith(tokenLatin)
    ) {
      score += 100;
    } else if (
      nameLower.includes(token) ||
      nameLatin.includes(tokenLatin) ||
      englishLower.includes(token) ||
      englishLatin.includes(tokenLatin)
    ) {
      score += 50;
    } else {
      const haystack = normalizeSearch(
        `${displayName} ${city.name} ${city.altName ?? ""} ${ruNames.join(" ")} ${countryLabelRu(city.country)}`,
      );
      const latinHaystack = normalizeSearch(toLatin(haystack));
      if (haystack.includes(token) || latinHaystack.includes(tokenLatin)) {
        score += 10;
      }
    }
  }

  return score;
}

function cityEntry(city: CityRow): GeoPollEntry {
  const [lon, lat] = city.loc.coordinates;
  return {
    key: cityKey(city.cityId),
    label: cityLabel(city),
    lat,
    lon,
  };
}

function parseStoredGeoKey(input: string): { kind: "city" | "country"; id: string } | null {
  const trimmed = input.trim();
  const cityMatch = /^city:(\d+)$/.exec(trimmed);
  if (cityMatch) return { kind: "city", id: cityMatch[1]! };
  const countryMatch = /^country:([A-Za-z]{2})$/.exec(trimmed);
  if (countryMatch) return { kind: "country", id: countryMatch[1]!.toUpperCase() };
  return null;
}

export function searchGeoPollEntries(
  dictionaryId: string,
  query: string,
  limit = 12,
): GeoPollEntry[] {
  if (!isGeoPollDictionary(dictionaryId)) return [];
  const safeLimit = Math.max(1, Math.min(30, Math.trunc(limit)));
  const tokens = searchTokens(query);
  if (tokens.every((token) => token.length === 0)) {
    if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES) {
      return countryEntries.slice(0, safeLimit);
    }
    return russiaCitiesSearchPool.slice(0, safeLimit).map(cityEntry);
  }

  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES) {
    return countryEntries
      .filter((row) => tokens.some((token) => normalizeSearch(row.label).includes(token)))
      .slice(0, safeLimit);
  }

  const hits = russiaCitiesSearchPool
    .map((city) => ({ city, score: citySearchScore(city, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.city.population - a.city.population)
    .slice(0, safeLimit)
    .map((row) => row.city);
  return hits.map(cityEntry);
}

export function resolveGeoPollEntry(dictionaryId: string, input: string): GeoPollEntry | null {
  if (!isGeoPollDictionary(dictionaryId)) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = parseStoredGeoKey(trimmed);
  if (parsed?.kind === "country") {
    return countryByKey.get(countryKey(parsed.id)) ?? null;
  }
  if (parsed?.kind === "city") {
    const city = citiesById.get(Number(parsed.id));
    if (!city) return null;
    if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_CITIES && !russiaCitiesById.has(city.cityId)) {
      return null;
    }
    return cityEntry(city);
  }

  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES) {
    const byLabel = countryByLabelLower.get(normalizeSearch(trimmed));
    if (byLabel) return byLabel;
    const alpha2 =
      countries.getAlpha2Code(trimmed, "ru") ?? countries.getSimpleAlpha2Code(trimmed, "ru");
    if (alpha2) return countryByKey.get(countryKey(alpha2)) ?? null;
    return searchGeoPollEntries(dictionaryId, trimmed, 1)[0] ?? null;
  }

  const exact = russiaCitiesSearchPool.find(
    (city) =>
      normalizeSearch(city.name) === normalizeSearch(trimmed) ||
      normalizeSearch(cityLabel(city)) === normalizeSearch(trimmed),
  );
  if (exact) return cityEntry(exact);

  return searchGeoPollEntries(dictionaryId, trimmed, 1)[0] ?? null;
}

/** @deprecated use resolveGeoPollEntry */
export function resolveGeoPollDictionaryEntry(dictionaryId: string, input: string): string | null {
  return resolveGeoPollEntry(dictionaryId, input)?.key ?? null;
}

export function geoPollEntryLabel(dictionaryId: string, storedValue: string): string {
  return resolveGeoPollEntry(dictionaryId, storedValue)?.label ?? storedValue;
}
