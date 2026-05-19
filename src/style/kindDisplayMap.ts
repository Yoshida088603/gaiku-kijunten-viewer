import type { KijyuntenStyleConfig, StyleCategory } from "@/data/types";

/** PMTiles / CSV の raw kind（土地利用系・表示トグル用） */
export const TOTIRIYO_RAW_KINDS = [
  "土地利用補助点",
  "土地利用三角点",
  "土地利用三角点節点",
  "土地利用多角点",
  "土地利用多角点節点",
] as const;

export function allTotiriyoKinds(): Set<string> {
  return new Set(TOTIRIYO_RAW_KINDS);
}

/** @deprecated use allTotiriyoKinds — layerManager 互換 */
export function totiriyoKinds(_style?: KijyuntenStyleConfig): Set<string> {
  return allTotiriyoKinds();
}

export function sortedCategories(style: KijyuntenStyleConfig): StyleCategory[] {
  return [...style.categories].sort((a, b) => a.order - b.order);
}

/** raw kind ごとに表示カテゴリへ展開（hidden はスキップ） */
export function forEachKindMapping(
  style: KijyuntenStyleConfig,
  hiddenKinds: Set<string>,
  fn: (rawKind: string, cat: StyleCategory) => void,
): void {
  for (const cat of sortedCategories(style)) {
    for (const rawKind of cat.kinds) {
      if (hiddenKinds.has(rawKind)) continue;
      fn(rawKind, cat);
    }
  }
}

/** size 等、非表示 kind も含めて全 raw kind をマップ */
export function forEachKindMappingAll(
  style: KijyuntenStyleConfig,
  fn: (rawKind: string, cat: StyleCategory) => void,
): void {
  for (const cat of sortedCategories(style)) {
    for (const rawKind of cat.kinds) {
      fn(rawKind, cat);
    }
  }
}
