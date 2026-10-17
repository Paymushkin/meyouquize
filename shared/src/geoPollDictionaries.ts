export const GEO_POLL_DICTIONARY_WORLD_CITIES = "world_cities" as const;
export const GEO_POLL_DICTIONARY_WORLD_COUNTRIES = "world_countries" as const;

export type GeoPollDictionaryId =
  | typeof GEO_POLL_DICTIONARY_WORLD_CITIES
  | typeof GEO_POLL_DICTIONARY_WORLD_COUNTRIES;

export function isGeoPollDictionary(dictionaryId: string | null | undefined): boolean {
  const id = dictionaryId?.trim();
  return id === GEO_POLL_DICTIONARY_WORLD_CITIES || id === GEO_POLL_DICTIONARY_WORLD_COUNTRIES;
}

export function geoPollDictionaryLabel(dictionaryId: string): string {
  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_CITIES) return "Города России";
  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES) return "Страны мира";
  return dictionaryId;
}

export function geoPollDictionaryInputLabel(dictionaryId: string): string {
  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_CITIES) return "Город";
  if (dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES) return "Страна";
  return "Город или страна";
}
