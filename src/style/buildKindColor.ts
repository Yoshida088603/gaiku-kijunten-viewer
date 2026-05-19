import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";
import { forEachKindMapping } from "@/style/kindDisplayMap";

export { allTotiriyoKinds, totiriyoKinds } from "@/style/kindDisplayMap";

export function buildKindColorExpression(
  style: KijyuntenStyleConfig,
  hiddenKinds: Set<string>,
): ExpressionSpecification {
  const parts: unknown[] = ["match", ["get", "kind"]];
  forEachKindMapping(style, hiddenKinds, (rawKind, cat) => {
    parts.push(rawKind, cat.color);
  });
  parts.push("#999999");
  return parts as ExpressionSpecification;
}
