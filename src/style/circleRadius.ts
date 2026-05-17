import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";

/** kind ごとの sizeRatio を掛けた circle-radius（タイル読込の目印にも使う） */
export function buildCircleRadiusExpression(
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
    ["*", 7, ratioParts],
    16,
    ["*", 8, ratioParts],
    17,
    ["*", 9, ratioParts],
    18,
    ["*", 10, ratioParts],
    20,
    ["*", 11, ratioParts],
  ] as unknown as ExpressionSpecification;
}
