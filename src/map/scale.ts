import type { Map } from "maplibre-gl";
import type { MapConfig } from "@/data/types";

/** 画面上の縮尺分母（約 96dpi・256px タイル想定） */
export function scaleDenominator(map: Map): number {
  const zoom = map.getZoom();
  const lat = (map.getCenter().lat * Math.PI) / 180;
  return 591657527.591555 / (256 * 2 ** zoom * Math.cos(lat));
}

export interface ScaleFlags {
  scale: number;
  detailVisible: boolean;
  downloadAllowed: boolean;
}

export function evaluateScale(map: Map, config: MapConfig): ScaleFlags {
  const scale = scaleDenominator(map);
  const zoom = map.getZoom();
  const detailVisible =
    scale <= config.detailMinScale || zoom >= config.detailMinZoom;
  const downloadAllowed = zoom >= config.downloadMinZoom;
  return { scale, detailVisible, downloadAllowed };
}

export function formatScale(scale: number): string {
  const rounded = Math.round(scale);
  return `1:${rounded.toLocaleString("ja-JP")}`;
}
