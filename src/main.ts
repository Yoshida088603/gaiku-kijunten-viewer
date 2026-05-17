import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

import { loadMapConfig, loadStyleConfig } from "@/config/loadConfig";
import {
  fetchManifest,
  getOverview,
  groupDetailLayers,
} from "@/data/layerCatalog";
import {
  boundsForZone,
  focusCenterForBounds,
  loadZoneBoundsMap,
} from "@/data/zoneBounds";
import type { LogicalZoneLayer } from "@/data/types";
import { createBaseMap } from "@/map/createMap";
import { LayerManager } from "@/map/layerManager";
import { evaluateScale } from "@/map/scale";
import { SelectionStore } from "@/map/selection";
import {
  DownloadButtonController,
  type DownloadUiState,
} from "@/ui/downloadButton";
import { fallbackIconId, loadKijyuntenIcons } from "@/style/loadIcons";
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

  await loadKijyuntenIcons(map, styleConfig);
  const zoneBoundsMap = await loadZoneBoundsMap();

  map.on("styleimagemissing", (e) => {
    if (map.hasImage(e.id)) return;
    const fb = fallbackIconId();
    if (e.id !== fb && map.hasImage(fb)) {
      const img = map.getImage(fb);
      if (img) {
        map.addImage(e.id, {
          width: img.data.width,
          height: img.data.height,
          data: img.data.data,
        });
      }
    }
  });

  map.on("error", (e) => {
    console.error("map error", e.error);
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

  async function flyToZone(zl: LogicalZoneLayer): Promise<void> {
    const b = await boundsForZone(zl, zoneBoundsMap);
    const targetZoom = mapConfig.detailMinZoom + 0.5;
    const center = focusCenterForBounds(b, mapConfig.defaultCenter);
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      map.once("moveend", finish);
      window.setTimeout(finish, 2500);
      map.easeTo({ center, zoom: targetZoom, duration: 800 });
    });
  }

  async function applyZone(zl: LogicalZoneLayer): Promise<void> {
    currentZone = zl;
    selection.clear();
    layerManager.clearDetail();

    await flyToZone(zl);

    try {
      layerManager.loadDetailZone(zl);
      layerManager.setDetailVisible(true);
      map.triggerRepaint();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      banner!.textContent = `detail レイヤ読込エラー: ${msg}`;
      banner!.classList.remove("hidden");
      console.error(e);
      return;
    }

    updateVisibility();
  }

  function updateVisibility(): void {
    const flags = evaluateScale(map, mapConfig);
    const hasOverview = overview !== null;
    const zoom = map.getZoom();
    const zoomOk = zoom >= mapConfig.detailMinZoom - 0.01;
    const showDetail = currentZone !== null && zoomOk;

    layerManager.setOverviewVisible(hasOverview);
    if (hasOverview) {
      layerManager.setOverviewOpacity(
        flags.detailVisible ? 0.25 : 0.55,
      );
    }
    // 座標系選択中はレイヤを visible のままにし PMTiles を取得させる（z<15 は layer minzoom で非描画）
    layerManager.setDetailVisible(currentZone !== null);
    if (showDetail) {
      map.triggerRepaint();
    }

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
    const detailNote = showDetail
      ? "detail表示"
      : currentZone
        ? `detail: z${mapConfig.detailMinZoom}以上に拡大`
        : "detail非表示";
    const loaded = showDetail ? layerManager.countLoadedDetailFeatures() : 0;
    statusBar!.innerHTML = [
      // 縮尺: formatScale(flags.scale)
      `<div>タイルズーム: <strong>z${Math.round(zoom)}</strong>（地図 ${zoom.toFixed(2)}）</div>`,
      `<div>${ovNote} / ${detailNote} / 読込点≈${loaded}</div>`,
      `<div>DL: ${flags.downloadAllowed ? "可" : "拡大してください"}</div>`,
      `<div>${mapConfig.gsiAttribution}</div>`,
    ].join("");
  }

  const defaultKey = zoneLayers.find(
    (z) => z.zone === mapConfig.defaultZone && z.sokuti === "2011",
  );
  if (defaultKey) {
    zoneSelect.value = `${defaultKey.sokuti}:${defaultKey.zone}`;
    await applyZone(defaultKey);
  } else if (zoneLayers.length > 0) {
    zoneSelect.selectedIndex = 0;
    await applyZone(zoneLayers[0]);
  }

  zoneSelect.addEventListener("change", () => {
    const zl = findZone(zoneSelect.value);
    if (zl) applyZone(zl);
  });

  map.on("moveend", updateVisibility);
  map.on("zoomend", updateVisibility);
  map.on("idle", updateVisibility);

  map.on("click", (e) => {
    const zoomOk = map.getZoom() >= mapConfig.detailMinZoom - 0.01;
    if (!zoomOk || !currentZone) return;
    selection.handleClick(e, true);
    updateVisibility();
  });

  map.on("mousemove", (e) => {
    const zoomOk = map.getZoom() >= mapConfig.detailMinZoom - 0.01;
    if (!zoomOk || !currentZone) {
      map.getCanvas().style.cursor = "";
      return;
    }
    const layers = layerManager
      .getDetailLayerIds()
      .filter((id) => Boolean(map.getLayer(id)));
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
