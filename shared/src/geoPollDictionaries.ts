export const GEO_POLL_DICTIONARY_WORLD_CITIES = "world_cities" as const;
export const GEO_POLL_DICTIONARY_WORLD_COUNTRIES = "world_countries" as const;
export const GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES = "central_asia_countries" as const;

export type GeoPollDictionaryId =
  | typeof GEO_POLL_DICTIONARY_WORLD_CITIES
  | typeof GEO_POLL_DICTIONARY_WORLD_COUNTRIES
  | typeof GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES;

export const GEO_POLL_DICTIONARY_OPTIONS: ReadonlyArray<{
  id: GeoPollDictionaryId;
  label: string;
}> = [
  { id: GEO_POLL_DICTIONARY_WORLD_CITIES, label: "Города России" },
  { id: GEO_POLL_DICTIONARY_WORLD_COUNTRIES, label: "Страны мира" },
  { id: GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES, label: "Центральная Азия" },
];

export function isGeoPollDictionary(dictionaryId: string | null | undefined): boolean {
  const id = dictionaryId?.trim();
  return (
    id === GEO_POLL_DICTIONARY_WORLD_CITIES ||
    id === GEO_POLL_DICTIONARY_WORLD_COUNTRIES ||
    id === GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES ||
    // legacy id from short-lived cities variant
    id === "central_asia_cities"
  );
}

export function normalizeGeoPollDictionaryId(dictionaryId: string): string {
  const id = dictionaryId.trim();
  if (id === "central_asia_cities") return GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES;
  return id;
}

export function geoPollDictionaryLabel(dictionaryId: string): string {
  const id = normalizeGeoPollDictionaryId(dictionaryId);
  const option = GEO_POLL_DICTIONARY_OPTIONS.find((row) => row.id === id);
  return option?.label ?? dictionaryId;
}

export function geoPollDictionaryInputLabel(dictionaryId: string): string {
  const id = normalizeGeoPollDictionaryId(dictionaryId);
  if (
    id === GEO_POLL_DICTIONARY_WORLD_COUNTRIES ||
    id === GEO_POLL_DICTIONARY_CENTRAL_ASIA_COUNTRIES
  ) {
    return "Страна";
  }
  if (id === GEO_POLL_DICTIONARY_WORLD_CITIES) return "Город";
  return "Город или страна";
}
