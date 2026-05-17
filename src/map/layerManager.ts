import type { ExpressionSpecification, Map as MaplibreMap } from "maplibre-gl";
import type {
  KijyuntenStyleConfig,
  LogicalZoneLayer,
  ManifestOverview,
  MapConfig,
} from "@/data/types";
import {
  overviewUrl,
  tileUrl,
} from "@/data/layerCatalog";
import { buildIconImageExpression } from "@/style/buildIconStyle";
import { buildIconSizeExpression } from "@/style/iconSize";
import { buildKindColorExpression, totiriyoKinds } from "@/style/buildKindColor";
import { buildCircleRadiusExpression } from "@/style/circleRadius";
const OVERVIEW_SOURCE = "overview-national";
const DETAIL_PREFIX = "detail";

export class LayerManager {
  private detailSourceIds: string[] = [];
  private detailLayerIds: string[] = [];
  private overviewLayerIds: string[] = [];
  private overviewReady = false;
  private hiddenKinds = new Set<string>();

  constructor(
    private map: MaplibreMap,
    private config: MapConfig,
    private style: KijyuntenStyleConfig,
  ) {
    const hidden = totiriyoKinds(style);
    for (const k of hidden) this.hiddenKinds.add(k);
  }

  setTotiriyoVisible(visible: boolean): void {
    const hidden = totiriyoKinds(this.style);
    if (visible) {
      for (const k of hidden) this.hiddenKinds.delete(k);
    } else {
      for (const k of hidden) this.hiddenKinds.add(k);
    }
    this.applyKindFilters();
  }

  private kindFilter(): ExpressionSpecification | undefined {
    if (this.hiddenKinds.size === 0) return undefined;
    return [
      "!",
      ["in", ["get", "kind"], ["literal", [...this.hiddenKinds]]],
    ] as ExpressionSpecification;
  }

  private applyKindFilters(): void {
    const color = buildKindColorExpression(this.style, this.hiddenKinds);
    const radius = buildCircleRadiusExpression(this.style);
    const iconImage = buildIconImageExpression(this.style, this.hiddenKinds);
    const iconSize = buildIconSizeExpression(this.style);
    const filter = this.kindFilter();

    for (const id of this.detailLayerIds) {
      const layer = this.map.getLayer(id);
      if (!layer) continue;
      if (layer.type === "circle") {
        this.map.setPaintProperty(id, "circle-color", color);
        this.map.setPaintProperty(id, "circle-radius", radius);
      } else if (layer.type === "symbol") {
        this.map.setLayoutProperty(id, "icon-image", iconImage);
        this.map.setLayoutProperty(id, "icon-size", iconSize);
      }
      if (filter) this.map.setFilter(id, filter);
      else this.map.setFilter(id, null);
    }
  }

