import type { ExpressionSpecification } from "maplibre-gl";
import type { KijyuntenStyleConfig, StyleCategory } from "@/data/types";

export function buildKindColorExpression(
  style: KijyuntenStyleConfig,
  hiddenKinds: Set<string>,
): ExpressionSpecification {
  const sorted = [...style.categories].sort((a, b) => a.order - b.order);
  const parts: unknown[] = ["match", ["get", "kind"]];
  for (const cat of sorted) {
    if (hiddenKinds.has(cat.kind)) continue;
    parts.push(cat.kind, cat.color);
  }
  parts.push("#999999");
  return parts as ExpressionSpecification;
}

export function totiriyoKinds(style: KijyuntenStyleConfig): Set<string> {
  const totiriyoGroup = style.groups.find((g) => g.id === "totiriyo");
  if (!totiriyoGroup) return new Set();
  return new Set(
    style.categories.filter((c) => c.group === "totiriyo").map((c) => c.kind),
  );
}

export function gaikuKinds(style: KijyuntenStyleConfig): StyleCategory[] {
  return style.categories.filter((c) => c.group === "gaiku");
}
