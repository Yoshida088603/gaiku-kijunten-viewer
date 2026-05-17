import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";

/** kind ごとの sizeRatio を掛けた zoom 連動 icon-size（QGIS @map_scale 比例の近似） */
export function buildIconSizeExpression(
  style: KijyuntenStyleConfig,
): ExpressionSpecification {
  const ratioParts: unknown[] = ["match", ["get", "kind"]];
  for (const cat of style.categories) {
    ratioParts.push(cat.kind, cat.sizeRatio);
  }
  ratioParts.push(1);

  // zoom は最上位 interpolate の入力にのみ使える（* の子に置けない）
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    15,
    ["*", 0.9, ratioParts],
    16,
    ["*", 1.05, ratioParts],
    17,
    ["*", 1.25, ratioParts],
    18,
    ["*", 1.45, ratioParts],
    19,
    ["*", 1.55, ratioParts],
    20,
    ["*", 1.65, ratioParts],
  ] as unknown as ExpressionSpecification;
}
