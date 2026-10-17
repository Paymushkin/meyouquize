import { GEO_POLL_DICTIONARY_WORLD_COUNTRIES } from "./geoPollDictionaries.js";

export type GeoPollMapKind = "world" | "russia";

export type GeoPollMapPoint = {
  name: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
};

export function geoPollMapKind(dictionaryId: string): GeoPollMapKind {
  return dictionaryId === GEO_POLL_DICTIONARY_WORLD_COUNTRIES ? "world" : "russia";
}

export function geoPollMapViewBox(kind: GeoPollMapKind): string {
  return kind === "russia" ? "0 0 800 500" : "0 0 960 500";
}

export function projectGeoLatLon(
  lat: number,
  lon: number,
  kind: GeoPollMapKind,
): { x: number; y: number } {
  if (kind === "world") {
    return {
      x: ((lon + 180) / 360) * 960,
      y: ((90 - lat) / 180) * 500,
    };
  }
  const minLon = 20;
  const maxLon = 160;
  const minLat = 35;
  const maxLat = 75;
  const rawX = ((lon - minLon) / (maxLon - minLon)) * 800;
  const rawY = ((maxLat - lat) / (maxLat - minLat)) * 500;
  return {
    x: Math.max(28, Math.min(772, rawX)),
    y: Math.max(28, Math.min(472, rawY)),
  };
}

export function buildGeoPollMapMarkers(
  dictionaryId: string,
  stats: Array<{ text: string; count: number; lat?: number; lon?: number }>,
): Array<GeoPollMapPoint & { count: number }> {
  const kind = geoPollMapKind(dictionaryId);
  return stats
    .filter(
      (row) =>
        row.lat != null && row.lon != null && Number.isFinite(row.lat) && Number.isFinite(row.lon),
    )
    .map((row) => {
      const projected = projectGeoLatLon(row.lat!, row.lon!, kind);
      return {
        name: row.text,
        count: row.count,
        lat: row.lat!,
        lon: row.lon!,
        ...projected,
      };
    });
}
