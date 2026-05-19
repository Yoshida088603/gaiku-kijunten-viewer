import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";
import { forEachKindMappingAll } from "@/style/kindDisplayMap";

/** kind ごとの sizeRatio を掛けた zoom 連動 icon-size（QGIS @map_scale 比例の近似） */
export function buildIconSizeExpression(
  style: KijyuntenStyleConfig,
): ExpressionSpecification {
  const ratioParts: unknown[] = ["match", ["get", "kind"]];
  forEachKindMappingAll(style, (rawKind, cat) => {
    ratioParts.push(rawKind, cat.sizeRatio);
  });
  ratioParts.push(1);

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    13,
    ["*", 0.9, ratioParts],
    14,
    ["*", 1.05, ratioParts],
    15,
    ["*", 1.25, ratioParts],
    16,
    ["*", 1.45, ratioParts],
    17,
    ["*", 1.55, ratioParts],
  ] as unknown as ExpressionSpecification;
}
