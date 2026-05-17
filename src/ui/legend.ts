import type { KijyuntenStyleConfig } from "@/data/types";
import { gaikuKinds } from "@/style/buildKindColor";

/**
 * 凡例は外部画像に依存しない（DOM で色＋字形を描画）。
 * 地図シンボル用 PNG/SVG とは経路を分離し、404・ビルド漏れの影響を受けない。
 */
export function renderLegend(
  container: HTMLElement,
  style: KijyuntenStyleConfig,
  onTotiriyoToggle: (visible: boolean) => void,
): void {
  container.innerHTML = "";

  const gaikuGroup = document.createElement("div");
  gaikuGroup.className = "legend-group";
  const gaikuTitle = document.createElement("div");
  gaikuTitle.className = "legend-group-title";
  gaikuTitle.textContent = "街区・都市官";
  gaikuGroup.appendChild(gaikuTitle);

  for (const cat of gaikuKinds(style)) {
    gaikuGroup.appendChild(legendItem(cat));
  }
  container.appendChild(gaikuGroup);

  const totiriyoGroup = document.createElement("div");
  totiriyoGroup.className = "legend-group";
  const totiriyoTitle = document.createElement("div");
  totiriyoTitle.className = "legend-group-title";
  totiriyoTitle.textContent = "土地利用";
  totiriyoGroup.appendChild(totiriyoTitle);

  for (const cat of style.categories.filter((c) => c.group === "totiriyo")) {
    totiriyoGroup.appendChild(legendItem(cat));
  }

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "legend-toggle";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = false;
  cb.addEventListener("change", () => onTotiriyoToggle(cb.checked));
  toggleLabel.appendChild(cb);
  toggleLabel.appendChild(document.createTextNode(" 土地利用を表示"));
  totiriyoGroup.appendChild(toggleLabel);
  container.appendChild(totiriyoGroup);
}

function legendItem(cat: {
  kind: string;
  glyph: string;
  color: string;
  legendSizePx: number;
}): HTMLElement {
  const row = document.createElement("div");
  row.className = "legend-item";

  const marker = document.createElement("span");
  marker.className = "legend-marker";
  marker.style.width = `${cat.legendSizePx}px`;
  marker.style.height = `${cat.legendSizePx}px`;
  marker.style.backgroundColor = cat.color;
  marker.style.fontSize = `${Math.max(10, Math.round(cat.legendSizePx * 0.38))}px`;
  marker.textContent = cat.glyph;
  marker.title = `${cat.kind}（${cat.glyph}）`;
  marker.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "legend-label";
  text.textContent = cat.kind;

  row.appendChild(marker);
  row.appendChild(text);
  return row;
}
