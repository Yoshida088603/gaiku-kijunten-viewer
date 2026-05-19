import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";
import { forEachKindMappingAll } from "@/style/kindDisplayMap";

/** kind ごとの sizeRatio を掛けた circle-radius（タイル読込の目印にも使う） */
export function buildCircleRadiusExpression(
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
    ["*", 7, ratioParts],
    14,
    ["*", 8, ratioParts],
    15,
    ["*", 9, ratioParts],
    16,
    ["*", 10, ratioParts],
    17,
    ["*", 11, ratioParts],
  ] as unknown as ExpressionSpecification;
}
