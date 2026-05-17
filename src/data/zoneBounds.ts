import { dataUrl } from "@/config/loadConfig";
import type { LogicalZoneLayer } from "@/data/types";

export type LngLatBounds = [[number, number], [number, number]];

interface GranularityEntry {
  file: string;
  bounds?: string;
}

interface GranularityReport {
  detail_pmtiles?: GranularityEntry[];
}

let cache: Map<number, LngLatBounds> | null = null;

function parseBounds(s: string): LngLatBounds | null {
  const parts = s.split(",").map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

function zoneFromFilename(file: string): number | null {
  const m = file.match(/zone(\d+)\.pmtiles$/i);
  return m ? Number(m[1]) : null;
}

export async function loadZoneBoundsMap(): Promise<Map<number, LngLatBounds>> {
  if (cache) return cache;
  const map = new Map<number, LngLatBounds>();
  try {
    const res = await fetch(dataUrl("overview_granularity_report.json"));
    if (!res.ok) return map;
    const report = (await res.json()) as GranularityReport;
    for (const entry of report.detail_pmtiles ?? []) {
      if (!entry.bounds) continue;
      const zone = zoneFromFilename(entry.file);
      const b = parseBounds(entry.bounds);
      if (zone !== null && b) map.set(zone, b);
    }
  } catch {
    /* optional metadata */
  }
  cache = map;
  return map;
}

export async function boundsForZone(
  zl: LogicalZoneLayer,
  boundsMap: Map<number, LngLatBounds>,
): Promise<LngLatBounds | null> {
  return boundsMap.get(zl.zone) ?? null;
}

export function pointInBounds(
  lng: number,
  lat: number,
  b: LngLatBounds,
): boolean {
  const [[minLon, minLat], [maxLon, maxLat]] = b;
  return lng >= minLon && lng <= maxLon && lat >= minLat && lat <= maxLat;
}

/** 系範囲内なら preferred（例: 東京）へ。範囲外なら範囲の中心 */
export function focusCenterForBounds(
  b: LngLatBounds | null,
  preferred: [number, number],
): [number, number] {
  if (!b) return preferred;
  const [lng, lat] = preferred;
  if (pointInBounds(lng, lat, b)) return preferred;
  return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
}
