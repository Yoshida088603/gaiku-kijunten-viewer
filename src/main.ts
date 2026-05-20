import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

import { loadMapConfig, loadStyleConfig } from "@/config/loadConfig";
import { loadSiteConfig } from "@/config/loadSiteConfig";
import {
  fetchManifest,
  getOverview,
  groupDetailLayers,
} from "@/data/layerCatalog";
import {
  boundsForZone,
  focusCenterForBounds,
  loadZoneBoundsMap,
  pointInBounds,
  pointInBoundsWithMarginMeters,
} from "@/data/zoneBounds";
import type { LogicalZoneLayer } from "@/data/types";
import { createBaseMap } from "@/map/createMap";
import { LayerManager } from "@/map/layerManager";
import {
  DownloadButtonController,
  type DownloadUiState,
} from "@/ui/downloadButton";
import { fallbackIconId, loadKijyuntenIcons } from "@/style/loadIcons";
import { initAddressSearch } from "@/ui/addressSearch";
import { renderLegend } from "@/ui/legend";
import { initLegendPanelToggle } from "@/ui/legendPanel";
import { applyContactFooter } from "@/ui/contactFooter";
import { applySiteBranding, initHelpDialog } from "@/ui/helpDialog";
import { renderStatusBar, type StatusBarContext } from "@/ui/statusBar";

