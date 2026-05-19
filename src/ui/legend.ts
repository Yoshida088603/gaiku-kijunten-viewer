import type { KijyuntenStyleConfig, StyleCategory } from "@/data/types";
import { sortedCategories } from "@/style/kindDisplayMap";

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
  marker.style.width = `${cat.legendSizePx}px`;
  marker.style.height = `${cat.legendSizePx}px`;
  marker.style.backgroundColor = cat.color;
  marker.style.fontSize = `${Math.max(10, Math.round(cat.legendSizePx * 0.38))}px`;
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
