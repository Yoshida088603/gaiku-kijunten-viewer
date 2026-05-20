import type { LogicalZoneLayer, MapConfig } from "@/data/types";

export interface StatusBarContext {
  zoom: number;
  mapConfig: MapConfig;
  showDetail: boolean;
  currentZone: LogicalZoneLayer | null;
  downloadZoomOk: boolean;
  viewCount: number;
}

export function formatUserHint(ctx: StatusBarContext): string {
  const { showDetail, downloadZoomOk, viewCount, mapConfig } = ctx;

  if (!showDetail) {
    return "地図を拡大すると基準点が表示されます";
  }
  if (!downloadZoomOk) {
    return "さらに拡大すると CSV をダウンロードできます";
  }
  if (viewCount > 0) {
    return `表示範囲に ${viewCount} 点 — 右下から CSV を保存できます`;
  }
  return `拡大済み（z${mapConfig.downloadMinZoom}以上）— 表示範囲に点がありません`;
}

function formatZoomLine(zoom: number): string {
  const tileZ = Math.round(zoom);
  return `ズーム: ${zoom.toFixed(2)}（タイル z${tileZ}）`;
}

function formatCoordLine(currentZone: LogicalZoneLayer | null): string {
  if (!currentZone) return "座標: 未設定";
  return `座標: ${currentZone.label}`;
}

function formatCsvLine(ctx: StatusBarContext): string | null {
  const { showDetail, downloadZoomOk, viewCount, mapConfig } = ctx;

  if (!showDetail) return null;
  if (!downloadZoomOk) {
    return `CSV: ズーム${mapConfig.downloadMinZoom}以上で利用可`;
  }
  if (viewCount > 0) {
    return `CSV: 表示範囲 ${viewCount} 点`;
  }
  return "CSV: 表示範囲に点なし";
}

export function formatTechStatus(ctx: StatusBarContext): string {
  const lines = [
    formatZoomLine(ctx.zoom),
    formatCoordLine(ctx.currentZone),
    formatCsvLine(ctx),
  ].filter((line): line is string => line !== null);

  return lines.map((line) => `<div>${line}</div>`).join("");
}

export function renderStatusBar(
  hintEl: HTMLElement,
  detailsInner: HTMLElement,
  ctx: StatusBarContext,
): void {
  hintEl.textContent = formatUserHint(ctx);
  detailsInner.innerHTML = formatTechStatus(ctx);
}