async function main(): Promise<void> {
  const mapEl = document.getElementById("map");
  const panelShell = document.getElementById("panel-shell");
  const panelToggle = document.getElementById("panel-toggle") as HTMLButtonElement | null;
  const legendEl = document.getElementById("legend");
  const addressSearchEl = document.getElementById("address-search");
  const statusHint = document.getElementById("status-hint");
  const statusDetailsInner = document.getElementById("status-details-inner");
  const helpDialog = document.getElementById("help-dialog") as HTMLDialogElement | null;
  const helpOpen = document.getElementById("help-open") as HTMLButtonElement | null;
  const helpClose = document.getElementById("help-close") as HTMLButtonElement | null;
  const helpBody = document.getElementById("help-dialog-body");
  const banner = document.getElementById("banner");
  const downloadWrap = document.getElementById("download-wrap");
  const downloadBtn = document.getElementById("download-btn") as HTMLButtonElement;
  const downloadHint = document.getElementById("download-hint");

  if (
    !mapEl ||
    !panelShell ||
    !panelToggle ||
    !legendEl ||
    !addressSearchEl ||
    !statusHint ||
    !statusDetailsInner ||
    !helpDialog ||
    !helpOpen ||
    !helpClose ||
    !helpBody ||
    !banner ||
    !downloadWrap ||
    !downloadBtn ||
    !downloadHint
  ) {
    throw new Error("Required DOM elements missing");
  }

  const hintEl: HTMLElement = statusHint;
  const detailsEl: HTMLElement = statusDetailsInner;

  const [mapConfig, styleConfig, siteConfig] = await Promise.all([
    loadMapConfig(),
    loadStyleConfig(),
    loadSiteConfig(),
  ]);

  applySiteBranding(siteConfig);
  applyContactFooter(siteConfig);
  initHelpDialog(helpDialog, helpOpen, helpClose, helpBody, siteConfig);

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

  const downloadCtrl = new DownloadButtonController(
    downloadWrap,
    downloadBtn,
    downloadHint,
    () => layerManager.queryRenderedDetailInView(),
    mapConfig.csvColumns,
  );

  renderLegend(legendEl, styleConfig);
  initAddressSearch(addressSearchEl, map, mapConfig);
  initLegendPanelToggle(panelShell, panelToggle);

  const AUTO_SWITCH_HYSTERESIS_METERS = 800;
  let currentZone: LogicalZoneLayer | null = null;
  let zoneApplyInProgress = false;

  function zoneKey(zl: LogicalZoneLayer): string {
    return `${zl.sokuti}:${zl.zone}`;
  }

  const autoZoneCandidates = zoneLayers
    .map((zoneLayer) => {
      const bounds = zoneBoundsMap.get(zoneLayer.zone);
      return bounds ? { key: zoneKey(zoneLayer), zoneLayer, bounds } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const autoZoneByKey = new Map(autoZoneCandidates.map((entry) => [entry.key, entry]));

  function detectZoneFromCenter(lng: number, lat: number): LogicalZoneLayer | null {
    if (currentZone) {
      const current = autoZoneByKey.get(zoneKey(currentZone));
      if (
        current &&
        pointInBoundsWithMarginMeters(
          lng,
          lat,
          current.bounds,
          -AUTO_SWITCH_HYSTERESIS_METERS,
        )
      ) {
        return current.zoneLayer;
      }
    }

    for (const candidate of autoZoneCandidates) {
      if (
        pointInBoundsWithMarginMeters(
          lng,
          lat,
          candidate.bounds,
          AUTO_SWITCH_HYSTERESIS_METERS,
        )
      ) {
        return candidate.zoneLayer;
      }
    }

    for (const candidate of autoZoneCandidates) {
      if (pointInBounds(lng, lat, candidate.bounds)) {
        return candidate.zoneLayer;
      }
    }

    return null;
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

  async function applyZone(
    zl: LogicalZoneLayer,
    opts: { flyToBounds: boolean },
  ): Promise<void> {
    if (zoneApplyInProgress) return;
    if (currentZone && zoneKey(currentZone) === zoneKey(zl)) {
      updateVisibility();
      return;
    }

    zoneApplyInProgress = true;
    try {
      currentZone = zl;
      layerManager.clearDetail();

      if (opts.flyToBounds) {
        await flyToZone(zl);
      }

      try {
        layerManager.loadDetailZone(zl);
        layerManager.setDetailVisible(true);
        map.triggerRepaint();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        banner!.textContent = `detail レイヤ読込エラー: ${msg}`;
        banner!.classList.remove("hidden");
        console.error(e);
        currentZone = null;
        return;
      }
    } finally {
      zoneApplyInProgress = false;
      updateVisibility();
    }
  }

  async function applyZoneManual(zl: LogicalZoneLayer): Promise<void> {
    await applyZone(zl, { flyToBounds: true });
  }

  async function applyZoneAuto(zl: LogicalZoneLayer): Promise<void> {
    await applyZone(zl, { flyToBounds: false });
  }

  async function maybeAutoSwitchZoneByCenter(): Promise<void> {
    if (zoneApplyInProgress) return;
    const zoomOk = map.getZoom() >= mapConfig.detailMinZoom - 0.01;
    if (!zoomOk) return;
    const center = map.getCenter();
    const next = detectZoneFromCenter(center.lng, center.lat);
    if (!next) return;
    if (currentZone && zoneKey(currentZone) === zoneKey(next)) return;
    await applyZoneAuto(next);
  }

  function updateVisibility(): void {
    const hasOverview = overview !== null;
    const zoom = map.getZoom();
    const zoomOk = zoom >= mapConfig.detailMinZoom - 0.01;
    const showDetail = currentZone !== null && zoomOk;
    const downloadZoomOk = zoom >= mapConfig.downloadMinZoom - 0.01;

    layerManager.setOverviewVisible(hasOverview);
    if (hasOverview) {
      const fadeStart = 12;
      const fadeEnd = 14;
      const opaque = 0.55;
      const faint = 0.12;
      let overviewOpacity = opaque;
      if (zoom <= fadeStart) {
        overviewOpacity = opaque;
      } else if (zoom >= fadeEnd) {
        overviewOpacity = faint;
      } else {
        const t = (zoom - fadeStart) / (fadeEnd - fadeStart);
        overviewOpacity = opaque + (faint - opaque) * t;
      }
      layerManager.setOverviewOpacity(overviewOpacity);
    }
    layerManager.setDetailVisible(currentZone !== null);
    if (showDetail) {
      map.triggerRepaint();
    }

    const viewCount = showDetail ? layerManager.queryRenderedDetailInView().length : 0;
    let dlState: DownloadUiState = "hidden";
    const dlOpts = { zoom, minZoom: mapConfig.downloadMinZoom, count: viewCount };

    if (showDetail) {
      if (!downloadZoomOk) {
        dlState = "locked";
      } else if (viewCount === 0) {
        dlState = "empty";
      } else {
        dlState = "ready";
      }
    }
    downloadCtrl.setState(dlState, dlOpts);

    const statusCtx: StatusBarContext = {
      zoom,
      mapConfig,
      showDetail,
      currentZone,
      downloadZoomOk,
      viewCount,
    };
    renderStatusBar(hintEl, detailsEl, statusCtx);
  }

  const e2eEnabled =
    import.meta.env.DEV || new URLSearchParams(location.search).has("e2e");
  if (e2eEnabled) {
    const testApi = {
      getZoom: (): number => map.getZoom(),
      async setZoom(zoom: number, center?: [number, number]): Promise<void> {
        await new Promise<void>((resolve) => {
          map.once("idle", () => resolve());
          map.jumpTo({
            zoom,
            center: center ?? map.getCenter(),
          });
        });
        await new Promise((r) => setTimeout(r, 400));
        updateVisibility();
      },
      getDownloadUi(): {
        wrapHidden: boolean;
        btnDisabled: boolean;
        hint: string;
        statusDl: string;
        downloadMinZoom: number;
      } {
        const status =
          document.getElementById("status-details-inner")?.textContent ?? "";
        const dlLine =
          status
            .split(/\r?\n/)
            .map((l) => l.trim())
            .find((l) => l.startsWith("CSV:")) ??
          [...status.matchAll(/CSV:[^\n]*/g)].pop()?.[0] ??
          "";
        return {
          wrapHidden: downloadWrap.classList.contains("hidden"),
          btnDisabled: downloadBtn.disabled,
          hint: downloadHint.textContent?.trim() ?? "",
          statusDl: dlLine,
          downloadMinZoom: mapConfig.downloadMinZoom,
        };
      },
    };
    (window as unknown as { __gaikuViewerTest?: typeof testApi }).__gaikuViewerTest =
      testApi;
  }

  const defaultKey = zoneLayers.find(
    (z) => z.zone === mapConfig.defaultZone && z.sokuti === "2011",
  );
  const center = map.getCenter();
  const initialAutoZone = detectZoneFromCenter(center.lng, center.lat);
  if (initialAutoZone) {
    await applyZoneAuto(initialAutoZone);
  } else if (defaultKey) {
    await applyZoneManual(defaultKey);
  } else if (zoneLayers.length > 0) {
    await applyZoneManual(zoneLayers[0]);
  }

  map.on("moveend", () => {
    updateVisibility();
    void maybeAutoSwitchZoneByCenter();
  });
  map.on("zoomend", updateVisibility);
  map.on("idle", updateVisibility);

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
