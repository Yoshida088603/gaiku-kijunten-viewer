export interface MapConfig {
  detailMinScale: number;
  downloadMinScale: number;
  detailMinZoom: number;
  downloadMinZoom: number;
  overviewMaxZoom: number;
  dataBaseUrl: string;
  gsiStdUrl: string;
  gsiAttribution: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  defaultZone: number;
  detailSourceLayer: string;
  csvColumns: string[];
}

export interface StyleCategory {
  label: string;
  glyph: string;
  color: string;
  icon: string;
  kinds: string[];
  sizeRatio: number;
  legendSizePx: number;
  order: number;
}

export interface KijyuntenStyleConfig {
  markerReferenceScale?: number;
  markerSizeM?: number;
  markerSizeMmRef?: number;
  svgPixelSize?: number;
  categories: StyleCategory[];
}

export interface ManifestLayer {
  gpkg?: string;
  pmtiles: string;
  path: string;
  bytes?: number;
  zone: number;
  sokuti: string;
  epsg: number;
  csv_prefix: string | null;
  split?: boolean;
}

export interface OverviewGridLevel {
  level: number;
  cell_deg: number;
  minzoom: number;
  maxzoom: number;
  layer_name: string;
  cells?: number;
}

export interface ManifestOverview {
  path: string;
  pmtiles?: string;
  minzoom: number;
  maxzoom: number;
  grid_levels: OverviewGridLevel[];
}

export interface Manifest {
  layers: ManifestLayer[];
  overview?: ManifestOverview;
  errors?: string[];
}

export interface LogicalZoneLayer {
  zone: number;
  sokuti: string;
  epsg: number;
  label: string;
  tiles: ManifestLayer[];
}

export interface KijyuntenFeatureProps {
  id?: string;
  name?: string;
  x?: number | string;
  y?: number | string;
  z?: number | string;
  kind?: string;
  sokuti?: string;
  zone?: number | string;
  epsg?: number | string;
  yohosei?: number | string;
  n?: number;
}
