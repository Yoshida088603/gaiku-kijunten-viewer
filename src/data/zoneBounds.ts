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

const METERS_PER_DEG_LAT = 111320;
const MIN_COS_LAT = 0.1;

function metersToLatDegrees(meters: number): number {
  return meters / METERS_PER_DEG_LAT;
}

function metersToLngDegrees(meters: number, lat: number): number {
  const cosLat = Math.max(MIN_COS_LAT, Math.abs(Math.cos((lat * Math.PI) / 180)));
  return meters / (METERS_PER_DEG_LAT * cosLat);
}

/**
 * marginMeters:
 * - 正値: bounds を外側に広げる
 * - 負値: bounds を内側に縮める（縮めすぎた場合は常に false）
 */
export function pointInBoundsWithMarginMeters(
  lng: number,
  lat: number,
  b: LngLatBounds,
  marginMeters: number,
): boolean {
  if (marginMeters === 0) return pointInBounds(lng, lat, b);

  const latDelta = metersToLatDegrees(Math.abs(marginMeters));
  const lngDelta = metersToLngDegrees(Math.abs(marginMeters), lat);
  const [[minLon, minLat], [maxLon, maxLat]] = b;

  const shrink = marginMeters < 0;
  const adjMinLon = shrink ? minLon + lngDelta : minLon - lngDelta;
  const adjMaxLon = shrink ? maxLon - lngDelta : maxLon + lngDelta;
  const adjMinLat = shrink ? minLat + latDelta : minLat - latDelta;
  const adjMaxLat = shrink ? maxLat - latDelta : maxLat + latDelta;

  if (adjMinLon > adjMaxLon || adjMinLat > adjMaxLat) return false;
  return lng >= adjMinLon && lng <= adjMaxLon && lat >= adjMinLat && lat <= adjMaxLat;
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
