import type { Map as MaplibreMap } from "maplibre-gl";
import type { DddbCatalogController } from "@/3ddb/controller";
import type { MapConfig } from "@/data/types";

export interface GaikuViewerTestApi {
  getZoom(): number;
  setZoom(zoom: number, center?: [number, number]): Promise<void>;
  getDownloadUi(): {
    wrapHidden: boolean;
    btnDisabled: boolean;
    btnText: string;
    hint: string;
    statusDl: string;
    downloadMinZoom: number;
  };
  get3ddbUi(): {
    wrapHidden: boolean;
    panelOpen: boolean;
    mapLayersVisible: boolean;
    optionCount: number;
    selectedRegId: number | null;
    toggleChecked: boolean;
    statusText: string;
    downloadLabel: string;
  };
  set3ddbPanelOpen(open: boolean): void;
}

export interface GaikuViewerTestApiDeps {
  map: MaplibreMap;
  mapConfig: MapConfig;
  downloadWrap: HTMLElement;
  downloadBtn: HTMLButtonElement;
  downloadHint: HTMLElement;
  dddbCtrl: DddbCatalogController | null;
  updateVisibility: () => void;
}

const EMPTY_3DDB_UI = {
  wrapHidden: true,
  panelOpen: false,
  mapLayersVisible: false,
  optionCount: 0,
  selectedRegId: null,
  toggleChecked: true,
  statusText: "",
  downloadLabel: "",
} as const;

export function installGaikuViewerTestApi(deps: GaikuViewerTestApiDeps): void {
  const {
    map,
    mapConfig,
    downloadWrap,
    downloadBtn,
    downloadHint,
    dddbCtrl,
    updateVisibility,
  } = deps;

  const testApi: GaikuViewerTestApi = {
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
    getDownloadUi() {
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
        btnText: downloadBtn.textContent?.trim() ?? "",
        hint: downloadHint.textContent?.trim() ?? "",
        statusDl: dlLine,
        downloadMinZoom: mapConfig.downloadMinZoom,
      };
    },
    get3ddbUi() {
      if (!dddbCtrl) {
        return { ...EMPTY_3DDB_UI };
      }
      return dddbCtrl.getUiState();
    },
    set3ddbPanelOpen(open: boolean): void {
      const el = document.getElementById("ddb-catalog-wrap") as HTMLDetailsElement | null;
      if (el) el.open = open;
    },
  };

  (window as unknown as { __gaikuViewerTest?: GaikuViewerTestApi }).__gaikuViewerTest =
    testApi;
}
