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
import { buildKindColorExpression } from "@/style/buildKindColor";
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
  ) {}

  private kindFilter(): ExpressionSpecification | undefined {
    if (this.hiddenKinds.size === 0) return undefined;
    return [
      "!",
      ["in", ["get", "kind"], ["literal", [...this.hiddenKinds]]],
    ] as ExpressionSpecification;
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
              maxzoom: 13,
            },
          ];

    for (const lv of levels) {
      const layerId = `overview-${lv.layer_name}`;
      this.map.addLayer({
        id: layerId,
        type: "fill",
        source: OVERVIEW_SOURCE,
        "source-layer": lv.layer_name,
        minzoom: lv.minzoom,
        // MapLibre maxzoom is exclusive; +1 so tile maxzoom N is visible at z=N
        maxzoom: lv.maxzoom + 1,
        layout: {
          visibility: "visible",
        },
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 1,
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
        this.map.setPaintProperty(id, "fill-opacity", opacity);
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
    const kindFilter = this.kindFilter();
    const sourceLayer = this.config.detailSourceLayer;
    const layerFilter = kindFilter ? { filter: kindFilter } : {};

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
        minzoom: this.config.detailMinZoom,
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
        ...layerFilter,
      });

      this.map.addLayer({
        id: symbolLayerId,
        type: "symbol",
        source: sourceId,
        "source-layer": sourceLayer,
        minzoom: this.config.detailMinZoom,
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
        ...layerFilter,
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
