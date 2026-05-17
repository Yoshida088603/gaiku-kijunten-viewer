import type { Map as MaplibreMap } from "maplibre-gl";
import { configUrl } from "@/config/loadConfig";
import type { KijyuntenStyleConfig } from "@/data/types";

/** MapLibre の image ID（ASCII） */
export function iconIdForCategory(order: number): string {
  return `icon-${String(order).padStart(2, "0")}`;
}

export function fallbackIconId(): string {
  return "icon-fallback";
}

function iconPngFile(order: number): string {
  return `icon-${String(order).padStart(2, "0")}.png`;
}

async function registerIcon(
  map: MaplibreMap,
  id: string,
  pngFile: string,
  svgFallback?: string,
): Promise<void> {
  if (map.hasImage(id)) return;

  const pngUrl = configUrl(`icons/${pngFile}`);
  try {
    const { data } = await map.loadImage(pngUrl);
    map.addImage(id, data, { pixelRatio: 2 });
    return;
  } catch (err) {
    console.warn(`icon PNG load failed: ${pngUrl}`, err);
  }

  if (svgFallback) {
    try {
      const svgUrl = configUrl(`icons/${encodeURIComponent(svgFallback)}`);
      const { data } = await map.loadImage(svgUrl);
      map.addImage(id, data, { pixelRatio: 2 });
    } catch (err) {
      console.warn(`icon SVG fallback failed: ${svgFallback}`, err);
    }
  }
}

export async function loadKijyuntenIcons(
  map: MaplibreMap,
  style: KijyuntenStyleConfig,
): Promise<void> {
  await Promise.all(
    style.categories.map((cat) =>
      registerIcon(
        map,
        iconIdForCategory(cat.order),
        iconPngFile(cat.order),
        cat.icon,
      ),
    ),
  );

  await registerIcon(map, fallbackIconId(), "icon-fallback.png", "fallback.svg");
}
