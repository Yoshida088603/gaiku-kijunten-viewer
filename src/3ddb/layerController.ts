import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MaplibreMap,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";

const SOURCE = "ddb-catalog";
const FILL = "ddb-fill";
const LINE = "ddb-line";
const HIGHLIGHT_FILL = "ddb-highlight-fill";
const HIGHLIGHT_LINE = "ddb-highlight-line";

const SERVICE_COLORS: Record<string, string> = {
  LAS: "#3b82f6",
  OBJ: "#f97316",
  CITYGML: "#22c55e",
  FBX: "#a855f7",
  CSV: "#64748b",
};

const fillColorExpr: ExpressionSpecification = [
  "match",
  ["get", "service_name"],
  "LAS",
  SERVICE_COLORS.LAS,
  "OBJ",
  SERVICE_COLORS.OBJ,
  "CITYGML",
  SERVICE_COLORS.CITYGML,
  "FBX",
  SERVICE_COLORS.FBX,
  "CSV",
  SERVICE_COLORS.CSV,
  "#94a3b8",
];

export class DddbLayerController {
  private ready = false;
  private layersVisible = true;
  private selectedRegId: number | null = null;

  constructor(private map: MaplibreMap) {}

  ensureLayers(): void {
    if (this.ready) return;

    this.map.addSource(SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    this.map.addSource(`${SOURCE}-highlight`, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    this.map.addLayer({
      id: FILL,
      type: "fill",
      source: SOURCE,
      paint: {
        "fill-color": fillColorExpr,
        "fill-opacity": 0.25,
      },
      layout: { visibility: "visible" },
    });

    this.map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      paint: {
        "line-color": fillColorExpr,
        "line-width": 1.5,
        "line-opacity": 0.8,
      },
      layout: { visibility: "visible" },
    });

    this.map.addLayer({
      id: HIGHLIGHT_FILL,
      type: "fill",
      source: `${SOURCE}-highlight`,
      paint: {
        "fill-color": "#eab308",
        "fill-opacity": 0.45,
      },
      layout: { visibility: "visible" },
    });

    this.map.addLayer({
      id: HIGHLIGHT_LINE,
      type: "line",
      source: `${SOURCE}-highlight`,
      paint: {
        "line-color": "#ca8a04",
        "line-width": 2.5,
      },
      layout: { visibility: "visible" },
    });

    this.ready = true;
  }

  setData(geojson: FeatureCollection, highlight: FeatureCollection): void {
    this.ensureLayers();
    const src = this.map.getSource(SOURCE) as GeoJSONSource | undefined;
    const hiSrc = this.map.getSource(`${SOURCE}-highlight`) as GeoJSONSource | undefined;
    src?.setData(geojson);
    hiSrc?.setData(highlight);
  }

  clear(): void {
    if (!this.ready) return;
    this.setData(
      { type: "FeatureCollection", features: [] },
      { type: "FeatureCollection", features: [] },
    );
    this.selectedRegId = null;
  }

  setSelectedRegId(regId: number | null, all: FeatureCollection): void {
    this.selectedRegId = regId;
    if (!this.ready) return;
    const hiSrc = this.map.getSource(`${SOURCE}-highlight`) as GeoJSONSource | undefined;
    if (regId == null) {
      hiSrc?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const features = all.features.filter(
      (f) => f.properties?.reg_id === regId,
    );
    hiSrc?.setData({ type: "FeatureCollection", features });
  }

  setLayersVisible(visible: boolean): void {
    this.layersVisible = visible;
    if (!this.ready) return;
    const v = visible ? "visible" : "none";
    for (const id of [FILL, LINE, HIGHLIGHT_FILL, HIGHLIGHT_LINE]) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, "visibility", v);
      }
    }
  }

  isLayersVisible(): boolean {
    return this.layersVisible;
  }

  getSelectedRegId(): number | null {
    return this.selectedRegId;
  }
}
