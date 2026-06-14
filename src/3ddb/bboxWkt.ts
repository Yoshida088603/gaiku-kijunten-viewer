import type { LngLatBounds } from "maplibre-gl";

/** map.getBounds() → 閉じた WKT POLYGON（lng lat 順） */
export function boundsToWkt(bounds: LngLatBounds): string {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const west = sw.lng;
  const south = sw.lat;
  const east = ne.lng;
  const north = ne.lat;
  return `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
}
