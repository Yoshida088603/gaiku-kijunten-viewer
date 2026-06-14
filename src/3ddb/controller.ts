import type { Map as MaplibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { fetchFeaturesInArea } from "@/3ddb/api";
import { boundsToWkt } from "@/3ddb/bboxWkt";
import { DddbCatalogUi, type DddbCatalogUiState } from "@/3ddb/catalogUi";
import { entriesFromCollection, toMapGeoJson } from "@/3ddb/geojsonNormalize";
import { DddbLayerController } from "@/3ddb/layerController";
import type { DddbConfig } from "@/3ddb/types";

export class DddbCatalogController {
  private ui: DddbCatalogUi;
  private layers: DddbLayerController;
  private active = false;
  private abort: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastGeoJson: FeatureCollection = { type: "FeatureCollection", features: [] };

  constructor(
    private map: MaplibreMap,
    private config: DddbConfig,
    bottomStack: HTMLElement,
  ) {
    this.ui = new DddbCatalogUi(bottomStack);
    this.layers = new DddbLayerController(map);
    this.ui.bindHandlers({
      onSelectChange: (regId) => {
        this.layers.setSelectedRegId(regId, this.lastGeoJson);
      },
      onToggleChange: (visible) => {
        this.layers.setLayersVisible(visible);
      },
      onDownloadClick: () => {
        this.ui.openSelectedDownload();
      },
    });
  }

  getWrapElement(): HTMLElement {
    return this.ui.wrap;
  }

  setActive(active: boolean): void {
    if (active === this.active) {
      return;
    }
    this.active = active;
    if (!active) {
      this.cancelPending();
      this.ui.setVisible(false);
      this.layers.clear();
      this.layers.setLayersVisible(false);
      return;
    }
    this.ui.setVisible(true);
    this.layers.setLayersVisible(this.ui.getUiState().toggleChecked);
    this.scheduleRefresh();
  }

  scheduleRefresh(): void {
    if (!this.active) return;
    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.refreshNow();
    }, this.config.debounceMs);
  }

  private cancelPending(): void {
    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.abort?.abort();
    this.abort = null;
  }

  async refreshNow(): Promise<void> {
    if (!this.active) return;
    this.cancelPending();
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.ui.setLoading();

    try {
      const wkt = boundsToWkt(this.map.getBounds());
      const collection = await fetchFeaturesInArea(this.config, wkt, {
        signal,
        limit: this.config.maxFeatures,
      });
      if (signal.aborted || !this.active) return;

      const entries = entriesFromCollection(collection);
      this.lastGeoJson = toMapGeoJson(collection);
      this.layers.ensureLayers();
      this.layers.setData(this.lastGeoJson, {
        type: "FeatureCollection",
        features: [],
      });
      this.layers.setLayersVisible(this.ui.getUiState().toggleChecked);

      const totalAll = collection.properties?.all;
      this.ui.setEntries(entries, this.config, totalAll);

      const regId = this.ui.selectedRegId();
      this.layers.setSelectedRegId(regId, this.lastGeoJson);
    } catch (e) {
      if (signal.aborted || !this.active) return;
      const msg = e instanceof Error ? e.message : String(e);
      this.ui.setError(msg);
      this.layers.clear();
    }
  }

  getUiState(): DddbCatalogUiState {
    return this.ui.getUiState();
  }
}
