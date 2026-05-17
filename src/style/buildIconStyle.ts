import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig } from "@/data/types";
import { fallbackIconId, iconIdForCategory } from "@/style/loadIcons";

export function buildIconImageExpression(
  style: KijyuntenStyleConfig,
  hiddenKinds: Set<string>,
): ExpressionSpecification {
  const parts: unknown[] = ["match", ["get", "kind"]];
  for (const cat of style.categories) {
    if (hiddenKinds.has(cat.kind)) continue;
    parts.push(cat.kind, iconIdForCategory(cat.order));
  }
  parts.push(fallbackIconId());
  return parts as ExpressionSpecification;
}
