import type { KijyuntenStyleConfig, StyleCategory } from "@/data/types";
import { sortedCategories } from "@/style/kindDisplayMap";

/** 凡例マーカーは文字数・地図シンボル倍率に関係なく同一サイズ */
const LEGEND_MARKER_PX = 32;

/**
 * 凡例は外部画像に依存しない（DOM で色＋字形を描画）。
 * 地図は 5 表示クラスに集約、凡例も 5 行。
 */
export function renderLegend(
  container: HTMLElement,
  style: KijyuntenStyleConfig,
): void {
  container.innerHTML = "";

  for (const cat of sortedCategories(style)) {
    container.appendChild(legendItem(cat));
  }
}

function legendItem(cat: StyleCategory): HTMLElement {
  const row = document.createElement("div");
  row.className = "legend-item";

  const marker = document.createElement("span");
  marker.className = "legend-marker";
  const px = `${LEGEND_MARKER_PX}px`;
  marker.style.width = px;
  marker.style.height = px;
  marker.style.minWidth = px;
  marker.style.maxWidth = px;
  marker.style.minHeight = px;
  marker.style.maxHeight = px;
  marker.style.backgroundColor = cat.color;
  const glyphLen = [...cat.glyph].length;
  marker.style.fontSize =
    glyphLen >= 2 ? "10px" : `${Math.max(10, Math.round(LEGEND_MARKER_PX * 0.38))}px`;
  marker.textContent = cat.glyph;
  marker.title = `${cat.label}（${cat.glyph}）`;
  marker.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "legend-label";
  text.textContent = cat.label;

  row.appendChild(marker);
  row.appendChild(text);
  return row;
}
