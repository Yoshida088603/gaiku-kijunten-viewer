import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";
import { forEachKindMapping } from "@/style/kindDisplayMap";
import { fallbackIconId, iconIdForCategory } from "@/style/loadIcons";

export function buildIconImageExpression(
  style: KijyuntenStyleConfig,
  hiddenKinds: Set<string>,
): ExpressionSpecification {
  const parts: unknown[] = ["match", ["get", "kind"]];
  forEachKindMapping(style, hiddenKinds, (rawKind, cat) => {
    parts.push(rawKind, iconIdForCategory(cat.order));
  });
  parts.push(fallbackIconId());
  return parts as ExpressionSpecification;
}