  ensureOverview(overview: ManifestOverview): void {
    if (this.overviewReady) return;
    const url = overviewUrl(overview);
    this.map.addSource(OVERVIEW_SOURCE, {
      type: "vector",
      url,
      maxzoom: overview.maxzoom,
    });

    const levels =
      overview.grid_levels.length > 0
        ? overview.grid_levels
        : [
            {
              level: 1,
              layer_name: "overview_L1",
              minzoom: 0,
              maxzoom: 7,
            },
            {
              level: 2,
              layer_name: "overview_L2",
              minzoom: 8,
              maxzoom: 11,
            },
            {
              level: 3,
              layer_name: "overview_L3",
              minzoom: 12,
              maxzoom: 14,
            },
          ];

    for (const lv of levels) {
      const layerId = `overview-${lv.layer_name}`;
      this.map.addLayer({
        id: layerId,
        type: "circle",
        source: OVERVIEW_SOURCE,
        "source-layer": lv.layer_name,
        minzoom: lv.minzoom,
        maxzoom: lv.maxzoom,
        layout: {
          visibility: "visible",
        },
        paint: {
          "circle-color": "#337ab7",
          "circle-opacity": 0.55,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "n"],
            1,
            3,
            100,
            8,
            1000,
            14,
            10000,
            20,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
      this.overviewLayerIds.push(layerId);
    }
    this.overviewReady = true;
  }

  setOverviewVisible(visible: boolean): void {
    const v = visible ? "visible" : "none";
    for (const id of this.overviewLayerIds) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", v);
    }
  }

  setOverviewOpacity(opacity: number): void {
    for (const id of this.overviewLayerIds) {
      if (this.map.getLayer(id)) {
        this.map.setPaintProperty(id, "circle-opacity", opacity);
      }
    }
  }

  clearDetail(): void {
    for (const id of this.detailLayerIds) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    for (const id of this.detailSourceIds) {
      if (this.map.getSource(id)) this.map.removeSource(id);
    }
    this.detailLayerIds = [];
    this.detailSourceIds = [];
  }

  loadDetailZone(zoneLayer: LogicalZoneLayer): void {
    this.clearDetail();
    const color = buildKindColorExpression(this.style, this.hiddenKinds);
    const radius = buildCircleRadiusExpression(this.style);
    const iconImage = buildIconImageExpression(this.style, this.hiddenKinds);
    const iconSize = buildIconSizeExpression(this.style);
    const filter = this.kindFilter();
    const sourceLayer = this.config.detailSourceLayer;

    zoneLayer.tiles.forEach((tile, index) => {
      const sourceId = `${DETAIL_PREFIX}-z${zoneLayer.zone}-${tile.csv_prefix ?? index}`;
      const circleLayerId = `${sourceId}-circles`;
      const symbolLayerId = `${sourceId}-symbols`;

      this.map.addSource(sourceId, {
        type: "vector",
        url: tileUrl(tile),
        promoteId: "id",
      });
      this.detailSourceIds.push(sourceId);

      this.map.addLayer({
        id: circleLayerId,
        type: "circle",
        source: sourceId,
        "source-layer": sourceLayer,
        minzoom: 15,
        layout: {
          visibility: "visible",
        },
        paint: {
          "circle-color": color,
          "circle-radius": radius,
          "circle-opacity": 0.92,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            0.8,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#ffcc00",
            "#333333",
          ],
        },
        filter,
      });

      this.map.addLayer({
        id: symbolLayerId,
        type: "symbol",
        source: sourceId,
        "source-layer": sourceLayer,
        minzoom: 15,
        layout: {
          visibility: "visible",
          "icon-image": iconImage,
          "icon-size": iconSize,
          "icon-anchor": "center",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-opacity": 1,
          "icon-halo-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            0,
          ],
          "icon-halo-color": "#ffcc00",
        },
        filter,
      });

      this.detailLayerIds.push(circleLayerId, symbolLayerId);
    });

    this.map.triggerRepaint();
  }

  /** 座標系選択中は常に visible（none にすると PMTiles の Range 取得が走らない） */
  setDetailVisible(visible: boolean): void {
    const v = visible ? "visible" : "none";
    for (const id of this.detailLayerIds) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", v);
    }
    if (visible) {
      this.map.triggerRepaint();
    }
  }

  getDetailLayerIds(): string[] {
    return [...this.detailLayerIds];
  }

  getDetailSourceIds(): string[] {
    return [...this.detailSourceIds];
  }

  countLoadedDetailFeatures(): number {
    let n = 0;
    const sourceLayer = this.config.detailSourceLayer;
    for (const sourceId of this.detailSourceIds) {
      try {
        const features = this.map.querySourceFeatures(sourceId, { sourceLayer });
        n += features.length;
      } catch {
        /* source not ready */
      }
    }
    return n;
  }

  setFeatureSelected(sourceId: string, featureId: string, selected: boolean): void {
    try {
      this.map.setFeatureState(
        { source: sourceId, sourceLayer: this.config.detailSourceLayer, id: featureId },
        { selected },
      );
    } catch {
      /* ignore */
    }
  }

  clearAllFeatureStates(): void {
    for (const sourceId of this.detailSourceIds) {
      const features = this.map.querySourceFeatures(sourceId, {
        sourceLayer: this.config.detailSourceLayer,
      });
      for (const f of features) {
        if (f.id !== undefined) {
          try {
            this.map.setFeatureState(
              {
                source: sourceId,
                sourceLayer: this.config.detailSourceLayer,
                id: f.id,
              },
              { selected: false },
            );
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
}
