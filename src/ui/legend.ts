import type { KijyuntenStyleConfig } from "@/data/types";
import { gaikuKinds } from "@/style/buildKindColor";

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
    gaikuGroup.appendChild(legendItem(cat.kind, cat.color));
  }
  container.appendChild(gaikuGroup);

  const totiriyoGroup = document.createElement("div");
  totiriyoGroup.className = "legend-group";
  const totiriyoTitle = document.createElement("div");
  totiriyoTitle.className = "legend-group-title";
  totiriyoTitle.textContent = "土地利用";
  totiriyoGroup.appendChild(totiriyoTitle);

  for (const cat of style.categories.filter((c) => c.group === "totiriyo")) {
    totiriyoGroup.appendChild(legendItem(cat.kind, cat.color));
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

function legendItem(label: string, color: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "legend-item";
  const sw = document.createElement("span");
  sw.className = "legend-swatch";
  sw.style.background = color;
  const text = document.createElement("span");
  text.textContent = label;
  row.appendChild(sw);
  row.appendChild(text);
  return row;
}
