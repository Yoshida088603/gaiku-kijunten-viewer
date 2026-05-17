import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

import { loadMapConfig, loadStyleConfig } from "@/config/loadConfig";
import {
  fetchManifest,
  getOverview,
  groupDetailLayers,
} from "@/data/layerCatalog";
import type { LogicalZoneLayer } from "@/data/types";
import { createBaseMap } from "@/map/createMap";
import { LayerManager } from "@/map/layerManager";
import { evaluateScale, formatScale } from "@/map/scale";
import { SelectionStore } from "@/map/selection";
import {
  DownloadButtonController,
  type DownloadUiState,
} from "@/ui/downloadButton";
import { renderLegend } from "@/ui/legend";

async function main(): Promise<void> {
  const mapEl = document.getElementById("map");
  const zoneSelect = document.getElementById("zone-select") as HTMLSelectElement;
  const legendEl = document.getElementById("legend");
  const statusBar = document.getElementById("status-bar");
  const banner = document.getElementById("banner");
  const downloadWrap = document.getElementById("download-wrap");
  const downloadBtn = document.getElementById("download-btn") as HTMLButtonElement;
  const downloadHint = document.getElementById("download-hint");

  if (
    !mapEl ||
    !zoneSelect ||
    !legendEl ||
    !statusBar ||
    !banner ||
    !downloadWrap ||
    !downloadBtn ||
    !downloadHint
  ) {
    throw new Error("Required DOM elements missing");
  }

  const [mapConfig, styleConfig] = await Promise.all([
    loadMapConfig(),
    loadStyleConfig(),
  ]);

  const map = createBaseMap(mapEl, mapConfig);
  await new Promise<void>((resolve) => {
    if (map.loaded()) resolve();
    else map.once("load", () => resolve());
  });

  let manifest;
  let zoneLayers: LogicalZoneLayer[] = [];
  try {
    manifest = await fetchManifest();
    zoneLayers = groupDetailLayers(manifest.layers);
  } catch (e) {
    banner.textContent = `データ読込エラー: ${e instanceof Error ? e.message : e}`;
    banner.classList.remove("hidden");
  }

  if (zoneLayers.length === 0) {
    banner.textContent =
      "PMTiles がありません。20-data/pmtiles/detail に配置し manifest.json を更新してください。";
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  const layerManager = new LayerManager(map, mapConfig, styleConfig);
  const overview = manifest ? getOverview(manifest) : null;
  if (overview) {
    try {
      layerManager.ensureOverview(overview);
    } catch (e) {
      console.warn("overview load failed", e);
    }
  }

  const selection = new SelectionStore(map, layerManager);
  const downloadCtrl = new DownloadButtonController(
    downloadWrap,
    downloadBtn,
    downloadHint,
    selection,
    mapConfig.csvColumns,
  );

  renderLegend(legendEl, styleConfig, (visible) => {
    layerManager.setTotiriyoVisible(visible);
  });

  zoneSelect.innerHTML = "";
  for (const zl of zoneLayers) {
    const opt = document.createElement("option");
    opt.value = `${zl.sokuti}:${zl.zone}`;
    opt.textContent = zl.label;
    zoneSelect.appendChild(opt);
  }

  let currentZone: LogicalZoneLayer | null = null;

  function findZone(key: string): LogicalZoneLayer | undefined {
    const [sokuti, zoneStr] = key.split(":");
    const zone = Number(zoneStr);
    return zoneLayers.find((z) => z.sokuti === sokuti && z.zone === zone);
  }

  function applyZone(zl: LogicalZoneLayer): void {
    currentZone = zl;
    selection.clear();
    layerManager.loadDetailZone(zl);
    updateVisibility();
  }

  function updateVisibility(): void {
    const flags = evaluateScale(map, mapConfig);
    const hasOverview = overview !== null;
    const showDetail = flags.detailVisible && currentZone !== null;

    layerManager.setOverviewVisible(hasOverview);
    if (hasOverview) {
      layerManager.setOverviewOpacity(
        flags.detailVisible ? 0.25 : 0.55,
      );
    }
    layerManager.setDetailVisible(showDetail);

    let dlState: DownloadUiState = "hidden";
    if (flags.downloadAllowed) {
      dlState = selection.size > 0 ? "active" : "disabled";
    }
    downloadCtrl.setState(dlState);

    const ovNote = hasOverview
      ? flags.detailVisible
        ? "overview(薄)+detail"
        : "overview+GSI"
      : "GSIのみ";
    const detailNote = showDetail ? "detail表示" : "detail非表示";
    statusBar!.innerHTML = [
      `<div>縮尺: <strong>${formatScale(flags.scale)}</strong></div>`,
      `<div>${ovNote} / ${detailNote}</div>`,
      `<div>DL: ${flags.downloadAllowed ? "可" : "拡大してください"}</div>`,
      `<div>${mapConfig.gsiAttribution}</div>`,
    ].join("");
  }

  const defaultKey = zoneLayers.find(
    (z) => z.zone === mapConfig.defaultZone && z.sokuti === "2011",
  );
  if (defaultKey) {
    zoneSelect.value = `${defaultKey.sokuti}:${defaultKey.zone}`;
    applyZone(defaultKey);
  } else if (zoneLayers.length > 0) {
    zoneSelect.selectedIndex = 0;
    applyZone(zoneLayers[0]);
  }

  zoneSelect.addEventListener("change", () => {
    const zl = findZone(zoneSelect.value);
    if (zl) applyZone(zl);
  });

  map.on("moveend", updateVisibility);
  map.on("zoomend", updateVisibility);

  map.on("click", (e) => {
    const flags = evaluateScale(map, mapConfig);
    if (!flags.detailVisible) return;
    selection.handleClick(e, flags.detailVisible);
    updateVisibility();
  });

  map.on("mousemove", (e) => {
    const flags = evaluateScale(map, mapConfig);
    if (!flags.detailVisible) {
      map.getCanvas().style.cursor = "";
      return;
    }
    const layers = layerManager.getDetailLayerIds();
    if (layers.length === 0) return;
    const hit = map.queryRenderedFeatures(e.point, { layers });
    map.getCanvas().style.cursor = hit.length > 0 ? "pointer" : "";
  });

  updateVisibility();
}

main().catch((err) => {
  console.error(err);
  const banner = document.getElementById("banner");
  if (banner) {
    banner.textContent = `起動エラー: ${err instanceof Error ? err.message : err}`;
    banner.classList.remove("hidden");
  }
});
