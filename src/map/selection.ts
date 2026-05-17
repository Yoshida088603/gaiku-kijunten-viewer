import type { Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";
import type { KijyuntenFeatureProps } from "@/data/types";
import type { LayerManager } from "@/map/layerManager";

export class SelectionStore {
  private selected = new Map<string, KijyuntenFeatureProps>();
  private listeners: Array<() => void> = [];

  constructor(
    private map: MaplibreMap,
    private layerManager: LayerManager,
  ) {}

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  get size(): number {
    return this.selected.size;
  }

  getRows(): KijyuntenFeatureProps[] {
    return [...this.selected.values()];
  }

  clear(): void {
    this.selected.clear();
    this.layerManager.clearAllFeatureStates();
    this.notify();
  }

  handleClick(e: MapMouseEvent, detailVisible: boolean): void {
    if (!detailVisible) return;

    const layerIds = this.layerManager.getDetailLayerIds();
    if (layerIds.length === 0) return;

    const features = this.map.queryRenderedFeatures(e.point, {
      layers: layerIds,
    });
    if (features.length === 0) {
      if (!e.originalEvent.ctrlKey && !e.originalEvent.metaKey) {
        this.clear();
      }
      return;
    }

    const f = features[0];
    const props = f.properties as KijyuntenFeatureProps;
    const id = props.id ?? f.id?.toString();
    if (!id) return;

    const multi = e.originalEvent.ctrlKey || e.originalEvent.metaKey;

    if (!multi) {
      const wasOnly = this.selected.size === 1 && this.selected.has(String(id));
      this.clear();
      if (!wasOnly) {
        this.selected.set(String(id), { ...props, id: String(id) });
        this.setSelectedState(f.source, String(id), true);
      }
    } else {
      const sid = String(id);
      if (this.selected.has(sid)) {
        this.selected.delete(sid);
        this.setSelectedState(f.source, sid, false);
      } else {
        this.selected.set(sid, { ...props, id: sid });
        this.setSelectedState(f.source, sid, true);
      }
    }
    this.notify();
  }

  private setSelectedState(
    source: string | undefined,
    featureId: string,
    selected: boolean,
  ): void {
    if (!source) return;
    this.layerManager.setFeatureSelected(source, featureId, selected);
  }
}
